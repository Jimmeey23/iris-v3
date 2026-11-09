-- Outbox rows that are sent or failed have no next attempt.
alter table iris.outbox alter column next_attempt_at drop not null;
