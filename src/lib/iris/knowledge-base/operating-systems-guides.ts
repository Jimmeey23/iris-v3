// Knowledge Base - Operating Systems: Momence booking sync and listings,
// member search and reports, payment gateway outages, and Zoho Shift rosters
// and attendance.
import { article, type KnowledgeArticle } from "./compose";

export const OPERATING_SYSTEMS_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-129",
    title: "Momence Booking Sync Issue - Bookings Missing or Duplicated",
    category: "Operating Systems",
    subcategory: "Momence Bookings & Schedule",
    summary:
      "Bookings made in the app or website don't show in Momence, appear twice, or land on the wrong class. Protect members' places, find the pattern, and get IT to fix the sync before the next class.",
    glance: {
      priority: "P1 if several bookings are affected (P2 for one member)",
      owner: "Front Desk → IT",
      respond: "Within 30 minutes",
      resolve: "Within 4 hours",
    },
    firstFive: [
      "Ask the member for their booking confirmation - a screenshot or email.",
      "Check the class roster in Momence for their name.",
      "Check whether others who booked around the same time are affected.",
    ],
    steps: [
      "Honour the member's confirmation: add them to the class manually if there's space (KB-027).",
      "Duplicates: keep one booking, cancel the extra without a fee, and check credits weren't taken twice (KB-053).",
      "Look for the pattern - the same channel (app, website, partner), time window or class?",
      "Log it (TPL-058) with booking references, times and screenshots; roster mismatches go on TPL-069 and integration errors on TPL-060.",
      "Check upcoming classes for the same problem and correct rosters before they start.",
      "IT checks the integration logs and reprocesses failed bookings.",
      "Tell affected members their booking is confirmed.",
    ],
    diagnose: [
      ["Confirmation email but no booking in Momence", "Sync failure - add them manually and log it."],
      ["Booking shows twice", "Cancel the duplicate and return the credit."],
      ["Booking landed on the wrong class", "Listing or sync mapping - see KB-130."],
    ],
    say: [
      [
        "At the desk",
        "I can see your confirmation - the booking didn't come through on our side, so I've added you to the class now. You're on mat 6.",
      ],
    ],
    dos: ["Honour confirmations.", "Fix credits.", "Check upcoming classes."],
    donts: ["Don't turn away a member with a valid confirmation.", "Don't leave duplicates to sort themselves out."],
    closeOut: ["Rosters corrected and credits checked.", "Sync issue logged and fixed."],
    prevention: "Check rosters against the booking channels daily in busy periods and after any integration change.",
    escalation: "Escalate to the IT lead if more than five bookings are affected or the issue repeats.",
    relatedTemplates: ["TPL-058", "TPL-069", "TPL-060"],
    tags: ["booking sync", "momence", "missing booking", "duplicate booking", "integration"],
  }),

  article({
    id: "KB-130",
    title: "Class Listing Error on the Schedule",
    category: "Operating Systems",
    subcategory: "Momence Bookings & Schedule",
    summary:
      "A class shows the wrong time, studio, trainer, format or capacity in Momence, the app or the website. Correct it at the source, contact anyone already booked, and stop it happening again.",
    glance: {
      priority: "P1 if bookings are affected (P2 otherwise)",
      owner: "Scheduling → IT",
      respond: "Within 1 hour",
      resolve: "Same day",
    },
    firstFive: [
      "Compare the listing with the master schedule.",
      "Check how many members have booked the wrong listing.",
      "Don't delete the class - that cancels bookings without notice.",
    ],
    steps: [
      "Pin down what's wrong: time, date, studio, trainer, format, capacity or price.",
      "Edit the class in Momence - the single class or the whole recurring series, as needed - rather than deleting and recreating it.",
      "Tell booked members about the change, and move or cancel free of charge if it doesn't suit them (KB-063).",
      "Check the change shows correctly in the app and on the website.",
      "Log it (TPL-209) with before-and-after screenshots; member booking errors go on TPL-133.",
      "Find the cause: a recurring series edited wrongly, a template error, or a sync problem (KB-129).",
      "Fix the template so future classes are right (TPL-068 for planned changes).",
    ],
    diagnose: [
      ["Every Thursday class is wrong", "Recurring series error - fix the series."],
      ["Right in Momence, wrong on the website", "Sync or cache - IT."],
      ["Capacity higher than the room holds", "Set capacity to the room's bike or mat count."],
    ],
    say: [
      [
        "Member message",
        "Quick correction: Saturday's PowerCycle is at 9 am, not 8 am as first listed. Your booking has moved automatically - reply if 9 am doesn't work and we'll cancel it free of charge.",
      ],
    ],
    dos: ["Fix it at the source.", "Tell booked members.", "Fix the template."],
    donts: ["Don't delete classes that have bookings.", "Don't change times without telling members."],
    closeOut: ["Listing corrected everywhere.", "Booked members contacted."],
    prevention: "Have a second person check new or edited listings before they're published.",
    escalation:
      "Escalate to IT if the listing still displays wrongly after the correction, and to the Studio Operations Manager if many members were affected.",
    relatedTemplates: ["TPL-209", "TPL-133", "TPL-068"],
    tags: ["class listing", "schedule error", "wrong time", "momence", "timetable"],
  }),

  article({
    id: "KB-131",
    title: "Momence Member Search Not Working",
    category: "Operating Systems",
    subcategory: "Momence Outages, Search & Reports",
    summary:
      "The desk can't find a member in Momence - search returns nothing, the wrong person, or takes forever. Try other ways to find them, check for duplicates and data errors, and report system problems to IT.",
    glance: {
      priority: "P2 (P1 if the desk can't check in or sell at peak time)",
      owner: "Front Desk → IT",
      respond: "Within 30 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Search by phone number, email and last name - not just the first name.",
      "Ask the member which details they signed up with.",
      "Check whether search works for other members.",
    ],
    steps: [
      "Try different fields: phone (with and without +91), email, last name and member ID.",
      "Check for spelling variations or a different name on the account.",
      "If search fails for everyone, check Momence's status; if it's down, follow KB-026.",
      "Member exists twice: merge the profiles (KB-092).",
      "No profile at all: check whether they signed up at another studio or through a partner.",
      "Log it (TPL-054) with examples of failed searches; platform outages go on TPL-048.",
      "Check the member in by hand and fix their details so they're easy to find next time.",
    ],
    diagnose: [
      ["Found by email but not by phone", "The phone is saved in another format - update it."],
      ["Search slow or timing out", "Momence performance - IT."],
      ["Two members with the same name", "Confirm with the phone number or email."],
    ],
    say: [["At the desk", "Could you tell me the phone number you signed up with? Our search is being fussy today."]],
    dos: ["Search several fields.", "Fix data so members are findable.", "Check for duplicates."],
    donts: ["Don't create a new profile until you've searched thoroughly.", "Don't read out other members' details."],
    closeOut: ["Member found and details fixed.", "Search fault logged if it's systemic."],
    prevention: "Save phone numbers in one format and always search before creating a new profile.",
    escalation: "Escalate to IT if search fails for every member or is very slow.",
    relatedTemplates: ["TPL-054", "TPL-048"],
    tags: ["member search", "momence", "find member", "duplicate profile", "front desk"],
  }),

  article({
    id: "KB-132",
    title: "Momence Report or Export Looks Wrong",
    category: "Operating Systems",
    subcategory: "Momence Outages, Search & Reports",
    summary:
      "A Momence report or export doesn't match reality - attendance, revenue, memberships or payouts. Check the filters and definitions first, compare with source records, and get IT or BI to fix genuine data problems.",
    glance: {
      priority: "P2 (P1 if it affects payroll, payouts or month-end finance)",
      owner: "Requester → IT / BI",
      respond: "Within 1 working day",
      resolve: "Within 3 working days",
    },
    firstFive: [
      "Note the report name, filters, date range and the number that looks wrong.",
      "Compare it with a trusted source - bank settlement, class rosters or invoices.",
      "Check whether the report defines the number differently from what you expect.",
    ],
    steps: [
      "Check the filters: date range, studio, time zone, and whether cancelled or refunded items are included.",
      "Check the definitions: gross or net, with or without GST, booking date or class date.",
      "Compare a small sample - one day at one studio - against source records.",
      "If the report really is wrong, log it (TPL-208) with screenshots, filters and the values you expected.",
      "For custom analysis, raise a data request (TPL-244) stating the question you're trying to answer.",
      "Don't share or act on numbers until they're confirmed - especially payouts (KB-043).",
      "Write down the correct report settings for next time.",
    ],
    diagnose: [
      ["Revenue lower than the bank shows", "Check GST, refunds and settlement dates."],
      ["Attendance higher than the rosters", "Check whether late cancellations are counted."],
      ["Two reports give different totals", "Different definitions - check each one."],
    ],
    say: [
      [
        "To the requester",
        "The difference is because this report counts revenue on the class date, not the payment date. Here's the version by payment date, which matches the bank.",
      ],
    ],
    dos: ["Check filters and definitions first.", "Compare with source records.", "Document the correct settings."],
    donts: ["Don't act on unconfirmed numbers.", "Don't edit exported data without noting it."],
    closeOut: ["Numbers reconciled, or a fix raised.", "Correct settings documented."],
    prevention: "Keep a short guide to the standard reports and what each number means.",
    escalation: "Escalate to the IT/BI lead if payroll or month-end figures are affected.",
    relatedTemplates: ["TPL-208", "TPL-244"],
    tags: ["report", "export", "momence", "data", "reconciliation", "bi"],
  }),

  article({
    id: "KB-133",
    title: "Payment Gateway Outage - Online Payments Failing",
    category: "Operating Systems",
    subcategory: "POS & Payment Systems",
    summary:
      "Online payments through the app, website or payment links are failing for many members at once. Confirm it's the gateway, switch to backup methods, protect members from double charges, and reconcile once it's back.",
    glance: {
      priority: "P1 (P0 during a launch or peak sales)",
      owner: "Front Desk / Memberships → IT / Finance",
      respond: "Within 15 minutes",
      resolve: "Workaround immediately; gateway restored per the provider",
    },
    firstFive: [
      "Check whether several members are reporting failures in the same window.",
      "Try a small test payment.",
      "Check the gateway's status page or dashboard alerts.",
    ],
    steps: [
      "Confirm it's widespread: several failures, a failed test payment, or issues on the provider's status page.",
      "Switch to backup methods: the desk card machine, a UPI QR code, or payment links from a second provider if one is set up (TPL-129).",
      "Tell members with a short notice in the app, on WhatsApp and at the desk.",
      "Prevent double charges: ask members not to retry repeatedly, and keep a list of failed attempts.",
      "Log it (TPL-026) with times, error messages and the number of failures.",
      "Once it's back, reconcile failed and pending payments; stuck UPI payments follow KB-029 (TPL-123).",
      "Follow up with members whose payments failed so they can complete them.",
    ],
    diagnose: [
      ["Card payments fail but UPI works", "Card network problem - use UPI."],
      ["Every online payment fails", "Gateway outage - switch to backup methods."],
      ["Money deducted but no booking", "Follow KB-029."],
    ],
    say: [
      [
        "Member message",
        "Online payments are down for a short while. You can pay at the desk by card or UPI, or wait until it's back - we'll message you as soon as it is.",
      ],
    ],
    dos: ["Confirm before announcing.", "Offer backup methods.", "Reconcile afterwards."],
    donts: ["Don't let members retry over and over.", "Don't ignore pending deductions."],
    closeOut: ["Gateway restored and payments reconciled.", "Affected members followed up."],
    prevention: "Keep a backup payment method ready at every desk and subscribe to the gateway's status alerts.",
    escalation:
      "Escalate to IT and Finance immediately; if it lasts over an hour, the Studio Director decides whether to extend offers or deadlines. Card machine faults follow KB-030.",
    relatedTemplates: ["TPL-026", "TPL-129", "TPL-123"],
    tags: ["payment gateway", "razorpay", "outage", "online payments", "upi", "card payments"],
  }),

  article({
    id: "KB-134",
    title: "Zoho Shift Roster or Access Issue",
    category: "Operating Systems",
    subcategory: "Zoho & Back-Office Tools",
    summary:
      "The Zoho Shift roster is wrong or missing shifts, staff can't log in, or approved swaps aren't showing. Keep the studio staffed, fix the roster at the source, and restore access.",
    glance: {
      priority: "P2 (P1 if a shift today is uncovered)",
      owner: "Studio Operations Manager → HR / IT",
      respond: "Within 2 hours",
      resolve: "Same day",
    },
    firstFive: [
      "Check that today's and tomorrow's shifts are covered.",
      "Confirm the published roster matches what managers agreed.",
      "Ask the staff member what they see - an error, a missing shift, the wrong studio.",
    ],
    steps: [
      "Make sure every shift today is covered - call in cover if there's a gap (KB-157).",
      "Check the roster in Zoho Shift: is it published, with shifts assigned to the right people and studios?",
      "Swap not showing: check it was approved (TPL-247).",
      "Can't log in: check the account is active and the email is right, then reset or re-invite.",
      "Clashes (someone double-booked): fix the roster and tell both people (TPL-087).",
      "Log it (TPL-248) with screenshots and the shifts affected.",
      "Republish the roster and confirm staff can see the correct shifts.",
    ],
    diagnose: [
      ["Staff can't see the roster", "It isn't published - publish it."],
      ["Swap approved but not showing", "Republish the roster."],
      ["Can't log in", "Account inactive or wrong email - re-invite."],
    ],
    say: [
      [
        "To the team",
        "Next week's roster is republished with the swaps included - please check your shifts and reply if anything looks wrong.",
      ],
    ],
    dos: ["Check coverage first.", "Fix it at the source.", "Republish and confirm."],
    donts: ["Don't keep a separate paper-only roster.", "Don't approve swaps outside Zoho Shift."],
    closeOut: ["Roster correct and published.", "Access restored."],
    prevention: "Publish rosters a week ahead and approve every swap in Zoho Shift.",
    escalation:
      "Escalate to HR if staff can't access the roster for over a day, and to the Studio Operations Manager for uncovered shifts.",
    relatedTemplates: ["TPL-248", "TPL-247", "TPL-087"],
    tags: ["zoho shift", "roster", "shift swap", "staff schedule", "access"],
  }),

  article({
    id: "KB-135",
    title: "Missed Punch - Attendance Regularisation",
    category: "Operating Systems",
    subcategory: "Zoho & Back-Office Tools",
    summary:
      "A staff member forgot to punch in or out, or the biometric or app punch didn't record. Regularise it with evidence and manager approval before payroll closes, and stop it becoming a habit.",
    glance: {
      priority: "P3 (P2 within 3 days of the payroll cut-off)",
      owner: "Staff member → Manager → HR",
      respond: "Within 2 working days",
      resolve: "Before the payroll cut-off",
    },
    firstFive: [
      "Note the date, shift and the actual times worked.",
      "Gather evidence: the roster, Momence logs, class records - or CCTV timestamps if needed.",
      "Check the payroll cut-off date.",
    ],
    steps: [
      "The staff member raises a regularisation request (TPL-246) with the date, actual times and reason.",
      "The manager checks it against the roster and evidence such as the opening checklist or class records.",
      "Approve or reject it in Zoho with a note.",
      "If the punch device failed, log it so IT or the vendor can fix it (TPL-248).",
      "HR applies it before payroll; late requests may roll into next month.",
      "Repeated missed punches: the manager raises it with the staff member.",
      "Payroll errors caused by missed punches follow TPL-088.",
    ],
    diagnose: [
      ["The device recorded nobody", "Device fault - log it for IT and regularise everyone affected."],
      ["The same person misses often", "A coaching conversation."],
      ["Request arrives after payroll", "Adjust it in the next cycle."],
    ],
    say: [
      [
        "To the staff member",
        "I've approved your regularisation for Tuesday's 6 am shift - it'll be included in this month's payroll.",
      ],
    ],
    dos: ["Regularise before payroll.", "Check the evidence.", "Get faulty devices fixed."],
    donts: ["Don't approve without checking.", "Don't let it become routine."],
    closeOut: ["Request approved or rejected with a note.", "Payroll updated."],
    prevention: "Remind staff to punch at the start and end of every shift, and check the devices weekly.",
    escalation: "Escalate to HR for repeated cases or disputes about hours worked.",
    relatedTemplates: ["TPL-246", "TPL-088", "TPL-248"],
    tags: ["missed punch", "attendance", "regularisation", "zoho", "payroll", "timesheet"],
  }),
];
