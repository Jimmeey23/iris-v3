import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { notifyTicketEvent } from "@/lib/server/notify";
import { dbError, requireSession } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/tickets/[id]/comments">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  // Cheap to write, but each comment can fan out to email — the limit stops a script
  // from turning the studio's inboxes into a mailbomb.
  try {
    await enforceRateLimit("ticket-write", userKey(session.user_id));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429, headers: { "Retry-After": String(e.resetsInSec) } });
    }
    return NextResponse.json({ error: "Try again in a moment." }, { status: 503 });
  }
  const { id } = await ctx.params;
  const b = await request.json().catch(() => ({}));
  const content = typeof b.content === "string" ? b.content.trim().slice(0, 10000) : "";
  if (!content) return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
  try {
    const comment = await withUser(session.user_id, async (c) => {
      const name =
        (await c.query("select name from employees where id = $1", [session.employee_id])).rows[0]?.name ?? session.email;
      const { rows } = await c.query(
        `insert into ticket_comments (ticket_id, author_user_id, author_name, content, is_internal)
         values ($1, $2, $3, $4, $5)
         returning id, author_name as author, content, is_internal as "isInternal", created_at as timestamp`,
        [id, session.user_id, name, content, b.isInternal !== false],
      );
      return rows[0];
    });
    notifyTicketEvent("comment_added", { id, title: "" }, session, {
      comment: { author: comment.author, content: comment.content, isInternal: comment.isInternal },
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}
