// Knowledge Base — Internal Operations & Admin: vendor invoices, AMC renewals,
// stock counts and capex, licences and audits, leave cover and new joiners,
// checklists and shift handovers.
import { article, type KnowledgeArticle } from "./compose";

export const INTERNAL_OPS_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-151",
    title: "Vendor Invoice Dispute or Payment Delay",
    category: "Internal Operations & Admin",
    subcategory: "Cash, Payroll & Vendor Payments",
    summary:
      "A vendor's invoice doesn't match the PO, the delivery or the agreed rate, or a vendor is chasing a late payment. Check the paperwork, settle the difference in writing, and pay correct invoices on time.",
    glance: {
      priority: "P3 (P2 if a critical vendor threatens to stop service)",
      owner: "Studio Operations Manager → Finance",
      respond: "Within 2 working days",
      resolve: "Within 2 weeks",
    },
    firstFive: [
      "Get the invoice, the PO or quote, and the delivery or service records.",
      "Pin down exactly what doesn't match — quantity, rate, GST or dates.",
      "Check whether the vendor is critical (laundry, housekeeping, an AMC).",
    ],
    steps: [
      "Match the invoice against the PO or contract and the delivery note or service report (a three-way match).",
      "Note each difference with evidence: a short delivery, the wrong rate, missing GST details, or work not done.",
      "Raise it with the vendor in writing (TPL-233) and ask for a corrected invoice or credit note.",
      "Pay the undisputed amount on time and hold back only the disputed part.",
      "If the delay is on our side, Finance checks the approvals and gives the vendor a firm date.",
      "Check the GST details (GSTIN, HSN/SAC codes, tax rates) so input credit isn't lost.",
      "Record the outcome; repeated problems feed into vendor reviews (TPL-102, KB-049).",
    ],
    diagnose: [
      ["Invoice rate above the contract", "Ask for a corrected invoice."],
      ["Service not delivered", "Attach the service log and dispute the charge."],
      ["Vendor unpaid for 60 days", "Escalate to Finance for a firm payment date."],
    ],
    say: [
      [
        "To the vendor",
        "Thanks for the invoice. Two lines don't match our PO — the towel count and the per-kg rate. Could you send a corrected invoice? We'll pay the undisputed amount this week.",
      ],
    ],
    dos: ["Do a three-way match.", "Pay undisputed amounts on time.", "Put disputes in writing."],
    donts: ["Don't hold the whole payment over a small dispute.", "Don't approve invoices without checking delivery."],
    closeOut: ["Corrected invoice or credit note received and payment made.", "Outcome recorded."],
    prevention: "Raise POs for every purchase, sign delivery notes, and make payment terms clear to vendors.",
    escalation:
      "Escalate to Finance for payments overdue beyond terms, and to the Studio Director if a critical vendor threatens to stop.",
    relatedTemplates: ["TPL-233", "TPL-102"],
    tags: ["vendor invoice", "payment delay", "purchase order", "gst", "accounts payable"],
  }),

  article({
    id: "KB-152",
    title: "AMC Renewal or Service Contract Due",
    category: "Internal Operations & Admin",
    subcategory: "Vendors, Stock & Purchasing",
    summary:
      "An annual maintenance contract — AC, bikes, lift, CCTV, fire systems — is due for renewal. Review last year's service, compare quotes, renegotiate the terms, and renew before cover lapses.",
    glance: {
      priority: "P3 (P1 if cover for a safety system lapses within 2 weeks)",
      owner: "Facilities Manager → Finance",
      respond: "Start 60 days before expiry",
      resolve: "Renewed before expiry",
    },
    firstFive: [
      "List the contracts expiring in the next 90 days.",
      "Pull last year's service record: visits, response times and breakdowns.",
      "Check the budget.",
    ],
    steps: [
      "Log the renewal (TPL-232) with the contract, expiry date and value.",
      "Review performance: planned visits completed, breakdown response times, repeat faults (KB-049).",
      "Get at least two comparable quotes for significant contracts.",
      "Negotiate response times, parts cover and penalties for missed visits.",
      "Get approval within the spending limits and issue the PO.",
      "Schedule the year's preventive maintenance visits (TPL-207).",
      "File the signed contract and put the next renewal in the calendar.",
    ],
    diagnose: [
      ["Vendor missed visits last year", "Renegotiate or switch vendors."],
      ["Contract has already expired", "Renew urgently and arrange interim cover."],
      ["Price up by more than 10%", "Ask for a justification and get other quotes."],
    ],
    say: [
      [
        "To the vendor",
        "We'd like to renew the AC maintenance contract, but we need a 4-hour breakdown response and quarterly visits included. Could you revise the quote?",
      ],
    ],
    dos: ["Start 60 days ahead.", "Review performance.", "Get comparable quotes."],
    donts: ["Don't let cover for safety systems lapse.", "Don't auto-renew without a review."],
    closeOut: ["Contract renewed and filed.", "Visits scheduled."],
    prevention: "Keep a contract register with expiry dates and reminders 90 days ahead.",
    escalation:
      "Escalate to the Studio Director for contracts above the approval limit or any lapse in safety-system cover (TPL-102 for vendor problems).",
    relatedTemplates: ["TPL-232", "TPL-207", "TPL-102"],
    tags: ["amc", "maintenance contract", "renewal", "vendor", "service contract"],
  }),

  article({
    id: "KB-153",
    title: "Stock Count Discrepancy",
    category: "Internal Operations & Admin",
    subcategory: "Vendors, Stock & Purchasing",
    summary:
      "The physical count of consumables, retail stock or equipment doesn't match the records. Recount, find the cause — recording errors, transfers, wastage or loss — correct the records and fix the process.",
    glance: {
      priority: "P3 (P2 for high-value or recurring gaps)",
      owner: "Studio Operations Manager → Finance",
      respond: "Within 2 working days",
      resolve: "Within 1 week",
    },
    firstFive: [
      "Recount with a second person.",
      "Check what happened since the last count.",
      "List the items and the size of each gap.",
    ],
    steps: [
      "Recount with a witness and confirm the gap.",
      "Check the records: unrecorded deliveries, transfers between studios, write-offs and usage logs.",
      "Look for patterns — one item, one studio or one shift.",
      "Log it (TPL-236) with the items, the gap, the value and likely causes.",
      "Correct the records with Finance's approval, noting the reason.",
      "If theft is suspected, follow KB-148 or KB-147.",
      "Fix the process: record deliveries the same day, use a transfer form, and count weekly (TPL-103).",
    ],
    diagnose: [
      ["More stock than recorded", "A delivery wasn't recorded — update the records."],
      ["Consumables always short", "Usage is above par — adjust the levels."],
      ["Equipment missing", "Check transfers and repairs first, then investigate."],
    ],
    say: [
      [
        "To Finance",
        "The count shows 12 fewer shampoo refills than recorded. Ten went to Kenkere House without a transfer form — I've corrected the records, and we'll use the form from now on.",
      ],
    ],
    dos: ["Recount with a witness.", "Check records before suspecting theft.", "Fix the process."],
    donts: ["Don't adjust records without approval.", "Don't skip counts in busy weeks."],
    closeOut: ["Records corrected with reasons.", "Process fixed."],
    prevention: "Count weekly, record deliveries and transfers the same day, and keep stock in a locked storeroom.",
    escalation:
      "Escalate to Finance for write-offs above the limit, and to the Studio Director for repeated unexplained losses.",
    relatedTemplates: ["TPL-236", "TPL-103"],
    tags: ["stock count", "inventory", "discrepancy", "reconciliation", "stock control"],
  }),

  article({
    id: "KB-154",
    title: "Capex Request — New Equipment or Studio Upgrade",
    category: "Internal Operations & Admin",
    subcategory: "Vendors, Stock & Purchasing",
    summary:
      "A studio needs new equipment, a major replacement or an upgrade — bikes, speakers, AC, flooring. Build a clear business case with quotes, get approval within the limits, and plan the purchase and installation around classes.",
    glance: {
      priority: "P3 (P2 when replacing unsafe or failed equipment)",
      owner: "Studio Operations Manager → Studio Director → Finance",
      respond: "Business case within 1 week",
      resolve: "Decision within 2 weeks",
    },
    firstFive: [
      "Define what's needed and why — safety, demand, or worn-out equipment.",
      "Get at least two quotes.",
      "Check the budget, and whether a repair would be cheaper.",
    ],
    steps: [
      "Raise the request (TPL-206) with the need, quantity, quotes, budget line and urgency.",
      "Compare repair with replacement: repair history and cost, age, warranty and downtime.",
      "Show the benefit — safety, member experience, revenue (more bikes for full classes) or savings.",
      "Get approval under the delegation of authority.",
      "Raise the PO, agree delivery and installation, and plan around the class schedule.",
      "On delivery, check against the PO, test it, and register the asset and its warranty.",
      "Small extra items that don't need capex go on TPL-041.",
    ],
    diagnose: [
      ["Old bikes failing often", "Make a replacement case using the repair history."],
      ["Request has no quotes", "Send it back for quotes."],
      ["Urgent safety replacement", "Fast-track the approval."],
    ],
    say: [
      [
        "To the Studio Director",
        "Four of our 2019 bikes have needed 11 repairs this year, costing ₹68,000. Replacing them costs ₹6.4 lakh with a 3-year warranty — the quotes are attached.",
      ],
    ],
    dos: ["Get comparable quotes.", "Show the repair history.", "Register new assets."],
    donts: ["Don't buy before approval.", "Don't install during classes."],
    closeOut: ["Approved, bought, installed and registered.", "Warranty filed."],
    prevention: "Keep an asset register with ages and repair costs, and plan replacements in the yearly budget.",
    escalation: "Escalate to the Studio Director for urgent safety replacements or requests over budget.",
    relatedTemplates: ["TPL-206", "TPL-041"],
    tags: ["capex", "equipment purchase", "upgrade", "business case", "approval", "assets"],
  }),

  article({
    id: "KB-155",
    title: "Licence or Permit Renewal Due",
    category: "Internal Operations & Admin",
    subcategory: "Compliance & Licences",
    summary:
      "A trade licence, Shops and Establishments registration, fire NOC, signage permit or similar is due for renewal. Track deadlines, gather documents early, file on time, and keep copies displayed and on file.",
    glance: {
      priority: "P2 (P1 if it expires within 30 days)",
      owner: "Studio Operations Manager → Admin / Legal",
      respond: "Start 90 days before expiry",
      resolve: "Renewed before expiry",
    },
    firstFive: [
      "Check the licence register for upcoming expiries.",
      "List the documents the authority needs.",
      "Check the fees and any inspection requirement.",
    ],
    steps: [
      "Log the renewal (TPL-237) with the licence, authority, expiry date and owner.",
      "Gather documents: the previous licence, rent agreement, ID proofs, fire NOC and photos as needed.",
      "Book any required inspection, such as fire safety, well in advance.",
      "File the application, pay the fees and keep the receipts.",
      "Follow up with the authority until the renewed licence is issued.",
      "Display the renewed licence where required and file a copy.",
      "Update the register with the new expiry date and reminders (TPL-105 for compliance audits).",
    ],
    diagnose: [
      ["Inspection found a problem", "Fix it quickly and book a re-inspection (KB-156)."],
      ["Licence has already expired", "File immediately and get Legal's advice on penalties."],
      ["A document is missing", "Request it from the landlord or Admin now."],
    ],
    say: [
      [
        "To Admin",
        "The Bandra Shops and Establishments registration expires on 31 March. I've gathered the documents — could you file it this week?",
      ],
    ],
    dos: ["Start 90 days ahead.", "Keep receipts.", "Update the register."],
    donts: ["Don't wait for the expiry date.", "Don't operate on an expired licence."],
    closeOut: ["Licence renewed, displayed and filed.", "Register updated."],
    prevention: "Keep a licence register with reminders at 90, 60 and 30 days.",
    escalation: "Escalate to the Studio Director and Legal if a licence is about to lapse or an application is rejected.",
    relatedTemplates: ["TPL-237", "TPL-105"],
    tags: ["licence renewal", "permit", "compliance", "fire noc", "registration", "legal"],
  }),

  article({
    id: "KB-156",
    title: "Audit or Inspection Finding — Corrective Action",
    category: "Internal Operations & Admin",
    subcategory: "Compliance & Licences",
    summary:
      "An internal audit, fire inspection, landlord check or brand audit has found a problem. Understand it, agree a corrective action with an owner and deadline, fix it, and show the evidence.",
    glance: {
      priority: "P2 (P1 for safety or legal findings)",
      owner: "Studio Operations Manager",
      respond: "Action plan within 3 working days",
      resolve: "By the finding's deadline",
    },
    firstFive: [
      "Read the finding and confirm what's required.",
      "Check for an immediate risk that needs fixing today.",
      "Assign an owner.",
    ],
    steps: [
      "Log the finding (TPL-111) with its source, description, risk level and deadline.",
      "Fix immediate risks first — a blocked exit, an expired extinguisher.",
      "Find the root cause, not just the symptom.",
      "Agree corrective actions with owners and dates.",
      "Update SOPs or checklists if the process was the problem (TPL-242).",
      "Collect evidence of the fix — photos, records, certificates.",
      "Close the finding with the auditor and record it (TPL-105 for follow-up audits).",
    ],
    diagnose: [
      ["Fire extinguishers overdue", "Service them today and add the date to the calendar (see KB-139)."],
      ["Checklists not signed", "Retrain and add a sign-off (KB-159)."],
      ["Same finding as the last audit", "The root cause wasn't fixed — escalate."],
    ],
    say: [
      [
        "To the auditor",
        "All three findings are closed: extinguishers serviced on the 12th, the first-aid log updated, and the opening checklist now has a daily sign-off. Evidence is attached.",
      ],
    ],
    dos: ["Fix immediate risks first.", "Find the root cause.", "Keep the evidence."],
    donts: ["Don't close findings without evidence.", "Don't treat a repeat finding as new."],
    closeOut: ["Corrective actions complete with evidence.", "Finding closed."],
    prevention: "Run monthly self-audits with the same checklist the auditors use.",
    escalation: "Escalate to the Studio Director for safety or legal findings and for repeat findings.",
    relatedTemplates: ["TPL-111", "TPL-105", "TPL-242"],
    tags: ["audit", "inspection", "finding", "corrective action", "compliance", "sop"],
  }),

  article({
    id: "KB-157",
    title: "Unplanned or Sick Leave — Covering the Shift",
    category: "Internal Operations & Admin",
    subcategory: "Staffing & HR Admin",
    summary:
      "A staff member calls in sick or has an emergency and can't work their shift. Make sure they're okay, cover the shift fast, record the leave properly, and keep the studio running.",
    glance: {
      priority: "P1 if the shift starts within 4 hours (P2 otherwise)",
      owner: "Studio Operations Manager / Front Desk Lead → HR",
      respond: "Within 30 minutes",
      resolve: "Shift covered before it starts",
    },
    firstFive: [
      "Check the staff member is okay and whether they need anything.",
      "Check who's rostered and who's available.",
      "Start contacting cover in order.",
    ],
    steps: [
      "Record the absence (TPL-245): name, shift, reason and expected return.",
      "Find cover: someone on the same shift extending, then staff on rest days nearby, then other studios.",
      "If a trainer is off sick, arrange class cover (KB-067 or KB-068).",
      "If no cover is possible, adapt: a manager covers, desk services are trimmed, or tasks are combined.",
      "Update the roster in Zoho Shift (KB-134) and record any swaps (TPL-247).",
      "Record the leave correctly (TPL-086), with a medical certificate if the policy requires one.",
      "Check in with them about their return.",
    ],
    diagnose: [
      ["Opening shift with nobody", "The manager opens while cover is called in."],
      ["Frequent short-notice absences", "A conversation with HR."],
      ["Several staff sick at once", "Reduce services and tell members if needed."],
    ],
    say: [
      [
        "To the staff member",
        "Thanks for letting me know — rest up and don't worry about today, we've got it covered. Let me know how you're feeling tomorrow.",
      ],
    ],
    dos: ["Check on the person.", "Cover the shift fast.", "Record the leave."],
    donts: ["Don't pressure sick staff to come in.", "Don't leave the roster unchanged."],
    closeOut: ["Shift covered and roster updated.", "Leave recorded."],
    prevention: "Keep a cover list for each studio and cross-train staff across roles.",
    escalation: "Escalate to the Studio Operations Manager if a shift can't be covered, and to HR for patterns.",
    relatedTemplates: ["TPL-245", "TPL-086", "TPL-247"],
    tags: ["sick leave", "unplanned leave", "shift cover", "staffing", "absence", "roster"],
  }),

  article({
    id: "KB-158",
    title: "New Joiner — Day-One Readiness",
    category: "Internal Operations & Admin",
    subcategory: "Staffing & HR Admin",
    summary:
      "Making a new joiner's first day work: documents and checks done, access ready, uniform and induction planned, and a buddy assigned — so they feel welcome and can start contributing safely.",
    glance: {
      priority: "P2 (P1 if they start within 2 working days)",
      owner: "Hiring manager → HR / IT",
      respond: "Start preparing as soon as the offer is accepted",
      resolve: "Everything ready before day one",
    },
    firstFive: [
      "Confirm the start date, role, studio and manager.",
      "Check the joining documents and background verification status.",
      "Request system access.",
    ],
    steps: [
      "HR collects joining documents and completes background verification (TPL-251).",
      "Raise the onboarding (TPL-089) and system access requests (TPL-215, KB-124).",
      "Arrange the uniform, locker, name badge and any keys or access cards.",
      "Plan the first week: induction, a safety briefing on exits, first aid and the emergency protocol (KB-009), and shadow shifts.",
      "Assign a buddy for the first two weeks.",
      "On day one, the manager welcomes them, introduces the team and walks them round the studio.",
      "Check in at the end of week one and set probation goals.",
    ],
    diagnose: [
      ["Documents incomplete", "HR follows up before day one."],
      ["No system access on day one", "Raise it urgently with IT (KB-124)."],
      ["No buddy available", "The manager acts as buddy."],
    ],
    say: [
      [
        "Welcome",
        "Welcome to the team! Your first week includes a studio tour, a safety briefing and shadow shifts with Priya, who'll be your buddy.",
      ],
    ],
    dos: ["Prepare before day one.", "Give a safety briefing.", "Assign a buddy."],
    donts: ["Don't let anyone start before background checks are done.", "Don't skip the safety briefing."],
    closeOut: ["Day-one checklist complete.", "Week-one check-in done."],
    prevention: "Use a standard onboarding checklist for every role.",
    escalation: "Escalate to HR if documents or verification are still incomplete the day before joining.",
    relatedTemplates: ["TPL-089", "TPL-251", "TPL-215"],
    tags: ["new joiner", "onboarding", "induction", "first day", "buddy", "hr"],
  }),

  article({
    id: "KB-159",
    title: "Opening or Closing Checklist Missed",
    category: "Internal Operations & Admin",
    subcategory: "Daily Operations & Continuity",
    summary:
      "A studio opened or closed without the checklist being done — lights or AC left on, cash not counted, doors unlocked, equipment unchecked. Fix what was missed, then make the checklist stick.",
    glance: {
      priority: "P2 (P1 if security or safety items were missed)",
      owner: "Front Desk Lead → Studio Operations Manager",
      respond: "Same day",
      resolve: "Fixed immediately; process review within 1 week",
    },
    firstFive: [
      "Find out exactly what was missed.",
      "Fix urgent items now — lock-up, cash, safety checks.",
      "Find out who was on shift.",
    ],
    steps: [
      "Go through each checklist item now and fix what was missed (lights, AC, cash, doors, bikes, exits).",
      "Security items missed (doors, alarm): follow KB-145.",
      "Cash not counted: count it with a witness and reconcile (KB-032).",
      "Log it (TPL-238) with the items missed and the shift.",
      "Talk to the staff on shift — was the checklist unclear, too long, or rushed?",
      "Make it stick: a printed or digital checklist with sign-off, and photos of key items.",
      "Managers spot-check checklists weekly; handover gaps go on TPL-243.",
    ],
    diagnose: [
      ["AC left on overnight", "Add it to the closing sign-off."],
      ["Bikes not checked at opening", "Add the bike walk-through to opening."],
      ["Checklist signed but items missed", "Spot-checks and coaching."],
    ],
    say: [
      [
        "To the team",
        "Last night's closing missed the AC and the back door. From today, please sign the closing checklist and send a photo of the locked door to the group.",
      ],
    ],
    dos: ["Fix urgent items first.", "Use sign-offs.", "Spot-check weekly."],
    donts: ["Don't sign off items you haven't done.", "Don't blame anyone before understanding why."],
    closeOut: ["Missed items fixed.", "Checklist process updated."],
    prevention: "Keep checklists short and specific, with a sign-off and weekly spot-checks.",
    escalation: "Escalate to the Studio Operations Manager for missed security items or repeated lapses.",
    relatedTemplates: ["TPL-238", "TPL-243"],
    tags: ["opening checklist", "closing checklist", "lock-up", "daily operations", "sign-off"],
  }),

  article({
    id: "KB-160",
    title: "Shift Handover Gaps",
    category: "Internal Operations & Admin",
    subcategory: "Daily Operations & Continuity",
    summary:
      "Something was lost between shifts — an unanswered member, a pending refund, a broken bike or a promised call-back. Keep handovers short, written and confirmed, so nothing falls through the cracks.",
    glance: {
      priority: "P2 (P1 if a member or safety issue was dropped)",
      owner: "Front Desk Lead → Studio Operations Manager",
      respond: "Same day",
      resolve: "Process fixed within 1 week",
    },
    firstFive: [
      "Pick up whatever was dropped and resolve it now.",
      "Find what the handover said — or didn't.",
      "Tell the affected member or colleague.",
    ],
    steps: [
      "Resolve the dropped item first: call the member back, process the refund, block the bike.",
      "Check the handover record — was it written down, and was it read?",
      "Log the gap (TPL-243) with what was missed and the impact.",
      "Use a standard handover note: open tickets, member call-backs, faults, cash, deliveries and VIP visits.",
      "Outgoing and incoming staff go through the handover together for 5 minutes.",
      "Open items live in IRIS tickets with owners, not only in chat.",
      "Update the SOP if the handover format needs changing (TPL-242).",
    ],
    diagnose: [
      ["Promised call-back not made", "Call today and add call-backs to the handover note."],
      ["A faulty bike was used after being reported", "Block faults in Momence at once (KB-064)."],
      ["Handover happened only in chat", "Use the handover note and tickets."],
    ],
    say: [
      [
        "To the member",
        "I'm sorry you didn't hear back yesterday — that got lost between shifts. I've processed your refund now, and you'll get the confirmation today.",
      ],
    ],
    dos: ["Write handovers down.", "Go through them in person.", "Keep open items in tickets."],
    donts: ["Don't rely on memory.", "Don't hand over only in chat."],
    closeOut: ["Dropped items resolved.", "Handover format updated."],
    prevention: "Use a short written handover at every shift change and review open tickets together.",
    escalation: "Escalate to the Studio Operations Manager if a dropped item affected a member's money or safety.",
    relatedTemplates: ["TPL-243", "TPL-242"],
    tags: ["shift handover", "handover", "communication", "dropped tasks", "front desk"],
  }),
];
