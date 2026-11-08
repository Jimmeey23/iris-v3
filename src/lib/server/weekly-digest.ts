import "server-only";
import type { PoolClient } from "pg";
import { pool, withUser } from "./db";
import { enqueueEmail } from "./outbox";
import { mailConfigured } from "./mail-core";
import { runHealthChecks } from "./health-checks";
import { BRAND, FONT, emailDocument, esc, greeting, grid, label, section, button } from "./email-layout";

/**
 * Monday-morning digest for managers and admins.
 *
 * Each digest is built INSIDE withUser(recipient), so row-level security scopes it
 * exactly to what that person can see: an admin gets the whole workspace, a manager
 * their department and studios. Nothing is computed for one person and shown to another.
 *
 * Sent once per person per ISO week (email_log dedupe key), through the outbox, on
 * Monday from 09:00 Asia/Kolkata. `email.weekly_digest` (app_settings) turns it off.
 */

export type Digest = {
  week: string;
  scope: string;
  created: number;
  createdPrev: number;
  resolved: number;
  openNow: number;
  breachedOpen: number;
  avgResolutionH: number | null;
  avgFirstResponseH: number | null;
  responded: number;
  topIssues: { issue: string; count: number }[];
  oldestOpen: { ticket: string; title: string; ageDays: number; owner: string; priority: string }[];
  recurrence: { due: number; failed: number };
  trainers: { name: string; score: number; band: string }[] | null;
  health: { errors: number; warnings: number; top: string[] } | null;
};

