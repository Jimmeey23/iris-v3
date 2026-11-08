import { NextResponse, type NextRequest } from "next/server";
import { pool, withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { fromAddress, mailConfigured, mailTransportMode, sendMail } from "@/lib/server/mailer";
import { deliverPending, retryFailed } from "@/lib/server/outbox";
import { RULE_EVENT, type NotifyEvent } from "@/lib/iris/notify-events";
import {
  renderDigestEmail,
  renderNotificationEmail,
  type DigestRenderPayload,
  type EmailTemplateOverride,
  type EmailTemplateOverridesMap,
  type EmailTicketContext,
} from "@/lib/iris/email-renderer";

export const dynamic = "force-dynamic";

const SAMPLE_TICKET: EmailTicketContext = {
  id: "tkt_sample_preview",
  ticketId: "P57-00142",
  title: "Air Conditioning Malfunction — Main Barre Studio, Kwality House",
  description:
    "The main workout floor AC unit is blinking a fault indicator and blowing warm air ahead of the 6:00 PM Signature Barre session. Two members reported discomfort during the previous class.",
  priority: "P1",
  status: "in_progress",
  slaStatus: "at_risk",
  category: "Repair and Maintenance",
  subcategory: "AC & Ventilation Repairs",
  studioCode: "KH",
  studioName: "Kwality House, Kemps Corner",
  studioCity: "Mumbai",
  departmentCode: "FAC",
  departmentName: "Facilities & Maintenance",
  assigneeName: "Arjun Pillai",
  ownerNames: ["Arjun Pillai", "Sanaya Wadia"],
  reporterName: "Aarav Mehta",
  affectedClient: "Ananya Verma",
  slaResponseTarget: new Date(Date.now() + 30 * 60_000).toISOString(),
  slaResolutionTarget: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  resolutionSummary:
    "HVAC technician cleared condenser fault, recharged refrigerant line, verified 19.5°C floor temperature, and scheduled a 5-day preventive follow-up check.",
  escalationLevel: 1,
  escalationReason: "Automatic escalation level 1: approaching high-priority SLA target during peak evening classes.",
};

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const isAdmin = auth.session.role === "admin";

  try {
    const transport = mailTransportMode();
    const configured = mailConfigured();

    const data = await withUser(auth.session.user_id, async (c) => {
      const settingsRows = (
        await c.query(
          "select key, value from app_settings where key like 'notifications.%' or key like 'email.%' or key = 'ops.email_via_outbox'",
        )
      ).rows;
      const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
      const rules = (await c.query("select event, in_app, email, whatsapp, updated_at from notification_rules order by event")).rows;
      return { settings, rules };
    });

    // Delivery stats & recent logs run via owner pool (email_log & outbox are service tables)
    const [statsRes, outboxRes, recentRes, integRes] = await Promise.all([
      pool
        .query<{
          sent_today: number;
          sent_7d: number;
          failed_7d: number;
          queued_now: number;
          skipped_today: number;
        }>(
          `with bounds as (
             select date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as day_start,
                    now() - interval '7 days' as week_start
           )
           select
             count(*) filter (where channel = 'email' and status in ('sent', 'dry_run') and created_at >= day_start)::int as sent_today,
             count(*) filter (where channel = 'email' and status in ('sent', 'dry_run') and created_at >= week_start)::int as sent_7d,
             count(*) filter (where channel = 'email' and status = 'failed' and created_at >= week_start)::int as failed_7d,
             count(*) filter (where channel = 'email' and status = 'queued')::int as queued_now,
             count(*) filter (where channel = 'email' and status = 'skipped' and created_at >= day_start)::int as skipped_today
           from iris.email_log, bounds`,
        )
        .catch(() => ({ rows: [{ sent_today: 0, sent_7d: 0, failed_7d: 0, queued_now: 0, skipped_today: 0 }] })),
      pool
        .query<{ pending: number; sending: number; failed: number }>(
          `select
             count(*) filter (where status = 'pending')::int as pending,
             count(*) filter (where status = 'sending')::int as sending,
             count(*) filter (where status = 'failed')::int as failed
           from iris.outbox`,
        )
        .catch(() => ({ rows: [{ pending: 0, sending: 0, failed: 0 }] })),
      isAdmin || auth.session.role === "manager"
        ? pool
            .query(
              `select l.id, l.event, l.ticket_id, l.recipient, l.subject, l.status, l.provider, l.provider_id, l.error, l.created_at, l.sent_at,
                      o.id as outbox_id, o.attempts as outbox_attempts
                 from iris.email_log l
                 left join iris.outbox o on o.email_log_id = l.id and o.status = 'failed'
                where l.channel = 'email'
                order by l.created_at desc
                limit 30`,
            )
            .catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),
      pool
        .query<{ is_enabled: boolean }>("select is_enabled from iris.integrations where id in ('mailtrap', 'email') limit 1")
        .catch(() => ({ rows: [] as { is_enabled: boolean }[] })),
    ]);

    const s = statsRes.rows[0] ?? { sent_today: 0, sent_7d: 0, failed_7d: 0, queued_now: 0, skipped_today: 0 };
    const ob = outboxRes.rows[0] ?? { pending: 0, sending: 0, failed: 0 };
    const attempted7d = Number(s.sent_7d) + Number(s.failed_7d);
    const deliveryRatePct = attempted7d > 0 ? Math.round((Number(s.sent_7d) / attempted7d) * 1000) / 10 : 100;

    const senderName =
      typeof data.settings["notifications.sender_name"] === "string"
        ? data.settings["notifications.sender_name"]
        : undefined;
    const from = fromAddress(senderName);
    const emailChannelEnabled = data.settings["notifications.email_enabled"] !== false;
    const integrationEnabled = integRes.rows[0] ? integRes.rows[0].is_enabled !== false : true;

    return NextResponse.json({
      service: {
        active: configured && emailChannelEnabled && integrationEnabled,
        configured,
        transport,
        from: from.email ? `${from.name} <${from.email}>` : from.name,
        replyTo: typeof data.settings["notifications.reply_to"] === "string" ? data.settings["notifications.reply_to"] : "",
        emailChannelEnabled,
        inAppChannelEnabled: data.settings["notifications.in_app_enabled"] !== false,
        integrationEnabled,
        outboxEnabled: data.settings["ops.email_via_outbox"] !== false,
      },
      stats: {
        sentToday: Number(s.sent_today),
        sent7d: Number(s.sent_7d),
        failed7d: Number(s.failed_7d),
        queued: Number(s.queued_now),
        skippedToday: Number(s.skipped_today),
        deliveryRatePct,
      },
      outbox: {
        pending: Number(ob.pending),
        sending: Number(ob.sending),
        failed: Number(ob.failed),
      },
      rules: data.rules,
      overrides: (data.settings["email.template_overrides"] ?? {}) as EmailTemplateOverridesMap,
      digestSchedule: (data.settings["email.digest_schedule"] ?? {
        dailyEnabled: true,
        dailyTimeIst: "08:00",
        weeklyEnabled: true,
        weeklyDay: "Monday",
        weeklyTimeIst: "08:00",
        recipients: "managers_and_admins",
      }) as Record<string, unknown>,
      recentLogs: recentRes.rows,
    });
  } catch (err) {
    return dbError(err);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const isAdmin = session.role === "admin";
  const isManagerOrAdmin = session.role === "admin" || session.role === "manager";

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "save_override") {
      if (!isManagerOrAdmin) return NextResponse.json({ error: "Manager or admin access required" }, { status: 403 });
      const templateKey = String(body.key ?? "");
      const override = (body.override ?? {}) as EmailTemplateOverride;
      const saved = await withUser(session.user_id, async (c) => {
        const cur =
          ((await c.query("select value from app_settings where key = 'email.template_overrides'")).rows[0]
            ?.value as EmailTemplateOverridesMap | undefined) ?? {};
        const next: EmailTemplateOverridesMap = { ...cur };
        const cleaned: EmailTemplateOverride = {};
        if (override.subjectPrefix?.trim()) cleaned.subjectPrefix = override.subjectPrefix.trim();
        if (override.customHeading?.trim()) cleaned.customHeading = override.customHeading.trim();
        if (override.customIntro?.trim()) cleaned.customIntro = override.customIntro.trim();
        if (override.ctaLabel?.trim()) cleaned.ctaLabel = override.ctaLabel.trim();
        if (override.footerNote?.trim()) cleaned.footerNote = override.footerNote.trim();
        if (Object.keys(cleaned).length > 0) {
          next[templateKey as keyof EmailTemplateOverridesMap] = cleaned;
        } else {
          delete next[templateKey as keyof EmailTemplateOverridesMap];
        }
        await c.query("select save_setting('email.template_overrides', $1::jsonb)", [JSON.stringify(next)]);
        return next;
      });
      return NextResponse.json({ ok: true, overrides: saved });
    }

    if (action === "save_schedule") {
      if (!isManagerOrAdmin) return NextResponse.json({ error: "Manager or admin access required" }, { status: 403 });
      const schedule = body.schedule && typeof body.schedule === "object" ? body.schedule : {};
      await withUser(session.user_id, async (c) => {
        await c.query("select save_setting('email.digest_schedule', $1::jsonb)", [JSON.stringify(schedule)]);
      });
      return NextResponse.json({ ok: true, digestSchedule: schedule });
    }

    if (action === "toggle_rule") {
      if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      const eventName = String(body.eventName ?? "");
      const emailEnabled = Boolean(body.email);
      if (!eventName) return NextResponse.json({ error: "eventName required" }, { status: 400 });
      const row = await withUser(session.user_id, async (c) => {
        const res = await c.query(
          `insert into notification_rules (event, in_app, email, whatsapp, updated_at)
           values ($1, true, $2, false, now())
           on conflict (event) do update set email = excluded.email, updated_at = now()
           returning *`,
          [eventName, emailEnabled],
        );
        return res.rows[0];
      });
      return NextResponse.json({ ok: true, rule: row });
    }

    if (action === "drain_outbox") {
      if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      const summary = await deliverPending({ limit: 25 });
      return NextResponse.json({ ok: true, summary });
    }

    if (action === "retry_failed") {
      if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      const outboxId = String(body.outboxId ?? "");
      if (outboxId) {
        const retried = await retryFailed(outboxId);
        if (retried) void deliverPending({ limit: 5 }).catch(() => {});
        return NextResponse.json({ ok: retried });
      }
      const res = await pool.query(
        `update iris.outbox set status = 'pending', next_attempt_at = now(), attempts = 0, updated_at = now()
          where status = 'failed'`,
      );
      if ((res.rowCount ?? 0) > 0) void deliverPending({ limit: 10 }).catch(() => {});
      return NextResponse.json({ ok: true, requeued: res.rowCount ?? 0 });
    }

    if (action === "send_test" || action === "send_digest") {
      const to = String(body.to ?? session.email ?? "").trim();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return NextResponse.json({ error: "Provide a valid recipient email address" }, { status: 400 });
      }

      const origin = (process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin || "http://localhost:3000").replace(
        /\/+$/,
        "",
      );

      const settings = await withUser(session.user_id, async (c) => {
        const rows = (
          await c.query(
            "select key, value from app_settings where key in ('email.template_overrides', 'notifications.sender_name', 'notifications.reply_to')",
          )
        ).rows;
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        const empName = session.employee_id
          ? ((await c.query("select name from employees where id = $1", [session.employee_id])).rows[0]?.name as
              | string
              | undefined)
          : undefined;
        let liveTicket: EmailTicketContext | null = null;
        if (body.ticketId && body.ticketId !== "sample") {
          const tRow = (
            await c.query(
              `select t.id, t.ticket_id, t.title, t.description, t.priority, t.status, t.sla_status,
                      t.category, t.subcategory, t.studio_code, s.name as studio_name, s.city as studio_city,
                      t.department_code, d.name as department_name, a.name as assignee_name, r.name as reporter_name,
                      t.affected_client, t.sla_response_target, t.sla_resolution_target, t.resolution_summary, t.escalation_level
                 from tickets t
                 left join studios s on s.code = t.studio_code
                 left join departments d on d.code = t.department_code
                 left join employees a on a.id = t.assignee_id
                 left join employees r on r.id = t.reporter_id
                where t.id = $1 or t.ticket_id = $1
                limit 1`,
              [String(body.ticketId)],
            )
          ).rows[0];
          if (tRow) {
            liveTicket = {
              id: tRow.id,
              ticketId: tRow.ticket_id,
              title: tRow.title,
              description: tRow.description,
              priority: tRow.priority,
              status: tRow.status,
              slaStatus: tRow.sla_status,
              category: tRow.category,
              subcategory: tRow.subcategory,
              studioCode: tRow.studio_code,
              studioName: tRow.studio_name,
              studioCity: tRow.studio_city,
              departmentCode: tRow.department_code,
              departmentName: tRow.department_name,
              assigneeName: tRow.assignee_name,
              reporterName: tRow.reporter_name,
              affectedClient: tRow.affected_client,
              slaResponseTarget: tRow.sla_response_target ? new Date(tRow.sla_response_target).toISOString() : null,
              slaResolutionTarget: tRow.sla_resolution_target
                ? new Date(tRow.sla_resolution_target).toISOString()
                : null,
              resolutionSummary: tRow.resolution_summary,
              escalationLevel: tRow.escalation_level,
            };
          }
        }
        return {
          overrides: (map["email.template_overrides"] ?? {}) as EmailTemplateOverridesMap,
          senderName: typeof map["notifications.sender_name"] === "string" ? map["notifications.sender_name"] : undefined,
          replyTo: typeof map["notifications.reply_to"] === "string" ? map["notifications.reply_to"] : undefined,
          actorName: empName ?? session.email,
          liveTicket,
        };
      });

      let rendered: { subject: string; html: string; text: string };
      let eventLabel: string;

      if (action === "send_digest") {
        const digestPayload = body.digestData as DigestRenderPayload | undefined;
        if (!digestPayload || !digestPayload.summary) {
          return NextResponse.json({ error: "Missing digestData payload" }, { status: 400 });
        }
        const key = digestPayload.period === "weekly" ? "weekly_digest" : "daily_digest";
        eventLabel = key;
        rendered = renderDigestEmail(digestPayload, {
          appUrl: origin,
          override: settings.overrides[key],
          testBadge: true,
        });
      } else {
        const event = (body.event as NotifyEvent) || "ticket_created";
        if (!(event in RULE_EVENT)) {
          return NextResponse.json({ error: `Unknown notification event: ${event}` }, { status: 400 });
        }
        eventLabel = `test:${event}`;
        rendered = renderNotificationEmail({
          event,
          ticket: settings.liveTicket ?? SAMPLE_TICKET,
          recipient: { name: settings.actorName, email: to, role: "owner" },
          actorName: settings.actorName,
          comment:
            event === "comment_added"
              ? {
                  author: settings.actorName,
                  content: "Technician is on-site at Kwality House inspecting the HVAC unit and checking airflow.",
                  isInternal: false,
                }
              : null,
          appUrl: origin,
          override: settings.overrides[event],
          testBadge: true,
        });
      }

      const dedupeKey = `${eventLabel}:${to}:${Date.now()}`;
      if (!mailConfigured()) {
        await pool
          .query(
            `insert into iris.email_log (dedupe_key, channel, event, user_id, recipient, subject, status, error)
             values ($1, 'email', $2, $3, $4, $5, 'skipped', 'Mail provider credentials (MAILTRAP_*) not configured')`,
            [dedupeKey, eventLabel, session.user_id, to, rendered.subject],
          )
          .catch(() => {});
        return NextResponse.json(
          {
            ok: false,
            configured: false,
            transport: "unconfigured",
            to,
            subject: rendered.subject,
            error:
              "Mail provider is not configured on this server yet. Add MAILTRAP_FROM_EMAIL + MAILTRAP_API_KEY (or MAILTRAP_SMTP_*) in environment variables, or set NOTIFY_DRY_RUN=1 to simulate.",
          },
          { status: 503 },
        );
      }

      try {
        const res = await sendMail({
          to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          fromName: settings.senderName,
          replyTo: settings.replyTo,
          category: action === "send_digest" ? "iris-digest" : "iris-test",
        });
        const status = res.provider === "dry_run" ? "dry_run" : "sent";
        await pool
          .query(
            `insert into iris.email_log (dedupe_key, channel, event, user_id, recipient, subject, status, provider, provider_id, sent_at)
             values ($1, 'email', $2, $3, $4, $5, $6, $7, $8, now())`,
            [dedupeKey, eventLabel, session.user_id, to, rendered.subject, status, res.provider, res.id ?? null],
          )
          .catch(() => {});
        return NextResponse.json({
          ok: true,
          transport: res.provider,
          id: res.id ?? null,
          to,
          subject: rendered.subject,
          dryRun: res.provider === "dry_run",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await pool
          .query(
            `insert into iris.email_log (dedupe_key, channel, event, user_id, recipient, subject, status, error)
             values ($1, 'email', $2, $3, $4, $5, 'failed', $6)`,
            [dedupeKey, eventLabel, session.user_id, to, rendered.subject, message],
          )
          .catch(() => {});
        return NextResponse.json({ ok: false, error: message }, { status: 502 });
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return dbError(err);
  }
}
