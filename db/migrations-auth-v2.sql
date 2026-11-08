-- ============================================================================
-- Auth parity with IRIS v2, on Neon.
--
-- v2 signed people in through Supabase Auth and kept the workspace profile in
-- app_users. This brings the same rules into the iris schema:
--   * sign in with email OR username + password (bcrypt, same hash format as
--     Supabase, so imported passwords keep working);
--   * sign in with Google: link by Google subject, else adopt an invited row by
--     verified email, else self-provision as an executive when the address is
--     allow-listed AND belongs to an active employee;
--   * the profile fields v2 carried (name, username, avatar, department,
--     studio, studios covered, reporting manager).
--
-- Re-runnable: every statement is idempotent.
-- ============================================================================

alter table iris.users add column if not exists name              text;
alter table iris.users add column if not exists username          citext;
alter table iris.users add column if not exists avatar_url        text;
alter table iris.users add column if not exists google_sub        text;
alter table iris.users add column if not exists department        text;
alter table iris.users add column if not exists studio            text;
alter table iris.users add column if not exists studios           text[] not null default '{}';
alter table iris.users add column if not exists reporting_manager text;
alter table iris.users add column if not exists v2_user_id        integer;
alter table iris.users add column if not exists auth_provider     text not null default 'password';

create unique index if not exists users_username_key   on iris.users (username) where username is not null;
create unique index if not exists users_google_sub_key on iris.users (google_sub) where google_sub is not null;
create unique index if not exists users_v2_user_id_key on iris.users (v2_user_id) where v2_user_id is not null;

-- ---------------------------------------------------------------------------
-- Session issue, shared by password and Google sign-in.
-- ---------------------------------------------------------------------------
create or replace function iris.issue_session(p_user_id uuid, p_ip inet, p_user_agent text, p_action text)
returns table (
  session_token text, user_id uuid, email text, role text, employee_id text,
  employee_name text, must_change_password boolean, first_login boolean)
language plpgsql security definer set search_path = iris, public as $$
#variable_conflict use_column
declare
  u iris.users;
  v_token text;
  v_first boolean;
begin
  select * into u from iris.users where id = p_user_id;
  v_first := u.first_login_at is null;
  update iris.users set
    last_login_at = now(), first_login_at = coalesce(first_login_at, now()),
    failed_login_count = 0, locked_until = null
  where id = u.id;

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into iris.sessions (user_id, token_hash, ip_address, user_agent)
  values (u.id, iris.hash_token(v_token), p_ip, p_user_agent);

  insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
  values (u.id, p_action, 'users', u.id::text, p_ip);

  return query
    select v_token, u.id, u.email::text, u.role, u.employee_id,
           coalesce(e.name, u.name), u.must_change_password, v_first
    from (select 1) one
    left join iris.employees e on e.id = u.employee_id;
end $$;

-- ---------------------------------------------------------------------------
-- Password sign-in: email or username.
-- ---------------------------------------------------------------------------
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
    raise exception 'Account locked. Try again after %', to_char(u.locked_until, 'HH24:MI')
      using errcode = '28P01';
  end if;
  if crypt(p_password, u.password_hash) is distinct from u.password_hash then
    update iris.users set
      failed_login_count = failed_login_count + 1,
      locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' end
    where id = u.id;
    insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
    values (u.id, 'login_failed', 'users', u.id::text, p_ip);
    -- Zero rows (no exception) so the failed-attempt counter is committed.
    return;
  end if;

  return query select * from iris.issue_session(u.id, p_ip, p_user_agent, 'login');
end $$;

-- ---------------------------------------------------------------------------
-- Google sign-in. Called only after the server has verified Google's ID token
-- and that the email is verified. Raises 42501 with a reason code
-- ('not_authorised' | 'inactive') when the person gets no session.
-- ---------------------------------------------------------------------------
create or replace function iris.login_google(
  p_email text, p_sub text, p_name text, p_avatar text,
  p_allowed_domains text[], p_allowed_emails text[],
  p_ip inet default null, p_user_agent text default null)
returns table (
  session_token text, user_id uuid, email text, role text, employee_id text,
  employee_name text, must_change_password boolean, first_login boolean)
language plpgsql security definer set search_path = iris, public as $$
#variable_conflict use_column
declare
  u iris.users;
  v_email citext := lower(p_email)::citext;
  v_domain text := split_part(lower(p_email), '@', 2);
  e iris.employees;
begin
  -- 1. Already linked to this Google account.
  select * into u from iris.users where google_sub = p_sub;

  -- 2. An invited / imported row with the same email, not linked to a
  --    different Google account.
  if not found then
    select * into u from iris.users where iris.users.email = v_email and google_sub is null;
    if found then
      update iris.users set google_sub = p_sub,
        avatar_url = coalesce(avatar_url, p_avatar),
        name = coalesce(name, p_name)
      where id = u.id returning * into u;
    end if;
  end if;

  -- 3. Self-provision: allow-listed address or domain, and an active employee.
  if u.id is null then
    if not (lower(p_email) = any(p_allowed_emails) or v_domain = any(p_allowed_domains)) then
      raise exception 'not_authorised' using errcode = '42501';
    end if;
    if exists (select 1 from iris.users where iris.users.email = v_email) then
      -- Same email already linked to another Google subject: never relink.
      raise exception 'not_authorised' using errcode = '42501';
    end if;
    select * into e from iris.employees
     where lower(iris.employees.email) = lower(p_email) and is_active limit 1;
    if not found then
      raise exception 'not_authorised' using errcode = '42501';
    end if;
    insert into iris.users (email, password_hash, role, employee_id, must_change_password,
                            name, avatar_url, google_sub, department, studio, studios,
                            reporting_manager, auth_provider)
    values (v_email, crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf', 10)), 'executive',
            case when exists (select 1 from iris.users x where x.employee_id = e.id) then null else e.id end,
            false, e.name, p_avatar, p_sub, e.department_code, e.location,
            coalesce(e.studio_codes, '{}'), e.reporting_manager, 'google')
    returning * into u;
    insert into iris.user_preferences (user_id) values (u.id) on conflict do nothing;
  end if;

  if not u.is_active then
    raise exception 'inactive' using errcode = '42501';
  end if;
  return query select * from iris.issue_session(u.id, p_ip, p_user_agent, 'login_google');
end $$;

-- Only the API's owner connection calls these (asSystem), never iris_app.
revoke all on function iris.issue_session(uuid, inet, text, text) from public;
revoke all on function iris.login_google(text, text, text, text, text[], text[], inet, text) from public;
