-- ============================================================================
-- In-app product feedback for the developer (ported from IRIS v2).
-- Not the ticket pipeline: no routing, SLA or assignment. Stored here and
-- emailed to the developer through the outbox. Re-runnable.
-- ============================================================================
create table if not exists iris.product_feedback (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,                      -- FB-0001
  user_id       uuid references iris.users(id) on delete set null,
  reporter_name text,
  reporter_email text,
  kind          text not null check (kind in ('bug','visual','performance','idea','content','other')),
  severity      text not null check (severity in ('blocker','high','normal','low')),
  title         text not null,
  description   text not null,
  context       jsonb not null default '{}',                -- view, url, viewport, browser, app version
  screenshot    bytea,
  screenshot_type text,
  status        text not null default 'new' check (status in ('new','acknowledged','fixed','wont_fix')),
  email_status  text,
  created_at    timestamptz not null default now()
);
create sequence if not exists iris.product_feedback_seq;

alter table iris.product_feedback enable row level security;
drop policy if exists p_insert on iris.product_feedback;
create policy p_insert on iris.product_feedback for insert with check (user_id = iris.current_user_id());
drop policy if exists p_read on iris.product_feedback;
create policy p_read on iris.product_feedback for select using (user_id = iris.current_user_id() or iris.is_admin());
drop policy if exists p_admin on iris.product_feedback;
create policy p_admin on iris.product_feedback for update using (iris.is_admin());
grant select, insert, update on iris.product_feedback to iris_app;
grant usage on sequence iris.product_feedback_seq to iris_app;
