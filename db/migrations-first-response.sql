-- ============================================================================
-- First-response tracking.
--
-- first_response_at was only stamped by a comment, and nobody comments: owners
-- move tickets on by changing status. So every ticket had a null first response
-- and response-time SLAs could not be measured.
--
-- A first response is now the earliest of:
--   * a comment by anyone other than the person who raised the ticket, or
--   * a person (not a system job) moving the ticket out of `open`.
-- Stamped once, never overwritten. History is not backfilled: the old tickets
-- carry no record of when someone first acted, and inventing one would be wrong.
-- Re-runnable.
-- ============================================================================

create or replace function iris.stamp_first_response()
returns trigger language plpgsql security definer set search_path = iris, public as $$
begin
  update iris.tickets t set first_response_at = new.created_at
   where t.id = new.ticket_id
     and t.first_response_at is null
     and new.author_user_id is not null
     and new.author_user_id is distinct from t.created_by_user_id;
  return new;
end $$;

create or replace function iris.stamp_first_response_on_status()
returns trigger language plpgsql as $$
begin
  if new.first_response_at is null
     and old.status = 'open' and new.status <> 'open'
     and iris.current_user_id() is not null then
    new.first_response_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_first_response_status on iris.tickets;
create trigger trg_first_response_status
  before update of status on iris.tickets
  for each row execute function iris.stamp_first_response_on_status();
