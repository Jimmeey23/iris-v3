# IRIS · Physique 57 (v3)

A Next.js 16 App Router workspace for studio operations — tickets, routing, SLA and
escalation, notifications, the Momence member/session catalogue, an AI assistant — on
Neon Postgres with row-level security enforced by the database itself.

## Stack

| Layer      | Choice                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, standalone output)                   |
| Database   | Neon Postgres, `iris` schema, RLS on every table                        |
| Data access| `pg` pool; every user request runs `SET LOCAL ROLE iris_app` (see `src/lib/server/db.ts`) |
| Auth       | Cookie session backed by `iris.validate_session()`; roles `admin` / `manager` / `executive` |
| AI         | Anthropic tool-using agent (`src/lib/server/agent.ts`), OpenAI optional |
| Mail       | Mailtrap (API first, SMTP fallback), delivered through the outbox       |
| UI         | Tailwind 4 + shadcn/ui single-app shell (`src/components/iris`)         |

## Configuration

See [.env.example](.env.example) for the full list. The essentials:

| Variable | Purpose |
| --- | --- |
| `NEON_DATABASE_URL` | Pooled Neon connection string (`sslmode=require`). Required. |
| `NEXT_PUBLIC_APP_URL` | The origin users sign in on; used in notification deep links. |
| `CRON_SECRET` | Bearer secret for `/api/cron/outbox` and `/api/cron/sla`. Without it the routes reject every call. |
| `MAILTRAP_API_KEY` / `MAILTRAP_SMTP_*`, `MAILTRAP_FROM_EMAIL` | Notification email. With neither configured, email is logged as `skipped` and nothing is sent. |
| `NOTIFY_DRY_RUN` | `1` logs every notification as `dry_run` instead of queueing it. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | AI assistant and classification. |
| `MOMENCE_CLIENT_ID` / `MOMENCE_CLIENT_SECRET`, `MOMENCE_WEBHOOK_SECRET` | Momence integration and webhook verification. |

## Quick start

```bash
bun install
cp .env.example .env            # fill in NEON_DATABASE_URL at minimum
psql "$NEON_DATABASE_URL" -f db/iris-neon-complete.sql
for f in db/migrations-*.sql; do psql "$NEON_DATABASE_URL" -f "$f"; done
bun run dev                     # first free port at or above 3000
```

All `db/migrations-*.sql` files are additive and idempotent — re-running them is safe
and CI does exactly that.

## Database

`db/iris-neon-complete.sql` is the authoritative schema + seed. Migrations after it are
small, ordered, additive SQL files. Two properties the app depends on:

- **RLS everywhere.** User requests run as the `iris_app` role with
  `app.current_user_id` set; policies call `iris.is_signed_in()` / `iris.is_admin()`.
  Only the SECURITY DEFINER auth functions and the background machinery (outbox,
  sweeps, notifications) run as the database owner.
- **Settings are data.** `iris.app_settings` holds admin-editable switches
  (`notifications.*`, `routing.*`, `ops.*`). The sweeps read theirs per run.

### Applying migrations on a live deployment

