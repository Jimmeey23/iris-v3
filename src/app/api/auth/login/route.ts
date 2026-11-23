import { NextResponse } from "next/server";
import { asSystemMain as asSystem } from "@/lib/server/db";
import { dbError, setSessionCookie } from "@/lib/server/auth";
import { RateLimitError, clientIp, enforceRateLimit, loginKey } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  // Credential stuffing stops here before it reaches iris.login (10 attempts / 5 min
  // per IP+email pair). Counted even for bad requests with a plausible address.
  const ip = clientIp(request);
  try {
    // IP-wide bucket first: it throttles an attacker across many addresses (and stops
    // them hammering one account into lockout) before any failed_login_count moves.
    if (ip) await enforceRateLimit("login", loginKey(ip, "*"), { max: 30 });
    await enforceRateLimit("login", loginKey(ip, email));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(e.resetsInSec) } },
      );
    }
    // A limiter outage must not lock the building: fail open for this request.
    console.error("[login] rate limiter unavailable:", e);
  }
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
    // Same answer for unknown / inactive / locked / wrong password: nothing to enumerate.
    if (e.code === "28P01") return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    return dbError(err);
  }
}
