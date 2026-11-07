import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event || body.type;
    
    // Log webhook for audit
    console.log("[Momence Webhook]", event, body);

    // Route to appropriate handler based on event type
    switch (event) {
      case "member.created":
      case "member.updated":
        // Update member cache
        break;
      case "membership.frozen":
      case "membership.unfrozen":
        // Update ticket if linked
        break;
      case "session.cancelled":
        // Notify affected members
        break;
      case "booking.created":
      case "booking.cancelled":
        // Update booking cache
        break;
      case "payment.succeeded":
      case "payment.failed":
      case "payment.refunded":
        // Update transaction records
        break;
      default:
        console.log("[Momence Webhook] Unhandled event:", event);
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("[Momence Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
