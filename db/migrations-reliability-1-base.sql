-- Reliability hardening, ported from iris-ai-v2.
-- Additive and idempotent: safe to run on any database that already has
-- iris-neon-complete.sql and the earlier db/migrations-*.sql files applied.
--
-- What this adds:
--   1. iris.outbox      — persistent mail queue with exponential-backoff retries.
--                         A Mailtrap outage delays mail instead of losing it.
--   2. iris.rate_limits — fixed-window request counters (database-backed, so the
--                         limit holds across serverless instances and restarts).
--   3. tickets.idempotency_key — one-shot guard for POST /api/tickets (Idempotency-Key
--                         header); a double submit or a retried request files one ticket.
--   4. email_log gains the 'queued' status (row claimed, delivery owned by the outbox).
--   5. ops.* app_settings defaults for the sweeps (escalation, outbox cadence).

-- ---------------------------------------------------------------------------
-- 1. Outbox
-- ---------------------------------------------------------------------------
create table if not exists iris.outbox (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'email' check (kind in ('email')),
  status          text not null default 'pending'
                  check (status in ('pending', 'sending', 'sent', 'failed')),
  -- { "to": "...", "subject": "...", "html": "...", "text": "..." }
  payload         jsonb not null,
  attempts        integer not null default 0,
  -- Due time for 'pending' rows; while 'sending' it doubles as the lease after
  -- which a crashed worker's claim is released (see releaseStuckOutbox).
  next_attempt_at timestamptz default now(),
  last_error      text,
  -- Linked idempotency/audit row; updated when delivery settles.
  email_log_id    uuid references iris.email_log(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_outbox_due     on iris.outbox(status, next_attempt_at);
create index if not exists idx_outbox_created on iris.outbox(created_at desc);

alter table iris.outbox enable row level security;
do $$ begin
  create policy p_admin_read on iris.outbox for select to iris_app using (iris.is_admin());
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Rate limits (fixed-window counters)
-- ---------------------------------------------------------------------------
create table if not exists iris.rate_limits (
  key          text primary key,   -- '<bucket>:<identity>' e.g. 'login:1.2.3.4|a@b.com'
  count        integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_rate_limits_window on iris.rate_limits(window_start);

-- No RLS on purpose: counters are written by the server as the database owner on
-- behalf of anonymous as well as signed-in callers; there is no user-owned row.

-- ---------------------------------------------------------------------------
-- 3. Ticket-creation idempotency
-- ---------------------------------------------------------------------------
alter table iris.tickets add column if not exists idempotency_key text;
-- One key per creator: a retried or double-submitted POST returns the first ticket.
create unique index if not exists uq_tickets_idempotency
  on iris.tickets(created_by_user_id, idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- 4. email_log: the outbox owns delivery once a row is queued
-- ---------------------------------------------------------------------------
alter table iris.email_log drop constraint if exists email_log_status_check;
alter table iris.email_log add constraint email_log_status_check
  check (status in ('pending', 'queued', 'sent', 'failed', 'dry_run', 'skipped'));

-- ---------------------------------------------------------------------------
-- 5. Ops settings (defaults only — existing admin edits are never overwritten)
-- ---------------------------------------------------------------------------
insert into iris.app_settings (key, value, description, category) values
  ('ops.sweeps_enabled', 'true',
   'Master switch for the request-driven sweeps (SLA, escalation, outbox drain).',
   'ops'),
  ('ops.escalate_after_breach_hours', '4',
   'Hours after the SLA resolution target past which a breached, unresolved ticket is escalated to the owner''s reporting manager.',
   'ops'),
  ('ops.escalation_max_level', '3',
   'Maximum escalation level per ticket. Level 1 = tier manager, 2 = department head, 3 = admin / escalation order.',
   'ops'),
  ('ops.email_via_outbox', 'true',
   'Queue notification email through iris.outbox with retries. Turn off to send inline (not recommended).',
   'ops'),
  ('ops.ticket_create_limit', '20',
   'Ticket-creation requests allowed per user per minute.',
   'ops')
on conflict (key) do nothing;
