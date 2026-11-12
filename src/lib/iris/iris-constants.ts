// IRIS - Constants extracted from iris-ai-v2 reference repository
// Real Physique 57 India operational data

export const IRIS_STUDIOS = [
  { id: "kwality", name: "Kwality House, Kemps Corner", city: "Mumbai", region: "Mumbai", momenceLocationId: 9030, address: "Kwality House, Kemps Corner, Mumbai" },
  { id: "supreme", name: "Supreme HQ, Bandra", city: "Mumbai", region: "Bandra", momenceLocationId: 29821, address: "Supreme HQ, Bandra, Mumbai" },
  { id: "kenkere", name: "Kenkere House, Bengaluru", city: "Bengaluru", region: "Bengaluru", momenceLocationId: null, address: "Kenkere House, Bengaluru" },
  { id: "courtside", name: "Courtside, Mumbai", city: "Mumbai", region: "Mumbai", momenceLocationId: 181416, address: "Courtside, Mumbai" },
  { id: "copper", name: "the Studio by Copper & Cloves, Bengaluru", city: "Bengaluru", region: "Bengaluru", momenceLocationId: null, address: "the Studio by Copper & Cloves, Bengaluru" },
] as const;

export const IRIS_DEPARTMENTS = [
  { id: "marketing", name: "Marketing", description: "Marketing routing queue" },
  { id: "operations", name: "Operations", description: "Operations routing queue" },
  { id: "sales-client-servicing", name: "Sales & Client Servicing", description: "Sales & Client Servicing routing queue" },
  { id: "training", name: "Training", description: "Training routing queue" },
  { id: "accounts", name: "Accounts", description: "Accounts & finance routing queue" },
  { id: "management", name: "Management", description: "Management & escalation queue" },
] as const;

export const CATEGORY_DEPARTMENT: Record<string, string> = {
  Scheduling: "training",
  "Class Experience": "training",
  "Trainer Feedback": "training",
  "Repair and Maintenance": "operations",
  "Studio Amenities and Facilities": "operations",
  "Operating Systems": "operations",
  "Tech Issues": "operations",
  "Pricing and Memberships": "accounts",
  "Customer Service and Communication": "sales-client-servicing",
  "Brand Feedback": "marketing",
  "Safety and Security": "management",
  "Theft and Lost Items": "operations",
  Miscellaneous: "operations",
  "Internal Operations & Admin": "operations",
};

// SLA Hours from reference repo (the one SLA table)
export const PRIORITY_SLA_HOURS: Record<"critical" | "high" | "medium" | "low", number> = {
  critical: 12,
  high: 16,
  medium: 48,
  low: 72,
};

// Smart routing subcategory tiers
export const CRITICAL_SUBS = new Set([
  "Client Harassment Reports", "Harassment Reports", "Emergency Exits Blocked",
  "Panic Button Malfunction", "Suspicious Individuals Inside Studio",
  "Data Breach Concerns", "Handling of Medical Emergencies", "Unlocked Doors",
  "Fire Drills Not Conducted", "Fire Safety Compliance", "Staff Theft",
  "Locker Theft", "Stolen Personal Items", "Personal Safety Concerns", "Trespassing Concerns",
]);

export const HIGH_SUBS = new Set([
  "AC & Ventilation Repairs", "Washroom & Plumbing Repairs",
  "PowerCycle Bike Malfunction & Repairs", "Resistance Bands & Small Equipment Repairs",
  "Strength Studio Equipment Repairs", "Audio, Mic & Headphone Malfunction",
  "Studio Lighting Malfunction & Repairs", "Electrical & Power Issues",
  "Mic Not Working", "Speakers Static Noise", "Studio Wi-Fi Not Working",
  "Booking System Errors", "Auto-Debit Incorrect Charges",
  "Incorrect Charges on Account", "Payment Processing Delays",
  "CCTV Malfunction", "Doors, Locks & Fixture Repairs", "Steam Room Not Working",
  "TFA Malfunction", "Last-minute Cancellations", "Class Capacity Issues",
  "Injury Prevention and Safety", "Unresolved Complaints",
  "Trainer Punctuality Issues", "Trainer Behaviour", "Class Capacity & Schedule Gaps",
  "Competitor Solicitation / Client Poaching",
  "Disruptive / Abusive Member Behaviour", "Cash Deposit Discrepancy / Reconciliation",
  "Client Payment Held by Staff / Not Deposited", "Glass, Window & Mirror Damage",
  "Trainer No-Show – Cover Arranged",
]);

