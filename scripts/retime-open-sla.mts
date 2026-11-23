/**
 * Re-time the SLA of open tickets to the current sla_definitions
 * (run after db/migrations-sla-tightened-targets.sql).
 *   npx tsx scripts/retime-open-sla.mts          # dry run: prints the changes
 *   npx tsx scripts/retime-open-sla.mts --apply  # writes them
 *
 * Only ever pulls a target EARLIER, never later. Skips resolved/closed tickets,
 * tickets whose SLA is paused, and tickets with an approved SLA extension (a
 * manager agreed that date). Targets are counted from the ticket's creation time,
 * in studio hours where the definition says so — the same maths as a new ticket.
 */
import pg from "pg";
import { computeSlaTargets, type BusinessHoursMap } from "../src/lib/iris/sla-calculator.ts";

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load .env from the repo (or, in a git worktree, the main checkout) unless already set.
if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const f of [path.join(root, ".env"), path.resolve(root, "../../../.env")]) {
    if (existsSync(f)) {
      process.loadEnvFile(f);
      break;
    }
  }
}
const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("No NEON_DATABASE_URL / DATABASE_URL set and no .env found.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });

const defs = new Map(
  (await pool.query(
    `select priority, response_target_mins, resolution_target_mins, response_target_days,
            resolution_target_days, business_hours_only from iris.sla_definitions`,
  )).rows.map((d) => [d.priority as string, d]),
);
const hours = ((await pool.query(`select value from iris.app_settings where key = 'sla.business_hours'`)).rows[0]?.value ??
  null) as BusinessHoursMap | null;

const { rows } = await pool.query(`
  select t.id, t.ticket_id, t.priority, t.created_at, t.sla_response_target, t.sla_resolution_target, t.first_response_at
    from iris.tickets t
   where t.status not in ('resolved','closed')
     and t.sla_status is distinct from 'paused'
     and not exists (select 1 from iris.sla_extension_requests x where x.ticket_id = t.id and x.status = 'approved')
   order by t.created_at`);

const fmt = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "-");
let changed = 0;
for (const t of rows) {
  const d = defs.get(t.priority);
  if (!d) continue;
  const bho = !!(d.business_hours_only || d.response_target_days || d.resolution_target_days);
  const next = computeSlaTargets({
    createdAt: new Date(t.created_at),
    responseTargetMins: Number(d.response_target_mins),
    resolutionTargetMins: Number(d.resolution_target_mins),
    responseTargetDays: d.response_target_days,
    resolutionTargetDays: d.resolution_target_days,
    businessHoursOnly: bho,
    businessHours: hours,
  });
  const curRes = t.sla_resolution_target ? new Date(t.sla_resolution_target) : null;
  const curResp = t.sla_response_target ? new Date(t.sla_response_target) : null;
  const newRes = new Date(next.slaResolutionTarget);
  const newResp = new Date(next.slaResponseTarget);
  const res = !curRes || newRes < curRes ? newRes : curRes;
  // A response already given keeps its target: re-timing it would rewrite history.
  const resp = t.first_response_at || (curResp && newResp >= curResp) ? curResp : newResp;
  if (res === curRes && resp === curResp) continue;
  changed++;
  console.log(`${t.ticket_id} ${t.priority}  resolve ${fmt(curRes)} → ${fmt(res)}`);
  if (!apply) continue;
  // The SLA trigger re-derives sla_status (breached / at risk) from the new target.
  await pool.query(
    `update iris.tickets set sla_response_target = $2, sla_resolution_target = $3 where id = $1`,
    [t.id, resp?.toISOString() ?? null, res.toISOString()],
  );
}
console.log(`\n${changed} of ${rows.length} open tickets ${apply ? "re-timed" : "would be re-timed (dry run; pass --apply)"}.`);
await pool.end();
