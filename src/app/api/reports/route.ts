import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REPORT_SPECS, reportAvailability } from "@/lib/server/report-engine";

export const dynamic = "force-dynamic";

/** Which reports have real data behind them, and why the rest don't. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  return NextResponse.json({
    availability: Object.fromEntries(Object.keys(REPORT_SPECS).map((code) => [code, reportAvailability(code)])),
  });
}
