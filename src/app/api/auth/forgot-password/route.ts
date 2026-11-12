import { NextResponse, after } from "next/server";
import { asSystem } from "@/lib/server/db";
import { sendMail } from "@/lib/server/mailer";
import { RateLimitError, enforceRateLimit, loginKey } from "@/lib/server/rate-limit";
import { resetEmail, resetOrigin } from "@/lib/server/password-reset";

export const dynamic = "force-dynamic";

// Same answer whether or not the account exists, so the form can't be used to find accounts.
const ACCEPTED = { ok: true, message: "If that account exists, we've emailed a link to reset the password." };

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  if (!email) return NextResponse.json({ error: "Enter your work email." }, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  try {
    await enforceRateLimit("password-reset", loginKey(ip, email));
    await enforceRateLimit("password-reset", loginKey(ip, "*"));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many reset requests. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(e.resetsInSec) } },
      );
    }
    console.error("[forgot-password] rate limiter unavailable:", e);
  }

  const origin = resetOrigin();
  if (!origin) {
    console.error("[forgot-password] NEXT_PUBLIC_APP_URL is not set; cannot build a reset link.");
    return NextResponse.json({ error: "Password reset isn't set up yet. Ask an IRIS admin." }, { status: 503 });
  }

  // Look-up, token and email happen after the response, so response time doesn't
  // reveal whether the account exists either.
  after(async () => {
    try {
      const row = (
        await asSystem(async (c) =>
          (await c.query("select token, email, name from iris.request_password_reset($1, $2::inet)", [email, ip])).rows,
        )
      )[0] as { token: string; email: string; name: string | null } | undefined;
      if (!row) return;
      const link = `${origin}/?reset=${encodeURIComponent(row.token)}`;
      await sendMail({ to: row.email, ...resetEmail({ name: row.name, link }), category: "password-reset" });
    } catch (e) {
      console.error("[forgot-password] failed:", e);
    }
  });
  return NextResponse.json(ACCEPTED);
}
