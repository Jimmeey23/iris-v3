// IRIS — Constants extracted from iris-ai-v2 reference repository
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
]);

export const MEDIUM_SUBS = new Set(["Music Volume Issues"]);

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

export const CLASS_FORMATS = [
  "Studio Hosted Class", "Studio FIT", "Studio Back Body Blaze", "Studio Barre 57",
  "Studio Mat 57", "Studio Trainer's Choice", "Studio Cardio Barre Express", "Studio Amped Up!",
  "Studio HIIT", "Studio Foundations", "Studio SWEAT In 30", "Studio Cardio Barre Plus",
  "Studio Barre 57 Express", "Studio Cardio Barre", "Studio Back Body Blaze Express",
  "Studio Recovery", "Studio Pre/Post Natal", "Studio Mat 57 Express", "Studio PowerCycle",
  "Studio PowerCycle Express", "Studio Strength Lab (Full Body)", "Studio Strength Lab (Pull)",
  "Studio Strength Lab (Push)", "Studio Strength Lab",
] as const;

export const STUDIO_AREAS = [
  "Main studio floor", "Reception / lobby", "Locker room", "Showers / washroom",
  "Member lounge", "Boutique", "Parking / valet", "Back office", "Staircase / corridor",
  "Cycle studio", "Strength Lab floor", "Studio 1", "Studio 2", "Strength Studio",
  "PowerCycle Studio", "His Space", "Her Space", "GUEST WASHROOM", "Brain Cell", "Pantry",
  "Lockers & Changing", "Washrooms", "Washroom & Changing", "Strength Lab", "Barre Studio", "Front Desk",
] as const;

export const SYSTEMS = [
  "Momence", "POS / card machine", "Wi-Fi / router", "Front desk iPad",
  "Website / mobile app", "Payment gateway (Stripe / Razorpay)", "Audio / mic system",
  "CCTV / surveillance", "Access control / door lock", "Cash counting machine",
  "Yellow Messenger", "Other system",
] as const;

export const OCCURRED_OPTIONS = [
  "Just now", "Earlier today", "Yesterday", "Earlier this week", "Last week", "Ongoing / recurring",
] as const;

export const REPORTED_BY_OPTIONS = [
  "I noticed this myself", "A member told me about it",
  "A colleague flagged it to me", "Raised during a walkthrough / audit",
] as const;

export const TRAINERS = [
  "Anisha Shah", "Anmol Sharma", "Atulan Purohit", "Bret Saldanha", "Cauveri Vikrant",
  "Chaitanya Nahar", "Kajol Kanchan", "Karan Bhatia", "Karanvir Bhatia", "Mrigakshi Jaiswal",
  "Pranjali Jain", "Pushyank Nahar", "Raunak Khemuka", "Reshma Sharma", "Richard D'Costa",
  "Rohan Dahima", "Shruti Kulkarni", "Siddhartha Kusuma", "Simonelle De Vitre", "Vivaran Dhasmana",
] as const;

export const MEMBERSHIPS = [
  "Barre 1 month Unlimited", "Barre 2 week Unlimited", "Barre 3 months Unlimited",
  "Barre 6 month Unlimited", "Barre Annual Membership", "Newcomers 2 For 1",
  "powerCycle 1 month Unlimited", "powerCycle 2 week Unlimited", "powerCycle 3 months Unlimited",
  "powerCycle 6 months Unlimited", "powerCycle Annual Membership",
  "Strength Lab 1 month Unlimited", "Strength Lab 2 week Unlimited", "Strength Lab 3 months Unlimited",
  "Strength Lab 6 months Unlimited", "Strength Lab Annual Membership",
  "Studio 1 Month Unlimited Membership", "Studio 10 Single Class Pack", "Studio 12 Class Package",
  "Studio 2 Week Unlimited Membership", "Studio 20 Single Class Pack",
  "Studio 3 Month U/L Monthly Installment", "Studio 3 Month Unlimited Membership",
  "Studio 30 Single Class Pack", "Studio 4 Class Package", "Studio 6 Month Unlimited Membership",
  "Studio 8 Class Package", "Studio Annual Membership - Monthly Intsallment",
  "Studio Annual Unlimited Membership", "Studio Extended 10 Single Class Pack",
  "Studio Happy Hour Private", "Studio Newcomers 2 Week Unlimited Membership",
  "Studio Private Class", "Studio Private Class X 10", "Studio Single Class",
  "Summer Bootcamp - Studio 6 Week Unlimited", "Virtual Private Class", "Virtual Private Class X 10",
] as const;

