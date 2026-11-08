// Knowledge Base - Customer Service: response standards, missed queries,
// de-escalation, fee waivers, VIPs, DPDP requests and profile maintenance.
import { article, type KnowledgeArticle } from "./compose";

export const CUSTOMER_SERVICE_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-086",
    title: "Phone & WhatsApp Response Standards",
    category: "Customer Service and Communication",
    subcategory: "Front Desk & Enquiries",
    summary:
      "How to answer calls and WhatsApp messages - response times, greeting, tone, hand-offs and after-hours replies - so every enquiry gets a fast, consistent and friendly answer.",
    glance: {
      priority: "P3 (P2 if response times slip across a shift)",
      owner: "Front Desk Lead",
      respond: "Calls within 3 rings; WhatsApp within 15 minutes during opening hours",
      resolve: "Most enquiries in the first reply; the rest within 1 working day",
    },
    firstFive: [
      "Check the WhatsApp Business inbox and missed calls at the start of every shift.",
      "Reply to the oldest unanswered message first.",
      "Use the saved quick replies, personalised with the member's name.",
    ],
    steps: [
      "Answer calls within three rings with the studio name and your name; return missed calls within 30 minutes.",
      "Reply on WhatsApp within 15 minutes during opening hours and label each chat (new lead, booking, complaint, payment).",
      "Answer fully in one message where you can: what, when, how much and the next step.",
      "Hand off clearly: tell the member who will reply and by when, and assign the chat - never leave it unowned.",
      "After hours the auto-reply gives opening times and urgent contacts; reply first thing the next morning.",
      "Complaints follow KB-088; payment questions go to Memberships.",
      "At the end of the shift, check no chat is unanswered and hand over open items (KB-160).",
    ],
    diagnose: [
      ["Members say nobody replied", "The inbox isn't being watched - see KB-087 and assign an owner each shift."],
      ["WhatsApp line down", "See KB-123 and post the backup number."],
      ["The same questions keep coming", "Add a quick reply or FAQ."],
    ],
    say: [["Greeting", "Good morning, Kwality House, this is Ananya speaking - how can I help?"]],
    dos: ["Reply oldest first.", "Personalise quick replies.", "Hand off with a named owner and a time."],
    donts: ["Don't leave chats on read.", "Don't argue over WhatsApp - call instead."],
    closeOut: ["Inbox clear at the end of the shift.", "Open items handed over."],
    prevention: "Track response times weekly and keep quick replies updated with current prices and schedules.",
    escalation:
      "Escalate to the Studio Operations Manager if response times slip for more than one shift, and to IT if the WhatsApp line fails.",
    relatedTemplates: ["TPL-212", "TPL-166"],
    tags: ["phone etiquette", "whatsapp", "response time", "enquiries", "front desk", "quick replies"],
  }),

  article({
    id: "KB-087",
    title: "Unanswered Query - Member Says No One Replied",
    category: "Customer Service and Communication",
    subcategory: "Complaints & De-escalation",
    summary:
      "A member says their call, WhatsApp or email went unanswered. Apologise, answer the original question first, find where it got stuck, and close the gap so it doesn't happen again.",
    glance: {
      priority: "P2 (P1 if it's about a payment, a medical issue or a complaint)",
      owner: "Front Desk Lead → Studio Operations Manager",
      respond: "Within 1 hour",
      resolve: "Same day",
    },
    firstFive: [
      "Apologise and answer their original question now.",
      "Find the original message: channel, time, and who saw it.",
      "Check whether other messages from that period were missed too.",
    ],
    steps: [
      "Resolve the original request first - the booking, payment or information they needed.",
      "Find where it stopped: an unwatched channel, an unassigned chat, out of hours, an old number, or a line outage.",
      "Search for other missed messages from the same period and answer them before they chase.",
      "Log the gap (TPL-166) with the channel and cause.",
      "Fix the process: assign channel owners per shift, switch on alerts, update auto-replies.",
      "If the delay cost the member something (a missed class, a fee), put it right (KB-065, KB-089).",
      "Thank the member for telling you.",
    ],
    diagnose: [
      ["Emails sent to an old address", "Update the address on the website and set up forwarding."],
      ["Chats marked read but never answered", "Use labels and assignment in WhatsApp Business."],
      ["Calls ring out at peak times", "Route to a second phone, or call back within 30 minutes."],
    ],
    say: [
      [
        "Apology",
        "I'm really sorry you didn't hear back - that shouldn't happen. Let me sort out your booking now, and I've flagged the missed message so we fix how that inbox is covered.",
      ],
    ],
    dos: ["Answer the original question first.", "Find and fix the root cause.", "Look for other missed messages."],
    donts: ["Don't blame a colleague to the member.", "Don't apologise without fixing the cause."],
    closeOut: ["Original request resolved.", "Gap logged and fixed."],
    prevention: "Assign channel owners every shift and check for unanswered messages at each handover.",
    escalation: "Escalate to the Studio Operations Manager if more than five messages were missed in a day.",
    relatedTemplates: ["TPL-166", "TPL-212"],
    tags: ["unanswered", "no reply", "missed message", "response time", "complaint", "communication"],
  }),

  article({
    id: "KB-088",
    title: "De-escalating an Upset Member at the Desk",
    category: "Customer Service and Communication",
    subcategory: "Complaints & De-escalation",
    summary:
      "A member is angry or upset at the desk or on the phone. Stay calm, listen fully, acknowledge the feeling, offer the fix you can make now, and bring in a manager when needed - without arguing or promising what you can't deliver.",
    glance: {
      priority: "P1 (P0 if there's any threat or aggression - follow KB-142)",
      owner: "Front Desk Lead → Studio Operations Manager",
      respond: "Immediately",
      resolve: "Resolved or escalated in the conversation; follow-up within 24 hours",
    },
    firstFive: [
      "Move the conversation somewhere quieter if others are around.",
      "Listen without interrupting and note the key facts.",
      "Acknowledge how they feel before explaining anything.",
    ],
    steps: [
      "Let them finish. Take notes so they can see you're capturing it.",
      "Acknowledge - 'I can see why that's frustrating' - and don't argue about the facts yet.",
      "Ask clarifying questions and summarise back what you heard.",
      "Offer what you can do now (rebook, raise a refund, add a credit) and a clear next step for anything you can't.",
      "If it's beyond your authority, bring in the manager and brief them in front of the member so they don't have to repeat it.",
      "Log the complaint (TPL-165) with the agreed actions, and follow up within 24 hours.",
      "If the member becomes abusive or threatening, stop and follow KB-142.",
    ],
    diagnose: [
      ["Member raising their voice", "Lower yours, slow down and move somewhere private."],
      ["Member wants a refund on the spot", "Explain the refund process and timeline (KB-018); escalate if policy allows."],
      ["Member threatens to post on social media", "Stay calm, focus on resolving it, and tell the manager."],
    ],
    say: [
      [
        "Acknowledging",
        "I'm sorry this happened - I can see why you're upset. Let me make sure I've understood, and then I'll tell you exactly what I can do today.",
      ],
    ],
    dos: ["Listen fully.", "Acknowledge feelings.", "Give a clear next step."],
    donts: ["Don't argue or interrupt.", "Don't promise outcomes beyond your authority."],
    closeOut: ["Complaint logged with agreed actions.", "Follow-up done within 24 hours."],
    prevention: "Train the desk team in de-escalation and give them clear limits on what they can offer.",
    escalation:
      "Escalate to the Studio Operations Manager when the fix needs approval or the member asks for a manager; threats follow KB-142.",
    relatedTemplates: ["TPL-165", "TPL-076"],
    tags: ["angry member", "de-escalation", "complaint", "upset", "front desk", "conflict"],
  }),

  article({
    id: "KB-089",
    title: "Fee Waiver Requests - When & How to Waive",
    category: "Customer Service and Communication",
    subcategory: "Policies, Retention & VIPs",
    summary:
      "Members ask to waive a late-cancel, no-show or freeze fee or another penalty. Use consistent criteria, record every waiver, and know who can approve what, so decisions are fair and repeatable.",
    glance: {
      priority: "P3",
      owner: "Front Desk (first waiver) → Memberships Manager",
      respond: "Within 1 working day",
      resolve: "Within 2 working days",
    },
    firstFive: [
      "Check the fee, the reason and the member's waiver history.",
      "Check whether the studio caused it - then it's a reversal, not a waiver (KB-065).",
      "Listen to their reason.",
    ],
    steps: [
      "Studio-caused (schedule change, outage, check-in failure): reverse the fee - no waiver needed.",
      "First occurrence in 6 months with a reasonable reason: the desk may waive once and records it (TPL-169).",
      "Repeat requests: the Memberships Manager decides, weighing history and value.",
      "Medical or family emergencies: waive with a note, and offer a freeze (KB-007) if it's ongoing.",
      "Record every waiver on the profile with the reason and approver; disputes about the policy itself go on TPL-083.",
      "Explain the policy kindly so it's clear for next time.",
      "Review waivers monthly by staff member and reason.",
    ],
    diagnose: [
      ["Third waiver request this quarter", "Manager decision; explain the policy."],
      ["Different staff gave different answers", "Check the waiver log before deciding."],
      ["Member threatens to cancel", "Hand over to the retention conversation (KB-025)."],
      ["Member disputes the policy itself", "Follow KB-011."],
    ],
    say: [
      [
        "Waiving once",
        "I've waived it this time as a one-off - just a reminder that you can cancel free of charge up to 12 hours before class.",
      ],
    ],
    dos: ["Check history first.", "Record every waiver.", "Explain the policy kindly."],
    donts: ["Don't waive repeatedly without a manager.", "Don't make exceptions you don't record."],
    closeOut: ["Decision recorded with reason and approver.", "Member informed."],
    prevention: "Make the cancellation window clear in confirmations and reminders.",
    escalation: "Escalate to the Memberships Manager for a second waiver within 6 months or any fee above ₹1,000.",
    relatedTemplates: ["TPL-169", "TPL-083", "TPL-141"],
    tags: ["fee waiver", "late cancel fee", "no-show fee", "exception", "policy", "goodwill"],
  }),

  article({
    id: "KB-090",
    title: "VIP & High-Value Member Requests",
    category: "Customer Service and Communication",
    subcategory: "Policies, Retention & VIPs",
    summary:
      "VIPs, public figures and high-value members ask for special arrangements - privacy, priority booking, private sessions or exceptions. Deliver an excellent experience within policy, protect their privacy, and keep decisions consistent.",
    glance: {
      priority: "P2",
      owner: "Client Servicing / Studio Operations Manager",
      respond: "Within 2 hours",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Note the request and how it differs from standard policy.",
      "Check the member's profile notes and preferences.",
      "Keep their visit details confidential.",
    ],
    steps: [
      "Clarify the request - a preferred bike or spot, a private changing area, a discreet arrival, priority booking or private sessions (TPL-085).",
      "Decide what's possible within policy; exceptions need the Studio Operations Manager's approval (TPL-084).",
      "Privacy: share their schedule only with staff who need it - no photos and no social posts without consent.",
      "Brief the trainer and desk before each visit.",
      "Record preferences on the profile so every studio treats them the same way.",
      "Avoid exceptions that are unfair to other members, such as holding spots outside the booking system.",
      "Follow up after the visit.",
    ],
    diagnose: [
      ["A staff member posted about a celebrity visit", "Have it removed and remind staff of the privacy rules."],
      ["Request to block a whole class", "Offer a private session instead (KB-070)."],
      ["Photographers or fans outside", "Follow the security guidance in KB-141 and arrange a discreet exit."],
    ],
    say: [
      [
        "Confirming",
        "We've reserved your usual spot for Saturday's 9 am, and a private changing room will be ready. Your visit details stay with our team only.",
      ],
    ],
    dos: ["Protect privacy.", "Record preferences.", "Get approval for exceptions."],
    donts: ["Don't post about VIP visits.", "Don't create exceptions that disadvantage others."],
    closeOut: ["Arrangement confirmed and preferences recorded.", "Team briefed."],
    prevention: "Keep a short VIP protocol and brief all staff on confidentiality.",
    escalation: "Escalate to the Studio Director for requests that affect other members or need a policy change.",
    relatedTemplates: ["TPL-085", "TPL-084"],
    tags: ["vip", "high value member", "celebrity", "privacy", "special request", "priority booking"],
  }),

  article({
    id: "KB-091",
    title: "Member Asks to Delete Their Data or Stop Messages (DPDP)",
    category: "Customer Service and Communication",
    subcategory: "Member Data & Privacy",
    summary:
      "A member asks to stop marketing messages, see the data we hold, correct it or delete their account. Handle it under India's DPDP Act: confirm identity, act within the timelines, keep only what the law requires, and confirm in writing.",
    glance: {
      priority: "P1 (statutory timelines apply)",
      owner: "Front Desk → Client Servicing → Data Protection lead (IT / Legal)",
      respond: "Acknowledge within 1 working day",
      resolve: "Opt-outs within 48 hours; access, correction or deletion within 30 days",
    },
    firstFive: [
      "Note exactly what they're asking for: opt-out, access, correction or deletion.",
      "Confirm identity using the registered phone or email.",
      "Acknowledge in writing with the expected timeline.",
    ],
    steps: [
      "Marketing opt-out: remove them from WhatsApp, email and SMS campaigns within 48 hours (TPL-100); service messages about bookings and payments continue.",
      "Data access: the data protection lead sends a summary of what we hold (profile, bookings, payments, communications).",
      "Correction: update the details and confirm (KB-092).",
      "Deletion: first check for an active membership, outstanding balance, open dispute or legal retention need (e.g. invoices kept for GST).",
      "Delete or anonymise the profile and marketing records; keep only legally required records, with restricted access.",
      "Log the request and every action with dates (TPL-017).",
      "Confirm completion in writing.",
    ],
    diagnose: [
      ["Member still has an active membership", "Explain that deletion ends it, and process the cancellation first."],
      ["Still receiving messages after opting out", "Check every list, including Momence and WhatsApp broadcasts."],
      ["Someone asks on another person's behalf", "Verify authorisation before acting."],
    ],
    say: [
      [
        "Acknowledging",
        "Thanks for your request - we've confirmed it's you, and we'll remove you from marketing messages within 48 hours. Your account deletion will be completed within 30 days, and we'll confirm in writing.",
      ],
    ],
    dos: ["Verify identity.", "Meet the timelines.", "Keep only legally required records."],
    donts: ["Don't delete invoices needed for GST.", "Don't ignore opt-outs."],
    closeOut: ["Request completed and confirmed in writing.", "Log kept."],
    prevention: "Honour opt-outs in every system and collect clear consent at sign-up.",
    escalation:
      "Escalate access and deletion requests to the data protection lead, and disputes or regulator queries to Legal.",
    relatedTemplates: ["TPL-017", "TPL-100"],
    tags: ["dpdp", "data deletion", "privacy", "opt out", "unsubscribe", "personal data"],
  }),

  article({
    id: "KB-092",
    title: "Updating Member Details & Merging Duplicate Profiles",
    category: "Customer Service and Communication",
    subcategory: "Member Data & Privacy",
    summary:
      "A member's name, phone, email or emergency contact needs updating, or they have two profiles splitting their credits and history. Verify identity, update carefully, and merge duplicates without losing bookings or payments.",
    glance: {
      priority: "P3 (P2 if duplicates are blocking bookings or payments)",
      owner: "Front Desk → Client Servicing",
      respond: "Within 1 working day",
      resolve: "Within 2 working days",
    },
    firstFive: [
      "Verify identity using the registered details.",
      "Search for duplicates by phone, email and name.",
      "Note the credits, memberships and upcoming bookings on each profile.",
    ],
    steps: [
      "Verify identity before changing contact details - an OTP to the old number, or photo ID at the desk.",
      "Update the details in Momence and linked systems such as WhatsApp and payment profiles (TPL-017).",
      "Duplicates: choose the main profile (the one with the most history), then move credits, memberships and bookings onto it.",
      "Use Momence's merge feature where available; otherwise move items manually and record every change (TPL-054).",
      "Archive the duplicate rather than deleting it until the merge has been checked.",
      "Test the new contact details with a booking confirmation or OTP.",
      "Confirm with the member that everything is on one profile.",
    ],
    diagnose: [
      ["Two profiles from app and desk sign-ups", "Merge them and keep the one with payments."],
      ["Can't log in after changing number", "Update the login identifier and reset access (KB-126)."],
      ["Family members sharing one email", "Give each person their own profile and email."],
    ],
    say: [
      [
        "Confirming",
        "All done - your two profiles are now one, with your 8 remaining classes and all your bookings in place. You'll log in with your new number from now on.",
      ],
    ],
    dos: ["Verify identity first.", "Record every change.", "Check the merge before archiving."],
    donts: ["Don't change details without verification.", "Don't delete a duplicate before everything is moved."],
    closeOut: ["Details updated and duplicates merged.", "Member confirmed."],
    prevention: "Search for an existing profile before creating a new one at the desk.",
    escalation: "Escalate to IT if a merge loses data or the system won't allow it.",
    relatedTemplates: ["TPL-017", "TPL-054"],
    tags: ["update details", "duplicate profile", "merge profiles", "contact details", "member profile"],
  }),
];
