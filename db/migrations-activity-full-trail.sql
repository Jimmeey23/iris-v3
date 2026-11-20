-- Full activity trail: one ticket update can change several things at once
-- (e.g. resolve + reassign, or escalate + status). The old trigger used an
-- if/elsif chain and logged only the FIRST change it found, so the rest were
-- silently dropped. This version logs every change in the update.
--
-- Escalation level changes are no longer logged here: the sweep and the PATCH
-- route already write a richer entry (with the reason), so the trigger's
-- "Escalated to level N" row was a duplicate.

create or replace function iris.log_ticket_activity()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_uid uuid := iris.current_user_id();
  v_actor text := coalesce((select coalesce(e.name, u.email::text) from iris.users u
                   left join iris.employees e on e.id = u.employee_id
                   where u.id = v_uid), 'System');
  v_edits text[] := '{}';
begin
  if current_setting('iris.seeding', true) = 'on' then return new; end if;

  if tg_op = 'INSERT' then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'created', 'Ticket created', v_uid, v_actor);
    return new;
  end if;

  -- Status
  if old.status is distinct from new.status then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id,
            case
              when old.status in ('resolved','closed') and new.status not in ('resolved','closed') then 'reopened'
              when new.status = 'resolved' then 'resolved'
              when new.status = 'closed' then 'closed'
              else 'status_changed'
            end,
            case
              when old.status in ('resolved','closed') and new.status not in ('resolved','closed')
                then 'Ticket reopened (' || old.status || ' → ' || new.status || ')'
              when new.status = 'resolved' then 'Ticket resolved (was ' || old.status || ')'
              when new.status = 'closed' then 'Ticket closed (was ' || old.status || ')'
              else 'Status changed from ' || old.status || ' to ' || new.status
            end,
            v_uid, v_actor);
  end if;

  -- Priority
  if old.priority is distinct from new.priority then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'priority_changed',
            'Priority changed from ' || coalesce(old.priority, 'none') || ' to ' || coalesce(new.priority, 'none'),
            v_uid, v_actor);
  end if;

  -- Primary owner
  if old.assignee_id is distinct from new.assignee_id then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id,
            case when old.assignee_id is null then 'assigned' else 'reassigned' end,
            case
              when new.assignee_id is null then
                'Unassigned (was ' || coalesce((select name from iris.employees where id = old.assignee_id), old.assignee_id) || ')'
              when old.assignee_id is null then
                'Assigned to ' || coalesce((select name from iris.employees where id = new.assignee_id), new.assignee_id)
              else
                'Reassigned from ' || coalesce((select name from iris.employees where id = old.assignee_id), old.assignee_id)
                || ' to ' || coalesce((select name from iris.employees where id = new.assignee_id), new.assignee_id)
            end,
            v_uid, v_actor);
  end if;

  -- Primary department
  if old.department_code is distinct from new.department_code then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'department_changed',
            'Primary department changed from ' || coalesce(old.department_code, 'none') || ' to ' || coalesce(new.department_code, 'none'),
            v_uid, v_actor);
  end if;

  -- SLA pause / resume
  if old.sla_status is distinct from new.sla_status and (old.sla_status = 'paused' or new.sla_status = 'paused') then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'sla_updated', case when new.sla_status = 'paused' then 'SLA paused' else 'SLA resumed' end, v_uid, v_actor);
  end if;

  -- SLA target moved by a person (sweeps don't move targets; priority-driven recomputes are covered by priority_changed)
  if old.sla_resolution_target is distinct from new.sla_resolution_target
     and v_uid is not null and old.priority is not distinct from new.priority then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'sla_updated',
            'Resolution target changed to ' || coalesce(to_char(new.sla_resolution_target at time zone 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') || ' IST', 'none'),
            v_uid, v_actor);
  end if;

  -- Resolution summary
  if coalesce(old.resolution_summary, '') is distinct from coalesce(new.resolution_summary, '') then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'resolution_summary',
            case
              when coalesce(new.resolution_summary, '') = '' then 'Resolution summary removed'
              when coalesce(old.resolution_summary, '') = '' then 'Resolution summary added'
              else 'Resolution summary edited'
            end,
            v_uid, v_actor);
  end if;

  -- Other field edits, grouped into one line
  if old.title is distinct from new.title then v_edits := array_append(v_edits, 'title'::text); end if;
  if old.description is distinct from new.description then v_edits := array_append(v_edits, 'description'::text); end if;
  if old.category is distinct from new.category or old.subcategory is distinct from new.subcategory then v_edits := array_append(v_edits, 'category'::text); end if;
  if old.studio_code is distinct from new.studio_code then v_edits := array_append(v_edits, 'studio'::text); end if;
  if old.tags is distinct from new.tags then v_edits := array_append(v_edits, 'tags'::text); end if;
  if old.related_ticket_ids is distinct from new.related_ticket_ids then v_edits := array_append(v_edits, 'linked tickets'::text); end if;
  if old.investigation_notes is distinct from new.investigation_notes then v_edits := array_append(v_edits, 'investigation notes'::text); end if;
  if old.resolution is distinct from new.resolution then v_edits := array_append(v_edits, 'resolution'::text); end if;
  if array_length(v_edits, 1) > 0 then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'edited', 'Edited ' || array_to_string(v_edits, ', '), v_uid, v_actor);
  end if;

  return new;
end $$;
