import "server-only";
import { after } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { sendMail, mailConfigured } from "./mailer";
import { enqueueEmail, deliverPending } from "./outbox";
import { RULE_EVENT, statusEvent, type NotifyEvent } from "@/lib/iris/notify-events";
import {
  renderNotificationEmail,
  type EmailTemplateOverridesMap,
  type EmailTicketContext,
  type RecipientRole,
} from "@/lib/iris/email-renderer";

export { RULE_EVENT, statusEvent };
export type { NotifyEvent };

export type NotifyTicket = EmailTicketContext & {
  assigneeId?: string | null;
  assigneeIds?: string[];
  reporterId?: string | null;
  departmentCodes?: string[];
};

export type NotifyActor = { user_id?: string | null; employee_id?: string | null; email?: string | null } | null;

export type NotifyExtra = {
  previousAssigneeId?: string | null;
  previousStatus?: string | null;
  addedOwnerIds?: string[];
  addedDepartmentCodes?: string[];
  escalationReason?: string | null;
  comment?: { author?: string | null; content: string; isInternal?: boolean } | null;
  /** Extra employee ids to notify (watchers). */
  watcherEmployeeIds?: string[];
  /** Overrides the dedupe discriminator (default: minute bucket). */
  dedupe?: string;
  /** Don't send mail, log as dry_run. Also enabled globally with NOTIFY_DRY_RUN=1. */
  dryRun?: boolean;
};

type Recipient = {
  employeeId: string;
  name: string;
  email: string;
  role: RecipientRole;
  userId: string | null;
  wantsEmail: boolean;
  wantsInApp: boolean;
};

const IN_APP_TYPE: Record<NotifyEvent, "critical" | "sla" | "escalated" | "assignment" | "comment" | "info"> = {
  ticket_created: "info",
  ticket_assigned: "assignment",
  owner_added: "assignment",
  department_added: "assignment",
  status_in_progress: "info",
  status_awaiting_response: "info",
  status_resolved: "info",
  status_closed: "info",
  status_reopened: "info",
  comment_added: "comment",
  escalated: "escalated",
  sla_at_risk: "sla",
  sla_breached: "sla",
};

const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

export function notifyTicketEvent(
  event: NotifyEvent,
  ticket: NotifyTicket,
  actor: NotifyActor = null,
  extra: NotifyExtra = {},
): void {
  const run = () => deliver(event, ticket, actor, extra).catch((err) => logFailure(event, ticket.id, err));
  try {
    after(run);
  } catch {
    void run();
  }
}

export async function notifyTicketEventNow(
  event: NotifyEvent,
  ticket: NotifyTicket,
  actor: NotifyActor = null,
  extra: NotifyExtra = {},
) {
  return deliver(event, ticket, actor, extra).catch((err) => {
    logFailure(event, ticket.id, err);
    return null;
  });
}

