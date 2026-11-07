-- Stage-based ticket notifications. Additive and idempotent.
-- Apply: node --env-file=.env -e "..." (see docs in PR) or psql "$NEON_DATABASE_URL" -f db/migrations-notifications.sql

-- 1. Audit + idempotency log. dedupe_key is unique per (event, ticket, recipient, channel, discriminator).
create table if not exists iris.email_log (
  id            uuid primary key default gen_random_uuid(),
  dedupe_key    text not null unique,
  channel       text not null check (channel in ('email', 'in_app')),
  event         text not null,
  ticket_id     text references iris.tickets(id) on delete set null,
  user_id       uuid references iris.users(id) on delete set null,
  recipient     text,
  subject       text,
  status        text not null default 'pending'
                check (status in ('pending', 'sent', 'failed', 'dry_run', 'skipped')),
  provider      text,
  provider_id   text,
  error         text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index if not exists idx_email_log_ticket on iris.email_log(ticket_id, created_at desc);
create index if not exists idx_email_log_status on iris.email_log(status, created_at desc);

alter table iris.email_log enable row level security;
do $$ begin
  create policy p_admin_read on iris.email_log for select to iris_app using (iris.is_admin());
exception when duplicate_object then null; end $$;

-- 2. Default rules for the stages the app now emits. Existing rows (and admin edits) are never touched.
insert into iris.notification_rules (event, in_app, email, whatsapp) values
  ('Ticket created',    true, true,  false),
  ('Ticket assigned',   true, true,  false),
  ('Ticket in progress',true, false, false),
  ('Awaiting response', true, true,  false),
  ('Ticket resolved',   true, true,  false),
  ('Ticket closed',     true, false, false),
  ('Ticket reopened',   true, true,  false),
  ('New comment',       true, false, false),
  ('Ticket escalated',  true, true,  false),
  ('SLA approaching',   true, true,  false),
  ('SLA breached',      true, true,  false)
on conflict (event) do nothing;
