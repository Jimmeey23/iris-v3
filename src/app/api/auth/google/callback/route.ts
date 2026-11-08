import { NextResponse, type NextRequest } from "next/server";
import { asSystem } from "@/lib/server/db";
import { setSessionCookie } from "@/lib/server/auth";
import {
  OAUTH_COOKIE,
  allowedEmailDomains,
  allowedEmails,
  exchangeCode,
  safeEqual,
} from "@/lib/server/google-auth";

/** Google redirects here. Any failure lands back on the sign-in screen with a fixed code. */
export async function GET(request: NextRequest) {
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/?auth_error=${code}`, request.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return res;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const [expectedState, nonce] = (request.cookies.get(OAUTH_COOKIE)?.value ?? "").split(".");
  if (request.nextUrl.searchParams.get("error") || !code || !state || !expectedState || !nonce) {
    return fail("oauth_failed");
  }
  if (!safeEqual(state, expectedState)) return fail("oauth_failed");

  let profile;
  try {
    profile = await exchangeCode(request.url, code, nonce);
  } catch (err) {
    console.error("[google] sign-in rejected:", (err as Error).message);
    return fail("oauth_failed");
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  try {
    const rows = await asSystem(async (c) =>
      (await c.query(
        "select * from iris.login_google($1, $2, $3, $4, $5::text[], $6::text[], $7::inet, $8)",
        [profile.email, profile.sub, profile.name, profile.picture,
         allowedEmailDomains(), allowedEmails(), ip, request.headers.get("user-agent")],
      )).rows,
    );
    if (!rows[0]) return fail("not_authorised");
    await setSessionCookie(rows[0].session_token);
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return res;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "42501") return fail(e.message === "inactive" ? "inactive" : "not_authorised");
    console.error("[google] session could not be created:", e.message);
    return fail("profile_unavailable");
  }
}
