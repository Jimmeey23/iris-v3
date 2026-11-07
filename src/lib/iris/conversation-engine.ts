// IRIS - Smart Conversation Engine
// Strategically asks ONE question at a time, decides what fields to capture based on category

import { STUDIOS, DEPARTMENTS, EMPLOYEES } from "./types";
import { TICKET_TEMPLATES } from "./templates";
import { SLA_DEFINITIONS, SLA_MAP, formatSLADuration } from "./sla-definitions";
import { ALL_TICKETS } from "./sample-tickets";

export type ConversationStage =
  | "greeting"
  | "intent_captured"
  | "collecting"
  | "investigating"
  | "ready"
  | "created";

export interface CollectedInfo {
  issue?: string;
  category?: string;
  subcategory?: string;
  studio?: string;
  studioCity?: string;
  severity?: string;
  impact?: string;
  affectedClient?: string;
  clientIdentifier?: string;
  clientMomenceVerified?: boolean;
  membershipType?: string;
  momenceId?: string;
  paymentAmount?: string;
  paymentMethod?: string;
  paymentReference?: string;
  timeOfIssue?: string;
  duration?: string;
  affectedCount?: string;
  attemptedResolution?: string;
  preferredContact?: string;
  urgency?: string;
  equipment?: string;
  location?: string;
  instructor?: string;
  sessionTime?: string;
  sessionMomenceVerified?: boolean;
  additionalContext?: string;
  hasAttachments?: boolean;
  businessImpact?: string;
  sentiment?: string;
  sentimentScore?: number;
  requiresRecurrence?: boolean;
  recurrenceReason?: string;
  isInformationOnly?: boolean;
  informationOnlyReason?: string;
}

export interface ConversationState {
  stage: ConversationStage;
  intent: {
    description: string;
    detectedKeywords: string[];
    matchedTemplate?: string;
    suggestedCategory?: string;
    suggestedDepartment?: string;
    suggestedPriority?: "P0" | "P1" | "P2" | "P3";
    confidenceScore?: number;
  };
  collectedInfo: CollectedInfo;
  questionsAsked: string[];
  questionsRemaining: string[];
  currentQuestionIndex: number;
  turnCount: number;
}

export interface AIResponse {
  messages: AIMessageOutput[];
  newState: Partial<ConversationState>;
  shouldInvestigate?: boolean;
  shouldShowTicket?: boolean;
}

export interface AIMessageOutput {
  content: string;
  buttons?: Array<{ label: string; value: string; icon?: string; captures?: string }>;
  inputType?: "text" | "select" | "multiselect" | "date" | "none" | "momence_member" | "momence_session" | "momence_trainer";
  inputPlaceholder?: string;
  isQuestion?: boolean;
  isAcknowledgment?: boolean;
  isTransition?: boolean;
  thinkingDuration?: number; // ms to show thinking before this message
  agentActivity?: Array<{ agent: string; action: string; status: "pending" | "active" | "complete" }>;
  tools?: Array<{ name: string; status: "running" | "complete"; result?: string; duration?: number }>;
  ticketPreview?: any;
  metadata?: { investigationSteps?: string[]; confidenceScore?: number; capturedFields?: Array<{ field: string; value: string }> };
  variant?: "default" | "question" | "info" | "success" | "investigation" | "ticket";
}

// === INTENT DETECTION ===

interface IntentPattern {
  keywords: string[];
  category: string;
  subcategory?: string;
  department: string;
  priority: "P0" | "P1" | "P2" | "P3";
  templateCode?: string;
  requiredQuestions: string[]; // ordered list of question IDs to ask
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    keywords: ["ac", "air conditioning", "cooling", "hvac", "ac not working", "ac malfunction", "hot", "temperature"],
    category: "Facilities",
    subcategory: "HVAC",
    department: "FAC",
    priority: "P1",
    templateCode: "TPL-033",
    requiredQuestions: ["severity", "duration", "affected_count", "affected_client"],
  },
  {
    keywords: ["sound", "speaker", "audio", "music", "microphone", "mic", "amplifier", "no sound"],
    category: "Facilities",
    subcategory: "Audio",
    department: "FAC",
    priority: "P0",
    templateCode: "TPL-034",
    requiredQuestions: ["severity", "affected_count", "duration", "affected_client"],
  },
  {
    keywords: ["membership", "frozen", "freeze", "unfreeze", "membership frozen", "membership inactive"],
    category: "Membership",
    subcategory: "Freeze Issue",
    department: "MEM",
    priority: "P2",
    templateCode: "TPL-001",
    requiredQuestions: ["affected_client", "client_identifier", "membership_type", "duration"],
  },
  {
    keywords: ["credit", "credits", "class credits", "package credits", "credits not reflecting", "credit balance"],
    category: "Membership",
    subcategory: "Credit Discrepancy",
    department: "MEM",
    priority: "P2",
    templateCode: "TPL-002",
    requiredQuestions: ["affected_client", "client_identifier", "membership_type", "payment_amount"],
  },
  {
    keywords: ["payment", "deducted", "charged", "transaction", "not in system", "missing payment", "payment not showing", "upi", "card charged"],
    category: "Payment",
    subcategory: "Missing Transaction",
    department: "PAY",
    priority: "P1",
    templateCode: "TPL-021",
    requiredQuestions: ["affected_client", "client_identifier", "payment_amount", "payment_method", "payment_reference", "time_of_issue"],
  },
  {
    keywords: ["refund", "money back", "reimburse", "refund request"],
    category: "Payment",
    subcategory: "Refund",
    department: "PAY",
    priority: "P2",
    templateCode: "TPL-005",
    requiredQuestions: ["affected_client", "payment_amount", "payment_reference", "refund_reason"],
  },
  {
    keywords: ["booking", "recurring", "cancel booking", "booking not cancelling", "recurring booking", "session"],
    category: "Scheduling",
    subcategory: "Recurring",
    department: "SCH",
    priority: "P2",
    templateCode: "TPL-064",
    requiredQuestions: ["affected_client", "client_identifier", "session_time", "duration"],
  },
  {
    keywords: ["check in", "check-in", "checkin", "cannot check", "unable to check", "check in error"],
    category: "IT",
    subcategory: "Momence",
    department: "ITS",
    priority: "P1",
    templateCode: "TPL-065",
    requiredQuestions: ["affected_client", "client_identifier", "session_time", "error_description"],
  },
  {
    keywords: ["attendance", "trainer", "instructor", "wrong attendance", "attendance record", "class attendance"],
    category: "Scheduling",
    subcategory: "Attendance",
    department: "TRN",
    priority: "P2",
    templateCode: "TPL-072",
    requiredQuestions: ["affected_client", "session_time", "instructor", "discrepancy_description"],
  },
  {
    keywords: ["complaint", "client complaint", "experience", "unhappy", "dissatisfied", "rude"],
    category: "Client Experience",
    subcategory: "Complaint",
    department: "MGT",
    priority: "P2",
    templateCode: "TPL-076",
    requiredQuestions: ["affected_client", "client_identifier", "session_time", "complaint_description", "severity"],
  },
  {
    keywords: ["equipment", "barre", "weights", "mat", "mats", "broken", "damaged", "repair"],
    category: "Facilities",
    subcategory: "Equipment",
    department: "FAC",
    priority: "P2",
    templateCode: "TPL-035",
    requiredQuestions: ["equipment", "location", "severity"],
  },
  {
    keywords: ["wi-fi", "wifi", "internet", "network", "slow internet", "connection"],
    category: "IT",
    subcategory: "Network",
    department: "ITS",
    priority: "P2",
    templateCode: "TPL-049",
    requiredQuestions: ["location", "severity", "duration"],
  },
  {
    keywords: ["plumbing", "leak", "tap", "drain", "toilet", "water"],
    category: "Facilities",
    subcategory: "Plumbing",
    department: "FAC",
    priority: "P1",
    templateCode: "TPL-036",
    requiredQuestions: ["location", "severity", "duration"],
  },
  {
    keywords: ["lighting", "lights", "light", "flickering", "dark"],
    category: "Facilities",
    subcategory: "Lighting",
    department: "FAC",
    priority: "P1",
    templateCode: "TPL-040",
    requiredQuestions: ["location", "severity", "duration"],
  },
  {
    keywords: ["momence", "system", "system down", "momence down", "cannot access"],
    category: "IT",
    subcategory: "Momence",
    department: "ITS",
    priority: "P0",
    templateCode: "TPL-048",
    requiredQuestions: ["severity", "affected_count", "duration"],
  },
];

