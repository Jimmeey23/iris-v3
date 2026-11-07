import { NextResponse, type NextRequest } from "next/server";

/**
 * Momence OAuth redirect target. Token exchange isn't enabled yet, so this
 * only sends the user back to the app without leaking the code in the URL.
 */
export async function GET(req: NextRequest) {
  const failed = req.nextUrl.searchParams.has("error") || !req.nextUrl.searchParams.get("code");
  return NextResponse.redirect(new URL(failed ? "/?momence=error" : "/?momence=pending", req.url));
}
