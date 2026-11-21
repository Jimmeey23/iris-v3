/**
 * Re-route open tickets with the routing rulebook (keyword matching, no AI spend).
 *   npx tsx scripts/reroute-open-tickets.mts          # dry run: prints the changes
 *   npx tsx scripts/reroute-open-tickets.mts --apply  # writes them
 * Skips resolved/closed, info-only, recurrence checks (they belong to the original
 * reporter) and tickets someone routed by hand.
 */
import pg from "pg";
import { decideOwnership } from "../src/lib/iris/ownership-policy.ts";

const apply = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { rows } = await pool.query(`
  select t.id, t.ticket_id, t.title, t.description, t.category, t.subcategory, t.studio_code, s.city,
         t.department_code, t.assignee_id, t.assignee_ids, t.department_codes, t.collected_info
    from iris.tickets t left join iris.studios s on s.code = t.studio_code
   where t.status not in ('resolved','closed')
     and not ('info-only' = any(t.tags))
     and not ('recurrence-check' = any(t.tags))
     and coalesce(t.collected_info->'_routing'->>'decided_by','') not in ('manual','manual_reroute')
   order by t.created_at`);
const names = new Map((await pool.query("select id, name from iris.employees")).rows.map((r) => [r.id, r.name]));

let changed = 0;
const byRule: Record<string, number> = {};
for (const t of rows) {
  const p = decideOwnership({
    category: t.category, subcategory: t.subcategory, title: t.title, description: t.description ?? "",
    studioCode: t.studio_code, studioCity: t.city, reporterEmployeeId: null, departmentCode: t.department_code,
  });
  if (!p) continue;
  if (p.assigneeId === t.assignee_id && p.departmentCodes[0] === t.department_code) continue;
  changed++;
  byRule[p.rule] = (byRule[p.rule] ?? 0) + 1;
  console.log(`${t.ticket_id} [${t.category} / ${t.subcategory ?? "-"}] ${t.title.slice(0, 70)}\n    ${t.department_code ?? "-"}/${names.get(t.assignee_id) ?? "-"}  →  ${p.departmentCodes.join("+")}/${names.get(p.assigneeId)} (${p.rule})`);
  if (!apply) continue;
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(
      `update iris.tickets set assignee_id = $2, assignee_ids = $3, department_code = $4, department_codes = $5,
              escalation_level = 0, status = case when status = 'escalated' then 'open' else status end,
              collected_info = (collected_info - '_escalation_l2' - '_escalation_l3' - '_escalation_chain') || $6::jsonb,
              updated_at = now()
        where id = $1`,
      [t.id, p.assigneeId, p.ownerIds, p.departmentCodes[0], p.departmentCodes, JSON.stringify({
        _ownership_rule: p.label,
        _routing: { rule: p.rule, also: p.alsoRules, decided_by: "bulk_reroute" },
        _escalation_chain: p.escalationChain,
        ...(p.escalationL2 ? { _escalation_l2: p.escalationL2 } : {}),
        ...(p.escalationL3 ? { _escalation_l3: p.escalationL3 } : {}),
      })],
    );
    await c.query(
      `insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name) values ($1, 'reassigned', $2, 'IRIS')`,
      [t.id, `Rerouted under the routing rulebook: ${names.get(t.assignee_id) ?? "unassigned"} (${t.department_code ?? "-"}) → ${names.get(p.assigneeId)} (${p.departmentCodes.join(" + ")}). ${p.label}`],
    );
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
console.log(`\n${rows.length} open tickets checked, ${changed} ${apply ? "rerouted" : "would change"}.`, byRule);
await pool.end();
