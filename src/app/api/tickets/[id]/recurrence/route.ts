import { NextResponse, type NextRequest } from "next/server";
import { asSystem, withUser } from "@/lib/server/db";
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
    const { self } = await withUser(auth.session.user_id, async (c) => ({
      // Proves the caller can see this ticket (RLS) and gives the original's number.
      self: (await c.query(
        `select t.id, coalesce(t.metadata #>> '{recurrence_check,parent_ticket}',
                              t.metadata #>> '{legacy,custom_fields,parentTicketNumber}') as parent_ticket
           from tickets t where t.id = $1 or t.ticket_id = $1 limit 1`,
        [id],
      )).rows[0] ?? null,
    }));

    // When this ticket is a check: the original ticket, who reported it, when it was
    // created and resolved, and its full activity log. Read as system: the check's
    // assignee (the original reporter) may not otherwise have access to the original,
    // but the check is about that ticket, so its history is shown read-only here.
    if (!self) return NextResponse.json({ checks: [], origin: null });
    // Same reason as below: the parent may be outside the caller's RLS scope.
    const checks = await asSystem(async (c) => (await c.query(
      `select rc.id, rc.kind, rc.cycle, rc.step, rc.day_offset, rc.due_at, rc.status, rc.outcome_note, rc.outcome_at,
              p.ticket_id as parent_ticket, k.ticket_id as check_ticket,
              (k.id = $1) as is_this_ticket
         from iris.recurrence_checks rc
         join iris.tickets p on p.id = rc.parent_ticket_id
         left join iris.tickets k on k.id = rc.check_ticket_id
        where rc.check_ticket_id = $1 or rc.parent_ticket_id = $1
        order by rc.cycle, rc.step`,
      [self.id],
    )).rows);

    let origin = null;
    if (self.parent_ticket) {
      origin = await asSystem(async (c) => {
        const p = (await c.query(
          `select p.id, p.ticket_id, p.title, p.status, p.created_at, p.resolved_at,
                  coalesce(e.name, p.metadata #>> '{legacy,created_by_name}') as reported_by,
                  a.name as assignee
             from iris.tickets p
             left join iris.employees e on e.id = p.reporter_id
             left join iris.employees a on a.id = p.assignee_id
            where p.ticket_id = $1 limit 1`,
          [self.parent_ticket],
        )).rows[0];
        if (!p) return null;
        // resolved_at is cleared on reopen; fall back to when this cycle was resolved.
        if (!p.resolved_at) {
          p.resolved_at = (await c.query(
            `select metadata #>> '{recurrence_check,parent_resolved_at}' as r from iris.tickets where id = $1`, [self.id],
          )).rows[0]?.r ?? null;
        }
        p.history = (await c.query(
          `select activity_type as type, description, actor_name as actor, created_at as at
             from iris.ticket_activities where ticket_id = $1 order by created_at`,
          [p.id],
        )).rows;
        return p;
      });
    }
    return NextResponse.json({ checks, origin });
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
