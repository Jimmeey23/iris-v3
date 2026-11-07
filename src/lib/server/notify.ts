import "server-only";
import { after } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { sendMail, mailConfigured } from "./mailer";
import { enqueueEmail, deliverPending } from "./outbox";
import { RULE_EVENT, statusEvent, type NotifyEvent } from "@/lib/iris/notify-events";
import {
  BRAND, button, emailDocument, esc, fact, firstName, greeting, grid, label, priorityPill, section,
} from "./email-layout";

// The event taxonomy lives in lib/iris/notify-events (pure) so the sweeps and the unit
// tests share it; re-exported here for the routes that already import it from this module.
export { RULE_EVENT, statusEvent };
export type { NotifyEvent };

/**
 * Stage-based ticket notifications.
 *
 * notifyTicketEvent() is fire-and-forget: it never throws and never delays the request
 * (work is scheduled with next/server `after`). Delivery runs as the database owner (no RLS),
 * because recipients are other people than the signed-in user.
 *
 * Per event: read iris.notification_rules (admin-editable) -> resolve recipients -> honour
 * app_settings channel switches and each user's preferences -> write in-app rows through
 * iris.create_notification and queue email. iris.email_log makes every (event, ticket,
 * recipient, channel) idempotent and doubles as the audit trail.
 *
 * Email delivery is *queued*, not inline (ported from iris-ai-v2): a claimed row is
 * inserted into iris.outbox and a drain worker sends it with exponential-backoff
 * retries (lib/server/outbox). A Mailtrap outage therefore delays mail instead of
 * losing it. `ops.email_via_outbox = false` falls back to the old inline send.
 */

export type NotifyTicket = {
  id: string;
  ticketId?: string | null;
  title: string;
  priority?: string | null;
  status?: string | null;
  category?: string | null;
  studioCode?: string | null;
  departmentCode?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  affectedClient?: string | null;
  slaResolutionTarget?: string | null;
  escalationLevel?: number | null;
};

export type NotifyActor = { user_id?: string | null; employee_id?: string | null; email?: string | null } | null;

export type NotifyExtra = {
  previousAssigneeId?: string | null;
  previousStatus?: string | null;
  comment?: { author?: string | null; content: string; isInternal?: boolean } | null;
  /** Extra employee ids to notify (watchers). */
  watcherEmployeeIds?: string[];
  /** Overrides the dedupe discriminator (default: minute bucket). */
  dedupe?: string;
  /** Don't send mail, log as dry_run. Also enabled globally with NOTIFY_DRY_RUN=1. */
  dryRun?: boolean;
};

type Role = "owner" | "reporter" | "manager" | "watcher" | "previous_owner";
type Recipient = {
  employeeId: string; name: string; email: string; role: Role;
  userId: string | null; wantsEmail: boolean; wantsInApp: boolean;
};

