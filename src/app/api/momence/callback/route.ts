import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/momence?error=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  // In production: exchange code for token, store in DB
  // For now: redirect back to Momence settings with success
  return NextResponse.redirect(new URL(`/settings?momence_connected=true&code=${code}`, req.url));
}