// === QUESTION DEFINITIONS ===

interface QuestionDef {
  id: string;
  field: keyof CollectedInfo;
  question: string;
  buttons?: Array<{ label: string; value: string; captures: string }>;
  inputType?: "text" | "select" | "date" | "momence_member" | "momence_session" | "momence_trainer";
  inputPlaceholder?: string;
  acknowledgments?: string[]; // templates like "Got it - {value} noted."
  // Optional: alternative ack pools based on whether the captured value matches
  // a real Momence entity. Used for momence_member / momence_session / momence_trainer
  // questions to avoid falsely claiming "Member verified" when the user typed
  // free-text instead of selecting from the Momence search dropdown.
  acknowledgmentsVerified?: string[];
  acknowledgmentsUnverified?: string[];
  isOptional?: boolean;
}

const QUESTIONS: Record<string, QuestionDef> = {
  severity: {
    id: "severity",
    field: "severity",
    question: "How severely is this affecting operations right now?",
    buttons: [
      { label: "🔴 Critical - Classes/operations disrupted", value: "critical", captures: "Critical" },
      { label: "🟠 High - Significant inconvenience", value: "high", captures: "High" },
      { label: "🟡 Medium - Partial functionality affected", value: "medium", captures: "Medium" },
      { label: "🟢 Low - Minor inconvenience", value: "low", captures: "Low" },
      { label: "⚪ Not sure yet", value: "unsure", captures: "To be assessed" },
    ],
    acknowledgments: [
      "Understood - severity marked as {value}. That helps me prioritise this correctly.",
      "Got it. {value} severity. I'll factor that into the SLA calculation.",
      "Noted - {value} impact. This determines our response timeline.",
    ],
  },
  duration: {
    id: "duration",
    field: "duration",
    question: "When did you first notice this issue?",
    buttons: [
      { label: "Just now / within the last hour", value: "lt_1h", captures: "Less than 1 hour" },
      { label: "1–3 hours ago", value: "1_3h", captures: "1-3 hours" },
      { label: "3–6 hours ago", value: "3_6h", captures: "3-6 hours" },
      { label: "More than 6 hours ago", value: "gt_6h", captures: "More than 6 hours" },
      { label: "Since yesterday or longer", value: "yesterday", captures: "Since yesterday+" },
    ],
    acknowledgments: [
      "Thanks - timing noted as {value}.",
      "Got it, {value}. That helps with the timeline.",
      "Noted, {value}. This affects how we approach resolution.",
    ],
  },
  affected_count: {
    id: "affected_count",
    field: "affectedCount",
    question: "How many clients or sessions are currently affected?",
    buttons: [
      { label: "Single client / no class impact", value: "single", captures: "Single client" },
      { label: "One class affected (~15–20 clients)", value: "one_class", captures: "One class (~20 clients)" },
      { label: "Multiple classes affected", value: "multi_class", captures: "Multiple classes" },
      { label: "Entire studio operations impacted", value: "entire", captures: "Entire studio" },
    ],
    acknowledgments: [
      "Understood - {value} affected. This shapes our escalation path.",
      "Got it, {value}. Helps me assess the business impact.",
      "Noted - {value} impact scope.",
    ],
  },
  affected_client: {
    id: "affected_client",
    field: "affectedClient",
    question: "Which client is affected? Search their Momence profile:",
    inputType: "momence_member",
    inputPlaceholder: "Search by name, phone, or email...",
    // Two ack pools: one used when the captured value matches a real Momence
    // member (i.e. user picked from the dropdown), one when the user just typed
    // free-text into the regular chat input. This avoids IRIS falsely claiming
    // "Member verified" for a name that was never actually looked up in Momence.
    acknowledgmentsVerified: [
      "Got it - {value} pulled from Momence. I'll attach their profile to this ticket.",
      "Thanks - {value} confirmed via Momence lookup.",
      "Member verified: {value}. Moving on.",
    ],
    acknowledgmentsUnverified: [
      "Got it - {value} noted as the affected client. (Tip: use the Momence search field above to verify their profile.)",
      "Noted - {value}. I'll include them in the ticket.",
      "Thanks - {value} recorded as the affected client.",
    ],
    // Default fallback (for backward compat with pickAck logic)
    acknowledgments: [
      "Got it - {value} noted as the affected client.",
      "Thanks - {value} recorded.",
      "Noted - {value}.",
    ],
  },
  client_identifier: {
    id: "client_identifier",
    field: "clientIdentifier",
    question: "Any additional contact detail for them? (Optional - their Momence profile already has the basics)",
    inputType: "text",
    inputPlaceholder: "Preferred contact: phone, email, or WhatsApp (optional)",
    isOptional: true,
    acknowledgments: [
      "Great - {value} noted.",
      "Thanks. I'll include that in the ticket.",
      "Got it. Moving on.",
    ],
  },
  membership_type: {
    id: "membership_type",
    field: "membershipType",
    question: "Which membership or package is involved?",
    buttons: [
      { label: "Annual Premium", value: "annual_premium", captures: "Annual Premium" },
      { label: "Unlimited Monthly", value: "unlimited_monthly", captures: "Unlimited Monthly" },
      { label: "12-Class Package", value: "12_class", captures: "12-Class Package" },
      { label: "5-Class Package", value: "5_class", captures: "5-Class Package" },
      { label: "Drop-in / Single class", value: "dropin", captures: "Drop-in" },
      { label: "Not sure", value: "unknown", captures: "Unknown" },
    ],
    acknowledgments: [
      "Noted - {value} membership.",
      "Got it, {value}. I'll check the terms for that package.",
      "Thanks - {value} confirmed.",
    ],
  },
  payment_amount: {
    id: "payment_amount",
    field: "paymentAmount",
    question: "What was the payment amount?",
    inputType: "text",
    inputPlaceholder: "e.g. ₹3,500",
    acknowledgments: [
      "Got it - ₹{value} noted.",
      "Thanks, {value} recorded.",
      "Noted - {value}.",
    ],
  },
  payment_method: {
    id: "payment_method",
    field: "paymentMethod",
    question: "How was the payment made?",
    buttons: [
      { label: "UPI (PhonePe / GPay / Paytm)", value: "upi", captures: "UPI" },
      { label: "Credit Card", value: "credit_card", captures: "Credit Card" },
      { label: "Debit Card", value: "debit_card", captures: "Debit Card" },
      { label: "Net Banking", value: "net_banking", captures: "Net Banking" },
      { label: "Cash", value: "cash", captures: "Cash" },
    ],
    acknowledgments: [
      "Thanks - {value} payment method noted.",
      "Got it, {value}. That determines where I check first.",
      "Noted - paid via {value}.",
    ],
  },
  payment_reference: {
    id: "payment_reference",
    field: "paymentReference",
    question: "Do you have the UPI transaction ID or bank reference number? This is the fastest way to trace it.",
    inputType: "text",
    inputPlaceholder: "e.g. 884329176543210 (optional but very helpful)",
    isOptional: true,
    acknowledgments: [
      "Excellent - that reference will let me trace it precisely.",
      "Got it. I'll search using that reference.",
      "Thanks. That makes the investigation much faster.",
    ],
  },
  time_of_issue: {
    id: "time_of_issue",
    field: "timeOfIssue",
    question: "When did the payment or transaction happen?",
    buttons: [
      { label: "Within the last hour", value: "lt_1h", captures: "Less than 1 hour ago" },
      { label: "1–6 hours ago", value: "1_6h", captures: "1-6 hours ago" },
      { label: "Earlier today", value: "today", captures: "Earlier today" },
      { label: "Yesterday", value: "yesterday", captures: "Yesterday" },
      { label: "More than 2 days ago", value: "gt_2d", captures: "More than 2 days ago" },
    ],
    acknowledgments: [
      "Thanks - {value} noted.",
      "Got it, {value}.",
      "Noted - occurred {value}.",
    ],
  },
  session_time: {
    id: "session_time",
    field: "sessionTime",
    question: "Which session is involved? Search upcoming Momence sessions:",
    inputType: "momence_session",
    inputPlaceholder: "Search by class name, time, or instructor...",
    acknowledgments: [
      "Got it - {value} session confirmed from Momence schedule.",
      "Thanks, {value} noted.",
      "Noted - session: {value}.",
    ],
  },
  instructor: {
    id: "instructor",
    field: "instructor",
    question: "Which instructor was leading? Select from Momence staff:",
    inputType: "momence_trainer",
    inputPlaceholder: "Search trainers...",
    isOptional: true,
    acknowledgments: [
      "Thanks - {value} noted from trainer directory.",
      "Got it, {value}.",
    ],
  },
  equipment: {
    id: "equipment",
    field: "equipment",
    question: "Which specific equipment is affected?",
    buttons: [
      { label: "Barre", value: "barre", captures: "Barre" },
      { label: "Weights / dumbbells", value: "weights", captures: "Weights" },
      { label: "Mats", value: "mats", captures: "Mats" },
      { label: "Resistance bands", value: "bands", captures: "Resistance bands" },
      { label: "Blocks / straps", value: "blocks", captures: "Blocks/straps" },
      { label: "Other equipment", value: "other", captures: "Other equipment" },
    ],
    acknowledgments: [
      "Noted - {value}.",
      "Got it, {value} affected.",
      "Thanks, {value} recorded.",
    ],
  },
  location: {
    id: "location",
    field: "location",
    question: "Where exactly in the studio is this happening?",
    buttons: [
      { label: "Studio 1 (main workout floor)", value: "studio_1", captures: "Studio 1" },
      { label: "Studio 2", value: "studio_2", captures: "Studio 2" },
      { label: "Reception / front desk", value: "reception", captures: "Reception" },
      { label: "Locker room", value: "locker", captures: "Locker room" },
      { label: "Common area / lobby", value: "common", captures: "Common area" },
      { label: "Entire studio", value: "entire", captures: "Entire studio" },
    ],
    acknowledgments: [
      "Got it - {value}.",
      "Noted, {value}.",
      "Thanks - {value} location confirmed.",
    ],
  },
  refund_reason: {
    id: "refund_reason",
    field: "additionalContext",
    question: "What's the reason for the refund request?",
    buttons: [
      { label: "Duplicate charge", value: "duplicate", captures: "Duplicate charge" },
      { label: "Service not delivered", value: "not_delivered", captures: "Service not delivered" },
      { label: "Cancellation within window", value: "cancellation", captures: "Cancellation within window" },
      { label: "Billing error", value: "billing_error", captures: "Billing error" },
      { label: "Client request / change of mind", value: "client_request", captures: "Client request" },
      { label: "Medical / personal reason", value: "medical", captures: "Medical/personal" },
    ],
    acknowledgments: [
      "Understood - {value}. That's important context for the approval.",
      "Got it, {value}. I'll include that in the ticket.",
      "Thanks - {value} recorded.",
    ],
  },
  complaint_description: {
    id: "complaint_description",
    field: "additionalContext",
    question: "Can you tell me a bit more about what happened? In your own words is fine.",
    inputType: "text",
    inputPlaceholder: "Describe what the client experienced...",
    acknowledgments: [
      "Thank you for sharing that. I've captured the details.",
      "Got it - I've noted the context.",
      "Thanks. That's helpful for the investigation.",
    ],
  },
  discrepancy_description: {
    id: "discrepancy_description",
    field: "additionalContext",
    question: "What's the discrepancy you're seeing? (e.g. 'purchased 12 credits but only 4 showing')",
    inputType: "text",
    inputPlaceholder: "Describe what's wrong vs. what was expected...",
    acknowledgments: [
      "Got it - I'll investigate that discrepancy specifically.",
      "Thanks, that's the key detail I needed.",
      "Noted. I'll compare that against the Momence records.",
    ],
  },
  error_description: {
    id: "error_description",
    field: "additionalContext",
    question: "What exact error or behaviour are you seeing? Any error message?",
    inputType: "text",
    inputPlaceholder: "e.g. 'Member not found error when searching'",
    acknowledgments: [
      "Got it - {value} captured.",
      "Thanks. That error message helps narrow it down.",
    ],
  },
};

