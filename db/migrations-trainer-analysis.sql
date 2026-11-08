-- Cached AI wording of a trainer's executive analysis. One row per trainer; reused until
-- the evidence signature changes (new assessment or feedback), so opening a report costs
-- no AI call. Admin-only (Trainer data is admin-only). Re-runnable.
create table if not exists iris.trainer_analysis (
  trainer_name text primary key,
  signature    text not null,
  analysis     jsonb not null,
  engine       text not null,
  updated_at   timestamptz not null default now()
);
alter table iris.trainer_analysis enable row level security;
drop policy if exists p_admin on iris.trainer_analysis;
create policy p_admin on iris.trainer_analysis for all to iris_app using (iris.is_admin()) with check (iris.is_admin());
grant select, insert, update on iris.trainer_analysis to iris_app;
