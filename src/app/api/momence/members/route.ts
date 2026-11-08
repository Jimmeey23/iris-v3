import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REGIONS, listMembers, searchMembers, type Region } from "@/lib/server/momence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const p = req.nextUrl.searchParams;
  const q = p.get("q") ?? "";
  const isDirectoryList = p.get("list") === "1";

  try {
    if (isDirectoryList) {
      const regionParam = p.get("region") ?? "all";
      const region: Region | "all" =
        regionParam === "all" || REGIONS.includes(regionParam as Region) ? (regionParam as Region | "all") : "all";
      const page = Math.max(0, Number(p.get("page") ?? 0) || 0);
      const pageSize = Math.min(100, Math.max(1, Number(p.get("pageSize") ?? 25) || 25));
      const out = await listMembers({ region, page, pageSize, query: q });
      return NextResponse.json({
        members: out.members,
        totalCount: out.totalCount,
        page,
        pageSize,
        configuredRegions: out.configured,
      });
    }

    return NextResponse.json({ members: await searchMembers(q) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
