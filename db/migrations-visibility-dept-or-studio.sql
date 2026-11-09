-- Ticket visibility: managers and executives see their department's tickets AND their
-- studios' tickets (including historic/closed), plus anything assigned to or reported by them.
-- Previously managers saw only their department, and executives saw only their studios
-- (department was a fallback for executives with no studios).
-- Admins still see everything; Trainer Feedback stays admin-only via p_read.

create or replace function iris._sees_ticket(p_department text, p_departments text[], p_studio text, p_assignee text, p_assignees text[], p_reporter text)
returns boolean language sql stable as $$
  select coalesce(
       p_assignee = iris.current_employee_id()
    or iris.current_employee_id() = any(coalesce(p_assignees, '{}'))
    or p_reporter = iris.current_employee_id()
    or p_department = iris.current_department()
    or iris.current_department() = any(coalesce(p_departments, '{}'))
    or p_studio = any(iris.current_studios()), false)
$$;

create or replace function iris.can_access_ticket_multi(p_department text, p_departments text[], p_studio text, p_assignee text, p_assignees text[], p_reporter text)
returns boolean language sql stable as $$
  select case iris.current_role_tier()
    when 'admin' then true
    when 'manager' then iris._sees_ticket(p_department, p_departments, p_studio, p_assignee, p_assignees, p_reporter)
    when 'executive' then iris._sees_ticket(p_department, p_departments, p_studio, p_assignee, p_assignees, p_reporter)
    else false
  end
$$;

create or replace function iris.can_access_ticket(p_department text, p_studio text, p_assignee text, p_reporter text)
returns boolean language sql stable as $$
  select iris.can_access_ticket_multi(p_department, null, p_studio, p_assignee, null, p_reporter)
$$;
