import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { searchSessions } from "@/lib/server/momence";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const p = req.nextUrl.searchParams;
  try {
    return NextResponse.json({
      sessions: await searchSessions({ query: p.get("q") ?? "", from: p.get("from") ?? undefined, to: p.get("to") ?? undefined }),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
