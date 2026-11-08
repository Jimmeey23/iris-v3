import "server-only";
import { after } from "next/server";
import { pool } from "./db";
import { notifyTicketEventNow } from "./notify";
import { deliverPending } from "./outbox";
import { sendWeeklyDigests } from "./weekly-digest";
import {
  SWEEP_LOCAL_GATE_MS,
  SWEEP_WINDOWS,
  escalationDecision,
  escalationReason,
  sweepClaimKey,
  type SweepJob,
} from "@/lib/iris/ops-policy";

/**
 * The work nobody asks for: SLA transitions, escalation, the outbox drain.
 * Ported from iris-ai-v2's lib/sweeps.
 *
 * The daily cron is the backstop for a day when nobody signs in. But a once-a-day
 * sweep is not good enough for an outbox holding somebody's escalation email, so the
 * work is *also* driven opportunistically by ordinary requests: the polled routes
 * (tickets, notifications — the bell every open tab hits) invoke runDueWorkThrottled()
 * through next/server `after()`.
 *
 * Two things make that safe rather than wasteful:
 *
 *  - **One claim per window.** Each job records its last run in `app_settings` and is
 *    claimed with a conditional upsert, so of a hundred requests arriving together
 *    exactly one does the work and the other ninety-nine do a single cheap write that
 *    changes nothing. The claim is a database row, so it arbitrates between instances.
 *  - **Never in front of the response.** Every caller invokes this from `after()`, so a
 *    person waiting for the board never waits for an email to be delivered.
 *
 * Runs as the database owner (no RLS) for the same reason notify.ts does: the sweep
 * touches tickets and recipients other than the signed-in user, and it must work from
 * the cron route where there is no session at all.
 */

/** Takes the claim for `job` when its window has elapsed. False when somebody else holds it. */
async function claim(job: SweepJob): Promise<boolean> {
  const seconds = SWEEP_WINDOWS[job];
  const { rowCount } = await pool.query(
    `insert into iris.app_settings (key, value, category)
       values ($1, jsonb_build_object('at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')), 'ops')
     on conflict (key) do update
       set value = jsonb_build_object('at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
           updated_at = now()
     where app_settings.updated_at < now() - interval '1 second' * $2`,
    [sweepClaimKey(job), seconds],
  );
  return (rowCount ?? 0) > 0;
}

/** Runs `work` if the claim is free. Failures are logged and swallowed: background work
 *  hanging off somebody else's request must never turn their 200 into a 500. */
async function run(job: SweepJob, work: () => Promise<unknown>): Promise<boolean> {
  try {
    if (!(await claim(job))) return false;
    await work();
    return true;
  } catch (error) {
    console.error(`[sweep] ${job}:`, error);
    void pool
      .query("select iris.log_app_event('error', 'sweep', $1, $2::jsonb)", [
        `Sweep ${job} failed: ${error instanceof Error ? error.message : String(error)}`,
        { job },
      ])
      .catch(() => {});
    return false;
  }
}

/** When this process last asked the database for a claim. See runDueWorkThrottled. */
let lastAttempt = 0;

/**
 * runDueWork for the polled routes. Every open tab hits those every minute or so, and
 * each call would otherwise cost conditional upserts that almost always change nothing.
 * A warm instance asks at most once a minute; the database claim still arbitrates
 * between instances. The crons call runDueWork directly and are never gated.
 */
export async function runDueWorkThrottled(): Promise<{ ran: SweepJob[] }> {
  const now = Date.now();
  if (now - lastAttempt < SWEEP_LOCAL_GATE_MS) return { ran: [] };
  lastAttempt = now;
  return runDueWork();
}

/** Hook for polled routes: schedule the sweep after the response is written. */
export function sweepAfterResponse(): void {
  try {
    after(() => runDueWorkThrottled().catch(() => {}));
  } catch {
    // Outside a request scope (script, test) — nothing to sweep.
  }
}

/**
 * Everything that is due, as far as its own window allows. Safe to call from any request.
 * `ops.sweeps_enabled` (app_settings) turns the whole thing off for emergencies.
 */
