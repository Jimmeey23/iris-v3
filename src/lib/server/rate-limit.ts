import "server-only";
import { pool } from "./db";
import { RATE_LIMITS, rateLimitKey, rateWindow, type RateLimitBucket } from "@/lib/iris/ops-policy";

/**
 * Fixed-window request counters, ported from iris-ai-v2's lib/rate-limit.
 *
 * The endpoints that call the AI, send mail, or accept anonymous logins are reachable
 * by signed-in staff by design — that only holds if a caller cannot spend the API
 * budget or mailbomb a colleague in a loop.
 *
 * The counter lives in the database rather than a module-scope Map because the next
 * request is not guaranteed to reach the same process; an in-memory limiter would be a
 * limit per instance, which is not a limit. The whole count is one statement: the
 * insert either creates the window or, on conflict, increments it — resetting the
 * count when the previous window has expired. Read-then-write would let two concurrent
 * requests both read 29 and both proceed.
 */

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly resetsInSec: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

let cachedTicketCreateLimit: { max: number | null; expiresAt: number } = { max: null, expiresAt: 0 };

async function effectiveBucketMax(bucket: RateLimitBucket): Promise<number> {
  const base = RATE_LIMITS[bucket].max;
  if (bucket !== "ticket-create") return base;
  const nowMs = Date.now();
  if (nowMs < cachedTicketCreateLimit.expiresAt && cachedTicketCreateLimit.max !== null) {
    return cachedTicketCreateLimit.max;
  }
  try {
    const row = (await pool.query("select value from iris.app_settings where key = 'ops.ticket_create_limit'")).rows[0];
    const parsed = Number(row?.value);
    const max = Number.isFinite(parsed) && parsed >= 1 && parsed <= 10_000 ? Math.round(parsed) : base;
    cachedTicketCreateLimit = { max, expiresAt: nowMs + 10_000 };
    return max;
  } catch {
    return base;
  }
}

export function invalidateRateLimitConfigCache() {
  cachedTicketCreateLimit = { max: null, expiresAt: 0 };
}

/**
 * Counts one request against `bucket` for `identity` and throws RateLimitError once
 * the window is full. Runs as the database owner: buckets cover anonymous callers too.
 */
export async function enforceRateLimit(bucket: RateLimitBucket, identity: string): Promise<{ remaining: number }> {
  const limit = RATE_LIMITS[bucket];
  const maxAllowed = await effectiveBucketMax(bucket);
  const key = rateLimitKey(bucket, identity);
  const now = new Date();

  const { rows } = await pool.query<{ count: number; window_start: Date }>(
    `insert into iris.rate_limits (key, count, window_start, updated_at)
       values ($1, 1, now(), now())
     on conflict (key) do update set
       count        = case when iris.rate_limits.window_start < now() - interval '1 second' * $2
                           then 1 else iris.rate_limits.count + 1 end,
       window_start = case when iris.rate_limits.window_start < now() - interval '1 second' * $2
                           then now() else iris.rate_limits.window_start end,
       updated_at   = now()
     returning count, window_start`,
    [key, limit.windowSeconds],
  );

  // The table would otherwise grow a permanent row per caller per bucket. The outbox
  // cron sweeps it; the dice roll here is a backstop for deployments with no cron.
  if (Math.random() < 0.001) await sweepRateLimits().catch(() => {});

  const used = Number(rows[0]?.count ?? 1);
  if (used > maxAllowed) {
    const start = rows[0]?.window_start ? new Date(rows[0].window_start) : now;
    const resetsInSec = Math.max(1, Math.ceil((start.getTime() + limit.windowSeconds * 1000 - now.getTime()) / 1000));
    throw new RateLimitError(
      `Too many requests. Try again in ${resetsInSec} second${resetsInSec === 1 ? "" : "s"}.`,
      resetsInSec,
    );
  }
  return { remaining: Math.max(0, maxAllowed - used) };
}

/** Identity for a signed-in caller. */
export const userKey = (userId: string) => userId;

/** Identity for anonymous buckets (login): IP plus the attempted address, so one
 *  sprayed account does not lock out every user behind the same office IP, and one
 *  office IP does not lock out a single account. */
export const loginKey = (ip: string | null, email: string) => `${ip ?? "noip"}|${email}`;

/** Drops windows nobody can still be inside. Called by /api/cron/outbox. */
export async function sweepRateLimits(olderThanSec = 86_400): Promise<number> {
  const res = await pool.query(
    `delete from iris.rate_limits where window_start < now() - interval '1 second' * $1`,
    [olderThanSec],
  );
  return res.rowCount ?? 0;
}
