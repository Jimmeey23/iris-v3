import { NextResponse } from "next/server";
import { asSystem } from "@/lib/server/db";
import { dbError, setSessionCookie } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, loginKey } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const newPassword = String(body.newPassword ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: "This reset link is invalid. Request a new one." }, { status: 400 });
  }
  if (newPassword.length < 10) {
    return NextResponse.json({ error: "New password must be at least 10 characters" }, { status: 400 });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  try {
    await enforceRateLimit("password-reset", loginKey(ip, "reset"));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }
    console.error("[reset-password] rate limiter unavailable:", e);
  }
  try {
    const session = await asSystem(async (c) => {
      const email = (await c.query("select iris.reset_password_with_token($1, $2, $3::inet) as email", [token, newPassword, ip]))
        .rows[0]?.email as string | null;
      if (!email) return null;
      // reset revoked every session; sign this browser straight in.
      return (
        await c.query("select session_token from iris.login($1, $2, $3::inet, $4)", [email, newPassword, ip, request.headers.get("user-agent")])
      ).rows[0] as { session_token: string } | undefined;
    });
    if (session === null) {
      return NextResponse.json({ error: "This reset link has expired or was already used. Request a new one." }, { status: 400 });
    }
    if (session?.session_token) await setSessionCookie(session.session_token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}
