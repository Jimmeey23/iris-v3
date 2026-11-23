-- Auth hardening (idempotent; run after migrations-auth-v2.sql).
--  1. validate_session: sliding expiry capped at 30 days from session creation.
--  2. login: a locked account answers exactly like a wrong password (zero rows),
--     so the lock time is never disclosed to the caller.

create or replace function iris.validate_session(p_token text)
returns table (user_id uuid, email text, role text, employee_id text, must_change_password boolean)
language plpgsql security definer set search_path = iris, public as $$
#variable_conflict use_column
begin
  return query
    update iris.sessions s set
      last_seen_at = now(),
      expires_at = least(
        greatest(s.expires_at, now() + interval '7 days'),
        s.created_at + interval '30 days')
    from iris.users u
    where s.token_hash = iris.hash_token(p_token)
      and s.revoked_at is null and s.expires_at > now()
      and s.created_at > now() - interval '30 days'
      and u.id = s.user_id and u.is_active
    returning u.id, u.email::text, u.role, u.employee_id, u.must_change_password;
end $$;

create or replace function iris.login(
  p_email text, p_password text, p_ip inet default null, p_user_agent text default null)
returns table (
  session_token text, user_id uuid, email text, role text, employee_id text,
  employee_name text, must_change_password boolean, first_login boolean)
language plpgsql security definer set search_path = iris, public as $$
#variable_conflict use_column
declare
  u iris.users;
begin
  select * into u from iris.users
   where iris.users.email = p_email::citext
      or (position('@' in p_email) = 0 and iris.users.username = p_email::citext)
   limit 1;

  if not found or not u.is_active then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;
  if u.locked_until is not null and u.locked_until > now() then
    -- Indistinguishable from a wrong password; the attempt is not counted further.
    return;
  end if;
  if crypt(p_password, u.password_hash) is distinct from u.password_hash then
    update iris.users set
      failed_login_count = failed_login_count + 1,
      locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' end
    where id = u.id;
    insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
    values (u.id, 'login_failed', 'users', u.id::text, p_ip);
    return;
  end if;

  return query select * from iris.issue_session(u.id, p_ip, p_user_agent, 'login');
end $$;
