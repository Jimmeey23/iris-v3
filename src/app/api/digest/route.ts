import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { digestFor, digestRecipients, renderDigest, sendWeeklyDigests } from "@/lib/server/weekly-digest";

export const dynamic = "force-dynamic";

/** GET: the caller's own digest as it would be emailed (HTML preview). Managers and admins. */
export async function GET(_req: NextRequest) {
  const auth = await requireSession({ manager: true });
  if ("error" in auth) return auth.error;
  const me = (await digestRecipients()).find((r) => r.user_id === auth.session.user_id);
  if (!me) return NextResponse.json({ error: "No digest for this account" }, { status: 404 });
  const mail = renderDigest(await digestFor(me), me.name, process.env.NEXT_PUBLIC_APP_URL || new URL(_req.url).origin);
  return new NextResponse(mail.html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

/** POST: email the caller their own digest now (a test send; doesn't affect Monday's). */
export async function POST() {
  const auth = await requireSession({ manager: true });
  if ("error" in auth) return auth.error;
  const result = await sendWeeklyDigests({ force: true, onlyUserId: auth.session.user_id });
  if (!result.queued) {
    return NextResponse.json({ error: result.skipped === "email not configured" ? "Email isn't configured, so nothing can be sent." : "Couldn't build your digest." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, to: auth.session.email });
}
