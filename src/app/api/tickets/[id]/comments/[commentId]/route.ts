import { NextResponse, type NextRequest } from "next/server";
import { asSystem } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Admin-only correction of a note / comment / resolution-log entry that has already been
 * posted. The original text is kept in the audit log, and the ticket's activity timeline
 * records that an admin edited or removed an entry (without repeating its content).
 */
type Ctx = RouteContext<"/api/tickets/[id]/comments/[commentId]">;

async function load(id: string, commentId: string) {
  return asSystem(async (c) =>
    (
      await c.query("select id, content, author_name from iris.ticket_comments where id = $1 and ticket_id = $2", [commentId, id])
    ).rows[0] as { id: string; content: string; author_name: string } | undefined,
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const { id, commentId } = await ctx.params;
  if (!UUID.test(commentId)) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const content = typeof b.content === "string" ? b.content.trim().slice(0, 10000) : "";
  if (!content) return NextResponse.json({ error: "The entry can't be empty. Delete it instead." }, { status: 400 });
  try {
    const before = await load(id, commentId);
    if (!before) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    const comment = await asSystem(async (c) => {
      const { rows } = await c.query(
        `update iris.ticket_comments set content = $3, updated_at = now() where id = $1 and ticket_id = $2
         returning id, author_name as author, content, is_internal as "isInternal", created_at as timestamp`,
        [commentId, id, content],
      );
      await c.query(
        `insert into iris.audit_log (actor_user_id, actor_name, action, entity_type, entity_id, before_state, after_state)
         values ($1, $2, 'comment_edited', 'ticket_comments', $3, $4::jsonb, $5::jsonb)`,
        [auth.session.user_id, auth.session.email, commentId, JSON.stringify({ ticket_id: id, content: before.content }), JSON.stringify({ content })],
      );
      await c.query(
        `insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
         values ($1, 'comment', $2, $3, $4)`,
        [id, `Admin edited a log entry by ${before.author_name}`, auth.session.user_id, auth.session.email],
      );
      return rows[0];
    });
    return NextResponse.json({ comment });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const { id, commentId } = await ctx.params;
  if (!UUID.test(commentId)) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  try {
    const before = await load(id, commentId);
    if (!before) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    await asSystem(async (c) => {
      // Replies hang off their parent; keep them by detaching instead of cascading.
      await c.query("update iris.ticket_comments set parent_comment_id = null where parent_comment_id = $1", [commentId]);
      await c.query("delete from iris.ticket_comments where id = $1 and ticket_id = $2", [commentId, id]);
      await c.query(
        `insert into iris.audit_log (actor_user_id, actor_name, action, entity_type, entity_id, before_state)
         values ($1, $2, 'comment_deleted', 'ticket_comments', $3, $4::jsonb)`,
        [auth.session.user_id, auth.session.email, commentId, JSON.stringify({ ticket_id: id, author: before.author_name, content: before.content })],
      );
      await c.query(
        `insert into iris.ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
         values ($1, 'comment', $2, $3, $4)`,
        [id, `Admin removed a log entry by ${before.author_name}`, auth.session.user_id, auth.session.email],
      );
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
