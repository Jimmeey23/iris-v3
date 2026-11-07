#!/usr/bin/env node
/**
 * One-off fix for tickets imported from tickets_rows.csv:
 *  - tickets owned by Sachin Nalawade / Gaurav Sogam (not employees) -> Saachi Shetty
 *  - every imported ticket -> closed, SLA targets cleared, flagged as legacy
 * Safe to re-run.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env"), quiet: true });
const { Client } = require("pg");

const IMPORTED = "metadata->>'imported_from' = 'tickets_rows.csv'";

(async () => {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('iris.seeding', 'on', true)"); // no activity rows

    const reassigned = await c.query(
      `update iris.tickets set assignee_id = 'emp_saachi'
       where ${IMPORTED} and assignee_id is null
         and lower(metadata->'legacy'->>'assigned_staff_email') in
             ('sachin@physique57mumbai.com', 'gaurav@physique57mumbai.com')`,
    );

    const closed = await c.query(
      `update iris.tickets set
         status = 'closed',
         resolved_at = coalesce(resolved_at, (metadata->'legacy'->>'closed_at')::timestamptz, updated_at, created_at),
         sla_response_target = null,
         sla_resolution_target = null,
         sla_status = 'on_track',
         metadata = metadata || '{"legacy_import": true, "sla_exempt": true, "lock_assignment": true}'::jsonb
       where ${IMPORTED}`,
    );

    await c.query("commit");
    console.log(`Reassigned ${reassigned.rowCount} to Saachi Shetty, closed ${closed.rowCount}.`);
    const summary = await c.query(
      `select status, sla_status, count(*)::int as n, count(assignee_id)::int as assigned,
              count(sla_resolution_target)::int as with_sla
       from iris.tickets group by 1, 2`,
    );
    console.table(summary.rows);
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    await c.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
