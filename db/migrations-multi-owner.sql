-- Multiple departments + multiple owners per ticket. Idempotent, additive.
-- Design: iris.tickets.department_code / assignee_id remain the PRIMARY (back-compat for
-- triggers, auto-assign, views, legacy code). department_codes / assignee_ids hold the FULL
-- set (primary included). A BEFORE trigger keeps primary <-> array in sync both ways.

alter table iris.tickets add column if not exists department_codes text[] not null default '{}';
alter table iris.tickets add column if not exists assignee_ids     text[] not null default '{}';

create index if not exists idx_tickets_assignee_ids on iris.tickets using gin (assignee_ids);
create index if not exists idx_tickets_department_codes on iris.tickets using gin (department_codes);

-- Backfill from the primary columns.
update iris.tickets set assignee_ids = array[assignee_id]
  where assignee_id is not null and cardinality(assignee_ids) = 0;
update iris.tickets set department_codes = array[department_code]
  where department_code is not null and cardinality(department_codes) = 0;

-- Keep primary and set consistent.
create or replace function iris.normalize_ticket_multi()
returns trigger language plpgsql as $$
declare
  v_ids text[]; v_deps text[];
begin
  v_ids := coalesce(new.assignee_ids, '{}');
  v_deps := coalesce(new.department_codes, '{}');
  if tg_op = 'INSERT' then
    if new.assignee_id is not null and not (new.assignee_id = any(v_ids)) then v_ids := array[new.assignee_id] || v_ids; end if;
    if new.assignee_id is null and cardinality(v_ids) > 0 then new.assignee_id := v_ids[1]; end if;
    if new.department_code is not null and not (new.department_code = any(v_deps)) then v_deps := array[new.department_code] || v_deps; end if;
    if new.department_code is null and cardinality(v_deps) > 0 then new.department_code := v_deps[1]; end if;
  else
    -- owners
    if new.assignee_ids is distinct from old.assignee_ids then
      if new.assignee_id is not distinct from old.assignee_id and (new.assignee_id is null or not (new.assignee_id = any(v_ids))) then
        new.assignee_id := v_ids[1];                       -- primary dropped from the set
      elsif new.assignee_id is not null and not (new.assignee_id = any(v_ids)) then
        v_ids := array[new.assignee_id] || v_ids;
      end if;
    elsif new.assignee_id is distinct from old.assignee_id then
      if old.assignee_id is not null then v_ids := array_remove(v_ids, old.assignee_id); end if;
      if new.assignee_id is not null and not (new.assignee_id = any(v_ids)) then v_ids := array[new.assignee_id] || v_ids; end if;
    end if;
    -- departments
    if new.department_codes is distinct from old.department_codes then
      if new.department_code is not distinct from old.department_code and (new.department_code is null or not (new.department_code = any(v_deps))) then
        new.department_code := v_deps[1];
      elsif new.department_code is not null and not (new.department_code = any(v_deps)) then
        v_deps := array[new.department_code] || v_deps;
      end if;
    elsif new.department_code is distinct from old.department_code then
      if old.department_code is not null then v_deps := array_remove(v_deps, old.department_code); end if;
      if new.department_code is not null and not (new.department_code = any(v_deps)) then v_deps := array[new.department_code] || v_deps; end if;
    end if;
  end if;
  new.assignee_ids := v_ids;
  new.department_codes := v_deps;
  return new;
end $$;

drop trigger if exists trg_normalize_multi on iris.tickets;
create trigger trg_normalize_multi before insert or update on iris.tickets
  for each row execute function iris.normalize_ticket_multi();

-- Workload: open tickets where the employee is ANY owner.
create or replace function iris.sync_workload()
returns trigger language plpgsql security definer set search_path = iris, public as $$
begin
  update iris.employees e set workload = (
    select count(*) from iris.tickets t
    where e.id = any(t.assignee_ids) and t.status not in ('resolved', 'closed'))
  where e.id = any(
    (case when tg_op <> 'INSERT' then old.assignee_ids else '{}'::text[] end)
    || (case when tg_op <> 'DELETE' then new.assignee_ids else '{}'::text[] end));
  return null;
