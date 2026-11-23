import { NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";
import { type SweepJob } from "@/lib/iris/ops-policy";

export const dynamic = "force-dynamic";

/**
 * Liveness, database reachability, and - for a signed-in administrator - whether the
 * background work is actually running. Ported from iris-ai-v2's /api/health.
 *
 * The public answer stays what it was: `ok`, `db`, commit and environment, no writes
 * and nothing secret, so an uptime monitor (Better Stack, UptimeRobot, Vercel Checks)
 * can hit it freely. The sweeps ride on ordinary requests and the cron history lives
 * in whatever scheduler is configured, so an administrator asking "did the outbox
 * drain, did escalation run" has nowhere else to look. That detail is added for an
 * administrator only: a backlog count is reconnaissance for anybody else.
 */
const n = (value: unknown) => Number(value ?? 0);

// The public answer is polled by monitors; one database ping per ~10s per instance is plenty.
const PING_TTL_MS = 10_000;
let pingCache: { at: number; ok: boolean } | null = null;
async function pingDb() {
  if (pingCache && Date.now() - pingCache.at < PING_TTL_MS) return pingCache.ok;
  try {
    await pool.query("select 1");
    pingCache = { at: Date.now(), ok: true };
  } catch (error) {
    console.error("[health] database check failed:", error instanceof Error ? error.message : error);
    pingCache = { at: Date.now(), ok: false };
  }
  return pingCache.ok;
}

export async function GET() {
  const meta = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  };
  try {
    const user = await getSession().catch(() => null);
    if (user?.role !== "admin") {
      // Commit SHA is only for signed-in callers; the public answer is just up/down.
      const up = await pingDb();
      return NextResponse.json(
        { ok: up, db: up ? "up" : "down", ...(user ? meta : { env: meta.env }) },
        { status: up ? 200 : 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    await pool.query("select 1");

    const [outbox, escalations, sweeps] = await Promise.all([
      pool.query<{ pending: number; sending: number; failed: number; oldest_pending: string | null }>(
        `select
           count(*) filter (where status = 'pending')::int  as pending,
           count(*) filter (where status = 'sending')::int  as sending,
           count(*) filter (where status = 'failed')::int   as failed,
           min(created_at) filter (where status = 'pending') as oldest_pending
         from iris.outbox`,
      ),
      pool.query<{ open_breached: number; escalated_open: number }>(
        `select
           count(*) filter (where sla_status = 'breached')::int as open_breached,
           count(*) filter (where escalation_level > 0)::int    as escalated_open
         from iris.tickets
         where status not in ('resolved','closed')`,
      ),
      pool.query<{ key: string; at: string | null }>(
        `select key, value ->> 'at' as at from iris.app_settings where key like 'sweep:%'`,
      ),
    ]);

    const markers = sweeps.rows;
    const lastSweeps = Object.fromEntries(
      markers
        .filter((row) => row.key.startsWith("sweep:"))
        .map((row) => [row.key.slice("sweep:".length) as SweepJob, row.at]),
    );
    const b = outbox.rows[0];

    return NextResponse.json(
      {
        ok: true,
        db: "up",
        ...meta,
        outbox: {
          pending: n(b?.pending),
          sending: n(b?.sending),
          failed: n(b?.failed),
          oldestPending: b?.oldest_pending ?? null,
        },
        sla: {
          openBreached: n(escalations.rows[0]?.open_breached),
          openEscalated: n(escalations.rows[0]?.escalated_open),
        },
        lastSweeps,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database check failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, db: "down", env: meta.env }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
