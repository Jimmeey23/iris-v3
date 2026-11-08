import "server-only";
import type { PoolClient } from "pg";

/**
 * Real report engine for the Reports library.
 *
 * Every report is a query against Neon run inside `withUser`, so row-level
 * security decides which tickets a person's reports cover: an executive's
 * report covers what that executive can see, an admin's covers everything.
 *
 * A report that has no data source in IRIS yet returns `available: false`
 * with the reason, rather than inventing numbers.
 */

export type Cell = string | number;
export type Chart = {
  title: string;
  subtitle: string;
  type: "pie" | "bar" | "line";
  data: { name: string; value: number }[];
  color?: string;
  seriesName?: string;
};
export type SummaryItem = {
  metric: string;
  detail: string;
  value: string;
  icon: "trend_up" | "trend_down" | "alert" | "check" | "chart";
  color: string;
};
export type ReportResult =
  | {
      available: true;
      headers: string[];
      rows: Cell[][];
      charts: Chart[];
      summary: SummaryItem[];
      note?: string;
      truncated: boolean;
      generatedAt: string;
      range: RangeId;
    }
  | { available: false; reason: string };

export const RANGES = { "30d": 30, "90d": 90, "365d": 365, all: null } as const;
export type RangeId = keyof typeof RANGES;

const ROW_LIMIT = 2000;

// ── Shared SQL ──────────────────────────────────────────────────────────────
const OPEN = "t.status not in ('closed','resolved')";
const BREACHED = "(t.sla_resolution_target is not null and coalesce(t.resolved_at, now()) > t.sla_resolution_target)";
const RES_H = "extract(epoch from (t.resolved_at - t.created_at)) / 3600";
const IN_SLA_PCT = `round(100.0 * count(*) filter (where t.resolved_at is not null and t.resolved_at <= t.sla_resolution_target)
  / nullif(count(*) filter (where t.resolved_at is not null and t.sla_resolution_target is not null), 0), 1)`;
const RANGE = "($1::int is null or t.created_at >= now() - make_interval(days => $1::int))";
const kw = (...words: string[]) =>
  "(" + words.map((w) => `(t.category || ' ' || coalesce(t.subcategory,'') || ' ' || t.title) ilike '%${w}%'`).join(" or ") + ")";