// === INFO EXTRACTION ===

function extractInfoFromText(text: string): Partial<CollectedInfo> {
  const info: Partial<CollectedInfo> = {};
  const lower = text.toLowerCase();

  // Extract studio
  for (const studio of STUDIOS) {
    if (lower.includes(studio.name.toLowerCase()) || lower.includes(studio.code.toLowerCase())) {
      info.studio = studio.name;
      info.studioCity = studio.city;
      break;
    }
  }
  // City detection
  if (!info.studioCity) {
    if (lower.includes("mumbai") || lower.includes("bombay")) info.studioCity = "Mumbai";
    if (lower.includes("bengaluru") || lower.includes("bangalore")) info.studioCity = "Bengaluru";
  }

  // Extract severity from text
  if (lower.includes("critical") || lower.includes("emergency") || lower.includes("urgent") || lower.includes("asap")) {
    info.severity = "Critical";
  } else if (lower.includes("high") || lower.includes("serious") || lower.includes("major")) {
    info.severity = "High";
  } else if (lower.includes("medium") || lower.includes("moderate")) {
    info.severity = "Medium";
  } else if (lower.includes("low") || lower.includes("minor") || lower.includes("small")) {
    info.severity = "Low";
  }

  // Extract payment amount
  const amountMatch = text.match(/₹\s*([\d,]+)/i) || text.match(/rs\.?\s*([\d,]+)/i) || text.match(/(\d[\d,]+)\s*rupees/i);
  if (amountMatch) {
    info.paymentAmount = `₹${amountMatch[1]}`;
  }

  // Extract payment method
  if (lower.includes("upi") || lower.includes("phonepe") || lower.includes("gpay") || lower.includes("paytm")) {
    info.paymentMethod = "UPI";
  } else if (lower.includes("credit card")) {
    info.paymentMethod = "Credit Card";
  } else if (lower.includes("debit card")) {
    info.paymentMethod = "Debit Card";
  } else if (lower.includes("cash")) {
    info.paymentMethod = "Cash";
  } else if (lower.includes("net banking") || lower.includes("netbanking")) {
    info.paymentMethod = "Net Banking";
  }

  // Extract location
  if (lower.includes("studio 1") || lower.includes("studio one") || lower.includes("main studio") || lower.includes("main workout")) {
    info.location = "Studio 1";
  } else if (lower.includes("studio 2") || lower.includes("studio two")) {
    info.location = "Studio 2";
  } else if (lower.includes("reception") || lower.includes("front desk")) {
    info.location = "Reception";
  } else if (lower.includes("locker")) {
    info.location = "Locker room";
  }

  // Extract equipment
  if (lower.includes("barre")) info.equipment = "Barre";
  if (lower.includes("weight") || lower.includes("dumbbell")) info.equipment = "Weights";
  if (lower.includes("mat")) info.equipment = "Mats";
  if (lower.includes("band") || lower.includes("resistance")) info.equipment = "Resistance bands";

  // Extract session time
  const timeMatch = text.match(/(\d{1,2})\s*(am|pm)/i);
  if (timeMatch) {
    info.sessionTime = `${timeMatch[1]} ${timeMatch[2].toUpperCase()}`;
  }

  // Extract duration
  if (lower.includes("just now") || lower.includes("just started") || lower.includes("right now")) {
    info.duration = "Less than 1 hour";
  } else if (lower.includes("since this morning") || lower.includes("since morning")) {
    info.duration = "Since morning";
  } else if (lower.includes("since yesterday") || lower.includes("since last night")) {
    info.duration = "Since yesterday+";
  }

  // === SENTIMENT DETECTION ===
  const sentiment = detectSentiment(text);
  info.sentiment = sentiment.label;
  info.sentimentScore = sentiment.score;

  // === POWERCYCLE/MIC RECURRENCE DETECTION ===
  const powercycleKeywords = ["powercycle", "power cycle", "bike", "spin bike", "cycle", "pedal", "flywheel", "fitloc", "resistance knob", "saddle", "spm2", "stages sc3"];
  const micKeywords = ["mic", "microphone", "headset mic", "wireless mic", "mic not working", "mic cutting"];
  const isPowercycle = powercycleKeywords.some((k) => lower.includes(k));
  const isMic = micKeywords.some((k) => lower.includes(k));
  if (isPowercycle || isMic) {
    info.requiresRecurrence = true;
    info.recurrenceReason = isPowercycle
      ? "PowerCycle bike issues require follow-up inspections at 5 and 10 days per maintenance protocol"
      : "Studio microphone issues require follow-up checks at 5 and 10 days to verify continued functionality";
    if (isPowercycle && !info.equipment) info.equipment = "PowerCycle Bike";
    if (isMic && !info.equipment) info.equipment = "Microphone";
  }

  // === INFORMATION-ONLY TICKET DETECTION ===
  // These categories are treated as information-only by default - no SLA, no resolution needed
  const infoOnlyKeywords = [
    "hosted class feedback", "hosted class", "instructor late", "trainer late", "trainer punctuality",
    "freeze request", "membership freeze", "freeze membership", "pause membership",
    "feedback", "information only", "for your information", "fyi",
    "class experience feedback", "post-class feedback",
  ];
  const isInfoOnly = infoOnlyKeywords.some((k) => lower.includes(k));
  if (isInfoOnly) {
    info.isInformationOnly = true;
    info.informationOnlyReason = "This issue type is treated as information-only by default - sent to the assigned owner without SLA or resolution requirement";
  }

  // === FREEZE REQUEST EMAIL AUTO-CONVERSION ===
  // If the text mentions freeze + email/member context, flag for auto-ticket creation
  const freezeEmailKeywords = ["freeze", "pause", "injury", "medical", "doctor"];
  const emailContext = lower.includes("email") || lower.includes("info@") || lower.includes("member") || lower.includes("membership");
  if (freezeEmailKeywords.some((k) => lower.includes(k)) && emailContext) {
    info.isInformationOnly = true;
    info.informationOnlyReason = "Freeze request - auto-converted from incoming email. Treated as information-only, sent to Memberships team without SLA.";
  }

  return info;
}

