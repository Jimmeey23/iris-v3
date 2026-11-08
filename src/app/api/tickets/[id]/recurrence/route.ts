import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Recurrence check on a repaired bike or microphone.
 *   GET  → the check this ticket is (or the checks hanging off it, for the original).
 *   POST { outcome: "clear" | "returned", note } → records the outcome on a check ticket.
 *        "returned" reopens the original ticket; "clear" schedules the next check.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/tickets/[id]/recurrence">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const checks = await withUser(auth.session.user_id, async (c) =>
      (await c.query(
        `select rc.id, rc.kind, rc.cycle, rc.step, rc.day_offset, rc.due_at, rc.status, rc.outcome_note, rc.outcome_at,
                p.ticket_id as parent_ticket, k.ticket_id as check_ticket,
                (k.id = t.id) as is_this_ticket
           from tickets t
           join recurrence_checks rc on rc.check_ticket_id = t.id or rc.parent_ticket_id = t.id
           join tickets p on p.id = rc.parent_ticket_id
           left join tickets k on k.id = rc.check_ticket_id
          where t.id = $1 or t.ticket_id = $1
          order by rc.cycle, rc.step`,
        [id],
      )).rows,
    );
    return NextResponse.json({ checks });
  } catch (err) {
    return dbError(err);
  }
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/tickets/[id]/recurrence">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const b = (await request.json().catch(() => ({}))) as { outcome?: unknown; note?: unknown };
  if (b.outcome !== "clear" && b.outcome !== "returned") {
    return NextResponse.json({ error: "outcome must be clear or returned" }, { status: 400 });
  }
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 2000) : "";
  try {
    const result = await withUser(auth.session.user_id, async (c) => {
      const row = (await c.query("select id from tickets where id = $1 or ticket_id = $1", [id])).rows[0];
      if (!row) return null;
      return (await c.query("select iris.record_recurrence_outcome($1, $2, $3) as r", [row.id, b.outcome, note])).rows[0].r;
    });
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    return dbError(err);
  }
}
