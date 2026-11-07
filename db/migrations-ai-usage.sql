-- AI usage ledger: one row per Claude API call made by the IRIS assistant.
create table if not exists iris.ai_usage (
  id                 bigserial primary key,
  user_id            uuid references iris.users(id) on delete set null,
  model              text not null,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cache_read_tokens  integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd           numeric(12, 6) not null default 0,
  created_at         timestamptz not null default now()
);
create index if not exists idx_ai_usage_created on iris.ai_usage(created_at desc);

alter table iris.ai_usage enable row level security;
grant select, insert on iris.ai_usage to iris_app;
grant usage on sequence iris.ai_usage_id_seq to iris_app;
drop policy if exists p_read on iris.ai_usage;
drop policy if exists p_insert on iris.ai_usage;
-- Everyone signed in sees org-wide spend (it's shown in the assistant sidebar); rows are written for yourself only.
create policy p_read on iris.ai_usage for select to iris_app using (iris.is_signed_in());
create policy p_insert on iris.ai_usage for insert to iris_app with check (user_id = iris.current_user_id());