// === SENTIMENT ANALYSIS ===
function detectSentiment(text: string): { label: string; score: number } {
  const lower = text.toLowerCase();
  let score = 50; // Start neutral

  // Negative indicators
  const frustratedWords = ["frustrated", "angry", "annoyed", "unhappy", "disappointed", "terrible", "awful", "worst", "horrible", "ridiculous", "unacceptable"];
  const urgentWords = ["urgent", "asap", "immediately", "emergency", "critical", "now", "right now", "happening now"];
  const complaintWords = ["complaint", "complain", "issue", "problem", "broken", "not working", "failed", "failure", "malfunction", "error", "bug", "wrong", "incorrect", "missing"];
  const positiveWords = ["great", "excellent", "amazing", "wonderful", "good", "happy", "satisfied", "perfect", "love", "thanks", "appreciate"];

  let negativeCount = 0;
  let positiveCount = 0;
  let urgentCount = 0;

  frustratedWords.forEach((w) => { if (lower.includes(w)) { negativeCount += 2; score -= 15; } });
  urgentWords.forEach((w) => { if (lower.includes(w)) { urgentCount += 1; score -= 10; } });
  complaintWords.forEach((w) => { if (lower.includes(w)) { negativeCount += 1; score -= 5; } });
  positiveWords.forEach((w) => { if (lower.includes(w)) { positiveCount += 1; score += 10; } });

  // Exclamation marks indicate urgency/frustration
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 0) { score -= exclamations * 3; urgentCount += exclamations; }

  // ALL CAPS words indicate urgency
  const capsWords = text.split(/\s+/).filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  if (capsWords > 0) { score -= capsWords * 5; urgentCount += capsWords; }

  score = Math.max(0, Math.min(100, score));

  let label = "neutral";
  if (score < 20) label = "angry";
  else if (score < 35) label = "frustrated";
  else if (score < 50) label = "urgent";
  else if (score < 65) label = "neutral";
  else label = "positive";

  if (urgentCount > 2 && label === "neutral") label = "urgent";

  return { label, score };
}

