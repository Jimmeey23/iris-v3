-- ============================================================================
-- Default search_path for the database owner role. Re-runnable.
--
-- Background jobs (SLA sweep, escalations, notifications incl. SLA extension
-- requests to managers) do `set search_path = iris, public` on a pooled client
-- outside a transaction. Behind Neon's transaction-mode pooler a session SET
-- does not stick between statements, so those jobs failed at random with
-- 'relation "tickets" / "email_log" / "outbox" does not exist' (see app_logs).
-- Setting the default on the role makes every server connection start in the
-- right schema. Applied to prod 2026-11-25.
--
-- Undo: alter role neondb_owner reset search_path;
-- ============================================================================

alter role neondb_owner set search_path = iris, public;
