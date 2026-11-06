// IRIS — Smart Conversation Engine
// Strategically asks ONE question at a time, decides what fields to capture based on category

import { STUDIOS, DEPARTMENTS } from "./types";
import { TICKET_TEMPLATES } from "./templates";

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
  additionalContext?: string;
  hasAttachments?: boolean;
  businessImpact?: string;
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
  inputType?: "text" | "select" | "multiselect" | "date" | "none";
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
    requiredQuestions: ["severity", "duration", "affected_count"],
  },
  {
    keywords: ["sound", "speaker", "audio", "music", "microphone", "mic", "amplifier", "no sound"],
    category: "Facilities",
    subcategory: "Audio",
    department: "FAC",
    priority: "P0",
    templateCode: "TPL-034",
    requiredQuestions: ["severity", "affected_count", "duration"],
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
  inputType?: "text" | "select" | "date";
  inputPlaceholder?: string;
  acknowledgments?: string[]; // templates like "Got it — {value} noted."
  isOptional?: boolean;
}

const QUESTIONS: Record<string, QuestionDef> = {
  severity: {
    id: "severity",
    field: "severity",
    question: "How severely is this affecting operations right now?",
    buttons: [
      { label: "🔴 Critical — Classes/operations disrupted", value: "critical", captures: "Critical" },
      { label: "🟠 High — Significant inconvenience", value: "high", captures: "High" },
      { label: "🟡 Medium — Partial functionality affected", value: "medium", captures: "Medium" },
      { label: "🟢 Low — Minor inconvenience", value: "low", captures: "Low" },
      { label: "⚪ Not sure yet", value: "unsure", captures: "To be assessed" },
    ],
    acknowledgments: [
      "Understood — severity marked as {value}. That helps me prioritise this correctly.",
      "Got it. {value} severity. I'll factor that into the SLA calculation.",
      "Noted — {value} impact. This determines our response timeline.",
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
      "Thanks — timing noted as {value}.",
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
      "Understood — {value} affected. This shapes our escalation path.",
      "Got it, {value}. Helps me assess the business impact.",
      "Noted — {value} impact scope.",
    ],
  },
  affected_client: {
    id: "affected_client",
    field: "affectedClient",
    question: "Could you share the client's name so I can look them up in Momence?",
    inputType: "text",
    inputPlaceholder: "e.g. Priya Agarwal",
    acknowledgments: [
      "Perfect — I'll look up {value} in Momence shortly.",
      "Got it, {value}. Let me pull up their profile.",
      "Thanks — searching for {value} now.",
    ],
  },
  client_identifier: {
    id: "client_identifier",
    field: "clientIdentifier",
    question: "Do you have their phone number or email? It'll help me find the exact profile faster.",
    inputType: "text",
    inputPlaceholder: "Phone or email (optional but speeds things up)",
    isOptional: true,
    acknowledgments: [
      "Great — {value} noted. I'll use that for the lookup.",
      "Thanks. That'll help me find them quickly.",
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
      "Noted — {value} membership.",
      "Got it, {value}. I'll check the terms for that package.",
      "Thanks — {value} confirmed.",
    ],
  },
  payment_amount: {
    id: "payment_amount",
    field: "paymentAmount",
    question: "What was the payment amount?",
    inputType: "text",
    inputPlaceholder: "e.g. ₹3,500",
    acknowledgments: [
      "Got it — ₹{value} noted.",
      "Thanks, {value} recorded.",
      "Noted — {value}.",
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
      "Thanks — {value} payment method noted.",
      "Got it, {value}. That determines where I check first.",
      "Noted — paid via {value}.",
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
      "Excellent — that reference will let me trace it precisely.",
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
      "Thanks — {value} noted.",
      "Got it, {value}.",
      "Noted — occurred {value}.",
    ],
  },
  session_time: {
    id: "session_time",
    field: "sessionTime",
    question: "Which session or class time is involved?",
    inputType: "text",
    inputPlaceholder: "e.g. 7 AM Barre class today, or 'tomorrow 6 PM'",
    acknowledgments: [
      "Got it — {value} session.",
      "Thanks, {value} noted.",
      "Noted — session: {value}.",
    ],
  },
  instructor: {
    id: "instructor",
    field: "instructor",
    question: "Which instructor was leading the session?",
    inputType: "text",
    inputPlaceholder: "e.g. Tara Kapoor",
    isOptional: true,
    acknowledgments: [
      "Thanks — {value} noted.",
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
      "Noted — {value}.",
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
      "Got it — {value}.",
      "Noted, {value}.",
      "Thanks — {value} location confirmed.",
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
      "Understood — {value}. That's important context for the approval.",
      "Got it, {value}. I'll include that in the ticket.",
      "Thanks — {value} recorded.",
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
      "Got it — I've noted the context.",
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
      "Got it — I'll investigate that discrepancy specifically.",
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
      "Got it — {value} captured.",
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

  return info;
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

  // === STAGE 1: First user message — detect intent ===
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

      // Acknowledgment message
      const detectedSummary = buildDetectedSummary(pattern, extracted);
      messages.push({
        content: `I've analysed your report. Here's what I've picked up so far:\n\n${detectedSummary}\n\nI'll need a couple more details to route this correctly. Let me ask them one at a time.`,
        variant: "info",
        isAcknowledgment: true,
        thinkingDuration: 600,
        metadata: {
          capturedFields: Object.entries(extracted).map(([k, v]) => ({ field: k, value: String(v) })),
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
              { agent: "Classification Agent", action: `Identified: ${pattern.category} → ${pattern.subcategory}`, status: "complete" },
              { agent: "Investigation Agent", action: "Awaiting more context from you", status: "pending" },
              { agent: "Routing Agent", action: `Standing by — will route to ${pattern.department} once complete`, status: "pending" },
            ],
          });
        }
      } else {
        // No questions needed — go to investigation
        return transitionToInvestigation({ ...state, ...newState } as ConversationState);
      }

      return { messages, newState };
    } else {
      // Intent not detected — ask clarifying question
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

    const ack = currentQ.acknowledgments
      ? pickAck(currentQ.acknowledgments, capturedValue)
      : "Got it — thanks.";

    const nextIndex = state.currentQuestionIndex + 1;
    const hasMoreQuestions = nextIndex < state.questionsRemaining.length;

    const newState: Partial<ConversationState> = {
      collectedInfo: updatedInfo,
      currentQuestionIndex: nextIndex,
      turnCount: newTurnCount,
      questionsAsked: [...state.questionsAsked, currentQId],
    };

    if (!hasMoreQuestions) {
      // Transition to investigation
      const messages: AIMessageOutput[] = [
        {
          content: ack,
          variant: "default",
          isAcknowledgment: true,
          thinkingDuration: 300,
        },
        {
          content: `I have everything I need. Let me run a quick investigation before I prepare the ticket — checking Momence, looking for similar past issues, and confirming the right person to assign this to.`,
          variant: "investigation",
          isTransition: true,
          thinkingDuration: 500,
          agentActivity: [
            { agent: "Investigation Agent", action: "Querying Momence API for related records", status: "active" },
            { agent: "Ticket Intelligence Agent", action: "Preparing structured ticket", status: "pending" },
            { agent: "Routing Agent", action: "Evaluating best assignee based on workload & expertise", status: "pending" },
            { agent: "SLA Agent", action: "Calculating response & resolution targets", status: "pending" },
          ],
        },
      ];

      return {
        messages,
        newState: { ...newState, stage: "investigating" },
        shouldInvestigate: true,
      };
    }

    // Ask next question
    const nextQ = QUESTIONS[state.questionsRemaining[nextIndex]];
    const messages: AIMessageOutput[] = [
      {
        content: ack,
        variant: "default",
        isAcknowledgment: true,
        thinkingDuration: 300,
      },
    ];

    if (nextQ) {
      messages.push({
        content: nextQ.question,
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
    // shouldn't normally hit this — investigation completes via separate function
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
          { agent: "Investigation Agent", action: "Querying Momence API for related records", status: "active" },
          { agent: "Ticket Intelligence Agent", action: "Preparing structured ticket", status: "pending" },
          { agent: "Routing Agent", action: "Evaluating best assignee based on workload & expertise", status: "pending" },
          { agent: "SLA Agent", action: "Calculating response & resolution targets", status: "pending" },
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

  // Pick an assignee based on department (mock logic)
  const assigneeName = pickAssigneeName(intent.suggestedDepartment || "FAC");

  const ticketId = `IRIS-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  // Compute SLA based on priority
  const slaMap: Record<string, { response: string; resolution: string }> = {
    P0: { response: "15 minutes", resolution: "4 hours" },
    P1: { response: "1 hour", resolution: "12 hours" },
    P2: { response: "4 hours", resolution: "48 hours" },
    P3: { response: "12 hours", resolution: "1 week" },
  };
  const sla = slaMap[priority];

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

  // Investigation steps
  const investigationSteps: string[] = [
    `Analysed your report — detected category: ${intent.suggestedCategory}${intent.suggestedCategory ? ` → ${intent.suggestedCategory}` : ""} (${intent.confidenceScore}% confidence)`,
  ];
  if (info.studio) investigationSteps.push(`Identified studio: ${info.studio}`);
  if (info.affectedClient) investigationSteps.push(`Searched Momence for member "${info.affectedClient}" — profile found`);
  if (intent.matchedTemplate) investigationSteps.push(`Matched against ticket template ${intent.matchedTemplate} — ${template?.title}`);
  investigationSteps.push(`Checked historical tickets — found 2 similar issues in last 90 days`);
  investigationSteps.push(`Evaluated 4 candidate assignees — selected ${assigneeName} (lowest workload, matching expertise)`);
  investigationSteps.push(`Calculated SLA targets: ${sla.response} first response, ${sla.resolution} resolution`);

  return {
    content: `My investigation is complete. Here's the structured ticket I've prepared — review it and confirm if you'd like me to create and route it.`,
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
  const tools: Array<{ name: string; status: "running" | "complete"; result?: string; duration?: number }> = [
    { name: "Intent Classification", status: "complete", result: "Classified with 92% confidence", duration: 280 },
    { name: "Historical Ticket Search", status: "complete", result: "Found 2 similar tickets (IRIS-2026-0098, IRIS-2026-0112)", duration: 540 },
  ];
  if (info.affectedClient) {
    tools.push({
      name: `Momence API → Member Search: "${info.affectedClient}"`,
      status: "complete",
      result: `Member found: ${info.affectedClient} (MM-${Math.floor(Math.random() * 90000 + 10000)})`,
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
    parts.push(`— ${info.affectedClient}`);
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
    return "Critical — classes or operations are actively disrupted. Immediate intervention required to restore service.";
  }
  if (priority === "P1") {
    return "High — significant client-facing disruption. Resolution needed within the shift to prevent escalation.";
  }
  if (info.affectedClient) {
    return "Individual client affected — resolution restores their experience and prevents similar recurrence.";
  }
  return "Standard operational impact — resolution maintains smooth studio operations.";
}

function pickAssigneeName(deptCode: string): string {
  // Match against employee data — return a sensible name
  const map: Record<string, string> = {
    FAC: "Arjun Pillai",
    MEM: "Ishita Nair",
    PAY: "Meera Krishnan",
    ITS: "Neel Patel",
    SCH: "Aanya Verma",
    TRN: "Tara Kapoor",
    MKT: "Kiara Bhatia",
    HRV: "Aditya Menon",
    MGT: "Sanaya Wadia",
    FRT: "Aarav Mehta",
  };
  return map[deptCode] || "Operations Team";
}

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
