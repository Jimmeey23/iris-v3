import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { REGIONS, type Region } from "@/lib/server/momence";
import { section, listSemesters, listLocations, listAppointmentReservations, probeCapabilities } from "@/lib/server/momence-extra";

/** GET /api/momence/meta?what=semesters|locations|reservations|capabilities&region=mum */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const p = req.nextUrl.searchParams;
  const region = (p.get("region") ?? "mum") as Region;
  if (!REGIONS.includes(region)) return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  switch (p.get("what")) {
    case "semesters":
      return NextResponse.json(await section(() => listSemesters(region)));
    case "locations":
      return NextResponse.json(await section(() => listLocations()));
    case "reservations":
      return NextResponse.json(await section(() => listAppointmentReservations({ region, from: p.get("from") ?? undefined, to: p.get("to") ?? undefined })));
    case "capabilities":
      return NextResponse.json(await section(() => probeCapabilities()));
    default:
      return NextResponse.json({ error: "Unknown 'what'" }, { status: 400 });
  }
}
