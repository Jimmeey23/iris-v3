import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { runHealthChecks } from "@/lib/server/health-checks";

export type { HealthIssue } from "@/lib/server/health-checks";

export const dynamic = "force-dynamic";

/** Settings → Health Check. Managers and admins; access checks are admin-only. */
export async function GET() {
  const auth = await requireSession({ manager: true });
  if ("error" in auth) return auth.error;
  try {
    const issues = await withUser(auth.session.user_id, (c) => runHealthChecks(c, auth.session.role));
    return NextResponse.json({ issues, checkedAt: new Date().toISOString() });
  } catch (err) {
    return dbError(err);
  }
}
