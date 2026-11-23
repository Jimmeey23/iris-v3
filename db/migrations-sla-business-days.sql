-- ============================================================================
-- SLA targets in business days.
--
-- "5 business days" stored as 10,080 minutes of studio hours quietly became about
-- 12 calendar days. A target can now be set in business days: the clock ends at
-- the same time of day N open studio days later (clamped to closing time).
-- When a *_days column is set it wins over the matching *_mins column.
--
-- Signed-off targets (2026-11-23), applied to tickets raised from now on:
--   P0  15 min response   4 h resolution          24x7
--   P1   1 h  response   12 h resolution          24x7
--   P2   4 business hours, 2 business days        studio hours
--   P3   1 business day,  5 business days         studio hours
-- Existing tickets keep the targets they were raised with. Re-runnable.
-- ============================================================================

alter table iris.sla_definitions add column if not exists response_target_days integer
  check (response_target_days is null or response_target_days > 0);
alter table iris.sla_definitions add column if not exists resolution_target_days integer
  check (resolution_target_days is null or resolution_target_days > 0);

update iris.sla_definitions set response_target_mins = 15,  resolution_target_mins = 240,
  response_target_days = null, resolution_target_days = null, business_hours_only = false where priority = 'P0';
update iris.sla_definitions set response_target_mins = 60,  resolution_target_mins = 720,
  response_target_days = null, resolution_target_days = null, business_hours_only = false where priority = 'P1';
update iris.sla_definitions set response_target_mins = 240,
  response_target_days = null, resolution_target_days = 2, business_hours_only = true where priority = 'P2';
update iris.sla_definitions set
  response_target_days = 1, resolution_target_days = 5, business_hours_only = true where priority = 'P3';
