import { NextResponse, type NextRequest } from "next/server";
import { authorisedCron } from "@/lib/server/cron-auth";
import { syncTrainerReviews } from "@/lib/server/trainer-reviews";

/**
 * Back-fill of every Fillout / Zite trainer review not already on file. Webhooks deliver in
 * real time; this catches anything a webhook missed. Safe to run as often as you like:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/trainer-reviews
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: NextRequest) {
  const ok = authorisedCron(req);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncTrainerReviews());
  } catch (err) {
    console.error("[cron/trainer-reviews]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