export async function runDueWork(): Promise<{ ran: SweepJob[] }> {
  const ran: SweepJob[] = [];
  const enabled = (await pool.query<{ value: unknown }>("select value from iris.app_settings where key = 'ops.sweeps_enabled'")).rows[0];
  if (enabled && enabled.value === false) return { ran };

  if (
    await run("sla", async () => {
      await runSlaSweep();
      // Ordered so anything the sweep queues is already in the outbox before the drain.
      await applyEscalations();
    })
  )
    ran.push("sla");
  if (
    await run("recurrence", async () => {
      // Raises the bike/mic re-check tickets whose day has come (iris.recurrence_checks).
      await pool.query("select iris.materialize_recurrence_checks()");
    })
  )
    ran.push("recurrence");
  if (
    await run("digest", async () => {
      await sendWeeklyDigests();
    })
  )
    ran.push("digest");
  if (
    await run("outbox", async () => {
      // A small batch: this is riding on a user's request. The cron route clears a
      // genuine backlog with a larger limit.
      await deliverPending({ limit: 10 });
    })
  )
    ran.push("outbox");
  return { ran };
}

// -----------------------------------------------------------------------------------------
// SLA transitions (shared with /api/cron/sla)
// -----------------------------------------------------------------------------------------

export type SlaSweepResult = { breached: { id: string; target: string }[]; atRisk: { id: string; target: string }[]; dry: boolean };

/**
 * Marks open tickets at_risk (75% of the resolution window elapsed) or breached (target
 * passed) and notifies once per transition; the notification dedupe key includes the SLA
 * target, so a re-run never re-sends. Same SQL as the pre-port cron route — moved here so
 * the request-driven sweep and the cron share one implementation.
 */
