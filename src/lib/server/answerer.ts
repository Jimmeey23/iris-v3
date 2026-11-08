import "server-only";
import type { PoolClient } from "pg";
import { FAULT_VERBS, bestArticle, classifyQuestion, type Intent, type Period } from "@/lib/iris/answer-intents";
import { docFromRow } from "./library";

/**
 * Answers assistant questions from IRIS data with no AI call. Runs inside
 * withUser, so every number respects the asker's row-level security.
 * Returns null whenever it isn't confident; the caller then uses the AI agent.
 */

export type Answer = {
  route: "kb" | "history" | "stats" | "equipment" | "trainer";
  rule: string;
  content: string;
};

const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

function periodSql(p: Period | null, col = "t.created_at", start = 1): { sql: string; params: unknown[] } {
  if (!p || p.days === null) return { sql: "true", params: [] };
  const off = p.offsetDays ?? 0;
  return {
    sql: `${col} >= now() - make_interval(days => $${start}::int) and ${col} < now() - make_interval(days => $${start + 1}::int)`,
    params: [p.days + off, off],
  };
}

export async function answerQuestion(c: PoolClient, message: string, role: string): Promise<Answer | null> {
  const studios = (await c.query("select code, name from studios where is_active")).rows as { code: string; name: string }[];
  const intent = classifyQuestion(message, studios);
  if (!intent) return null;
  const studioName = (code: string | null) => studios.find((s) => s.code === code)?.name ?? null;
  switch (intent.kind) {
    case "equipment": return equipment(c, intent, studioName);
    case "trainer": return trainer(c, intent, role);
    case "stats": return stats(c, intent, studioName);
    case "history": return history(c, intent, studioName);
    case "kb": return knowledge(c, intent);
  }
}

async function equipment(c: PoolClient, i: Extract<Intent, { kind: "equipment" }>, studioName: (s: string | null) => string | null): Promise<Answer | null> {
  const rows = (
    await c.query(
      `select id, label, studio_name, status, faults_total, faults_90d, open_faults, last_fault_at, avg_repair_h, rechecks_failed, rechecks_passed
         from v_equipment_health
        where kind = $1 and ($2::int is null or number = $2) and ($3::text is null or studio_code = $3)
        order by faults_total desc`,
      [i.equipment, i.number, i.studioHint],
    )
  ).rows;
  const what = i.equipment === "bike" ? `Bike #${i.number}` : i.equipment === "mic" ? `Mic #${i.number}` : "the AC";
  const where = i.studioHint ? ` at ${studioName(i.studioHint)}` : "";
  if (!rows.length) {
    return { route: "equipment", rule: "Equipment register", content: `No faults have been recorded for ${what}${where}. If it's faulty now, describe the problem and I'll open a ticket.` };
  }
  const lines = rows.slice(0, 5).map((r) => {
    const flags = [
      r.open_faults ? `**${r.open_faults} open**` : null,
      r.faults_90d >= 3 || r.rechecks_failed >= 2 ? "**replacement candidate**" : null,
      r.status !== "in_service" ? r.status.replace(/_/g, " ") : null,
    ].filter(Boolean);
    return `- **${r.label}** · ${r.studio_name}: ${r.faults_total} fault${r.faults_total === 1 ? "" : "s"} (${r.faults_90d} in 90 days), last ${fmt(r.last_fault_at)}` +
      `${r.avg_repair_h !== null ? `, avg repair ${Math.round(Number(r.avg_repair_h))}h` : ""}` +
      `${r.rechecks_passed + r.rechecks_failed ? `, re-checks ${r.rechecks_passed} passed / ${r.rechecks_failed} failed` : ""}` +
      `${flags.length ? ` - ${flags.join(", ")}` : ""}`;
  });
  return { route: "equipment", rule: "Equipment register", content: `${what}${where}:\n\n${lines.join("\n")}\n\nFull history is under **Equipment**.` };
}

