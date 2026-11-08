import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";

/**
 * Admin-only: send an instant in-app nudge to a ticket's owners (or chosen
 * employees) asking them to close the ticket on priority.
 * Body: { employeeIds?: string[]; message?: string }
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/tickets/[id]/nudge">) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const { session } = auth;
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
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 500) : "";
  const requested: string[] = Array.isArray(b.employeeIds)
    ? b.employeeIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 50)
    : [];

  const client = await pool.connect();
  try {
    await client.query("set search_path = iris, public");
    const t = (
      await client.query(
        "select id, ticket_id, title, priority, status, assignee_id, assignee_ids from tickets where id = $1 or ticket_id = $1 limit 1",
        [id],
      )
    ).rows[0];
    if (!t) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const owners: string[] = [...new Set([t.assignee_id, ...(t.assignee_ids ?? [])].filter(Boolean))];
    const targets = requested.length ? requested : owners;
    if (!targets.length) return NextResponse.json({ error: "This ticket has no owner to nudge" }, { status: 400 });

    const { rows: people } = await client.query(
      `select e.id, e.name, u.id as user_id
         from employees e left join users u on u.employee_id = e.id and u.is_active is not false
        where e.id = any($1)`,
      [targets],
    );
    const actorName =
      (await client.query("select name from employees where id = $1", [session.employee_id])).rows[0]?.name ?? session.email;

    const title = `Nudge: please close ${t.ticket_id} on priority`;
    const body = message || `${actorName} is asking you to resolve "${t.title}" as a priority.`;
    const sent: string[] = [];
    const skipped: string[] = [];
    for (const p of people) {
      if (!p.user_id) {
        skipped.push(p.name);
        continue;
      }
      await client.query("select create_notification($1, $2, $3, $4, $5, $6)", [
        p.user_id,
        "critical",
        title,
        body,
        t.id,
        t.priority ?? "P2",
      ]);
      sent.push(p.name);
    }
    if (sent.length) {
      await client
        .query(
          `insert into ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
           values ($1, 'nudge', $2, $3, $4)`,
          [t.id, `Nudged ${sent.join(", ")} to close on priority`, session.user_id, actorName],
        )
        .catch(() => {});
    }
    return NextResponse.json({ sent, skipped });
  } catch (err) {
    return dbError(err);
  } finally {
    client.release();
  }
}
