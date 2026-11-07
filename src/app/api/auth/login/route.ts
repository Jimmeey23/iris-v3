import { NextResponse } from "next/server";
import { asSystem } from "@/lib/server/db";
import { dbError, setSessionCookie } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const ua = request.headers.get("user-agent");
  try {
    const rows = await asSystem(async (c) =>
      (await c.query("select * from iris.login($1, $2, $3::inet, $4)", [email, password, ip, ua])).rows,
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    await setSessionCookie(row.session_token);
    return NextResponse.json({ mustChangePassword: row.must_change_password });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "28P01") return NextResponse.json({ error: e.message }, { status: 401 });
    return dbError(err);
  }
}
