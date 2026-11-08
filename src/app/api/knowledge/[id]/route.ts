import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { docColumns, docFromRow, storableDocColumns, updateSql, validId } from "@/lib/server/library";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/knowledge/[id]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const row = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select * from knowledge_docs where id = $1", [id])).rows[0],
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ doc: docFromRow(row) });
  } catch (err) {
    return dbError(err);
  }
}

/** Edit a document (manager/admin via RLS). Send only the fields that changed. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/knowledge/[id]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const b = await request.json().catch(() => ({}));
  const { cols, error } = docColumns(b, false);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!Object.keys(cols).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  try {
    const row = await withUser(auth.session.user_id, async (c) => {
      const storable = await storableDocColumns(c, cols);
      // Only a sub-category change, and the database can't store it yet: nothing to write.
      if (!Object.keys(storable).length) return (await c.query("select * from knowledge_docs where id = $1", [id])).rows[0];
      const q = updateSql("knowledge_docs", "id", id, storable);
      return (await c.query(q.text, q.values)).rows[0];
    });
    if (!row) return NextResponse.json({ error: "Not found, or you don't have permission to edit documents" }, { status: 404 });
    return NextResponse.json({ doc: docFromRow(row) });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/knowledge/[id]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const n = await withUser(auth.session.user_id, async (c) =>
      (await c.query("delete from knowledge_docs where id = $1", [id])).rowCount,
    );
    if (!n) return NextResponse.json({ error: "Not found, or you don't have permission to delete documents" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
