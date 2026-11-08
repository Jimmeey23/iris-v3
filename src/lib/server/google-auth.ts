import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Google sign-in (OpenID Connect, authorization-code flow) without Supabase.
 *
 * The ID token is taken straight from Google's token endpoint over TLS in
 * exchange for our client secret, which OIDC Core §3.1.3.7 accepts in place of
 * a signature check. We still check issuer, audience, expiry, nonce and that
 * Google has verified the email.
 *
 * Access rules match IRIS v2 (see iris.login_google): linked account, else an
 * invited/imported row with the same email, else self-provision for an
 * allow-listed address that belongs to an active employee.
 */

export const OAUTH_COOKIE = "iris_oauth";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Domains whose people may self-provision. Same default as v2. */
export function allowedEmailDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "physique57india.com")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/** Individual addresses outside those domains that may self-provision. */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "jimmeeygondaa@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function redirectUri(requestUrl: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin;
  return new URL("/api/auth/google/callback", base).toString();
}

export function newOAuthState() {
  return { state: randomBytes(24).toString("hex"), nonce: randomBytes(24).toString("hex") };
}

export function authorizeUrl(requestUrl: string, state: string, nonce: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri(requestUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account");
  // `hd` only steers the account picker; dropped when individual addresses are
  // allow-listed so Google still shows them. The real check is server-side.
  const [hd] = allowedEmails().length > 0 ? [] : allowedEmailDomains();
  if (hd) url.searchParams.set("hd", hd);
  return url.toString();
}

export function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

export async function exchangeCode(requestUrl: string, code: string, nonce: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(requestUrl),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("no id_token");
  const payload = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8"));
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com")
    throw new Error("bad issuer");
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("bad audience");
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) throw new Error("expired");
  if (typeof payload.nonce !== "string" || !safeEqual(payload.nonce, nonce)) throw new Error("bad nonce");
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new Error("email not verified");
  return {
    sub: String(payload.sub),
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