/** ISO week label, e.g. 2026-W45, in IST. */
export function isoWeek(d = new Date()): string {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const t = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday, 09:00 or later, IST. */
export function isDigestTime(d = new Date()): boolean {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return ist.getUTCDay() === 1 && ist.getUTCHours() >= 9;
}

export async function buildDigest(c: PoolClient, role: string, scopeLabel: string): Promise<Digest> {
  const one = async (sql: string) => (await c.query(sql)).rows[0];
  const all = async (sql: string) => (await c.query(sql)).rows;
  const OPEN = "status not in ('resolved','closed')";

  const k = await one(`
    select count(*) filter (where created_at >= now() - interval '7 days')::int as created,
           count(*) filter (where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')::int as created_prev,
           count(*) filter (where resolved_at >= now() - interval '7 days')::int as resolved,
           count(*) filter (where ${OPEN})::int as open_now,
           count(*) filter (where ${OPEN} and sla_resolution_target < now())::int as breached_open,
           round(avg(extract(epoch from (resolved_at - created_at)) / 3600) filter (where resolved_at >= now() - interval '7 days')::numeric, 1) as avg_res_h,
           round(avg(extract(epoch from (first_response_at - created_at)) / 3600) filter (where first_response_at >= now() - interval '7 days')::numeric, 1) as avg_fr_h,
           count(*) filter (where first_response_at >= now() - interval '7 days')::int as responded
      from tickets where title not like '[Recurrence check%'`);

  const topIssues = (
    await all(`select coalesce(subcategory, category) as issue, count(*)::int as count from tickets
                where created_at >= now() - interval '7 days' and title not like '[Recurrence check%'
                group by 1 order by 2 desc limit 5`)
  ).map((r) => ({ issue: r.issue as string, count: r.count as number }));

  const oldestOpen = (
    await all(`select t.ticket_id, t.title, t.priority, coalesce(t.assignee_name, 'Unassigned') as owner,
                      floor(extract(epoch from (now() - t.created_at)) / 86400)::int as age
                 from v_tickets_full t where t.status not in ('resolved','closed')
                order by t.created_at asc limit 5`)
  ).map((r) => ({ ticket: r.ticket_id, title: r.title, ageDays: r.age, owner: r.owner, priority: r.priority }));

  const rc = await one(`select count(*) filter (where status = 'open')::int as due,
                               count(*) filter (where status = 'failed' and outcome_at >= now() - interval '7 days')::int as failed
                          from recurrence_checks`).catch(() => ({ due: 0, failed: 0 }));

  // Assessments are manager/admin-only under RLS, which is who receives this anyway.
  const trainers = (
    await all(`select trainer_name, round(avg(score))::int as score from trainer_assessments
                where submitted_at >= now() - interval '30 days' group by 1 order by 2 asc limit 5`)
  ).map((r) => ({ name: r.trainer_name, score: r.score, band: r.score >= 80 ? "On track" : r.score >= 65 ? "Watch" : "Coaching priority" }));

  let health: Digest["health"] = null;
  if (role === "admin" || role === "manager") {
    const issues = await runHealthChecks(c, role);
    health = {
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      top: issues.slice(0, 3).map((i) => i.title),
    };
  }

  return {
    week: isoWeek(),
    scope: scopeLabel,
    created: k.created,
    createdPrev: k.created_prev,
    resolved: k.resolved,
    openNow: k.open_now,
    breachedOpen: k.breached_open,
    avgResolutionH: k.avg_res_h === null ? null : Number(k.avg_res_h),
    avgFirstResponseH: k.avg_fr_h === null ? null : Number(k.avg_fr_h),
    responded: k.responded,
    topIssues,
    oldestOpen,
    recurrence: { due: rc?.due ?? 0, failed: rc?.failed ?? 0 },
    trainers: trainers.length ? trainers : null,
    health,
  };
}

const hours = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`);

export function renderDigest(d: Digest, name: string | null, appUrl: string): { subject: string; html: string; text: string } {
  const delta = d.createdPrev ? Math.round(((d.created - d.createdPrev) / d.createdPrev) * 100) : null;
  const subject = `IRIS weekly: ${d.created} new, ${d.resolved} resolved, ${d.breachedOpen} past SLA · ${d.week}`;
  const stat = (title: string, value: string, sub = "") =>
    `<div style="border:1px solid ${BRAND.line};border-radius:12px;padding:14px 16px;font-family:${FONT}">
       ${label(title)}<div style="font-size:24px;font-weight:700;color:${BRAND.ink};margin-top:4px">${esc(value)}</div>
       ${sub ? `<div style="font-size:12px;color:${BRAND.faint};margin-top:2px">${esc(sub)}</div>` : ""}</div>`;
  const list = (title: string, rows: string[]) =>
    rows.length
      ? section(`${label(title)}<table role="presentation" width="100%" style="font-family:${FONT};font-size:13px;color:${BRAND.ink};margin-top:6px">${rows.join("")}</table>`)
      : "";
  const tr = (l: string, r: string) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid ${BRAND.line}">${l}</td><td align="right" style="padding:6px 0;border-bottom:1px solid ${BRAND.line};white-space:nowrap">${r}</td></tr>`;

  const body = [
    section(`<p style="font-family:${FONT};font-size:15px;color:${BRAND.ink};margin:0">${esc(greeting(name))} here's ${esc(d.scope)} for the last 7 days.</p>`),
    section(grid([
      stat("New tickets", String(d.created), delta === null ? "" : `${delta >= 0 ? "+" : ""}${delta}% vs previous week`),
      stat("Resolved", String(d.resolved), d.avgResolutionH === null ? "" : `avg ${hours(d.avgResolutionH)} to resolve`),
      stat("Open now", String(d.openNow), d.breachedOpen ? `${d.breachedOpen} past SLA` : "none past SLA"),
      stat("First response", hours(d.avgFirstResponseH), d.responded ? `avg across ${d.responded} tickets` : "none recorded this week"),
    ], 2)),
    list("Most reported this week", d.topIssues.map((i) => tr(esc(i.issue), String(i.count)))),
    list("Oldest open tickets", d.oldestOpen.map((t) => tr(`<b>${esc(t.ticket)}</b> ${esc(t.title.slice(0, 70))}<br><span style="color:${BRAND.faint};font-size:12px">${esc(t.priority)} · ${esc(t.owner)}</span>`, `${t.ageDays}d`))),
    d.recurrence.due || d.recurrence.failed
      ? section(`<p style="font-family:${FONT};font-size:13px;color:${BRAND.ink};margin:0">${label("Repair re-checks")}<br>${d.recurrence.due} due now${d.recurrence.failed ? ` · <b style="color:#b42318">${d.recurrence.failed} fault${d.recurrence.failed > 1 ? "s" : ""} returned this week</b>` : ""}.</p>`)
      : "",
    d.trainers ? list("Lowest trainer scores · last 30 days", d.trainers.map((t) => tr(esc(t.name), `${t.score}% · ${esc(t.band)}`))) : "",
    d.health && (d.health.errors || d.health.warnings)
      ? section(`<p style="font-family:${FONT};font-size:13px;color:${BRAND.ink};margin:0">${label("Settings health")}<br>${d.health.errors} problem${d.health.errors === 1 ? "" : "s"}, ${d.health.warnings} warning${d.health.warnings === 1 ? "" : "s"}: ${d.health.top.map(esc).join("; ")}.</p>`)
      : "",
    section(button(appUrl, "Open IRIS")),
  ].join("");

  const text = [
    `${greeting(name)} here's ${d.scope} for the last 7 days (${d.week}).`,
    `New ${d.created} · Resolved ${d.resolved} · Open ${d.openNow} (${d.breachedOpen} past SLA) · First response ${hours(d.avgFirstResponseH)}`,
    d.topIssues.length ? `Most reported: ${d.topIssues.map((i) => `${i.issue} (${i.count})`).join(", ")}` : "",
    d.oldestOpen.length ? `Oldest open: ${d.oldestOpen.map((t) => `${t.ticket} ${t.ageDays}d`).join(", ")}` : "",
    d.health ? `Settings health: ${d.health.errors} problems, ${d.health.warnings} warnings.` : "",
    appUrl,
  ].filter(Boolean).join("\n");

  return {
    subject,
    text,
    html: emailDocument({
      title: subject,
      preheader: `${d.created} new · ${d.resolved} resolved · ${d.openNow} open`,
      context: `Weekly digest · ${d.week}`,
      accent: BRAND.obsidian,
      body,
      footer: "You get this because you manage tickets in IRIS. Admins can turn it off in Settings → Organization & Limits.",
    }),
  };
}