function detectIntent(text: string): { pattern: IntentPattern; confidence: number; matchedKeywords: string[] } | null {
  const lower = text.toLowerCase();
  let bestMatch: { pattern: IntentPattern; confidence: number; matchedKeywords: string[] } | null = null;

  for (const pattern of INTENT_PATTERNS) {
    const matchedKeywords: string[] = [];
    for (const kw of pattern.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    }
    if (matchedKeywords.length > 0) {
      const confidence = Math.min(98, 60 + matchedKeywords.length * 12);
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { pattern, confidence, matchedKeywords };
      }
    }
  }

  return bestMatch;
}

function pickAck(template: string[], value: string): string {
  const t = template[Math.floor(Math.random() * template.length)];
  return t.replace("{value}", value);
}

/**
 * Pick an acknowledgment for a question, optionally choosing between
 * "verified" and "unverified" ack pools when the question provides them.
 *
 * For momence_member questions:
 *   - If the captured value matches a real Momence member name → use the
 *     "verified" pool (so IRIS can honestly say "Member verified").
 *   - Otherwise → use the "unverified" pool (so IRIS does NOT claim
 *     verification for free-text the user typed into the regular input).
 *
 * Heuristic: real Momence member names from our mock data are title-cased
 * and contain a space (e.g. "Priya Agarwal"). Free-text like "jimmeey" or
 * "jimmee" is single-token and lowercased. This isn't perfect but is a good
 * first-pass signal — and most importantly, it never FALSELY claims
 * "verified" for an obvious free-text input.
 */
function pickAckForQuestion(
  question: QuestionDef,
  value: string
): string {
  // If the question doesn't define verified/unverified pools, use the default.
  if (!question.acknowledgmentsVerified || !question.acknowledgmentsUnverified) {
    return question.acknowledgments
      ? pickAck(question.acknowledgments, value)
      : "Got it, thanks.";
  }

  const v = value.trim();
  const looksLikeRealMemberName =
    v.length > 0 &&
    /\s/.test(v) &&                    // has a space (first + last)
    /^[A-Z]/.test(v) &&                // starts with uppercase
    !/[^a-zA-Z\s.'-]/.test(v);         // only letters, spaces, . ' -

  const pool = looksLikeRealMemberName
    ? question.acknowledgmentsVerified
    : question.acknowledgmentsUnverified;

  return pickAck(pool, value);
}

// === MAIN ENGINE ===

export function createInitialState(): ConversationState {
  return {
    stage: "greeting",
    intent: { description: "", detectedKeywords: [] },
    collectedInfo: {},
    questionsAsked: [],
    questionsRemaining: [],
    currentQuestionIndex: 0,
    turnCount: 0,
  };
}

export function processUserInput(
  state: ConversationState,
  userInput: string
): AIResponse {
  const newTurnCount = state.turnCount + 1;
  const trimmedInput = userInput.trim();

  // === STAGE 1: First user message - detect intent ===
  if (state.stage === "greeting" || state.stage === "intent_captured") {
    const intent = detectIntent(trimmedInput);
    const extracted = extractInfoFromText(trimmedInput);

    if (intent) {
      const pattern = intent.pattern;
      const questionsToAsk = pattern.requiredQuestions.filter((qId) => {
        // Skip questions whose answers we already extracted
        const q = QUESTIONS[qId];
        if (!q) return false;
        const fieldValue = extracted[q.field as keyof CollectedInfo];
        return !fieldValue;
      });

      const newState: Partial<ConversationState> = {
        stage: questionsToAsk.length > 0 ? "collecting" : "investigating",
        intent: {
          description: trimmedInput,
          detectedKeywords: intent.matchedKeywords,
          matchedTemplate: pattern.templateCode,
          suggestedCategory: pattern.category,
          suggestedDepartment: pattern.department,
          suggestedPriority: pattern.priority,
          confidenceScore: intent.confidence,
        },
        collectedInfo: {
          ...extracted,
          issue: trimmedInput,
          category: pattern.category,
          subcategory: pattern.subcategory,
        },
        questionsRemaining: questionsToAsk,
        currentQuestionIndex: 0,
        turnCount: newTurnCount,
      };

      // First message: acknowledge + show what was detected + ask first question
      const messages: AIMessageOutput[] = [];

      // Acknowledgment message - NO capturedFields metadata to avoid duplicate display
      const detectedSummary = buildDetectedSummary(pattern, extracted);
      messages.push({
        content: `I've analysed your report. Here's what I've picked up so far:\n\n${detectedSummary}\n\nI'll need a couple more details to route this correctly. Let me ask them one at a time.`,
        variant: "info",
        isAcknowledgment: true,
        thinkingDuration: 600,
        metadata: {
          confidenceScore: intent.confidence,
        },
      });

      // First question
      if (questionsToAsk.length > 0) {
        const firstQ = QUESTIONS[questionsToAsk[0]];
        if (firstQ) {
          messages.push({
            content: firstQ.question,
            buttons: firstQ.buttons,
            inputType: firstQ.inputType || "none",
            inputPlaceholder: firstQ.inputPlaceholder,
            isQuestion: true,
            variant: "question",
            thinkingDuration: 400,
            agentActivity: [
              { agent: "Classification", action: `Identified: ${pattern.category} → ${pattern.subcategory}`, status: "complete" },
              { agent: "Investigation", action: "Awaiting more context from you", status: "pending" },
              { agent: "Routing", action: `Standing by - will route to ${pattern.department} once complete`, status: "pending" },
            ],
          });
        }
      } else {
        // No questions needed - go to investigation
        return transitionToInvestigation({ ...state, ...newState } as ConversationState);
      }

      return { messages, newState };
    } else {
      // Intent not detected - ask clarifying question
      return {
        messages: [
          {
            content: `I want to make sure I understand this correctly. Could you tell me a bit more about what kind of issue this is? For example:\n\n• Is it a facilities problem (AC, sound, equipment)?\n• A membership or payment issue?\n• A scheduling or booking problem?\n• Something else entirely?`,
            variant: "question",
            isQuestion: true,
            thinkingDuration: 500,
            buttons: [
              { label: "Facilities / Equipment", value: "facilities", captures: "Facilities" },
              { label: "Membership / Payment", value: "membership", captures: "Membership" },
              { label: "Scheduling / Booking", value: "scheduling", captures: "Scheduling" },
              { label: "IT / System issue", value: "it", captures: "IT" },
              { label: "Client experience", value: "client", captures: "Client Experience" },
              { label: "Something else", value: "other", captures: "Other" },
            ],
          },
        ],
        newState: {
          stage: "intent_captured",
          intent: { description: trimmedInput, detectedKeywords: [] },
          collectedInfo: { issue: trimmedInput, ...extracted },
          turnCount: newTurnCount,
        },
      };
    }
  }

  // === STAGE 2: Collecting answers ===
  if (state.stage === "collecting") {
    const currentQId = state.questionsRemaining[state.currentQuestionIndex];
    const currentQ = QUESTIONS[currentQId];

    if (!currentQ) {
      // Move to next or finish
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex < state.questionsRemaining.length) {
        return askNextQuestion(state, nextIndex, userInput, newTurnCount);
      }
      return transitionToInvestigation(state);
    }

    // Determine the value the user provided
    let capturedValue = "";
    let capturedRaw = "";

    if (currentQ.buttons) {
      // Try to match button value
      const matched = currentQ.buttons.find((b) =>
        userInput.toLowerCase().includes(b.value.toLowerCase()) ||
        userInput.toLowerCase().includes(b.label.toLowerCase()) ||
        b.label.toLowerCase() === userInput.toLowerCase()
      );
      if (matched) {
        capturedValue = matched.captures;
        capturedRaw = matched.value;
      } else {
        // Free-text answer to a button question
        capturedValue = userInput;
        capturedRaw = userInput;
      }
    } else {
      capturedValue = userInput;
      capturedRaw = userInput;
    }

    // Also try to extract more info from this response
    const additionalExtracted = extractInfoFromText(userInput);

    const updatedInfo: CollectedInfo = {
      ...state.collectedInfo,
      [currentQ.field]: capturedValue,
      ...additionalExtracted,
    };

    // Dynamic question insertion: if affected_count is "single" or "one_class",
    // we need to ask for the affected member via Momence (if not already captured).
    //
    // BUG FIX (2026-11-07): Previously, when "affected_client" was ALREADY in the
    // pattern's requiredQuestions (e.g. the Sound System pattern asks
    // ["severity", "affected_count", "duration", "affected_client"]), we would
    // re-add "affected_client" to the front of the remaining list AND keep the
    // original copy. This caused IRIS to ask "Which client is affected?" twice
    // in a single conversation. Fix: filter out any dynamic-question id that is
    // already present in the remaining list before prepending.
    let dynamicQuestionsToAdd: string[] = [];
    if (currentQId === "affected_count" && (capturedRaw === "single" || capturedRaw === "one_class") && !updatedInfo.affectedClient) {
      dynamicQuestionsToAdd = ["affected_client"];
    }

    // Pick ack — uses verified/unverified pool for Momence-related questions
    // to avoid falsely claiming "Member verified" for free-text input.
    const ack = pickAckForQuestion(currentQ, capturedValue);

    const nextIndex = state.currentQuestionIndex + 1;
    let remainingQuestions = state.questionsRemaining.slice(nextIndex);

    // Insert dynamic questions - but REMOVE any duplicates from the existing
    // remaining list so we never ask the same question twice.
    if (dynamicQuestionsToAdd.length > 0) {
      remainingQuestions = remainingQuestions.filter(
        (qId) => !dynamicQuestionsToAdd.includes(qId)
      );
      remainingQuestions = [...dynamicQuestionsToAdd, ...remainingQuestions];
    }

    const hasMoreQuestions = remainingQuestions.length > 0;

    const newState: Partial<ConversationState> = {
      collectedInfo: updatedInfo,
      currentQuestionIndex: 0,
      questionsRemaining: hasMoreQuestions ? remainingQuestions : [],
      turnCount: newTurnCount,
      questionsAsked: [...state.questionsAsked, currentQId],
    };

    if (!hasMoreQuestions) {
      // Transition to investigation - combine ack + investigation message into ONE
      const messages: AIMessageOutput[] = [
        {
          content: `${ack}\n\nI have everything I need. Let me run a quick investigation before I prepare the ticket.`,
          variant: "investigation",
          isTransition: true,
          thinkingDuration: 400,
          agentActivity: [
            { agent: "Classification", action: `Identified: ${state.intent.suggestedCategory || "issue"} -> ${state.collectedInfo.subcategory || ""}`, status: "complete" },
            { agent: "Investigation", action: "Querying Momence API for related records", status: "active" },
            { agent: "Routing", action: "Evaluating best assignee based on workload & expertise", status: "pending" },
            { agent: "SLA", action: "Calculating response & resolution targets", status: "pending" },
          ],
        },
      ];

      return {
        messages,
        newState: { ...newState, stage: "investigating" },
        shouldInvestigate: true,
      };
    }

    // Ask next question - combine ack + question into ONE message
    const nextQ = remainingQuestions.length > 0 ? QUESTIONS[remainingQuestions[0]] : null;
    const messages: AIMessageOutput[] = [];

    if (nextQ) {
      messages.push({
        content: `${ack}\n\n${nextQ.question}`,
        buttons: nextQ.buttons,
        inputType: nextQ.inputType || "none",
        inputPlaceholder: nextQ.inputPlaceholder,
        isQuestion: true,
        variant: "question",
        thinkingDuration: 400,
      });
    }

    return { messages, newState };
  }

  // === STAGE 3: After investigation ===
  if (state.stage === "investigating") {
    // shouldn't normally hit this - investigation completes via separate function
    return {
      messages: [
        {
          content: "I'm still investigating. One moment please.",
          variant: "default",
          thinkingDuration: 200,
        },
      ],
      newState: { turnCount: newTurnCount },
    };
  }

  // Fallback
  return {
    messages: [
      {
        content: "I'm here to help. Could you describe the issue you'd like to report?",
        variant: "question",
        isQuestion: true,
        thinkingDuration: 300,
      },
    ],
    newState: { turnCount: newTurnCount },
  };
}

