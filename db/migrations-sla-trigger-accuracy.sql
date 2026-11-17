-- ============================================================================
-- SLA trigger accuracy fixes. Re-runnable.
--
-- 1. calculate_sla no longer overwrites targets the same UPDATE already set
--    (the ticket PATCH computes business-hours targets itself on priority
--    change; the old trigger clobbered them with plain clock-time maths).
-- 2. The at-risk threshold is 75% of the *actual* resolution window
--    (created_at .. sla_resolution_target), so SLA extensions move it, matching
--    the sweep (sweeps.ts) and isSlaAtRisk (ops-policy.ts). The old version
--    used the definition's minutes and ignored extensions.
-- 3. The trigger also fires on sla_resolution_target changes, so extending the
--    SLA un-breaches the ticket immediately and automatic escalation stops.
-- 4. refresh_sla_statuses uses the same actual-window maths.
-- ============================================================================

create or replace function iris.calculate_sla()
returns trigger language plpgsql as $$
declare d iris.sla_definitions;
begin
  select * into d from iris.sla_definitions where priority = new.priority;
  if not found then return new; end if;

  if tg_op = 'INSERT' then
    new.sla_response_target := coalesce(new.sla_response_target,
      new.created_at + make_interval(mins => d.response_target_mins));
    new.sla_resolution_target := coalesce(new.sla_resolution_target,
      new.created_at + make_interval(mins => d.resolution_target_mins));
  elsif new.priority is distinct from old.priority then
    -- Recompute only targets the same statement did not already set.
    if new.sla_response_target is not distinct from old.sla_response_target then
      new.sla_response_target := new.created_at + make_interval(mins => d.response_target_mins);
    end if;
    if new.sla_resolution_target is not distinct from old.sla_resolution_target then
      new.sla_resolution_target := new.created_at + make_interval(mins => d.resolution_target_mins);
    end if;
  end if;

  if new.status in ('resolved', 'closed') then
    new.resolved_at := coalesce(new.resolved_at, now());
    if new.sla_status <> 'breached' then
      new.sla_status := case when new.resolved_at > new.sla_resolution_target then 'breached' else 'on_track' end;
    end if;
  elsif new.sla_status <> 'paused' then
    new.sla_status := case
      when now() > new.sla_resolution_target then 'breached'
      when now() >= new.created_at + (new.sla_resolution_target - new.created_at) * 0.75 then 'at_risk'
      else 'on_track' end;
  end if;
  return new;
end $$;

drop trigger if exists trg_calculate_sla on iris.tickets;
create trigger trg_calculate_sla
  before insert or update of priority, status, sla_status, sla_resolution_target on iris.tickets
  for each row execute function iris.calculate_sla();

create or replace function iris.refresh_sla_statuses()
returns integer language sql security definer set search_path = iris, public as $$
  with u as (
    update iris.tickets t set sla_status = case
        when now() > t.sla_resolution_target then 'breached'
        when now() >= t.created_at + (t.sla_resolution_target - t.created_at) * 0.75 then 'at_risk'
        else 'on_track' end
    where t.status not in ('resolved', 'closed') and t.sla_status <> 'paused'
      and t.sla_resolution_target is not null
      and t.sla_status is distinct from case
        when now() > t.sla_resolution_target then 'breached'
        when now() >= t.created_at + (t.sla_resolution_target - t.created_at) * 0.75 then 'at_risk'
        else 'on_track' end
    returning 1)
  select count(*)::int from u
$$;
