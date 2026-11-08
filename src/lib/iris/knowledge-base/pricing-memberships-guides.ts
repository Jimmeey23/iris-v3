// Knowledge Base - Pricing & Memberships: plan changes, transfers, credits, expiry,
// renewals, billing errors, refunds, offers, GST invoices and corporate plans.
import { article, type KnowledgeArticle } from "./compose";

export const PRICING_MEMBERSHIPS_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-051",
    title: "Plan Upgrade, Downgrade or Pack-to-Unlimited Conversion",
    category: "Pricing and Memberships",
    subcategory: "Freezes, Upgrades & Transfers",
    summary:
      "A member wants a bigger or smaller plan, or to convert a class pack into an unlimited membership. Credit what they've already paid, switch on a date that loses no bookings, and confirm the new terms in writing.",
    glance: {
      priority: "P3 (P2 if a renewal or instalment is due within 48 hours)",
      owner: "Memberships / Client Servicing (Memberships Manager for pro-rata exceptions)",
      respond: "Within 4 hours",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Open the current plan, start and expiry dates, credits used and payment history in Momence.",
      "Ask what they want to change and from when - today, or at the next renewal.",
      "Check whether a renewal or instalment is due in the next 48 hours, and hold it if the change replaces it.",
    ],
    steps: [
      "Confirm the current plan, remaining validity, unused credits and the amount actually paid, including any offer used.",
      "Explain the two options: switch now (with a pro-rata credit for unused value) or switch at the next renewal (no credit needed).",
      "Upgrade or pack-to-unlimited: credit the unused value - unused classes × the per-class price paid, or remaining days × the daily rate - against the new plan and collect only the difference.",
      "Downgrade: apply it from the next renewal date by default; a mid-term downgrade needs Memberships Manager approval because it usually means a partial refund.",
      "Check the new plan's rules before confirming: format access (e.g. PowerCycle-only plans), studio access, freeze allowance and booking window.",
      "In Momence, end the old plan on the switch date and start the new one the same day, so bookings have no gap or overlap.",
      "Move upcoming bookings onto the new plan and check none were cancelled by the switch.",
      "Collect the difference by payment link or at the desk, and issue the GST invoice.",
      "Send a written summary: old plan, new plan, start date, amount paid, new expiry date and renewal terms.",
    ],
    diagnose: [
      ["Bookings disappeared after the switch", "The old plan ended before the bookings moved - rebook them on the new plan straight away."],
      ["Member charged the full price of the new plan", "The credit wasn't applied - refund the difference, or add it as account credit if they prefer (TPL-023)."],
      ["Old plan was bought on an offer", "Credit the price actually paid, not the list price."],
      ["Renewal fired the day after an upgrade", "Auto-renew stayed on the old plan - reverse the charge (KB-017) and fix the renewal date."],
    ],
    say: [
      [
        "Explaining the credit",
        "You've got 6 classes left on your pack, worth ₹4,200 at the price you paid. I'll put that towards the unlimited plan, so today you only pay the difference of ₹6,800.",
      ],
    ],
    dos: ["Show the maths in writing.", "Time the switch so no bookings are lost.", "Check format and studio access on the new plan before confirming."],
    donts: ["Don't credit the list price when the member paid an offer price.", "Don't downgrade mid-term without approval - it's effectively a refund."],
    closeOut: [
      "New plan active with the correct start and expiry dates; upcoming bookings moved.",
      "Difference collected and invoiced; written summary sent to the member.",
      "The renewal date and amount reflect the new plan.",
    ],
    prevention:
      "Publish a one-page upgrade price sheet so every desk quotes the same credit, and prompt pack holders to upgrade when they use most of a pack early.",
    escalation:
      "Escalate to the Memberships Manager for mid-term downgrades, credits above ₹5,000, or plans bought on corporate or partner pricing.",
    relatedTemplates: ["TPL-013", "TPL-114", "TPL-003"],
    tags: ["upgrade", "downgrade", "pro-rata", "class pack", "unlimited", "plan change"],
  }),

  article({
    id: "KB-052",
    title: "Membership Transfer - to Another Person, Studio or City",
    category: "Pricing and Memberships",
    subcategory: "Freezes, Upgrades & Transfers",
    summary:
      "Requests to move a membership to another person or home studio, to use it in another city, or to book a format the plan seems to block. Check what the plan allows, get consent and a waiver, and move the remaining value without losing bookings.",
    glance: {
      priority: "P3 (P2 if a plan restriction is blocking a booking today)",
      owner: "Memberships / Client Servicing",
      respond: "Within 4 hours",
      resolve: "Within 2 working days",
    },
    firstFive: [
      "Identify the request: another person, a new home studio, visiting another city, or a booking blocked by plan rules.",
      "Check the plan's terms for transfers and for studio and format access.",
      "Confirm the request came from the account holder (registered phone or email).",
    ],
    steps: [
      "Transfer to another person: confirm the plan allows it (typically one transfer, with at least 30 days left) and get the account holder's request in writing.",
      "Collect the recipient's name, phone and email and a signed waiver; create their Momence profile if they don't have one.",
      "Charge the transfer fee if the plan has one, move the remaining validity and credits to the recipient, and close the original plan with a note.",
      "New home studio (e.g. Kwality House to Supreme HQ): check the price difference between studios, collect or credit it pro-rata, then update the home location.",
      "Visiting another city (e.g. a Mumbai member in Bengaluru): set up visiting access for the dates given, as policy allows, or sell a class pack at member rates.",
      "Format-restricted plans (TPL-120): confirm the plan genuinely excludes the format before offering an upgrade (KB-051).",
      "Move any future bookings that belong to the new holder or the new studio.",
      "Confirm in writing to everyone involved: what moved, from when, and the new expiry date.",
    ],
    diagnose: [
      ["Recipient sees no credits after the transfer", "Credits stayed on the original profile - move them, then ask the recipient to refresh the app."],
      ["Member blocked from booking at another studio", "The plan is studio-locked - set visiting access or apply the price difference."],
      ["Request comes from someone other than the account holder", "Don't act - verify with the account holder on their registered number."],
    ],
    say: [
      [
        "Transfer to a friend",
        "Happy to help. Your plan allows one transfer with at least 30 days left. Once you confirm by email and your friend signs the waiver, I'll move the remaining 74 days to her profile.",
      ],
    ],
    dos: ["Get the account holder's written consent.", "Get a signed waiver from the new holder.", "Note the transfer on both profiles."],
    donts: ["Don't transfer a plan bought on a non-transferable offer.", "Don't move value between people without written consent."],
    closeOut: ["Remaining value moved, with notes on both profiles.", "Fee or price difference collected or credited.", "Confirmation sent to both parties."],
    prevention:
      "State transfer and visiting rules at purchase and in the plan description in the app, so members know what's possible before they ask.",
    escalation:
      "Escalate to the Memberships Manager for transfers outside policy (under 30 days left, offer plans, a second transfer) or disputes between the two parties.",
    relatedTemplates: ["TPL-115", "TPL-009", "TPL-119", "TPL-120"],
    tags: ["transfer", "home studio", "visiting access", "cross-city", "plan restriction", "membership"],
  }),

  article({
    id: "KB-053",
    title: "Class Credits Missing or Wrongly Deducted",
    category: "Pricing and Memberships",
    subcategory: "Credits, Expiry & Renewals",
    summary:
      "A member's credit balance looks wrong: credits missing after a purchase, deducted for a class cancelled in time, or used twice. Reconcile bookings against the balance, restore what's owed and fix the cause.",
    glance: {
      priority: "P2 (P1 if the member can't book a class today)",
      owner: "Front Desk → Memberships",
      respond: "Within 2 hours",
      resolve: "Same day",
    },
    firstFive: [
      "Open the purchase history and the booking and credit log for the period in question.",
      "Ask which class or purchase looks wrong, with dates.",
      "If the member has a class today, protect the booking while you check.",
    ],
    steps: [
      "List every booking, cancellation and attendance against the plan since the last purchase, with timestamps.",
      "Check the sum: credits bought − classes attended − late cancels and no-shows charged under the policy should equal the balance shown.",
      "Cancelled inside the free-cancellation window but charged a credit: restore it and note the booking ID (TPL-117).",
      "Purchase made but no credits added: confirm the payment was captured (KB-029) and add the pack manually against the payment reference.",
      "Same class deducted twice (double booking or sync issue): restore the duplicate and check Momence for duplicate bookings (TPL-058).",
      "Class cancelled by the studio: every attendee should get the credit back automatically - restore any that didn't, for the whole class list.",
      "Explain the corrected balance to the member, listing each fix.",
      "If the cause is systemic (a sync or rule error), raise it to IT with three example booking IDs.",
    ],
    diagnose: [
      ["Credit taken for a cancellation 13 hours before class", "With a 12-hour window that was in time - restore it."],
      ["Several members missing credits after a studio cancellation", "The bulk restore failed - restore for the whole class list and raise TPL-058."],
      ["Pack bought, balance zero", "The payment isn't linked - find it in the gateway, then add the pack manually."],
      ["Balance right but expiry wrong", "That's a different problem - see KB-054."],
    ],
    say: [
      [
        "Fixing it",
        "You're right - you cancelled Tuesday's 7 am class 14 hours before, so it shouldn't have cost a credit. I've added it back; your balance is now 6.",
      ],
    ],
    dos: ["Reconcile from the log, not from memory.", "Restore first when the evidence is clear, then explain.", "Fix every member hit by a bulk issue, not only the one who complained."],
    donts: ["Don't make the member prove what the system log already shows.", "Don't hand out extra goodwill credits instead of fixing the actual error."],
    closeOut: ["Balance corrected, with a note for each adjustment.", "Member told in writing.", "System issues ticketed with booking IDs."],
    prevention:
      "Run a weekly report of credits deducted for cancellations inside the free window, and check that studio cancellations returned credits within an hour.",
    escalation:
      "Escalate to IT if the same error affects more than three members, and to the Memberships Manager if more than 5 credits are disputed.",
    relatedTemplates: ["TPL-002", "TPL-117", "TPL-058"],
    tags: ["credits", "balance", "deducted", "cancellation", "class pack", "restore credit"],
  }),

  article({
    id: "KB-054",
    title: "Class Pack Expiry & Extension Requests",
    category: "Pricing and Memberships",
    subcategory: "Credits, Expiry & Renewals",
    summary:
      "A member has unused classes on a pack that has expired or is about to. Check the expiry rules, apply the extension policy the same way for everyone, count studio closures in their favour, and record any exception.",
    glance: {
      priority: "P3 (P2 if the pack expired with more than 5 classes unused)",
      owner: "Memberships (Memberships Manager for exceptions)",
      respond: "Within 4 hours",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Check the pack's purchase date, expiry date and unused classes.",
      "Ask why the classes weren't used - illness, travel, a studio closure, schedule changes.",
      "Check the account for previous extensions.",
    ],
    steps: [
      "Confirm the expiry date and unused classes, and check whether studio closures or cancellations cut into the time they had to book.",
      "Apply the standard policy: one extension per pack (typically 2–4 weeks) when asked before expiry or within 7 days after.",
      "Medical reasons: extend by the period on the doctor's note (see KB-007).",
      "Studio closures or cancellations during the pack: extend by the days lost - that's our obligation, not a favour (TPL-014).",
      "Outside policy (expired a month ago, repeated extensions): offer the rejoin or renewal offer instead (TPL-118), or escalate for an exception.",
      "Update the expiry date in Momence with a note: the reason, the length and who approved it.",
      "Confirm the new expiry date in writing and suggest a booking plan to use the classes in time.",
    ],
    diagnose: [
      ["Pack expired during a studio closure", "Extend by the closure days at no charge."],
      ["Member asks for a third extension", "Repeat extensions need Memberships Manager approval; offer an upgrade (KB-051) as an alternative."],
      ["Expiry shown differs from what was sold", "The pack is configured wrongly - fix it and check other packs of the same type."],
    ],
    say: [
      [
        "Granting",
        "Your pack expired on the 3rd with 4 classes left. Since you were travelling, I've extended it by 3 weeks, to the 24th - that's the one extension on this pack.",
      ],
      [
        "Declining kindly",
        "I can't extend this one as it expired in March, but I can offer our rejoin rate on a new pack, which works out cheaper than buying at full price.",
      ],
    ],
    dos: ["Apply the same rule to everyone.", "Count studio closures in the member's favour.", "Record who approved the extension and why."],
    donts: ["Don't extend indefinitely because someone pushed hard.", "Don't refuse an extension we owe because of our own closures."],
    closeOut: ["New expiry date recorded with the reason and approver.", "Member told in writing."],
    prevention:
      "Send automatic reminders 14 and 3 days before a pack expires showing the classes left, and show the expiry date clearly in the app.",
    escalation:
      "Escalate to the Memberships Manager for second extensions, extensions longer than 4 weeks, or packs that expired more than 30 days ago.",
    relatedTemplates: ["TPL-014", "TPL-116", "TPL-118"],
    tags: ["expiry", "extension", "class pack", "unused classes", "validity"],
  }),

  article({
    id: "KB-055",
    title: "Auto-Renewal Failed, Unwanted or Needs Cancelling",
    category: "Pricing and Memberships",
    subcategory: "Credits, Expiry & Renewals",
    summary:
      "Auto-renewal problems both ways: a renewal failed and the member wants to continue, a renewal they didn't expect, or a request to switch it off. Fix the renewal status in Momence and at the gateway, settle the payment and confirm in writing.",
    glance: {
      priority: "P2 (P1 if charged after asking to cancel - see KB-056)",
      owner: "Memberships / Client Servicing",
      respond: "Within 4 hours",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Check the plan's renewal setting, next renewal date and recent payment attempts.",
      "Clarify what the member wants: keep the membership, stop renewals, or cancel now.",
      "Look for a cancellation request already on file (email, WhatsApp, form, desk note).",
    ],
    steps: [
      "Renewal failed (expired card, insufficient funds, mandate revoked): tell the member, send a secure payment link or a new mandate, and keep access for the grace period the policy allows.",
      "If the gateway will retry automatically, cancel the retry once they pay manually so they aren't charged twice (TPL-025).",
      "Stop future renewals: switch auto-renew off in Momence and cancel the gateway subscription or e-mandate; check both show as off.",
      "Cancel now: follow the cancellation policy (notice period, refunds), offering a freeze or downgrade first (KB-025).",
      "Unexpected renewal: check the reminder was sent; if the charge was within 48 hours and no class has been booked since, a refund under the policy is usually right (KB-018).",
      "Record the request, the date and the outcome on the profile.",
      "Confirm in writing: renewal status, last day of access, and any refund or charge.",
    ],
    diagnose: [
      ["Auto-renew off in Momence but the card was still charged", "The gateway subscription is still live - cancel it there and follow KB-056."],
      ["Renewal failed but the member kept booking", "They're in the grace period - collect payment or end access when it ends."],
      ["Member says they cancelled by WhatsApp", "Search the chat; if they did, honour that date."],
    ],
    say: [
      [
        "Switching renewals off",
        "Done - auto-renew is off on both your Momence plan and the card mandate. You keep full access until 30 June and won't be charged again.",
      ],
    ],
    dos: ["Switch renewals off in both places.", "Share the reminder screenshot if the renewal is disputed.", "Offer a freeze before a cancellation."],
    donts: ["Don't make members jump through hoops to stop renewing.", "Don't take a manual payment while an automatic retry is pending."],
    closeOut: ["Renewal status correct in Momence and at the gateway.", "Payment, refund or grace period settled.", "Written confirmation sent."],
    prevention: "Send renewal reminders 7 days and 1 day before charging, with a one-tap link to manage the renewal.",
    escalation:
      "Escalate to Finance if the gateway won't cancel a mandate, and to the Memberships Manager for refunds outside policy.",
    relatedTemplates: ["TPL-008", "TPL-015", "TPL-004", "TPL-025"],
    tags: ["auto-renewal", "renewal", "mandate", "cancel renewal", "payment failed", "subscription"],
  }),

  article({
    id: "KB-056",
    title: "Auto-Debit After Cancellation",
    category: "Pricing and Memberships",
    subcategory: "Payments & Billing",
    summary:
      "A member was charged after they cancelled or switched off auto-renew. Treat it as a billing error: verify the cancellation, refund promptly, stop the mandate at the source and check no one else is affected.",
    glance: {
      priority: "P1 - member charged without consent",
      owner: "Client Servicing → Finance",
      respond: "Within 1 hour",
      resolve: "Refund initiated within 24 hours",
    },
    firstFive: [
      "Find the cancellation request (date, channel) and the charge (date, amount, payment ID).",
      "Check whether the charge came from Momence or from a gateway subscription / e-mandate.",
      "Acknowledge the problem to the member straight away.",
    ],
    steps: [
      "Verify the cancellation reached us before the charge date - email, WhatsApp, form or desk note.",
      "If it did, it's our error: apologise and refund that charge in full to the original payment method (KB-018).",
      "Cancel the subscription or e-mandate at the gateway (Razorpay), not only in Momence, and screenshot the cancelled status.",
      "Make sure the charge didn't create a booking or credits; reverse them if it did.",
      "Cancellation received after the charge: explain the policy and offer the options (refund if no classes used, or keep the month).",
      "Give the member the refund reference and the expected time - usually 5–7 working days for cards, sooner for UPI.",
      "If the member has already raised a chargeback, follow KB-031 and don't refund twice.",
      "Log the root cause (cancellation not actioned, mandate left live) for the weekly billing review.",
    ],
    diagnose: [
      ["Cancelled in Momence, charged by the gateway", "Orphaned mandate - cancel it at the gateway and check other cancelled members for the same problem."],
      ["Charged twice after cancelling", "Refund both and check the gateway's retry settings."],
      ["Cancellation was sent to a staff member's personal number", "Still valid - honour it and remind staff to forward requests."],
    ],
    say: [
      [
        "Owning it",
        "You're right - you cancelled on the 2nd and shouldn't have been charged. I'm sorry. I've refunded ₹8,900 to your card (reference RFND-2231) and stopped the mandate so it can't happen again.",
      ],
    ],
    dos: ["Refund first when the cancellation is clearly on record, then investigate.", "Cancel the mandate at the source.", "Check other members for the same failure."],
    donts: ["Don't offer credit instead of a refund for an unauthorised charge.", "Don't refund while a chargeback is open - that's a double refund."],
    closeOut: ["Refund processed and reference shared.", "Mandate cancelled at the gateway (screenshot on the ticket).", "Root cause logged."],
    prevention:
      "Make cancelling a renewal one action that ends both the Momence plan and the gateway mandate, and audit cancelled plans with live mandates every week.",
    escalation:
      "Escalate to Finance immediately for repeat charges, amounts above ₹15,000 or several members affected; to the Studio Director if the member mentions consumer court or social media.",
    relatedTemplates: ["TPL-125", "TPL-015", "TPL-126"],
    tags: ["auto-debit", "charged after cancel", "mandate", "refund", "billing error", "unauthorised charge"],
  }),

  article({
    id: "KB-057",
    title: "Card Declined or Payment Failed at Checkout",
    category: "Pricing and Memberships",
    subcategory: "Payments & Billing",
    summary:
      "A member can't complete a purchase - the card is declined, UPI fails or checkout errors. Work out whether it's the bank, the gateway or us, get the payment through another way, and avoid double charges.",
    glance: {
      priority: "P2 (P0 if no one can pay at all - see KB-030)",
      owner: "Front Desk → Finance / IT",
      respond: "Within 30 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Ask what they saw: the exact error, the method (card, UPI, wallet) and whether money left their account.",
      "Find the attempt and its failure reason in the gateway dashboard.",
      "Check whether other members are failing too.",
    ],
    steps: [
      "Find the attempt in the gateway: failed, pending or captured. If money was taken, follow KB-029 instead.",
      "Read the failure reason: 'declined by bank', 'insufficient funds', '3-D Secure failed' or 'international card' are bank-side; 'gateway error' or 'timeout' are on our side.",
      "Bank-side: suggest another card, UPI, or asking the bank to approve the transaction; international cards may need a different payment link.",
      "Our side, one member: send a fresh payment link (TPL-129) or take the payment on the desk card machine.",
      "Our side, several members: treat it as a gateway incident - raise TPL-026 and switch to the outage process.",
      "Don't retry the same card again and again - repeated attempts can trigger the bank's fraud block.",
      "Once paid, check the purchase is active in Momence and the invoice has gone out.",
    ],
    diagnose: [
      ["'Do not honour' or 'declined'", "The bank refused it - the member needs to call their bank or use another method."],
      ["Payment link expired", "Generate a new one; links usually expire after 24 hours."],
      ["Fails in the app, works on the website", "App checkout bug - take payment by link and raise TPL-055."],
      ["Every card failing for the last 20 minutes", "Gateway incident - TPL-026."],
    ],
    say: [
      [
        "Bank decline",
        "The payment didn't go through because your bank declined it, so nothing was charged. You could try UPI, or I can send you a link to pay with another card.",
      ],
    ],
    dos: ["Check the gateway before blaming the member's card.", "Offer another payment method straight away.", "Confirm clearly that nothing was charged."],
    donts: ["Don't ask for card numbers or OTPs over the phone or WhatsApp.", "Don't let a member retry five times in a row."],
    closeOut: ["Payment captured and purchase active, or the member given clear next steps.", "Incident raised if more than one member was affected."],
    prevention:
      "Offer UPI and payment links as standard alternatives, watch gateway failure rates, and keep the desk card machine ready as a backup.",
    escalation:
      "Escalate to IT and Finance if more than three payments fail within 30 minutes, or if checkout fails for everyone on one platform (app or website).",
    relatedTemplates: ["TPL-006", "TPL-025", "TPL-129", "TPL-026"],
    tags: ["card declined", "payment failed", "checkout", "upi", "payment link", "gateway"],
  }),

  article({
    id: "KB-058",
    title: "Refund Not Received by the Member",
    category: "Pricing and Memberships",
    subcategory: "Refunds",
    summary:
      "A member says a promised refund never arrived. Check whether it was initiated, processed and settled, share the bank reference they can trace, and chase Finance or the gateway when it's stuck.",
    glance: {
      priority: "P1 if more than 10 working days since the refund was promised; otherwise P2",
      owner: "Client Servicing → Finance",
      respond: "Within 2 hours",
      resolve: "Status confirmed same day; stuck refunds chased within 48 hours",
    },
    firstFive: [
      "Find the refund on the ticket or in the gateway: amount, date initiated, refund ID.",
      "Check its status: not initiated, processed, or failed.",
      "Tell the member you're tracing it and when you'll update them.",
    ],
    steps: [
      "Not initiated: find out why (missing approval or bank details), get it initiated today and apologise for the delay.",
      "Processed: get the refund ID and the bank reference number - ARN or RRN for cards, UTR for UPI - from the gateway.",
      "Share the reference and the timelines: UPI 1–3 working days, cards 5–7 working days after processing, longer with some banks.",
      "Past the timeline with a reference: the member's bank can trace it with the ARN, so ask them to call their bank with it.",
      "Failed (card or account closed): collect other bank details through a secure form and have Finance process it again (TPL-029).",
      "Cash or cheque refunds: confirm the bank transfer date and the account details used.",
      "Update the member in writing with the status and the next update date, and follow up until they confirm receipt.",
    ],
    diagnose: [
      ["Refund 'processed' 3 days ago", "Normal - share the ARN and the timeline."],
      ["Refund 'failed'", "The original payment method is closed - get bank details and reprocess."],
      ["No refund record anywhere", "It was promised but never raised - raise it now with approval (KB-018)."],
    ],
    say: [
      [
        "Sharing the reference",
        "Your refund of ₹3,500 was processed on the 12th, bank reference 74831924. Card refunds take 5–7 working days to show, so it should land by the 21st. If it doesn't, your bank can trace it with that number.",
      ],
    ],
    dos: ["Always share the bank reference (ARN or UTR).", "Give a date for your next update.", "Close only once the member confirms receipt."],
    donts: ["Don't say 'it's with the bank' without a reference.", "Don't collect bank details in an open WhatsApp chat - use a secure form."],
    closeOut: ["Refund status confirmed and reference shared.", "Failed refunds reprocessed.", "Member confirmed receipt."],
    prevention: "Send the refund reference automatically when a refund is processed, and review refunds older than 7 days every week.",
    escalation:
      "Escalate to Finance if a refund isn't initiated within 2 working days of approval, and to the Studio Director if it's more than 15 working days late.",
    relatedTemplates: ["TPL-022", "TPL-029", "TPL-005"],
    tags: ["refund", "refund not received", "arn", "utr", "refund status", "finance"],
  }),

  article({
    id: "KB-059",
    title: "Medical or Relocation Refund Exception",
    category: "Pricing and Memberships",
    subcategory: "Refunds",
    summary:
      "A member asks for a refund outside the standard policy because of illness, pregnancy or moving away. Offer the alternatives first, collect the evidence, and get the exception approved and calculated the same way every time.",
    glance: {
      priority: "P2",
      owner: "Memberships Manager → Finance (Studio Director above the approval limit)",
      respond: "Within 4 hours",
      resolve: "Decision within 3 working days of receiving documents",
    },
    firstFive: [
      "Listen and acknowledge - this is usually a stressful moment for the member.",
      "Note the plan, amount paid, start date and classes used.",
      "Explain the documents needed (doctor's note or proof of relocation) and the review timeline.",
    ],
    steps: [
      "Offer the alternatives first: a medical freeze (KB-007), a transfer to someone else, or a move to another city's studio (KB-052).",
      "If they still want a refund, collect the evidence: a doctor's certificate saying they can't exercise and for how long, or proof of relocation (new address, job letter).",
      "Calculate the refund the same way every time: amount paid − classes or days used at the full rate − any admin fee in the policy.",
      "Send the request, evidence and calculation to the Memberships Manager (TPL-124).",
      "Once approved, have Finance process it (TPL-029) and record the approver.",
      "Close the plan and stop renewals at the gateway.",
      "Confirm the decision, amount and timeline in writing.",
    ],
    diagnose: [
      ["Can't exercise for 2 months", "A freeze is usually fairer than a refund - offer it first."],
      ["Moving to Bengaluru", "Transfer to Kenkere House instead of a refund."],
      ["No documents yet", "An exception needs evidence - don't decide on the spot."],
    ],
    say: [
      [
        "Setting expectations",
        "I'm sorry to hear that. Refunds outside the policy need a doctor's note. Once I have it, the Memberships Manager will review it and I'll come back to you within 3 working days.",
      ],
    ],
    dos: ["Offer a freeze or transfer first.", "Use the same formula every time.", "Keep medical documents confidential."],
    donts: ["Don't promise a refund before it's approved.", "Don't share medical details beyond the people approving it."],
    closeOut: ["Decision recorded with the evidence and approver.", "Refund processed or alternative applied.", "Plan closed and renewals stopped where refunded."],
    prevention: "Explain freeze and transfer options at the point of sale, so members know the alternatives before they need them.",
    escalation: "Escalate to the Studio Director above ₹20,000 or for repeat exception requests from the same member.",
    relatedTemplates: ["TPL-124", "TPL-029", "TPL-112"],
    tags: ["refund exception", "medical refund", "relocation", "pregnancy", "doctor's note", "policy exception"],
  }),

  article({
    id: "KB-060",
    title: "Promo Code or Offer Not Applying at Checkout",
    category: "Pricing and Memberships",
    subcategory: "Offers, Invoices & Corporate",
    summary:
      "A promo code, referral credit, guest pass or newcomer offer didn't apply. Check the offer's rules and the member's eligibility, apply it correctly or explain why not, and get broken codes fixed fast.",
    glance: {
      priority: "P3 (P2 if a live campaign code is broken for everyone)",
      owner: "Front Desk → Marketing (code owner)",
      respond: "Within 2 hours",
      resolve: "Same day",
    },
    firstFive: [
      "Get the exact code, the plan being bought, the channel (app, website, desk) and a screenshot of any error.",
      "Check the code's rules in Momence: dates, eligible plans, new members only, usage limits.",
      "Check whether the member has already paid without the discount.",
    ],
    steps: [
      "Check the code is active and today falls within its dates.",
      "Check eligibility: plan type, new versus returning members, one use per person, and the overall usage limit.",
      "Valid code that won't apply: apply the discount at the desk or by a discounted payment link, and tell Marketing the code is broken.",
      "Paid full price despite a valid code: refund the difference or add account credit, whichever the member prefers (TPL-023).",
      "Not eligible: explain the rule kindly and offer the best deal they do qualify for.",
      "Referral credit missing (TPL-020): confirm the friend joined with their code and paid, then add the credit manually.",
      "Guest pass or newcomer offer (TPL-016, TPL-122): check the guest really is new (no earlier profile with that phone number) before applying it.",
      "If several members report the same code failing, alert Marketing straight away - a campaign may be live.",
    ],
    diagnose: [
      ["'Code invalid' for everyone", "Expired or misconfigured - Marketing fixes it; the desk applies the discount manually meanwhile."],
      ["Works on the website, not in the app", "App checkout issue - take payment by link and raise TPL-055."],
      ["Newcomer offer used by a returning member", "Not eligible - explain, and see KB-048 if it looks deliberate."],
    ],
    say: [
      [
        "Not eligible",
        "That code is for first-time members and your profile goes back to 2023 - but this month's returning-member offer gives you 15% off, so let me apply that instead.",
      ],
    ],
    dos: ["Check the rules before promising anything.", "Honour the price the member was promised.", "Tell Marketing quickly when a live code breaks."],
    donts: ["Don't stack offers unless the rules allow it.", "Don't create one-off codes without Marketing's approval."],
    closeOut: ["Discount applied or difference refunded, or eligibility explained.", "Broken codes reported to Marketing."],
    prevention: "Marketing tests every code in the app, on the website and at the desk before launch, and shares a one-page offer sheet with the desk.",
    escalation:
      "Escalate to Marketing immediately if a campaign code fails for more than three members; see KB-048 for suspected misuse.",
    relatedTemplates: ["TPL-010", "TPL-020", "TPL-016", "TPL-122"],
    tags: ["promo code", "offer", "discount", "referral", "guest pass", "newcomer offer"],
  }),

  article({
    id: "KB-061",
    title: "GST Invoice, GSTIN Corrections & Credit Notes",
    category: "Pricing and Memberships",
    subcategory: "Offers, Invoices & Corporate",
    summary:
      "Requests for a GST invoice, a company name or GSTIN added or corrected, or a credit note after a refund. Check the details, issue or correct the document properly, and keep GST records consistent with what's been filed.",
    glance: {
      priority: "P3 (P2 if a corporate client needs it for month-end claims)",
      owner: "Front Desk → Finance",
      respond: "Within 4 hours",
      resolve: "Within 2 working days",
    },
    firstFive: [
      "Find the payment and any invoice already issued.",
      "Collect the legal company name, GSTIN, billing address and the email to send it to.",
      "Check whether the original invoice falls in a GST month that has already been filed.",
    ],
    steps: [
      "Missing invoice: resend it from Momence or the billing system to the member's email.",
      "GSTIN or company name to add: check the GSTIN format (15 characters, starting with the state code) and that the name matches the GST portal.",
      "Correction within the same, unfiled month: Finance cancels and reissues the invoice with the correct details.",
      "Correction after that month's GST return is filed: Finance issues a credit note against the original and a new invoice (TPL-128) - never edit a filed invoice.",
      "Refund given: Finance issues a credit note for the refunded amount, linked to the original invoice.",
      "Corporate billing against a purchase order: follow KB-062 and TPL-127.",
      "Send the document as a PDF and note the invoice or credit note number on the ticket.",
    ],
    diagnose: [
      ["GSTIN rejected", "Check the state code and the PAN inside it, and confirm with the member's finance team."],
      ["Invoice wanted in a different company's name", "Only the paying company can be billed - get confirmation from that company."],
      ["Last quarter's invoice needs changes", "Issue a credit note and a new invoice - don't edit the old one."],
    ],
    say: [
      [
        "Asking for details",
        "Happy to. Please share your company's legal name, GSTIN and billing address exactly as they appear on the GST certificate, and I'll send the invoice within 2 working days.",
      ],
    ],
    dos: ["Copy the GSTIN exactly from the certificate.", "Use credit notes for changes after filing.", "Record document numbers on the ticket."],
    donts: ["Don't edit an invoice already reported in a GST return.", "Don't invoice a company that didn't pay."],
    closeOut: ["Invoice or credit note issued and sent.", "Document numbers recorded on the ticket."],
    prevention: "Capture GSTIN and company details at checkout for corporate buyers, and send invoices automatically on payment.",
    escalation: "Escalate to the Finance Manager for corrections across financial years or disputes about the GST charged.",
    relatedTemplates: ["TPL-027", "TPL-028", "TPL-128"],
    tags: ["gst", "invoice", "gstin", "credit note", "billing", "finance"],
  }),

  article({
    id: "KB-062",
    title: "Corporate Membership Setup & Employee Verification",
    category: "Pricing and Memberships",
    subcategory: "Offers, Invoices & Corporate",
    summary:
      "Setting up a corporate wellness partnership and verifying employees who claim the corporate rate. Agree the terms in writing, set up the plan and billing, verify each employee and keep the roster current.",
    glance: {
      priority: "P2 for new partnerships; P3 for individual verifications",
      owner: "Sales & Client Servicing → Finance (Memberships for plan setup)",
      respond: "Within 1 working day",
      resolve: "Setup within 5 working days; verifications within 1 working day",
    },
    firstFive: [
      "Get the company name, HR contact, number of employees and the offer agreed.",
      "Check that a signed agreement or approved proposal exists.",
      "For an individual employee, ask for their work email or company ID.",
    ],
    steps: [
      "Confirm the commercial terms in writing: rate or discount, eligible plans, who pays (company or employee), billing cycle and agreement period.",
      "Set up the corporate plan or discount code in Momence, limited to the agreed plans.",
      "Billing: company-paid plans are invoiced to the company with its GSTIN and PO number (TPL-127); employee-paid plans use the corporate code.",
      "Verify each employee by work email domain or against the HR list - a visiting card alone isn't enough (TPL-121).",
      "Tag verified profiles with the company name so reports and renewals stay correct.",
      "Send HR a welcome pack: how to sign up, eligible classes and studio locations.",
      "Each quarter, send HR a usage report and ask for leavers, so ex-employees move to standard pricing at renewal.",
    ],
    diagnose: [
      ["Employee's email domain doesn't match", "Ask HR to confirm before applying the rate."],
      ["Company's accounts team rejected the invoice", "PO number or GSTIN missing - reissue with them (KB-061)."],
      ["Ex-employee still on corporate pricing", "Move them to standard pricing at the next renewal, with notice."],
    ],
    say: [
      [
        "Verifying an employee",
        "Welcome! To apply your company's corporate rate I just need to verify your work email - I'll send a code to your company address.",
      ],
    ],
    dos: ["Put every agreed term in writing before launch.", "Verify each employee.", "Review the roster with HR every quarter."],
    donts: ["Don't apply corporate rates on someone's word alone.", "Don't launch before the billing details are confirmed."],
    closeOut: ["Plan or code live and tested; billing set up.", "Employees verified and tagged.", "HR contact has the welcome pack."],
    prevention: "Use a standard corporate agreement template and a self-serve verification link that checks the email domain.",
    escalation: "Escalate to the Sales Head for non-standard terms, and to Finance for payment terms beyond 30 days.",
    relatedTemplates: ["TPL-018", "TPL-121", "TPL-127"],
    tags: ["corporate", "corporate wellness", "employee verification", "purchase order", "b2b", "corporate rate"],
  }),
];
