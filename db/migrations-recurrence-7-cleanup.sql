-- ============================================================================
-- Recurrence checks: cleanup (2026-11-23). Re-runnable.
-- Depends on migrations-recurrence-1 .. -6.
--
-- 1. A check ticket resolved or closed from the normal status controls (not the
--    "No recurrence" / "Fault returned" buttons) left its check stuck at "open"
--    forever: the original's panel said "Due now" for good and the outcome
--    buttons stayed live on a closed ticket. It is now recorded as passed, with
--    a note saying it was closed without an explicit outcome, and logged on the
--    original.
-- 2. record_recurrence_outcome still carried the v1 chaining (insert the next
--    step on "clear"). Since v2 every step is scheduled at resolution, so the
--    chaining is gone and the "next check" / "all checks passed" wording now
--    comes from what is actually still pending in the cycle. Before, recording
--    the day-10 check while day-5 was still open said "All checks passed".
-- 3. The outcome can no longer be recorded on a check whose original has been
--    reopened in the meantime (the cycle is void), with a clear message.
-- ============================================================================

create or replace function iris.recurrence_on_status()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_kind text;
  v_days int[];
  v_cycle int;
  rc iris.recurrence_checks;
begin
  if current_setting('iris.seeding', true) = 'on' then return new; end if;

  -- A check ticket closed by hand: count it as passed so the cycle doesn't hang.
  -- record_recurrence_outcome marks the check first, so it never lands here; nor
  -- does the reopen branch below (the original is no longer resolved by then).
  if new.status in ('resolved','closed') and old.status not in ('resolved','closed') then
    select rc0.* into rc from iris.recurrence_checks rc0
      join iris.tickets p on p.id = rc0.parent_ticket_id and p.status in ('resolved','closed')
     where rc0.check_ticket_id = new.id and rc0.status = 'open'
     for update of rc0;
    if rc.id is not null then
      update iris.recurrence_checks set status = 'passed', outcome_at = now(),
             outcome_note = coalesce(nullif(btrim(new.resolution), ''), 'Closed without recording an outcome.'),
             outcome_by_user_id = iris.current_user_id()
       where id = rc.id;
      insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
      values (rc.parent_ticket_id, 'recurrence_passed',
              format('Day-%s check %s was %s without an explicit outcome; counted as no recurrence.',
                     rc.day_offset, new.ticket_id, new.status),
              iris.current_user_id(), 'IRIS Automation');
      return new;
    end if;
  end if;

  -- Reopened: whatever was pending for this ticket no longer makes sense.
  if old.status in ('resolved','closed') and new.status not in ('resolved','closed') then
    update iris.tickets t set status = 'closed',
           resolution = coalesce(t.resolution, 'Cancelled: the original ticket ' || new.ticket_id || ' was reopened.')
      from iris.recurrence_checks rc1
     where rc1.parent_ticket_id = new.id and rc1.status = 'open'
       and t.id = rc1.check_ticket_id and t.status not in ('resolved','closed');
    update iris.recurrence_checks set status = 'cancelled', outcome_at = now()
     where parent_ticket_id = new.id and status in ('scheduled','open');
    return new;
  end if;

  -- Only the move INTO resolved starts a cycle (closing a resolved ticket does not).
  if new.status <> 'resolved' or old.status in ('resolved','closed') then return new; end if;
  if not iris.recurrence_enabled() then return new; end if;
  v_kind := iris.recurrence_kind(new.category, new.subcategory, new.equipment, new.title,
                                 new.description, new.tags, new.metadata);
  if v_kind is null then return new; end if;

  v_days := iris.recurrence_days();
  v_cycle := coalesce((select max(cycle) from iris.recurrence_checks where parent_ticket_id = new.id), 0) + 1;
  -- Every step is scheduled now, each counted from the resolution of the original.
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

