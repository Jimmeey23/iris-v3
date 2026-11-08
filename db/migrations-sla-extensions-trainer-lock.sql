-- ============================================================================
-- 1. Trainer Feedback tickets are admin-only.
--    Enforced in RLS so every screen, search, report and AI read that runs
--    through withUser() hides them from non-admins, along with their comments,
--    activities, attachments and logs (all of which go through can_access_ticket_id).
-- 2. SLA extension requests: the owner asks, their reporting manager approves,
--    and only then is the time added to the SLA.
-- Re-runnable.
-- ============================================================================

create or replace function iris.is_admin_only_category(p_category text)
returns boolean language sql immutable as $$
  select coalesce(p_category, '') = 'Trainer Feedback'
$$;

create or replace function iris.can_access_ticket_id(p_ticket_id text)
returns boolean language sql stable security definer set search_path = iris, public as $$
  select exists (
    select 1 from iris.tickets t where t.id = p_ticket_id
      and (not iris.is_admin_only_category(t.category) or iris.is_admin())
      and iris.can_access_ticket_multi(t.department_code, t.department_codes, t.studio_code,
                                       t.assignee_id, t.assignee_ids, t.reporter_id))
$$;

drop policy if exists p_read on iris.tickets;
create policy p_read on iris.tickets for select to iris_app
  using ((not iris.is_admin_only_category(category) or iris.is_admin())
         and iris.can_access_ticket_multi(department_code, department_codes, studio_code, assignee_id, assignee_ids, reporter_id));
drop policy if exists p_update on iris.tickets;
create policy p_update on iris.tickets for update to iris_app
  using ((not iris.is_admin_only_category(category) or iris.is_admin())
         and iris.can_access_ticket_multi(department_code, department_codes, studio_code, assignee_id, assignee_ids, reporter_id))
  with check ((not iris.is_admin_only_category(category) or iris.is_admin())
         and iris.can_access_ticket_multi(department_code, department_codes, studio_code, assignee_id, assignee_ids, reporter_id));

-- ---------------------------------------------------------------------------
create table if not exists iris.sla_extension_requests (
  id                     uuid primary key default gen_random_uuid(),
  ticket_id              text not null references iris.tickets(id) on delete cascade,
  requested_by_user_id   uuid references iris.users(id) on delete set null,
  requester_employee_id  text references iris.employees(id) on delete set null,
  approver_employee_id   text references iris.employees(id) on delete set null,
  hours                  int  not null check (hours between 1 and 168),
  reason                 text not null,
  status                 text not null default 'pending'
                         check (status in ('pending','approved','rejected','cancelled')),
  decided_by_user_id     uuid references iris.users(id) on delete set null,
  decided_by_name        text,
  decision_note          text,
  decided_at             timestamptz,
  created_at             timestamptz not null default now()
);
-- One open request per ticket at a time.
create unique index if not exists sla_ext_one_pending on iris.sla_extension_requests (ticket_id) where status = 'pending';
create index if not exists sla_ext_approver_idx on iris.sla_extension_requests (approver_employee_id) where status = 'pending';

alter table iris.sla_extension_requests enable row level security;
drop policy if exists p_read on iris.sla_extension_requests;
create policy p_read on iris.sla_extension_requests for select to iris_app
  using (iris.can_access_ticket_id(ticket_id) or approver_employee_id = iris.current_employee_id() or iris.is_admin());
grant select on iris.sla_extension_requests to iris_app;

insert into iris.notification_rules (event, in_app, email)
select v.event, true, true
  from (values ('SLA extension requested'), ('SLA extension decided')) as v(event)
 where not exists (select 1 from iris.notification_rules r where r.event = v.event);
