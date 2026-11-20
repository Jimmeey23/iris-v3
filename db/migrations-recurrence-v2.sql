-- ============================================================================
-- Recurrence checks v2 (2026-11-20)
--  * Day-5 AND day-10 checks are both scheduled the moment the original is
--    resolved, each counted from that resolution (no longer chained).
--  * Every check is assigned to the original ticket's reporter (bikes and mics).
--  * Check <-> original are linked both ways via related_ticket_ids.
--  * Check description/metadata carry the original's creation and resolution
--    date AND time.
-- Re-runnable. Depends on migrations-recurrence-checks.sql.
-- ============================================================================

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

  -- Only the move INTO resolved starts a cycle (closing a resolved ticket does not).
  if new.status <> 'resolved' or old.status in ('resolved','closed') then return new; end if;
  if not iris.recurrence_enabled() then return new; end if;
  v_kind := iris.recurrence_kind(new.category, new.subcategory, new.equipment, new.title,
                                 new.description, new.tags, new.metadata);
  if v_kind is null then return new; end if;

  v_days := iris.recurrence_days();
  v_cycle := coalesce((select max(cycle) from iris.recurrence_checks where parent_ticket_id = new.id), 0) + 1;
  -- Every step is scheduled now, each counted from the resolution of the ORIGINAL
  -- ticket (day 5 and day 10 by default), so the day-10 check is raised on day 10
  -- whether or not the day-5 one has been recorded yet. A "fault returned" outcome
  -- reopens the original, which cancels whatever is still scheduled.
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

create or replace function iris.materialize_recurrence_checks()
returns int language plpgsql security definer set search_path = iris, public as $$
declare
  rc record;
  p iris.tickets;
  v_owner text;
  v_label text;
  v_num text;
  v_steps int := cardinality(iris.recurrence_days());
  v_checklist text;
  v_new_id text;
  v_reporter text;
  n int := 0;