async function logFailure(event: string, ticketId: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[notify] ${event} ${ticketId}: ${message}`);
  try {
    await pool.query("select iris.log_app_event('error', 'notify', $1, $2::jsonb)", [
      `Notification failed: ${event}`,
      JSON.stringify({ ticketId, error: message }),
    ]);
  } catch {
    /* logging must never throw */
  }
}

type DeliverSummary = {
  event: NotifyEvent;
  recipients: number;
  inApp: number;
  email: number;
  queued: number;
  skipped: number;
};

async function deliver(
  event: NotifyEvent,
  ticket: NotifyTicket,
  actor: NotifyActor,
  extra: NotifyExtra,
): Promise<DeliverSummary | null> {
  const client = await pool.connect();
  try {
    await client.query("set search_path = iris, public");
    const ruleName = RULE_EVENT[event];
    const ruleRow = (
      await client.query<{ in_app: boolean; email: boolean }>(
        "select in_app, email from notification_rules where event = $1",
        [ruleName],
      )
    ).rows[0];
    // For newly added events that haven't been saved in notification_rules yet, default to enabled.
    const rule = ruleRow ?? (event === "owner_added" || event === "department_added" ? { in_app: true, email: true } : null);
    if (!rule) return null;

    const settings = Object.fromEntries(
      (
        await client.query(
          "select key, value from app_settings where key like 'notifications.%' or key like 'email.%' or key = 'ops.email_via_outbox'",
        )
      ).rows.map((r) => [r.key, r.value]),
    );

    // Respect Integrations toggle if an email/mailtrap integration row is explicitly disabled
    const mailIntegration = (
      await client
        .query<{ is_enabled: boolean }>("select is_enabled from integrations where id in ('mailtrap', 'email') limit 1")
        .catch(() => ({ rows: [] as { is_enabled: boolean }[] }))
    ).rows[0];
    const mailIntegrationEnabled = mailIntegration ? mailIntegration.is_enabled !== false : true;

    const inAppOn = rule.in_app && settings["notifications.in_app_enabled"] !== false;
    const emailOn = rule.email && settings["notifications.email_enabled"] !== false && mailIntegrationEnabled;
    if (!inAppOn && !emailOn) return null;

    const t = await loadTicket(client, ticket, extra.escalationReason);
    const actorName = await resolveActorName(client, actor);
    const previousOwnerName = extra.previousAssigneeId
      ? ((await client.query("select name from employees where id = $1", [extra.previousAssigneeId])).rows[0]?.name as string | undefined) ?? null
      : null;
    const addedDepartmentNames = extra.addedDepartmentCodes?.length
      ? (await client.query("select name from departments where code = any($1)", [extra.addedDepartmentCodes])).rows.map(
          (r) => r.name as string,
        )
      : undefined;

    const recipients = (await resolveRecipients(client, event, t, actor, extra)).filter(
      (r) => r.employeeId !== actor?.employee_id || event === "escalated" || event.startsWith("sla_"),
    );

    const overrides = (settings["email.template_overrides"] ?? {}) as EmailTemplateOverridesMap;
    const senderName = typeof settings["notifications.sender_name"] === "string" ? settings["notifications.sender_name"] : undefined;
    const replyTo = typeof settings["notifications.reply_to"] === "string" ? settings["notifications.reply_to"] : undefined;

    const bucket = extra.dedupe ?? String(Math.floor(Date.now() / 60_000));
    const summary: DeliverSummary = { event, recipients: recipients.length, inApp: 0, email: 0, queued: 0, skipped: 0 };
    const dry = extra.dryRun || process.env.NOTIFY_DRY_RUN === "1";
    const viaOutbox = settings["ops.email_via_outbox"] !== false;
    const origin = appOrigin();

    for (const r of recipients) {
      const base = `${event}:${t.id}:${r.employeeId}:${bucket}`;
      const copy = renderNotificationEmail({
        event,
        ticket: t,
        recipient: { name: r.name, email: r.email, role: r.role },
        actorName,
        previousStatus: extra.previousStatus,
        previousOwnerName,
        addedDepartmentNames,
        comment: extra.comment,
        appUrl: origin,
        override: overrides[event],
      });

      if (inAppOn && r.userId && r.wantsInApp) {
        const logId = await claim(client, `${base}:in_app`, "in_app", event, t.id, r.userId, r.email, copy.subject);
        if (logId) {
          try {
            await client.query("select create_notification($1, $2, $3, $4, $5, $6)", [
              r.userId,
              IN_APP_TYPE[event],
              copy.inAppTitle,
              copy.inAppBody,
              t.id,
              t.priority ?? "P3",
            ]);
            await finish(client, `${base}:in_app`, "sent", "in_app");
            summary.inApp++;
          } catch (e) {
            await finish(client, `${base}:in_app`, "failed", "in_app", undefined, (e as Error).message);
          }
        }
      }

      if (emailOn && r.wantsEmail && r.email) {
        const logId = await claim(client, `${base}:email`, "email", event, t.id, r.userId, r.email, copy.subject);
        if (logId) {
          if (dry || !mailConfigured()) {
            await finish(
              client,
              `${base}:email`,
              dry ? "dry_run" : "skipped",
              dry ? "dry_run" : null,
              undefined,
              dry ? undefined : "mail not configured",
            );
            summary.skipped++;
            continue;
          }
          const msgPayload = {
            to: r.email,
            subject: copy.subject,
            html: copy.html,
            text: copy.text,
            fromName: senderName,
            replyTo,
          };
          if (viaOutbox) {
            try {
              await enqueueEmail(msgPayload, { emailLogId: logId });
              await finish(client, `${base}:email`, "queued", null);
              summary.queued++;
            } catch (e) {
              await finish(client, `${base}:email`, "failed", null, undefined, (e as Error).message);
              await logFailure(event, t.id, e);
            }
            continue;
          }
          try {
            const res = await sendMail(msgPayload);
            await finish(client, `${base}:email`, "sent", res.provider, res.id);
            summary.email++;
          } catch (e) {
            await finish(client, `${base}:email`, "failed", null, undefined, (e as Error).message);
            await logFailure(event, t.id, e);
          }
        }
      }
    }

    if (summary.queued > 0) void deliverPending({ limit: 5 }).catch(() => {});
    return summary;
  } finally {
    client.release();
  }
}

async function resolveActorName(c: PoolClient, actor: NotifyActor): Promise<string | null> {
  if (!actor) return null;
  if (actor.employee_id) {
    const row = (await c.query("select name from employees where id = $1", [actor.employee_id])).rows[0];
    if (row?.name) return row.name as string;
  }
  return actor.email ? actor.email.split("@")[0] : null;
}

async function claim(
  c: PoolClient,
  key: string,
  channel: string,
  event: string,
  ticketId: string,
  userId: string | null,
  recipient: string,
  subject: string,
): Promise<string | null> {
  const { rows, rowCount } = await c.query<{ id: string }>(
    `insert into email_log (dedupe_key, channel, event, ticket_id, user_id, recipient, subject)
     values ($1,$2,$3,$4,$5,$6,$7) on conflict (dedupe_key) do nothing returning id`,
    [key, channel, event, ticketId, userId, recipient, subject],
  );
  return (rowCount ?? 0) > 0 ? rows[0].id : null;
}

async function finish(
  c: PoolClient,
  key: string,
  status: string,
  provider: string | null,
  providerId?: string,
  error?: string,
) {
  await c.query(
    "update email_log set status = $2, provider = $3, provider_id = $4, error = $5, sent_at = case when $2 = 'sent' then now() else null end where dedupe_key = $1",
    [key, status, provider, providerId ?? null, error ?? null],
  );
}

async function loadTicket(c: PoolClient, given: NotifyTicket, escalationReason?: string | null): Promise<NotifyTicket> {
  const { rows } = await c.query(
    `select t.id, t.ticket_id, t.title, t.description, t.priority, t.status, t.sla_status,
            t.category, t.subcategory, t.studio_code, s.name as studio_name, s.city as studio_city,
            t.department_code, t.department_codes, d.name as department_name,
            t.assignee_id, t.assignee_ids, a.name as assignee_name,
            t.reporter_id, r.name as reporter_name,
            t.affected_client, t.sla_response_target, t.sla_resolution_target,
            t.resolution_summary, t.escalation_level
       from tickets t
       left join studios s on s.code = t.studio_code
       left join departments d on d.code = t.department_code
       left join employees a on a.id = t.assignee_id
       left join employees r on r.id = t.reporter_id
      where t.id = $1`,
    [given.id],
  );
  const r = rows[0];
  if (!r) return given;

  const ownerIds: string[] = Array.isArray(r.assignee_ids) && r.assignee_ids.length
    ? r.assignee_ids
    : r.assignee_id
      ? [r.assignee_id]
      : [];
  let ownerNames: string[] = [];
  if (ownerIds.length > 0) {
    const empRows = (await c.query("select id, name from employees where id = any($1)", [ownerIds])).rows;
    const byId = new Map(empRows.map((e) => [e.id as string, e.name as string]));
    ownerNames = ownerIds.map((id) => byId.get(id)).filter((x): x is string => Boolean(x));
  }

  let resolvedEscReason = escalationReason ?? given.escalationReason ?? null;
  if (!resolvedEscReason && Number(r.escalation_level) > 0) {
    const escRow = (
      await c
        .query("select reason from escalation_log where ticket_id = $1 order by escalated_at desc limit 1", [r.id])
        .catch(() => ({ rows: [] as { reason?: string }[] }))
    ).rows[0];
    resolvedEscReason = escRow?.reason ?? null;
  }

  return {
    id: r.id,
    ticketId: r.ticket_id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    status: r.status,
    slaStatus: r.sla_status,
    category: r.category,
    subcategory: r.subcategory,
    studioCode: r.studio_code,
    studioName: r.studio_name,
    studioCity: r.studio_city,
    departmentCode: r.department_code,
    departmentCodes: r.department_codes ?? [],
    departmentName: r.department_name,
    assigneeId: r.assignee_id,
    assigneeIds: ownerIds,
    assigneeName: r.assignee_name,
    ownerNames,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name,
    affectedClient: r.affected_client,
    slaResponseTarget: r.sla_response_target ? new Date(r.sla_response_target).toISOString() : null,
    slaResolutionTarget: r.sla_resolution_target ? new Date(r.sla_resolution_target).toISOString() : null,
    resolutionSummary: r.resolution_summary,
    escalationLevel: r.escalation_level,
    escalationReason: resolvedEscReason,
  };
}

async function resolveRecipients(
  c: PoolClient,
  event: NotifyEvent,
  t: NotifyTicket,
  _actor: NotifyActor,
  extra: NotifyExtra,
): Promise<Recipient[]> {
  const roles = new Map<string, RecipientRole>();
  const add = (id: string | null | undefined, role: RecipientRole) => {
    if (id && !roles.has(id)) roles.set(id, role);
  };
  const addOwners = (role: RecipientRole = "owner") => {
    add(t.assigneeId, role);
    for (const oid of t.assigneeIds ?? []) add(oid, role);
  };

  const managerOf = async (employeeId: string | null | undefined) => {
    if (!employeeId) return null;
    const { rows } = await c.query(
      "select m.id from employees e join employees m on m.name = e.reporting_manager and m.is_active and not m.exclude_from_escalation where e.id = $1 limit 1",
      [employeeId],
    );
    return (rows[0]?.id as string) ?? null;
  };
  const deptHead = async (code?: string | null) => {
    const dc = code ?? t.departmentCode;
    if (!dc) return null;
    return (
      ((
        await c.query(
          "select h.id as head_employee_id from departments d join employees h on h.id = d.head_employee_id and h.is_active and not h.exclude_from_escalation where d.code = $1",
          [dc],
        )
      ).rows[0]?.head_employee_id as string) ?? null
    );
  };

  switch (event) {
    case "ticket_created":
      addOwners("owner");
      add(await deptHead(), "manager");
      add(t.reporterId, "reporter");
      break;
    case "ticket_assigned":
      addOwners("owner");
      add(extra.previousAssigneeId, "previous_owner");
      add(t.reporterId, "reporter");
      break;
    case "owner_added":
      for (const id of extra.addedOwnerIds ?? []) add(id, "owner");
      add(t.assigneeId, "watcher");
      break;
    case "department_added":
      for (const dc of extra.addedDepartmentCodes ?? []) {
        add(await deptHead(dc), "manager");
      }
      add(t.assigneeId, "owner");
      break;
    case "comment_added":
      addOwners("owner");
      add(t.reporterId, "reporter");
      break;
    case "status_reopened":
      addOwners("owner");
      add(t.reporterId, "reporter");
      add(await deptHead(), "manager");
      break;
    case "escalated":
      addOwners("owner");
      add(await managerOf(t.assigneeId), "manager");
      add(await deptHead(), "manager");
      add(t.reporterId, "reporter");
      break;
    case "sla_at_risk":
      addOwners("owner");
      add(await managerOf(t.assigneeId), "manager");
      break;
    case "sla_breached":
      addOwners("owner");
      add(await managerOf(t.assigneeId), "manager");
      add(await deptHead(), "manager");
      break;
    default:
      add(t.reporterId, "reporter");
      addOwners("owner");
  }
  for (const w of extra.watcherEmployeeIds ?? []) add(w, "watcher");
  if (!roles.size) return [];

  const ids = [...roles.keys()];
  const { rows } = await c.query(
    `select e.id, e.name, e.email, u.id as user_id, u.is_active as user_active,
            coalesce(p.email_notifications, true) as email_pref, coalesce(p.push_notifications, true) as push_pref
       from employees e
       left join users u on u.employee_id = e.id
       left join user_preferences p on p.user_id = u.id
      where e.id = any($1) and e.is_active`,
    [ids],
  );
  return rows.map((r) => ({
    employeeId: r.id,
    name: r.name,
    email: r.email,
    role: roles.get(r.id)!,
    userId: r.user_id && r.user_active !== false ? r.user_id : null,
    wantsEmail: r.email_pref,
    wantsInApp: r.push_pref,
  }));
}