// Categories with subcategories
export const CATEGORY_MAP: Record<string, string[]> = {
  Scheduling: [
    "Time Change", "Level Change", "Additional Classes", "Trainer Preferences", "Class Capacity Issues",
    "Waitlist Concerns", "Studio Timings", "Session Length", "Cancellation Policy", "Booking Restrictions",
    "Class Substitutions", "Trainer Substitutions", "Last-minute Cancellations", "Late Arrival Policy",
    "Special Request Accommodations", "Holiday and Festival Class Planning",
    "Class Capacity & Schedule Gaps", "Class Schedule Delay / Internal Follow-up",
  ],
  "Class Experience": [
    "Bad Odour", "Audio Issues", "Studio Temperature Too Hot/Cold", "Overcrowding in Class",
    "Class Flow and Pacing", "Modifications in Routine", "Engagement with Clients",
    "Hands-on Adjustments", "Demonstration and Visual Cues", "Knowledge and Competence",
    "Brand Language Usage", "Grooming and Appearance", "Class Format Satisfaction",
    "Instructor Energy and Motivation", "Member Injury During Class",
    "Physical Discomfort During Class (cramping / dizziness)",
  ],
  "Trainer Feedback": [
    "Trainer Forgot Names", "Class Intensity Too High/Low", "Trainer Hygiene",
    "Trainer Punctuality Issues", "Trainer Behaviour", "Pre and Post-Class Outreach",
    "Trainer Availability", "Feedback Handling", "Emergency Preparedness",
    "Injury Prevention and Safety", "Trainer No-Show / Late Arrival",
  ],
  "Repair and Maintenance": [
    "PowerCycle Bike Malfunction & Repairs", "Studio Lighting Malfunction & Repairs",
    "Resistance Bands & Small Equipment Repairs", "Strength Studio Equipment Repairs",
    "Audio, Mic & Headphone Malfunction", "Housekeeping & Cleaning Issues",
    "Washroom & Plumbing Repairs", "AC & Ventilation Repairs", "Electrical & Power Issues",
    "Doors, Locks & Fixture Repairs", "General Studio Repairs & Maintenance", "TFA Malfunction",
    "Pest Control Needed", "Fire Safety Compliance", "Water Dispenser Issues",
    "Vendor / AMC Management", "Attendance / Check-in Discrepancy",
  ],
  "Studio Amenities and Facilities": [
    "Studio Odour and Aroma", "Cleanliness and Hygiene", "Ventilation Poor", "Air Quality Poor",
    "Valet Issues", "Locker Availability", "Shower Water Pressure", "Steam Room Not Working",
    "Boutique Availability Issues", "Wi-Fi Slow", "Lost and Found Disorganization",
    "Availability of Gym Accessories", "Member Lounge Cleanliness",
  ],
  "Operating Systems": [
    "Moments Notice", "Stripe and Razorpay", "Yellow Messenger", "Website Glitches",
    "Router Connectivity", "iPad Functionality", "Cash Counting Machine Issues",
    "POS System Malfunctions", "CRM System Errors", "Data Security Issues",
    "Technical Assistance", "System Delays", "Software Bugs",
  ],
  "Tech Issues": [
    "Laptops Not Functioning", "Speakers Static Noise", "Mic Not Working", "Phones Not Working",
    "App Performance Bugs", "Booking System Errors", "Password and Login Issues",
    "Payment Processing Delays", "Auto-Debit Incorrect Charges", "Incorrect Charges on Account",
    "Camera Surveillance Issues", "Studio Wi-Fi Not Working",
  ],
  "Pricing and Memberships": [
    "Price Transparency", "Membership Flexibility", "Discounts and Offers Confusion",
    "Refund and Cancellation Policy Issue", "Auto-Renewal Concerns", "Membership Upgrade/Downgrade",
    "Membership Pause and Freeze Policy", "Policy Non-Compliance / Unauthorised Refunds",
  ],
  "Customer Service and Communication": [
    "Delay in Response", "Unresolved Complaints", "Front Desk Attitude", "Miscommunication on Offers",
    "Response Time to Queries", "Handling of Complaints", "Compensation for Service Issues",
    "Competitor Solicitation / Client Poaching", "Lead Management / Sales Tracking",
  ],
  "Brand Feedback": [
    "Hosted Class Feedback", "Brand Positioning", "Brand Identity Consistency",
    "Marketing Message Accuracy", "Social Media Engagement", "Merchandise Quality",
    "Marketing Collateral Production & Review", "Partnership / Collab Approval",
  ],
  "Safety and Security": [
    "Emergency Exits Blocked", "Panic Button Malfunction", "Unlocked Doors", "CCTV Malfunction",
    "Client Harassment Reports", "Fire Drills Not Conducted", "Suspicious Individuals Inside Studio",
    "Trespassing Concerns", "Personal Safety Concerns", "Harassment Reports",
    "Data Breach Concerns", "Handling of Medical Emergencies", "Staff Theft", "Locker Theft",
    "Stolen Personal Items",
  ],
  "Theft and Lost Items": [
    "Locker Theft", "Stolen Personal Items", "Misplaced Valuables", "Items Left Behind by Clients",
    "Staff Theft", "Reporting Stolen Items", "Theft Prevention Measures",
  ],
  Miscellaneous: [
    "Music Volume Issues", "Studio Decor and Ambience", "Noise Complaints from Neighbors",
    "Temperature Control Inconsistency", "Overcrowding in Lobby",
  ],
  "Internal Operations & Admin": [
    "Internal Operations Memo / Escalation", "SOP & Policy Governance (issue, version, publish)",
    "Quality Assurance Audit / Checklist Sign-off", "Handover / Shift Reporting Gap",
    "Internal Communication Gap / Workflow Approval", "Business Intelligence & Report Request",
  ],
};