async function trainer(c: PoolClient, i: Extract<Intent, { kind: "trainer" }>, role: string): Promise<Answer | null> {
  const t = (
    await c.query(
      `select id, name from trainers
        where lower(name) = $1 or lower(coalesce(display_name, '')) = $1 or lower(name) like $1 || ' %' or lower(name) like '% ' || $1
        order by length(name) limit 2`,
      [i.name.toLowerCase()],
    )
  ).rows;
  if (t.length !== 1) return null; // unknown or ambiguous name: let the AI ask
  if (role === "executive") {
    return { route: "trainer", rule: "Trainer scores", content: `Assessment scores for ${t[0].name} are visible to managers and admins. You can see their member feedback under **Trainers**.` };
  }
  const a = (
    await c.query(
      `select score, band, submitted_at, payload->>'strengths' as strengths, payload->>'improvements' as improvements, payload->>'sessionName' as session
         from trainer_assessments where trainer_id = $1 or lower(trainer_name) = lower($2)
        order by submitted_at desc nulls last limit 50`,
      [t[0].id, t[0].name],
    )
  ).rows;
  const fb = (
    await c.query(
      `select count(*) filter (where category = 'Trainer Feedback' or category = 'Class Experience')::int as feedback
         from tickets where description ilike '%' || $1 || '%' and created_at >= now() - interval '90 days'`,
      [t[0].name],
    )
  ).rows[0];
  if (!a.length) {
    return { route: "trainer", rule: "Trainer scores", content: `${t[0].name} has no recorded assessments yet. ${fb.feedback} feedback ticket${fb.feedback === 1 ? "" : "s"} mention them in the last 90 days.` };
  }
  const avg = Math.round(a.reduce((n, r) => n + r.score, 0) / a.length);
  const recent = a.slice(0, 3);
  const older = a.slice(3, 6);
  const trend = older.length
    ? Math.round(recent.reduce((n, r) => n + r.score, 0) / recent.length) - Math.round(older.reduce((n, r) => n + r.score, 0) / older.length)
    : null;
  const latest = a[0];
  return {
    route: "trainer",
    rule: "Trainer scores",
    content:
      `**${t[0].name}** - ${a.length} assessment${a.length === 1 ? "" : "s"}, average **${avg}%**` +
      `${trend === null ? "" : `, ${trend > 0 ? `up ${trend}` : trend < 0 ? `down ${-trend}` : "flat"} vs the three before`}.\n\n` +
      recent.map((r) => `- ${fmt(r.submitted_at)}: ${r.score}% (${r.band})${r.session ? ` · ${r.session}` : ""}`).join("\n") +
      `${latest.strengths ? `\n\n**Latest strengths:** ${latest.strengths}` : ""}` +
      `${latest.improvements ? `\n**To work on:** ${latest.improvements}` : ""}` +
      `\n\n${fb.feedback} feedback ticket${fb.feedback === 1 ? "" : "s"} mention them in the last 90 days.`,
  };
}

async function stats(c: PoolClient, i: Extract<Intent, { kind: "stats" }>, studioName: (s: string | null) => string | null): Promise<Answer | null> {
  const cur = periodSql(i.period, "t.created_at", 1);
  const statusSql = {
    open: "t.status not in ('resolved','closed')",
    breached: "t.sla_resolution_target is not null and coalesce(t.resolved_at, now()) > t.sla_resolution_target",
    resolved: "t.status in ('resolved','closed')",
    escalated: "t.escalation_level > 0",
  };
  const params: unknown[] = [...cur.params];
  const where = [cur.sql, "t.title not like '[Recurrence check%'"];
  if (i.status) where.push(statusSql[i.status]);
  if (i.studioHint) { params.push(i.studioHint); where.push(`t.studio_code = $${params.length}`); }
  if (i.topic) { params.push(i.topic); where.push(`t.search_vector @@ plainto_tsquery('english', $${params.length})`); }
  const rows = (
    await c.query(
      `select count(*)::int as n,
              (select json_agg(x) from (select coalesce(t2.subcategory, t2.category) as issue, count(*)::int as n
                                          from v_tickets_full t2 where t2.id = any(array_agg(t.id)) group by 1 order by 2 desc limit 3) x) as top
         from v_tickets_full t where ${where.join(" and ")}`,
      params,
    )
  ).rows[0];
  // The same-length period before, for context.
  let prev: number | null = null;
  if (i.period.days !== null) {
    const p = periodSql({ ...i.period, offsetDays: (i.period.offsetDays ?? 0) + i.period.days }, "t.created_at", 1);
    prev = (await c.query(`select count(*)::int n from v_tickets_full t where ${[p.sql, ...where.slice(1)].join(" and ")}`, [...p.params, ...params.slice(cur.params.length)])).rows[0].n;
  }
  const what = [i.status, i.topic ? `“${i.topic}”` : null, "tickets"].filter(Boolean).join(" ");
  const where2 = i.studioHint ? ` at ${studioName(i.studioHint)}` : "";
  const top = (rows.top ?? []) as { issue: string; n: number }[];
  return {
    route: "stats",
    rule: "Ticket counts",
    content:
      `**${rows.n}** ${what}${where2} in ${i.period.label}` +
      `${prev !== null ? ` (${prev} in the period before)` : ""}.` +
      `${top.length && rows.n > 1 ? `\n\nMost common: ${top.map((t) => `${t.issue} (${t.n})`).join(", ")}.` : ""}` +
      `\n\nCounts cover the tickets you can see. Open **Reports** for the full breakdown.`,
  };
}

