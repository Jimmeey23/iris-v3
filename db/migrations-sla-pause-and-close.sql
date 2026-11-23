-- ============================================================================
-- 1. Pausing the SLA now actually stops the clock: paused_at records when the
--    pause began; on resume the unmet response target and the resolution target
--    both move forward by the paused duration (unless the same UPDATE set them).
-- 2. recurrence_on_status also schedules checks when a ticket goes straight to
--    'closed' from a live status (open/in_progress/escalated...), not only on
--    the move into 'resolved'. resolved -> closed still does not start a cycle.
-- Re-runnable. Depends on migrations-recurrence-2-v2.sql and migrations-sla-trigger-accuracy.sql.
-- ============================================================================

alter table iris.tickets add column if not exists paused_at timestamptz;

create or replace function iris.sla_pause_clock()
returns trigger language plpgsql as $$
declare v_paused interval;
begin
  if new.sla_status = 'paused' and old.sla_status is distinct from 'paused' then
    new.paused_at := now();
  elsif old.sla_status = 'paused' and new.sla_status is distinct from 'paused' then
    if old.paused_at is not null then
      v_paused := greatest(now() - old.paused_at, interval '0');
      if new.sla_resolution_target is not null and new.sla_resolution_target is not distinct from old.sla_resolution_target then
        new.sla_resolution_target := new.sla_resolution_target + v_paused;
      end if;
      if new.first_response_at is null and new.sla_response_target is not null
         and new.sla_response_target is not distinct from old.sla_response_target then
        new.sla_response_target := new.sla_response_target + v_paused;
      end if;
    end if;
    new.paused_at := null;
  end if;
  return new;
end $$;

-- Name sorts before trg_calculate_sla so calculate_sla derives status from the shifted target.
drop trigger if exists trg_a_sla_pause_clock on iris.tickets;
create trigger trg_a_sla_pause_clock
  before update of sla_status on iris.tickets
  for each row execute function iris.sla_pause_clock();

create or replace function iris.recurrence_on_status()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_kind text;
  v_days int[];
  v_cycle int;
begin
  if current_setting('iris.seeding', true) = 'on' then return new; end if;

  -- Reopened: whatever was pending for this ticket no longer makes sense.
  if old.status in ('resolved','closed') and new.status not in ('resolved','closed') then
    update iris.tickets t set status = 'closed',
           resolution = coalesce(t.resolution, 'Cancelled: the original ticket ' || new.ticket_id || ' was reopened.')
      from iris.recurrence_checks rc
     where rc.parent_ticket_id = new.id and rc.status = 'open'
       and t.id = rc.check_ticket_id and t.status not in ('resolved','closed');
    update iris.recurrence_checks set status = 'cancelled', outcome_at = now()
     where parent_ticket_id = new.id and status in ('scheduled','open');
    return new;
  end if;

  -- A move INTO resolved, or straight into closed from a live status, starts a cycle
  -- (closing an already-resolved ticket does not).
  if new.status not in ('resolved','closed') or old.status in ('resolved','closed') then return new; end if;
  if not iris.recurrence_enabled() then return new; end if;
  v_kind := iris.recurrence_kind(new.category, new.subcategory, new.equipment, new.title,
                                 new.description, new.tags, new.metadata);
  if v_kind is null then return new; end if;

  v_days := iris.recurrence_days();
  v_cycle := coalesce((select max(cycle) from iris.recurrence_checks where parent_ticket_id = new.id), 0) + 1;
  insert into iris.recurrence_checks (parent_ticket_id, kind, cycle, step, day_offset, due_at)
  select new.id, v_kind, v_cycle, s.i, v_days[s.i],
         coalesce(new.resolved_at, now()) + make_interval(days => v_days[s.i])
    from generate_subscripts(v_days, 1) as s(i)
  on conflict do nothing;
  insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name)
  values (new.id, 'recurrence_scheduled',
          format('Recurrence checks (round %s) scheduled: the %s will be re-checked on %s (days %s after resolution).',
                 v_cycle,
                 case v_kind when 'bike' then 'bike' else 'microphone' end,
                 (select string_agg(to_char((coalesce(new.resolved_at, now()) + make_interval(days => d)) at time zone 'Asia/Kolkata', 'DD Mon'), ' and ')
                    from unnest(v_days) d),
                 array_to_string(v_days, ' and ')),
          'IRIS Automation');
  return new;
end $$;
