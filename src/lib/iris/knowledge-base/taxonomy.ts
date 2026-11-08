// IRIS Knowledge Base - the Category → Sub-category tree behind the Knowledge
// Base drill-down (Step 1: pick a category, Step 2: pick a sub-category, Step 3:
// pick a guide). Pure data, safe to import anywhere (client, server, unit tests).
//
// Category keys are the ticket categories stored on articles (CATEGORY_MAP in
// constants.ts), so existing and manager-edited documents keep matching.

export type KnowledgeAccent =
  | "violet"
  | "sky"
  | "pink"
  | "orange"
  | "rose"
  | "purple"
  | "teal"
  | "amber"
  | "cyan"
  | "indigo"
  | "red"
  | "emerald"
  | "slate";

export interface KnowledgeSubcategoryMeta {
  name: string;
  description: string;
}

export interface KnowledgeCategoryMeta {
  /** Category stored on articles (e.g. "Pricing and Memberships"). */
  key: string;
  /** Display label (e.g. "Pricing & Memberships"). */
  label: string;
  tagline: string;
  description: string;
  /** Tailwind colour family used for accents. */
  accent: KnowledgeAccent;
  /** Sub-categories in display order. */
  subcategories: KnowledgeSubcategoryMeta[];
}

export const KB_TAXONOMY: KnowledgeCategoryMeta[] = [
  {
    key: "Pricing and Memberships",
    label: "Pricing & Memberships",
    tagline: "Freezes, credits, payments, refunds & offers",
    description:
      "Freezes and plan changes, class credits and renewals, payment problems, refunds, promo codes, GST invoices and corporate memberships.",
    accent: "violet",
    subcategories: [
      { name: "Freezes, Upgrades & Transfers", description: "Medical and travel freezes, upgrades, downgrades, pack conversions and membership transfers." },
      { name: "Credits, Expiry & Renewals", description: "Missing or wrongly deducted credits, class-pack expiry and extensions, and auto-renewals." },
      { name: "Payments & Billing", description: "Double charges, stuck UPI payments, declined cards, debits after cancellation and chargebacks." },
      { name: "Refunds", description: "Processing refunds end to end, refunds a member hasn't received, and medical or relocation exceptions." },
      { name: "Offers, Invoices & Corporate", description: "Promo codes and offers, discount misuse, GST invoices and corporate memberships." },
    ],
  },
  {
    key: "Scheduling",
    label: "Scheduling",
    tagline: "Bookings, waitlists, cover & events",
    description:
      "Booking and check-in errors, waitlists and capacity, schedule changes and trainer cover, holiday planning, private classes and workshops.",
    accent: "sky",
    subcategories: [
      { name: "Bookings, Check-In & Fees", description: "Wrong-class bookings, PowerCycle bike selection, and no-show or late-cancel fees charged in error." },
      { name: "Waitlists & Capacity", description: "Fair waitlist handling, overbooking, and waitlist promotions members never heard about." },
      { name: "Schedule Changes & Cover", description: "Time and instructor requests, cancellations, emergency and planned cover, and holiday schedules." },
      { name: "Events & Private Bookings", description: "Private and hosted classes, workshops, registrations, capacity and payments." },
    ],
  },
  {
    key: "Class Experience",
    label: "Class Experience",
    tagline: "Etiquette, comfort, beginners & modifications",
    description:
      "What members experience in the room: late arrivals and etiquette, crowding, music and temperature, first-timers, safe modifications and hosted classes.",
    accent: "pink",
    subcategories: [
      { name: "Arrivals, Etiquette & Privacy", description: "Late arrivals, phones and filming in class, and hygiene or etiquette concerns between members." },
      { name: "Room, Music & Comfort", description: "Crowded classes, music volume and playlists, and rooms that feel too hot or too cold." },
      { name: "Beginners & Modifications", description: "First-timer onboarding, PowerCycle set-up, pre/post-natal members and injury modification plans." },
      { name: "Feedback & Hosted Classes", description: "Hosted-class proposals and member suggestions - logging them and closing the loop." },
    ],
  },
  {
    key: "Trainer Feedback",
    label: "Trainer Feedback",
    tagline: "Punctuality, coaching, conduct & recognition",
    description:
      "Feedback about instructors: lateness and timing, coaching quality and cueing, conduct and professionalism, and recognising great teaching.",
    accent: "orange",
    subcategories: [
      { name: "Punctuality & Timing", description: "Late trainers, classes cancelled because of lateness, late starts and overruns." },
      { name: "Coaching Quality & Cueing", description: "Performance concerns, unclear cueing, too few modifications and hands-on adjustment complaints." },
      { name: "Conduct & Professionalism", description: "Rude or inappropriate behaviour, phone use and disengaged teaching." },
      { name: "Recognition & Development", description: "Compliments and shout-outs, class observations and development plans." },
    ],
  },
  {
    key: "Customer Service and Communication",
    label: "Customer Service & Communication",
    tagline: "Enquiries, complaints, retention & privacy",
    description:
      "Front desk and phone enquiries, complaints and de-escalation, policy disputes, cancellation saves, VIP care and member data requests.",
    accent: "rose",
    subcategories: [
      { name: "Front Desk & Enquiries", description: "Walk-ins, phone calls and WhatsApp enquiries - response standards and follow-up." },
      { name: "Complaints & De-escalation", description: "Negative reviews, members chasing a reply, and calming an upset member at the desk." },
      { name: "Policies, Retention & VIPs", description: "Policy disputes and fee waivers, cancellation saves, detractor recovery and VIP care." },
      { name: "Member Data & Privacy", description: "Data deletion and opt-out requests, updating details and merging duplicate profiles." },
    ],
  },
  {
    key: "Brand Feedback",
    label: "Brand Feedback",
    tagline: "Comms, social, collateral & events",
    description:
      "Member communications, social media and creators, brand standards and collateral, festive campaigns, community events and the boutique.",
    accent: "purple",
    subcategories: [
      { name: "Member Communications", description: "Broadcasts and email campaigns, and correcting wrong information sent to members." },
      { name: "Social Media & Creators", description: "Influencer and creator collaborations, member content and repost permissions." },
      { name: "Brand Standards & Collateral", description: "Off-brand material, signage, print collateral and brand asset requests." },
      { name: "Campaigns, Events & Boutique", description: "Festive campaigns, community events and pop-ups, and boutique merchandise." },
    ],
  },
  {
    key: "Studio Amenities and Facilities",
    label: "Studio Amenities & Facilities",
    tagline: "Changing rooms, housekeeping, supplies & building",
    description:
      "Changing rooms, showers and steam, laundry, pests and cleaning standards, drinking water and consumables, and issues with the building and neighbours.",
    accent: "teal",
    subcategories: [
      { name: "Changing Rooms & Showers", description: "Changing-room hygiene, towels and showers, and the steam room." },
      { name: "Housekeeping & Hygiene", description: "Laundry and towel supply, pests, and the between-class reset." },
      { name: "Lounge, Pantry & Supplies", description: "Drinking water, toiletries and consumables." },
      { name: "Building & Neighbours", description: "Lift, water and parking disruptions from the building, and noise complaints." },
    ],
  },
  {
    key: "Repair and Maintenance",
    label: "Repair & Maintenance",
    tagline: "AC, audio, power, plumbing, bikes & equipment",
    description:
      "Fixing what breaks: AC and fresh air, mics and speakers, power and lighting, leaks and drains, PowerCycle bikes, barre, floors and Strength Lab equipment.",
    accent: "amber",
    subcategories: [
      { name: "AC & Ventilation", description: "AC faults, the fresh-air (TFA) unit, humidity, odour and stuffy rooms." },
      { name: "Audio & Microphones", description: "Studio mic, sound system and headset problems." },
      { name: "Electrical & Lighting", description: "Power cuts, lighting and dimmer faults, and inverter or UPS backup." },
      { name: "Plumbing & Water", description: "Leaks and seepage, blocked drains and overflows, hot water and shower pressure." },
      { name: "PowerCycle Bikes", description: "Stages SC3 bikes - consoles, power meters, pedals, seats, handlebars, resistance and noise." },
      { name: "Barre, Floor & Strength Equipment", description: "Barre, mirror and floor hazards, member-caused damage and Strength Lab equipment." },
    ],
  },
  {
    key: "Tech Issues",
    label: "Tech Issues",
    tagline: "Wi-Fi, devices, staff access & member app",
    description:
      "Studio internet and guest Wi-Fi, front desk devices and phone lines, staff accounts and access, and the member app, website and notifications.",
    accent: "cyan",
    subcategories: [
      { name: "Network & Wi-Fi", description: "Studio internet outages, failover and the guest Wi-Fi." },
      { name: "Front Desk Devices", description: "Check-in iPads, front desk computers, printers and the studio phone line." },
      { name: "Staff Accounts & Access", description: "Access for new joiners, lockouts and passwords, and revoking access for leavers." },
      { name: "Member App, Website & Notifications", description: "Member logins, the website booking widget, and automated reminders and receipts." },
    ],
  },
  {
    key: "Operating Systems",
    label: "Operating Systems",
    tagline: "Momence, POS & back-office tools",
    description:
      "The systems the studios run on: Momence bookings, search and reports, POS and payment gateways, and Zoho tools for rosters and attendance.",
    accent: "indigo",
    subcategories: [
      { name: "Momence Bookings & Schedule", description: "Check-in failures, bookings out of sync and errors in class listings." },
      { name: "Momence Outages, Search & Reports", description: "Running the desk while Momence is down, member search, and report accuracy." },
      { name: "POS & Payment Systems", description: "Card machines, settlement mismatches and payment gateway outages." },
      { name: "Zoho & Back-Office Tools", description: "Zoho Shift rosters and access, missed punches and attendance regularisation." },
    ],
  },
  {
    key: "Safety and Security",
    label: "Safety & Security",
    tagline: "Medical, fire, personal safety & CCTV",
    description:
      "Medical emergencies and first aid, fire and emergency readiness, harassment and personal safety, CCTV, access control and data security.",
    accent: "red",
    subcategories: [
      { name: "Medical & First Aid", description: "Member and staff injuries, medical emergencies, heat exhaustion and first-aid readiness." },
      { name: "Fire & Emergency Preparedness", description: "The studio emergency protocol, emergency closures, alarms, panic buttons and exits." },
      { name: "Personal Safety & Conduct", description: "Harassment reports, suspicious individuals, and threatening or abusive behaviour." },
      { name: "CCTV, Access & Data Security", description: "Phishing and data breaches, CCTV faults and footage requests, and unlocked studios." },
    ],
  },
  {
    key: "Theft and Lost Items",
    label: "Theft & Lost Items",
    tagline: "Lost & found, theft & valet",
    description: "Lost property from logging to disposal, locker problems and theft, boutique shrinkage, and valet and parking incidents.",
    accent: "emerald",
    subcategories: [
      { name: "Lost & Found", description: "Logging, storing, returning and disposing of lost property." },
      { name: "Theft & Lockers", description: "Locker faults and theft, theft from bags or changing rooms, and boutique shrinkage." },
      { name: "Valet & Parking", description: "Valet damage and delays, lost keys and parking disputes." },
    ],
  },
  {
    key: "Internal Operations & Admin",
    label: "Internal Operations & Admin",
    tagline: "Finance admin, vendors, compliance & handovers",
    description:
      "Back-office routines: cash closing, payouts and vendor payments, AMCs, stock and purchasing, licences and audits, staffing gaps and shift handovers.",
    accent: "slate",
    subcategories: [
      { name: "Cash, Payroll & Vendor Payments", description: "Daily cash closing, trainer payouts and vendor invoice disputes." },
      { name: "Vendors, Stock & Purchasing", description: "Vendor and AMC escalations, contract renewals, stock counts and capex approvals." },
      { name: "Compliance & Licences", description: "Licence and permit renewals, and audit or inspection findings." },
      { name: "Staffing & HR Admin", description: "Covering unplanned leave and getting new joiners ready on day one." },
      { name: "Daily Operations & Continuity", description: "Opening and closing checklists, shift handovers and monsoon disruption." },
    ],
  },
];

export const KB_CATEGORY_ORDER: string[] = KB_TAXONOMY.map((c) => c.key);

const BY_KEY = new Map(KB_TAXONOMY.map((c) => [c.key, c]));

export function kbCategoryMeta(category: string): KnowledgeCategoryMeta | undefined {
  return BY_KEY.get(category);
}

export function kbCategoryLabel(category: string): string {
  return BY_KEY.get(category)?.label ?? category;
}

/** Sub-category names of a category, in display order ([] for custom categories). */
export function kbSubcategoryNames(category: string): string[] {
  return BY_KEY.get(category)?.subcategories.map((s) => s.name) ?? [];
}

/** Display order of a sub-category within its category (unknown ones sort after). */
export function kbSubcategoryRank(category: string, subcategory: string): number {
  const i = BY_KEY.get(category)?.subcategories.findIndex((s) => s.name === subcategory) ?? -1;
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function kbSubcategoryDescription(category: string, subcategory: string): string | undefined {
  return BY_KEY.get(category)?.subcategories.find((s) => s.name === subcategory)?.description;
}