async function history(c: PoolClient, i: Extract<Intent, { kind: "history" }>, studioName: (s: string | null) => string | null): Promise<Answer | null> {
  // All terms first; if nothing matches, just the subject words ("locker", not "broken").
  const subject = i.terms.filter((w) => !FAULT_VERBS.has(w));
  for (const terms of [i.terms, subject]) {
    if (!terms.length) continue;
    const found = await historyFor(c, { ...i, terms }, studioName);
    if (found) return found;
    if (terms.length === subject.length) break;
  }
  return null;
}

async function historyFor(c: PoolClient, i: Extract<Intent, { kind: "history" }>, studioName: (s: string | null) => string | null): Promise<Answer | null> {
  const per = periodSql(i.period, "t.created_at", 2);
  const params: unknown[] = [i.terms.join(" "), ...per.params];
  const where = [`t.search_vector @@ plainto_tsquery('english', $1)`, per.sql, "t.title not like '[Recurrence check%'"];
  if (i.studioHint) { params.push(i.studioHint); where.push(`t.studio_code = $${params.length}`); }
  const agg = (
    await c.query(
      `select count(*)::int as n, min(t.created_at) as first, max(t.created_at) as last, count(distinct t.studio_code)::int as studios,
              count(*) filter (where t.status not in ('resolved','closed'))::int as open
         from v_tickets_full t where ${where.join(" and ")}`,
      params,
    )
  ).rows[0];
  if (!agg.n) return null; // nothing found by keywords: the AI can search more loosely
  const recent = (
    await c.query(
      `select t.ticket_id, t.title, t.status, t.created_at, t.studio_name, coalesce(t.resolution_summary, t.resolution) as fix
         from v_tickets_full t where ${where.join(" and ")}
        order by ts_rank(t.search_vector, plainto_tsquery('english', $1)) desc, t.created_at desc limit 5`,
      params,
    )
  ).rows;
  const where2 = i.studioHint ? ` at ${studioName(i.studioHint)}` : "";
  const lastFix = recent.find((r) => r.fix)?.fix as string | undefined;
  return {
    route: "history",
    rule: "Ticket history search",
    content:
      `Yes - **${agg.n}** ticket${agg.n === 1 ? "" : "s"} match “${i.terms.join(" ")}”${where2}` +
      `${agg.n > 1 ? `, from ${fmt(agg.first)} to ${fmt(agg.last)}` : `, on ${fmt(agg.last)}`}` +
      `${!i.studioHint && agg.studios > 1 ? ` across ${agg.studios} studios` : ""}` +
      `${agg.open ? `; **${agg.open} still open**` : ""}.\n\n` +
      recent.map((r) => `- **${r.ticket_id}** ${r.title} · ${r.studio_name ?? "-"} · ${fmt(r.created_at)} · ${r.status}`).join("\n") +
      `${lastFix ? `\n\n**Last recorded fix:** ${String(lastFix).slice(0, 300)}` : ""}`,
  };
}

async function knowledge(c: PoolClient, i: Extract<Intent, { kind: "kb" }>): Promise<Answer | null> {
  const docs = (await c.query("select * from knowledge_docs")).rows.map(docFromRow);
  const hit = bestArticle(docs, i.terms);
  if (!hit) return null;
  const a = hit.article;
  const steps = a.steps.slice(0, 8).map((s, n) => `${n + 1}. ${s}`).join("\n");
  return {
    route: "kb",
    rule: `Knowledge base · ${a.id}`,
    content:
      `**${a.title}** (${a.id})\n\n${a.summary}` +
      `${steps ? `\n\n${steps}` : ""}` +
      `${a.steps.length > 8 ? `\n\n…${a.steps.length - 8} more steps in the full guide.` : ""}` +
      `${a.escalation ? `\n\n**Escalate when:** ${a.escalation}` : ""}` +
      `\n\nOpen **Knowledge** → ${a.id} for the full guide.`,
  };
}
