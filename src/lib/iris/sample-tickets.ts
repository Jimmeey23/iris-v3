// IRIS — Sample Tickets for Demo

import { EMPLOYEE_MAP, DEPT_MAP, STUDIO_MAP, EMPLOYEES, Priority, TicketStatus, SLAStatus } from "./types";

export interface Ticket {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: Priority;
  status: TicketStatus;
  studioCode?: string;
  departmentCode?: string;
  assigneeId?: string;
  reporterId: string;
  affectedClient?: string;
  clientMomenceId?: string;
  membershipId?: string;
  bookingId?: string;
  equipment?: string;
  businessImpact?: string;
  operationalImpact?: string;
  severity?: string;
  resolution?: string;
  resolutionSummary?: string;
  investigationNotes?: string;
  recommendedResolution?: string;
  attachments?: string[];
  relatedTickets?: string[];
  tags?: string[];
  slaStatus: SLAStatus;
  slaResponseTarget?: Date;
  slaResolutionTarget?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  escalationLevel: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  activities: { type: string; description: string; actor?: string; timestamp: string }[];
  comments: { author: string; content: string; isInternal: boolean; timestamp: string }[];
}

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
const hoursAhead = (h: number) => new Date(now.getTime() + h * 3600 * 1000).toISOString();

export const SAMPLE_TICKETS: Ticket[] = [
  {
    id: "tkt_001",
    ticketId: "IRIS-2026-0142",
    title: "Air Conditioning Malfunction — Main Workout Studio, Kwality House",
    description: "The air conditioning system in the main workout studio at Kwality House is reportedly malfunctioning. Clients have experienced discomfort during sessions, potentially affecting the overall class experience. The thermostat is showing 28°C despite being set to 18°C. Multiple clients have verbally complained during the 9 AM and 10:30 AM sessions.",
    category: "Facilities",
    subcategory: "HVAC",
    priority: "P1",
    status: "in_progress",
    studioCode: "KH",
    departmentCode: "FAC",
    assigneeId: "emp_saachi",
    reporterId: "emp_zahur",
    affectedClient: "Multiple clients",
    businessImpact: "Client experience and studio operations",
    operationalImpact: "Classes continuing with reduced comfort; risk of class cancellations if not resolved before peak hours",
    severity: "High",
    recommendedResolution: "1. Dispatch HVAC technician immediately.\n2. Provide portable AC units as temporary measure.\n3. Communicate with booked clients about the situation.\n4. Consider relocating affected classes to Studio 2 if available.",
    investigationNotes: "Verified with front desk — issue started at approximately 8:30 AM today. Checked building maintenance log — no recent HVAC service. Cross-referenced with previous ticket IRIS-2026-0098 (similar issue 6 weeks ago).",
    relatedTickets: ["IRIS-2026-0098"],
    tags: ["hvac", "client-complaint", "kwality-house"],
    slaStatus: "at_risk",
    slaResponseTarget: hoursAgo(1),
    slaResolutionTarget: hoursAhead(3),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(0.5),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Aarav Mehta", timestamp: hoursAgo(2) },
      { type: "classified", description: "Classified as Facilities → HVAC by Issue Classification Agent", actor: "IRIS AI", timestamp: hoursAgo(2) },
      { type: "assigned", description: "Auto-assigned to Arjun Pillai (Facilities Manager)", actor: "Routing Agent", timestamp: hoursAgo(1.95) },
      { type: "investigation", description: "Investigation Agent checked historical tickets — found 1 similar", actor: "IRIS AI", timestamp: hoursAgo(1.9) },
      { type: "acknowledged", description: "Ticket acknowledged by assignee", actor: "Arjun Pillai", timestamp: hoursAgo(1.5) },
      { type: "in_progress", description: "Status changed to In Progress — technician dispatched", actor: "Arjun Pillai", timestamp: hoursAgo(1) },
      { type: "comment", description: "Added internal comment: HVAC technician CoolAir Services dispatched, ETA 30 minutes", actor: "Arjun Pillai", timestamp: hoursAgo(0.8) },
    ],
    comments: [
      { author: "Arjun Pillai", content: "HVAC technician CoolAir Services dispatched, ETA 30 minutes. Will update once diagnostic is complete.", isInternal: true, timestamp: hoursAgo(0.8) },
      { author: "Aarav Mehta", content: "Thanks Arjun. We've moved the 12 PM class to Studio 2 temporarily.", isInternal: true, timestamp: hoursAgo(0.5) },
    ],
  },
  {
    id: "tkt_002",
    ticketId: "IRIS-2026-0141",
    title: "Membership Incorrectly Frozen — Priya Agarwal (Kwality House)",
    description: "Member Priya Agarwal reports that her Annual Premium membership has been frozen without her request. She attempted to book a class this morning and received an error stating her membership is inactive. Last successful booking was 2 days ago. No scheduled freeze was requested.",
    category: "Membership",
    subcategory: "Freeze Issue",
    priority: "P2",
    status: "in_progress",
    studioCode: "KH",
    departmentCode: "MEM",
    assigneeId: "emp_akshay",
    reporterId: "emp_zahur",
    affectedClient: "Priya Agarwal",
    clientMomenceId: "MM-89342",
    membershipId: "MBR-PREMIUM-2341",
    businessImpact: "Client cannot book classes; revenue at risk if not resolved",
    operationalImpact: "Single client affected; no broader operational impact",
    severity: "Medium",
    recommendedResolution: "1. Verify freeze status in Momence.\n2. Check audit logs for what triggered the freeze.\n3. Unfreeze immediately if incorrect.\n4. Apply goodwill credit for inconvenience.\n5. Notify client of resolution.",
    investigationNotes: "Momence member lookup successful — Priya Agarwal (MM-89342). Membership shows status 'frozen' as of 11 PM last night. No scheduled freeze in system. No payment failure detected. Likely a system glitch. Cross-referencing with Momence audit logs.",
    tags: ["membership", "freeze", "momence"],
    slaStatus: "on_track",
    slaResponseTarget: hoursAgo(3),
    slaResolutionTarget: hoursAhead(20),
    firstResponseAt: hoursAgo(3.5),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(1),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Aarav Mehta", timestamp: hoursAgo(4) },
      { type: "classified", description: "Classified as Membership → Freeze Issue", actor: "IRIS AI", timestamp: hoursAgo(4) },
      { type: "momence_lookup", description: "Investigation Agent retrieved member record via Momence API", actor: "IRIS AI", timestamp: hoursAgo(3.95) },
      { type: "assigned", description: "Auto-assigned to Ishita Nair (Memberships Manager)", actor: "Routing Agent", timestamp: hoursAgo(3.9) },
      { type: "first_response", description: "First response sent to client", actor: "Ishita Nair", timestamp: hoursAgo(3.5) },
      { type: "in_progress", description: "Status changed to In Progress", actor: "Ishita Nair", timestamp: hoursAgo(3) },
    ],
    comments: [
      { author: "Ishita Nair", content: "Confirmed the freeze was system-triggered, not user-initiated. Investigating root cause with Momence support. Will unfreeze immediately.", isInternal: true, timestamp: hoursAgo(3) },
      { author: "Ishita Nair", content: "Email sent to client acknowledging the issue and providing temporary booking instructions.", isInternal: false, timestamp: hoursAgo(3.4) },
    ],
  },
  {
    id: "tkt_003",
    ticketId: "IRIS-2026-0140",
    title: "Sound System Failure — Studio 1, Supreme HQ",
    description: "Complete sound system failure in Studio 1 at Supreme HQ. No audio output from speakers. The amplifier appears to power on but no sound is produced. Classes scheduled at 11 AM and 12:30 PM are affected. Approximately 24 clients across both sessions are impacted.",
    category: "Facilities",
    subcategory: "Audio",
    priority: "P0",
    status: "escalated",
    studioCode: "SHQ",
    departmentCode: "FAC",
    assigneeId: "emp_saachi",
    reporterId: "emp_deesha",
    businessImpact: "Classes cannot proceed without sound; significant client experience impact",
    operationalImpact: "2 classes affected, ~24 clients impacted; potential cancellations if not resolved within 30 minutes",
    severity: "Critical",
    recommendedResolution: "1. Dispatch AV technician immediately.\n2. Arrange backup portable speaker system.\n3. If unresolved in 30 minutes, relocate classes to Studio 2 or cancel with credit.\n4. Notify all affected clients.",
    investigationNotes: "Diya Sharma confirmed complete audio failure at 10:45 AM. Tried power cycling amplifier — no improvement. Tested multiple input sources — all silent. Backup portable speaker being set up. AV vendor AudioTech Solutions contacted, ETA 25 minutes.",
    tags: ["sound-system", "critical", "supreme-hq"],
    slaStatus: "breached",
    slaResponseTarget: hoursAgo(0.5),
    slaResolutionTarget: hoursAhead(1.5),
    escalationLevel: 1,
    source: "ai_assistant",
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(0.2),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Diya Sharma", timestamp: hoursAgo(1) },
      { type: "classified", description: "Classified as P0 Critical — Facilities → Audio", actor: "IRIS AI", timestamp: hoursAgo(1) },
      { type: "assigned", description: "Auto-assigned to Arjun Pillai", actor: "Routing Agent", timestamp: hoursAgo(1) },
      { type: "escalated", description: "Escalated to Sanaya Wadia (Studio Director) due to P0 status", actor: "SLA Agent", timestamp: hoursAgo(0.8) },
      { type: "in_progress", description: "AV technician dispatched", actor: "Arjun Pillai", timestamp: hoursAgo(0.7) },
    ],
    comments: [
      { author: "Arjun Pillai", content: "AV technician dispatched. Backup speaker being set up for 11 AM class.", isInternal: true, timestamp: hoursAgo(0.7) },
      { author: "Sanaya Wadia", content: "Acknowledged escalation. Monitoring closely. Approved overtime for technician if needed.", isInternal: true, timestamp: hoursAgo(0.5) },
    ],
  },
  {
    id: "tkt_004",
    ticketId: "IRIS-2026-0139",
    title: "Class Credits Not Reflecting — Annual 12-Class Package",
    description: "Member Rhea Malhotra purchased the Annual 12-Class Package yesterday but her account is showing only 4 credits instead of 12. Purchase receipt shows successful payment of ₹18,000 via credit card. Momence transaction ID MM-TXN-456789 confirms the payment.",
    category: "Membership",
    subcategory: "Credit Discrepancy",
    priority: "P2",
    status: "resolved",
    studioCode: "KH",
    departmentCode: "MEM",
    assigneeId: "emp_akshay",
    reporterId: "emp_zahur",
    affectedClient: "Rhea Malhotra",
    clientMomenceId: "MM-88214",
    membershipId: "PKG-12CLASS-1182",
    businessImpact: "Client cannot book full set of classes paid for",
    operationalImpact: "Single client; potential reputation impact if not resolved",
    severity: "Medium",
    resolutionSummary: "Investigation confirmed a partial credit application due to a Momence synchronization delay. Manually applied the remaining 8 credits to the client's account. Client notified and acknowledged resolution. Goodwill credit of 1 additional class applied for the inconvenience.",
    recommendedResolution: "1. Verify purchase in Momence.\n2. Compare transaction amount with credited package.\n3. Apply missing credits if verified.\n4. Notify client.",
    investigationNotes: "Momence API confirmed purchase: ₹18,000 for 12-class package. Client account shows 4 credits. Transaction log shows partial application due to sync issue. Manual credit adjustment authorized by Ishita Nair.",
    tags: ["credits", "momence", "resolved"],
    slaStatus: "on_track",
    slaResponseTarget: hoursAgo(28),
    slaResolutionTarget: hoursAgo(10),
    firstResponseAt: hoursAgo(29),
    resolvedAt: hoursAgo(10),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(10),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Aarav Mehta", timestamp: hoursAgo(30) },
      { type: "classified", description: "Classified as Membership → Credit Discrepancy", actor: "IRIS AI", timestamp: hoursAgo(30) },
      { type: "momence_lookup", description: "Investigation Agent verified purchase and current credit balance", actor: "IRIS AI", timestamp: hoursAgo(29.5) },
      { type: "assigned", description: "Auto-assigned to Ishita Nair", actor: "Routing Agent", timestamp: hoursAgo(29.8) },
      { type: "first_response", description: "First response sent", actor: "Ishita Nair", timestamp: hoursAgo(29) },
      { type: "in_progress", description: "Status changed to In Progress", actor: "Ishita Nair", timestamp: hoursAgo(20) },
      { type: "resolved", description: "Credits applied — 8 missing credits added + 1 goodwill credit", actor: "Ishita Nair", timestamp: hoursAgo(10) },
      { type: "closed", description: "Ticket closed after client confirmation", actor: "System", timestamp: hoursAgo(8) },
    ],
    comments: [
      { author: "Ishita Nair", content: "Confirmed the sync issue. Applying 8 missing credits and 1 additional as goodwill.", isInternal: true, timestamp: hoursAgo(11) },
      { author: "Ishita Nair", content: "Hi Rhea, we've resolved the credit issue. You now have 13 credits (12 + 1 goodwill). Sorry for the inconvenience!", isInternal: false, timestamp: hoursAgo(10) },
    ],
  },
  {
    id: "tkt_005",
    ticketId: "IRIS-2026-0138",
    title: "Payment Deducted But Not In System — ₹3,500 UPI Payment",
    description: "Member Karan Singh reports that a UPI payment of ₹3,500 for a 5-class package was deducted from his bank account but the transaction is not reflecting in Momence. Payment was made at 9:15 AM today via PhonePe. UPI transaction ID: 884329176543210. Bank reference confirms deduction.",
    category: "Payment",
    subcategory: "Missing Transaction",
    priority: "P1",
    status: "open",
    studioCode: "KHB",
    departmentCode: "PAY",
    assigneeId: "emp_jimmeey",
    reporterId: "emp_prathap",
    affectedClient: "Karan Singh",
    clientMomenceId: "MM-91234",
    businessImpact: "Client has paid but not received service; trust impact",
    operationalImpact: "Single client; revenue reconciliation issue",
    severity: "High",
    recommendedResolution: "1. Search Momence for transaction.\n2. Check payment gateway logs.\n3. Reconcile with UPI reference.\n4. Apply credit to account if verified.\n5. Notify client.",
    investigationNotes: "Momence transaction search returned no results for the UPI reference. Payment gateway (Razorpay) logs queried — no corresponding transaction found. UPI deduction verified via bank statement screenshot provided by client. Likely a gateway timeout issue where payment succeeded but callback failed.",
    tags: ["payment", "upi", "bengaluru"],
    slaStatus: "on_track",
    slaResponseTarget: hoursAhead(0.5),
    slaResolutionTarget: hoursAhead(22),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(0.5),
    updatedAt: hoursAgo(0.3),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Kabir Reddy", timestamp: hoursAgo(0.5) },
      { type: "classified", description: "Classified as Payment → Missing Transaction (P1)", actor: "IRIS AI", timestamp: hoursAgo(0.5) },
      { type: "momence_lookup", description: "Investigation Agent searched Momence — no transaction found", actor: "IRIS AI", timestamp: hoursAgo(0.45) },
      { type: "assigned", description: "Auto-assigned to Meera Krishnan (Finance Manager)", actor: "Routing Agent", timestamp: hoursAgo(0.4) },
      { type: "comment", description: "Awaiting bank statement verification", actor: "IRIS AI", timestamp: hoursAgo(0.3) },
    ],
    comments: [
      { author: "Meera Krishnan", content: "Received bank statement screenshot from client. Verifying with Razorpay support. Will manually credit account once verification complete.", isInternal: true, timestamp: hoursAgo(0.3) },
    ],
  },
  {
    id: "tkt_006",
    ticketId: "IRIS-2026-0137",
    title: "Recurring Booking Not Cancelling — Aditi Kapoor",
    description: "Member Aditi Kapoor requested cancellation of her recurring Tuesday 7 AM class booking 3 weeks ago, but she continues to receive booking confirmations and the system keeps auto-booking her. She has now been charged for 3 classes she did not attend.",
    category: "Scheduling",
    subcategory: "Recurring",
    priority: "P2",
    status: "in_progress",
    studioCode: "KH",
    departmentCode: "SCH",
    assigneeId: "emp_jimmeey",
    reporterId: "emp_zahur",
    affectedClient: "Aditi Kapoor",
    clientMomenceId: "MM-85112",
    membershipId: "MBR-UNLIMITED-1198",
    bookingId: "BKG-RECUR-4451",
    businessImpact: "Client charged for unused classes; trust impact",
    operationalImpact: "Single client; potential pattern issue if recurring cancellation bug",
    severity: "Medium",
    recommendedResolution: "1. Verify cancellation request history.\n2. Check Momence recurring booking settings.\n3. Cancel all future recurring instances.\n4. Process refund for 3 incorrectly charged classes.\n5. Notify client.",
    investigationNotes: "Momence shows the cancellation request was logged 3 weeks ago. However, the recurring booking series was not properly terminated. System appears to have a bug where cancellation requests for recurring series sometimes don't propagate. Will escalate to Momence support after resolving client's immediate issue.",
    tags: ["recurring", "cancellation", "scheduling"],
    slaStatus: "at_risk",
    slaResponseTarget: hoursAgo(2),
    slaResolutionTarget: hoursAhead(4),
    firstResponseAt: hoursAgo(3),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(1),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Aarav Mehta", timestamp: hoursAgo(5) },
      { type: "classified", description: "Classified as Scheduling → Recurring", actor: "IRIS AI", timestamp: hoursAgo(5) },
      { type: "assigned", description: "Auto-assigned to Aanya Verma (Scheduling Manager)", actor: "Routing Agent", timestamp: hoursAgo(4.95) },
      { type: "first_response", description: "First response sent", actor: "Aanya Verma", timestamp: hoursAgo(3) },
      { type: "in_progress", description: "Status changed to In Progress", actor: "Aanya Verma", timestamp: hoursAgo(2) },
    ],
    comments: [
      { author: "Aanya Verma", content: "Recurring booking identified. Cancelling all future instances. Refund of 3 class charges being processed.", isInternal: true, timestamp: hoursAgo(2) },
    ],
  },
  {
    id: "tkt_007",
    ticketId: "IRIS-2026-0136",
    title: "Front Desk Unable to Check In Client — System Error",
    description: "Front desk at Kenkere House reports they cannot check in client Meera Reddy for the 6 PM session. System returns 'Member not found' error despite the client being a regular member. Multiple attempts with different search criteria (name, phone, email) all fail.",
    category: "IT",
    subcategory: "Momence",
    priority: "P1",
    status: "in_progress",
    studioCode: "KHB",
    departmentCode: "ITS",
    assigneeId: "emp_mitali",
    reporterId: "emp_prathap",
    affectedClient: "Meera Reddy",
    businessImpact: "Client cannot access paid class; immediate client experience impact",
    operationalImpact: "Single client affected; class start delayed",
    severity: "High",
    recommendedResolution: "1. Verify client details.\n2. Search Momence with broader criteria.\n3. Check if there's a data issue.\n4. Manual check-in as workaround.\n5. Investigate root cause.",
    investigationNotes: "Momence member search is not returning Meera Reddy's profile despite her being an active member for 8 months. Other members can be searched successfully. Possible data corruption or indexing issue. Manual check-in being attempted as workaround.",
    tags: ["momence", "check-in", "bengaluru"],
    slaStatus: "on_track",
    slaResponseTarget: hoursAhead(0.5),
    slaResolutionTarget: hoursAhead(7),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(0.3),
    updatedAt: hoursAgo(0.1),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Kabir Reddy", timestamp: hoursAgo(0.3) },
      { type: "classified", description: "Classified as IT → Momence (P1)", actor: "IRIS AI", timestamp: hoursAgo(0.3) },
      { type: "assigned", description: "Auto-assigned to Neel Patel (IT Manager)", actor: "Routing Agent", timestamp: hoursAgo(0.25) },
      { type: "acknowledged", description: "Ticket acknowledged", actor: "Neel Patel", timestamp: hoursAgo(0.1) },
    ],
    comments: [
      { author: "Neel Patel", content: "Investigating. Trying broader search. Will also check if this is an indexing issue. Manual check-in being attempted.", isInternal: true, timestamp: hoursAgo(0.1) },
    ],
  },
  {
    id: "tkt_008",
    ticketId: "IRIS-2026-0135",
    title: "Trainer Reported Incorrect Attendance — 9 AM Class, Kwality House",
    description: "Trainer Tara Kapoor reports that the attendance recorded for her 9 AM class at Kwality House is incorrect. The system shows 18 attendees but Tara reports she counted 20 in class. Two clients (Sneha Gupta and Rajiv Khanna) are missing from the attendance list.",
    category: "Scheduling",
    subcategory: "Attendance",
    priority: "P2",
    status: "awaiting_response",
    studioCode: "KH",
    departmentCode: "TRN",
    assigneeId: "emp_vivaran",
    reporterId: "emp_vivaran",
    businessImpact: "Attendance accuracy for billing and credit deduction",
    operationalImpact: "Two clients may be incorrectly credited/charged",
    severity: "Medium",
    recommendedResolution: "1. Verify attendance with front desk check-in records.\n2. Cross-reference with class booking list.\n3. Update attendance if discrepancy confirmed.\n4. Adjust credits accordingly.",
    investigationNotes: "Front desk check-in log shows 20 clients checked in for the 9 AM class. Momence attendance shows 18. Discrepancy of 2 confirmed. Two clients (Sneha Gupta, Rajiv Khanna) appear in check-in log but not attendance.",
    tags: ["attendance", "trainer", "billing"],
    slaStatus: "on_track",
    slaResponseTarget: hoursAhead(2),
    slaResolutionTarget: hoursAhead(26),
    escalationLevel: 0,
    source: "ai_assistant",
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
    activities: [
      { type: "created", description: "Ticket created via AI Assistant", actor: "Tara Kapoor", timestamp: hoursAgo(2) },
      { type: "classified", description: "Classified as Scheduling → Attendance", actor: "IRIS AI", timestamp: hoursAgo(2) },
      { type: "assigned", description: "Auto-assigned to Tara Kapoor (Head Trainer)", actor: "Routing Agent", timestamp: hoursAgo(1.95) },
      { type: "investigation", description: "Investigation Agent verified check-in log vs attendance", actor: "IRIS AI", timestamp: hoursAgo(1.5) },
      { type: "awaiting_response", description: "Awaiting confirmation from Tara before updating records", actor: "IRIS AI", timestamp: hoursAgo(1) },
    ],
    comments: [
      { author: "Tara Kapoor", content: "Confirmed the 2 missing clients were in class. Please proceed with attendance correction.", isInternal: true, timestamp: hoursAgo(1) },
    ],
  },
];

