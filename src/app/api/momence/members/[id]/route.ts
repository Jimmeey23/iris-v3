import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { getMemberDetails } from "@/lib/server/momence";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json(await getMemberDetails((await ctx.params).id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
