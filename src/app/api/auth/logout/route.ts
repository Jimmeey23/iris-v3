import { NextResponse } from "next/server";
import { asSystem } from "@/lib/server/db";
import { clearSessionCookie, getSessionToken } from "@/lib/server/auth";

export async function POST() {
  const token = await getSessionToken();
  if (token) await asSystem((c) => c.query("select iris.logout($1)", [token])).catch(() => {});
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
