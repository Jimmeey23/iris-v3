import "server-only";
import type { PoolClient } from "pg";
import { isSandboxRequest, mainPool as pool } from "./db";
import { sendMail, mailConfigured } from "./mailer";
import {
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STUCK_MS,
  outboxBackoffMs,
  outboxGivesUp,
  outboxIsStuck,
} from "@/lib/iris/ops-policy";

/**
 * Persistent mail outbox, ported from iris-ai-v2's delivery_logs.
 *
 * Notification email is queued here instead of being sent inline: a Mailtrap outage
 * now *delays* mail rather than losing it. `deliverPending()` retries with exponential
 * backoff (2, 4, 8, 16, 32 minutes, capped at 6 h) up to OUTBOX_MAX_ATTEMPTS, then parks
 * the row as 'failed', where it stays visible for a reviewed manual retry.
 *
 * Concurrency model (same as v2):
 *  - `deliverPending` is safe to call from any request, any instance, any number of
 *    times at once. Each row is claimed with a conditional update pending → 'sending';
 *    of ten workers, exactly one flips a given row.
 *  - `next_attempt_at` doubles as the lease while 'sending'. A worker that dies
 *    mid-delivery has its rows released by `releaseStuck` after OUTBOX_STUCK_MS.
 *
 * Runs as the database owner (no RLS): deliveries are addressed to other people than
 * the signed-in user, exactly like notify.ts.
 */

export type OutboxMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  replyTo?: string;
  category?: string;
};

export type EnqueueOptions = {
  /** email_log.dedupe_key of the notification this delivery belongs to (audit link). */
  emailLogId?: string | null;
};

/** Queue one mail for delivery. Returns the outbox row id. */
export async function enqueueEmail(msg: OutboxMail, opts: EnqueueOptions = {}): Promise<string> {
  // Training sandbox: never queue real mail. The outbox lives in the real database
  // (so sweeps always drain production's), and sandbox people may have real addresses.
  if (await isSandboxRequest()) return "sandbox-skipped";
  const { rows } = await pool.query<{ id: string }>(
    `insert into iris.outbox (kind, status, payload, email_log_id)
     values ('email', 'pending', $1::jsonb, $2)
     returning id`,
    [JSON.stringify(msg), opts.emailLogId ?? null],
  );
  return rows[0].id;
}

export type DeliverSummary = {
  processed: number;
  succeeded: number;
  retrying: number;
  failed: number;
  released: number;
};

/** Rows lost to a crashed worker go back to 'pending' (or 'failed' once out of attempts). */
async function releaseStuck(now: Date): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("set search_path = iris, public");
    await client.query("begin");
    const stuck = await client.query<{ id: string; attempts: number; updated_at: Date; email_log_id: string | null }>(
      `select id, attempts, updated_at, email_log_id from outbox
        where status = 'sending' and updated_at < now() - interval '1 second' * $1
        for update skip locked`,
      [Math.ceil(OUTBOX_STUCK_MS / 1000)],
    );
    let touched = 0;
    for (const row of stuck.rows) {
      if (!outboxIsStuck(row.updated_at, now)) continue;
      if (outboxGivesUp(row.attempts)) {
        await client.query(
          `update outbox set status = 'failed', last_error = coalesce(last_error, 'Delivery was interrupted and did not complete.'),
             next_attempt_at = null, updated_at = now() where id = $1`,
          [row.id],
        );
        if (row.email_log_id) {
          await client.query(
            `update email_log set status = 'failed', error = 'Delivery was interrupted and did not complete.' where id = $1`,
            [row.email_log_id],
          );
        }
      } else {
        await client.query(
          `update outbox set status = 'pending', next_attempt_at = now(), updated_at = now() where id = $1`,
          [row.id],
        );
      }
      touched++;
    }
    await client.query("commit");
    return touched;
  } catch {
    await client.query("rollback").catch(() => {});
    return 0;
  } finally {
    client.release();
  }
}

