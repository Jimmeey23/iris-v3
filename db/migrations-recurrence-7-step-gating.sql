-- ============================================================================
-- Recurrence checks run one step at a time. Re-runnable.
-- Depends on migrations-sla-pause-and-close.sql and migrations-recurrence-4-link-fix.sql.
--
-- 1. Resolving a bike/mic ticket schedules only the first check. The next check
--    is scheduled only once the previous one is recorded "No recurrence"
--    (record_recurrence_outcome already does this). Previously every step was
--    inserted up front, so check 2 fired on day 10 even while check 1 was still
--    open or had failed.
-- 2. If a check is recorded "Fault returned", the original reopens and the rest
--    of that round is cancelled. When the original is resolved again, the round
--    continues with the NEXT check, due 5 days (the first recurrence offset)
--    after that new resolution. It does not restart from check 1.
-- 3. "Fault returned" no longer requires a note.
-- 4. Cleanup: later steps already scheduled by the old trigger, behind an
--    unpassed earlier step, are removed (re-created when that step passes).
-- ============================================================================

create or replace function iris.recurrence_on_status()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_kind text;
  v_days int[];
  v_cycle int;
  v_step int := 1;
  v_offset int;
  v_failed_step int;
  v_base timestamptz;
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

  if new.status not in ('resolved','closed') or old.status in ('resolved','closed') then return new; end if;
  if not iris.recurrence_enabled() then return new; end if;
  v_kind := iris.recurrence_kind(new.category, new.subcategory, new.equipment, new.title,
                                 new.description, new.tags, new.metadata);
  if v_kind is null then return new; end if;

  v_days := iris.recurrence_days();
  v_base := coalesce(new.resolved_at, now());
  v_offset := v_days[1];

  -- Did the latest round end on a failed check? Then continue with the step after it.
  select rc.step into v_failed_step
    from iris.recurrence_checks rc
   where rc.parent_ticket_id = new.id
     and rc.cycle = (select max(cycle) from iris.recurrence_checks where parent_ticket_id = new.id)
     and rc.status = 'failed'
   order by rc.step desc limit 1;
  if v_failed_step is not null then
    if v_failed_step >= cardinality(v_days) then
      -- The last check failed: the repair is re-verified with the final check again.
      v_step := v_failed_step;
    else
      v_step := v_failed_step + 1;
    end if;
  end if;

  v_cycle := coalesce((select max(cycle) from iris.recurrence_checks where parent_ticket_id = new.id), 0) + 1;
  insert into iris.recurrence_checks (parent_ticket_id, kind, cycle, step, day_offset, due_at)
  values (new.id, v_kind, v_cycle, v_step, v_offset, v_base + make_interval(days => v_offset))
  on conflict do nothing;

  insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name)
  values (new.id, 'recurrence_scheduled',
          format('Recurrence check %s of %s scheduled: the %s will be re-checked on %s (%s days after resolution).%s',
                 v_step, cardinality(v_days),
                 case v_kind when 'bike' then 'bike' else 'microphone' end,
                 to_char((v_base + make_interval(days => v_offset)) at time zone 'Asia/Kolkata', 'DD Mon'),
                 v_offset,
                 case when v_failed_step is not null then ' Continues after the earlier failed check.' else '' end),
          'IRIS Automation');
  return new;
end $$;

-- Note is optional for "Fault returned". Next step is dated from the original's resolution
-- for a fresh round; a continued round uses the same spacing as the configured days.
create or replace function iris.record_recurrence_outcome(p_check_ticket_id text, p_outcome text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = iris, public as $$
declare
  rc iris.recurrence_checks;
  p iris.tickets;
  v_days int[] := iris.recurrence_days();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_next_offset int;
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
  select * into p from iris.tickets where id = rc.parent_ticket_id;

  update iris.recurrence_checks set
    status = case p_outcome when 'clear' then 'passed' else 'failed' end,
    outcome_note = v_note, outcome_by_user_id = iris.current_user_id(), outcome_at = now()
  where id = rc.id;

  update iris.tickets set status = 'resolved',
    resolution = case p_outcome
      when 'clear' then 'No recurrence: ' || coalesce(v_note, 'confirmed working.')
      else 'Fault returned' || coalesce(': ' || v_note, '') || ' — ' || p.ticket_id || ' reopened.' end
  where id = p_check_ticket_id;

  if p_outcome = 'clear' then
    if rc.step < cardinality(v_days) then
      -- Gap between this step and the next, counted from when this check came due.
      v_next_offset := greatest(v_days[rc.step + 1] - v_days[rc.step], 1);
      insert into iris.recurrence_checks (parent_ticket_id, kind, cycle, step, day_offset, due_at)
      values (rc.parent_ticket_id, rc.kind, rc.cycle, rc.step + 1, v_days[rc.step + 1],
              greatest(rc.due_at + make_interval(days => v_next_offset), now()))
      on conflict do nothing;
    end if;
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (p.id, 'recurrence_passed', format('Check %s: no recurrence.%s', rc.step,
            case when rc.step < cardinality(v_days) then format(' Next check in %s days.', v_next_offset) else ' All checks passed.' end),
            iris.current_user_id(), v_actor);
  else
    -- Reopening fires recurrence_on_status, which cancels anything left in this round.
    -- The next check is scheduled only once the original is resolved again.
    update iris.tickets set status = 'open', resolved_at = null where id = p.id;
    insert into iris.ticket_comments (ticket_id, author_user_id, author_name, content, is_internal)
    values (p.id, iris.current_user_id(), coalesce(v_actor, 'IRIS Automation'),
            format('Fault returned (check %s, %s)%s', rc.step,
                   (select ticket_id from iris.tickets where id = p_check_ticket_id), coalesce(': ' || v_note, '.')), true);
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (p.id, 'recurrence_failed',
            format('Check %s: fault returned%s. Ticket reopened; the next check is scheduled 5 days after it is resolved again.',
                   rc.step, coalesce(' — ' || v_note, '')),
            iris.current_user_id(), v_actor);
  end if;

  return jsonb_build_object('outcome', p_outcome, 'parent_ticket', p.ticket_id, 'parent_ticket_id', p.id,
    'next_day', case when p_outcome = 'clear' and rc.step < cardinality(v_days) then v_next_offset end);
end $$;
grant execute on function iris.record_recurrence_outcome(text, text, text) to iris_app;

-- Clean up rounds created by the old trigger: a later step still 'scheduled' while an
-- earlier step of the same round has not passed is removed (it is re-created when that
-- earlier step passes).
delete from iris.recurrence_checks later
 where later.status = 'scheduled'
   and exists (select 1 from iris.recurrence_checks earlier
                where earlier.parent_ticket_id = later.parent_ticket_id
                  and earlier.cycle = later.cycle
                  and earlier.step < later.step
                  and earlier.status <> 'passed');