export const MEDIUM_SUBS = new Set([
  "Music Volume Issues",
  "Package / Membership Transfer to Another Person", "Package / Membership Extension Request",
  "Medical / Injury Extension Request", "Complimentary / Bonus Classes Not Added",
  "Money Credit Conversion / Calculation", "Inter-City / Studio Membership Transfer (Relocation)",
  "Wall Seepage, Paint & Civil Work", "Flooring Damage & Replacement", "DG / Generator Service",
  "Damage Caused by Vendor / Third Party", "Building Lift, Access & Parking",
  "Trainer Reporting-Time Breach (arrived inside buffer)", "Tone & Clarity of Written Communication",
]);

export const STATUS_LABELS: Record<string, string> = {
  recorded: "Recorded",
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_on_member: "Waiting on member",
  waiting_on_vendor: "Waiting on vendor",
  resolved: "Resolved",
  closed: "Closed",
};

export {
  CLASS_FORMATS, STUDIO_AREAS, SYSTEMS, OCCURRED_OPTIONS, REPORTED_BY_OPTIONS, TRAINERS, MEMBERSHIPS,
  CATEGORY_MAP, CATEGORIES, STUDIO_LAYOUTS, AREA_ALIASES, studioAreasFor, getStudioRoomsForStudio,
  TRAINER_IMAGES, ASSOCIATE_IMAGES, getTrainerImage, getPersonImage,
  STAGES_SC3_PARTS, STAGES_SC3_TROUBLESHOOTING, CYCLE_INTAKE_QUESTIONS,
  EQUIPMENT_CATALOGUE, EQUIPMENT_TYPES, EQUIPMENT_CATEGORIES, EQUIPMENT_BY_TYPE, EQUIPMENT_CONDITIONS,
} from "./constants";
export type { StudioRoom } from "./constants";

// Integration catalogue
export const INTEGRATIONS = [
  { id: "momence", name: "Momence", category: "Operations", description: "Member, booking, payment, session data", status: "connected", type: "api" },
  { id: "fillout", name: "Fillout", category: "Forms", description: "Dynamic form builder & submission intake", status: "connected", type: "api" },
  { id: "responseio", name: "Response.io", category: "Communication", description: "WhatsApp & messaging automation", status: "connected", type: "api" },
  { id: "openai", name: "OpenAI", category: "AI", description: "GPT-4o & GPT-4o-mini models", status: "connected", type: "ai" },
  { id: "anthropic", name: "Anthropic", category: "AI", description: "Claude Sonnet & Haiku models", status: "connected", type: "ai" },
  { id: "razorpay", name: "Razorpay", category: "Payments", description: "Payment gateway for UPI/card transactions", status: "connected", type: "payment" },
  { id: "stripe", name: "Stripe", category: "Payments", description: "International payment processing", status: "connected", type: "payment" },
  { id: "gmail", name: "Gmail", category: "Email", description: "Email notifications & digest delivery", status: "connected", type: "email" },
  { id: "zoho", name: "Zoho Shift", category: "HR", description: "Staff shifts & HR management", status: "connected", type: "hr" },
  { id: "yellowmessenger", name: "Yellow Messenger", category: "Communication", description: "Chatbot & customer communication", status: "connected", type: "chat" },
];

// Smart routing function - determines priority from subcategory
export function inferPriority(subcategory: string): "critical" | "high" | "medium" | "low" {
  if (CRITICAL_SUBS.has(subcategory)) return "critical";
  if (HIGH_SUBS.has(subcategory)) return "high";
  if (MEDIUM_SUBS.has(subcategory)) return "medium";
  return "low";
}

// Smart routing - determines department from category
export function inferDepartment(category: string): string {
  return CATEGORY_DEPARTMENT[category] || "operations";
}

