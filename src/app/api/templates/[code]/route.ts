import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { templateColumns, templateFromRow, updateSql, validId } from "@/lib/server/library";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/templates/[code]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { code } = await ctx.params;
  try {
    const row = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select * from ticket_templates where code = $1", [code])).rows[0],
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ template: templateFromRow(row) });
  } catch (err) {
    return dbError(err);
  }
}

/** Edit a template (manager/admin via RLS). Send only the fields that changed. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/templates/[code]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { code } = await ctx.params;
  if (!validId(code)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  const b = await request.json().catch(() => ({}));
  const { cols, error } = templateColumns(b, false);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!Object.keys(cols).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  try {
    const row = await withUser(auth.session.user_id, async (c) => {
      const q = updateSql("ticket_templates", "code", code, cols);
      return (await c.query(q.text, q.values)).rows[0];
    });
    // RLS hides rows from non-managers, so "no row" can also mean "not allowed".
    if (!row) return NextResponse.json({ error: "Not found, or you don't have permission to edit templates" }, { status: 404 });
    return NextResponse.json({ template: templateFromRow(row) });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/templates/[code]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { code } = await ctx.params;
  try {
    const n = await withUser(auth.session.user_id, async (c) =>
      (await c.query("delete from ticket_templates where code = $1", [code])).rowCount,
    );
    if (!n) return NextResponse.json({ error: "Not found, or you don't have permission to delete templates" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
