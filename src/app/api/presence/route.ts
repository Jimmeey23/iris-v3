import { NextResponse, type NextRequest } from "next/server";
import { asSystem } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

/** A user counts as online if their last heartbeat is newer than this. */
const ONLINE_SECONDS = 90;

/**
 * POST { view, ticket? }: heartbeat for the signed-in user, returns everyone online
 * (one round trip, so presence costs one small request per user per minute).
 * DELETE: mark the user offline (sign out / tab close).
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { view?: unknown; ticket?: unknown };
  const view = String(body.view ?? "").slice(0, 40) || "overview";
  const ticket = body.ticket ? String(body.ticket).slice(0, 40) : null;
  try {
    const online = await asSystem(async (c) => {
      await c.query(
        `insert into iris.user_presence (user_id, view, ticket_ref, last_seen) values ($1, $2, $3, now())
         on conflict (user_id) do update set view = excluded.view, ticket_ref = excluded.ticket_ref, last_seen = now()`,
        [auth.session.user_id, view, ticket],
      );
      return (
        await c.query(
          `select p.user_id, p.view, p.ticket_ref, p.last_seen,
                  coalesce(nullif(e.name, ''), nullif(u.name, ''), u.email) as name, u.role
             from iris.user_presence p
             join iris.users u on u.id = p.user_id and u.is_active
             left join iris.employees e on e.id = u.employee_id
            where p.last_seen > now() - interval '1 second' * $1
            order by name`,
          [ONLINE_SECONDS],
        )
      ).rows;
    });
    return NextResponse.json({ online, me: auth.session.user_id });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    await asSystem((c) => c.query("delete from iris.user_presence where user_id = $1", [auth.session.user_id]));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
