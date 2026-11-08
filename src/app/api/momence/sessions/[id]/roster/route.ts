import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { section, getSessionRoster } from "@/lib/server/momence-extra";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const id = (await ctx.params).id;
  try {
    return NextResponse.json(await section(() => getSessionRoster(id, true, req.nextUrl.searchParams.get("all") === "1")));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
