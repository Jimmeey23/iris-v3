import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { pool } from "@/lib/server/db";
import { notifyTicketEventNow } from "@/lib/server/notify";

/**
 * SLA sweep. Call every ~5-15 minutes (Vercel Cron, GitHub Actions, curl):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/sla
 * (header `x-cron-secret: $CRON_SECRET` also works). `?dry=1` only reports candidates.
 *
 * Marks open tickets at_risk (75% of the resolution window elapsed) or breached (target passed)
 * and notifies once per transition; the notification dedupe key includes the SLA target, so a
 * re-run never re-sends.
 */
export const dynamic = "force-dynamic";

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const given = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function sweep(req: NextRequest) {
  const ok = authorised(req);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dry = req.nextUrl.searchParams.get("dry") === "1";

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
    } else {
      await client.query("begin");
      breached = (await client.query(`update tickets set sla_status = 'breached' where ${breachedWhere} returning id, sla_resolution_target as target`)).rows;
      atRisk = (await client.query(`update tickets set sla_status = 'at_risk' where ${riskWhere} returning id, sla_resolution_target as target`)).rows;
      await client.query("commit");
    }

    if (!dry) {
      for (const [event, list] of [["sla_breached", breached], ["sla_at_risk", atRisk]] as const) {
        for (const r of list) {
          await notifyTicketEventNow(event, { id: r.id, title: "" }, null, { dedupe: `sla:${new Date(r.target).toISOString()}` });
        }
      }
    }
    return NextResponse.json({ dry, breached: breached.length, atRisk: atRisk.length });
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error("[cron/sla]", err);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export const GET = sweep;
export const POST = sweep;
