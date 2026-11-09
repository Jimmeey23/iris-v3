-- Who is online and on which page. One row per user, refreshed by a client heartbeat.
create table if not exists iris.user_presence (
  user_id uuid primary key references iris.users(id) on delete cascade,
  view text not null,
  ticket_ref text,
  last_seen timestamptz not null default now()
);
create index if not exists idx_user_presence_seen on iris.user_presence(last_seen);
alter table iris.user_presence enable row level security;
-- Read/write goes through the API with asSystem; no direct app-role access.
