/**
 * Pure policy for the background machinery, ported from iris-ai-v2.
 *
 * Everything here is a plain function or constant with no database, no network
 * and no `server-only` import, so unit tests can import this file directly and
 * the server modules (outbox, sweeps, rate-limit) stay thin executors.
 */

// -----------------------------------------------------------------------------------------
// Outbox
// -----------------------------------------------------------------------------------------

/** Give up after this many attempts; the row is parked as 'failed' for a human. */
export const OUTBOX_MAX_ATTEMPTS = 6;
/** First retry after 2 minutes, then doubling: 2, 4, 8, 16, 32 minutes, capped at 6 h. */
export const OUTBOX_BASE_DELAY_MS = 2 * 60_000;
export const OUTBOX_MAX_DELAY_MS = 6 * 3_600_000;
/** A row left in 'sending' longer than this was lost to a crash/timeout; its lease is released. */
export const OUTBOX_STUCK_MS = 10 * 60_000;

/** Backoff before attempt number `attempts` (1-based), in milliseconds. Pure. */
export function outboxBackoffMs(attempts: number): number {
  return Math.min(OUTBOX_MAX_DELAY_MS, OUTBOX_BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
}

/** Whether a delivery that just failed on attempt `attempts` is parked as failed. Pure. */
export function outboxGivesUp(attempts: number): boolean {
  return attempts >= OUTBOX_MAX_ATTEMPTS;
}

/** When a row stuck in 'sending' since `updatedAt` counts as abandoned by a dead worker. Pure. */
export function outboxIsStuck(updatedAt: Date | string, now: Date): boolean {
  return now.getTime() - new Date(updatedAt).getTime() > OUTBOX_STUCK_MS;
}

// -----------------------------------------------------------------------------------------
// Sweeps
// -----------------------------------------------------------------------------------------

/**
 * How often each background job may run, in seconds. Request-driven sweeps ride on
 * ordinary traffic (every open tab polls tickets/notifications), and the daily cron
 * is the backstop for a day when nobody signs in.
 */
export const SWEEP_WINDOWS = {
  /** The outbox holds mail that is already late by definition. */
  outbox: 120,
  /** SLA transitions and escalation: a 5-minute resolution is finer than the targets are. */
  sla: 300,
  /** Bike/mic recurrence checks fall due by the day; every 15 minutes is plenty. */
  recurrence: 900,
  /** Weekly digest: checked every 15 minutes; it only sends on Monday from 09:00 IST, once per person. */
  digest: 900,
} as const;

export type SweepJob = keyof typeof SWEEP_WINDOWS;

/** app_settings key that holds a job's claim (`{ at: ISO }`), matching v2's `sweep:*` rows. */
export function sweepClaimKey(job: SweepJob): string {
  return `sweep:${job}`;
}

/**
 * Whether a claim row recorded at `lastRunAt` may be re-taken at `now` for `job`. Pure -
 * the database does the same comparison inside the upsert; this mirrors it for tests.
 */
export function sweepDue(lastRunAt: string | null, job: SweepJob, now: Date): boolean {
  if (!lastRunAt) return true;
  return now.getTime() - new Date(lastRunAt).getTime() > SWEEP_WINDOWS[job] * 1000;
}

/** Local in-process gate for polled routes (v2: one DB attempt per minute per instance). */
export const SWEEP_LOCAL_GATE_MS = 60_000;

// -----------------------------------------------------------------------------------------
// SLA + escalation
// -----------------------------------------------------------------------------------------

/** A ticket enters 'at_risk' once this fraction of its resolution window has elapsed. */
export const SLA_AT_RISK_FRACTION = 0.75;

export type SlaTicket = {
  slaStatus: string | null;
  slaResolutionTarget: Date | string | null;
  createdAt: Date | string;
  status: string;
};

/** Whether the SLA sweep would mark this ticket at risk. Pure; SQL applies the same rule. */
export function isSlaAtRisk(t: SlaTicket, now: Date): boolean {
  if (t.status === "resolved" || t.status === "closed") return false;
  if (t.slaStatus !== "on_track") return false;
  if (!t.slaResolutionTarget) return false;
  const target = new Date(t.slaResolutionTarget).getTime();
  const start = new Date(t.createdAt).getTime();
  if (target <= now.getTime()) return false;
  return now.getTime() >= start + (target - start) * SLA_AT_RISK_FRACTION;
}

export type EscalationTicket = {
  status: string;
  slaStatus: string | null;
  slaResolutionTarget: Date | string | null;
  escalationLevel: number;
};

export type EscalationSettings = {
  /** Hours past the target after which a breached ticket escalates. */
  afterBreachHours: number;
  /** Escalation stops at this level. */
  maxLevel: number;
};

/**
 * Whether a breached ticket is due for escalation at `now`, and to which level. Pure.
 *
 * Ported from v2's applyEscalations: only unresolved breached tickets, only once per
 * level, only while the level cap allows. Level N fires after `afterBreachHours × N`
 * past the target, so consecutive levels are spread out instead of firing together.
 * The manager resolution (reporting manager → department head → admin) happens in SQL;
 * this decides *whether* to escalate.
 */
export function escalationDecision(
  t: EscalationTicket,
  s: EscalationSettings,
  now: Date,
): { escalate: true; nextLevel: number } | { escalate: false; reason: string } {
  if (t.status === "resolved" || t.status === "closed") return { escalate: false, reason: "resolved" };
  if (t.slaStatus !== "breached") return { escalate: false, reason: "not-breached" };
  if (!t.slaResolutionTarget) return { escalate: false, reason: "no-target" };
  const nextLevel = t.escalationLevel + 1;
  if (nextLevel > s.maxLevel) return { escalate: false, reason: "max-level" };
  const breachMs = now.getTime() - new Date(t.slaResolutionTarget).getTime();
  if (breachMs < s.afterBreachHours * 3_600_000 * nextLevel) return { escalate: false, reason: "not-due" };
  return { escalate: true, nextLevel };
}

/** Human-readable reason stored on the escalation_log row and the ticket activity. */
export function escalationReason(level: number, afterHours: number): string {
  return `Automatic escalation level ${level}: SLA unresolved more than ${afterHours}h past the resolution target.`;
}

// -----------------------------------------------------------------------------------------
// Rate limiting
// -----------------------------------------------------------------------------------------

export type Limit = { max: number; windowSeconds: number };

/**
 * Fixed-window limits per bucket, ported from v2's LIMITS and adapted to v3's routes.
 * Every bucket that can spend money (AI), send mail, or be abused anonymously has one.
 */
export const RATE_LIMITS = {
  /** AI assistant conversation turns. */
  "ai-chat": { max: 30, windowSeconds: 60 },
  feedback: { max: 10, windowSeconds: 600 },
  /** Intake classification (may fall through to one AI call). */
  "intake-classify": { max: 20, windowSeconds: 60 },
  /** Filing a ticket. A person raising several in a row is normal; a script is not. */
  "ticket-create": { max: 20, windowSeconds: 60 },
  /** Comments and status updates - each can fan out to email. */
  "ticket-write": { max: 60, windowSeconds: 60 },
  /** Password sign-in, keyed by IP and email; stops credential stuffing early. */
  login: { max: 10, windowSeconds: 300 },
} as const satisfies Record<string, Limit>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/** Counter key. Identity is a user id, or `ip|email` for anonymous buckets. Pure. */
export function rateLimitKey(bucket: RateLimitBucket, identity: string): string {
  return `${bucket}:${identity}`;
}

/**
 * Fixed-window arithmetic, shared by the SQL upsert and the tests.
 * `windowStart` null means "no row yet". Returns the new count for this window, and how
 * many seconds until the window resets (for the 429 body). Pure.
 */
export function rateWindow(
  windowStart: Date | string | null,
  windowSeconds: number,
  previousCount: number,
  now: Date,
): { count: number; windowStart: Date; resetsInSec: number } {
  const expired = windowStart === null || now.getTime() - new Date(windowStart).getTime() > windowSeconds * 1000;
  const start = expired ? now : new Date(windowStart);
  const count = expired ? 1 : previousCount + 1;
  const resetsInSec = Math.max(1, Math.ceil((start.getTime() + windowSeconds * 1000 - now.getTime()) / 1000));
  return { count, windowStart: start, resetsInSec };
}

// -----------------------------------------------------------------------------------------
// Ticket idempotency
// -----------------------------------------------------------------------------------------

/**
 * Normalise a client-supplied Idempotency-Key: trimmed printable ASCII, 16-128 chars.
 * Returns null when absent/invalid, so an invalid key is ignored rather than blocking
 * the request. Pure.
 */
export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  if (key.length < 16 || key.length > 128) return null;
  if (!/^[\x21-\x7E]+$/.test(key)) return null; // printable, no spaces
  return key;
}

/** Cache/audit header value echoing which key replayed. Pure. */
export function idempotentReplayHeader(key: string): Record<string, string> {
  return { "Idempotency-Replayed": "true", "Idempotency-Key": key };
}
