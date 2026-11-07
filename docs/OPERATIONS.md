# Operations runbook

Day-to-day answers for whoever holds the pager. Everything here works directly against
Neon (`psql "$NEON_DATABASE_URL"`) or the running app.

## Is the background work running?

```
curl -s https://<host>/api/health   # signed in as an admin for the full answer
```

- `outbox.pending` should hover near 0 and `oldestPending` should be minutes old, not hours.
- `outbox.failed > 0` means deliveries were parked — see *Mail is not going out*.
- `lastSweeps.sla` / `lastSweeps.outbox` show when each sweep last ran. Both ride on
  ordinary requests; if nobody has signed in for a day, only the cron run moves them.

## Mail is not going out

1. **`/api/health` → `outbox`.** `pending` rows with a fresh `oldestPending` = the
   drain is running and the provider is slow or down. Mail will go out when Mailtrap
   answers; retries double from 2 minutes up to a 6-hour cap.
2. **`failed > 0`** = six attempts exhausted. Inspect and retry manually:

   ```sql
   select id, attempts, last_error, payload->>'to' as to, payload->>'subject' as subject, created_at
     from iris.outbox where status = 'failed' order by updated_at desc;
   ```

   Fix the cause (quota, bad sender address), then requeue:

   ```sql
   update iris.outbox set status='pending', attempts=0, next_attempt_at=now()
    where id = '<row id>';
   ```

3. **Nothing queued at all?** Check the ledger:
   `select status, count(*) from iris.email_log group by 1;`
   — `skipped` means mail is not configured (`MAILTRAP_*`), `dry_run` means
   `NOTIFY_DRY_RUN=1`, and a missing row means the event never matched a
   `notification_rules` row.

## SLA and escalation tuning

All knobs live in `app_settings` — no redeploy needed:

```sql
select key, value from iris.app_settings where key like 'ops.%';
update iris.app_settings set value = '6'
 where key = 'ops.escalate_after_breach_hours';          -- default 4
update iris.app_settings set value = '2'
 where key = 'ops.escalation_max_level';                 -- default 3
update iris.app_settings set value = 'false'
 where key = 'ops.sweeps_enabled';                       -- emergency stop for the request-driven sweeps
```

Escalation levels: 1 → the owner's reporting manager, 2 → the department head,
3 → logged for an admin. Level N fires N × `afterBreachHours` past the SLA target.
Every automatic step lands in `iris.escalation_log` with its reason:

```sql
select t.ticket_id, e.escalation_level, e.escalated_to_role, e.reason, e.escalated_at
  from iris.escalation_log e join iris.tickets t on t.id = e.ticket_id
 order by e.escalated_at desc limit 20;
```

## Who is being throttled?

```sql
select key, count, window_start from iris.rate_limits
 where updated_at > now() - interval '1 hour'
 order by count desc limit 20;
```

Buckets and limits are in `src/lib/server/rate-limit.ts` (`RATE_LIMITS`). The counter
table is swept daily by the cron route; it stays small.

## Duplicate tickets after a double submit?

They shouldn't happen: creation POSTs carry an idempotency key
(partial unique index on `(created_by_user_id, idempotency_key)`). If a client retried
without a key and a duplicate still slipped through, close the newer one — and check
whether the caller was an integration (they should send `Idempotency-Key` too).

## Cron checklist (self-hosted)

```cron
*/10 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/outbox >/dev/null
```

- The endpoint answers 503 when `CRON_SECRET` is unset on the server — if your cron
  gets 503s, the server env is missing the secret, not the cron.
- `GET /api/cron/sla?dry=1` reports what *would* transition, touching nothing.

## Deploy checklist

1. `psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations-<new>.sql` before
   (or with) the deploy — migrations are additive and safe to run on live.
2. Deploy, then `curl /api/health` → `{"ok":true,"db":"up"}`.
3. If a migration added settings, confirm they exist:
   `select key from iris.app_settings where key like 'ops.%';`
