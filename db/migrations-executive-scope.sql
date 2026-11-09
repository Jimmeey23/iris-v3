-- Executive ticket scope: never an empty dashboard.
-- Idempotent; safe to re-run.
--
-- 1. current_department() / current_studios() fall back to the user's own
--    iris.users.department / studio / studios (stored as names) when the user has
--    no linked employee, or the employee row has no department / studios.
--    Names resolve to codes via iris.departments / iris.studios (name or code,
--    case-insensitive). 'Accounts' is an alias for PAY (Payments & Finance).
-- 2. Executives:
--      - always: tickets assigned to / reported by them
--      - with studios: tickets at those studios only (one studio -> that studio only)
--      - with no studios: tickets in their department (primary or secondary)

create or replace function iris.resolve_department_code(p text)
returns text language sql stable security definer set search_path = iris, public as $$
  select d.code from iris.departments d
  where lower(d.code) = lower(trim(p)) or lower(d.name) = lower(trim(p))
     or (lower(trim(p)) in ('accounts', 'finance', 'payments') and d.code = 'PAY')
  order by (lower(d.code) = lower(trim(p)) or lower(d.name) = lower(trim(p))) desc
  limit 1
$$;

create or replace function iris.resolve_studio_codes(p text[])
returns text[] language sql stable security definer set search_path = iris, public as $$
  select coalesce(array_agg(distinct s.code), '{}')
  from unnest(coalesce(p, '{}')) x
  join iris.studios s on lower(s.code) = lower(trim(x)) or lower(s.name) = lower(trim(x))
$$;

create or replace function iris.current_department()
returns text language sql stable security definer set search_path = iris, public as $$
  select coalesce(e.department_code, iris.resolve_department_code(u.department))
  from iris.users u left join iris.employees e on e.id = u.employee_id
  where u.id = iris.current_user_id()
$$;

create or replace function iris.current_studios()
returns text[] language sql stable security definer set search_path = iris, public as $$
  select coalesce((
    select case
      when coalesce(cardinality(e.studio_codes), 0) > 0 then e.studio_codes
      when cardinality(iris.resolve_studio_codes(u.studios)) > 0 then iris.resolve_studio_codes(u.studios)
      else iris.resolve_studio_codes(array_remove(array[u.studio], null))
    end
    from iris.users u left join iris.employees e on e.id = u.employee_id
    where u.id = iris.current_user_id()), '{}')
$$;

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
                       or (cardinality(iris.current_studios()) > 0
                           and p_studio = any(iris.current_studios()))
                       or (cardinality(iris.current_studios()) = 0
                           and (p_department = iris.current_department()
                                or iris.current_department() = any(coalesce(p_departments, '{}'))))
    else false
  end
$$;
