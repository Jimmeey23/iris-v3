import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REGIONS, searchSessions, type Region } from "@/lib/server/momence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const p = req.nextUrl.searchParams;
  const regionParam = p.get("region") ?? "all";
  const region: Region | "all" =
    regionParam === "all" || REGIONS.includes(regionParam as Region) ? (regionParam as Region | "all") : "all";
  const limit = Math.min(200, Math.max(1, Number(p.get("limit") ?? 50) || 50));
  try {
    return NextResponse.json({
      sessions: await searchSessions({
        query: p.get("q") ?? "",
        from: p.get("from") ?? undefined,
        to: p.get("to") ?? undefined,
        limit,
        region,
        types: [...p.getAll("types[]"), ...p.getAll("types"), ...(p.get("types")?.split(",") ?? [])].filter(Boolean),
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