create or replace function iris.record_recurrence_outcome(p_check_ticket_id text, p_outcome text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = iris, public as $$
declare
  rc iris.recurrence_checks;
  p iris.tickets;
  v_next int;
  v_pending int;
  v_check_no text;
  v_actor text := (select coalesce(e.name, u.email::text) from iris.users u
                     left join iris.employees e on e.id = u.employee_id where u.id = iris.current_user_id());
begin
  if p_outcome not in ('clear','returned') then
    raise exception 'Outcome must be clear or returned' using errcode = 'P0001';
  end if;
  if not iris.can_access_ticket_id(p_check_ticket_id) then
    raise exception 'You don''t have access to this check' using errcode = '42501';
  end if;
  select * into rc from iris.recurrence_checks where check_ticket_id = p_check_ticket_id for update;
  if rc.id is null then raise exception 'This ticket is not a recurrence check' using errcode = 'P0001'; end if;
  if rc.status <> 'open' then raise exception 'This check was already recorded as %', rc.status using errcode = 'P0001'; end if;
  if p_outcome = 'returned' and coalesce(btrim(p_note), '') = '' then
    raise exception 'Describe what came back so the repair owner knows where to start' using errcode = 'P0001';
  end if;
  select * into p from iris.tickets where id = rc.parent_ticket_id for update;
  if p.id is null or p.status not in ('resolved','closed') then
    raise exception 'The original ticket % has been reopened, so this check no longer applies', coalesce(p.ticket_id, '')
      using errcode = 'P0001';
  end if;
  v_check_no := (select ticket_id from iris.tickets where id = p_check_ticket_id);

  update iris.recurrence_checks set
    status = case p_outcome when 'clear' then 'passed' else 'failed' end,
    outcome_note = nullif(btrim(p_note), ''), outcome_by_user_id = iris.current_user_id(), outcome_at = now()
  where id = rc.id;

  update iris.tickets set status = 'resolved',
    resolution = case p_outcome
      when 'clear' then 'No recurrence: ' || coalesce(nullif(btrim(p_note), ''), 'confirmed working.')
      else 'Fault returned: ' || btrim(p_note) || ' — ' || p.ticket_id || ' reopened.' end
  where id = p_check_ticket_id;

  if p_outcome = 'clear' then
    -- What is still to come in this cycle (every step was scheduled at resolution).
    select min(day_offset) filter (where step > rc.step), count(*)
      into v_next, v_pending
      from iris.recurrence_checks
     where parent_ticket_id = rc.parent_ticket_id and cycle = rc.cycle and status in ('scheduled','open');
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (p.id, 'recurrence_passed', format('Day-%s check (%s): no recurrence.%s', rc.day_offset, v_check_no,
            case when v_next is not null then format(' Next check on day %s.', v_next)
                 when v_pending > 0 then ' Waiting on the earlier check.'
                 else ' All checks passed.' end),
            iris.current_user_id(), v_actor);
  else
    -- Reopening fires recurrence_on_status, which cancels anything left in this cycle.
    update iris.tickets set status = 'open', resolved_at = null where id = p.id;
    insert into iris.ticket_comments (ticket_id, author_user_id, author_name, content, is_internal)
    values (p.id, iris.current_user_id(), coalesce(v_actor, 'IRIS Automation'),
            format('Fault returned (day-%s check %s): %s', rc.day_offset, v_check_no, btrim(p_note)), true);
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (p.id, 'recurrence_failed', format('Day-%s check (%s): fault returned — %s. Ticket reopened.', rc.day_offset, v_check_no, btrim(p_note)),
            iris.current_user_id(), v_actor);
  end if;

  return jsonb_build_object('outcome', p_outcome, 'parent_ticket', p.ticket_id, 'parent_ticket_id', p.id,
    'next_day', v_next, 'pending', coalesce(v_pending, 0));
end $$;

grant execute on function iris.record_recurrence_outcome(text, text, text) to iris_app;

-- Backfill: checks stuck "open" on a check ticket that is already resolved/closed.
update iris.recurrence_checks rc set status = 'passed', outcome_at = coalesce(k.resolved_at, now()),
       outcome_note = coalesce(nullif(btrim(k.resolution), ''), 'Closed without recording an outcome.')
  from iris.tickets k, iris.tickets p
 where k.id = rc.check_ticket_id and p.id = rc.parent_ticket_id
   and rc.status = 'open' and k.status in ('resolved','closed') and p.status in ('resolved','closed');
-- ...and those whose original was reopened without the cancel reaching them.
update iris.tickets k set status = 'closed',
       resolution = coalesce(k.resolution, 'Cancelled: the original ticket ' || p.ticket_id || ' was reopened.')
  from iris.recurrence_checks rc, iris.tickets p
 where k.id = rc.check_ticket_id and p.id = rc.parent_ticket_id and rc.status = 'open'
   and p.status not in ('resolved','closed') and k.status not in ('resolved','closed');
update iris.recurrence_checks rc set status = 'cancelled', outcome_at = now()
  from iris.tickets p
 where p.id = rc.parent_ticket_id and rc.status in ('scheduled','open') and p.status not in ('resolved','closed');