export const CATEGORIES = Object.keys(CATEGORY_MAP);

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

// Smart routing function — determines priority from subcategory
export function inferPriority(subcategory: string): "critical" | "high" | "medium" | "low" {
  if (CRITICAL_SUBS.has(subcategory)) return "critical";
  if (HIGH_SUBS.has(subcategory)) return "high";
  if (MEDIUM_SUBS.has(subcategory)) return "medium";
  return "low";
}

// Smart routing — determines department from category
export function inferDepartment(category: string): string {
  return CATEGORY_DEPARTMENT[category] || "operations";
}

// Studio layouts with room capacities
export type StudioRoom = {
  name: string;
  capacity?: number;
  category: "studio" | "washroom" | "workspace" | "common";
  description: string;
};

export const STUDIO_LAYOUTS: Record<string, { studioName: string; rooms: StudioRoom[] }> = {
  kwality: {
    studioName: "Kwality House, Kemps Corner",
    rooms: [
      { name: "Studio 1", capacity: 22, category: "studio", description: "Studio 1 (capacity: 22 pax)" },
      { name: "Studio 2", capacity: 13, category: "studio", description: "Studio 2 (capacity: 13 pax)" },
      { name: "Strength Studio", capacity: 7, category: "studio", description: "Strength Studio (capacity: 7 pax)" },
      { name: "PowerCycle Studio", capacity: 10, category: "studio", description: "PowerCycle Studio (capacity: 10 pax)" },
      { name: "His Space", category: "washroom", description: "His Space (men's washroom & changing)" },
      { name: "Her Space", category: "washroom", description: "Her Space (women's washroom & changing)" },
      { name: "Brain Cell", category: "workspace", description: "Brain Cell (office space)" },
      { name: "Pantry", category: "workspace", description: "Pantry (staff kitchen)" },
      { name: "Lobby / Reception", category: "common", description: "Lobby & Reception desk" },
    ],
  },
  supreme: {
    studioName: "Supreme HQ, Bandra",
    rooms: [
      { name: "Strength Lab", capacity: 10, category: "studio", description: "Strength Lab (capacity: 10 pax)" },
      { name: "PowerCycle Studio", capacity: 13, category: "studio", description: "PowerCycle Studio (capacity: 13 pax)" },
      { name: "Barre Studio", capacity: 22, category: "studio", description: "Barre Studio (capacity: 22 pax)" },
      { name: "Brain Cell", category: "workspace", description: "Brain Cell (office space)" },
      { name: "Her Space", category: "washroom", description: "Her Space (women's washroom & changing)" },
      { name: "His Space", category: "washroom", description: "His Space (men's washroom & changing)" },
      { name: "Front Desk", category: "common", description: "Front desk & reception" },
      { name: "Pantry", category: "workspace", description: "Pantry (staff kitchen)" },
      { name: "Boutique", category: "common", description: "Retail boutique" },
    ],
  },
  kenkere: {
    studioName: "Kenkere House, Bengaluru",
    rooms: [
      { name: "Studio 1", capacity: 13, category: "studio", description: "Studio 1 (capacity: 13 pax)" },
      { name: "Studio 2", capacity: 13, category: "studio", description: "Studio 2 (capacity: 13 pax)" },
      { name: "Lobby / Reception", category: "common", description: "Lobby & Reception desk" },
      { name: "Washroom & Changing", category: "washroom", description: "Washrooms & changing area" },
    ],
  },
  courtside: {
    studioName: "Courtside, Mumbai",
    rooms: [
      { name: "Main Studio Floor", category: "studio", description: "Main studio floor" },
      { name: "Reception / Lobby", category: "common", description: "Reception & check-in" },
      { name: "Member Lounge", category: "common", description: "Member lounge" },
    ],
  },
  copper: {
    studioName: "the Studio by Copper & Cloves, Bengaluru",
    rooms: [
      { name: "Main Studio Floor", category: "studio", description: "Main studio floor" },
      { name: "Reception", category: "common", description: "Reception" },
      { name: "Changing Area", category: "washroom", description: "Changing area & washroom" },
    ],
  },
};
