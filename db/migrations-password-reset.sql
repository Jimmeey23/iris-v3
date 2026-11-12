-- Self-service password reset ("Forgot password?" on the sign-in screen).
-- The token is emailed by the API; only its hash is stored. Single use, 30 minutes.

create or replace function iris.request_password_reset(p_email text, p_ip inet default null)
returns table (token text, email text, name text)
language plpgsql security definer set search_path = iris, public as $$
#variable_conflict use_column
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  u iris.users;
begin
  select * into u from iris.users
   where iris.users.email = p_email::citext
      or (position('@' in p_email) = 0 and iris.users.username = p_email::citext)
   limit 1;
  if not found or not u.is_active then return; end if;   -- the API never reveals which
  update iris.users set reset_token_hash = iris.hash_token(v_token),
                        reset_token_expires_at = now() + interval '30 minutes'
   where id = u.id;
  insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
  values (u.id, 'password_reset_requested', 'users', u.id::text, p_ip);
  return query
    select v_token, u.email::text, coalesce(e.name, u.name)
      from (select 1) one left join iris.employees e on e.id = u.employee_id;
end $$;

-- Sets the password, burns the token, clears any lockout and revokes every session.
-- Returns the account email (so the API can sign the person in), or null if the
-- link is invalid, used or expired.
create or replace function iris.reset_password_with_token(p_token text, p_new_password text, p_ip inet default null)
returns text language plpgsql security definer set search_path = iris, public as $$
declare v_id uuid; v_email text;
begin
  if length(coalesce(p_new_password, '')) < 10 then
    raise exception 'Password must be at least 10 characters' using errcode = '22023';
  end if;
  update iris.users set
    password_hash = crypt(p_new_password, gen_salt('bf', 10)),
    reset_token_hash = null, reset_token_expires_at = null, must_change_password = false,
    failed_login_count = 0, locked_until = null
  where reset_token_hash = iris.hash_token(p_token) and reset_token_expires_at > now() and is_active
  returning id, email::text into v_id, v_email;
  if v_id is null then return null; end if;
  update iris.sessions set revoked_at = now() where user_id = v_id and revoked_at is null;
  insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
  values (v_id, 'password_reset_completed', 'users', v_id::text, p_ip);
  return v_email;
end $$;

drop function if exists iris.request_password_reset(text);

revoke all on function iris.request_password_reset(text, inet) from public;
revoke all on function iris.reset_password_with_token(text, text, inet) from public;
grant execute on function iris.request_password_reset(text, inet) to iris_app;
grant execute on function iris.reset_password_with_token(text, text, inet) to iris_app;