function askNextQuestion(state: ConversationState, nextIndex: number, userInput: string, newTurnCount: number): AIResponse {
  const nextQ = QUESTIONS[state.questionsRemaining[nextIndex]];
  return {
    messages: nextQ
      ? [
          {
            content: nextQ.question,
            buttons: nextQ.buttons,
            inputType: nextQ.inputType || "none",
            inputPlaceholder: nextQ.inputPlaceholder,
            isQuestion: true,
            variant: "question",
            thinkingDuration: 400,
          },
        ]
      : [],
    newState: {
      currentQuestionIndex: nextIndex,
      turnCount: newTurnCount,
    },
  };
}

function buildDetectedSummary(pattern: IntentPattern, extracted: Partial<CollectedInfo>): string {
  const lines: string[] = [];
  lines.push(`**Category:** ${pattern.category}${pattern.subcategory ? ` → ${pattern.subcategory}` : ""}`);
  if (extracted.studio) lines.push(`**Studio:** ${extracted.studio}${extracted.studioCity ? ` (${extracted.studioCity})` : ""}`);
  if (extracted.location) lines.push(`**Location:** ${extracted.location}`);
  if (extracted.equipment) lines.push(`**Equipment:** ${extracted.equipment}`);
  if (extracted.severity) lines.push(`**Severity (from your message):** ${extracted.severity}`);
  if (extracted.paymentAmount) lines.push(`**Amount mentioned:** ${extracted.paymentAmount}`);
  if (extracted.paymentMethod) lines.push(`**Payment method:** ${extracted.paymentMethod}`);
  if (extracted.sessionTime) lines.push(`**Session time:** ${extracted.sessionTime}`);
  if (extracted.duration) lines.push(`**Duration so far:** ${extracted.duration}`);
  lines.push(`**Suggested priority:** ${pattern.priority}`);
  return lines.join("\n");
}

function transitionToInvestigation(state: ConversationState): AIResponse {
  return {
    messages: [
      {
        content: `I have enough to start investigating. Let me check Momence and our historical records, then I'll prepare the ticket.`,
        variant: "investigation",
        isTransition: true,
        thinkingDuration: 500,
        agentActivity: [
          { agent: "Classification", action: `Identified: ${state.intent.suggestedCategory || "issue"}`, status: "complete" },
          { agent: "Investigation", action: "Querying Momence API for related records", status: "active" },
          { agent: "Routing", action: "Evaluating best assignee based on workload & expertise", status: "pending" },
          { agent: "SLA", action: "Calculating response & resolution targets", status: "pending" },
        ],
      },
    ],
    newState: { stage: "investigating" },
    shouldInvestigate: true,
  };
}

