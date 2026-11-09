import { NextResponse } from "next/server";
import { asSystem } from "@/lib/server/db";
import { clearSessionCookie, forgetSession, getSessionToken } from "@/lib/server/auth";

export async function POST() {
  const token = await getSessionToken();
  forgetSession(token);
  if (token) {
    await asSystem(async (c) => {
      // Drop presence so the user disappears from "Online now" immediately.
      await c.query("delete from iris.user_presence where user_id = (select user_id from iris.sessions where token_hash = iris.hash_token($1) limit 1)", [token]);
      await c.query("select iris.logout($1)", [token]);
    }).catch(() => {});
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
