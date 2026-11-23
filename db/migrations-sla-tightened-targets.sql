-- ============================================================================
-- Tightened SLA targets (2026-11-23). Supersedes migrations-sla-relaxed-targets.sql,
-- whose P2/P3 windows (5 and 10 business days) left open tickets showing
-- "due in 8+ days". Run after it. Re-runnable.
--
--   P0  Safety / studio can't run    30 min response   8 h resolution       24x7
--   P1  Class or many members        2 business h      1 business day       studio hours
--   P2  One member's issue           4 business h      3 business days      studio hours
--   P3  Minor / admin                1 business day    5 business days      studio hours
--
-- The studio is open 7 days a week, so the longest window (P3) is ~5 calendar days.
-- The *_mins columns are kept consistent (14 open hours = 1 business day) for the
-- tickets raised straight from SQL (recurrence checks), which the DB trigger
-- times in clock minutes.
--
-- New tickets pick these up immediately. To re-time tickets that are already
-- open, run:  npx tsx scripts/retime-open-sla.mts           (dry run)
--             npx tsx scripts/retime-open-sla.mts --apply
-- ============================================================================

update iris.sla_definitions set response_target_mins = 30,  resolution_target_mins = 480,
  response_target_days = null, resolution_target_days = null, business_hours_only = false where priority = 'P0';
update iris.sla_definitions set response_target_mins = 120, resolution_target_mins = 840,
  response_target_days = null, resolution_target_days = 1, business_hours_only = true where priority = 'P1';
update iris.sla_definitions set response_target_mins = 240, resolution_target_mins = 2520,
  response_target_days = null, resolution_target_days = 3, business_hours_only = true where priority = 'P2';
update iris.sla_definitions set response_target_mins = 840, resolution_target_mins = 4200,
  response_target_days = 1, resolution_target_days = 5, business_hours_only = true where priority = 'P3';