```bash
for f in db/migrations-*.sql; do psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

## Notifications and the outbox

`notifyTicketEvent()` resolves recipients from `iris.notification_rules`, honours each
user's preferences, writes in-app rows, and **queues email in `iris.outbox`**. The
`email_log` row is the idempotency ledger — one (event, ticket, recipient, channel)
row, created only once — and doubles as the audit trail.

The outbox (`src/lib/server/outbox.ts`, ported from v2) drains queued mail with
**exponential backoff: 2, 4, 8, 16, 32 minutes, capped at 6 hours, 6 attempts**, then
parks the row as `failed` for a reviewed manual retry. Rows left in `sending` by a
crashed worker are released after 10 minutes. A Mailtrap outage therefore delays mail
instead of losing it. `ops.email_via_outbox = false` falls back to the old inline send.

In-app notifications are delivered inline (a database function, no provider to fail).

## Background work

`src/lib/server/sweeps.ts` (ported from v2's `lib/sweeps`) runs the SLA transitions,
escalation and the outbox drain. Two drivers, one implementation:

- **Request-driven.** Every open tab polls `GET /api/tickets` and
  `GET /api/notifications`; those routes schedule a sweep with `after()`. Each job is
  **claimed once per window** through a conditional upsert on `app_settings`
  (`sweep:outbox` every 2 min, `sweep:sla` every 5 min), so of a hundred requests
  arriving together exactly one does the work — and the claim arbitrates across
  instances. A 60 s in-process gate keeps a warm instance from asking more often.
- **Cron backstop.** `GET /api/cron/outbox` (with `Authorization: Bearer $CRON_SECRET`)
  runs the SLA sweep + escalation + a larger drain + rate-limit cleanup for days when
  nobody signs in. `vercel.json` schedules it on Vercel; self-hosted, a system crontab
  line does the same job:

  ```cron
  */10 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://iris.example.com/api/cron/outbox
  ```

`ops.sweeps_enabled = false` in `app_settings` turns the request-driven sweeps off
(the cron route still works) for emergencies.

### SLA and escalation

- The sweep marks open tickets `at_risk` at 75 % of their resolution window and
  `breached` past the target, notifying once per transition (the dedupe key embeds the
  target timestamp).
- A breached, unresolved ticket escalates up the line: **level 1 → the owner's
  reporting manager** (`employees.reporting_manager`), **level 2 → the department
  head**, capped by `ops.escalation_max_level`. Level N fires
  `ops.escalate_after_breach_hours × N` past the target. Each step reassigns the
  ticket, writes `escalation_log` + a ticket activity and notifies the new owner. The
  reassignment is a conditional update on the exact level — two sweeps cannot both win,
  and a ticket never skips a level.

## Rate limiting

`src/lib/server/rate-limit.ts` (ported from v2) keeps fixed-window counters in
`iris.rate_limits` — in the database, because the next request is not guaranteed to
reach the same process. One statement does the count (insert-or-increment with window
reset), so concurrent requests cannot both read 29 and proceed.

| Bucket | Limit | Identity | Covers |
| --- | --- | --- | --- |
| `login` | 10 / 5 min | IP + email | Credential stuffing |
| `ai-chat` | 30 / min | user | Assistant turns (model spend) |
| `intake-classify` | 20 / min | user | Classification (may call the model) |
| `ticket-create` | 20 / min | user | Queue-filling scripts |
| `ticket-write` | 60 / min | user | Comment/status fan-out to email |

429 responses carry `Retry-After`. The cron route drops windows older than a day.

## Ticket idempotency

`POST /api/tickets` honours an **Idempotency-Key** header (or `idempotencyKey` body
field): a retried or double-submitted request returns the first ticket instead of
filing a second. Enforced by a partial unique index on
`(created_by_user_id, idempotency_key)`. The client stamps every creation POST
(`src/lib/iris/live-data.ts`); a view that retries the *same* logical submission can
pass its own stable key so the replay is honoured. Replay responses carry
`Idempotency-Replayed: true`.

## Health and monitoring

- `GET /api/health` — `{ ok, db, commit, env }` for an uptime monitor (503 when the
  database is unreachable). A signed-in **administrator** additionally gets the outbox
  backlog (`pending` / `sending` / `failed` / oldest), open breached/escalated counts,
  and the last run time of each sweep — the answer to "did the background work run?".
- Every uncaught server error is logged by `src/instrumentation.ts` as one JSON line
  carrying the digest the error page shows, so a user's screenshot matches a log line.
- The cron route logs a `[cron/outbox]` summary per run; alert on `failed > 0`.

## Security

- **Headers** (`next.config.ts`): enforced CSP, HSTS (preload), `X-Frame-Options:
  DENY`, nosniff, referrer policy, permissions policy; API responses `no-store`.
  There are no third-party browser embeds, so the CSP is `default-src 'self'` plus
  data/blob/https images.
- **RLS** is the access-control layer: a route cannot leak another user's rows even if
  it forgets a WHERE clause.
- Cron routes compare secrets with `timingSafeEqual` and 503 (not 401) when
  `CRON_SECRET` is unset, so a misconfigured deploy is loud rather than open.
- The login limiter fails open on a rate-limiter outage — availability over strictness
  for the front door; `iris.login` itself still audits IP and user agent.

## Validation

```bash
bun run lint        # eslint
bun run typecheck   # tsc --noEmit
bun test            # scripts/unit — pure logic, no database or network needed
bun run build       # next build (standalone)
```

CI (`.github/workflows/ci.yml`) runs all four, then applies
`db/iris-neon-complete.sql` + every migration twice to a throwaway Postgres (fresh +
idempotency check), asserts the ported reliability objects exist, and builds.

## Deployment

### Vercel

Import the repo, set the environment variables, deploy. `vercel.json` schedules the
two cron routes. `bun run build` produces the standalone bundle `vercel` expects.

### Self-hosted (standalone + Caddy)

```bash
bun install && bun run build
NEON_DATABASE_URL=... CRON_SECRET=... MAILTRAP_API_KEY=... NODE_ENV=production \
  node .next/standalone/server.js   # listens on :3000
```

`Caddyfile` reverse-proxies :81 → :3000 with forwarded headers (used by the sandbox
preview); in production terminate TLS at your proxy and keep
`X-Forwarded-Proto` correct — the session cookie flips to `secure` based on it.

## Backups

Neon holds every ticket, resolution and audit record. Point-in-time restore is built
in; take a weekly logical dump to storage you control as a second copy:

```bash
pg_dump "$NEON_DATABASE_URL" --schema=iris --no-owner -Fc -f iris-$(date +%F).dump
```

Restoring into a scratch database first is the safe path for partial recoveries.

## Project layout

```
src/app/api/…          route handlers (tickets, auth, momence, ai, cron, health)
src/lib/server/        db pool + RLS, auth, notify, outbox, sweeps, rate-limit, agent
src/lib/iris/          pure logic (ops-policy, notify-events, taxonomy, templates)
src/components/iris/   the app shell and its views
db/                    schema, seeds and additive migrations
scripts/unit/          bun tests (pure logic, offline)
```