begin
  for rc in
    select * from iris.recurrence_checks
     where status = 'scheduled' and due_at <= now()
     order by due_at
     for update skip locked
     limit 50
  loop
    select * into p from iris.tickets where id = rc.parent_ticket_id;
    -- Parent reopened or gone: the trigger normally cancels, this is the safety net.
    if p.id is null or p.status not in ('resolved','closed') then
      update iris.recurrence_checks set status = 'cancelled', outcome_at = now() where id = rc.id;
      continue;
    end if;

    -- Shown on every check: who reported the original and when it was raised.
    v_reporter := coalesce((select e.name from iris.employees e where e.id = p.reporter_id),
                           p.metadata #>> '{legacy,created_by_name}', 'Unknown');

    v_num := substring(p.title || ' ' || coalesce(p.description, '') from
               case rc.kind when 'bike' then '(?i)bike\s*(?:no\.?|number|#)?\s*(\d{1,3})\M'
                            else '(?i)\mmic(?:rophone)?\s*(?:no\.?|number|#)?\s*(\d{1,2})\M' end);
    v_label := case rc.kind when 'bike' then coalesce('Bike #' || v_num, 'PowerCycle bike')
                            else coalesce('Mic #' || v_num, 'Studio microphone') end;
    -- Every check goes to whoever reported the original fault; the repair owner
    -- only if that reporter has left.
    v_owner := coalesce((select e.id from iris.employees e where e.id = p.reporter_id and e.is_active), p.assignee_id);
    v_checklist := case rc.kind
      when 'bike' then E'1. Ride-test the bike for at least 5 minutes\n2. Confirm the original fault has not come back\n3. Check pedal tightness, crank arms and the saddle clamp\n4. Test the resistance knob, gear lever and power meter pairing\n5. Ask the trainers who taught on it whether anything felt off'
      else E'1. Power the mic on and do a full sound check through the studio system\n2. Confirm the original fault (drop-outs, crackle, no signal) has not come back\n3. Check the battery, pack connector and headset cable\n4. Ask the trainers who used it whether it cut out in class' end;

    insert into iris.tickets (title, description, category, subcategory, priority, studio_code, department_code,
                              assignee_id, reporter_id, equipment, tags, related_ticket_ids, source, metadata, idempotency_key)
    values (
      format('[Recurrence check %s of %s · day %s] %s — confirm the fault has not returned', rc.step, v_steps, rc.day_offset, v_label),
      format(E'Raised automatically: %s ("%s") was resolved on %s IST.\nOriginal ticket reported by %s, created on %s IST.\n\nCheck %s of %s, %s days after the resolution. Confirm the %s has worked without the original fault since then, then record the outcome on this ticket: "No recurrence" or "Fault returned". If the fault is back, the original ticket reopens.\n\nWhat to do:\n%s',
             p.ticket_id, p.title, to_char(coalesce(p.resolved_at, rc.created_at) at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
             v_reporter, to_char(p.created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
             rc.step, v_steps, rc.day_offset, lower(v_label), v_checklist),
      'Repair and Maintenance',
      case rc.kind when 'bike' then 'PowerCycle Bike Malfunction & Repairs' else 'Audio, Mic & Headphone Malfunction' end,
      'P2', p.studio_code, p.department_code, v_owner, p.reporter_id, v_label,
      array['recurrence-check', rc.kind || '-recheck', 'day-' || rc.day_offset || '-check'],
      array[p.ticket_id],
      'system',
      jsonb_build_object('recurrence_check', jsonb_build_object(
        'id', rc.id, 'parent_ticket_id', p.id, 'parent_ticket', p.ticket_id, 'kind', rc.kind,
        'cycle', rc.cycle, 'step', rc.step, 'of', v_steps, 'day', rc.day_offset,
        'parent_reported_by', v_reporter, 'parent_created_at', p.created_at,
        'parent_resolved_at', coalesce(p.resolved_at, rc.created_at))),
      'recheck:' || p.id || ':c' || rc.cycle || ':s' || rc.step)
    returning id into v_new_id;

    update iris.recurrence_checks set status = 'open', check_ticket_id = v_new_id where id = rc.id;
    -- Link both ways so the original lists its checks under Linked tickets.
    update iris.tickets set related_ticket_ids =
             array(select distinct x from unnest(coalesce(related_ticket_ids, '{}') || (select ticket_id from iris.tickets where id = v_new_id)) x)
     where id = p.id;
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name)
    values (p.id, 'recurrence_raised',
            format('Day-%s recurrence check raised as %s.', rc.day_offset, (select ticket_id from iris.tickets where id = v_new_id)),
            'IRIS Automation');
    n := n + 1;
  end loop;
  return n;
end $$;


-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Live cycles (original still resolved, no failure/cancel in the cycle) get any
-- missing later steps, dated from the original resolution.
insert into iris.recurrence_checks (parent_ticket_id, kind, cycle, step, day_offset, due_at)
select rc.parent_ticket_id, rc.kind, rc.cycle, s.i, d.days[s.i],
       coalesce(p.resolved_at, rc.created_at) + make_interval(days => d.days[s.i])
  from (select distinct on (parent_ticket_id, cycle) * from iris.recurrence_checks order by parent_ticket_id, cycle, step) rc
  join iris.tickets p on p.id = rc.parent_ticket_id and p.status in ('resolved','closed')
  cross join (select iris.recurrence_days() as days) d
  cross join lateral generate_subscripts(d.days, 1) s(i)
 where not exists (select 1 from iris.recurrence_checks x where x.parent_ticket_id = rc.parent_ticket_id
                     and x.cycle = rc.cycle and x.status in ('failed','cancelled'))
on conflict do nothing;

-- Existing check tickets: link both ways and record the original's resolution time.
update iris.tickets k set
  related_ticket_ids = array(select distinct x from unnest(coalesce(k.related_ticket_ids, '{}') || p.ticket_id) x),
  metadata = jsonb_set(k.metadata, '{recurrence_check,parent_resolved_at}',
                       coalesce(to_jsonb(p.resolved_at), k.metadata #> '{recurrence_check,parent_resolved_at}', 'null'::jsonb))
  from iris.recurrence_checks rc join iris.tickets p on p.id = rc.parent_ticket_id
 where rc.check_ticket_id = k.id and not (p.ticket_id = any(coalesce(k.related_ticket_ids, '{}')));
update iris.tickets p set
  related_ticket_ids = array(select distinct x from unnest(coalesce(p.related_ticket_ids, '{}') || k.ticket_id) x)
  from iris.recurrence_checks rc join iris.tickets k on k.id = rc.check_ticket_id
 where rc.parent_ticket_id = p.id and not (k.ticket_id = any(coalesce(p.related_ticket_ids, '{}')));
