/**
 * Mock tickets for the training sandbox. Names, members and phone numbers are
 * invented. Every category in IRIS is covered, every status, every priority,
 * SLA states (on track / at risk / breached), escalations, multi-owner tickets
 * and the bike / microphone recurrence-check cycle.
 *
 * `ageHours` backdates creation, so the SLA trigger computes real targets and
 * an old open ticket comes out breached. `resolvedHoursAgo` backdates the
 * resolution, so the recurrence trigger schedules checks that are already due.
 */

export type MockTicket = {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "open" | "in_progress" | "awaiting_response" | "escalated" | "resolved" | "closed";
  department: string;
  coOwnerDepartment?: string;
  studio?: string;
  client?: string;
  equipment?: string;
  businessImpact?: string;
  tags?: string[];
  source?: "manual" | "ai_assistant" | "email" | "form_intake" | "voice";
  ageHours: number;
  resolvedHoursAgo?: number;
  resolution?: string;
  escalationLevel?: number;
  unassigned?: boolean;
  reportedByOther?: boolean;
  collectedInfo?: Record<string, unknown>;
  comments?: { text: string; internal?: boolean }[];
};

export const MOCK_TICKETS: MockTicket[] = [
  // ── Recurrence checks: bikes and microphones ─────────────────────────────
  {
    title: "Bike 14 resistance knob slipping",
    description: "Member reported the resistance knob on bike 14 spins freely past level 12 and drops back. Bike taken out of rotation for the 7am class.",
    category: "Repair and Maintenance", subcategory: "PowerCycle Bike Malfunction & Repairs", priority: "P1", status: "resolved",
    department: "FAC", studio: "KH", equipment: "PowerCycle bike 14", tags: ["bike", "equipment"],
    ageHours: 8 * 24, resolvedHoursAgo: 6 * 24,
    resolution: "Technician replaced the resistance brake pad and recalibrated. Test-ridden at all levels.",
    comments: [{ text: "Vendor visit booked for tomorrow 10am." }, { text: "Pad replaced, bike back on the floor.", internal: true }],
  },
  {
    title: "Instructor headset mic cutting out",
    description: "The wireless headset mic in Studio 1 drops every few minutes during the 6pm Barre class. Trainer had to shout cues.",
    category: "Class Experience", subcategory: "Audio Issues", priority: "P1", status: "resolved",
    department: "OPS", studio: "SHQ", equipment: "Wireless headset microphone (Studio 1)", tags: ["mic", "audio"],
    ageHours: 13 * 24, resolvedHoursAgo: 11 * 24,
    resolution: "Replaced the headset battery pack and re-paired the receiver on a clean channel.",
  },
  {
    title: "Bike 3 clicking noise under load",
    description: "Loud clicking from the crank on bike 3 when standing climbs. Member moved to bike 9.",
    category: "Repair and Maintenance", subcategory: "PowerCycle Bike Fault (Stages SC3)", priority: "P2", status: "resolved",
    department: "FAC", studio: "KHB", equipment: "PowerCycle bike 3", tags: ["bike"],
    ageHours: 3 * 24, resolvedHoursAgo: 20,
    resolution: "Tightened crank arm bolts and lubricated the pedal threads.",
  },
  {
    title: "Bike 21 display not powering on",
    description: "Console on bike 21 is blank. Batteries swapped by front desk, still nothing.",
    category: "Repair and Maintenance", subcategory: "PowerCycle Bike Malfunction & Repairs", priority: "P2", status: "in_progress",
    department: "FAC", studio: "KH", equipment: "PowerCycle bike 21", tags: ["bike"],
    ageHours: 30,
    comments: [{ text: "Ordered a replacement console from the vendor, ETA 3 days." }],
  },

  // ── Trainer Feedback ─────────────────────────────────────────────────────
  {
    title: "Trainer arrived 12 minutes late to 7am PowerCycle",
    description: "Class started 12 minutes late; members waited in the lobby. Two members asked for a credit back.",
    category: "Trainer Feedback", subcategory: "Trainer No-Show / Late Arrival", priority: "P1", status: "open",
    department: "TRN", studio: "KH", client: "Ananya Mehta (mock)", ageHours: 5, tags: ["late-start"],
  },
  {
    title: "Cues hard to follow in Mat 57",
    description: "Member feedback: the trainer's verbal cues were too fast to follow for first-timers.",
    category: "Trainer Feedback", subcategory: "Knowledge and Competence", priority: "P3", status: "awaiting_response",
    department: "TRN", studio: "SHQ", client: "Rohan Kapoor (mock)", ageHours: 40, source: "form_intake",
    comments: [{ text: "Asked the member for which part of class felt rushed." }],
  },

  // ── Pricing and Memberships ──────────────────────────────────────────────
  {
    title: "Member wants to freeze membership for surgery",
    description: "Member has knee surgery next week and wants a 6-week freeze on her annual membership. Doctor's note attached by email.",
    category: "Pricing and Memberships", subcategory: "Membership Flexibility", priority: "P2", status: "in_progress",
    department: "MEM", client: "Priya Sharma (mock)", ageHours: 26, source: "email",
  },
  {
    title: "Refund requested for unused 10-class pack",
    description: "Member relocated to Pune and wants a refund on 7 unused classes from a 10-class pack bought 2 months ago.",
    category: "Pricing and Memberships", subcategory: "Refund and Cancellation Policy Issue", priority: "P2", status: "escalated",
    department: "MEM", coOwnerDepartment: "PAY", client: "Kabir Singh (mock)", ageHours: 4 * 24, escalationLevel: 1,
    comments: [{ text: "Policy says no refunds after 30 days; member insists. Escalating to finance for a goodwill call.", internal: true }],
  },
  {
    title: "Class pack expired without reminder",
    description: "Member's 5-class pack expired yesterday with 2 classes left; says she never received the expiry reminder.",
    category: "Pricing and Memberships", subcategory: "Class Pack Expiry Confusion", priority: "P3", status: "resolved",
    department: "MEM", client: "Neha Iyer (mock)", ageHours: 6 * 24, resolvedHoursAgo: 4 * 24,
    resolution: "Extended the pack by 14 days as a one-time courtesy and confirmed reminders are on.",
  },

  // ── Customer Service and Communication ───────────────────────────────────
  {
    title: "No reply to member email for 4 days",
    description: "Member wrote in about a billing question last Monday and has not heard back. Now upset on Instagram DMs.",
    category: "Customer Service and Communication", subcategory: "Follow-up Post Inquiry", priority: "P1", status: "open",
    department: "SCS", client: "Arjun Nair (mock)", ageHours: 4 * 24, tags: ["response-time"],
  },
  {
    title: "Complaint about front desk tone",
    description: "Member felt the front desk was dismissive when she asked about a waitlist spot.",
    category: "Customer Service and Communication", subcategory: "Handling of Complaints", priority: "P2", status: "closed",
    department: "SCS", client: "Isha Desai (mock)", ageHours: 10 * 24, resolvedHoursAgo: 8 * 24,
    resolution: "Called the member, apologised, and shared feedback with the team in the weekly huddle.",
  },

  // ── Class Experience ─────────────────────────────────────────────────────
  {
    title: "Studio too hot during evening Barre",
    description: "AC set to 26°C during the 7pm class; several members complained about heat.",
    category: "Class Experience", subcategory: "Studio Temperature Too Hot/Cold", priority: "P2", status: "in_progress",
    department: "OPS", coOwnerDepartment: "FAC", studio: "CTS", ageHours: 18,
  },
  {
    title: "Class flow felt rushed in Strength Lab",
    description: "Members say transitions between stations were too quick for the class size.",
    category: "Class Experience", subcategory: "Class Flow and Pacing", priority: "P3", status: "open",
    department: "TRN", studio: "KHB", ageHours: 3, unassigned: true,
  },

  // ── Scheduling ───────────────────────────────────────────────────────────
  {
    title: "Add Saturday 9am PowerCycle at Bandra",
    description: "Waitlist for Saturday 8am has been 10+ deep for three weeks. Request to add a 9am slot.",
    category: "Scheduling", subcategory: "Additional Classes", priority: "P3", status: "awaiting_response",
    department: "SCH", studio: "SHQ", ageHours: 3 * 24,
  },
  {
    title: "Substitute needed for Thursday 6pm Mat",
    description: "Trainer on leave Thursday. No substitute confirmed yet; 18 members booked.",
    category: "Scheduling", subcategory: "Class Substitutions", priority: "P0", status: "open",
    department: "SCH", coOwnerDepartment: "TRN", studio: "KH", ageHours: 6, tags: ["urgent"],
  },
  {
    title: "Waitlist did not auto-promote",
    description: "Member was first on the waitlist, a spot opened 3 hours before class but she was never moved in.",
    category: "Scheduling", subcategory: "Waitlist Concerns", priority: "P2", status: "open",
    department: "SCH", client: "Meera Joshi (mock)", ageHours: 5 * 24, reportedByOther: true,
  },

  // ── Operating Systems / Tech Issues ──────────────────────────────────────
  {
    title: "Class listing shows wrong trainer on app",
    description: "Momence shows the wrong trainer for Wed 7am Barre at Kenkere House.",
    category: "Operating Systems", subcategory: "Error in Class Listings", priority: "P2", status: "resolved",
    department: "OPS", studio: "KHB", ageHours: 2 * 24, resolvedHoursAgo: 30,
    resolution: "Corrected the instructor on the recurring session; app now shows the right trainer.",
  },
  {
    title: "Member charged twice for monthly membership",
    description: "Bank statement shows two debits of ₹14,500 on the 1st. Member wants one reversed.",
    category: "Tech Issues", subcategory: "Incorrect Charges on Account", priority: "P0", status: "escalated",
    department: "PAY", coOwnerDepartment: "ITS", client: "Vikram Rao (mock)", ageHours: 30, escalationLevel: 2,
    businessImpact: "Member threatening a chargeback.",
    comments: [{ text: "Confirmed duplicate in the payment gateway logs.", internal: true }, { text: "Refund initiated, awaiting gateway reference." }],
  },
  {
    title: "Front desk laptop won't boot",
    description: "The check-in laptop at Courtside shows a black screen after the logo. Check-ins being done on a phone.",
    category: "Tech Issues", subcategory: "Laptops Not Functioning", priority: "P1", status: "in_progress",
    department: "ITS", studio: "CTS", ageHours: 9,
  },
  {
    title: "Booking confirmation emails delayed",
    description: "Members receive booking confirmations 30-60 minutes after booking.",
    category: "Operating Systems", subcategory: "Delayed Notifications", priority: "P2", status: "open",
    department: "ITS", ageHours: 2 * 24,
  },

  // ── Brand Feedback ───────────────────────────────────────────────────────
  {
    title: "Review draft poster for Diwali workshop",
    description: "Marketing needs sign-off on the Diwali workshop poster before printing on Friday.",
    category: "Brand Feedback", subcategory: "Marketing Collateral Production & Review", priority: "P3", status: "in_progress",
    department: "MKT", ageHours: 20,
  },
  {
    title: "Hosted class at corporate partner ran over time",
    description: "Hosted class for a corporate partner ran 20 minutes over; partner asked for tighter timing next time.",
    category: "Brand Feedback", subcategory: "Hosted Class Feedback", priority: "P3", status: "resolved",
    department: "MKT", ageHours: 9 * 24, resolvedHoursAgo: 7 * 24,
    resolution: "Shared a run-sheet with the trainer and partner for the next session.",
  },

  // ── Internal Operations & Admin ──────────────────────────────────────────
  {
    title: "Approval needed: new opening checklist",
    description: "Ops has drafted a new studio opening checklist and needs management approval before rollout.",
    category: "Internal Operations & Admin", subcategory: "SOP & Policy Governance", priority: "P3", status: "awaiting_response",
    department: "OPS", coOwnerDepartment: "MGT", ageHours: 4 * 24,
  },
  {
    title: "Event leads from pop-up not logged",
    description: "Leads captured at the weekend pop-up were collected on paper and not entered into the CRM.",
    category: "Internal Operations & Admin", subcategory: "Hosted Class / Event Lead Capture & Tracking", priority: "P2", status: "open",
    department: "SCS", studio: "PU", ageHours: 52,
  },

  // ── Studio Amenities and Facilities ──────────────────────────────────────
  {
    title: "Valet stopped taking cars at 7pm",
    description: "Valet left early on Tuesday; members for the 7:30pm class had nowhere to park.",
    category: "Studio Amenities and Facilities", subcategory: "Valet Issues", priority: "P2", status: "open",
    department: "OPS", studio: "KH", ageHours: 28,
  },
  {
    title: "Ran out of towels before evening classes",
    description: "No clean towels left by 6pm. Laundry pickup was missed in the morning.",
    category: "Repair and Maintenance", subcategory: "Towel Availability Issues", priority: "P1", status: "resolved",
    department: "FAC", studio: "SHQ", ageHours: 2 * 24, resolvedHoursAgo: 40,
    resolution: "Emergency laundry run done; vendor confirmed daily 8am pickup.",
  },
  {
    title: "Water leak under changing room sink",
    description: "Slow leak under the women's changing room sink; floor wet and slippery.",
    category: "Repair and Maintenance", subcategory: "Plumbing Leaks", priority: "P0", status: "in_progress",
    department: "FAC", studio: "KHB", ageHours: 4, tags: ["safety"],
  },

  // ── Safety and Security ──────────────────────────────────────────────────
  {
    title: "Member slipped near reformer area",
    description: "Member slipped on a wet patch near reformer 4. No injury reported, incident logged at the desk.",
    category: "Safety and Security", priority: "P0", status: "escalated",
    department: "MGT", studio: "CTS", client: "Sana Khan (mock)", ageHours: 3, escalationLevel: 1, tags: ["incident"],
  },

  // ── Theft and Lost Items ─────────────────────────────────────────────────
  {
    title: "Lost AirPods case in locker room",
    description: "Member left a white AirPods case in locker 22 after the 8am class. Not found in lost & found.",
    category: "Theft and Lost Items", priority: "P3", status: "open",
    department: "OPS", studio: "KH", client: "Dev Malhotra (mock)", ageHours: 22,
  },

  // ── Miscellaneous ────────────────────────────────────────────────────────
  {
    title: "Request for studio photo shoot slot",
    description: "A partner brand asked to shoot in the studio on a Sunday afternoon.",
    category: "Miscellaneous", priority: "P3", status: "open",
    department: "OPS", ageHours: 14, unassigned: true, source: "ai_assistant",
  },

  // ── Long-overdue (breached SLA) ──────────────────────────────────────────
  {
    title: "Music playlist licence renewal overdue",
    description: "Licence for the class playlists expired; trainers are using personal playlists.",
    category: "Internal Operations & Admin", subcategory: "Internal Communication Gap / Workflow Approval", priority: "P1", status: "open",
    department: "OPS", ageHours: 9 * 24, tags: ["overdue"],
  },
];