// Helper functions
export function getAssignee(ticket: Ticket) {
  return ticket.assigneeId ? EMPLOYEE_MAP[ticket.assigneeId] : null;
}
export function getReporter(ticket: Ticket) {
  return EMPLOYEE_MAP[ticket.reporterId];
}
export function getDepartment(ticket: Ticket) {
  return ticket.departmentCode ? DEPT_MAP[ticket.departmentCode] : null;
}
export function getStudio(ticket: Ticket) {
  return ticket.studioCode ? STUDIO_MAP[ticket.studioCode] : null;
}

// Build employee lookup by department
const EMPLOYEES_BY_DEPT: Record<string, string[]> = {};
EMPLOYEES.forEach((e) => {
  if (!EMPLOYEES_BY_DEPT[e.departmentCode]) EMPLOYEES_BY_DEPT[e.departmentCode] = [];
  EMPLOYEES_BY_DEPT[e.departmentCode].push(e.id);
});

// Generate additional synthetic tickets for dashboard
const additionalTitles = [
  "Studio 2 Floor Mat Replacement Required — Kwality House",
  "Wi-Fi Slow at Supreme HQ Reception Area",
  "Client Complaint — Music Volume Too Loud in 6 PM Class",
  "Momence Session Reminder Not Sent — Multiple Clients",
  "Membership Refund Authorization — ₹12,000",
  "Bengaluru Studio Plumbing Issue — Locker Room",
  "Lighting Flickering in Studio 1 — Supreme HQ",
  "POS Card Reader Not Working — Pop Up Studio",
  "Client Request — Change of Instructor Preference",
  "Momence API Rate Limit Hit — Investigation",
  "AC Service Reminder — Kenkere House",
  "Equipment Maintenance Schedule — All Studios",
  "New Corporate Membership — Tech Mahindra Setup",
  "Lost Item — Apple AirPods Pro at Kwality House",
  "Instructor Schedule Conflict — Next Thursday",
  "Promotional Code Setup — Diwali Offer",
  "Client VIP Request — Studio Tour",
  "Cash Reconciliation Discrepancy — Supreme HQ",
  "Brand Asset Request — New Studio Photoshoot",
  "Process Improvement — Front Desk Check-in",
];

