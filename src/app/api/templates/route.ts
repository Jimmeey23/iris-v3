import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { insertSql, nextId, templateColumns, templateFromRow, validId } from "@/lib/server/library";

/** All ticket templates (any signed-in user). */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const rows = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select * from ticket_templates order by sort_order, code")).rows,
    );
    return NextResponse.json({ templates: rows.map(templateFromRow) });
  } catch (err) {
    return dbError(err);
  }
}

/** Create a template (manager/admin via RLS). Body may carry `code`; otherwise TPL-NNN is assigned. */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const b = await request.json().catch(() => ({}));
  const { cols, error } = templateColumns(b, true);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (b.code !== undefined && !validId(b.code)) {
    return NextResponse.json({ error: "Code must be 2-40 letters, numbers, - or _" }, { status: 400 });
  }
  try {
    const row = await withUser(auth.session.user_id, async (c) => {
      const code = b.code ? String(b.code).toUpperCase() : await nextId(c, "ticket_templates");
      const top = (await c.query("select coalesce(min(sort_order), 0) - 1 as s from ticket_templates")).rows[0].s;
      const q = insertSql("ticket_templates", { ...cols, code, sort_order: top, created_by_user_id: auth.session.user_id });
      return (await c.query(q.text, q.values)).rows[0];
    });
    return NextResponse.json({ template: templateFromRow(row) }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}
