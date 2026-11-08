// Knowledge Base — memberships, freezes, payments, refunds, disputes and promotions.
import { article, type KnowledgeArticle } from "./compose";

export const MEMBERSHIPS_PAYMENTS_ARTICLES: KnowledgeArticle[] = [
  article({
    id: "KB-007",
    title: "Membership Freeze Request — Injury or Medical",
    category: "Pricing and Memberships",
    subcategory: "Freezes, Upgrades & Transfers",
    summary:
      "Processing a freeze for injury, illness, pregnancy or another medical reason: check eligibility, collect the right documentation, set an automatic unfreeze, and extend validity correctly.",
    glance: {
      priority: "P3 (P2 if the member is already blocked from booking or being charged)",
      owner: "Memberships / Client Servicing (Memberships Manager for exceptions)",
      respond: "Within 4 hours",
      resolve: "Within 24 hours of receiving documents",
    },
    firstFive: [
      "Check the member's plan, freeze allowance and freeze history in Momence.",
      "Confirm the dates they need and the reason.",
      "Check for classes booked inside the freeze window.",
    ],
    steps: [
      "Verify the membership type and its freeze entitlement (days allowed vs. already used this term).",
      "Check whether the member has already used their annual freeze.",
      "First freeze within the allowance: process it in Momence with the start and end dates.",
      "Second freeze, or beyond the allowance: needs Memberships Manager approval — raise it as an exception with the reason.",
      "Ask for a medical certificate if the absence exceeds 3 consecutive days (doctor's note with dates); for emergencies, allow up to 30 days first and collect the certificate later.",
      "Cancel any classes booked inside the freeze window without late-cancel fees.",
      "Set the automatic unfreeze date in Momence — never rely on someone remembering to unfreeze manually.",
      "Class packs: extend the package validity by the freeze duration.",
      "Pause any auto-renewal or instalment billing that falls inside the freeze, if the plan allows.",
      "Confirm by email: freeze start, end, new expiry date and billing implications.",
      "Log the reason and documents on the member's Momence profile.",
      "Set a reminder 2 days before the resume date to welcome them back.",
    ],
    diagnose: [
      ["Freeze applied but still being billed", "Check the instalment / auto-renew schedule; pause it and refund any charge that fell inside the freeze (TPL-001)."],
      ["Member wants to come back early", "Unfreeze now and recalculate the expiry (TPL-113)."],
      ["Retrospective freeze request", "Needs Memberships Manager approval and evidence for the dates."],
      ["Freeze beyond policy", "Exception route with documents (TPL-019 / TPL-112)."],
    ],
    say: [
      ["Confirming", "I've frozen your membership from 3 to 24 March and moved your expiry date to 21 July. Your 5 March booking has been cancelled with no charge. Get well soon — we'll check in before the 24th."],
    ],
    dos: [
      "Set the automatic unfreeze date every time.",
      "Extend validity for class packs.",
      "Record documents on the profile.",
    ],
    donts: [
      "Don't approve second freezes or retrospective freezes yourself.",
      "Don't leave bookings inside the freeze window.",
    ],
    closeOut: [
      "Freeze active with automatic end date.",
      "Expiry or validity recalculated.",
      "Confirmation sent and reason logged.",
    ],
    prevention:
      "Explain the freeze entitlement at sign-up, show it in the member app and on invoices, and display the freeze policy at reception.",
    escalation:
      "If the member requests a retrospective freeze, a freeze beyond policy, or disputes the terms, escalate to the Memberships Manager.",
    relatedTemplates: ["TPL-011", "TPL-112", "TPL-019", "TPL-113", "TPL-001"],
    tags: ["freeze", "medical", "injury", "membership", "pause"],
  }),

  article({
    id: "KB-017",
    title: "Payment Dispute — Member Claims Double Charge",
    category: "Pricing and Memberships",
    subcategory: "Payments & Billing",
    summary:
      "Working out whether a 'double charge' is a real duplicate, an authorisation hold, or two different purchases — and refunding genuine duplicates quickly with a reference the member can track.",
    glance: {
      priority: "P1 — member out of pocket",
      owner: "Client Servicing → Finance",
      respond: "Within 4 hours",
      resolve: "Refund initiated within 24 hours of confirmation",
    },
    firstFive: [
      "Ask for both charge dates, amounts and the card's last 4 digits or UPI reference.",
      "Check the member's transactions in Momence.",
      "Check the payment gateway (Razorpay / Pine Labs / POS) for the same dates.",
    ],
    steps: [
      "Gather details from the member: dates, amounts, payment method, and screenshots of their statement if possible.",
      "Look up the member's transaction history in Momence.",
      "Cross-check the payment gateway or POS settlement for the same dates and amounts.",
      "Two captured transactions for the same item within 24 hours = a confirmed duplicate: refund the duplicate through the original gateway.",
      "Only one captured transaction but two lines on their statement = usually an authorisation hold or a failed attempt that will drop off; give the transaction ID.",
      "Two different purchases (e.g. a membership and a retail item) = show the member both receipts.",
      "Send the refund reference number and the expected timeline (UPI 1–3 business days, cards 5–7 business days).",
      "Note the dispute and resolution on the member's profile.",
      "Check why the duplicate happened (retry after timeout, double tap, POS and online both used) and raise it if it's systemic.",
    ],
    diagnose: [
      ["Two captured payments, same amount, minutes apart", "Duplicate — refund one now (TPL-007)."],
      ["One captured, one 'pending' on the statement", "Authorisation hold — releases in 3–7 business days; share the captured transaction ID."],
      ["Charged a different amount than agreed", "Incorrect amount — refund the difference (TPL-023)."],
      ["Charged after cancellation", "Auto-debit after cancellation — refund and fix the mandate (TPL-125)."],
    ],
    say: [
      ["Confirmed duplicate", "You're right — you were charged twice on 4 May. I've refunded ₹6,500 to your card; the reference is rfnd_8F2K… and it usually reaches you in 5–7 business days."],
      ["Authorisation hold", "I can see one successful payment of ₹6,500 — the second line is a temporary hold from the first attempt and your bank will release it within 3–7 business days. Here's the transaction ID if your bank asks."],
    ],
    dos: [
      "Verify in the gateway, not just Momence.",
      "Always give a refund reference and timeline.",
      "Fix the cause of duplicates.",
    ],
    donts: [
      "Don't refund before confirming it's a real duplicate.",
      "Don't refund to a different card or account than the one charged.",
    ],
    closeOut: [
      "Duplicate refunded with reference shared, or hold explained in writing.",
      "Resolution logged on the profile.",
    ],
    prevention:
      "Enable duplicate detection in the payment gateway, train the desk to verify success before retrying, and never take the same payment on POS and online.",
    escalation:
      "If the dispute can't be resolved within 48 hours, involves more than ₹10,000, or the member has raised a bank chargeback, escalate to the Finance Manager.",
    relatedTemplates: ["TPL-007", "TPL-023", "TPL-021", "TPL-125"],
    tags: ["double charge", "duplicate payment", "refund", "authorisation hold", "billing"],
  }),

  article({
    id: "KB-018",
    title: "Membership Refund Processing — Full Workflow",
    category: "Pricing and Memberships",
    subcategory: "Refunds",
    summary:
      "The end-to-end refund workflow: eligibility, refund type, the approval matrix by amount, processing through the original gateway, GST credit notes, and confirming the member actually received the money.",
    glance: {
      priority: "P2 (P1 if the refund is overdue)",
      owner: "Memberships → Finance (approval by amount)",
      respond: "Within 24 hours",
      resolve: "Refund initiated within 3 business days of approval",
    },
    firstFive: [
      "Find the original payment: date, amount, method, transaction ID.",
      "Check eligibility under the refund policy.",
      "Work out the approval level from the amount.",
    ],
    steps: [
      "Verify the original payment in Momence and the gateway — date, amount, payment method, transaction ID.",
      "Check eligibility: within the cooling-off period, service not delivered, billing error, or an approved exception (medical, relocation).",
      "Decide the refund type: full, partial (pro-rated for classes used), or credit to the account.",
      "Approval: under ₹5,000 — Front Desk Lead; ₹5,000–₹25,000 — Memberships Manager; over ₹25,000 — Studio Director.",
      "Process through the original payment method or gateway (Razorpay / Pine Labs / POS); cash refunds need a signed receipt.",
      "If a GST invoice was issued, raise a credit note for the refunded amount.",
      "Record the refund reference in Momence and close or adjust the membership accordingly.",
      "Email the member with the amount, reference and expected timeline (UPI 1–3 business days; cards 5–7 business days).",
      "Follow up after the expected window to confirm receipt.",
      "Mark the refund completed once confirmed; if not received, ask the gateway for the ARN / UTR so the member's bank can trace it.",
    ],
    diagnose: [
      ["Refund shows processed but member hasn't received it", "Get the ARN / UTR from the gateway and share it; banks trace by that number (TPL-022)."],
      ["Member wants a refund outside policy", "Exception route with reason and documents (TPL-124); approval by amount."],
      ["Original card closed", "The bank redirects the refund to the account; if it bounces, refund by bank transfer with proof of identity."],
      ["Refund after a GST invoice", "Credit note needed for accounting (TPL-128)."],
    ],
    say: [
      ["Approved", "Your refund of ₹12,400 has been approved and processed to your original card today. The reference is RFND-2209; it usually shows within 5–7 business days. I'll check in with you next Friday."],
    ],
    dos: [
      "Refund to the original payment method.",
      "Follow the approval matrix strictly.",
      "Confirm receipt before closing.",
    ],
    donts: [
      "Don't promise a refund before eligibility and approval are confirmed.",
      "Don't process refunds without the transaction ID.",
    ],
    closeOut: [
      "Approval recorded at the right level.",
      "Refund reference and credit note (if any) logged.",
      "Member confirmed receipt.",
    ],
    prevention:
      "Explain the refund policy clearly at sign-up and on invoices, and train the desk on the approval matrix and the ARN / UTR tracing process.",
    escalation:
      "If a refund isn't processed within the SLA window, or the member escalates to their bank, escalate to the Finance Manager for a status check.",
    relatedTemplates: ["TPL-005", "TPL-029", "TPL-022", "TPL-124", "TPL-128"],
    tags: ["refund", "approval", "finance", "credit note", "razorpay"],
  }),

  article({
    id: "KB-029",
    title: "Payment Deducted but Not Reflecting — UPI Pending or Failed",
    category: "Pricing and Memberships",
    subcategory: "Payments & Billing",
    summary:
      "A member says money left their account but the membership or class pack isn't active. Match the payment in the gateway, activate if it was captured, and explain auto-reversal if it wasn't.",
    glance: {
      priority: "P1 — member paid but can't book",
      owner: "Client Servicing → Finance",
      respond: "Within 1 hour",
      resolve: "Activated or reversal explained within 24 hours",
    },
    firstFive: [
      "Ask for the UTR / UPI reference, amount, time and app used (screenshot).",
      "Search the gateway for that reference or amount and time.",
      "If the member has a class today, protect their spot while you check.",
    ],
    steps: [
      "Collect the UTR / UPI transaction reference, amount, date and time, and the app used.",
      "Search the payment gateway (Razorpay) by UTR, amount or phone number.",
      "Captured in the gateway but not in Momence: activate the purchase manually in Momence against that payment and note the reference.",
      "Pending in the gateway: wait for the final status (usually within 30 minutes); don't take a second payment meanwhile.",
      "Failed in the gateway but debited by the bank: explain that UPI auto-reverses failed debits, normally within 1–2 working days (T+1); give them the reference to show their bank.",
      "If the member needs to book today, hold their booking or offer a complimentary class while the payment settles — don't ask them to pay twice.",
      "If you're sure it's failed and they want to proceed, a fresh payment is fine — but note the original reference for the reversal.",
      "Confirm the outcome to the member in writing.",
      "If several members report the same thing, check the gateway status page and raise a gateway incident.",
    ],
    diagnose: [
      ["Captured in gateway, nothing in Momence", "Webhook / sync failure — activate manually, raise TPL-060 if repeated."],
      ["Pending for more than 2 hours", "Contact the gateway support with the payment ID."],
      ["Failed in gateway, debited at bank", "Auto-reversal T+1; member's bank can trace with the UTR."],
      ["No trace in the gateway at all", "Payment went elsewhere (wrong UPI ID / QR) — ask for the payee name on their screenshot."],
    ],
    say: [
      ["Captured", "Found it — your payment of ₹8,900 came through at 9:14 am. I've activated your membership now; you can book straight away."],
      ["Failed", "The payment didn't complete on our side, so your bank will automatically return the money, usually within 1–2 working days. Here's the reference if your bank asks: 4127…"],
    ],
    dos: [
      "Search by UTR first.",
      "Protect the member's booking while you check.",
      "Record the reference on the profile.",
    ],
    donts: [
      "Don't ask the member to pay again until the first payment's status is clear.",
      "Don't promise a reversal date you can't control — give the typical window.",
    ],
    closeOut: [
      "Membership active with the payment reference, or reversal explained in writing.",
      "Systemic sync failures ticketed to IT.",
    ],
    prevention:
      "Monitor gateway-to-Momence webhook failures daily, show the payment status screen clearly in the app, and train the desk to check the gateway before taking a second payment.",
    escalation:
      "Escalate to Finance if the gateway shows captured but Momence can't be reconciled, if a reversal hasn't arrived after 5 working days, or if more than three members are affected in a day.",
    relatedTemplates: ["TPL-021", "TPL-123", "TPL-006", "TPL-025"],
    tags: ["upi", "payment pending", "payment failed", "utr", "razorpay", "not reflecting"],
  }),

  article({
    id: "KB-031",
    title: "Chargeback or Bank Dispute Received",
    category: "Pricing and Memberships",
    subcategory: "Payments & Billing",
    summary:
      "When a member disputes a charge with their bank: respond with evidence before the gateway deadline, talk to the member directly, and decide whether to refund, defend or settle.",
    glance: {
      priority: "P1 — deadline-driven",
      owner: "Finance (with Memberships for the evidence)",
      respond: "Same day the dispute notice arrives",
      resolve: "Evidence submitted before the gateway deadline",
    },
    firstFive: [
      "Note the deadline shown in the gateway dashboard — they can be just a few days away.",
      "Identify the transaction and the member.",
      "Freeze any further refunds on that transaction until the dispute is decided.",
    ],
    steps: [
      "Record the dispute ID, reason code, amount and response deadline from the gateway.",
      "Identify the member and pull the purchase details, terms accepted, and attendance (check-ins) since purchase.",
      "Call the member to understand why they disputed — many disputes are unrecognised merchant names or forgotten renewals.",
      "If the charge was wrong (duplicate, charged after cancellation), accept the dispute or refund — don't defend errors.",
      "If the charge was valid, compile evidence: invoice, signed waiver or terms, cancellation policy, booking and check-in history, and communication logs.",
      "Submit the evidence in the gateway before the deadline.",
      "Don't refund separately while a dispute is open — the member could be refunded twice.",
      "If the member agrees the charge was valid, ask them to withdraw the dispute with their bank and keep their written confirmation.",
      "Record the outcome and update the membership (suspend if a disputed membership is lost).",
    ],
    diagnose: [
      ["'Unrecognised transaction'", "Merchant name confusion — share the invoice; ask the member to withdraw the dispute."],
      ["Charged after cancellation", "Our error — accept and fix the auto-debit mandate (TPL-125)."],
      ["Duplicate charge", "Accept or refund the duplicate only (TPL-007)."],
      ["Member used the service and disputes anyway", "Defend with attendance and terms evidence."],
    ],
    say: [
      ["Calling the member", "Hi, I'm calling from Physique 57 about a dispute your bank raised on your 12 April payment. I wanted to check what happened — if something went wrong on our side, I'd like to fix it directly."],
    ],
    dos: [
      "Diary the deadline the day the notice arrives.",
      "Include attendance and terms evidence.",
      "Talk to the member — many disputes resolve with one call.",
    ],
    donts: [
      "Don't miss the deadline — missed disputes are lost automatically.",
      "Don't refund outside the dispute process while it's open.",
    ],
    closeOut: [
      "Evidence submitted (or dispute accepted) before the deadline.",
      "Outcome recorded and membership updated.",
    ],
    prevention:
      "Use a recognisable merchant name on statements, send renewal reminders 3–7 days before auto-debits, and make cancellation easy so members don't use their bank instead.",
    escalation:
      "Escalate to the Finance Manager for any dispute above ₹10,000, any dispute alleging fraud, or if more than two disputes arrive in a month.",
    relatedTemplates: ["TPL-126", "TPL-125", "TPL-007"],
    tags: ["chargeback", "dispute", "bank", "finance", "evidence"],
  }),

  article({
    id: "KB-048",
    title: "Promo Code Misuse or Unauthorised Discount",
    category: "Pricing and Memberships",
    subcategory: "Offers, Invoices & Corporate",
    summary:
      "When a promo code is being used outside its terms, leaked publicly, or discounts were given without approval: stop the leak, decide fairly on existing purchases, and tighten controls.",
    glance: {
      priority: "P1 — ongoing revenue leakage",
      owner: "Marketing (code owner) with Finance and the Studio Director",
      respond: "Within 2 hours",
      resolve: "Code fixed today; review within 3 days",
    },
    firstFive: [
      "Identify the code, its intended terms, and who owns it.",
      "Pull the redemptions report (who used it, when, for what).",
      "Decide whether to pause the code right now.",
    ],
    steps: [
      "Identify the code, its owner and its intended terms (audience, validity, products, usage limit).",
      "Pull redemptions from Momence: users, dates, products and discount value.",
      "If it's leaking (shared on coupon sites or social media), pause or expire the code immediately and create a replacement for the intended audience.",
      "Add the right restrictions: usage limit, one per member, new members only, product restrictions, end date.",
      "Decide on existing redemptions: honour purchases made in good faith by members, but cancel clearly abusive ones (e.g. one person creating many accounts) with Studio Director approval.",
      "If staff applied unauthorised discounts, document each one and raise it with the Studio Director; retrain on the approval rules.",
      "Calculate the revenue impact for Finance.",
      "Communicate with affected members only if a purchase must be reversed — politely and with an alternative.",
      "Record the incident and the control changes made.",
    ],
    diagnose: [
      ["Code posted on a coupon site", "Expire it, issue a new targeted code, add a usage limit."],
      ["Members stacking multiple codes", "Check stacking rules in Momence; disable stacking."],
      ["Discounts given at the desk without approval", "Document and escalate; restrict manual discounts to managers."],
      ["Code not working for eligible members", "Different problem — see TPL-010."],
    ],
    say: [
      ["Reversing an abusive purchase", "We noticed this offer was redeemed across several accounts, which isn't allowed under its terms, so we've cancelled the extra purchases and refunded them in full. Your original purchase stays as it is."],
    ],
    dos: [
      "Pause leaking codes immediately.",
      "Honour good-faith purchases.",
      "Set usage limits on every new code.",
    ],
    donts: [
      "Don't publicly accuse members of misuse.",
      "Don't create codes without an owner and an end date.",
    ],
    closeOut: [
      "Code paused or restricted.",
      "Redemptions reviewed with a decision recorded.",
      "Revenue impact shared with Finance.",
    ],
    prevention:
      "Every code gets an owner, an end date, a usage limit and product restrictions; manual discounts are limited to managers; redemptions are reviewed weekly during campaigns.",
    escalation:
      "Escalate to the Studio Director if the revenue impact exceeds ₹25,000, if staff involvement is suspected, or if purchases need reversing.",
    relatedTemplates: ["TPL-256", "TPL-010", "TPL-099"],
    tags: ["promo code", "discount", "misuse", "revenue", "marketing"],
  }),
];
