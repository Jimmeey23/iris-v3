import { NextResponse } from "next/server";
import { asSystem } from "@/lib/server/db";
import { clearSessionCookie, forgetSession, getSessionToken } from "@/lib/server/auth";

export async function POST() {
  const token = await getSessionToken();
  forgetSession(token);
  if (token) await asSystem((c) => c.query("select iris.logout($1)", [token])).catch(() => {});
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