end $$;

drop trigger if exists trg_sync_workload on iris.tickets;
create trigger trg_sync_workload after insert or delete or update of assignee_id, assignee_ids, status on iris.tickets
  for each row execute function iris.sync_workload();

-- One-time recompute so existing counts match.
update iris.employees e set workload = (
  select count(*) from iris.tickets t
  where e.id = any(t.assignee_ids) and t.status not in ('resolved', 'closed'));

-- Activity entry when the owner/department sets change (primary changes are logged by the existing trigger).
create or replace function iris.log_ticket_multi()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_actor text := (select coalesce(e.name, u.email::text) from iris.users u
                   left join iris.employees e on e.id = u.employee_id
                   where u.id = iris.current_user_id());
begin
  if current_setting('iris.seeding', true) = 'on' then return new; end if;
  if new.assignee_ids is distinct from old.assignee_ids and new.assignee_id is not distinct from old.assignee_id then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'reassigned', 'Owners: ' || coalesce((select string_agg(name, ', ') from iris.employees where id = any(new.assignee_ids)), 'nobody'),
            iris.current_user_id(), coalesce(v_actor, 'System'));
  end if;
  if new.department_codes is distinct from old.department_codes then
    insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
    values (new.id, 'reassigned', 'Departments: ' || coalesce(nullif(array_to_string(new.department_codes, ', '), ''), 'none'),
            iris.current_user_id(), coalesce(v_actor, 'System'));
  end if;
  return new;
end $$;

drop trigger if exists trg_log_ticket_multi on iris.tickets;
create trigger trg_log_ticket_multi after update on iris.tickets
  for each row execute function iris.log_ticket_multi();

-- Access: secondary departments / owners count.
create or replace function iris.can_access_ticket_multi(
  p_department text, p_departments text[], p_studio text, p_assignee text, p_assignees text[], p_reporter text)
returns boolean language sql stable as $$
  select case iris.current_role_tier()
    when 'admin' then true
    when 'manager' then p_department = iris.current_department()
                     or iris.current_department() = any(coalesce(p_departments, '{}'))
                     or p_assignee = iris.current_employee_id()
                     or iris.current_employee_id() = any(coalesce(p_assignees, '{}'))
                     or p_reporter = iris.current_employee_id()
    when 'executive' then p_assignee = iris.current_employee_id()
                       or iris.current_employee_id() = any(coalesce(p_assignees, '{}'))
                       or p_reporter = iris.current_employee_id()
                       or p_studio = any(iris.current_studios())
    else false
  end
$$;

create or replace function iris.can_access_ticket_id(p_ticket_id text)
returns boolean language sql stable security definer set search_path = iris, public as $$
  select exists (
    select 1 from iris.tickets t where t.id = p_ticket_id
      and iris.can_access_ticket_multi(t.department_code, t.department_codes, t.studio_code,
                                       t.assignee_id, t.assignee_ids, t.reporter_id))
$$;

drop policy if exists p_read on iris.tickets;
create policy p_read on iris.tickets for select to iris_app
  using (iris.can_access_ticket_multi(department_code, department_codes, studio_code, assignee_id, assignee_ids, reporter_id));
drop policy if exists p_update on iris.tickets;
create policy p_update on iris.tickets for update to iris_app
  using (iris.can_access_ticket_multi(department_code, department_codes, studio_code, assignee_id, assignee_ids, reporter_id))
  with check (iris.can_access_ticket_multi(department_code, department_codes, studio_code, assignee_id, assignee_ids, reporter_id));

-- Workload view counts all owners.
create or replace view iris.v_employee_workload with (security_invoker = true) as
select e.id, e.name, e.role, e.department_code, e.availability, e.workload, e.max_workload,
       round(e.workload::numeric / nullif(e.max_workload, 0), 2) as utilization,
       count(t.id) filter (where t.priority = 'P0') as p0_open,
       count(t.id) filter (where t.sla_status = 'breached') as breached_open
from iris.employees e
left join iris.tickets t on e.id = any(t.assignee_ids) and t.status not in ('resolved', 'closed')
where e.is_active
group by e.id;
