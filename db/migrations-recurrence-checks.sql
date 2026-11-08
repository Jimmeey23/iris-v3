-- ============================================================================
-- Recurrence checks for repaired bikes and microphones.
--
-- When a bike or microphone ticket moves to `resolved`, IRIS schedules a
-- check N days later (default 5, then 10). Each check only becomes a ticket on
-- its due day, so nothing sits in the queue early.
--   * "No recurrence"  -> check closes, the next one is scheduled.
--   * "Fault returned" -> check closes as failed, the ORIGINAL ticket reopens,
--                         remaining checks for that cycle are cancelled.
--   * Original ticket reopened by hand -> pending checks are cancelled.
--   * Resolved again later -> a fresh cycle starts.
-- AC and every other equipment type never trigger checks.
--
-- Settings (app_settings): recurrence.enabled (bool, default true),
--                          recurrence.days    (int[], default [5,10]).
-- Re-runnable.
-- ============================================================================

-- Check tickets are raised by the system, not a person.
alter table iris.tickets drop constraint if exists tickets_source_check;
alter table iris.tickets add constraint tickets_source_check
  check (source = any (array['manual','ai_assistant','email','webhook','form_intake','voice','system']));

create table if not exists iris.recurrence_checks (
  id               uuid primary key default gen_random_uuid(),
  parent_ticket_id text not null references iris.tickets(id) on delete cascade,
  kind             text not null check (kind in ('bike','mic')),
  cycle            int  not null,
  step             int  not null,                 -- 1-based position in recurrence.days
  day_offset       int  not null,                 -- days after the resolution
  due_at           timestamptz not null,
  status           text not null default 'scheduled'
                   check (status in ('scheduled','open','passed','failed','cancelled')),
  check_ticket_id  text references iris.tickets(id) on delete set null,
  outcome_note     text,
  outcome_by_user_id uuid references iris.users(id) on delete set null,
  outcome_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique (parent_ticket_id, cycle, step)
);
create index if not exists recurrence_checks_due_idx on iris.recurrence_checks (due_at) where status = 'scheduled';
create index if not exists recurrence_checks_ticket_idx on iris.recurrence_checks (check_ticket_id);

alter table iris.recurrence_checks enable row level security;
drop policy if exists p_read on iris.recurrence_checks;
create policy p_read on iris.recurrence_checks for select
  using (iris.can_access_ticket_id(parent_ticket_id) or iris.can_access_ticket_id(check_ticket_id));
grant select on iris.recurrence_checks to iris_app;

-- ---------------------------------------------------------------------------
-- Which tickets qualify. One place, so the UI and reports can ask the same question.
-- ---------------------------------------------------------------------------
create or replace function iris.recurrence_kind(
  p_category text, p_subcategory text, p_equipment text, p_title text, p_description text,
  p_tags text[], p_metadata jsonb)
returns text language sql immutable as $$
  select case
    -- A check never schedules a check; neither do the checks imported from v2.
    when p_metadata ? 'recurrence_check' or 'recurrence-check' = any(coalesce(p_tags, '{}'))
         or p_title like '[Recurrence check%' then null
    when coalesce(p_equipment, '') ~* '\m(bike|powercycle)\M'
         or (p_category = 'Repair and Maintenance' and coalesce(p_subcategory, '') ~* 'powercycle bike') then 'bike'
    when coalesce(p_equipment, '') ~* '\m(mic|microphone|headset)\M'
         or coalesce(p_subcategory, '') ~* 'mic(rophone)?\M'
         or (coalesce(p_subcategory, '') ~* 'audio'
             and (p_title || ' ' || coalesce(p_description, '')) ~* '\m(mic|microphone|headset)\M') then 'mic'
    else null
  end
$$;

create or replace function iris.recurrence_days()
returns int[] language sql stable as $$
  select coalesce(
    (select array(select jsonb_array_elements_text(value)::int) from iris.app_settings
      where key = 'recurrence.days' and jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0),
    array[5, 10])
$$;

create or replace function iris.recurrence_enabled()
returns boolean language sql stable as $$
  select coalesce((select value = 'true'::jsonb from iris.app_settings where key = 'recurrence.enabled'), true)
$$;

-- ---------------------------------------------------------------------------
-- Trigger: schedule on resolve, cancel on reopen.
-- ---------------------------------------------------------------------------
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
  -- One step at a time: step 1 now, the next only after step 1 passes.
  insert into iris.recurrence_checks (parent_ticket_id, kind, cycle, step, day_offset, due_at)
  values (new.id, v_kind, v_cycle, 1, v_days[1], coalesce(new.resolved_at, now()) + make_interval(days => v_days[1]))
  on conflict do nothing;
  insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name)
  values (new.id, 'recurrence_scheduled',
          format('Recurrence check (round %s) scheduled for %s: the %s will be re-checked %s days after resolution.',
                 v_cycle,
                 to_char((coalesce(new.resolved_at, now()) + make_interval(days => v_days[1])) at time zone 'Asia/Kolkata', 'DD Mon'),
                 case v_kind when 'bike' then 'bike' else 'microphone' end,
                 array_to_string(v_days, ' and ')),
          'IRIS Automation');
  return new;
end $$;

drop trigger if exists trg_recurrence_on_status on iris.tickets;
create trigger trg_recurrence_on_status
  after update of status on iris.tickets
  for each row when (old.status is distinct from new.status)
  execute function iris.recurrence_on_status();

