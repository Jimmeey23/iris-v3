import { NextResponse, type NextRequest } from "next/server";
import { authorisedCron } from "@/lib/server/cron-auth";
import { deliverPending } from "@/lib/server/outbox";
import { sweepRateLimits } from "@/lib/server/rate-limit";
import { applyEscalations, runSlaSweep } from "@/lib/server/sweeps";

/**
 * Background-work backstop, ported from iris-ai-v2's /api/cron/outbox. Call every
 * ~5-15 minutes (Vercel Cron, GitHub Actions, system crontab):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/outbox
 * (header `x-cron-secret: $CRON_SECRET` also works).
 *
 * The request-driven sweeps (lib/sweeps) do most of the work while anyone is using the
 * app; this route is what drains the outbox and moves SLA/escalation forward on a day
 * when nobody signs in. One run:
 *   1. runs the SLA transition + escalation sweep (so anything it queues is already
 *      in the outbox before the drain below),
 *   2. drains the outbox in a larger batch than the request-driven sweep allows,
 *   3. drops expired rate-limit windows.
 */
export const dynamic = "force-dynamic";

async function cron(req: NextRequest) {
  const ok = authorisedCron(req);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const started = Date.now();
    const sla = await runSlaSweep();
    const escalations = await applyEscalations();
    const outbox = await deliverPending({ limit: 50 });
    const swept = await sweepRateLimits();
    console.log(
      `[cron/outbox] sla(${sla.breached.length}b/${sla.atRisk.length}r) esc=${escalations} ` +
        `outbox(${outbox.succeeded}s/${outbox.retrying}r/${outbox.failed}f/${outbox.released}rel) rl=${swept} ${Date.now() - started}ms`,
    );
    return NextResponse.json({
      sla: { breached: sla.breached.length, atRisk: sla.atRisk.length },
      escalations,
      outbox,
      rateLimitsSwept: swept,
    });
  } catch (err) {
    console.error("[cron/outbox]", err);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}

export const GET = cron;
export const POST = cron;
