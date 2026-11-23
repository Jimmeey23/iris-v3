-- ============================================================================
-- Relaxed SLA targets (2026-11-23). Supersedes the values set by
-- migrations-sla-business-days.sql, which proved too tight for most tickets
-- to resolve in time. Run after it. Applies to tickets raised from now on;
-- existing tickets keep their targets. Re-runnable.
--
--   P0  Safety / studio can't run    1 h response    24 h resolution        24x7
--   P1  Class or many members        4 business h    2 business days        studio hours
--   P2  One member's issue           1 business day  5 business days        studio hours
--   P3  Minor / admin                2 business days 10 business days       studio hours
-- ============================================================================

update iris.sla_definitions set response_target_mins = 60, resolution_target_mins = 1440,
  response_target_days = null, resolution_target_days = null, business_hours_only = false where priority = 'P0';
update iris.sla_definitions set response_target_mins = 240,
  response_target_days = null, resolution_target_days = 2, business_hours_only = true where priority = 'P1';
update iris.sla_definitions set
  response_target_days = 1, resolution_target_days = 5, business_hours_only = true where priority = 'P2';
update iris.sla_definitions set
  response_target_days = 2, resolution_target_days = 10, business_hours_only = true where priority = 'P3';