-- ---------------------------------------------------------------------------
-- Sweep: turn due checks into tickets. Returns how many were raised.
-- ---------------------------------------------------------------------------
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

    v_num := substring(p.title || ' ' || coalesce(p.description, '') from
               case rc.kind when 'bike' then '(?i)bike\s*(?:no\.?|number|#)?\s*(\d{1,3})\M'
                            else '(?i)\mmic(?:rophone)?\s*(?:no\.?|number|#)?\s*(\d{1,2})\M' end);
    v_label := case rc.kind when 'bike' then coalesce('Bike #' || v_num, 'PowerCycle bike')
                            else coalesce('Mic #' || v_num, 'Studio microphone') end;
    -- Bikes go back to whoever reported the fault; microphones to the repair owner.
    v_owner := case rc.kind
      when 'bike' then coalesce(
        (select e.id from iris.employees e where e.id = p.reporter_id and e.is_active), p.assignee_id)
      else p.assignee_id end;
    v_checklist := case rc.kind
      when 'bike' then E'1. Ride-test the bike for at least 5 minutes\n2. Confirm the original fault has not come back\n3. Check pedal tightness, crank arms and the saddle clamp\n4. Test the resistance knob, gear lever and power meter pairing\n5. Ask the trainers who taught on it whether anything felt off'
      else E'1. Power the mic on and do a full sound check through the studio system\n2. Confirm the original fault (drop-outs, crackle, no signal) has not come back\n3. Check the battery, pack connector and headset cable\n4. Ask the trainers who used it whether it cut out in class' end;

    insert into iris.tickets (title, description, category, subcategory, priority, studio_code, department_code,
                              assignee_id, reporter_id, equipment, tags, source, metadata, idempotency_key)
    values (
      format('[Recurrence check %s of %s · day %s] %s — confirm the fault has not returned', rc.step, v_steps, rc.day_offset, v_label),
      format(E'Raised automatically: %s ("%s") was resolved on %s.\n\nCheck %s of %s, %s days after the resolution. Confirm the %s has worked without the original fault since then, then record the outcome on this ticket: "No recurrence" or "Fault returned". If the fault is back, the original ticket reopens.\n\nWhat to do:\n%s',
             p.ticket_id, p.title, to_char(coalesce(p.resolved_at, rc.created_at) at time zone 'Asia/Kolkata', 'DD Mon YYYY'),
             rc.step, v_steps, rc.day_offset, lower(v_label), v_checklist),
      'Repair and Maintenance',
      case rc.kind when 'bike' then 'PowerCycle Bike Malfunction & Repairs' else 'Audio, Mic & Headphone Malfunction' end,
      'P2', p.studio_code, p.department_code, v_owner, p.reporter_id, v_label,
      array['recurrence-check', rc.kind || '-recheck', 'day-' || rc.day_offset || '-check'],
      'system',
      jsonb_build_object('recurrence_check', jsonb_build_object(
        'id', rc.id, 'parent_ticket_id', p.id, 'parent_ticket', p.ticket_id, 'kind', rc.kind,
        'cycle', rc.cycle, 'step', rc.step, 'of', v_steps, 'day', rc.day_offset)),
      'recheck:' || p.id || ':c' || rc.cycle || ':s' || rc.step)
    returning id into v_new_id;

    update iris.recurrence_checks set status = 'open', check_ticket_id = v_new_id where id = rc.id;
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name)
    values (p.id, 'recurrence_raised',
            format('Day-%s recurrence check raised as %s.', rc.day_offset, (select ticket_id from iris.tickets where id = v_new_id)),
            'IRIS Automation');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Outcome, recorded on the check ticket by whoever can see it.
-- ---------------------------------------------------------------------------
create or replace function iris.record_recurrence_outcome(p_check_ticket_id text, p_outcome text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = iris, public as $$
declare
  rc iris.recurrence_checks;
  p iris.tickets;
  v_days int[] := iris.recurrence_days();
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
  select * into p from iris.tickets where id = rc.parent_ticket_id;

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
    if rc.step < cardinality(v_days) then
      insert into iris.recurrence_checks (parent_ticket_id, kind, cycle, step, day_offset, due_at)
      values (rc.parent_ticket_id, rc.kind, rc.cycle, rc.step + 1, v_days[rc.step + 1],
              coalesce(p.resolved_at, rc.created_at) + make_interval(days => v_days[rc.step + 1]))
      on conflict do nothing;
    end if;
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (p.id, 'recurrence_passed', format('Day-%s check: no recurrence.%s', rc.day_offset,
            case when rc.step < cardinality(v_days) then format(' Next check on day %s.', v_days[rc.step + 1]) else ' All checks passed.' end),
            iris.current_user_id(), v_actor);
  else
    -- Reopening fires recurrence_on_status, which cancels anything left in this cycle.
    update iris.tickets set status = 'open', resolved_at = null where id = p.id;
    insert into iris.ticket_comments (ticket_id, author_user_id, author_name, content, is_internal)
    values (p.id, iris.current_user_id(), coalesce(v_actor, 'IRIS Automation'),
            format('Fault returned (day-%s check %s): %s', rc.day_offset,
                   (select ticket_id from iris.tickets where id = p_check_ticket_id), btrim(p_note)), true);
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (p.id, 'recurrence_failed', format('Day-%s check: fault returned — %s. Ticket reopened.', rc.day_offset, btrim(p_note)),
            iris.current_user_id(), v_actor);
  end if;

  return jsonb_build_object('outcome', p_outcome, 'parent_ticket', p.ticket_id, 'parent_ticket_id', p.id,
    'next_day', case when p_outcome = 'clear' and rc.step < cardinality(v_days) then v_days[rc.step + 1] end);
end $$;

grant execute on function iris.record_recurrence_outcome(text, text, text) to iris_app;
grant execute on function iris.recurrence_kind(text, text, text, text, text, text[], jsonb) to iris_app;
revoke all on function iris.materialize_recurrence_checks() from public;
