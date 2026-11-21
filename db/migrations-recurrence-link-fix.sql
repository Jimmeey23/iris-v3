-- ============================================================================
-- Recurrence checks: fix a run failing when one ticket has two checks due (2026-11-21)
--  materialize_recurrence_checks() linked each new check back to the original
--  inside the loop. Two checks for the same original in one run (e.g. day 5 and
--  day 10 both due after the sweep missed a few days) made two identical
--  "Edited related tickets" activities at the same now(), which violate
--  uq_activities_seed, so the whole run rolled back and no check was ever raised.
--  The original is now linked once, after the loop, with all its new checks.
-- Re-runnable. Depends on migrations-recurrence-v2.sql / -routing.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION iris.materialize_recurrence_checks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'iris', 'public'
AS $function$
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
  v_city text;
  v_chain text[];
  n int := 0;
  v_link_parents text[] := '{}';
  v_link_checks text[] := '{}';
  v_parent text;
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
    -- Escalation: the studio's team leader, then facilities (Mumbai: Zahur → Saachi;
    -- Bengaluru: Prathap → Shifa). The sweep follows collected_info._escalation_chain.
    v_city := (select s.city from iris.studios s where s.code = p.studio_code);
    v_chain := case when v_city ilike 'beng%' or v_city ilike 'bang%'
                    then array['emp_prathap', 'emp_shifa']
                    else array[case when p.studio_code = 'SHQ' then 'emp_shipra' else 'emp_akshay' end, 'emp_zahur', 'emp_saachi'] end;
    v_chain := array(select x from unnest(v_chain) with ordinality u(x, o)
                      where x is distinct from v_owner
                        and exists (select 1 from iris.employees e where e.id = x and e.is_active)
                      order by o);
    v_checklist := case rc.kind
      when 'bike' then E'1. Ride-test the bike for at least 5 minutes\n2. Confirm the original fault has not come back\n3. Check pedal tightness, crank arms and the saddle clamp\n4. Test the resistance knob, gear lever and power meter pairing\n5. Ask the trainers who taught on it whether anything felt off'
      else E'1. Power the mic on and do a full sound check through the studio system\n2. Confirm the original fault (drop-outs, crackle, no signal) has not come back\n3. Check the battery, pack connector and headset cable\n4. Ask the trainers who used it whether it cut out in class' end;

    insert into iris.tickets (title, description, category, subcategory, priority, studio_code, department_code,
                              assignee_id, assignee_ids, department_codes, reporter_id, equipment, tags, related_ticket_ids, source,
                              collected_info, metadata, idempotency_key)
    values (
      format('[Recurrence check %s of %s · day %s] %s — confirm the fault has not returned', rc.step, v_steps, rc.day_offset, v_label),
      format(E'Raised automatically: %s ("%s") was resolved on %s IST.\nOriginal ticket reported by %s, created on %s IST.\n\nCheck %s of %s, %s days after the resolution. Confirm the %s has worked without the original fault since then, then record the outcome on this ticket: "No recurrence" or "Fault returned". If the fault is back, the original ticket reopens.\n\nWhat to do:\n%s',
             p.ticket_id, p.title, to_char(coalesce(p.resolved_at, rc.created_at) at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
             v_reporter, to_char(p.created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
             rc.step, v_steps, rc.day_offset, lower(v_label), v_checklist),
      'Repair and Maintenance',
      case rc.kind when 'bike' then 'PowerCycle Bike Malfunction & Repairs' else 'Audio, Mic & Headphone Malfunction' end,
      'P2', p.studio_code, 'OPS', v_owner, array_remove(array[v_owner], null), array['OPS'], p.reporter_id, v_label,
      array['recurrence-check', rc.kind || '-recheck', 'day-' || rc.day_offset || '-check'],
      array[p.ticket_id],
      'system',
      jsonb_build_object(
        '_ownership_rule', 'Recurrence check → original reporter, escalates to ' ||
          coalesce((select string_agg(e.name, ' → ' order by o) from unnest(v_chain) with ordinality u(x, o) join iris.employees e on e.id = x), 'nobody'),
        '_routing', jsonb_build_object('rule', 'recurrence_check', 'decided_by', 'rules'),
        '_escalation_chain', to_jsonb(v_chain),
        '_escalation_l2', v_chain[1],
        '_escalation_l3', v_chain[2]),
      jsonb_build_object('recurrence_check', jsonb_build_object(
        'id', rc.id, 'parent_ticket_id', p.id, 'parent_ticket', p.ticket_id, 'kind', rc.kind,
        'cycle', rc.cycle, 'step', rc.step, 'of', v_steps, 'day', rc.day_offset,
        'parent_reported_by', v_reporter, 'parent_created_at', p.created_at,
        'parent_resolved_at', coalesce(p.resolved_at, rc.created_at))),
      'recheck:' || p.id || ':c' || rc.cycle || ':s' || rc.step)
    returning id into v_new_id;

    update iris.recurrence_checks set status = 'open', check_ticket_id = v_new_id where id = rc.id;
    -- Linked back to the original after the loop, once per original: two checks for
    -- the same ticket in one run would otherwise log two identical "edited" activities
    -- at the same now() and collide on uq_activities_seed, failing the whole run.
    v_link_parents := v_link_parents || p.id::text;
    v_link_checks := v_link_checks || (select ticket_id from iris.tickets where id = v_new_id);
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name)
    values (p.id, 'recurrence_raised',
            format('Day-%s recurrence check raised as %s.', rc.day_offset, (select ticket_id from iris.tickets where id = v_new_id)),
            'IRIS Automation');
    n := n + 1;
  end loop;

  -- Link both ways so the original lists its checks under Linked tickets.
  for v_parent in select distinct x from unnest(v_link_parents) x loop
    update iris.tickets set related_ticket_ids =
             array(select distinct y from unnest(coalesce(related_ticket_ids, '{}') ||
                   array(select c from unnest(v_link_parents, v_link_checks) as l(pp, c) where pp = v_parent)) y)
     where id = v_parent;
  end loop;
  return n;
end $function$;
