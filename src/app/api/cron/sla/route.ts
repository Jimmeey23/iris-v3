import { NextResponse, type NextRequest } from "next/server";
import { authorisedCron } from "@/lib/server/cron-auth";
import { pool } from "@/lib/server/db";
import { runSlaSweep } from "@/lib/server/sweeps";

/**
 * SLA sweep. Call every ~5-15 minutes (Vercel Cron, GitHub Actions, curl):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/sla
 * (header `x-cron-secret: $CRON_SECRET` also works). `?dry=1` only reports candidates.
 *
 * Marks open tickets at_risk (75% of the resolution window elapsed) or breached (target
 * passed) and notifies once per transition; the notification dedupe key includes the SLA
 * target, so a re-run never re-sends.
 *
 * The sweep logic itself lives in lib/server/sweeps so the request-driven sweeps and
 * /api/cron/outbox share this exact implementation. Note escalation does NOT run here —
 * use /api/cron/outbox for the combined pass.
 */
export const dynamic = "force-dynamic";

async function sweep(req: NextRequest) {
  const ok = authorisedCron(req);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  try {
    const result = await runSlaSweep({ dry });
    // Backstop for bike/mic recurrence checks on days nobody signs in to drive the sweep.
    const raised = dry
      ? 0
      : Number((await pool.query("select iris.materialize_recurrence_checks() as n")).rows[0]?.n ?? 0);
    return NextResponse.json({ dry, breached: result.breached.length, atRisk: result.atRisk.length, recurrenceChecksRaised: raised });
  } catch (err) {
    console.error("[cron/sla]", err);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}

export const GET = sweep;
export const POST = sweep;
