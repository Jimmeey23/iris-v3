import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { sweepAfterResponse } from "@/lib/server/sweeps";

export const dynamic = "force-dynamic";

/** The signed-in user's notifications (RLS limits rows to their own). */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 30));
  try {
    const out = await withUser(auth.session.user_id, async (c) => {
      const rows = (await c.query(
        `select id, type, title, body, ticket_id as "ticketId", priority, is_read as "isRead", created_at as "createdAt"
           from notifications where user_id = $1 order by created_at desc limit $2`,
        [auth.session.user_id, limit],
      )).rows;
      const unread = (await c.query("select count(*)::int as n from notifications where user_id = $1 and not is_read", [auth.session.user_id])).rows[0].n;
      return { notifications: rows, unreadCount: unread as number };
    });
    // The bell is polled by every open tab - the second hook for the request-driven sweeps.
    sweepAfterResponse();
    return NextResponse.json(out);
  } catch (err) {
    return dbError(err);
  }
}

/** Mark read: { ids: string[] } or { all: true }. */
export async function PATCH(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const b = await request.json().catch(() => ({}));
  const ids = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === "string").slice(0, 200) : [];
  if (!b.all && !ids.length) return NextResponse.json({ error: "Provide ids or all: true" }, { status: 400 });
  try {
    const updated = await withUser(auth.session.user_id, async (c) => {
      const res = b.all
        ? await c.query("update notifications set is_read = true, read_at = now() where user_id = $1 and not is_read", [auth.session.user_id])
        : await c.query("update notifications set is_read = true, read_at = now() where user_id = $1 and not is_read and id = any($2::uuid[])", [auth.session.user_id, ids]);
      return res.rowCount ?? 0;
    });
    return NextResponse.json({ updated });
  } catch (err) {
    return dbError(err);
  }
}