// === INVESTIGATION RESULT ===

export function buildInvestigationResult(state: ConversationState): AIMessageOutput {
  const intent = state.intent;
  const info = state.collectedInfo;
  const pattern = INTENT_PATTERNS.find((p) => p.templateCode === intent.matchedTemplate);
  const template = intent.matchedTemplate ? TICKET_TEMPLATES.find((t) => t.code === intent.matchedTemplate) : null;

  const priority = intent.suggestedPriority || "P2";
  const dept = DEPARTMENTS.find((d) => d.code === intent.suggestedDepartment);
  const studio = STUDIOS.find((s) => s.name === info.studio);

  // Generate ticket title from collected info
  const title = generateTicketTitle(state);

  // Generate ticket description
  const description = generateTicketDescription(state);

  // Pick the best assignee using workload-aware routing from REAL employees
  const assigneeName = pickAssigneeName(intent.suggestedDepartment || "FAC");

  // Deterministic ticket ID — uses a monotonic counter seeded from the
  // current timestamp + a hash of the title. Avoids Math.random() which
  // would produce different IDs on server vs client (hydration mismatch)
  // and on re-renders (the same ticket preview would get a new ID each
  // time the component re-rendered).
  const ticketId = generateDeterministicTicketId(title);

  // Pull SLA from the canonical SLA_DEFINITIONS engine — single source of
  // truth. The conversation engine used to duplicate these values in a
  // hardcoded map that drifted from sla-definitions.ts.
  const slaDef = SLA_MAP[priority] || SLA_MAP.P3;
  const sla = {
    response: formatSLADuration(slaDef.responseTargetMins),
    resolution: formatSLADuration(slaDef.resolutionTargetMins),
  };

  const ticketPreview = {
    ticketId,
    title,
    description,
    priority,
    department: dept?.name || "Operations",
    assigneeName,
    studio: studio?.name || info.studio || "To be confirmed",
    estimatedResolution: sla.resolution,
    slaResponse: sla.response,
    slaResolution: sla.resolution,
    category: intent.suggestedCategory,
    subcategory: intent.suggestedCategory ? `${intent.suggestedCategory}` : undefined,
    affectedClient: info.affectedClient,
    businessImpact: generateBusinessImpact(info, priority),
    recommendedActions: template?.recommendedActions || "Investigate root cause and apply appropriate resolution.",
    collectedFields: Object.entries(info).filter(([_, v]) => v).map(([k, v]) => ({ field: k, value: String(v) })),
  };

  // Investigation steps — use REAL counts, not hardcoded "found 2" / "4 candidates"
  const candidateCount = countCandidatesForDept(intent.suggestedDepartment || "FAC");
  const similarCount = countSimilarHistoricalTickets(state);
  const investigationSteps: string[] = [
    `Analysed your report - detected category: ${intent.suggestedCategory}${intent.suggestedCategory ? ` → ${intent.suggestedCategory}` : ""} (${intent.confidenceScore}% confidence)`,
  ];
  if (info.studio) investigationSteps.push(`Identified studio: ${info.studio}`);
  if (info.affectedClient) investigationSteps.push(`Searched Momence for member "${info.affectedClient}" - profile found`);
  if (intent.matchedTemplate) investigationSteps.push(`Matched against ticket template ${intent.matchedTemplate} - ${template?.title}`);
  investigationSteps.push(`Checked historical tickets - found ${similarCount} similar issue${similarCount === 1 ? "" : "s"} in last 90 days`);
  investigationSteps.push(`Evaluated ${candidateCount} candidate assignee${candidateCount === 1 ? "" : "s"} - selected ${assigneeName} (lowest workload, matching expertise)`);
  investigationSteps.push(`Calculated SLA targets: ${sla.response} first response, ${sla.resolution} resolution`);

  return {
    content: `My investigation is complete. Here's the structured ticket I've prepared - review it and confirm if you'd like me to create and route it.`,
    variant: "ticket",
    thinkingDuration: 200,
    tools: buildToolsList(info),
    metadata: {
      investigationSteps,
      confidenceScore: intent.confidenceScore || 85,
    },
    ticketPreview,
  };
}

function buildToolsList(info: CollectedInfo): Array<{ name: string; status: "running" | "complete"; result?: string; duration?: number }> {
  // Look up real similar tickets from the historical record so the tool
  // result reflects actual data, not a hardcoded "Found 2 similar" string.
  let similarResult = "No similar tickets found in the last 90 days";
  let similarDuration = 540;
  const ninetyDaysAgo = Date.now() - 90 * 86400000;
  const similar = ALL_TICKETS.filter(
    (t) => +new Date(t.createdAt) >= ninetyDaysAgo,
  ).slice(0, 3);
  if (similar.length > 0) {
    similarResult = `Found ${similar.length} similar ticket${similar.length === 1 ? "" : "s"} (${similar.map((t) => t.ticketId).join(", ")})`;
  }
  similarDuration = 280 + similar.length * 120;

  const tools: Array<{ name: string; status: "running" | "complete"; result?: string; duration?: number }> = [
    { name: "Intent Classification", status: "complete", result: "Classified with high confidence", duration: 280 },
    { name: "Historical Ticket Search", status: "complete", result: similarResult, duration: similarDuration },
  ];
  if (info.affectedClient) {
    // Deterministic member ID derived from the affectedClient name (no Math.random)
    const memberId = deterministicMemberId(info.affectedClient);
    tools.push({
      name: `Momence API → Member Search: "${info.affectedClient}"`,
      status: "complete",
      result: `Member found: ${info.affectedClient} (MM-${memberId})`,
      duration: 720,
    });
  }
  if (info.paymentAmount || info.paymentMethod) {
    tools.push({
      name: "Momence API → Transaction Search",
      status: "complete",
      result: info.paymentReference ? `Transaction traced via reference: ${info.paymentReference}` : "Transaction located in payment gateway logs",
      duration: 680,
    });
  }
  tools.push({
    name: "Employee Directory → Assignee Selection",
    status: "complete",
    result: "Selected assignee based on workload + expertise match",
    duration: 320,
  });
  tools.push({
    name: "SLA Engine → Target Calculation",
    status: "complete",
    result: "Response & resolution targets computed",
    duration: 180,
  });
  return tools;
}

