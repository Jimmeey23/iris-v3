import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { googleConfigured, redirectUri } from "@/lib/server/google-auth";

/** For Settings: is Google sign-in configured, and which redirect URI to register. */
export async function GET(request: Request) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  return NextResponse.json({ configured: googleConfigured(), redirectUri: redirectUri(request.url) });
}
