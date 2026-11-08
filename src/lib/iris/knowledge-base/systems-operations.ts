// Knowledge Base — Momence and studio systems, connectivity, POS, cash, payroll, comms and continuity.
import { article, type KnowledgeArticle } from "./compose";

export const SYSTEMS_OPERATIONS_ARTICLES: KnowledgeArticle[] = [
  article({
    id: "KB-026",
    title: "Momence Down — Running the Front Desk Offline",
    category: "Operating Systems",
    summary:
      "When Momence is unreachable or very slow: confirm whether it's us or Momence, switch to the offline check-in sheet, keep classes running, and reconcile every attendance and payment once it's back.",
    glance: {
      priority: "P0 during class hours",
      owner: "Front Desk Lead → IT",
      respond: "Within 5 minutes",
      resolve: "Offline process running within 10 minutes; full reconciliation the same day",
    },
    firstFive: [
      "Check another site works — if nothing loads, it's our internet (see KB-028).",
      "Try Momence on mobile data and the Momence status page.",
      "Print or open the latest class lists (the morning export or a screenshot) and start the offline sheet.",
    ],
    steps: [
      "Confirm the scope: does Momence fail on Wi-Fi and on mobile data, on every device? If only our Wi-Fi fails, follow KB-028.",
      "Check the Momence status page or support channel for a known outage; note the start time.",
      "Inform IT and the Front Desk Lead with the error message and the time.",
      "Switch to the offline check-in sheet: name, phone, class, time, payment status, and staff initials.",
      "Use the morning's exported class lists (or the trainer's app if it still works) to check members in.",
      "Admit members with a valid booking or a clear purchase history; note anyone you couldn't verify.",
      "Take payments on the POS or payment link and record each one on the sheet — don't take cash without a receipt.",
      "Tell members briefly that check-in is manual today; don't turn people away for system reasons.",
      "Pause new bookings for walk-ins beyond room capacity — count heads manually.",
      "When Momence is back, enter every check-in and payment from the sheet the same day and match the totals.",
      "Correct any no-show or late-cancel fees the outage triggered.",
      "Log the outage duration, impact and any member complaints on the ticket.",
    ],
    diagnose: [
      ["Other websites don't load either", "Our internet — KB-028 (switch to the mobile hotspot)."],
      ["Momence loads on mobile data but not Wi-Fi", "Network or DNS issue at the studio — IT ticket; use the hotspot meanwhile."],
      ["Status page shows an incident", "Momence-side outage — run offline until resolved; nothing to fix locally."],
      ["Only member search is slow or broken", "Partial outage — search by phone number; see TPL-054."],
      ["Bookings not syncing to the member app", "Sync issue — TPL-058; check-in by class list."],
    ],
    say: [
      ["Members at the desk", "Our booking system is having a moment, so I'm checking everyone in by hand today — it'll only take a second. Can I have your name and phone number?"],
    ],
    dos: [
      "Export tomorrow's class lists every evening (or first thing each morning).",
      "Record everything on the offline sheet.",
      "Reconcile the same day.",
    ],
    donts: [
      "Don't turn members away because the system is down.",
      "Don't take payments you can't record.",
      "Don't leave outage-triggered fees on members' accounts.",
    ],
    closeOut: [
      "All offline check-ins and payments entered in Momence.",
      "Outage-triggered fees reversed.",
      "Outage duration and impact logged.",
    ],
    prevention:
      "Keep a printed offline check-in sheet and the day's class lists at the desk, export class lists each morning, keep a mobile hotspot charged, and know the Momence support contact.",
    escalation:
      "Escalate to the Studio Operations Manager if the outage lasts more than 30 minutes during class hours, and to the Studio Director if payments or bookings can't be reconciled.",
    relatedTemplates: ["TPL-048", "TPL-058", "TPL-054", "TPL-065"],
    tags: ["momence", "outage", "offline", "check-in", "system down"],
  }),

  article({
    id: "KB-027",
    title: "Member Can't Check In or Booking Not Showing",
    category: "Operating Systems",
    summary:
      "Sorting out check-in failures at the desk: find the booking (or the reason there isn't one), let the member into class, and fix the underlying credit, membership or sync issue afterwards.",
    glance: {
      priority: "P1 — member waiting at the desk",
      owner: "Front Desk → Memberships / IT",
      respond: "Immediately",
      resolve: "Member in class on time; root cause fixed within 24 hours",
    },
    firstFive: [
      "Search by phone number as well as name — duplicates are common.",
      "Check the booking under the right studio, date and class.",
      "If they clearly booked and paid, check them in manually and fix it after class.",
    ],
    steps: [
      "Search the member by phone and email as well as name; check for duplicate profiles.",
      "Look at the booking history: was the booking made for a different class, date or studio?",
      "If the booking exists but check-in fails, check in manually from the class roster.",
      "If there's no booking but the member shows a confirmation (email or app screenshot), add them to the class if there's space and note the reference.",
      "If the booking failed because of no credits or an expired package, check for a recent payment (KB-029) before asking them to pay.",
      "If the membership is frozen or blocked, check why (freeze, late-cancel block, failed payment) and resolve or explain.",
      "Let the member into class whenever there's space and a reasonable claim; fix the admin afterwards.",
      "After class, merge duplicate profiles, restore any missing credits, and correct the booking record.",
      "If several members have the same problem, raise a booking-sync ticket with IT.",
    ],
    diagnose: [
      ["Two profiles for the same member", "Merge them; move bookings and credits to the main profile."],
      ["Booked into the wrong class", "Move the booking (TPL-133); waive the fee if it was a system error."],
      ["App shows a booking, Momence doesn't", "Sync issue — screenshot it and raise TPL-058."],
      ["Credits show zero after a purchase", "Payment not linked — check the gateway (KB-029) and restore credits (TPL-002)."],
      ["Membership frozen unexpectedly", "Check the freeze log; unfreeze and fix billing (TPL-001)."],
    ],
    say: [
      ["At the desk", "I can see what's happened — your booking landed on a second profile. I've checked you in, so go ahead to class, and I'll tidy up your account while you're in there."],
    ],
    dos: [
      "Get the member into class first, fix the admin second.",
      "Search by phone number.",
      "Merge duplicates as soon as you find them.",
    ],
    donts: [
      "Don't make members pay again before checking for an existing payment.",
      "Don't overfill a class to solve a booking error.",
    ],
    closeOut: [
      "Booking and attendance corrected in Momence.",
      "Duplicates merged and credits restored.",
      "Sync issues ticketed to IT.",
    ],
    prevention:
      "Ask for a phone number on every new profile to avoid duplicates, train the desk to search by phone, and review sync errors weekly.",
    escalation:
      "Escalate to IT if more than three members can't check in on the same day or bookings are missing across the system.",
    relatedTemplates: ["TPL-065", "TPL-058", "TPL-069", "TPL-133", "TPL-002"],
    tags: ["check-in", "booking", "momence", "credits", "duplicate profile", "sync"],
  }),

  article({
    id: "KB-028",
    title: "Studio Internet or Wi-Fi Down — Failover & Recovery",
    category: "Tech Issues",
    summary:
      "Restoring connectivity for the front desk, POS and trainer devices: find whether it's the router, the ISP or the Wi-Fi, fail over to the backup line or hotspot, and get the ISP to commit to a fix.",
    glance: {
      priority: "P1 (P0 if the front desk, POS and music are all down during classes)",
      owner: "Front Desk → IT → ISP",
      respond: "Within 10 minutes",
      resolve: "Failover within 10 minutes; ISP fix the same day",
    },
    firstFive: [
      "Check whether it's every device or just one.",
      "Look at the router: power, WAN / internet light, and the ISP's ONT / modem lights.",
      "Switch the front desk and POS to the backup connection or a mobile hotspot.",
    ],
    steps: [
      "Check scope: if only one device is offline, forget and rejoin the network or restart that device.",
      "Check the router and the ISP modem / ONT: power on, cables firmly connected, and no red LOS / PON light.",
      "Restart in the right order: ONT / modem first, wait 2 minutes, then the router, wait 2 minutes.",
      "A red LOS light on the ONT means a fibre or ISP problem — call the ISP with the account ID and ask for a ticket number and ETA.",
      "Switch to the backup: the secondary ISP line if installed, or a charged mobile hotspot for the front desk and POS.",
      "Prioritise the hotspot for Momence and payments; keep music on downloaded playlists.",
      "If Wi-Fi works but there's no internet, check the router's WAN status page or ask IT to check remotely.",
      "If guest Wi-Fi alone is down, it's lower priority — fix after the staff network.",
      "Log the outage time, ISP ticket number, and the restoration time.",
      "Escalate with the ISP if their ETA is missed; ask for SLA credit for long outages.",
    ],
    diagnose: [
      ["Red LOS / PON light on the ONT", "Fibre cut or ISP outage — ISP ticket; failover."],
      ["Router lights normal, no internet", "ISP authentication or DNS issue — restart in order; IT remote check."],
      ["Wi-Fi visible but devices can't join", "Router overloaded or DHCP issue — restart the router; IT to check."],
      ["Slow only at peak times", "Bandwidth saturation — limit guest Wi-Fi; plan an upgrade."],
      ["Only guest Wi-Fi down", "Lower priority; check the guest network (TPL-057)."],
    ],
    say: [
      ["Members", "Our Wi-Fi is down for a bit — we're on it. Check-in and payments are still working on our backup connection."],
    ],
    dos: [
      "Keep a charged hotspot with enough data at the desk.",
      "Label the router, ONT and their power sockets.",
      "Always get an ISP ticket number and ETA.",
    ],
    donts: [
      "Don't factory-reset the router.",
      "Don't keep power-cycling every few minutes — give each restart 2 minutes.",
    ],
    closeOut: [
      "Connectivity restored on the staff network and POS.",
      "ISP ticket number and outage duration logged.",
      "Backup line or hotspot recharged.",
    ],
    prevention:
      "Install a secondary ISP with automatic failover at busy studios, keep a hotspot as a last resort, put the router on a UPS, and keep the ISP's escalation contacts at the desk.",
    escalation:
      "Escalate to IT if the outage passes 30 minutes, and to the Studio Operations Manager if the ISP misses its ETA or outages repeat within a week.",
    relatedTemplates: ["TPL-049", "TPL-210", "TPL-057", "TPL-211"],
    tags: ["wifi", "internet", "router", "isp", "failover", "network"],
  }),

  article({
    id: "KB-030",
    title: "POS or Card Machine Failure & Settlement Mismatch",
    category: "Operating Systems",
    summary:
      "Keeping payments flowing when the POS or card terminal fails, and reconciling settlements that don't match the day's sales.",
    glance: {
      priority: "P1 at the desk; P2 for settlement mismatches",
      owner: "Front Desk → Finance → POS / bank provider",
      respond: "Immediately at the desk; same day for mismatches",
      resolve: "Alternative payment in 5 minutes; mismatch explained within 2 business days",
    },
    firstFive: [
      "Offer the alternative right away: payment link / UPI QR from the gateway.",
      "Check the terminal: battery, network (SIM / Wi-Fi), paper, error message.",
      "Make sure no transaction was charged twice during retries.",
    ],
    steps: [
      "Switch the member to an alternative: a Momence / gateway payment link or UPI QR — record it against their purchase.",
      "Check the terminal's charge, network connection (SIM or Wi-Fi) and paper; restart it.",
      "If a transaction failed mid-way, check the terminal's last-transaction report before retrying to avoid double charges.",
      "Note the error code and call the POS provider's helpdesk; get a ticket number.",
      "At end of day, run the terminal settlement report and match it with Momence sales by payment method.",
      "Mismatch: list each difference (missing, extra, different amounts), and check refunds, voids and transactions recorded under another method.",
      "For settled amounts not reaching the bank, check the provider's settlement statement (T+1 is typical) and raise it with the provider.",
      "Record the reconciliation outcome and any adjustments in the daily closing.",
    ],
    diagnose: [
      ["'Host not reachable' or network error", "SIM signal or Wi-Fi — move the terminal, switch network, restart."],
      ["Card declined repeatedly", "Card or bank side — suggest UPI or another card; don't keep retrying."],
      ["Settlement lower than sales", "Unrecorded refunds or voids, or sales logged as card but paid by UPI — check line by line."],
      ["Settlement not credited to the bank", "Provider settlement delay — ticket with the POS provider (TPL-130)."],
    ],
    say: [
      ["Member at the desk", "Our card machine is acting up — I can send you a secure payment link on WhatsApp, or you can scan our UPI QR. Which is easier?"],
    ],
    dos: [
      "Check the last transaction before retrying.",
      "Reconcile by payment method every day.",
      "Keep the provider's helpdesk number at the desk.",
    ],
    donts: [
      "Don't retry a card more than twice.",
      "Don't record a payment until it's confirmed.",
    ],
    closeOut: [
      "Terminal working or replacement requested.",
      "Day's settlement reconciled; differences explained or ticketed.",
    ],
    prevention:
      "Keep a backup payment method (payment link / UPI QR) ready, charge the terminal overnight, run the settlement report daily, and train the desk on voids and refunds.",
    escalation:
      "Escalate to Finance if a mismatch exceeds ₹2,000 or remains unexplained after 2 business days, and to IT if the POS is down for more than a day.",
    relatedTemplates: ["TPL-050", "TPL-130", "TPL-026", "TPL-129"],
    tags: ["pos", "card machine", "settlement", "reconciliation", "payments"],
  }),

  article({
    id: "KB-032",
    title: "Daily Cash Closing Shortage or Excess",
    category: "Internal Operations & Admin",
    summary:
      "When the cash drawer doesn't match the day's cash sales: recount properly, trace the difference transaction by transaction, record it honestly, and fix the process gap.",
    glance: {
      priority: "P1 (shortages above ₹1,000 or repeated differences)",
      owner: "Front Desk Lead → Studio Operations Manager → Finance",
      respond: "At closing, the same day",
      resolve: "Explained or escalated within 24 hours",
    },
    firstFive: [
      "Recount the cash with a second person present.",
      "Compare with the Momence cash sales report for the day.",
      "Check for cash refunds, petty cash use or change given that wasn't recorded.",
    ],
    steps: [
      "Recount the drawer with a second staff member and record the denomination breakdown.",
      "Pull the day's cash sales, cash refunds and cash payouts from Momence.",
      "Check common causes: a sale recorded as card or UPI but paid in cash (or the reverse), unrecorded petty cash, change errors, refunds paid without entry.",
      "Check the previous day's closing float and handover note.",
      "If the difference is explained, correct the records and note the explanation.",
      "If it's unexplained, record the exact amount, the people on shift and the steps taken — don't 'adjust' the drawer to make it match.",
      "Report unexplained shortages over ₹1,000, or any repeated difference, to the Studio Operations Manager and Finance the same day.",
      "Deposit or secure the cash per the procedure, with a signed closing sheet.",
      "Review the process gap (e.g. no receipts for petty cash, shared drawer access) and fix it.",
    ],
    diagnose: [
      ["Shortage equals one class or pack price", "Likely a sale recorded as cash but paid digitally (or vice versa) — check that day's sales."],
      ["Excess cash", "A cash payment not recorded in Momence — find the member and record it."],
      ["Small differences most days", "Change-giving or float issues — tighten counting and float procedure."],
      ["Large unexplained shortage", "Escalate the same day; manager review including CCTV of the desk."],
    ],
    say: [
      ["Reporting it", "Closing is short by ₹1,800. We've recounted twice and checked the cash sales, refunds and petty cash. Here's the breakdown and the people on shift."],
    ],
    dos: [
      "Always count with two people.",
      "Record exactly what you find.",
      "Keep receipts for every cash payout.",
    ],
    donts: [
      "Don't make up a shortage from your own pocket or hide an excess.",
      "Don't leave cash unsecured overnight.",
    ],
    closeOut: [
      "Closing sheet signed by two people.",
      "Difference explained and corrected, or escalated with details.",
      "Process fix recorded.",
    ],
    prevention:
      "One person accountable for the drawer per shift, a two-person count at handover and closing, receipts for all petty cash, and pushing members towards digital payments.",
    escalation:
      "Escalate unexplained shortages above ₹1,000, or any recurring difference, to the Studio Operations Manager and Finance the same day; suspected theft goes to the Studio Director.",
    relatedTemplates: ["TPL-131", "TPL-024", "TPL-243"],
    tags: ["cash", "closing", "shortage", "reconciliation", "front desk"],
  }),

  article({
    id: "KB-042",
    title: "Wrong Information Sent to Members — Correction Protocol",
    category: "Brand Feedback",
    summary:
      "When a broadcast, email or automated message went out with a wrong time, price, offer or studio: stop further sends, correct quickly and clearly, honour reasonable commitments, and fix the approval gap.",
    glance: {
      priority: "P1 — affects many members at once",
      owner: "Marketing (Mitali Kumar) with Client Servicing",
      respond: "Within 1 hour of discovery",
      resolve: "Correction sent within 2 hours",
    },
    firstFive: [
      "Pause any scheduled or automated sends of the same message.",
      "Work out exactly what was wrong and who received it.",
      "Decide whether any member will act on it before the correction lands (e.g. turn up at the wrong time).",
    ],
    steps: [
      "Pause the campaign, broadcast or automation so the error doesn't spread further.",
      "Identify the error precisely and the audience (list, segment, number of recipients).",
      "Assess the impact: will anyone turn up at the wrong time, buy at the wrong price, or miss a class?",
      "Write a short correction: what was wrong, the correct information, and an apology — through the same channel as the original.",
      "Send the correction within 2 hours; for time-critical errors, also call members booked into affected classes.",
      "Brief the front desk so they can answer questions consistently.",
      "Decide how to handle commitments made in good faith (e.g. honour a wrongly advertised price for purchases already made) with the Studio Director.",
      "If an automated template is wrong, fix it at the source in Momence or the messaging tool and test it.",
      "Record the root cause (approval skipped, wrong segment, outdated template) and update the checklist.",
    ],
    diagnose: [
      ["Wrong class time or studio", "Correction plus calls to booked members; staff ready at the desk."],
      ["Wrong price or offer", "Correct quickly; honour purchases already made in good faith."],
      ["Sent to the wrong audience", "Short apology to recipients only if needed; fix the segment rules."],
      ["Automation sending wrong content repeatedly", "Disable the automation, fix the template (TPL-217)."],
    ],
    say: [
      ["Correction message", "Correction: this Sunday's Barre 57 community class at Supreme HQ starts at 9 am, not 8 am as we mentioned earlier. Sorry for the mix-up — see you there!"],
    ],
    dos: [
      "Correct through the same channel as the error.",
      "Keep the correction short and clear.",
      "Fix the template or process at the source.",
    ],
    donts: [
      "Don't send multiple corrections — get it right once.",
      "Don't ignore members who already acted on the wrong information.",
    ],
    closeOut: [
      "Correction sent and front desk briefed.",
      "Affected purchases or bookings handled.",
      "Root cause recorded and template or process fixed.",
    ],
    prevention:
      "Second-person approval for all broadcasts and campaign emails, a pre-send checklist (date, time, price, studio, link, audience), and a test send to staff before every broadcast.",
    escalation:
      "Escalate to the Studio Director if a wrong price or offer affects purchases, or if the error reached more than 500 members.",
    relatedTemplates: ["TPL-261", "TPL-217", "TPL-100", "TPL-260"],
    tags: ["communication", "broadcast", "correction", "whatsapp", "email", "marketing"],
  }),

  article({
    id: "KB-043",
    title: "Trainer Payout or Payroll Discrepancy",
    category: "Internal Operations & Admin",
    summary:
      "Resolving pay disputes for trainers and staff: compare the claim with attendance, classes taught, cover records and rates, correct genuine errors quickly, and explain the rest transparently.",
    glance: {
      priority: "P1 for trainer payouts; P2 for other payroll queries",
      owner: "HR / Payroll with the Training Manager",
      respond: "Within 1 business day",
      resolve: "Corrected or explained within 5 business days",
    },
    firstFive: [
      "Get the specific period, classes or days the person believes are missing or wrong.",
      "Pull the class records (Momence), cover log and attendance (Zoho Shift / biometric).",
      "Check the agreed rate card or contract.",
    ],
    steps: [
      "Record the claim: period, expected amount, paid amount, and the specific classes, shifts or days in question.",
      "Pull classes taught from Momence for the period, including covers and substitutions.",
      "Check the cover log — covered classes pay the trainer who actually taught.",
      "Check attendance and leave records for staff (Zoho Shift / biometric) and any missed punches.",
      "Compare with the rate card: class type, duration, premium slots, workshop rates, deductions.",
      "List each difference and its cause (missed cover entry, wrong rate, missed punch, tax or deduction).",
      "Correct genuine errors in the next payout or as an off-cycle payment if significant, with approval.",
      "Explain any correct deductions clearly in writing, line by line.",
      "Update the source records (Momence trainer on class, cover log, attendance) so it doesn't recur.",
    ],
    diagnose: [
      ["Covered class paid to the original trainer", "Fix the trainer on the class in Momence; adjust both payouts."],
      ["Missed punch reduced pay", "Attendance regularisation (TPL-246) with manager approval."],
      ["Rate applied incorrectly", "Check the contract and rate card; correct and back-pay."],
      ["Tax or deduction query", "Explain with the payslip breakdown; HR to answer statutory questions."],
    ],
    say: [
      ["Replying to the trainer", "Thanks for flagging this. I've checked March: you covered two classes on the 12th and 19th that were still under Rohan's name, so they weren't counted. I've corrected both and the ₹3,000 will be in this month's payout."],
    ],
    dos: [
      "Check source records before replying.",
      "Explain line by line.",
      "Fix the source data, not just the payment.",
    ],
    donts: [
      "Don't discuss one person's pay with others.",
      "Don't promise amounts before verifying them.",
    ],
    closeOut: [
      "Discrepancy corrected or explained in writing.",
      "Source records updated.",
      "Payment date confirmed to the person.",
    ],
    prevention:
      "Update the trainer on every covered class in Momence the same day, reconcile classes taught with trainers before payroll cut-off, and keep rate cards current and shared.",
    escalation:
      "Escalate to the HR Manager if the discrepancy is above ₹10,000, spans more than one month, or the person disputes the explanation.",
    relatedTemplates: ["TPL-249", "TPL-088", "TPL-246"],
    tags: ["payroll", "payout", "trainer pay", "attendance", "hr"],
  }),

  article({
    id: "KB-044",
    title: "Monsoon Waterlogging & Unplanned Disruptions",
    category: "Internal Operations & Admin",
    summary:
      "Running the studio through heavy rain, waterlogging, building service failures or city disruptions: decide early, protect members' and staff's safety, communicate clearly, and waive fees fairly.",
    glance: {
      priority: "P1 (P0 if the studio must close)",
      owner: "Studio Operations Manager → Studio Director",
      respond: "As soon as warnings or disruption begin",
      resolve: "Go / no-go decision at least 2 hours before the next class block",
    },
    firstFive: [
      "Check official alerts (IMD / municipal warnings) and local conditions around the studio.",
      "Check whether trainers and staff can get in safely.",
      "Decide early: run, reduce, or cancel the next class block.",
    ],
    steps: [
      "Monitor IMD and municipal alerts and local reports of waterlogging near each studio.",
      "Confirm trainer and staff availability for the next class block; don't ask anyone to travel unsafely.",
      "Make the go / no-go decision at least 2 hours before the block, with the Studio Director for closures.",
      "If running: waive late-cancel and no-show fees for the day and tell members so.",
      "If cancelling: cancel in Momence (credits return automatically) and notify members by WhatsApp and email.",
      "Protect the studio: unplug equipment near entrances, move items off the floor, check for leaks and seepage (KB-033).",
      "Building services down (lift, water, power, parking): inform members before they travel and adjust classes accordingly.",
      "Keep staff who are on site safe — let them leave early if conditions are worsening.",
      "Record decisions, cancellations and fee waivers on the ticket.",
      "After the disruption, check the studio for damage before reopening.",
    ],
    diagnose: [
      ["Red alert issued", "Cancel non-essential classes early and inform members."],
      ["Trainers can't reach the studio", "Cover from nearby trainers or cancel; no penalties for anyone."],
      ["Water entering the building", "Protect electrics and floors; building management; consider closing."],
      ["Lift or water supply down", "Notify members before travel; adjust or cancel classes."],
    ],
    say: [
      ["Broadcast", "Given the heavy rain alert, all classes at Kwality House after 4 pm today are cancelled for everyone's safety. Credits have been returned, and late-cancel fees are waived for today. Stay safe!"],
    ],
    dos: [
      "Decide early and communicate once, clearly.",
      "Waive fees on disruption days.",
      "Put staff safety first.",
    ],
    donts: [
      "Don't wait until members are already travelling.",
      "Don't pressure staff to travel in unsafe conditions.",
    ],
    closeOut: [
      "Decision and communications logged.",
      "Fees waived and credits verified.",
      "Studio checked before reopening.",
    ],
    prevention:
      "Check terrace and building drains before the monsoon, keep sandbags or barriers where water enters, keep a monsoon communication template ready, and have a trainer cover list by neighbourhood.",
    escalation:
      "Escalate to the Studio Director for any closure, and to the India Director if more than one studio is affected or closure lasts beyond a day.",
    relatedTemplates: ["TPL-240", "TPL-109", "TPL-241", "TPL-066"],
    tags: ["monsoon", "rain", "waterlogging", "disruption", "closure", "safety"],
  }),

  article({
    id: "KB-046",
    title: "Staff Departure — Same-Day Access Revocation",
    category: "Tech Issues",
    summary:
      "Removing every system and physical access for a departing employee or trainer on their last day: Momence, email, WhatsApp groups, payment dashboards, shared passwords, keys and door codes.",
    glance: {
      priority: "P1 (P0 for a hostile or immediate termination)",
      owner: "HR → IT, with the Studio Operations Manager",
      respond: "On the last working day (immediately for terminations)",
      resolve: "All access removed by end of that day",
    },
    firstFive: [
      "Get the exit date and time from HR.",
      "List every system and physical access the person had.",
      "For immediate terminations, remove access before or during the conversation.",
    ],
    steps: [
      "Confirm the exit date and time with HR, and whether it's planned or immediate.",
      "List all access: Momence staff login, Google Workspace / email, Zoho Shift, payment gateway and POS, social media and WhatsApp Business, shared drives, IRIS.",
      "Disable logins at the agreed time; transfer email and files to the manager first if needed.",
      "Remove them from staff WhatsApp groups and the WhatsApp Business account.",
      "Change any shared passwords they knew (Wi-Fi admin, social accounts, vendor portals) and move to individual logins where possible.",
      "Collect keys, access cards and studio equipment (laptop, iPad, uniform); change door or locker master codes if keys aren't returned.",
      "Update trainer schedules in Momence so no future classes show their name.",
      "Remove them from emergency contact lists and vendor contact lists.",
      "Confirm completion to HR with a checklist of what was removed and when.",
    ],
    diagnose: [
      ["Person still appears on future classes", "Reassign classes and notify booked members of the trainer change."],
      ["Shared password can't be changed easily", "Prioritise it and plan a move to individual logins."],
      ["Keys not returned", "Change codes or locks; record it with HR."],
      ["Ex-employee still in WhatsApp groups", "Remove now; check the group admin list."],
    ],
    say: [
      ["To the team", "Ananya's last day is Friday, so her access to Momence, email and the studio WhatsApp groups will be removed that evening. Please send any handover questions to her before then."],
    ],
    dos: [
      "Use a checklist every time.",
      "Remove access at the agreed time — not 'later this week'.",
      "Rotate shared credentials.",
    ],
    donts: [
      "Don't leave accounts active 'just in case'.",
      "Don't share the departing person's password with others — transfer data instead.",
    ],
    closeOut: [
      "Access checklist completed with timestamps.",
      "Equipment and keys returned (or codes changed).",
      "Future classes reassigned.",
    ],
    prevention:
      "Keep an access register per person (updated on joining), use individual logins instead of shared passwords, and make offboarding a standard HR checklist step.",
    escalation:
      "Escalate to the Studio Director immediately for hostile exits, or if any access can't be removed the same day.",
    relatedTemplates: ["TPL-216", "TPL-090", "TPL-061", "TPL-215"],
    tags: ["offboarding", "access", "security", "accounts", "staff exit"],
  }),
];
