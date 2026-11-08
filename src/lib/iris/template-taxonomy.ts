// IRIS — Template library taxonomy: the Category → Sub-category tree shown on the
// Templates page (Step 1: pick a category, Step 2: pick a sub-category, Step 3: pick
// a template). Pure data, safe to import anywhere (client, server, unit tests).

export interface TemplateCategoryMeta {
  /** Library category key stored on templates (e.g. "IT"). */
  key: string;
  /** Display label (e.g. "IT & Systems"). */
  label: string;
  tagline: string;
  description: string;
  /** Tailwind colour family used for accents. */
  accent: "violet" | "emerald" | "sky" | "amber" | "pink" | "orange" | "rose" | "indigo" | "red" | "cyan" | "teal" | "purple";
  /** Default department code for new templates in this category. */
  defaultDept: string;
  /** Sub-categories in display order, with a one-line description each. */
  subcategories: { name: string; description: string }[];
}

export const TEMPLATE_TAXONOMY: TemplateCategoryMeta[] = [
  {
    key: "Membership",
    label: "Membership",
    tagline: "Freezes, plan changes, credits & perks",
    description: "Freezes and pauses, upgrades and conversions, class credits, renewals, studio access, referrals and corporate plans.",
    accent: "violet",
    defaultDept: "MEM",
    subcategories: [
      { name: "Freezes & Pauses", description: "Freeze requests, wrongly applied freezes, medical pauses and early resumes." },
      { name: "Plan Changes & Upgrades", description: "Upgrades, downgrades, pack-to-unlimited conversions, reactivations and name transfers." },
      { name: "Credits & Expiry", description: "Missing or wrongly deducted class credits and package expiry extensions." },
      { name: "Renewals & Cancellations", description: "Cancellations, auto-renewal changes, failed renewals and renewal offers." },
      { name: "Transfers & Studio Access", description: "Studio transfers, cross-city visits and format-restricted plan access." },
      { name: "Perks, Referrals & Corporate", description: "Promo codes, guest passes, referrals, newcomer offers and corporate accounts." },
    ],
  },
  {
    key: "Payment",
    label: "Payment",
    tagline: "Failed payments, refunds, invoices & GST",
    description: "Missing UPI/card payments, refunds, duplicate or wrong charges, GST invoices, gateways, POS, cash and instalments.",
    accent: "emerald",
    defaultDept: "PAY",
    subcategories: [
      { name: "Failed & Missing Payments", description: "Money debited but not in Momence, failed renewals, retries and stuck UPI payments." },
      { name: "Refunds", description: "Refund requests, approvals, delays and policy exceptions." },
      { name: "Billing Errors & Disputes", description: "Duplicate or wrong charges, debits after cancellation and bank chargebacks." },
      { name: "Invoices & GST", description: "Tax invoices, GSTIN corrections, corporate billing and credit notes." },
      { name: "Gateways, POS & Payment Links", description: "Razorpay / Stripe errors, payment links and POS settlement mismatches." },
      { name: "Cash, Wallet & Instalments", description: "Cash reconciliation, wallet balances, cheques and monthly instalment plans." },
    ],
  },
  {
    key: "Scheduling",
    label: "Scheduling",
    tagline: "Bookings, waitlists, cover & events",
    description: "Check-in and booking errors, waitlists and capacity, schedule changes, trainer cover, attendance and private events.",
    accent: "sky",
    defaultDept: "SCH",
    subcategories: [
      { name: "Bookings & Check-In", description: "Check-in failures, wrong bookings, recurring bookings and bike selection." },
      { name: "Waitlists & Capacity", description: "Waitlist promotions, overbooked classes and demand for extra classes." },
      { name: "Cancellations & Schedule Changes", description: "Class cancellations, timing changes and holiday / festival schedules." },
      { name: "Instructor Cover & Substitutions", description: "No-shows, planned substitutes and substitution communication." },
      { name: "Attendance & Reminders", description: "Attendance corrections, missing reminders and no-show fees." },
      { name: "Events, Workshops & Private Bookings", description: "Workshops, hosted / private classes and corporate group sessions." },
    ],
  },
  {
    key: "Class & Trainer Experience",
    label: "Class & Trainer Experience",
    tagline: "Coaching, punctuality, intensity & vibe",
    description: "How classes are delivered: trainer punctuality, cueing and modifications, intensity, music and mic, conduct and recognition.",
    accent: "amber",
    defaultDept: "TRN",
    subcategories: [
      { name: "Punctuality & Class Timing", description: "Late trainers, late starts, overruns and rushed endings." },
      { name: "Coaching Quality & Cueing", description: "Cueing clarity, modifications, hands-on adjustments and corrections." },
      { name: "Intensity, Format & Programming", description: "Intensity mismatches, off-brand formats and new format requests." },
      { name: "Music, Mic & Atmosphere", description: "Music volume and playlist, trainer audibility and room temperature in class." },
      { name: "Trainer Conduct & Professionalism", description: "Behaviour, grooming, phone use and member engagement." },
      { name: "Recognition & Development", description: "Compliments, training needs and class observation feedback." },
    ],
  },
  {
    key: "Client Experience",
    label: "Client Experience",
    tagline: "Service recovery, policies & member care",
    description: "Member complaints and service recovery, policy disputes and waivers, accommodations, feedback, VIP care and member conduct.",
    accent: "pink",
    defaultDept: "SCS",
    subcategories: [
      { name: "Complaints & Service Recovery", description: "Class and desk complaints, unanswered queries and public reviews." },
      { name: "Policy Disputes & Waivers", description: "Late-cancel, late-entry and no-show disputes and fee waivers." },
      { name: "Special Needs & Accommodations", description: "Pre/post-natal clearance, injuries, medical conditions and access needs." },
      { name: "Feedback & Suggestions", description: "Compliments, improvement ideas and NPS detractor follow-ups." },
      { name: "VIP, Milestones & Retention", description: "VIP requests, birthdays, class milestones and at-risk members." },
      { name: "Member Conduct & Etiquette", description: "Behaviour issues, filming / privacy concerns and etiquette." },
    ],
  },
  {
    key: "Facilities",
    label: "Facilities",
    tagline: "AC, audio, plumbing, power & hygiene",
    description: "Studio cooling and fresh air, sound systems, showers and washrooms, electrical and lighting, housekeeping, lockers and amenities.",
    accent: "orange",
    defaultDept: "FAC",
    subcategories: [
      { name: "HVAC & Air Quality", description: "AC breakdowns, servicing, filters, TFA fresh air and humidity / odour." },
      { name: "Audio & Sound Systems", description: "Sound system failures, mic dropouts, speaker static and device pairing." },
      { name: "Plumbing, Showers & Washrooms", description: "Leaks and blockages, hot water and pressure, steam room and seepage." },
      { name: "Electrical & Lighting", description: "Power faults, lighting failures, backup power and ambient lighting." },
      { name: "Housekeeping & Hygiene", description: "Cleaning lapses, pest control, towels and changing-room hygiene." },
      { name: "Amenities, Lockers & Fixtures", description: "Lockers, water dispensers, signage, hair dryers and furniture." },
    ],
  },
  {
    key: "Equipment & Studio Assets",
    label: "Equipment & Studio Assets",
    tagline: "PowerCycle bikes, barres, weights & props",
    description: "Stages SC3 PowerCycle bikes, barres, mirrors and flooring, Strength Lab equipment, small props and asset purchases / servicing.",
    accent: "rose",
    defaultDept: "FAC",
    subcategories: [
      { name: "PowerCycle Bikes (Stages SC3)", description: "Console, SPM2 power meter, pedals, FitLoc / saddle, resistance and drivetrain." },
      { name: "Barre, Mirrors & Flooring", description: "Loose barres, cracked mirrors and damaged or slippery flooring." },
      { name: "Strength Lab Equipment", description: "Racks, cable machines, benches, dumbbells and kettlebells." },
      { name: "Props & Small Equipment", description: "Bands, balls, mats, straps and missing props." },
      { name: "Asset Requests & Servicing", description: "New equipment, capex approvals and preventive maintenance visits." },
    ],
  },
  {
    key: "IT",
    label: "IT & Systems",
    tagline: "Momence, Wi-Fi, hardware, app & access",
    description: "Momence outages and sync issues, network and Wi-Fi, front-desk hardware and POS, member app and website, staff access and data security.",
    accent: "indigo",
    defaultDept: "ITS",
    subcategories: [
      { name: "Momence Platform", description: "Outages, member search, booking sync, reports and class listings." },
      { name: "Network & Wi-Fi", description: "Studio internet, member Wi-Fi, VPN and ISP failover." },
      { name: "Front Desk Hardware & POS", description: "POS, laptops, printers, iPads and the studio phone line." },
      { name: "Member App & Website", description: "Mobile app bugs, website booking widget and member logins." },
      { name: "Staff Accounts & Software", description: "Account access, email, licences, joiner and leaver access." },
      { name: "Integrations, Data & Security", description: "Integration failures, backups, automated notifications and phishing." },
    ],
  },
  {
    key: "Safety & Security",
    label: "Safety & Security",
    tagline: "Injuries, emergencies, CCTV & theft",
    description: "In-class injuries and medical emergencies, fire preparedness, CCTV and access control, theft and lost items, harassment and personal safety.",
    accent: "red",
    defaultDept: "MGT",
    subcategories: [
      { name: "Injuries & Medical Emergencies", description: "Member and staff injuries, medical emergencies and first-aid readiness." },
      { name: "Fire & Emergency Preparedness", description: "Fire equipment, drills, blocked exits and alarm faults." },
      { name: "CCTV & Access Control", description: "Camera faults, footage requests, access issues and after-hours breaches." },
      { name: "Theft & Lost Items", description: "Lost property, locker theft, boutique shrinkage and valet incidents." },
      { name: "Harassment & Personal Safety", description: "Harassment reports, suspicious individuals and unverified walk-ins." },
    ],
  },
  {
    key: "Operations",
    label: "Operations",
    tagline: "Vendors, supplies, audits & continuity",
    description: "Vendors and AMCs, inventory and consumables, audits, compliance and insurance, closures and continuity, SOPs and reporting.",
    accent: "cyan",
    defaultDept: "OPS",
    subcategories: [
      { name: "Vendors & AMC", description: "Vendor service issues, AMC renewals and vendor invoice disputes." },
      { name: "Inventory & Supplies", description: "Restocking, toiletries, pantry and stock count discrepancies." },
      { name: "Audits, Compliance & Insurance", description: "Audits and findings, licences and permits, checklists and insurance claims." },
      { name: "Studio Closures & Continuity", description: "Emergency and planned closures, monsoon disruption and building services." },
      { name: "Process, SOPs & Reporting", description: "Process improvements, SOP changes, handovers and report requests." },
    ],
  },
  {
    key: "HR",
    label: "HR & People",
    tagline: "Leave, shifts, payroll & onboarding",
    description: "Leave and attendance, Zoho Shift rosters, payroll and trainer payouts, onboarding and exits, performance, grievances and uniforms.",
    accent: "teal",
    defaultDept: "HRV",
    subcategories: [
      { name: "Leave & Attendance", description: "Planned and unplanned leave and attendance regularisation." },
      { name: "Shifts & Rostering", description: "Schedule conflicts, shift swaps and Zoho Shift issues." },
      { name: "Payroll & Reimbursements", description: "Salary and class payout discrepancies and expense claims." },
      { name: "Onboarding & Exits", description: "New joiners, documentation and offboarding." },
      { name: "Performance, Training & Recognition", description: "Performance concerns, training requests, probation and recognition." },
      { name: "Employee Relations & Uniforms", description: "Grievances, workplace conflict and uniforms." },
    ],
  },
  {
    key: "Marketing",
    label: "Marketing",
    tagline: "Campaigns, content, comms & brand",
    description: "Campaigns and promo codes, social content and shoots, member communications, brand collateral and signage, partnerships, events and boutique.",
    accent: "purple",
    defaultDept: "MKT",
    subcategories: [
      { name: "Campaigns & Promotions", description: "Campaign set-up, offers, festive launches and promo code misuse." },
      { name: "Content & Social Media", description: "Content requests, in-studio shoots, social escalations and influencers." },
      { name: "Member Communications", description: "Emails, WhatsApp broadcasts, announcements and corrections." },
      { name: "Brand, Collateral & Signage", description: "Brand assets, print collateral, signage and guideline breaches." },
      { name: "Partnerships, Events & Boutique", description: "Collaborations, community events, merchandise and event leads." },
    ],
  },
];

export const TEMPLATE_CATEGORY_ORDER: string[] = TEMPLATE_TAXONOMY.map((c) => c.key);

const BY_KEY = new Map(TEMPLATE_TAXONOMY.map((c) => [c.key, c]));

export function templateCategoryMeta(category: string): TemplateCategoryMeta | undefined {
  return BY_KEY.get(category);
}

export function templateCategoryLabel(category: string): string {
  return BY_KEY.get(category)?.label ?? category;
}

/** Display order of a sub-category within its category (unknown ones sort after, alphabetically). */
export function subcategoryRank(category: string, subcategory: string): number {
  const i = BY_KEY.get(category)?.subcategories.findIndex((s) => s.name === subcategory) ?? -1;
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function subcategoryDescription(category: string, subcategory: string): string | undefined {
  return BY_KEY.get(category)?.subcategories.find((s) => s.name === subcategory)?.description;
}
