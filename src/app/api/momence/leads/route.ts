import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REGIONS, type Region } from "@/lib/server/momence";
import { section, listLeads } from "@/lib/server/momence-extra";

/** GET /api/momence/leads?region=mum&q=&sourceId=&stageId= */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const p = req.nextUrl.searchParams;
  const region = (p.get("region") ?? "mum") as Region;
  if (!REGIONS.includes(region)) return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  return NextResponse.json(
    await section(() => listLeads({ region, query: p.get("q") ?? undefined, sourceId: p.get("sourceId") ?? undefined, stageId: p.get("stageId") ?? undefined })),
  );
}