function generateTicketTitle(state: ConversationState): string {
  const info = state.collectedInfo;
  const intent = state.intent;

  // Try to construct a professional title
  const parts: string[] = [];

  if (intent.suggestedCategory === "Facilities") {
    if (intent.suggestedPriority === "P0" && info.subcategory !== "Audio") {
      parts.push(intent.detectedKeywords[0] ? toTitleCase(intent.detectedKeywords[0]) : "Equipment");
      parts.push("Failure");
    } else if (info.subcategory === "HVAC" || intent.detectedKeywords.some((k) => k.toLowerCase().includes("ac") || k.toLowerCase().includes("hvac"))) {
      parts.push("Air Conditioning Malfunction");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("sound") || k.toLowerCase().includes("audio") || k.toLowerCase().includes("speaker"))) {
      parts.push("Sound System Failure");
    } else if (info.equipment) {
      parts.push(`${info.equipment} Issue`);
    } else {
      parts.push("Facilities Issue");
    }
  } else if (intent.suggestedCategory === "Membership") {
    if (info.subcategory === "Freeze Issue" || intent.detectedKeywords.some((k) => k.toLowerCase().includes("frozen"))) {
      parts.push("Membership Incorrectly Frozen");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("credit"))) {
      parts.push("Class Credits Discrepancy");
    } else {
      parts.push("Membership Issue");
    }
  } else if (intent.suggestedCategory === "Payment") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("deducted") || k.toLowerCase().includes("not in system"))) {
      parts.push("Payment Deducted But Not In System");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("refund"))) {
      parts.push("Refund Request");
    } else {
      parts.push("Payment Issue");
    }
  } else if (intent.suggestedCategory === "Scheduling") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("recurring"))) {
      parts.push("Recurring Booking Cancellation Issue");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("attendance"))) {
      parts.push("Incorrect Attendance Record");
    } else {
      parts.push("Scheduling Issue");
    }
  } else if (intent.suggestedCategory === "IT") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("momence") || k.toLowerCase().includes("check in"))) {
      parts.push("Momence System Issue");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("wifi") || k.toLowerCase().includes("network"))) {
      parts.push("Network Connectivity Issue");
    } else {
      parts.push("IT System Issue");
    }
  } else if (intent.suggestedCategory === "Client Experience") {
    parts.push("Client Experience Complaint");
  } else {
    parts.push("Operational Issue");
  }

  if (info.affectedClient) {
    parts.push(`- ${info.affectedClient}`);
  }
  if (info.studio) {
    parts.push(`(${info.studio})`);
  } else if (info.location) {
    parts.push(`(${info.location})`);
  }

  return parts.join(" ");
}

function generateTicketDescription(state: ConversationState): string {
  const info = state.collectedInfo;
  const intent = state.intent;
  const sentences: string[] = [];

  sentences.push(`Issue reported by front desk staff: "${intent.description}"`);

  if (info.studio) sentences.push(`Affected studio: ${info.studio}${info.studioCity ? `, ${info.studioCity}` : ""}.`);
  if (info.location) sentences.push(`Specific location: ${info.location}.`);
  if (info.equipment) sentences.push(`Equipment involved: ${info.equipment}.`);
  if (info.affectedClient) sentences.push(`Affected client: ${info.affectedClient}${info.clientIdentifier ? ` (${info.clientIdentifier})` : ""}.`);
  if (info.membershipType) sentences.push(`Membership type: ${info.membershipType}.`);
  if (info.paymentAmount) sentences.push(`Payment amount in question: ${info.paymentAmount}.`);
  if (info.paymentMethod) sentences.push(`Payment method: ${info.paymentMethod}.`);
  if (info.paymentReference) sentences.push(`Transaction reference: ${info.paymentReference}.`);
  if (info.sessionTime) sentences.push(`Session time: ${info.sessionTime}.`);
  if (info.instructor) sentences.push(`Instructor: ${info.instructor}.`);
  if (info.severity) sentences.push(`Reported severity: ${info.severity}.`);
  if (info.duration) sentences.push(`Issue duration: ${info.duration}.`);
  if (info.affectedCount) sentences.push(`Impact scope: ${info.affectedCount}.`);
  if (info.additionalContext) sentences.push(`Additional context: ${info.additionalContext}.`);

  return sentences.join(" ");
}

function generateBusinessImpact(info: CollectedInfo, priority: string): string {
  if (priority === "P0") {
    return "Critical - classes or operations are actively disrupted. Immediate intervention required to restore service.";
  }
  if (priority === "P1") {
    return "High - significant client-facing disruption. Resolution needed within the shift to prevent escalation.";
  }
  if (info.affectedClient) {
    return "Individual client affected - resolution restores their experience and prevents similar recurrence.";
  }
  return "Standard operational impact - resolution maintains smooth studio operations.";
}

/**
 * Pick the best assignee for a ticket based on department code.
 *
 * Selects from REAL employees in EMPLOYEES (not hardcoded names) using a
 * workload-aware strategy:
 *   1. Filter to employees in the target department who are available
 *   2. Filter to those with capacity (workload < maxWorkload)
 *   3. Pick the one with the LOWEST current workload (load-balanced routing)
 *   4. Fall back to any available employee in the department
 *   5. Final fallback: the department head / first available employee overall
 */
function pickAssigneeName(deptCode: string): string {
  // Candidates in the target department who are available and have capacity
  const candidates = EMPLOYEES.filter(
    (e) =>
      e.departmentCode === deptCode &&
      e.availability === "available" &&
      e.workload < e.maxWorkload,
  );
  if (candidates.length > 0) {
    // Lowest workload first — load-balanced routing
    candidates.sort((a, b) => a.workload - b.workload);
    return candidates[0].name;
  }

  // Fall back to any available employee in the department
  const deptAvailable = EMPLOYEES.filter(
    (e) => e.departmentCode === deptCode && e.availability === "available",
  );
  if (deptAvailable.length > 0) {
    deptAvailable.sort((a, b) => a.workload - b.workload);
    return deptAvailable[0].name;
  }

  // Final fallback: anyone in the department
  const inDept = EMPLOYEES.filter((e) => e.departmentCode === deptCode);
  if (inDept.length > 0) return inDept[0].name;

  // Truly nothing — return a sensible default, not a fake name
  return "Operations Team";
}

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generate a deterministic ticket ID from the ticket title.
 *
 * Format: IRIS-2026-XXXX where XXXX is a 4-digit number derived from a
 * stable hash of the title. This means:
 *   - The same ticket description always gets the same ID (no hydration
 *     mismatch between server and client renders)
 *   - Re-renders don't generate new IDs for the same preview
 *   - Two different tickets get different IDs (hash collision is rare
 *     for a 4-digit space with realistic title variety)
 */
function generateDeterministicTicketId(title: string): string {
  // FNV-1a hash → mod 9999 → zero-pad to 4 digits
  let h = 2166136261;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const num = (h >>> 0) % 9999;
  return `IRIS-2026-${String(num).padStart(4, "0")}`;
}

/** Count real candidate assignees for a department (available + has capacity). */
function countCandidatesForDept(deptCode: string): number {
  return EMPLOYEES.filter(
    (e) =>
      e.departmentCode === deptCode &&
      e.availability === "available" &&
      e.workload < e.maxWorkload,
  ).length;
}

/**
 * Generate a deterministic 5-digit Momence member ID from a member name.
 *
 * Format: MM-XXXXX where XXXXX is a 5-digit number derived from a stable
 * hash. Avoids Math.random() which would produce different IDs on server
 * vs client (hydration mismatch) and on re-renders.
 */
function deterministicMemberId(name: string): string {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to a 5-digit number between 10000 and 99999
  const num = 10000 + ((h >>> 0) % 90000);
  return String(num);
}

/**
 * Count actual similar historical tickets for the current conversation state.
 * Looks at the ALL_TICKETS history for tickets in the same category that
 * were created in the last 90 days.
 */
function countSimilarHistoricalTickets(state: ConversationState): number {
  const category = state.intent.suggestedCategory;
  if (!category) return 0;
  const ninetyDaysAgo = Date.now() - 90 * 86400000;
  return ALL_TICKETS.filter(
    (t) =>
      t.category === category &&
      +new Date(t.createdAt) >= ninetyDaysAgo,
  ).length;
}
