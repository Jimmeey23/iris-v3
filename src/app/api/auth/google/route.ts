import { NextResponse } from "next/server";
import { OAUTH_COOKIE, authorizeUrl, googleConfigured, newOAuthState } from "@/lib/server/google-auth";

/** Starts Google sign-in. State and nonce ride in a short-lived httpOnly cookie. */
export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/?auth_error=google_not_configured", request.url));
  }
  const { state, nonce } = newOAuthState();
  const res = NextResponse.redirect(authorizeUrl(request.url, state, nonce));
  res.cookies.set(OAUTH_COOKIE, `${state}.${nonce}`, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
