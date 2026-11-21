import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** The equipment register with fault history. RLS: managers see all studios, others their own. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const data = await withUser(auth.session.user_id, async (c) => {
      const items = (await c.query("select * from v_equipment_health order by faults_90d desc, faults_total desc, label")).rows;
      const faults = (
        await c.query(
          `select et.equipment_id, t.id, t.ticket_id, t.title, t.status, t.priority, t.created_at, t.resolved_at
             from equipment_tickets et join tickets t on t.id = et.ticket_id
            order by t.created_at desc`,
        )
      ).rows;
      const byItem = new Map<string, typeof faults>();
      for (const f of faults) {
        const list = byItem.get(f.equipment_id) ?? [];
        if (list.length < 12) list.push(f);
        byItem.set(f.equipment_id, list);
      }
      return items.map((i) => ({
        ...i,
        avg_repair_h: i.avg_repair_h === null ? null : Number(i.avg_repair_h),
        replace_candidate: i.faults_90d >= 3 || i.rechecks_failed >= 2,
        faults: (byItem.get(i.id) ?? []).map(({ equipment_id: _e, ...f }) => f),
      }));
    });
    return NextResponse.json({ items: data, canEdit: auth.session.role !== "executive" });
  } catch (err) {
    return dbError(err);
  }
}

/** Managers/admins: { id, changes: { status?, model?, serial?, notes?, label? } }. */
export async function PATCH(request: NextRequest) {
  const auth = await requireSession({ manager: true });
  if ("error" in auth) return auth.error;
  const b = (await request.json().catch(() => ({}))) as { id?: unknown; changes?: Record<string, unknown> };
  if (typeof b.id !== "string" || !b.changes || typeof b.changes !== "object") {
    return NextResponse.json({ error: "id and changes are required" }, { status: 400 });
  }
  const sets: string[] = [];
  const vals: unknown[] = [];
  const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  const ch = b.changes;
  if (ch.status !== undefined) {
    if (!["in_service", "out_of_service", "retired"].includes(String(ch.status))) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    set("status", ch.status);
  }
  for (const col of ["model", "serial", "notes", "label"] as const) {
    if (ch[col] !== undefined) {
      const v = String(ch[col] ?? "").trim().slice(0, col === "notes" ? 2000 : 120);
      if (col === "label" && !v) return NextResponse.json({ error: "Label can't be empty" }, { status: 400 });
      set(col, v || null);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(b.id);
  try {
    const row = await withUser(auth.session.user_id, async (c) =>
      (await c.query(`update equipment set ${sets.join(", ")}, updated_at = now() where id = $${vals.length} returning id`, vals)).rows[0],
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
