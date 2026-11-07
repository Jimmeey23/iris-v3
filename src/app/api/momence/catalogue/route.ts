import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REGIONS, type Region } from "@/lib/server/momence";
import { section, getMembershipCatalogue } from "@/lib/server/momence-extra";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const r = req.nextUrl.searchParams.get("region") as Region | null;
  return NextResponse.json(await section(() => getMembershipCatalogue(r && REGIONS.includes(r) ? r : undefined)));
}
