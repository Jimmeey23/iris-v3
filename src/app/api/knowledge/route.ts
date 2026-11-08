import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { docColumns, docFromRow, insertSql, nextId, storableDocColumns, validId } from "@/lib/server/library";
import { ensureLibrarySynced } from "@/lib/server/library-sync";

/** All knowledge documents (any signed-in user). */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  // Bring newly shipped built-ins into Neon first (fast no-op once current; never throws).
  await ensureLibrarySynced();
  try {
    const rows = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select * from knowledge_docs order by sort_order, id")).rows,
    );
    return NextResponse.json({ docs: rows.map(docFromRow) });
  } catch (err) {
    return dbError(err);
  }
}

/** Create a document (manager/admin via RLS). Body may carry `id`; otherwise KB-NNN is assigned. */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const b = await request.json().catch(() => ({}));
  const { cols, error } = docColumns(b, true);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (b.id !== undefined && !validId(b.id)) {
    return NextResponse.json({ error: "Id must be 2-40 letters, numbers, - or _" }, { status: 400 });
  }
  try {
    const row = await withUser(auth.session.user_id, async (c) => {
      const id = b.id ? String(b.id).toUpperCase() : await nextId(c, "knowledge_docs");
      const top = (await c.query("select coalesce(min(sort_order), 0) - 1 as s from knowledge_docs")).rows[0].s;
      const storable = await storableDocColumns(c, cols);
      const q = insertSql("knowledge_docs", { ...storable, id, sort_order: top, author_user_id: auth.session.user_id });
      return (await c.query(q.text, q.values)).rows[0];
    });
    return NextResponse.json({ doc: docFromRow(row) }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}
