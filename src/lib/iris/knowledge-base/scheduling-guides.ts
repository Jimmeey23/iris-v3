// Knowledge Base — Scheduling: booking errors, bike selection, fee disputes,
// waitlist promotions, emergency and planned cover, holidays, private classes
// and workshops.
import { article, type KnowledgeArticle } from "./compose";

export const SCHEDULING_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-063",
    title: "Booked Into the Wrong Class or Time",
    category: "Scheduling",
    subcategory: "Bookings, Check-In & Fees",
    summary:
      "A member booked the wrong class, time, studio or format — by mistake or because a listing was wrong. Move them without penalty where fair, protect their credit, and catch listing errors before they hit others.",
    glance: {
      priority: "P2 (P1 if the class starts within 2 hours)",
      owner: "Front Desk / Scheduling",
      respond: "Within 30 minutes",
      resolve: "Before the class starts",
    },
    firstFive: [
      "Find the booking: class, time, studio and when it was made.",
      "Ask which class they meant to book and check it has space.",
      "Check whether the class listing itself is wrong (time, studio, trainer).",
    ],
    steps: [
      "Confirm the booking and the intended class; check the intended class's capacity and waitlist.",
      "Space available: rebook them into the right class without a late-cancel fee, and restore the credit if one was taken.",
      "Intended class full: add them to its waitlist and keep the original booking until they decide, so they don't lose both.",
      "Wrong studio (e.g. Supreme HQ instead of Kwality House): move the booking and check their plan covers the intended studio.",
      "If the listing caused it (wrong time or studio on the schedule), fix it (KB-130, TPL-209) and contact everyone else booked into that class.",
      "Paid drop-in or workshop in the wrong slot: move the payment to the right slot or refund it (TPL-075).",
      "Confirm the change in writing and mention the free-cancellation window so fees are avoided next time.",
    ],
    diagnose: [
      ["Several members booked the 6 am instead of the 7 am", "The listing is wrong — fix the schedule and contact every booker."],
      ["Late-cancel fee charged for the switch", "Reverse it — it was a correction, not a late cancellation (KB-065)."],
      ["Booked on another family member's profile", "Move the booking to the right profile and check the credit came from the right plan."],
    ],
    say: [
      [
        "At the desk",
        "No problem — I've moved you from the 6 pm to the 7 pm PowerCycle and given back the credit from the first one. You're on bike 14.",
      ],
    ],
    dos: ["Secure the new booking first, then explain.", "Check whether a listing error hit other members.", "Waive fees for genuine mistakes flagged in good time."],
    donts: ["Don't cancel the original booking before the new one is secured.", "Don't charge a late-cancel fee for a correction."],
    closeOut: ["Booking corrected and credit restored.", "Listing errors fixed and affected members contacted."],
    prevention:
      "Show studio, format and time prominently on booking confirmations, and double-check new or edited listings before publishing.",
    escalation:
      "Escalate to Scheduling if a listing error affected more than three members, and to IT if the app shows a different time from Momence.",
    relatedTemplates: ["TPL-133", "TPL-069", "TPL-075"],
    tags: ["wrong booking", "wrong class", "booking error", "rebook", "wrong studio"],
  }),

  article({
    id: "KB-064",
    title: "PowerCycle Bike Selection & Spot Booking Problems",
    category: "Scheduling",
    subcategory: "Bookings, Check-In & Fees",
    summary:
      "A member picked a bike in the app but found it taken, broken or reassigned, or couldn't pick one at all. Seat them fairly, keep broken bikes off the booking map, and fix the room layout in Momence if it's wrong.",
    glance: {
      priority: "P2 (P1 at class start with a full room)",
      owner: "PowerCycle trainer / Front Desk → Scheduling",
      respond: "Immediately at the desk; same day for app issues",
      resolve: "Before class; layout fixes within 24 hours",
    },
    firstFive: [
      "Open the class's bike map in Momence to see who has which bike.",
      "If a bike is broken, seat the member on the nearest working bike — don't make them wait.",
      "Ask the trainer to start on time and sort bike disputes away from the podium.",
    ],
    steps: [
      "Compare the member's confirmation (bike number) with the class roster in Momence.",
      "Double-booked bike: honour the earlier booking and give the other member the best available bike, with an apology.",
      "Bike out of order: block it in the booking map straight away so no one else books it; handle the fault itself with KB-010 or KB-116.",
      "Member couldn't pick a bike in the app: check spot booking is enabled for that class and the layout matches the room.",
      "Preferred-bike requests (a regular who always rides bike 1): note it on the profile, but don't hold bikes outside the booking system.",
      "If bikes were moved for maintenance, update the room layout in Momence before the next class.",
      "Log repeat issues with the class time and bike numbers for Scheduling.",
    ],
    diagnose: [
      ["Two members with the same bike number", "The booking map is out of sync — honour the earlier booking and raise TPL-134."],
      ["A broken bike was booked", "It wasn't blocked — block it now and contact anyone booked on it in upcoming classes."],
      ["Map shows 24 bikes, the room has 22", "The layout is wrong — fix the template for all future classes."],
    ],
    say: [
      [
        "At the bike",
        "I'm sorry, bike 7 is out of order today. I've set you up on bike 8 right next to it, already adjusted to your settings.",
      ],
    ],
    dos: ["Block broken bikes on the booking map at once.", "Seat the earlier booking first.", "Keep the class starting on time."],
    donts: ["Don't argue about bikes in front of the class.", "Don't reserve bikes informally outside the system."],
    closeOut: ["Members seated; broken bikes blocked.", "Layout corrected in Momence if needed.", "Repeat issues logged."],
    prevention: "Check the bike map against the room every morning, and block a bike the moment a fault is reported.",
    escalation:
      "Escalate to IT if the app shows bikes as free that Momence shows as taken, and to the PowerCycle lead if more than two bikes are out at once.",
    relatedTemplates: ["TPL-134", "TPL-191", "TPL-133"],
    tags: ["powercycle", "bike booking", "spot booking", "bike map", "double booked", "sc3"],
  }),

  article({
    id: "KB-065",
    title: "No-Show or Late-Cancel Fee Charged Incorrectly",
    category: "Scheduling",
    subcategory: "Bookings, Check-In & Fees",
    summary:
      "A member disputes a no-show or late-cancellation fee because they attended, cancelled in time, or the studio changed the class. Check the attendance and cancellation records, reverse wrong fees quickly and fix the cause.",
    glance: {
      priority: "P2",
      owner: "Front Desk → Memberships",
      respond: "Within 4 hours",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Find the booking, the fee, and the timestamps for booking, cancellation and check-in.",
      "Check whether the studio changed the class (time, trainer, cancellation).",
      "Ask the member what happened.",
    ],
    steps: [
      "Compare the cancellation time with the policy window (e.g. 12 hours); inside the free window means the fee comes off.",
      "Member says they attended: check the check-in record, the trainer's class list and any sign-in sheet; if they were there, mark attendance (TPL-072) and reverse the fee.",
      "Studio changed the time or trainer after they booked: members can cancel free — reverse the fee.",
      "An app or Momence outage stopped them cancelling: reverse the fee and log the outage (KB-026).",
      "Fee was correct: explain the policy kindly; for a first occurrence, follow the waiver guidance in KB-089.",
      "Reverse the fee in Momence (or refund it if paid) and restore any credit taken.",
      "Confirm the outcome in writing.",
    ],
    diagnose: [
      ["Checked in but marked as a no-show", "Check-in failed — fix attendance; if it keeps happening, see KB-027."],
      ["Several no-show fees for one class", "Attendance wasn't taken — confirm with the trainer and fix them all."],
      ["Cancelled 11 hours 50 minutes before", "Technically late — use judgement and KB-089 for first-time waivers."],
    ],
    say: [
      [
        "Reversing",
        "Thanks for flagging this. Our check-in failed that morning, but the trainer's list shows you were there. I've reversed the ₹500 fee and corrected your attendance.",
      ],
    ],
    dos: ["Check the records before deciding.", "Reverse obvious errors immediately.", "Fix the attendance record, not only the fee."],
    donts: ["Don't keep a fee the studio caused.", "Don't promise waivers outside the policy."],
    closeOut: ["Fee reversed or explained; attendance corrected.", "Root cause noted (check-in failure, schedule change)."],
    prevention:
      "Trainers confirm their class list in Momence before leaving, and schedule changes automatically open free cancellation.",
    escalation: "Escalate to the Memberships Manager for repeated disputes from the same member or fees above ₹1,000.",
    relatedTemplates: ["TPL-141", "TPL-169", "TPL-072"],
    tags: ["no-show fee", "late cancel", "fee dispute", "attendance", "cancellation policy", "waiver"],
  }),

  article({
    id: "KB-066",
    title: "Waitlist Promotion Not Notified — Member Missed the Spot",
    category: "Scheduling",
    subcategory: "Waitlists & Capacity",
    summary:
      "A member was promoted off the waitlist but never got (or saw) the notification, then lost the spot or was charged as a no-show. Check the promotion and notification logs, put it right, and close the notification gap.",
    glance: {
      priority: "P2",
      owner: "Front Desk → Scheduling / IT",
      respond: "Within 2 hours",
      resolve: "Same day",
    },
    firstFive: [
      "Find the promotion time and the class start time.",
      "Check the notification log (app push, email, WhatsApp) for that member.",
      "Check whether a no-show fee or credit was charged.",
    ],
    steps: [
      "Confirm when they were promoted and how close to class — promotions inside the last 2 hours are easy to miss.",
      "Check whether a notification was actually sent and delivered; if it wasn't, the fault is ours.",
      "Reverse any no-show fee and restore the credit (KB-065).",
      "If they'd like another class this week, help them book it.",
      "If notifications failed for several members, raise it to IT (TPL-217) with the class and times.",
      "Review the waitlist cut-off: promotions shouldn't happen so close to class that members can't react (TPL-067).",
      "Explain how promotion works and suggest switching on app notifications.",
    ],
    diagnose: [
      ["Promoted 20 minutes before class", "The cut-off is too short — review the setting with Scheduling."],
      ["No notification in the log", "Notification failure — TPL-217."],
      ["Notification delivered, member didn't see it", "Explain how promotion works and waive the first fee as goodwill."],
    ],
    say: [
      [
        "Explaining",
        "You came off the waitlist at 6:10 for the 7 am class, and I can see the notification didn't go out. That's on us — I've removed the no-show fee and returned your credit.",
      ],
    ],
    dos: ["Check the logs before deciding.", "Reverse fees the system caused.", "Raise notification failures to IT."],
    donts: ["Don't blame the member when no notification was sent.", "Don't leave a too-short cut-off unchanged after repeated complaints."],
    closeOut: ["Fee reversed and credit restored.", "Notification failures raised.", "Cut-off reviewed if needed."],
    prevention: "Stop automatic promotions 2–3 hours before class, and send promotions by both push and WhatsApp.",
    escalation:
      "Escalate to IT if notifications fail for more than one class in a day, and to Scheduling to change the promotion cut-off.",
    relatedTemplates: ["TPL-135", "TPL-067", "TPL-217"],
    tags: ["waitlist", "waitlist promotion", "notification", "no-show", "missed spot"],
  }),

  article({
    id: "KB-067",
    title: "Instructor No-Show — Covering a Class in 15 Minutes",
    category: "Scheduling",
    subcategory: "Schedule Changes & Cover",
    summary:
      "The instructor hasn't arrived and class starts soon. Confirm fast, work through the cover list in a set order, keep the room informed, and cancel cleanly with credits back only if no cover is possible.",
    glance: {
      priority: "P0 — class at risk within the hour",
      owner: "Front Desk Lead → Training Manager",
      respond: "Immediately",
      resolve: "Cover or cancellation decided at least 5 minutes before class",
    },
    firstFive: [
      "Call the instructor twice and send a message; note the times.",
      "At 15 minutes before class with no reply, start the cover list.",
      "Tell members who've arrived that you're confirming the instructor — don't guess.",
    ],
    steps: [
      "20 minutes before: call and WhatsApp the instructor, and check the schedule for a confirmed swap you might have missed.",
      "15 minutes before: work the cover list in order — trainers already in the studio, then standby trainers nearby, then the Training Manager.",
      "Cover found: change the trainer in Momence so the record and payroll credit the right person.",
      "Tell the room what's happening and when class will start; a delay of up to 10 minutes is better than cancelling.",
      "No cover 5 minutes before: cancel in Momence (credits return automatically), apologise in person and by message, and offer the next class (KB-016).",
      "Once the class is settled, check on the instructor — a no-show can mean an emergency.",
      "Log it (TPL-070) with times and actions; the Training Manager follows up the reason and any pattern.",
    ],
    diagnose: [
      ["Instructor replies: stuck in traffic, 10 minutes away", "Start with cover or a short delay, as the Training Manager decides — don't wait in silence."],
      ["Cover trainer isn't certified in this format", "Offer another format in the same slot only if members agree; otherwise cancel."],
      ["Instructor unreachable for over an hour", "Treat it as a welfare concern and call their emergency contact."],
    ],
    say: [
      [
        "In the room",
        "Thanks for waiting — your instructor has been delayed, so Riya is taking today's class. We'll start at 7:05 and you'll still get the full 50 minutes.",
      ],
    ],
    dos: ["Start the cover list 15 minutes out, not at start time.", "Keep members informed.", "Update the trainer in Momence."],
    donts: ["Don't leave members waiting without information.", "Don't let an uncertified person teach a format."],
    closeOut: ["Class covered, or cancelled with credits returned.", "Members messaged.", "No-show logged and followed up."],
    prevention: "Keep a live standby list per studio and time band, and have trainers confirm an hour before early classes.",
    escalation:
      "Escalate to the Training Manager 15 minutes before class if there's no cover, and to the Studio Director for repeat no-shows (see KB-003).",
    relatedTemplates: ["TPL-070", "TPL-066", "TPL-145"],
    tags: ["instructor no-show", "cover", "substitute", "class cancellation", "trainer late"],
  }),

  article({
    id: "KB-068",
    title: "Planned Substitute — Arranging & Announcing Cover",
    category: "Scheduling",
    subcategory: "Schedule Changes & Cover",
    summary:
      "A trainer will miss scheduled classes for leave, training or a known commitment. Arrange a qualified substitute early, update Momence, and tell booked members before they arrive so nobody is surprised.",
    glance: {
      priority: "P2 (P1 if the class is within 24 hours)",
      owner: "Scheduling → Training Manager",
      respond: "Within 4 hours of the request",
      resolve: "Cover confirmed at least 24 hours before class",
    },
    firstFive: [
      "Get the dates, classes and reason for the absence.",
      "Check bookings for those classes and regulars who follow that trainer.",
      "Check the cover pool for trainers certified in the format.",
    ],
    steps: [
      "Confirm the absence and affected classes in writing (TPL-139).",
      "Offer the classes to certified trainers in the cover pool, favouring those who know the studio and format.",
      "Change the instructor in Momence as soon as cover is confirmed.",
      "Tell booked members (app notification plus WhatsApp) at least 24 hours before where possible, with free cancellation (TPL-140).",
      "Where many members follow the trainer, mention the substitute's style and experience in the message.",
      "Brief the substitute: class level, regulars with injuries, music norms.",
      "After the class, check feedback and record the cover for payroll.",
    ],
    diagnose: [
      ["Members say they weren't told", "The notification was missed — apologise and allow free cancellation."],
      ["No certified substitute", "Change the format with notice, or cancel early (KB-016)."],
      ["The same trainer is away again and again", "Raise it with the Training Manager."],
    ],
    say: [
      [
        "Message to members",
        "Heads-up: Thursday's 8 am Barre at Kwality House will be taught by Aisha instead of Neha. If you'd rather not come, you can cancel free of charge until Wednesday night.",
      ],
    ],
    dos: ["Arrange cover early.", "Announce it before members arrive.", "Brief the substitute."],
    donts: ["Don't change the instructor silently.", "Don't charge late-cancel fees when the trainer changed."],
    closeOut: ["Substitute confirmed and Momence updated.", "Members notified with a free-cancel option.", "Cover recorded for payroll."],
    prevention: "Collect planned leave a month ahead and build cover into the roster.",
    escalation: "Escalate to the Training Manager if no certified cover is found 48 hours before class.",
    relatedTemplates: ["TPL-139", "TPL-140", "TPL-245"],
    tags: ["substitute", "cover", "trainer leave", "schedule change", "member notification"],
  }),

  article({
    id: "KB-069",
    title: "Holiday & Festival Schedule Planning",
    category: "Scheduling",
    subcategory: "Schedule Changes & Cover",
    summary:
      "Planning around Diwali, Holi, Ganesh Chaturthi, Christmas and long weekends: decide which classes run, publish early, protect bookings and credits, and staff each studio properly — city by city.",
    glance: {
      priority: "P2 (P1 if the holiday is under 2 weeks away and nothing is published)",
      owner: "Scheduling with the Studio Director (Marketing for announcements)",
      respond: "Start planning 4–6 weeks ahead",
      resolve: "Published at least 2 weeks before the holiday",
    },
    firstFive: [
      "List holidays in the next 8 weeks for each city — Mumbai and Bengaluru differ.",
      "Pull attendance for the same holidays last year.",
      "Collect trainer and staff leave requests for those dates.",
    ],
    steps: [
      "Use last year's attendance to decide which classes run, merge or are cancelled on each holiday.",
      "Confirm trainer and front desk cover for every class that runs, and give leave decisions early.",
      "Build the holiday schedule in Momence well ahead rather than editing the regular schedule at the last minute.",
      "Cancel or move affected classes before bookings open, or contact booked members with free rebooking (TPL-068).",
      "Extend memberships and packs by any days a studio is fully closed, as the policy says.",
      "Marketing announces the schedule (app, WhatsApp broadcast — TPL-260, Instagram) at least 2 weeks before (TPL-137).",
      "Add special holiday classes or themes only where last year's demand supports them, with capacity set to match.",
      "After the holiday, compare attendance with the plan and note changes for next year.",
    ],
    diagnose: [
      ["Classes booked on a closure day", "The closure wasn't set up — contact bookers and return their credits."],
      ["Too few staff on the holiday morning", "Merge classes and announce early."],
      ["Holidays differ between cities", "Plan each city separately, not one schedule for all."],
    ],
    say: [
      [
        "Announcement",
        "Our Diwali schedule is live: studios are closed on 1 November, with fewer classes on the 31st and the 2nd. Memberships are extended automatically by the closure day.",
      ],
    ],
    dos: ["Plan from last year's data.", "Publish at least 2 weeks ahead.", "Extend validity for full closures."],
    donts: ["Don't cancel booked classes at the last minute.", "Don't assume both cities share the same holidays."],
    closeOut: ["Holiday schedule published and staffed.", "Members with affected bookings contacted.", "Validity extensions applied."],
    prevention: "Keep a yearly holiday calendar for each city and review it every quarter.",
    escalation: "Escalate to the Studio Director if staffing can't cover the planned classes 10 days before the holiday.",
    relatedTemplates: ["TPL-137", "TPL-068", "TPL-260"],
    tags: ["holiday schedule", "festival", "diwali", "studio closure", "long weekend", "planning"],
  }),

  article({
    id: "KB-070",
    title: "Private or Hosted Class Booking",
    category: "Scheduling",
    subcategory: "Events & Private Bookings",
    summary:
      "A member or company wants a private class — a birthday, bridal party, team session or a hosted class for their community. Confirm format, group size, date, price and terms in writing, block the room and trainer, and run it smoothly.",
    glance: {
      priority: "P2",
      owner: "Sales & Client Servicing → Scheduling",
      respond: "Within 1 working day",
      resolve: "Confirmed at least 7 days before the date",
    },
    firstFive: [
      "Get the date and time, group size, format, occasion, budget and a contact person.",
      "Check room and trainer availability for that slot.",
      "Share the private class price list and terms.",
    ],
    steps: [
      "Confirm the details: format (Barre, PowerCycle, mat), group size within room capacity, the date, and special requests (music, décor, photos).",
      "Hold the room and a suitable trainer, and block the slot in Momence so it can't be booked publicly.",
      "Send a written quote: price, what's included, cancellation terms and the deposit required.",
      "Take the deposit (or full payment) to confirm, and issue the invoice (TPL-027).",
      "Collect every participant's name and signed waiver beforehand; flag injuries or pregnancy to the trainer.",
      "Brief the trainer and front desk: arrival time, guest list, photos and any add-ons.",
      "On the day, check guests in against the list and give first-timers a set-up briefing.",
      "Afterwards, send a thank-you with a newcomer offer, and log the leads (KB-099).",
    ],
    diagnose: [
      ["Group is bigger than the room allows", "Split it into two sessions or use a larger studio."],
      ["Guests haven't signed waivers", "Collect them at check-in, before class."],
      ["Client cancels 2 days before", "Apply the cancellation terms in the quote and offer a new date."],
    ],
    say: [
      [
        "Quote",
        "For 12 guests on Saturday at 11 am, a private Barre class with Neha is ₹18,000, including towels and water. A 50% deposit confirms the slot, and you can reschedule free up to 72 hours before.",
      ],
    ],
    dos: ["Get everything in writing.", "Collect waivers before the day.", "Follow up with guests afterwards."],
    donts: ["Don't confirm without a deposit.", "Don't exceed room capacity."],
    closeOut: ["Booking confirmed, paid and blocked in Momence.", "Waivers collected and trainer briefed.", "Leads logged after the session."],
    prevention: "Keep a standard private class package and quote template.",
    escalation: "Escalate to the Studio Director for discounts beyond the price list or events outside opening hours.",
    relatedTemplates: ["TPL-142", "TPL-144", "TPL-027"],
    tags: ["private class", "hosted class", "group booking", "corporate session", "birthday", "event booking"],
  }),

  article({
    id: "KB-071",
    title: "Workshop Registration, Capacity & Payments",
    category: "Scheduling",
    subcategory: "Events & Private Bookings",
    summary:
      "Running registrations for a workshop or masterclass: set up the listing with the right capacity, price and cut-off, handle the waitlist, payments and cancellations, and give the trainer a clean attendee list.",
    glance: {
      priority: "P3 (P2 within 72 hours of the workshop)",
      owner: "Scheduling / Front Desk with Marketing",
      respond: "Within 1 working day",
      resolve: "Listing live at least 3 weeks before",
    },
    firstFive: [
      "Confirm the date, time, studio, lead trainer, capacity and price.",
      "Decide whether members get a discount or can use credits.",
      "Agree the workshop's cancellation and refund terms.",
    ],
    steps: [
      "Create the workshop in Momence with the description, capacity, price and booking cut-off (TPL-143).",
      "Set whether credits apply or payment is separate, and test booking on the app and website.",
      "Switch on the waitlist and decide whether it promotes automatically.",
      "Marketing promotes it at least 3 weeks before (TPL-074).",
      "Track registrations; if it's under half full a week out, decide with Marketing whether to push or postpone.",
      "Handle cancellations under the workshop's terms — refund or credit as stated.",
      "Two days before, send attendees the details (what to bring, arrival time) and give the trainer the list with injuries noted.",
      "On the day, check attendees in; afterwards collect feedback and record attendance.",
    ],
    diagnose: [
      ["Shows as full but seats are empty", "Unpaid bookings are holding spots — set a payment cut-off."],
      ["Members charged credits for a paid workshop", "The booking rules are wrong — fix them and return the credits."],
      ["Too few registrations", "Push with Marketing or postpone with refunds."],
    ],
    say: [
      [
        "Reminder",
        "See you Saturday at 10 am for the Barre technique workshop at Supreme HQ — please arrive 10 minutes early and bring grip socks.",
      ],
    ],
    dos: ["Test the booking flow before launch.", "Set refund terms before selling.", "Brief the trainer with the attendee list."],
    donts: ["Don't let unpaid bookings block spots indefinitely.", "Don't change the date without offering refunds."],
    closeOut: ["Attendance recorded and feedback collected.", "Refunds processed for cancellations."],
    prevention: "Use a workshop set-up checklist covering price, capacity, waitlist and refund terms.",
    escalation: "Escalate to the Studio Director if a workshop must be cancelled after people have registered, or the trainer drops out.",
    relatedTemplates: ["TPL-143", "TPL-074"],
    tags: ["workshop", "masterclass", "registration", "capacity", "event payment", "waitlist"],
  }),
];