const fmtDate = (d: unknown) =>
  d ? new Date(d as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const num = (v: unknown) => (v === null || v === undefined ? "—" : Number(v));

// ── Spec kinds ──────────────────────────────────────────────────────────────
type ListSpec = { kind: "list"; where?: string; order?: string; aging?: boolean };
type GroupSpec = { kind: "group"; dim: string; label: string; where?: string; order?: string; having?: string };
type TrendSpec = { kind: "trend"; bucket: "day" | "week" | "month"; where?: string };
type CustomSpec = { kind: "custom"; run: (c: PoolClient, days: number | null) => Promise<Omit<Extract<ReportResult, { available: true }>, "available" | "generatedAt" | "range">> };
type Unavailable = { kind: "unavailable"; reason: string };
type Spec = ListSpec | GroupSpec | TrendSpec | CustomSpec | Unavailable;

const NO_FIRST_RESPONSE = "First-response times aren't recorded on tickets yet, so this can't be measured honestly. It will fill in once replies are timestamped.";
const NOT_TRACKED = (what: string) => `IRIS doesn't record ${what} yet, so there's nothing real to report.`;

async function runList(c: PoolClient, days: number | null, s: ListSpec) {
  const rows = (await c.query(
    `select t.ticket_id, t.title, t.priority, t.status, t.studio_name, t.department_name, t.assignee_name,
            ${BREACHED} as breached, t.created_at, t.resolved_at,
            floor(extract(epoch from (now() - t.created_at)) / 86400)::int as age_days
       from v_tickets_full t
      where ${RANGE} ${s.where ? `and ${s.where}` : ""}
      order by ${s.order ?? "t.created_at desc"} limit ${ROW_LIMIT + 1}`,
    [days],
  )).rows;
  const truncated = rows.length > ROW_LIMIT;
  const list = rows.slice(0, ROW_LIMIT);
  const headers = ["Ticket", "Title", "Priority", "Status", "Studio", "Department", "Assignee", "SLA", "Created", s.aging ? "Age (days)" : "Resolved"];
  const open = list.filter((r) => !["closed", "resolved"].includes(r.status)).length;
  const breached = list.filter((r) => r.breached).length;
  return {
    headers,
    rows: list.map((r) => [
      r.ticket_id, r.title, r.priority, r.status, r.studio_name ?? "—", r.department_name ?? "—", r.assignee_name ?? "Unassigned",
      r.breached ? "Breached" : "Within SLA", fmtDate(r.created_at), s.aging ? r.age_days : fmtDate(r.resolved_at),
    ]),
    charts: [],
    summary: [
      { metric: "Tickets", detail: "Matching this report in the selected period", value: String(list.length), icon: "chart" as const, color: "bg-violet-500/10 text-violet-600" },
      { metric: "Still open", detail: "Not yet resolved or closed", value: String(open), icon: "alert" as const, color: "bg-amber-500/10 text-amber-600" },
      { metric: "SLA breached", detail: "Resolved after, or still open past, the resolution target", value: String(breached), icon: breached ? "alert" as const : "check" as const, color: breached ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600" },
    ],
    truncated,
  };
}

async function runGroup(c: PoolClient, days: number | null, s: GroupSpec) {
  const rows = (await c.query(
    `select coalesce((${s.dim})::text, '—') as label, count(*)::int as total,
            count(*) filter (where ${OPEN})::int as open,
            count(*) filter (where not ${OPEN})::int as closed,
            count(*) filter (where ${BREACHED})::int as breached,
            ${IN_SLA_PCT} as sla_pct,
            round(avg(${RES_H}) filter (where t.resolved_at is not null)::numeric, 1) as avg_res_h
       from v_tickets_full t
      where ${RANGE} ${s.where ? `and ${s.where}` : ""}
      group by 1 ${s.having ? `having ${s.having}` : ""}
      order by ${s.order ?? "total desc"} limit ${ROW_LIMIT}`,
    [days],
  )).rows;
  const total = rows.reduce((n, r) => n + r.total, 0);
  const breached = rows.reduce((n, r) => n + r.breached, 0);
  const top = rows[0];
  const chartData = rows.slice(0, 12).map((r) => ({ name: String(r.label), value: r.total }));
  return {
    headers: [s.label, "Total", "Open", "Closed", "Breached", "Within SLA %", "Avg resolution (h)"],
    rows: rows.map((r) => [r.label, r.total, r.open, r.closed, r.breached, r.sla_pct === null ? "—" : `${r.sla_pct}%`, num(r.avg_res_h)]),
    charts: rows.length
      ? [
          { title: `Tickets by ${s.label.toLowerCase()}`, subtitle: `${total} tickets`, type: "bar" as const, data: chartData },
          ...(rows.length <= 12 ? [{ title: "Share", subtitle: `Distribution by ${s.label.toLowerCase()}`, type: "pie" as const, data: chartData }] : []),
        ]
      : [],
    summary: [
      { metric: "Tickets", detail: `Across ${rows.length} ${s.label.toLowerCase()} groups`, value: String(total), icon: "chart" as const, color: "bg-violet-500/10 text-violet-600" },
      ...(top ? [{ metric: `Largest: ${top.label}`, detail: `${Math.round((100 * top.total) / Math.max(total, 1))}% of tickets`, value: String(top.total), icon: "trend_up" as const, color: "bg-sky-500/10 text-sky-600" }] : []),
      { metric: "SLA breached", detail: "Resolved after, or still open past, the target", value: String(breached), icon: breached ? "alert" as const : "check" as const, color: breached ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600" },
    ],
    truncated: false,
  };
}

async function runTrend(c: PoolClient, days: number | null, s: TrendSpec) {
  const rows = (await c.query(
    `select date_trunc('${s.bucket}', t.created_at at time zone 'Asia/Kolkata') as period,
            count(*)::int as created,
            count(*) filter (where t.resolved_at is not null)::int as resolved,
            count(*) filter (where ${BREACHED})::int as breached,
            ${IN_SLA_PCT} as sla_pct,
            round(avg(${RES_H}) filter (where t.resolved_at is not null)::numeric, 1) as avg_res_h
       from v_tickets_full t
      where ${RANGE} ${s.where ? `and ${s.where}` : ""}
      group by 1 order by 1`,
    [days],
  )).rows;
  const label = (d: Date) =>
    s.bucket === "month"
      ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const total = rows.reduce((n, r) => n + r.created, 0);
  const peak = rows.reduce<(typeof rows)[number] | null>((m, r) => (!m || r.created > m.created ? r : m), null);
  return {
    headers: ["Period", "Created", "Resolved", "Breached", "Within SLA %", "Avg resolution (h)"],
    rows: rows.map((r) => [label(r.period), r.created, r.resolved, r.breached, r.sla_pct === null ? "—" : `${r.sla_pct}%`, num(r.avg_res_h)]),
    charts: rows.length
      ? [
          { title: "Tickets created", subtitle: `Per ${s.bucket}`, type: "line" as const, data: rows.map((r) => ({ name: label(r.period), value: r.created })), seriesName: "Created" },
          { title: "Average resolution time", subtitle: `Hours, per ${s.bucket}`, type: "line" as const, color: "#06b6d4", data: rows.filter((r) => r.avg_res_h !== null).map((r) => ({ name: label(r.period), value: Number(r.avg_res_h) })), seriesName: "Hours" },
        ]
      : [],
    summary: [
      { metric: "Tickets", detail: `Over ${rows.length} ${s.bucket}s`, value: String(total), icon: "chart" as const, color: "bg-violet-500/10 text-violet-600" },
      ...(peak ? [{ metric: "Busiest period", detail: label(peak.period), value: String(peak.created), icon: "trend_up" as const, color: "bg-sky-500/10 text-sky-600" }] : []),
    ],
    truncated: false,
  };
}

/** A custom tabular query; charts the first numeric column against the first column. */
function table(sql: string, headers: string[], opts: { chart?: "bar" | "pie" | "line"; params?: (days: number | null) => unknown[] } = {}): CustomSpec {
  return {
    kind: "custom",
    run: async (c, days) => {
      const res = await c.query(sql, opts.params ? opts.params(days) : [days]);
      const rows = res.rows.slice(0, ROW_LIMIT).map((r) => Object.values(r).map((v) => (v instanceof Date ? fmtDate(v) : v === null ? "—" : typeof v === "number" ? v : /^-?\d+(\.\d+)?$/.test(String(v)) ? Number(v) : String(v)))) as Cell[][];
      const numIdx = rows[0]?.findIndex((v, i) => i > 0 && typeof v === "number") ?? -1;
      const charts: Chart[] = opts.chart && numIdx > 0 && rows.length
        ? [{ title: headers[numIdx], subtitle: `By ${headers[0].toLowerCase()}`, type: opts.chart, data: rows.slice(0, opts.chart === "line" ? 400 : 12).map((r) => ({ name: String(r[0]), value: Number(r[numIdx]) })) }]
        : [];
      return {
        headers,
        rows,
        charts,
        summary: [{ metric: "Records", detail: "In the selected period", value: String(rows.length), icon: "chart" as const, color: "bg-violet-500/10 text-violet-600" }],
        truncated: res.rows.length > ROW_LIMIT,
      };
    },
  };
}

const AUDIT_RANGE = "($1::int is null or a.created_at >= now() - make_interval(days => $1::int))";
const auditList = (where: string) =>
  table(
    `select a.created_at, coalesce(a.actor_name, u.email::text, 'System') as actor, a.action, a.entity_type, a.entity_id, host(a.ip_address) as ip
       from audit_log a left join users u on u.id = a.actor_user_id
      where ${AUDIT_RANGE} and ${where} order by a.created_at desc limit ${ROW_LIMIT + 1}`,
    ["When", "Actor", "Action", "Entity", "Entity ID", "IP"],
  );
const EMAIL_RANGE = "($1::int is null or e.created_at >= now() - make_interval(days => $1::int))";

export const REPORT_SPECS: Record<string, Spec> = {
  // Ticket operations
  "RPT-001": { kind: "list" },
  "RPT-002": { kind: "group", dim: "t.studio_name", label: "Studio", where: OPEN },
  "RPT-003": { kind: "group", dim: "t.priority", label: "Priority", order: "label" },
  "RPT-004": { kind: "group", dim: "t.status", label: "Status" },
  "RPT-005": { kind: "trend", bucket: "day" },
  "RPT-006": { kind: "trend", bucket: "week" },
  "RPT-007": { kind: "trend", bucket: "month" },
  "RPT-008": { kind: "group", dim: "t.priority || ' · ' || t.category", label: "Priority · Category", where: "t.resolved_at is not null", order: "avg_res_h desc nulls last" },
  "RPT-009": { kind: "unavailable", reason: NO_FIRST_RESPONSE },
  "RPT-010": { kind: "unavailable", reason: NOT_TRACKED("ticket reopens") },
  "RPT-011": { kind: "list", where: "t.escalation_level > 0", order: "t.escalation_level desc, t.created_at desc" },
  "RPT-012": { kind: "group", dim: "t.category", label: "Category" },
  "RPT-013": { kind: "group", dim: "t.category || ' › ' || coalesce(t.subcategory, '—')", label: "Category › Subcategory" },
  "RPT-014": { kind: "group", dim: "t.source", label: "Source" },
  "RPT-015": { kind: "list", where: "t.assignee_id is null" },
  "RPT-016": { kind: "list", where: OPEN, order: "t.created_at asc", aging: true },
  "RPT-017": { kind: "trend", bucket: "month" },
  "RPT-018": table(
    `select a.created_at, t.ticket_id, a.activity_type, a.description, coalesce(a.actor_name, 'System')
       from ticket_activities a join tickets t on t.id = a.ticket_id
      where ($1::int is null or a.created_at >= now() - make_interval(days => $1::int))
      order by a.created_at desc limit ${ROW_LIMIT + 1}`,
    ["When", "Ticket", "Activity", "Description", "By"],
  ),
  "RPT-019": { kind: "list" },
  "RPT-020": { kind: "unavailable", reason: "Search results live in All Tickets — use its export there, or Bulk Ticket Export here." },
  // SLA & performance
  "RPT-021": { kind: "group", dim: "t.priority", label: "Priority", order: "label" },
  "RPT-022": { kind: "group", dim: "t.priority", label: "Priority", order: "label" },
  "RPT-023": { kind: "list", where: BREACHED },
  "RPT-024": { kind: "list", where: `${OPEN} and t.sla_resolution_target between now() and now() + interval '4 hours'`, order: "t.sla_resolution_target asc" },
  "RPT-025": { kind: "trend", bucket: "month", where: "t.resolved_at is not null" },
  "RPT-026": { kind: "unavailable", reason: NO_FIRST_RESPONSE },
  "RPT-027": { kind: "group", dim: "t.department_name", label: "Department" },
  "RPT-028": { kind: "group", dim: "t.studio_name", label: "Studio" },
  "RPT-029": { kind: "group", dim: "coalesce(t.assignee_name, 'Unassigned')", label: "Employee" },
  "RPT-030": table(
    `select to_char(date_trunc('month', t.created_at), 'Mon YYYY') as month, count(*)::int as tickets,
            count(*) filter (where t.escalation_level > 0)::int as escalated,
            round(100.0 * count(*) filter (where t.escalation_level > 0) / nullif(count(*), 0), 1) as rate
       from v_tickets_full t where ${RANGE} group by date_trunc('month', t.created_at) order by date_trunc('month', t.created_at)`,
    ["Month", "Tickets", "Escalated", "Escalation rate %"],
    { chart: "line" },
  ),
  "RPT-031": { kind: "unavailable", reason: NO_FIRST_RESPONSE },
  "RPT-032": table(
    `select bucket, count(*)::int as tickets from (
       select case when h < 4 then '1. Under 4h' when h < 24 then '2. 4–24h' when h < 72 then '3. 1–3 days'
                   when h < 168 then '4. 3–7 days' else '5. Over a week' end as bucket
         from (select ${RES_H} as h from v_tickets_full t where ${RANGE} and t.resolved_at is not null) x) y
      group by 1 order by 1`,
    ["Resolution time", "Tickets"],
    { chart: "bar" },
  ),
  "RPT-033": { kind: "group", dim: "t.category || ' › ' || coalesce(t.subcategory, '—')", label: "Breached in", where: BREACHED },
  "RPT-034": { kind: "group", dim: "case when extract(hour from t.created_at at time zone 'Asia/Kolkata') between 7 and 20 then 'Business hours (7am–9pm)' else 'After hours' end", label: "Raised during" },
  "RPT-035": { kind: "trend", bucket: "month" },
  // Department & employee
  "RPT-036": { kind: "group", dim: "t.department_name", label: "Department" },
  "RPT-037": table(
    `select e.name, e.role, d.name as department, count(t.id) filter (where ${OPEN})::int as open_tickets,
            e.max_workload, round(100.0 * count(t.id) filter (where ${OPEN}) / nullif(e.max_workload, 0))::int as capacity_pct, e.availability
       from employees e left join departments d on d.code = e.department_code
       left join tickets t on t.assignee_id = e.id
      where e.is_active and $1::int is not distinct from $1::int
      group by e.id, d.name order by open_tickets desc, e.name`,
    ["Employee", "Role", "Department", "Open tickets", "Max workload", "Capacity %", "Availability"],
    { chart: "bar" },
  ),
  "RPT-038": { kind: "group", dim: "coalesce(t.assignee_name, 'Unassigned')", label: "Employee" },
  "RPT-039": { kind: "group", dim: "t.assignee_name", label: "Employee", where: "t.assignee_name is not null", having: "count(*) filter (where t.resolved_at is not null) >= 5", order: "sla_pct desc nulls last, avg_res_h asc" },
  "RPT-040": { kind: "unavailable", reason: NO_FIRST_RESPONSE },
  "RPT-041": { kind: "group", dim: "t.department_name", label: "Department", where: "t.resolved_at is not null", order: "avg_res_h desc nulls last" },
  "RPT-042": table(
    `select e.name, e.title, d.name, e.availability, e.location from employees e left join departments d on d.code = e.department_code
      where e.is_active and $1::int is not distinct from $1::int order by e.availability, e.name`,
    ["Employee", "Title", "Department", "Availability", "Location"],
  ),
  "RPT-043": table(
    `select d.name,
            (select count(*) from employees e where e.department_code = d.code and e.is_active)::int as people,
            (select coalesce(sum(e.max_workload), 0) from employees e where e.department_code = d.code and e.is_active)::int as capacity,
            (select count(*) from tickets t where t.department_code = d.code and ${OPEN})::int as open_tickets
       from departments d
      where d.is_active and $1::int is not distinct from $1::int order by open_tickets desc, d.name`,
    ["Department", "Active people", "Total capacity", "Open tickets"],
    { chart: "bar" },
  ),
  "RPT-044": { kind: "list", where: "t.assignee_id is not null", order: "t.assignee_name, t.created_at desc" },
  "RPT-045": { kind: "unavailable", reason: NOT_TRACKED("which departments shared a ticket") },
  "RPT-046": { kind: "group", dim: "coalesce(t.assignee_name, 'Unassigned')", label: "Employee", where: OPEN },
  "RPT-047": table(
    `select e.name, d.name, array_to_string(e.skills, ', ') from employees e left join departments d on d.code = e.department_code
      where e.is_active and $1::int is not distinct from $1::int order by d.name, e.name`,
    ["Employee", "Department", "Skills"],
  ),
  "RPT-048": table(
    `select d.name, coalesce(h.name, '— no head —'), count(e.id)::int from departments d
       left join employees h on h.id = d.head_employee_id
       left join employees e on e.department_code = d.code and e.is_active
      where d.is_active and $1::int is not distinct from $1::int group by d.name, h.name order by d.name`,
    ["Department", "Head", "Active people"],
    { chart: "bar" },
  ),
  "RPT-049": table(
    `select d.name, e.escalation_order, e.name, e.title from employees e join departments d on d.code = e.department_code
      where e.is_active and not coalesce(e.exclude_from_escalation, false) and $1::int is not distinct from $1::int
      order by d.name, e.escalation_order nulls last`,
    ["Department", "Level", "Employee", "Title"],
  ),
  "RPT-050": { kind: "group", dim: "t.assignee_name", label: "Employee", where: "t.assignee_name is not null", order: "closed desc" },
  // Studio operations
  "RPT-051": { kind: "group", dim: "t.studio_name", label: "Studio" },
  "RPT-052": { kind: "group", dim: "t.studio_name", label: "Studio", order: "label" },
  "RPT-053": { kind: "group", dim: "t.studio_name", label: "Studio", where: "t.studio_city ilike 'mumbai%'" },
  "RPT-054": { kind: "group", dim: "t.studio_name", label: "Studio", where: "t.studio_city ilike 'beng%'" },
  "RPT-055": { kind: "group", dim: "coalesce(t.studio_name, '—') || ' · ' || t.category", label: "Studio · Category" },
  "RPT-056": { kind: "unavailable", reason: "A composite health score needs agreed weights; use Studio Operations Overview for the real inputs." },
  "RPT-057": { kind: "group", dim: "coalesce(t.studio_name, '—') || ' · ' || coalesce(t.subcategory, t.category)", label: "Studio · Issue", having: "count(*) >= 3" },
  "RPT-058": { kind: "group", dim: "t.studio_name", label: "Studio", where: `(t.equipment is not null or ${kw("equipment", "bike", "reformer", "machine")})` },
  "RPT-059": { kind: "group", dim: "t.studio_name", label: "Studio", where: kw("facilit", "hvac", "plumb", "clean", "maintenance", "repair") },
  "RPT-060": { kind: "group", dim: "t.studio_name", label: "Studio", where: kw("complaint", "feedback", "unhappy", "rude") },
  "RPT-061": { kind: "group", dim: "t.studio_name", label: "Studio", where: "t.resolved_at is not null", order: "avg_res_h asc nulls last" },
  "RPT-062": table(
    `select coalesce(t.subcategory, t.category) as issue, count(distinct t.studio_code)::int as studios, count(*)::int as tickets
       from v_tickets_full t where ${RANGE} group by 1 having count(distinct t.studio_code) >= 2 order by studios desc, tickets desc`,
    ["Issue", "Studios affected", "Tickets"],
    { chart: "bar" },
  ),
  // Momence & member
  "RPT-063": { kind: "list", where: `(t.client_momence_id is not null or ${kw("momence")})` },
  "RPT-064": { kind: "list", where: "(t.affected_client is not null or t.client_momence_id is not null)" },
  "RPT-065": { kind: "trend", bucket: "month", where: kw("membership", "package", "renewal") },
  "RPT-066": { kind: "group", dim: "coalesce(t.subcategory, t.category)", label: "Issue", where: kw("payment", "charge", "invoice", "billing") },
  "RPT-067": { kind: "group", dim: "coalesce(t.subcategory, t.category)", label: "Issue", where: kw("booking", "waitlist", "cancel", "schedule") },
  "RPT-068": { kind: "list", where: kw("refund") },
  "RPT-069": { kind: "list", where: kw("freeze", "pause") },
  "RPT-070": { kind: "list", where: kw("credit") },
  "RPT-071": { kind: "unavailable", reason: NOT_TRACKED("Momence API call health") },
  "RPT-072": { kind: "unavailable", reason: NOT_TRACKED("Momence API usage") },
  "RPT-073": { kind: "unavailable", reason: NOT_TRACKED("member searches") },
  "RPT-074": { kind: "unavailable", reason: NOT_TRACKED("Momence sync errors") },
  // AI & automation
  "RPT-075": { kind: "trend", bucket: "week", where: "t.source = 'ai_assistant'" },
  "RPT-076": { kind: "unavailable", reason: NOT_TRACKED("which resolutions were made by AI") },
  "RPT-077": table(
    `select model, count(*)::int as calls, sum(input_tokens)::int as input_tokens, sum(output_tokens)::int as output_tokens, round(sum(cost_usd)::numeric, 4) as cost_usd
       from ai_usage u where ($1::int is null or u.created_at >= now() - make_interval(days => $1::int)) group by model order by cost_usd desc`,
    ["Model", "Calls", "Input tokens", "Output tokens", "Cost (USD)"],
    { chart: "bar" },
  ),
  "RPT-078": { kind: "unavailable", reason: NOT_TRACKED("classification accuracy against a corrected label") },
  "RPT-079": { kind: "unavailable", reason: NOT_TRACKED("per-ticket model routing") },
  "RPT-080": table(
    `select to_char(date_trunc('day', created_at), 'DD Mon') as day, round(sum(cost_usd)::numeric, 4) as cost_usd, count(*)::int as calls
       from ai_usage u where ($1::int is null or u.created_at >= now() - make_interval(days => $1::int)) group by date_trunc('day', created_at) order by date_trunc('day', created_at)`,
    ["Day", "Cost (USD)", "Calls"],
    { chart: "line" },
  ),
  "RPT-081": table(
    `select to_char(date_trunc('day', created_at), 'DD Mon') as day, sum(input_tokens + output_tokens)::int as tokens
       from ai_usage u where ($1::int is null or u.created_at >= now() - make_interval(days => $1::int)) group by date_trunc('day', created_at) order by date_trunc('day', created_at)`,
    ["Day", "Tokens"],
    { chart: "line" },
  ),
  "RPT-082": { kind: "unavailable", reason: NOT_TRACKED("model fallbacks") },
  "RPT-083": { kind: "unavailable", reason: NOT_TRACKED("auto-resolution attempts") },
  "RPT-084": { kind: "unavailable", reason: NOT_TRACKED("conversation-level analytics") },
  // Historical intelligence
  "RPT-085": { kind: "group", dim: "coalesce(t.subcategory, t.category)", label: "Issue", having: "count(*) >= 3" },
  "RPT-086": { kind: "group", dim: "to_char(t.created_at at time zone 'Asia/Kolkata', 'FMDay')", label: "Weekday" },
  "RPT-087": { kind: "unavailable", reason: "Similarity clustering isn't built yet; Recurring Issue Detection groups identical issues." },
  "RPT-088": table(
    `select t.ticket_id, t.category, coalesce(t.subcategory, '—'), coalesce(t.resolution_summary, t.resolution) as resolution
       from v_tickets_full t where ${RANGE} and coalesce(t.resolution_summary, t.resolution) is not null
      order by t.resolved_at desc nulls last limit ${ROW_LIMIT + 1}`,
    ["Ticket", "Category", "Subcategory", "Resolution"],
  ),
  "RPT-089": { kind: "group", dim: "to_char(t.created_at at time zone 'Asia/Kolkata', 'MM · Mon')", label: "Month of year", order: "label" },
  "RPT-090": { kind: "unavailable", reason: "Preventive recommendations need the AI analysis step; not generated yet." },
  "RPT-091": { kind: "group", dim: "t.department_name", label: "Department", where: "t.resolved_at is not null", order: "avg_res_h desc nulls last" },
  "RPT-092": { kind: "unavailable", reason: "No prediction model is trained; showing a forecast would be invented." },
  // Audit & compliance
  "RPT-093": auditList("true"),
  "RPT-094": auditList("(a.action ilike any (array['%delete%','%password%','%role%','%revoke%','%export%']))"),
  "RPT-095": auditList("a.entity_type in ('users','roles')"),
  "RPT-096": auditList("a.action ilike '%momence%'"),
  "RPT-097": auditList("a.action = 'login_failed'"),
  "RPT-098": { kind: "unavailable", reason: NOT_TRACKED("read access events") },
  "RPT-099": auditList("a.entity_type in ('app_settings','routing_rules','sla_definitions','departments','studios','notification_rules','ai_models','integrations')"),
  "RPT-100": { kind: "unavailable", reason: "There's no compliance framework defined to score against." },
  "RPT-101": table(
    `select coalesce(a.actor_name, u.email::text, 'System') as actor, count(*)::int as actions, max(a.created_at) as last_action
       from audit_log a left join users u on u.id = a.actor_user_id where ${AUDIT_RANGE} group by 1 order by actions desc`,
    ["Actor", "Actions", "Last action"],
    { chart: "bar" },
  ),
  "RPT-102": auditList("a.action in ('login_failed')"),
  // Notifications
  "RPT-103": table(
    `select e.status, count(*)::int from email_log e where ${EMAIL_RANGE} group by 1 order by 2 desc`,
    ["Status", "Emails"],
    { chart: "pie" },
  ),
  "RPT-104": table(
    `select e.event, count(*)::int as sent, count(*) filter (where e.status in ('failed','error'))::int as failed
       from email_log e where ${EMAIL_RANGE} group by 1 order by sent desc`,
    ["Event", "Sent", "Failed"],
    { chart: "bar" },
  ),
  "RPT-105": table(
    `select coalesce(u.email::text, '—'), count(*)::int as notifications, count(*) filter (where not n.is_read)::int as unread
       from notifications n left join users u on u.id = n.user_id
      where ($1::int is null or n.created_at >= now() - make_interval(days => $1::int)) group by 1 order by 2 desc`,
    ["User", "Notifications", "Unread"],
    { chart: "bar" },
  ),
  "RPT-106": table(
    `select e.created_at, e.event, e.recipient, e.status, coalesce(e.error, '') from email_log e
      where ${EMAIL_RANGE} and e.event ilike '%escalat%' order by e.created_at desc`,
    ["When", "Event", "Recipient", "Status", "Error"],
  ),
  "RPT-107": { kind: "unavailable", reason: NOT_TRACKED("whether a reminder led to action") },
  "RPT-108": { kind: "unavailable", reason: "Notification preferences are per person in Settings; there's no workspace summary yet." },
  "RPT-109": table(
    `select e.channel, count(*)::int from email_log e where ${EMAIL_RANGE} group by 1 order by 2 desc`,
    ["Channel", "Messages"],
    { chart: "pie" },
  ),
  "RPT-110": table(
    `select e.created_at, e.event, e.recipient, e.provider, coalesce(e.error, '') from email_log e
      where ${EMAIL_RANGE} and e.status in ('failed','error') order by e.created_at desc`,
    ["When", "Event", "Recipient", "Provider", "Error"],
  ),
};

export function reportAvailability(code: string): { available: boolean; reason?: string } {
  const spec = REPORT_SPECS[code];
  if (!spec) return { available: false, reason: "This report isn't defined yet." };
  return spec.kind === "unavailable" ? { available: false, reason: spec.reason } : { available: true };
}

export async function runReport(c: PoolClient, code: string, range: RangeId): Promise<ReportResult> {
  const spec = REPORT_SPECS[code];
  if (!spec) return { available: false, reason: "This report isn't defined yet." };
  if (spec.kind === "unavailable") return { available: false, reason: spec.reason };
  const days = RANGES[range];
  const out =
    spec.kind === "list" ? await runList(c, days, spec)
    : spec.kind === "group" ? await runGroup(c, days, spec)
    : spec.kind === "trend" ? await runTrend(c, days, spec)
    : await spec.run(c, days);
  return {
    available: true,
    ...out,
    note: out.truncated ? `Showing the first ${ROW_LIMIT} rows. Narrow the period for the rest.` : undefined,
    generatedAt: new Date().toISOString(),
    range,
  };
}