type Recipient = { user_id: string; email: string; role: string; name: string | null; department: string | null };

export async function digestRecipients(): Promise<Recipient[]> {
  return (
    await pool.query<Recipient>(
      `select u.id as user_id, u.email::text as email, u.role, coalesce(e.name, u.name) as name, d.name as department
         from iris.users u left join iris.employees e on e.id = u.employee_id
         left join iris.departments d on d.code = e.department_code
        where u.is_active and u.role in ('admin','manager')`,
    )
  ).rows;
}

export async function digestFor(r: Recipient) {
  const scope = r.role === "admin" ? "the whole workspace" : r.department ? `${r.department} and your studios` : "your tickets";
  return withUser(r.user_id, (c) => buildDigest(c, r.role, scope));
}

/** Weekly run: due on Monday ≥ 09:00 IST, once per person per week. Returns how many were queued. */
export async function sendWeeklyDigests({ force = false, onlyUserId }: { force?: boolean; onlyUserId?: string } = {}) {
  const enabled = (await pool.query("select value from iris.app_settings where key = 'email.weekly_digest'")).rows[0];
  if (!force && enabled && enabled.value === false) return { queued: 0, skipped: "disabled" };
  if (!force && !isDigestTime()) return { queued: 0, skipped: "not Monday morning" };
  if (!mailConfigured() && process.env.NOTIFY_DRY_RUN !== "1") return { queued: 0, skipped: "email not configured" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://iris.physique57india.com";
  const week = isoWeek();
  let queued = 0;
  for (const r of await digestRecipients()) {
    if (onlyUserId && r.user_id !== onlyUserId) continue;
    // A forced (test) send gets its own key, so it never blocks the real Monday digest.
    const key = `digest:${week}:${r.user_id}${force ? `:test:${Date.now()}` : ""}`;
    const claimed = await pool.query(
      `insert into iris.email_log (dedupe_key, channel, event, user_id, recipient, subject)
       values ($1, 'email', 'weekly_digest', $2, $3, $4) on conflict (dedupe_key) do nothing returning id`,
      [key, r.user_id, r.email, `Weekly digest ${week}`],
    );
    if (!claimed.rowCount) continue;
    try {
      const mail = renderDigest(await digestFor(r), r.name, appUrl);
      await pool.query("update iris.email_log set subject = $2 where dedupe_key = $1", [key, mail.subject]);
      await enqueueEmail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text, category: "weekly_digest" }, { emailLogId: key });
      queued++;
    } catch (err) {
      await pool.query("update iris.email_log set status = 'failed', error = $2 where dedupe_key = $1", [key, err instanceof Error ? err.message.slice(0, 300) : "build failed"]);
    }
  }
  return { queued, week };
}
