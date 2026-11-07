-- ============================================================================
-- IRIS — Complete Neon Postgres setup
-- Schema · auth · 3-tier access control · auto-save triggers · audit · seed data
-- ============================================================================
--
-- WHAT THIS DOES
--   Creates everything inside a dedicated Postgres schema named `iris`.
--   Your existing tables in `public` (departments, tickets, staff, app_users,
--   app_settings, integrations, ...) are NOT touched, renamed or dropped.
--
-- HOW TO RUN
--   Neon console -> SQL Editor -> paste this whole file -> Run.
--   Or:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f iris-neon-complete.sql
--   It runs in a single transaction: either everything is created, or nothing.
--   It is idempotent: re-running updates functions/policies and upserts the
--   seed data without duplicating rows.
--
-- AFTER RUNNING
--   First login:  jimmeey@physique57india.com / ChangeMe@2026
--   The account is flagged must_change_password = true; the app must force a
--   password change via iris.change_password() before anything else.
--
-- HOW THE APP USES IT (per request, inside one transaction)
--   1. select * from iris.validate_session('<token from http-only cookie>');
--   2. select iris.set_current_user('<user id>');   -- sets app.current_user_id
--   3. set local role iris_app;                      -- RLS now enforced
--   4. run queries against iris.*
--   The default Neon owner role BYPASSES row-level security, so step 3 is what
--   makes the admin / manager / executive rules actually apply.
-- ============================================================================

begin;

-- ============================================================================
-- 0. EXTENSIONS, SCHEMA, APP ROLE
-- ============================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid, crypt, digest
create extension if not exists citext;     -- case-insensitive emails
create extension if not exists pg_trgm;    -- fuzzy search

create schema if not exists iris;
set local search_path = iris, public;

-- Role the API switches to (SET LOCAL ROLE iris_app) so RLS is enforced.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'iris_app') then
    create role iris_app nologin;
  end if;
end $$;
grant iris_app to current_user;
grant usage on schema iris to iris_app;


-- ============================================================================
-- 1. HELPERS
-- ============================================================================

-- array_to_string is only STABLE; generated columns need IMMUTABLE.
create or replace function iris.immutable_array_to_string(text[], text)
returns text language sql immutable parallel safe as
$$ select array_to_string($1, $2) $$;

-- Auto-save: every UPDATE stamps updated_at.
create or replace function iris.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;


-- ============================================================================
-- 2. REFERENCE TABLES — studios, departments, employees, members
-- ============================================================================

