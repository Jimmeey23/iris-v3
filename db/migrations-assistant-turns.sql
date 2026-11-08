-- ============================================================================
-- Which path answered each assistant turn, so "answered without AI" is a real
-- number. route: rules (client router), kb, history, stats, equipment, trainer,
-- intake (classified into a form), ai (full agent, tokens spent).
-- Re-runnable.
-- ============================================================================
create table if not exists iris.assistant_turns (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references iris.users(id) on delete cascade,
  route      text not null check (route in ('rules','kb','history','stats','equipment','trainer','intake','ai')),
  rule       text,
  escalated  boolean not null default false,   -- the person pressed "Ask AI instead"
  created_at timestamptz not null default now()
);
create index if not exists assistant_turns_created_idx on iris.assistant_turns (created_at);

alter table iris.assistant_turns enable row level security;
drop policy if exists p_own_insert on iris.assistant_turns;
create policy p_own_insert on iris.assistant_turns for insert with check (user_id = iris.current_user_id());
drop policy if exists p_read on iris.assistant_turns;
create policy p_read on iris.assistant_turns for select using (user_id = iris.current_user_id() or iris.is_admin());
grant select, insert on iris.assistant_turns to iris_app;