const IN_APP_TYPE: Record<NotifyEvent, "critical" | "sla" | "escalated" | "assignment" | "comment" | "info"> = {
  ticket_created: "info",
  ticket_assigned: "assignment",
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

// ---------------------------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------------------------

export function notifyTicketEvent(event: NotifyEvent, ticket: NotifyTicket, actor: NotifyActor = null, extra: NotifyExtra = {}): void {
  const run = () => deliver(event, ticket, actor, extra).catch((err) => logFailure(event, ticket.id, err));
  try {
    after(run);
  } catch {
    void run(); // outside a request scope (scripts, tests)
  }
}

/** Awaitable variant for the cron sweep and tests. Still never throws. */
export async function notifyTicketEventNow(event: NotifyEvent, ticket: NotifyTicket, actor: NotifyActor = null, extra: NotifyExtra = {}) {
  return deliver(event, ticket, actor, extra).catch((err) => { logFailure(event, ticket.id, err); return null; });
}

async function logFailure(event: string, ticketId: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[notify] ${event} ${ticketId}: ${message}`);
  try {
    await pool.query("select iris.log_app_event('error', 'notify', $1, $2::jsonb)", [
      `Notification failed: ${event}`, JSON.stringify({ ticketId, error: message }),
    ]);
  } catch { /* logging must never throw */ }
}

// ---------------------------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------------------------

type DeliverSummary = { event: NotifyEvent; recipients: number; inApp: number; email: number; queued: number; skipped: number };

async function deliver(event: NotifyEvent, ticket: NotifyTicket, actor: NotifyActor, extra: NotifyExtra): Promise<DeliverSummary | null> {
  const client = await pool.connect();
  try {
    await client.query("set search_path = iris, public");
    const ruleName = RULE_EVENT[event];
    const rule = (await client.query("select in_app, email from notification_rules where event = $1", [ruleName])).rows[0];
    if (!rule) return null;

    const settings = Object.fromEntries(
      (await client.query("select key, value from app_settings where key like 'notifications.%' or key = 'ops.email_via_outbox'")).rows.map((r) => [r.key, r.value]),
    );
    const inAppOn = rule.in_app && settings["notifications.in_app_enabled"] !== false;
    const emailOn = rule.email && settings["notifications.email_enabled"] !== false;
    if (!inAppOn && !emailOn) return null;

    // Prefer fresh DB values for the fields recipients depend on.
    const t = await loadTicket(client, ticket);
    const recipients = (await resolveRecipients(client, event, t, actor, extra))
      .filter((r) => r.employeeId !== actor?.employee_id || event === "escalated" || event.startsWith("sla_"));

    const bucket = extra.dedupe ?? String(Math.floor(Date.now() / 60_000));
    const summary: DeliverSummary = { event, recipients: recipients.length, inApp: 0, email: 0, queued: 0, skipped: 0 };
    const dry = extra.dryRun || process.env.NOTIFY_DRY_RUN === "1";
    const viaOutbox = settings["ops.email_via_outbox"] !== false;

    for (const r of recipients) {
      const base = `${event}:${t.id}:${r.employeeId}:${bucket}`;
      const copy = buildCopy(event, t, r, actor, extra);

      if (inAppOn && r.userId && r.wantsInApp) {
        const logId = await claim(client, `${base}:in_app`, "in_app", event, t.id, r.userId, r.email, copy.subject);
        if (logId) {
          try {
            await client.query("select create_notification($1, $2, $3, $4, $5, $6)", [
              r.userId, IN_APP_TYPE[event], copy.inAppTitle, copy.inAppBody, t.id, t.priority ?? "P3",
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
            await finish(client, `${base}:email`, dry ? "dry_run" : "skipped", dry ? "dry_run" : null, undefined, dry ? undefined : "mail not configured");
            summary.skipped++;
            continue;
          }
          if (viaOutbox) {
            // Queue for the drain worker (exponential-backoff retries); the outbox
            // settles the email_log row to sent/failed when it finishes with it.
            try {
              await enqueueEmail({ to: r.email, subject: copy.subject, html: copy.html, text: copy.text }, { emailLogId: logId });
              await finish(client, `${base}:email`, "queued", null);
              summary.queued++;
            } catch (e) {
              await finish(client, `${base}:email`, "failed", null, undefined, (e as Error).message);
              await logFailure(event, t.id, e);
            }
            continue;
          }
          try {
            const res = await sendMail({ to: r.email, subject: copy.subject, html: copy.html, text: copy.text });
            await finish(client, `${base}:email`, "sent", res.provider, res.id);
            summary.email++;
          } catch (e) {
            await finish(client, `${base}:email`, "failed", null, undefined, (e as Error).message);
            await logFailure(event, t.id, e);
          }
        }
      }
    }
    // Anything queued: give the drain a nudge right away so a quiet deployment still
    // delivers in seconds. The sweeps and the cron call deliverPending too; it is
    // claim-safe to run concurrently.
    if (summary.queued > 0) void deliverPending({ limit: 5 }).catch(() => {});
    return summary;
  } finally {
    client.release();
  }
}

/** Insert the idempotency row; returns its id, or null when someone already handled this key. */
async function claim(c: PoolClient, key: string, channel: string, event: string, ticketId: string, userId: string | null, recipient: string, subject: string): Promise<string | null> {
  const { rows, rowCount } = await c.query<{ id: string }>(
    `insert into email_log (dedupe_key, channel, event, ticket_id, user_id, recipient, subject)
     values ($1,$2,$3,$4,$5,$6,$7) on conflict (dedupe_key) do nothing returning id`,
    [key, channel, event, ticketId, userId, recipient, subject],
  );
  return (rowCount ?? 0) > 0 ? rows[0].id : null;
}

async function finish(c: PoolClient, key: string, status: string, provider: string | null, providerId?: string, error?: string) {
  await c.query(
    "update email_log set status = $2, provider = $3, provider_id = $4, error = $5, sent_at = case when $2 = 'sent' then now() else null end where dedupe_key = $1",
    [key, status, provider, providerId ?? null, error ?? null],
  );
}

async function loadTicket(c: PoolClient, given: NotifyTicket): Promise<NotifyTicket> {
  const { rows } = await c.query(
    `select id, ticket_id, title, priority, status, category, studio_code, department_code, assignee_id,
            reporter_id, affected_client, sla_resolution_target, escalation_level from tickets where id = $1`,
    [given.id],
  );
  const r = rows[0];
  if (!r) return given;
  return {
    id: r.id, ticketId: r.ticket_id, title: r.title, priority: r.priority, status: r.status, category: r.category,
    studioCode: r.studio_code, departmentCode: r.department_code, assigneeId: r.assignee_id, reporterId: r.reporter_id,
    affectedClient: r.affected_client, slaResolutionTarget: r.sla_resolution_target ? new Date(r.sla_resolution_target).toISOString() : null,
    escalationLevel: r.escalation_level,
  };
}

// ---------------------------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------------------------

async function resolveRecipients(c: PoolClient, event: NotifyEvent, t: NotifyTicket, actor: NotifyActor, extra: NotifyExtra): Promise<Recipient[]> {
  const roles = new Map<string, Role>();
  const add = (id: string | null | undefined, role: Role) => { if (id && !roles.has(id)) roles.set(id, role); };

  // Assignee's reporting manager (tier manager) and the department head.
  const managerOf = async (employeeId: string | null | undefined) => {
    if (!employeeId) return null;
    const { rows } = await c.query(
      "select m.id from employees e join employees m on m.name = e.reporting_manager and m.is_active and not m.exclude_from_escalation where e.id = $1 limit 1", [employeeId]);
    return (rows[0]?.id as string) ?? null;
  };
  const deptHead = async () => {
    if (!t.departmentCode) return null;
    return ((await c.query("select h.id as head_employee_id from departments d join employees h on h.id = d.head_employee_id and h.is_active and not h.exclude_from_escalation where d.code = $1", [t.departmentCode])).rows[0]?.head_employee_id as string) ?? null;
  };

  switch (event) {
    case "ticket_created":
      add(t.assigneeId, "owner");
      add(await deptHead(), "manager");
      add(t.reporterId, "reporter");
      break;
    case "ticket_assigned":
      add(t.assigneeId, "owner");
      add(extra.previousAssigneeId, "previous_owner");
      add(t.reporterId, "reporter");
      break;
    case "comment_added":
      add(t.assigneeId, "owner");
      add(t.reporterId, "reporter");
      break;
    case "status_reopened":
      add(t.assigneeId, "owner");
      add(t.reporterId, "reporter");
      add(await deptHead(), "manager");
      break;
    case "escalated":
      add(t.assigneeId, "owner");
      add(await managerOf(t.assigneeId), "manager");
      add(await deptHead(), "manager");
      add(t.reporterId, "reporter");
      break;
    case "sla_at_risk":
      add(t.assigneeId, "owner");
      add(await managerOf(t.assigneeId), "manager");
      break;
    case "sla_breached":
      add(t.assigneeId, "owner");
      add(await managerOf(t.assigneeId), "manager");
      add(await deptHead(), "manager");
      break;
    default: // in_progress, awaiting_response, resolved, closed
      add(t.reporterId, "reporter");
      add(t.assigneeId, "owner");
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
    employeeId: r.id, name: r.name, email: r.email, role: roles.get(r.id)!,
    userId: r.user_id && r.user_active !== false ? r.user_id : null,
    wantsEmail: r.email_pref, wantsInApp: r.push_pref,
  }));
}

// ---------------------------------------------------------------------------------------------
// Copy + HTML
// ---------------------------------------------------------------------------------------------

type Copy = { subject: string; html: string; text: string; inAppTitle: string; inAppBody: string };

function buildCopy(event: NotifyEvent, t: NotifyTicket, r: Recipient, actor: NotifyActor, extra: NotifyExtra): Copy {
  const ref = t.ticketId || t.id;
  const label_ = `${ref}: ${t.title}`;
  const by = actor?.email ? actor.email.split("@")[0] : null;
  const mine = r.role === "owner";
  const status = (t.status ?? "").replace(/_/g, " ");

  type Spec = { subject: string; context: string; accent: string; heading: string; lede: string; steps: string[]; cta: string; why: string; inApp: string };
  const specs: Record<NotifyEvent, Spec> = {
    ticket_created: {
      subject: `New ticket ${label_}`, context: "New ticket", accent: BRAND.blue,
      heading: mine ? "A new ticket is on your plate" : "A new ticket has been logged",
      lede: `${t.title}${t.affectedClient ? ` (client: ${t.affectedClient})` : ""} was logged${by ? ` by ${by}` : ""}.`,
      steps: mine ? ["Acknowledge it and send the first response.", "Set the status to In progress when you start."] : [],
      cta: "Open the ticket", why: "a new ticket was created in your area", inApp: "New ticket",
    },
    ticket_assigned: {
      subject: r.role === "previous_owner" ? `Reassigned: ${label_}` : `Assigned to you: ${label_}`,
      context: "Assignment", accent: BRAND.gold,
      heading: r.role === "previous_owner" ? "This ticket was reassigned" : mine ? "A ticket was assigned to you" : "A ticket was assigned",
      lede: r.role === "previous_owner" ? `${t.title} is no longer assigned to you.` : `${t.title} is now owned by ${mine ? "you" : "a teammate"}.`,
      steps: mine ? ["Review the details and the history.", "Reply to the member and set the status."] : [],
      cta: "Open the ticket", why: "you are involved in this ticket", inApp: r.role === "previous_owner" ? "Ticket reassigned" : "Ticket assigned to you",
    },
    status_in_progress: {
      subject: `In progress: ${label_}`, context: "Status", accent: BRAND.blue,
      heading: "Work has started", lede: `${t.title} is now in progress.`, steps: [], cta: "View the ticket",
      why: "you follow this ticket", inApp: "Ticket in progress",
    },
    status_awaiting_response: {
      subject: `Awaiting response: ${label_}`, context: "Status", accent: BRAND.gold,
      heading: "Waiting on a reply", lede: `${t.title} is waiting for a response before it can move on.`,
      steps: mine ? ["Follow up if the reply is overdue."] : [], cta: "View the ticket",
      why: "you follow this ticket", inApp: "Awaiting response",
    },
    status_resolved: {
      subject: `Resolved: ${label_}`, context: "Resolved", accent: BRAND.green,
      heading: "This ticket has been resolved", lede: `${t.title} was marked resolved${by ? ` by ${by}` : ""}.`,
      steps: r.role === "reporter" ? ["If it is not actually fixed, reopen it from the ticket."] : [], cta: "View the ticket",
      why: "you follow this ticket", inApp: "Ticket resolved",
    },
    status_closed: {
      subject: `Closed: ${label_}`, context: "Closed", accent: BRAND.green,
      heading: "This ticket is closed", lede: `${t.title} has been closed.`, steps: [], cta: "View the ticket",
      why: "you follow this ticket", inApp: "Ticket closed",
    },
    status_reopened: {
      subject: `Reopened: ${label_}`, context: "Reopened", accent: BRAND.red,
      heading: "This ticket was reopened", lede: `${t.title} is back to ${status || "open"}${extra.previousStatus ? ` (was ${extra.previousStatus.replace(/_/g, " ")})` : ""}.`,
      steps: mine ? ["Find out what was missed and reply to the member."] : [], cta: "Open the ticket",
      why: "you follow this ticket", inApp: "Ticket reopened",
    },
    comment_added: {
      subject: `New comment on ${label_}`, context: "Comment", accent: BRAND.blue,
      heading: `${extra.comment?.author ? firstName(extra.comment.author) ?? extra.comment.author : "Someone"} commented`,
      lede: extra.comment ? `${extra.comment.isInternal ? "Internal note: " : ""}${extra.comment.content.slice(0, 400)}${extra.comment.content.length > 400 ? "..." : ""}` : "A new comment was added.",
      steps: [], cta: "Read and reply",
      why: "you follow this ticket", inApp: `New comment on ${ref}`,
    },
    escalated: {
      subject: `[Escalated] ${label_}`, context: "Escalation", accent: BRAND.red,
      heading: mine ? "Your ticket was escalated" : "A ticket was escalated",
      lede: `${t.title} has been escalated${t.escalationLevel ? ` to level ${t.escalationLevel}` : ""} and needs attention today.`,
      steps: ["Decide who owns it now.", "Make sure the member has heard from us.", "Log the plan on the ticket."], cta: "Take over the ticket",
      why: "this ticket was escalated", inApp: "Ticket escalated",
    },
    sla_at_risk: {
      subject: `SLA at risk: ${label_}`, context: "SLA", accent: BRAND.gold,
      heading: "This ticket is close to its SLA target", lede: `${t.title} is running out of time to meet its resolution target${t.slaResolutionTarget ? ` (${fmt(t.slaResolutionTarget)})` : ""}.`,
      steps: mine ? ["Resolve it, or extend the target with a reason."] : ["Check in with the owner."], cta: "Check the ticket",
      why: "its SLA is at risk", inApp: "SLA at risk",
    },
    sla_breached: {
      subject: `SLA breached: ${label_}`, context: "SLA", accent: BRAND.red,
      heading: "This ticket has breached its SLA", lede: `${t.title} passed its resolution target${t.slaResolutionTarget ? ` (${fmt(t.slaResolutionTarget)})` : ""}.`,
      steps: ["Resolve it or escalate it now.", "Update the member."], cta: "Open the ticket",
      why: "its SLA was breached", inApp: "SLA breached",
    },
  };
  const s = specs[event];
  const url = `${appOrigin()}/?ticket=${encodeURIComponent(t.id)}`;

  const steps = s.steps.length
    ? section(`${label("What to do next")}<ol style="margin:0;padding-left:18px;font-family:${FONT_};font-size:14.5px;line-height:1.6;color:${BRAND.body};">${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`)
    : "";
  const body = [
    section(`${label(`${s.context}${ref ? ` · ${ref}` : ""}`, s.accent)}<h1 class="e-h1" style="margin:0 0 10px;font-family:${FONT_};font-size:26px;line-height:1.2;color:${BRAND.ink};">${esc(s.heading)}</h1><p style="margin:0;font-family:${FONT_};font-size:15px;line-height:1.6;color:${BRAND.body};">${esc(greeting(r.name))} ${esc(s.lede)}</p>`, "0 36px 20px"),
    section(`${priorityPill(t.priority ?? undefined)}`, "0 36px 14px"),
    section(grid([fact("Ticket", label_), fact("Status", status || null), fact("Category", t.category), fact("Studio", t.studioCode), fact("Priority", t.priority)], 2), "0 36px 20px"),
    steps,
    section(button(url, s.cta, s.accent === BRAND.red ? BRAND.red : BRAND.ink), "0 36px 32px"),
  ].join("");

  const html = emailDocument({
    title: s.subject, preheader: s.lede.slice(0, 120), context: s.context, accent: s.accent, body,
    footer: `You are receiving this because ${esc(s.why)}. Replies to this address are not monitored.`,
  });
  const text = [`${greeting(r.name)}`, "", s.lede, "", ...s.steps.map((x, i) => `${i + 1}. ${x}`), "", `${s.cta}: ${url}`].join("\n");
  return { subject: s.subject, html, text, inAppTitle: s.inApp, inAppBody: `${label_}${event === "comment_added" && extra.comment ? ` — ${extra.comment.content.slice(0, 100)}` : ""}` };
}

const FONT_ = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
