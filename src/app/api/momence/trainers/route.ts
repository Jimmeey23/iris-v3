import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REGIONS, listTrainers, type Region } from "@/lib/server/momence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const p = req.nextUrl.searchParams;
  const regionParam = p.get("region") ?? "all";
  const region: Region | "all" =
    regionParam === "all" || REGIONS.includes(regionParam as Region) ? (regionParam as Region | "all") : "all";
  try {
    return NextResponse.json({ trainers: await listTrainers(p.get("q") ?? "", region) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
