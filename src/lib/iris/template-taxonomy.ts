// IRIS - Template library taxonomy: the Category → Sub-category tree shown on the
// Templates page (Step 1: pick a category, Step 2: pick a sub-category, Step 3: pick
// a template). Pure data, safe to import anywhere (client, server, unit tests).

import { CATEGORY_MAP } from "./constants";

export interface TemplateCategoryMeta {
  /** IRIS issue category (a CATEGORY_MAP key). */
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

/**
 * The Templates page follows the IRIS issue taxonomy (CATEGORY_MAP): the same categories and
 * sub-categories tickets are filed, filtered and reported under. Sub-category order is
 * CATEGORY_MAP's.
 */
const CATEGORY_META: Record<string, Omit<TemplateCategoryMeta, "key" | "label" | "subcategories">> = {
  Scheduling: { tagline: "Class times, bookings & waitlists", description: "Class timings, booking and waitlist problems, cancellations, substitutions and schedule requests.", accent: "sky", defaultDept: "SCH" },
  "Class Experience": { tagline: "What happened in the class", description: "Class quality, music, intensity, crowding, room conditions and anything that shaped a member's session.", accent: "violet", defaultDept: "TRN" },
  "Trainer Feedback": { tagline: "Praise and concerns about trainers", description: "Feedback on a trainer's cueing, punctuality, conduct, attention and knowledge.", accent: "indigo", defaultDept: "TRN" },
  "Repair and Maintenance": { tagline: "Faults, breakdowns & repairs", description: "AC, plumbing, lighting, audio, bikes and equipment faults that need a fix or a vendor visit.", accent: "orange", defaultDept: "FAC" },
  "Studio Amenities and Facilities": { tagline: "Showers, lockers, supplies & cleanliness", description: "Changing rooms, lockers, toiletries, towels, water, cleanliness and studio comfort.", accent: "teal", defaultDept: "FAC" },
  "Operating Systems": { tagline: "Momence, check-in & studio systems", description: "Problems with Momence, check-in, payment gateways and the systems staff use every day.", accent: "cyan", defaultDept: "ITS" },
  "Tech Issues": { tagline: "App, website & payment glitches", description: "Member-facing app, website, notification, booking and charge problems.", accent: "purple", defaultDept: "ITS" },
  "Pricing and Memberships": { tagline: "Plans, freezes, renewals & pricing", description: "Membership changes and flexibility, freezes, expiry, renewals, offers and pricing questions.", accent: "emerald", defaultDept: "MEM" },
  "Customer Service and Communication": { tagline: "How members were looked after", description: "Front desk service, response times, follow-ups and how the studio communicated.", accent: "pink", defaultDept: "SCS" },
  "Brand Feedback": { tagline: "What members say about Physique 57", description: "Feedback on the brand, campaigns, social media, merchandise and studio look and feel.", accent: "amber", defaultDept: "MKT" },
  "Safety and Security": { tagline: "Injuries, incidents & safety risks", description: "Injuries, accidents, safety hazards, security concerns and emergency handling.", accent: "red", defaultDept: "MGT" },
  "Theft and Lost Items": { tagline: "Lost, found & stolen property", description: "Items lost or found at the studio, suspected theft and lost-and-found handling.", accent: "rose", defaultDept: "OPS" },
  Miscellaneous: { tagline: "Everything else", description: "Requests and issues that don't fit another category.", accent: "sky", defaultDept: "OPS" },
  "Internal Operations & Admin": { tagline: "Staff, rosters & admin", description: "Internal requests: rosters, staffing, admin tasks and process changes.", accent: "indigo", defaultDept: "OPS" },
};

export const TEMPLATE_TAXONOMY: TemplateCategoryMeta[] = Object.entries(CATEGORY_MAP).map(([key, subs]) => ({
  key,
  label: key,
  ...(CATEGORY_META[key] ?? { tagline: "", description: "", accent: "sky" as const, defaultDept: "OPS" }),
  subcategories: subs.map((name) => ({ name, description: "" })),
}));

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
  return BY_KEY.get(category)?.subcategories.find((s) => s.name === subcategory)?.description || undefined;
}