async function handleSendFailure(client: PoolClient, job: { id: string; email_log_id: string | null }, attempt: number, err: unknown, summary: DeliverSummary) {
  const error = err instanceof Error ? err.message : String(err);
  try {
    if (outboxGivesUp(attempt)) {
      await client.query(
        `update outbox set status = 'failed', last_error = $2, next_attempt_at = null, updated_at = now() where id = $1`,
        [job.id, error],
      );
      if (job.email_log_id) {
        await client.query(`update email_log set status = 'failed', error = $2 where id = $1`, [job.email_log_id, error]);
      }
      summary.failed++;
    } else {
      await client.query(
        `update outbox set status = 'pending', last_error = $2, next_attempt_at = now() + interval '1 millisecond' * $3, updated_at = now() where id = $1`,
        [job.id, error, outboxBackoffMs(attempt)],
      );
      summary.retrying++;
    }
  } catch (bookkeepingError) {
    // The claim's lease still covers the row; releaseStuck will pick it up.
    console.error(`[outbox] failure bookkeeping for ${job.id}:`, bookkeepingError);
  }
}

/**
 * Drain due rows. `limit` keeps the batch small when riding on a user's request;
 * the cron route is what clears a genuine backlog with a larger budget.
 */
export async function deliverPending({ limit = 10 }: { limit?: number } = {}): Promise<DeliverSummary> {
  const now = new Date();
  const released = await releaseStuck(now);
  const summary: DeliverSummary = { processed: 0, succeeded: 0, retrying: 0, failed: 0, released };

  const client = await pool.connect();
  try {
    await client.query("set search_path = iris, public");
    const due = await client.query<{
      id: string;
      attempts: number;
      payload: OutboxMail;
      email_log_id: string | null;
    }>(
      `select id, attempts, payload, email_log_id from outbox
        where status = 'pending' and next_attempt_at <= now()
        order by next_attempt_at, created_at
        limit $1`,
      [limit],
    );
    summary.processed = due.rows.length;

    for (const job of due.rows) {
      const attempt = job.attempts + 1;
      // Claim: pending → 'sending', with the lease set to the backoff this attempt will
      // need if it fails. Only one concurrent worker sees the update succeed.
      const claimed = await client.query<{ id: string }>(
        `update outbox
            set status = 'sending', attempts = $2, next_attempt_at = now() + interval '1 millisecond' * $3, updated_at = now()
          where id = $1 and status = 'pending'
          returning id`,
        [job.id, attempt, outboxBackoffMs(attempt)],
      );
      if (!claimed.rowCount) continue;

      let res: Awaited<ReturnType<typeof sendMail>>;
      try {
        if (!mailConfigured()) throw new Error("No mail provider configured (MAILTRAP_API_KEY / MAILTRAP_SMTP_*)");
        res = await sendMail(job.payload);
      } catch (err) {
        await handleSendFailure(client, job, attempt, err, summary);
        continue;
      }
      // The mail is gone: bookkeeping trouble from here on must never reschedule (and so
      // re-send) it. Retry once, then leave it for the logs.
      summary.succeeded++;
      for (let tryNo = 0; tryNo < 2; tryNo++) {
        try {
          await client.query(
            `update outbox set status = 'sent', last_error = null, next_attempt_at = null, updated_at = now() where id = $1`,
            [job.id],
          );
          if (job.email_log_id) {
            await client.query(
              `update email_log set status = 'sent', provider = $2, provider_id = $3, sent_at = now() where id = $1`,
              [job.email_log_id, res.provider, res.id ?? null],
            );
          }
          break;
        } catch (bookkeepingError) {
          console.error(`[outbox] sent ${job.id} but bookkeeping failed:`, bookkeepingError);
        }
      }
    }
    return summary;
  } finally {
    client.release();
  }
}

/** Manually retry one parked ('failed') row - wired to the Integrations/ops surface later. */
export async function retryFailed(id: string): Promise<boolean> {
  const res = await pool.query<{ email_log_id: string | null }>(
    `update iris.outbox set status = 'pending', next_attempt_at = now(), attempts = 0, updated_at = now()
      where id = $1 and status = 'failed'
      returning email_log_id`,
    [id],
  );
  if (!res.rowCount) return false;
  // The linked log row said 'failed'; while the retry is pending it is queued again.
  const logId = res.rows[0].email_log_id;
  if (logId) await pool.query(`update iris.email_log set status = 'pending', error = null where id = $1`, [logId]).catch(() => {});
  return true;
}
