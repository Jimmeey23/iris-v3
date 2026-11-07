import { NextResponse } from "next/server";
import { asSystem, withUser } from "@/lib/server/db";
import { dbError, requireSession, setSessionCookie } from "@/lib/server/auth";

export async function POST(request: Request) {
  const auth = await requireSession({ allowPasswordChange: true });
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const body = await request.json().catch(() => ({}));
  const oldPassword = String(body.oldPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 10) {
    return NextResponse.json({ error: "New password must be at least 10 characters" }, { status: 400 });
  }
  if (newPassword === oldPassword) {
    return NextResponse.json({ error: "Choose a different password" }, { status: 400 });
  }
  try {
    await withUser(session.user_id, (c) =>
      c.query("select iris.change_password($1, $2, $3)", [session.user_id, oldPassword, newPassword]),
    );
    // change_password revokes every session; sign straight back in.
    const rows = await asSystem(async (c) =>
      (await c.query("select session_token from iris.login($1, $2)", [session.email, newPassword])).rows,
    );
    if (rows[0]) await setSessionCookie(rows[0].session_token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