export async function runSlaSweep({ dry = false }: { dry?: boolean } = {}): Promise<SlaSweepResult> {
  const client = await pool.connect();
  try {
    await client.query("set search_path = iris, public");
    const open = "status not in ('resolved','closed') and sla_status <> 'paused' and sla_resolution_target is not null";
    const breachedWhere = `${open} and sla_status in ('on_track','at_risk') and sla_resolution_target < now()`;
    const riskWhere = `${open} and sla_status = 'on_track' and sla_resolution_target >= now()
       and now() >= created_at + (sla_resolution_target - created_at) * 0.75`;

    let breached: { id: string; target: string }[];
    let atRisk: { id: string; target: string }[];
    if (dry) {
      breached = (await client.query(`select id, sla_resolution_target as target from tickets where ${breachedWhere}`)).rows;
      atRisk = (await client.query(`select id, sla_resolution_target as target from tickets where ${riskWhere}`)).rows;
      return { breached, atRisk, dry };
    }

    await client.query("begin");
    breached = (
      await client.query(`update tickets set sla_status = 'breached' where ${breachedWhere} returning id, sla_resolution_target as target`)
    ).rows;
    atRisk = (
      await client.query(`update tickets set sla_status = 'at_risk' where ${riskWhere} returning id, sla_resolution_target as target`)
    ).rows;
    await client.query("commit");

    for (const [event, list] of [
      ["sla_breached", breached],
      ["sla_at_risk", atRisk],
    ] as const) {
      for (const r of list) {
        await notifyTicketEventNow(event, { id: r.id, title: "" }, null, {
          dedupe: `sla:${new Date(r.target).toISOString()}`,
        });
      }
    }
    return { breached, atRisk, dry };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// -----------------------------------------------------------------------------------------
// Escalation
// -----------------------------------------------------------------------------------------

type EscalationRow = {
  id: string;
  title: string;
  status: string;
  escalation_level: number;
  sla_resolution_target: Date;
  assignee_id: string | null;
  manager_id: string | null;
  manager_name: string | null;
  dept_head_id: string | null;
};

/** What the ticket activity says, naming the tier the ticket actually went to. */
function targetLabel(level: number, managerName: string | null): string {
  if (level === 1) return managerName ? `Reassigned to the reporting manager (${managerName}).` : "No reporting manager resolved — needs an admin.";
  if (level === 2) return "Reassigned to the department head.";
  return "No automatic owner left — needs an admin.";
}

/**
 * Escalate breached, unresolved tickets up the line. Ported from v2's applyEscalations:
 *
 *  - `ops.escalate_after_breach_hours` (default 4) after the SLA target with no resolution,
 *  - level 1 → the owner's reporting manager (employees.reporting_manager, matched by name),
 *    level 2 → the department head, level 3 → nobody left automatic (logged for an admin),
 *  - each step reassigns the ticket, bumps escalation_level, writes an escalation_log row
 *    and a ticket activity, and notifies the new owner ('escalated' event),
 *  - idempotent by construction: the reassignment is a conditional update on the exact
 *    level, so two concurrent sweeps cannot both win, and a ticket never skips a level.
 */
export async function applyEscalations({ dry = false }: { dry?: boolean } = {}): Promise<number> {
  const settings = await pool.query<{ key: string; value: unknown }>(
    `select key, value from iris.app_settings where key in ('ops.escalate_after_breach_hours','ops.escalation_max_level')`,
  );
  const get = (key: string, fallback: number) => {
    const row = settings.rows.find((r) => r.key === key);
    const n = Number(row?.value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const s = { afterBreachHours: get("ops.escalate_after_breach_hours", 4), maxLevel: get("ops.escalation_max_level", 3) };

  const client = await pool.connect();
  let escalated = 0;
  try {
    await client.query("set search_path = iris, public");
    // Candidate tickets: breached, unresolved, still under the level cap, past the window.
    // The level-specific clock (target + afterHours * level) spreads consecutive levels out.
    const candidates = (
      await client.query<EscalationRow>(
        `select t.id, t.title, t.status, t.escalation_level, t.sla_resolution_target, t.assignee_id,
                m.id  as manager_id, m.name as manager_name,
                h.id as dept_head_id
           from tickets t
           left join employees m on m.name = (select e.reporting_manager from employees e where e.id = t.assignee_id)
                                and m.is_active and not m.exclude_from_escalation
           left join departments d on d.code = t.department_code
           left join employees h on h.id = d.head_employee_id and h.is_active and not h.exclude_from_escalation
          where t.status not in ('resolved','closed')
            and t.sla_status = 'breached'
            and t.sla_resolution_target is not null
            and t.escalation_level < $1
            and t.sla_resolution_target < now() - interval '1 hour' * $2 * (t.escalation_level + 1)`,
        [s.maxLevel, s.afterBreachHours],
      )
    ).rows;

    for (const t of candidates) {
      const decision = escalationDecision(
        {
          status: t.status,
          slaStatus: "breached",
          slaResolutionTarget: t.sla_resolution_target,
          escalationLevel: t.escalation_level,
        },
        s,
        new Date(),
      );
      if (!decision.escalate) continue;
      if (dry) {
        escalated++;
        continue;
      }

      const nextLevel = decision.nextLevel;
      const targetId = nextLevel === 1 ? t.manager_id : nextLevel === 2 ? t.dept_head_id : null;
      const targetRole = nextLevel === 1 ? "manager" : nextLevel === 2 ? "department_head" : "admin";
      const reason = escalationReason(nextLevel, s.afterBreachHours);

      // Claim with a conditional update on the exact current level — the idempotency lock.
      const claimed = await client.query<{ id: string }>(
        `update tickets
            set escalation_level = $2,
                assignee_id = coalesce($3, assignee_id),
                updated_at = now()
          where id = $1 and escalation_level = $4
          returning id`,
        [t.id, nextLevel, targetId, t.escalation_level],
      );
      if (!claimed.rowCount) continue;

      await client.query(
        `insert into escalation_log (ticket_id, escalation_level, escalated_to_role, escalated_to_employee_id, reason, automatic)
         values ($1, $2, $3, $4, $5, true)`,
        [t.id, nextLevel, targetRole, targetId, reason],
      );
      await client.query(
        `insert into ticket_activities (ticket_id, activity_type, description, actor_name)
         values ($1, 'escalated', $2, 'IRIS')`,
        [t.id, `${reason} ${targetLabel(nextLevel, t.manager_name)}`],
      );
      escalated++;
      await notifyTicketEventNow("escalated", { id: t.id, title: t.title, escalationLevel: nextLevel }, null, {
        dedupe: `escalation:${nextLevel}`,
      });
    }
    return escalated;
  } finally {
    client.release();
  }
}
