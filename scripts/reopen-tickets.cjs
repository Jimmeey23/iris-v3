// Reopen specific imported tickets so they are live again (status open, SLA from created_at, legacy locks removed).
// Usage: node scripts/reopen-tickets.cjs P57-02079 P57-02078 ... [--commit]
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const { Client } = require('pg');
const ids = process.argv.slice(2).filter((a) => a.startsWith('P57-'));
const commit = process.argv.includes('--commit');
(async () => {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  await c.query('begin');
  await c.query("select set_config('iris.seeding','on',true)");
  const r = await c.query(`
    update iris.tickets t set
      status = 'open',
      resolved_at = null,
      sla_response_target   = t.created_at + make_interval(mins => d.response_target_mins),
      sla_resolution_target = t.created_at + make_interval(mins => d.resolution_target_mins),
      sla_status = case when t.created_at + make_interval(mins => d.resolution_target_mins) < now() then 'breached'
                        when t.created_at + make_interval(mins => d.resolution_target_mins) < now() + interval '4 hours' then 'at_risk'
                        else 'on_track' end,
      metadata = (t.metadata - 'legacy_import' - 'sla_exempt' - 'lock_assignment') || jsonb_build_object('reopened_at', now()),
      updated_at = now()
    from iris.sla_definitions d
    where d.priority = t.priority and t.ticket_id = any($1)
    returning t.ticket_id, t.priority, t.sla_status`, [ids]);
  console.table(r.rows);
  if (r.rowCount !== ids.length) console.warn(`Matched ${r.rowCount} of ${ids.length}`);
  await c.query(commit ? 'commit' : 'rollback');
  console.log(commit ? 'Committed.' : 'Dry run (pass --commit).');
  await c.end();
})();