create table if not exists iris.studios (
  id                  text primary key,
  code                text not null unique,
  name                text not null,
  city                text not null check (city in ('Mumbai', 'Bengaluru')),
  address             text,
  momence_location_id integer,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists iris.departments (
  id               text primary key,
  code             text not null unique,
  name             text not null,
  description      text,
  head_employee_id text,                      -- FK added after employees
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists iris.employees (
  id                text primary key default ('emp_' || replace(gen_random_uuid()::text, '-', '')),
  employee_code     text not null unique,
  name              text not null,
  email             citext not null unique,
  phone             text,
  role              text not null,
  title             text,
  department_code   text not null references iris.departments(code) on update cascade on delete restrict,
  location          text not null default 'India',
  reporting_manager text,
  birthday          text,
  studio_codes      text[] not null default '{}',
  skills            text[] not null default '{}',
  availability      text not null default 'available'
                    check (availability in ('available', 'busy', 'offline', 'on_leave')),
  workload          integer not null default 0 check (workload >= 0),
  max_workload      integer not null default 12 check (max_workload > 0),
  escalation_order  integer not null default 3,  -- 0 owner, 1 director, 2 manager, 3 exec
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_employees_dept on iris.employees(department_code);
create index if not exists idx_employees_studios on iris.employees using gin (studio_codes);

do $$ begin
  alter table iris.departments
    add constraint departments_head_employee_fkey
    foreign key (head_employee_id) references iris.employees(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists iris.members (
  id             text primary key,               -- Momence id, e.g. 'MM-89342'
  name           text not null,
  email          citext unique,
  phone          text,
  membership     text,
  credits        integer not null default 0,
  join_date      date,
  city           text check (city in ('Mumbai', 'Bengaluru')),
  tags           text[] not null default '{}',
  avatar_color   text,
  risk_level     text default 'low' check (risk_level in ('high', 'medium', 'low')),
  risk_reason    text,
  momence_raw    jsonb,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_members_name_trgm on iris.members using gin (name gin_trgm_ops);
create index if not exists idx_members_phone on iris.members(phone);


-- ============================================================================
-- 3. AUTH — users, sessions
-- ============================================================================

create table if not exists iris.users (
  id                     uuid primary key default gen_random_uuid(),
  email                  citext not null unique,
  password_hash          text not null,                -- bcrypt
  role                   text not null default 'executive'
                         check (role in ('admin', 'manager', 'executive')),
  employee_id            text unique references iris.employees(id) on delete set null,
  is_active              boolean not null default true,
  must_change_password   boolean not null default false,
  failed_login_count     integer not null default 0,
  locked_until           timestamptz,
  first_login_at         timestamptz,
  last_login_at          timestamptz,
  reset_token_hash       text,
  reset_token_expires_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists iris.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references iris.users(id) on delete cascade,
  token_hash   text not null unique,                   -- sha256 hex; raw token never stored
  ip_address   inet,
  user_agent   text,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sessions_user on iris.sessions(user_id) where revoked_at is null;


-- ============================================================================
-- 4. SLA DEFINITIONS
-- ============================================================================

create table if not exists iris.sla_definitions (
  priority                  text primary key check (priority in ('P0', 'P1', 'P2', 'P3')),
  name                      text not null,
  description               text not null,
  response_target_mins      integer not null check (response_target_mins > 0),
  resolution_target_mins    integer not null check (resolution_target_mins > 0),
  escalation_threshold_mins integer not null check (escalation_threshold_mins > 0),
  business_hours_only       boolean not null default false,
  auto_actions              jsonb not null default '[]',
  escalation_rules          jsonb not null default '[]',
  resolution_rules          jsonb not null default '[]',
  triggers                  jsonb not null default '[]',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);


-- ============================================================================
-- 5. AI CONVERSATIONS (before tickets, which reference them)
-- ============================================================================

create table if not exists iris.conversations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references iris.users(id) on delete cascade,
  user_name      text not null default '',
  stage          text not null default 'greeting'
                 check (stage in ('greeting', 'intent_captured', 'collecting', 'investigating', 'ready', 'created')),
  state          jsonb not null default '{}',
  intent         jsonb not null default '{}',
  collected_info jsonb not null default '{}',
  ticket_id      text,                            -- FK added after tickets
  is_archived    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_conversations_user on iris.conversations(user_id, created_at desc);

create table if not exists iris.conversation_messages (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid not null references iris.conversations(id) on delete cascade,
  role                 text not null check (role in ('user', 'assistant', 'system')),
  content              text not null default '',
  variant              text not null default 'default',
  buttons              jsonb not null default '[]',
  input_type           text,
  ticket_preview       jsonb,
  tools                jsonb not null default '[]',
  agent_activity       jsonb not null default '[]',
  metadata             jsonb not null default '{}',
  thinking_duration_ms integer,
  created_at           timestamptz not null default now()
);
create index if not exists idx_messages_conversation on iris.conversation_messages(conversation_id, created_at);


-- ============================================================================
-- 6. TICKETS + CHILD TABLES
-- ============================================================================

create sequence if not exists iris.ticket_number_seq;

create table if not exists iris.tickets (
  id                     text primary key default ('tkt_' || replace(gen_random_uuid()::text, '-', '')),
  ticket_id              text not null unique,         -- 'IRIS-2026-0142' (trigger fills if null)
  title                  text not null,
  description            text not null default '',
  category               text not null,
  subcategory            text,
  priority               text not null default 'P2' check (priority in ('P0', 'P1', 'P2', 'P3')),
  status                 text not null default 'open'
                         check (status in ('open', 'in_progress', 'awaiting_response', 'resolved', 'closed', 'escalated')),
  studio_code            text references iris.studios(code) on update cascade on delete set null,
  department_code        text references iris.departments(code) on update cascade on delete set null,
  assignee_id            text references iris.employees(id) on delete set null,
  reporter_id            text references iris.employees(id) on delete set null,
  affected_client        text,
  client_momence_id      text,                          -- not FK: Momence ids may not be synced yet
  membership_id          text,
  booking_id             text,
  equipment              text,
  business_impact        text,
  operational_impact     text,
  severity               text,
  resolution             text,
  resolution_summary     text,
  investigation_notes    text,
  recommended_resolution text,
  attachments            text[] not null default '{}',
  related_ticket_ids     text[] not null default '{}',
  tags                   text[] not null default '{}',
  sla_status             text not null default 'on_track'
                         check (sla_status in ('on_track', 'at_risk', 'breached', 'paused')),
  sla_response_target    timestamptz,
  sla_resolution_target  timestamptz,
  first_response_at      timestamptz,
  resolved_at            timestamptz,
  escalation_level       integer not null default 0,
  source                 text not null default 'manual'
                         check (source in ('manual', 'ai_assistant', 'email', 'webhook', 'form_intake', 'voice')),
  conversation_id        uuid references iris.conversations(id) on delete set null,
  collected_info         jsonb not null default '{}',
  metadata               jsonb not null default '{}',
  created_by_user_id     uuid references iris.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  search_vector          tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' ||
      coalesce(category, '') || ' ' || coalesce(subcategory, '') || ' ' ||
      coalesce(affected_client, '') || ' ' || coalesce(ticket_id, '') || ' ' ||
      coalesce(iris.immutable_array_to_string(tags, ' '), ''))
  ) stored
);
create index if not exists idx_tickets_status      on iris.tickets(status);
create index if not exists idx_tickets_priority    on iris.tickets(priority);
create index if not exists idx_tickets_sla_status  on iris.tickets(sla_status);
create index if not exists idx_tickets_assignee    on iris.tickets(assignee_id, status);
create index if not exists idx_tickets_department  on iris.tickets(department_code);
create index if not exists idx_tickets_studio      on iris.tickets(studio_code);
create index if not exists idx_tickets_created_at  on iris.tickets(created_at desc);
create index if not exists idx_tickets_category    on iris.tickets(category);
create index if not exists idx_tickets_search      on iris.tickets using gin (search_vector);
create index if not exists idx_tickets_title_trgm  on iris.tickets using gin (title gin_trgm_ops);
create index if not exists idx_tickets_tags        on iris.tickets using gin (tags);
create index if not exists idx_tickets_open        on iris.tickets(priority, created_at desc)
  where status not in ('resolved', 'closed');

do $$ begin
  alter table iris.conversations
    add constraint conversations_ticket_fkey
    foreign key (ticket_id) references iris.tickets(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists iris.ticket_activities (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     text not null references iris.tickets(id) on delete cascade,
  activity_type text not null,                    -- created, assigned, status_changed, comment, ...
  description   text not null,
  actor_user_id uuid references iris.users(id) on delete set null,
  actor_name    text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists idx_activities_ticket on iris.ticket_activities(ticket_id, created_at desc);
-- Lets the seed upsert activities idempotently.
create unique index if not exists uq_activities_seed
  on iris.ticket_activities(ticket_id, activity_type, created_at, description);

create table if not exists iris.ticket_comments (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         text not null references iris.tickets(id) on delete cascade,
  author_user_id    uuid references iris.users(id) on delete set null,
  author_name       text not null,
  content           text not null,
  is_internal       boolean not null default false,
  parent_comment_id uuid references iris.ticket_comments(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_comments_ticket on iris.ticket_comments(ticket_id, created_at);
create unique index if not exists uq_comments_seed
  on iris.ticket_comments(ticket_id, author_name, created_at);

create table if not exists iris.ticket_attachments (
  id                  uuid primary key default gen_random_uuid(),
  ticket_id           text not null references iris.tickets(id) on delete cascade,
  storage_path        text not null,              -- R2 / S3 key or URL (Neon has no file storage)
  file_name           text not null,
  file_size           bigint not null,
  mime_type           text not null,
  uploaded_by_user_id uuid references iris.users(id) on delete set null,
  uploaded_by_name    text,
  thumbnail_url       text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_attachments_ticket on iris.ticket_attachments(ticket_id);

create table if not exists iris.ticket_resolutions (
  id                  uuid primary key default gen_random_uuid(),
  ticket_id           text not null references iris.tickets(id) on delete cascade,
  resolution_note     text not null,
  actions_taken       text,
  resolution_type     text check (resolution_type in ('manual', 'auto', 'system_action')),
  resolved_by_user_id uuid references iris.users(id) on delete set null,
  resolved_by_name    text,
  quality_verified    boolean not null default false,
  quality_verified_by uuid references iris.users(id) on delete set null,
  quality_verified_at timestamptz,
  reopened            boolean not null default false,
  reopened_at         timestamptz,
  reopen_reason       text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_resolutions_ticket on iris.ticket_resolutions(ticket_id);

create table if not exists iris.sla_trigger_log (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      text not null references iris.tickets(id) on delete cascade,
  trigger_event  text not null,
  trigger_action text not null,
  metadata       jsonb not null default '{}',
  fired_at       timestamptz not null default now()
);
create index if not exists idx_sla_log_ticket on iris.sla_trigger_log(ticket_id, fired_at desc);

create table if not exists iris.escalation_log (
  id                       uuid primary key default gen_random_uuid(),
  ticket_id                text not null references iris.tickets(id) on delete cascade,
  escalation_level         integer not null,
  escalated_to_role        text not null,
  escalated_to_employee_id text references iris.employees(id) on delete set null,
  reason                   text not null,
  rule_id                  text,
  automatic                boolean not null default true,
  escalated_by_user_id     uuid references iris.users(id) on delete set null,
  escalated_at             timestamptz not null default now()
);
create index if not exists idx_escalation_ticket on iris.escalation_log(ticket_id, escalated_at desc);


-- ============================================================================
-- 7. TEMPLATES + KNOWLEDGE BASE
-- ============================================================================

create table if not exists iris.templates (
  code                       text primary key,
  title                      text not null,
  description                text not null default '',
  category                   text not null,
  subcategory                text,
  department_code            text references iris.departments(code) on update cascade on delete set null,
  default_priority           text not null default 'P2' check (default_priority in ('P0', 'P1', 'P2', 'P3')),
  default_severity           text,
  suggested_assignee_role    text,
  required_fields            text[] not null default '{}',
  conditional_fields         jsonb not null default '[]',
  custom_fields              jsonb not null default '[]',
  prefilled_options          jsonb not null default '[]',
  recommended_actions        text not null default '',
  estimated_resolution_hours integer not null default 24,
  is_active                  boolean not null default true,
  version                    integer not null default 1,
  created_by_user_id         uuid references iris.users(id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index if not exists idx_templates_category on iris.templates(category);
create index if not exists idx_templates_title_trgm on iris.templates using gin (title gin_trgm_ops);

create table if not exists iris.knowledge_articles (
  id                text primary key,
  title             text not null,
  category          text not null,
  summary           text not null default '',
  steps             jsonb not null default '[]',
  prevention        text,
  escalation        text,
  related_templates text[] not null default '{}',
  author_user_id    uuid references iris.users(id) on delete set null,
  is_published      boolean not null default true,
  version           integer not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  search_vector     tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(category, '') || ' ' ||
      coalesce(prevention, '') || ' ' || coalesce(escalation, ''))
  ) stored
);
create index if not exists idx_kb_search on iris.knowledge_articles using gin (search_vector);


-- ============================================================================
-- 8. TRAINERS + ASSESSMENTS + FEEDBACK
-- ============================================================================

create table if not exists iris.trainers (
  id               text primary key,
  name             text not null unique,
  display_name     text,
  city             text not null default 'Mumbai' check (city in ('Mumbai', 'Bengaluru')),
  primary_studio   text references iris.studios(code) on update cascade on delete set null,
  studio_summary   jsonb not null default '[]',
  total_tickets    integer not null default 0,
  assessment_count integer not null default 0,
  feedback_count   integer not null default 0,
  compliment_count integer not null default 0,
  issue_count      integer not null default 0,
  avg_score        integer,
  band             text,
  band_tone        text,
  aliases          jsonb not null default '{}',
  is_hidden        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists iris.trainer_assessments (
  id            uuid primary key default gen_random_uuid(),
  source_ref    text not null unique,             -- Fillout / Zite submission id
  trainer_id    text references iris.trainers(id) on delete set null,
  trainer_name  text not null,
  ticket_number text,
  studio        text,
  submitted_at  timestamptz,
  score         integer,
  band          text,
  band_tone     text,
  payload       jsonb not null default '{}',      -- rubric, answers, coaching notes
  created_at    timestamptz not null default now()
);
create index if not exists idx_assessments_trainer on iris.trainer_assessments(trainer_id, submitted_at desc);

create table if not exists iris.trainer_feedback (
  id            uuid primary key default gen_random_uuid(),
  source_ref    text unique,
  trainer_id    text references iris.trainers(id) on delete set null,
  trainer_name  text not null,
  ticket_number text,
  title         text not null default '',
  kind          text check (kind in ('compliment', 'issue')),
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists idx_feedback_trainer on iris.trainer_feedback(trainer_id, created_at desc);


-- ============================================================================
-- 9. SETTINGS (everything on the Settings page)
-- ============================================================================

-- Key/value settings: business hours, AI spending, notification channels, ...
create table if not exists iris.app_settings (
  key                text primary key,
  value              jsonb not null,
  description        text,
  category           text not null default 'general',
  is_public          boolean not null default false,
  updated_by_user_id uuid references iris.users(id) on delete set null,
  updated_at         timestamptz not null default now()
);

create table if not exists iris.routing_rules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  condition       text not null,                  -- e.g. 'category=Facilities AND subcategory=HVAC'
  department_code text,                           -- null / 'Any' = keep classifier's choice
  priority        text not null default 'Auto',   -- 'Critical' | 'High' | 'Medium' | 'Low' | 'Auto'
  sort_order      integer not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists iris.ai_models (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,                      -- 'OpenAI' | 'Anthropic'
  model       text not null,
  purpose     text not null,
  temperature numeric(3, 2) not null default 0.7 check (temperature between 0 and 2),
  max_tokens  integer not null default 4096 check (max_tokens > 0),
  is_primary  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (provider, model, purpose)
);
-- At most one primary model.
create unique index if not exists uq_ai_models_primary on iris.ai_models(is_primary) where is_primary;

create table if not exists iris.notification_rules (
  event      text primary key,                    -- 'Ticket assigned', 'SLA breached', ...
  in_app     boolean not null default true,
  email      boolean not null default false,
  whatsapp   boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists iris.roles (
  name        text primary key,                   -- display role, e.g. 'Operations Manager'
  access_tier text not null default 'executive'
              check (access_tier in ('admin', 'manager', 'executive')),
  permissions text[] not null default '{}',
  color       text,
  updated_at  timestamptz not null default now()
);

create table if not exists iris.integrations (
  id                 text primary key,            -- 'momence', 'openai', ...
  name               text not null,
  category           text,
  description        text,
  type               text,
  -- Encrypt in the API (AES-256-GCM with INTEGRATION_ENCRYPTION_KEY) before
  -- storing. Never store plaintext secrets here.
  credentials_enc    text,
  config             jsonb not null default '{}',
  is_enabled         boolean not null default false,
  status             text not null default 'disconnected',
  last_synced_at     timestamptz,
  last_sync_status   text,
  last_sync_error    text,
  sync_interval_mins integer not null default 60,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists iris.webhook_events (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null,
  event_type       text not null,
  payload          jsonb not null,
  headers          jsonb not null default '{}',
  status           text not null default 'received'
                   check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  processed_at     timestamptz,
  processing_error text,
  ticket_id        text references iris.tickets(id) on delete set null,
  received_at      timestamptz not null default now()
);
create index if not exists idx_webhooks_status on iris.webhook_events(status, received_at desc);

create table if not exists iris.user_preferences (
  user_id                uuid primary key references iris.users(id) on delete cascade,
  theme                  text not null default 'system' check (theme in ('light', 'dark', 'system')),
  accent_color           text,                    -- null = random each load
  sidebar_collapsed      boolean not null default false,
  email_notifications    boolean not null default true,
  whatsapp_notifications boolean not null default false,
  push_notifications     boolean not null default true,
  default_view           text not null default 'overview',
  preferences            jsonb not null default '{}',
  updated_at             timestamptz not null default now()
);

create table if not exists iris.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references iris.users(id) on delete cascade,
  type       text not null check (type in ('critical', 'sla', 'escalated', 'assignment', 'comment', 'mention', 'info')),
  title      text not null,
  body       text not null,
  ticket_id  text references iris.tickets(id) on delete cascade,
  priority   text default 'P3',
  is_read    boolean not null default false,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on iris.notifications(user_id, is_read, created_at desc);


-- ============================================================================
-- 10. AUDIT + LOGS + INTELLIGENCE + BACKUPS
-- ============================================================================

create table if not exists iris.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references iris.users(id) on delete set null,
  actor_name    text,
  action        text not null,                    -- 'insert' | 'update' | 'delete' | 'login' | ...
  entity_type   text not null,                    -- table name
  entity_id     text,
  before_state  jsonb,
  after_state   jsonb,
  ip_address    inet,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_entity  on iris.audit_log(entity_type, entity_id);
create index if not exists idx_audit_created on iris.audit_log(created_at desc);

create table if not exists iris.app_logs (
  id          uuid primary key default gen_random_uuid(),
  level       text not null check (level in ('debug', 'info', 'warn', 'error', 'fatal')),
  category    text not null,
  message     text not null,
  details     jsonb not null default '{}',
  user_id     uuid references iris.users(id) on delete set null,
  error_stack text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_logs_created on iris.app_logs(created_at desc);

create table if not exists iris.recurring_patterns (
  id             uuid primary key default gen_random_uuid(),
  pattern_key    text not null unique,
  category       text not null,
  studio_code    text,
  ticket_count   integer not null,
  first_at       timestamptz not null,
  latest_at      timestamptz not null,
  span_days      integer not null,
  severity       text not null check (severity in ('high', 'medium', 'low')),
  recommendation text not null,
  ticket_ids     text[] not null default '{}',
  detected_at    timestamptz not null default now()
);

create table if not exists iris.anomalies (
  id                uuid primary key default gen_random_uuid(),
  type              text not null,
  title             text not null,
  description       text not null,
  severity          text not null check (severity in ('critical', 'warning', 'info')),
  scope_label       text not null,
  scope_value       text not null,
  observed          integer not null,
  baseline          integer not null,
  change_pct        integer not null,
  recommendation    text not null,
  sample_ticket_ids text[] not null default '{}',
  detected_at       timestamptz not null default now()
);

create table if not exists iris.daily_briefings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references iris.users(id) on delete cascade,
  headline     text not null,
  briefing     jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists iris.system_backups (
  id                   uuid primary key default gen_random_uuid(),
  backup_type          text not null,
  status               text not null default 'in_progress'
                       check (status in ('in_progress', 'completed', 'failed', 'restoring', 'restored')),
  storage_path         text not null,
  file_size_bytes      bigint,
  row_count            bigint,
  triggered_by_user_id uuid references iris.users(id) on delete set null,
  started_at           timestamptz not null default now(),
  completed_at         timestamptz,
  error_message        text
);


-- ============================================================================
-- 11. CURRENT-USER CONTEXT + ACCESS HELPERS
-- ============================================================================

create or replace function iris.current_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

create or replace function iris.set_current_user(p_user_id uuid)
returns void language sql as $$
  select set_config('app.current_user_id', coalesce(p_user_id::text, ''), true);
$$;

-- SECURITY DEFINER so policies on iris.users don't recurse into themselves.
create or replace function iris.current_role_tier()
returns text language sql stable security definer set search_path = iris, public as $$
  select coalesce(
    (select role from iris.users where id = iris.current_user_id() and is_active), 'none')
$$;

create or replace function iris.current_employee_id()
returns text language sql stable security definer set search_path = iris, public as $$
  select employee_id from iris.users where id = iris.current_user_id()
$$;

create or replace function iris.current_department()
returns text language sql stable security definer set search_path = iris, public as $$
  select e.department_code from iris.users u join iris.employees e on e.id = u.employee_id
  where u.id = iris.current_user_id()
$$;

create or replace function iris.current_studios()
returns text[] language sql stable security definer set search_path = iris, public as $$
  select coalesce((select e.studio_codes from iris.users u join iris.employees e on e.id = u.employee_id
                   where u.id = iris.current_user_id()), '{}')
$$;

create or replace function iris.is_admin()
returns boolean language sql stable as $$ select iris.current_role_tier() = 'admin' $$;

create or replace function iris.is_manager_or_admin()
returns boolean language sql stable as $$ select iris.current_role_tier() in ('admin', 'manager') $$;

create or replace function iris.is_signed_in()
returns boolean language sql stable as $$ select iris.current_role_tier() <> 'none' $$;

-- 3-tier ticket access:
--   admin     -> everything
--   manager   -> tickets in their department, or assigned to / reported by them
--   executive -> tickets assigned to / reported by them, or at their studios
create or replace function iris.can_access_ticket(
  p_department text, p_studio text, p_assignee text, p_reporter text)
returns boolean language sql stable as $$
  select case iris.current_role_tier()
    when 'admin' then true
    when 'manager' then p_department = iris.current_department()
                     or p_assignee = iris.current_employee_id()
                     or p_reporter = iris.current_employee_id()
    when 'executive' then p_assignee = iris.current_employee_id()
                       or p_reporter = iris.current_employee_id()
                       or p_studio = any(iris.current_studios())
    else false
  end
$$;

create or replace function iris.can_access_ticket_id(p_ticket_id text)
returns boolean language sql stable security definer set search_path = iris, public as $$
  select exists (
    select 1 from iris.tickets t where t.id = p_ticket_id
      and iris.can_access_ticket(t.department_code, t.studio_code, t.assignee_id, t.reporter_id))
$$;


-- ============================================================================
-- 12. AUTH FUNCTIONS
-- ============================================================================

create or replace function iris.hash_token(p_token text)
returns text language sql immutable as $$
  select encode(digest(p_token, 'sha256'), 'hex')
$$;

-- Login. Returns the raw session token ONCE; only its hash is stored.
-- 5 failed attempts lock the account for 15 minutes.
create or replace function iris.login(
  p_email text, p_password text, p_ip inet default null, p_user_agent text default null)
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
  select * into u from iris.users where iris.users.email = p_email::citext;

  if not found or not u.is_active then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;
  if u.locked_until is not null and u.locked_until > now() then
    raise exception 'Account locked. Try again after %', to_char(u.locked_until, 'HH24:MI')
      using errcode = '28P01';
  end if;
  if crypt(p_password, u.password_hash) <> u.password_hash then
    update iris.users set
      failed_login_count = failed_login_count + 1,
      locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' end
    where id = u.id;
    insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
    values (u.id, 'login_failed', 'users', u.id::text, p_ip);
    -- Wrong password returns ZERO rows (no exception) so the failed-attempt
    -- counter is committed. Treat an empty result as "invalid credentials".
    return;
  end if;

  v_first := u.first_login_at is null;
  update iris.users set
    last_login_at = now(), first_login_at = coalesce(first_login_at, now()),
    failed_login_count = 0, locked_until = null
  where id = u.id;

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into iris.sessions (user_id, token_hash, ip_address, user_agent)
  values (u.id, iris.hash_token(v_token), p_ip, p_user_agent);

  insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, ip_address)
  values (u.id, 'login', 'users', u.id::text, p_ip);

  return query
    select v_token, u.id, u.email::text, u.role, u.employee_id, e.name,
           u.must_change_password, v_first
    from (select 1) one
    left join iris.employees e on e.id = u.employee_id;
end $$;

-- Validate a session token on every request. Slides expiry forward.
create or replace function iris.validate_session(p_token text)
returns table (user_id uuid, email text, role text, employee_id text, must_change_password boolean)
language plpgsql security definer set search_path = iris, public as $$
#variable_conflict use_column
begin
  return query
    update iris.sessions s set
      last_seen_at = now(),
      expires_at = greatest(s.expires_at, now() + interval '7 days')
    from iris.users u
    where s.token_hash = iris.hash_token(p_token)
      and s.revoked_at is null and s.expires_at > now()
      and u.id = s.user_id and u.is_active
    returning u.id, u.email::text, u.role, u.employee_id, u.must_change_password;
end $$;

create or replace function iris.logout(p_token text)
returns void language sql security definer set search_path = iris, public as $$
  update iris.sessions set revoked_at = now()
  where token_hash = iris.hash_token(p_token) and revoked_at is null;
$$;

-- Admin-only (or bootstrap when no users exist).
create or replace function iris.create_user(
  p_email text, p_password text, p_role text default 'executive', p_employee_id text default null)
returns uuid language plpgsql security definer set search_path = iris, public as $$
declare v_id uuid;
begin
  if exists (select 1 from iris.users) and not iris.is_admin() then
    raise exception 'Only admins can create users' using errcode = '42501';
  end if;
  if length(p_password) < 10 then
    raise exception 'Password must be at least 10 characters';
  end if;
  insert into iris.users (email, password_hash, role, employee_id, must_change_password)
  values (p_email, crypt(p_password, gen_salt('bf', 10)), p_role, p_employee_id, true)
  returning id into v_id;
  insert into iris.user_preferences (user_id) values (v_id) on conflict do nothing;
  return v_id;
end $$;

-- Self-service (old password required) or admin reset (not required).
-- Revokes all of that user's sessions.
create or replace function iris.change_password(
  p_user_id uuid, p_old_password text, p_new_password text)
returns boolean language plpgsql security definer set search_path = iris, public as $$
declare v_hash text;
begin
  if p_user_id is distinct from iris.current_user_id() and not iris.is_admin() then
    raise exception 'You can only change your own password' using errcode = '42501';
  end if;
  if length(p_new_password) < 10 then
    raise exception 'Password must be at least 10 characters';
  end if;
  select password_hash into v_hash from iris.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;
  if p_user_id = iris.current_user_id() and crypt(p_old_password, v_hash) <> v_hash then
    raise exception 'Current password is incorrect' using errcode = '28P01';
  end if;
  update iris.users set
    password_hash = crypt(p_new_password, gen_salt('bf', 10)), must_change_password = false
  where id = p_user_id;
  update iris.sessions set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  return true;
end $$;

-- Password reset: issue a one-time token (send it by email from the API).
create or replace function iris.request_password_reset(p_email text)
returns text language plpgsql security definer set search_path = iris, public as $$
declare v_token text := encode(gen_random_bytes(24), 'hex');
begin
  update iris.users set reset_token_hash = iris.hash_token(v_token),
                        reset_token_expires_at = now() + interval '1 hour'
  where email = p_email::citext and is_active;
  if not found then return null; end if;   -- API must not reveal whether the email exists
  return v_token;
end $$;

create or replace function iris.reset_password(p_token text, p_new_password text)
returns boolean language plpgsql security definer set search_path = iris, public as $$
declare v_id uuid;
begin
  if length(p_new_password) < 10 then
    raise exception 'Password must be at least 10 characters';
  end if;
  update iris.users set
    password_hash = crypt(p_new_password, gen_salt('bf', 10)),
    reset_token_hash = null, reset_token_expires_at = null, must_change_password = false
  where reset_token_hash = iris.hash_token(p_token) and reset_token_expires_at > now()
  returning id into v_id;
  if v_id is null then return false; end if;
  update iris.sessions set revoked_at = now() where user_id = v_id and revoked_at is null;
  return true;
end $$;

-- Housekeeping: call daily (cron / n8n).
create or replace function iris.purge_expired_sessions()
returns integer language sql security definer set search_path = iris, public as $$
  with d as (delete from iris.sessions
             where expires_at < now() - interval '30 days'
                or revoked_at < now() - interval '30 days' returning 1)
  select count(*)::int from d
$$;


-- ============================================================================
-- 13. AUTO-SAVE HELPERS (one call per edit from the Settings page)
-- ============================================================================

create or replace function iris.save_setting(p_key text, p_value jsonb)
returns iris.app_settings language sql as $$
  insert into iris.app_settings (key, value, updated_by_user_id)
  values (p_key, p_value, iris.current_user_id())
  on conflict (key) do update set
    value = excluded.value, updated_by_user_id = excluded.updated_by_user_id, updated_at = now()
  returning *
$$;

create or replace function iris.save_preferences(p_patch jsonb)
returns iris.user_preferences language plpgsql as $$
declare r iris.user_preferences;
begin
  insert into iris.user_preferences (user_id) values (iris.current_user_id())
  on conflict (user_id) do nothing;
  update iris.user_preferences p set
    theme                  = coalesce(p_patch->>'theme', p.theme),
    accent_color           = case when p_patch ? 'accent_color' then p_patch->>'accent_color' else p.accent_color end,
    sidebar_collapsed      = coalesce((p_patch->>'sidebar_collapsed')::boolean, p.sidebar_collapsed),
    email_notifications    = coalesce((p_patch->>'email_notifications')::boolean, p.email_notifications),
    whatsapp_notifications = coalesce((p_patch->>'whatsapp_notifications')::boolean, p.whatsapp_notifications),
    push_notifications     = coalesce((p_patch->>'push_notifications')::boolean, p.push_notifications),
    default_view           = coalesce(p_patch->>'default_view', p.default_view),
    preferences            = p.preferences || coalesce(p_patch->'preferences', '{}'),
    updated_at             = now()
  where p.user_id = iris.current_user_id()
  returning * into r;
  return r;
end $$;


-- ============================================================================
-- 14. TRIGGERS — updated_at, audit trail, ticket ids, SLA, activity, workload
-- ============================================================================

-- Generic audit trigger: every insert/update/delete on settings & reference
-- tables is recorded with the acting user. Secrets are stripped.
create or replace function iris.audit_row_change()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_id  text;
begin
  v_old := v_old - 'password_hash' - 'reset_token_hash' - 'credentials_enc' - 'search_vector';
  v_new := v_new - 'password_hash' - 'reset_token_hash' - 'credentials_enc' - 'search_vector';
  if current_setting('iris.seeding', true) = 'on' then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and (v_old - 'updated_at') = (v_new - 'updated_at') then
    return new;                                   -- nothing but updated_at changed
  end if;
  v_id := coalesce(v_new, v_old) ->> coalesce(tg_argv[0], 'id');
  insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, before_state, after_state)
  values (iris.current_user_id(), lower(tg_op), tg_table_name, v_id, v_old, v_new);
  return coalesce(new, old);
end $$;

-- Ticket id 'IRIS-YYYY-NNNN' from a sequence (race-free, unlike max()+1).
create or replace function iris.generate_ticket_id()
returns trigger language plpgsql as $$
begin
  if new.ticket_id is null or new.ticket_id = '' then
    new.ticket_id := 'P57-' ||
                     lpad(nextval('iris.ticket_number_seq')::text, 5, '0');
  end if;
  return new;
end $$;

-- SLA targets + status from sla_definitions.
create or replace function iris.calculate_sla()
returns trigger language plpgsql as $$
declare d iris.sla_definitions;
begin
  select * into d from iris.sla_definitions where priority = new.priority;
  if not found then return new; end if;

  if tg_op = 'INSERT' or new.priority is distinct from old.priority then
    new.sla_response_target := coalesce(
      case when tg_op = 'INSERT' then new.sla_response_target end,
      new.created_at + make_interval(mins => d.response_target_mins));
    new.sla_resolution_target := coalesce(
      case when tg_op = 'INSERT' then new.sla_resolution_target end,
      new.created_at + make_interval(mins => d.resolution_target_mins));
  end if;

  if new.status in ('resolved', 'closed') then
    new.resolved_at := coalesce(new.resolved_at, now());
    if new.sla_status <> 'breached' then
      new.sla_status := case when new.resolved_at > new.sla_resolution_target then 'breached' else 'on_track' end;
    end if;
  elsif new.sla_status <> 'paused' then
    new.sla_status := case
      when now() > new.sla_resolution_target then 'breached'
      when now() > new.created_at + make_interval(mins => (d.resolution_target_mins * 0.75)::int) then 'at_risk'
      else 'on_track' end;
  end if;
  return new;
end $$;

-- Auto activity log on ticket changes.
create or replace function iris.log_ticket_activity()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_type text; v_desc text;
  v_actor text := (select coalesce(e.name, u.email::text) from iris.users u
                   left join iris.employees e on e.id = u.employee_id
                   where u.id = iris.current_user_id());
begin
  if current_setting('iris.seeding', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    v_type := 'created'; v_desc := 'Ticket created';
  elsif old.status in ('resolved', 'closed') and new.status not in ('resolved', 'closed') then
    v_type := 'reopened'; v_desc := 'Ticket reopened';
  elsif old.status <> new.status then
    v_type := 'status_changed'; v_desc := 'Status changed from ' || old.status || ' to ' || new.status;
  elsif old.priority <> new.priority then
    v_type := 'priority_changed'; v_desc := 'Priority changed from ' || old.priority || ' to ' || new.priority;
  elsif old.assignee_id is distinct from new.assignee_id then
    v_type := case when old.assignee_id is null then 'assigned' else 'reassigned' end;
    v_desc := 'Assigned to ' || coalesce((select name from iris.employees where id = new.assignee_id), 'nobody');
  elsif new.escalation_level > old.escalation_level then
    v_type := 'escalated'; v_desc := 'Escalated to level ' || new.escalation_level;
  else
    return new;                                   -- minor edits are covered by updated_at
  end if;
  insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
  values (new.id, v_type, v_desc, iris.current_user_id(), coalesce(v_actor, 'System'));
  return new;
end $$;

-- Keep employees.workload = number of open tickets assigned.
create or replace function iris.sync_workload()
returns trigger language plpgsql security definer set search_path = iris, public as $$
begin
  update iris.employees e set workload = (
    select count(*) from iris.tickets t
    where t.assignee_id = e.id and t.status not in ('resolved', 'closed'))
  where e.id in (
    case when tg_op <> 'INSERT' then old.assignee_id end,
    case when tg_op <> 'DELETE' then new.assignee_id end);
  return null;
end $$;

-- First comment by staff stamps first_response_at.
create or replace function iris.stamp_first_response()
returns trigger language plpgsql security definer set search_path = iris, public as $$
begin
  update iris.tickets set first_response_at = new.created_at
  where id = new.ticket_id and first_response_at is null and new.author_user_id is not null;
  return new;
end $$;

-- Attach updated_at + audit triggers to every table that needs them.
do $$
declare
  t record;
begin
  for t in
    select c.table_name,
           exists (select 1 from information_schema.columns
                   where table_schema = 'iris' and table_name = c.table_name and column_name = 'updated_at') as has_upd
    from information_schema.tables c
    where c.table_schema = 'iris' and c.table_type = 'BASE TABLE'
  loop
    if t.has_upd then
      execute format('drop trigger if exists trg_set_updated_at on iris.%I', t.table_name);
      execute format('create trigger trg_set_updated_at before update on iris.%I
                      for each row execute function iris.set_updated_at()', t.table_name);
    end if;
  end loop;
end $$;

do $$
declare
  t text;
  k text;
begin
  for t, k in values
    ('studios', 'code'), ('departments', 'code'), ('employees', 'id'), ('users', 'id'),
    ('sla_definitions', 'priority'), ('templates', 'code'), ('knowledge_articles', 'id'),
    ('app_settings', 'key'), ('routing_rules', 'id'), ('ai_models', 'id'),
    ('notification_rules', 'event'), ('roles', 'name'), ('integrations', 'id'),
    ('trainers', 'id'), ('tickets', 'ticket_id')
  loop
    execute format('drop trigger if exists trg_audit on iris.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on iris.%I
                    for each row execute function iris.audit_row_change(%L)', t, k);
  end loop;
end $$;

drop trigger if exists trg_generate_ticket_id on iris.tickets;
create trigger trg_generate_ticket_id before insert on iris.tickets
  for each row execute function iris.generate_ticket_id();

drop trigger if exists trg_calculate_sla on iris.tickets;
create trigger trg_calculate_sla before insert or update of priority, status, sla_status on iris.tickets
  for each row execute function iris.calculate_sla();

drop trigger if exists trg_log_ticket_activity on iris.tickets;
create trigger trg_log_ticket_activity after insert or update on iris.tickets
  for each row execute function iris.log_ticket_activity();

drop trigger if exists trg_sync_workload on iris.tickets;
create trigger trg_sync_workload after insert or delete or update of assignee_id, status on iris.tickets
  for each row execute function iris.sync_workload();

drop trigger if exists trg_first_response on iris.ticket_comments;
create trigger trg_first_response after insert on iris.ticket_comments
  for each row execute function iris.stamp_first_response();


-- ============================================================================
-- 15. BUSINESS LOGIC
-- ============================================================================

-- Pick the least-loaded available employee in the ticket's department.
create or replace function iris.auto_assign_ticket(p_ticket_id text)
returns text language plpgsql security definer set search_path = iris, public as $$
declare v_dept text; v_emp text;
begin
  select department_code into v_dept from iris.tickets where id = p_ticket_id;
  if v_dept is null then return null; end if;
  select id into v_emp from iris.employees
  where department_code = v_dept and is_active and availability = 'available'
  order by (workload >= max_workload), workload, escalation_order desc
  limit 1;
  if v_emp is not null then
    update iris.tickets set assignee_id = v_emp where id = p_ticket_id;
  end if;
  return v_emp;
end $$;

-- Re-evaluate SLA status for all open tickets (run every few minutes).
create or replace function iris.refresh_sla_statuses()
returns integer language sql security definer set search_path = iris, public as $$
  with u as (
    update iris.tickets t set sla_status = case
        when now() > t.sla_resolution_target then 'breached'
        when now() > t.created_at + make_interval(mins => (d.resolution_target_mins * 0.75)::int) then 'at_risk'
        else 'on_track' end
    from iris.sla_definitions d
    where d.priority = t.priority and t.status not in ('resolved', 'closed') and t.sla_status <> 'paused'
      and t.sla_status is distinct from case
        when now() > t.sla_resolution_target then 'breached'
        when now() > t.created_at + make_interval(mins => (d.resolution_target_mins * 0.75)::int) then 'at_risk'
        else 'on_track' end
    returning 1)
  select count(*)::int from u
$$;

-- Same category + studio repeated within N days.
create or replace function iris.detect_recurring_patterns(p_days integer default 60)
returns setof iris.recurring_patterns language plpgsql security definer set search_path = iris, public as $$
begin
  delete from iris.recurring_patterns;
  return query
  insert into iris.recurring_patterns
    (pattern_key, category, studio_code, ticket_count, first_at, latest_at, span_days, severity, recommendation, ticket_ids)
  select category || '|' || coalesce(studio_code, 'any'), category, studio_code, count(*)::int,
         min(created_at), max(created_at),
         extract(day from max(created_at) - min(created_at))::int,
         case when count(*) >= 5 then 'high' when count(*) >= 3 then 'medium' else 'low' end,
         case when count(*) >= 5 then 'Recurring issue - schedule preventive maintenance / root-cause review.'
              when count(*) >= 3 then 'Pattern forming - monitor and prepare a preventive action plan.'
              else 'Repeat occurrence - log for trend tracking.' end,
         array_agg(id)
  from iris.tickets
  where created_at >= now() - make_interval(days => p_days)
  group by category, studio_code
  having count(*) >= 2
  returning *;
end $$;

create or replace function iris.log_app_event(
  p_level text, p_category text, p_message text, p_details jsonb default '{}')
returns void language sql security definer set search_path = iris, public as $$
  insert into iris.app_logs (level, category, message, details, user_id)
  values (p_level, p_category, p_message, p_details, iris.current_user_id());
$$;

create or replace function iris.create_notification(
  p_user_id uuid, p_type text, p_title text, p_body text,
  p_ticket_id text default null, p_priority text default 'P3')
returns uuid language sql security definer set search_path = iris, public as $$
  insert into iris.notifications (user_id, type, title, body, ticket_id, priority)
  values (p_user_id, p_type, p_title, p_body, p_ticket_id, p_priority)
  returning id
$$;


-- ============================================================================
-- 16. VIEWS (security_invoker -> they respect RLS of the caller)
-- ============================================================================

create or replace view iris.v_tickets_full with (security_invoker = true) as
select t.*, s.name as studio_name, s.city as studio_city, d.name as department_name,
       a.name as assignee_name, a.role as assignee_role, r.name as reporter_name
from iris.tickets t
left join iris.studios s on s.code = t.studio_code
left join iris.departments d on d.code = t.department_code
left join iris.employees a on a.id = t.assignee_id
left join iris.employees r on r.id = t.reporter_id;

create or replace view iris.v_ticket_summary with (security_invoker = true) as
select
  count(*) as total_tickets,
  count(*) filter (where status not in ('resolved', 'closed')) as open_tickets,
  count(*) filter (where priority = 'P0' and status not in ('resolved', 'closed')) as critical_open,
  count(*) filter (where status = 'escalated') as escalated,
  count(*) filter (where sla_status = 'breached') as sla_breached,
  count(*) filter (where status in ('resolved', 'closed')) as resolved,
  count(*) filter (where assignee_id is null) as unassigned,
  count(*) filter (where resolved_at >= now() - interval '7 days') as resolved_this_week,
  count(*) filter (where created_at >= now() - interval '1 day') as created_today
from iris.tickets;

create or replace view iris.v_sla_at_risk with (security_invoker = true) as
select t.id, t.ticket_id, t.title, t.priority, t.status, t.sla_status, t.sla_resolution_target,
       t.assignee_id, e.name as assignee_name,
       round(extract(epoch from now() - t.created_at) / 3600, 1) as hours_elapsed,
       round(extract(epoch from t.sla_resolution_target - now()) / 3600, 1) as hours_remaining
from iris.tickets t
left join iris.employees e on e.id = t.assignee_id
where t.status not in ('resolved', 'closed') and t.sla_status in ('at_risk', 'breached')
order by (t.sla_status = 'breached') desc, t.sla_resolution_target;

create or replace view iris.v_employee_workload with (security_invoker = true) as
select e.id, e.name, e.role, e.department_code, e.availability, e.workload, e.max_workload,
       round(e.workload::numeric / nullif(e.max_workload, 0), 2) as utilization,
       count(t.id) filter (where t.priority = 'P0') as p0_open,
       count(t.id) filter (where t.sla_status = 'breached') as breached_open
from iris.employees e
left join iris.tickets t on t.assignee_id = e.id and t.status not in ('resolved', 'closed')
where e.is_active
group by e.id;

create or replace view iris.v_recent_activity with (security_invoker = true) as
select a.id, a.ticket_id, t.ticket_id as ticket_number, t.title as ticket_title,
       a.activity_type, a.description, a.actor_name, a.created_at, t.priority, t.status
from iris.ticket_activities a
join iris.tickets t on t.id = a.ticket_id
order by a.created_at desc;


-- ============================================================================
-- 17. ROW-LEVEL SECURITY (enforced for role iris_app)
-- ============================================================================

do $$
declare t text;
begin
  for t in select table_name from information_schema.tables
           where table_schema = 'iris' and table_type = 'BASE TABLE'
  loop
    execute format('alter table iris.%I enable row level security', t);
    -- drop every existing policy so re-runs stay in sync with this file
    perform 1;
  end loop;
end $$;

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'iris' loop
    execute format('drop policy %I on iris.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Reference / configuration data: everyone signed in reads, admins write.
do $$
declare t text;
begin
  foreach t in array array['studios', 'departments', 'sla_definitions', 'app_settings',
                           'routing_rules', 'ai_models', 'notification_rules', 'roles',
                           'recurring_patterns', 'anomalies']
  loop
    execute format('create policy p_read on iris.%I for select to iris_app using (iris.is_signed_in())', t);
    execute format('create policy p_admin_write on iris.%I for all to iris_app
                    using (iris.is_admin()) with check (iris.is_admin())', t);
  end loop;
  -- Templates + knowledge base: managers can edit too.
  foreach t in array array['templates', 'knowledge_articles']
  loop
    execute format('create policy p_read on iris.%I for select to iris_app using (iris.is_signed_in())', t);
    execute format('create policy p_manager_write on iris.%I for all to iris_app
                    using (iris.is_manager_or_admin()) with check (iris.is_manager_or_admin())', t);
  end loop;
  -- Admin-only tables.
  foreach t in array array['integrations', 'webhook_events', 'audit_log', 'app_logs', 'system_backups']
  loop
    execute format('create policy p_admin on iris.%I for all to iris_app
                    using (iris.is_admin()) with check (iris.is_admin())', t);
  end loop;
end $$;

-- Employees: admin all; manager their department; executive self + same studios.
create policy p_read on iris.employees for select to iris_app using (
  iris.is_admin()
  or id = iris.current_employee_id()
  or (iris.current_role_tier() = 'manager' and department_code = iris.current_department())
  or (iris.current_role_tier() = 'executive' and studio_codes && iris.current_studios()));
create policy p_write on iris.employees for all to iris_app
  using (iris.is_admin() or (iris.current_role_tier() = 'manager' and department_code = iris.current_department()))
  with check (iris.is_admin() or (iris.current_role_tier() = 'manager' and department_code = iris.current_department()));

-- Members + trainers: all signed-in staff read; managers+ write.
create policy p_read on iris.members for select to iris_app using (iris.is_signed_in());
create policy p_write on iris.members for all to iris_app
  using (iris.is_manager_or_admin()) with check (iris.is_manager_or_admin());
create policy p_read on iris.trainers for select to iris_app using (
  iris.is_manager_or_admin() or primary_studio = any(iris.current_studios()));
create policy p_write on iris.trainers for all to iris_app
  using (iris.is_manager_or_admin()) with check (iris.is_manager_or_admin());
create policy p_manager on iris.trainer_assessments for all to iris_app
  using (iris.is_manager_or_admin()) with check (iris.is_manager_or_admin());
create policy p_manager on iris.trainer_feedback for all to iris_app
  using (iris.is_manager_or_admin()) with check (iris.is_manager_or_admin());

-- Users: see/update self; admin everything. Role changes are admin-only.
create policy p_read on iris.users for select to iris_app
  using (id = iris.current_user_id() or iris.is_admin());
create policy p_admin_write on iris.users for all to iris_app
  using (iris.is_admin()) with check (iris.is_admin());
create policy p_read on iris.sessions for select to iris_app
  using (user_id = iris.current_user_id() or iris.is_admin());
create policy p_revoke on iris.sessions for update to iris_app
  using (user_id = iris.current_user_id() or iris.is_admin());

-- Tickets: 3-tier rule.
create policy p_read on iris.tickets for select to iris_app
  using (iris.can_access_ticket(department_code, studio_code, assignee_id, reporter_id));
create policy p_insert on iris.tickets for insert to iris_app
  with check (iris.is_manager_or_admin()
              or (iris.current_role_tier() = 'executive'
                  and (studio_code = any(iris.current_studios())
                       or reporter_id = iris.current_employee_id())));
create policy p_update on iris.tickets for update to iris_app
  using (iris.can_access_ticket(department_code, studio_code, assignee_id, reporter_id))
  with check (iris.can_access_ticket(department_code, studio_code, assignee_id, reporter_id));
create policy p_delete on iris.tickets for delete to iris_app using (iris.is_admin());

-- Ticket children follow the parent ticket.
do $$
declare t text;
begin
  foreach t in array array['ticket_activities', 'ticket_comments', 'ticket_attachments',
                           'ticket_resolutions', 'sla_trigger_log', 'escalation_log']
  loop
    execute format('create policy p_read on iris.%I for select to iris_app
                    using (iris.can_access_ticket_id(ticket_id))', t);
    execute format('create policy p_insert on iris.%I for insert to iris_app
                    with check (iris.can_access_ticket_id(ticket_id))', t);
    execute format('create policy p_modify on iris.%I for update to iris_app
                    using (iris.is_manager_or_admin() and iris.can_access_ticket_id(ticket_id))', t);
    execute format('create policy p_delete on iris.%I for delete to iris_app
                    using (iris.is_manager_or_admin() and iris.can_access_ticket_id(ticket_id))', t);
  end loop;
end $$;

-- Personal data: own rows only (admins can read).
do $$
declare t text;
begin
  foreach t in array array['conversations', 'notifications', 'user_preferences', 'daily_briefings']
  loop
    execute format('create policy p_own on iris.%I for all to iris_app
                    using (user_id = iris.current_user_id() or iris.is_admin())
                    with check (user_id = iris.current_user_id())', t);
  end loop;
end $$;
create policy p_own on iris.conversation_messages for all to iris_app
  using (exists (select 1 from iris.conversations c where c.id = conversation_id
                 and (c.user_id = iris.current_user_id() or iris.is_admin())))
  with check (exists (select 1 from iris.conversations c where c.id = conversation_id
                      and c.user_id = iris.current_user_id()));

-- Privileges for the app role (RLS above narrows what it can actually touch).
grant select, insert, update, delete on all tables in schema iris to iris_app;
grant usage, select on all sequences in schema iris to iris_app;
grant execute on all functions in schema iris to iris_app;
alter default privileges in schema iris grant select, insert, update, delete on tables to iris_app;
alter default privileges in schema iris grant usage, select on sequences to iris_app;
alter default privileges in schema iris grant execute on functions to iris_app;


-- ============================================================================
-- 18. SEED DATA (generated from the app's src/lib/iris data files)
-- ============================================================================
-- Tickets are not seeded (the app's sample tickets are mock data).
-- Import real tickets separately.

set local iris.seeding = 'on';   -- skip auto activity rows while seeding history
