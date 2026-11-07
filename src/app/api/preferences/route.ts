import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const patch = await request.json().catch(() => null);
  if (!patch || typeof patch !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const row = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select * from save_preferences($1::jsonb)", [JSON.stringify(patch)])).rows[0],
    );
    return NextResponse.json({ preferences: row });
  } catch (err) {
    return dbError(err);
  }
}
