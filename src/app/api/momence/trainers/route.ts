import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { listTrainers } from "@/lib/server/momence";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json({ trainers: await listTrainers(req.nextUrl.searchParams.get("q") ?? "") });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
