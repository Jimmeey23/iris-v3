-- AI usage ledger: record what each call was for, and on which ticket.
alter table iris.ai_usage add column if not exists feature   text not null default 'unknown';
alter table iris.ai_usage add column if not exists ticket_id text references iris.tickets(id) on delete set null;
alter table iris.ai_usage add column if not exists detail    text;
create index if not exists idx_ai_usage_user on iris.ai_usage(user_id, created_at desc);
create index if not exists idx_ai_usage_feature on iris.ai_usage(feature, created_at desc);