const statuses: TicketStatus[] = ["open", "in_progress", "awaiting_response", "resolved", "closed", "escalated"];
const priorities: Priority[] = ["P0", "P1", "P2", "P3"];
const slaStatuses: SLAStatus[] = ["on_track", "at_risk", "breached", "paused"];
const studioCodes = ["KH", "SHQ", "KHB", "PU"];
const deptCodes = ["FRT", "MEM", "PAY", "FAC", "ITS", "SCH", "TRN", "MKT", "HRV", "MGT"];

export const ALL_TICKETS: Ticket[] = [
  ...SAMPLE_TICKETS,
  ...additionalTitles.map((title, i) => {
    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];
    const studioCode = studioCodes[i % studioCodes.length];
    const departmentCode = deptCodes[i % deptCodes.length];
    const assignee = EMPLOYEES_BY_DEPT[departmentCode]?.[0] || "emp_mallika";
    const slaStatus = status === "resolved" || status === "closed" ? "on_track" : slaStatuses[i % slaStatuses.length];
    const createdHoursAgo = (i + 1) * 7;
    return {
      id: `tkt_gen_${i + 9}`,
      ticketId: `IRIS-2026-${String(134 - i).padStart(4, "0")}`,
      title,
      description: `Detailed description for ${title}. This is a synthetic ticket generated to demonstrate dashboard analytics.`,
      category: ["Facilities", "IT", "Membership", "Scheduling", "Client Experience", "HR", "Operations"][i % 7],
      subcategory: "General",
      priority,
      status,
      studioCode,
      departmentCode,
      assigneeId: assignee,
      reporterId: "emp_zahur",
      slaStatus,
      slaResponseTarget: new Date(now.getTime() + (i - 5) * 3600 * 1000),
      slaResolutionTarget: new Date(now.getTime() + (i + 10) * 3600 * 1000),
      firstResponseAt: i % 3 === 0 ? hoursAgo(createdHoursAgo - 1) : undefined,
      resolvedAt: status === "resolved" || status === "closed" ? hoursAgo(createdHoursAgo - 5) : undefined,
      escalationLevel: status === "escalated" ? 1 : 0,
      source: i % 3 === 0 ? "manual" : "ai_assistant",
      createdAt: hoursAgo(createdHoursAgo),
      updatedAt: hoursAgo(createdHoursAgo - 2),
      activities: [
        { type: "created", description: "Ticket created", actor: "System", timestamp: hoursAgo(createdHoursAgo) },
        { type: "assigned", description: "Auto-assigned", actor: "Routing Agent", timestamp: hoursAgo(createdHoursAgo - 0.1) },
      ],
      comments: [],
    } as Ticket;
  }),
];

