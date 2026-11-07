import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import {
  section, getMemberOverview, getMemberMemberships, getMemberBookings, getMemberAppointments,
  getMemberPayments, getMemberNotes, getMemberTags, getPaymentTransaction,
} from "@/lib/server/momence-extra";

/** GET /api/momence/members/:id/data?section=overview|memberships|bookings|appointments|payments|notes|tags|transaction */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const id = (await ctx.params).id;
  const p = req.nextUrl.searchParams;
  try {
    switch (p.get("section")) {
      case "overview":
        return NextResponse.json(await getMemberOverview(id));
      case "memberships":
        return NextResponse.json(await section(() => getMemberMemberships(id)));
      case "bookings":
        return NextResponse.json(await section(() => getMemberBookings(id, { limit: Number(p.get("limit")) || 30 })));
      case "appointments":
        return NextResponse.json(await section(() => getMemberAppointments(id)));
      case "payments":
        return NextResponse.json(await section(() => getMemberPayments(id)));
      case "notes":
        return NextResponse.json(await section(() => getMemberNotes(id)));
      case "tags":
        return NextResponse.json(await section(() => getMemberTags(id)));
      case "transaction":
        return NextResponse.json(await section(() => getPaymentTransaction(p.get("transactionId") ?? "")));
      default:
        return NextResponse.json({ error: "Unknown section" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
