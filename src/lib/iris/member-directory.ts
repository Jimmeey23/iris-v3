/**
 * IRIS Member Directory - shared data source.
 *
 * Single source of truth for the Momence member roster used by:
 *   - `momence-search-field.tsx` (the AI assistant's member picker)
 *   - `intelligence.ts` → `buildMember360()` (Member 360 Lookup)
 *   - `command-palette.tsx` → `buildCommandIndex()` (⌘K palette search)
 *
 * In production these would come from the Momence API. For the demo we use
 * a static roster of 8 members with realistic Mumbai/Bengaluru distribution,
 * membership tiers, and credit balances.
 *
 * IMPORTANT: do not duplicate this list elsewhere. Import from here.
 */

export interface Member {
  /** Momence member ID, format MM-XXXXX */
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Membership tier label, e.g. "Annual Premium" */
  membership: string;
  /** Credit balance (for class packages; 0 for unlimited) */
  credits: number;
  /** ISO date the member joined */
  joinDate: string;
  /** City the member primarily attends in */
  city: "Mumbai" | "Bengaluru";
  /** Tags shown in the search dropdown */
  tags: string[];
  /** Avatar color token used by the MomenceSearchField dropdown */
  avatarColor: "violet" | "sky" | "emerald" | "amber" | "rose" | "indigo";
}

export const MEMBERS: Member[] = [
  { id: "MM-89342", name: "Priya Agarwal", phone: "+91 98765 43210", email: "priya.a@gmail.com", membership: "Annual Premium", credits: 12, joinDate: "2024-03-15", city: "Mumbai", tags: ["VIP", "Mumbai"], avatarColor: "violet" },
  { id: "MM-88214", name: "Rhea Malhotra", phone: "+91 99876 54321", email: "rhea.m@gmail.com", membership: "12-Class Package", credits: 4, joinDate: "2025-01-08", city: "Mumbai", tags: ["Mumbai"], avatarColor: "sky" },
  { id: "MM-91234", name: "Karan Singh", phone: "+91 80 12345 678", email: "karan.singh@gmail.com", membership: "5-Class Package", credits: 5, joinDate: "2025-06-20", city: "Bengaluru", tags: ["Bengaluru"], avatarColor: "emerald" },
  { id: "MM-85112", name: "Aditi Kapoor", phone: "+91 90123 45678", email: "aditi.k@gmail.com", membership: "Unlimited Monthly", credits: 0, joinDate: "2024-09-12", city: "Mumbai", tags: ["Frozen", "Mumbai"], avatarColor: "amber" },
  { id: "MM-89333", name: "Meera Reddy", phone: "+91 80 99887 766", email: "meera.r@gmail.com", membership: "Annual Premium", credits: 18, joinDate: "2024-02-01", city: "Bengaluru", tags: ["VIP", "Bengaluru"], avatarColor: "rose" },
  { id: "MM-88445", name: "Sneha Gupta", phone: "+91 98111 22233", email: "sneha.g@gmail.com", membership: "10-Class Package", credits: 7, joinDate: "2024-11-04", city: "Mumbai", tags: ["Mumbai"], avatarColor: "indigo" },
  { id: "MM-89556", name: "Rajiv Khanna", phone: "+91 98222 33344", email: "rajiv.k@gmail.com", membership: "Annual Premium", credits: 24, joinDate: "2023-12-18", city: "Mumbai", tags: ["VIP"], avatarColor: "violet" },
  { id: "MM-89678", name: "Anaya Desai", phone: "+91 98333 44455", email: "anaya.d@gmail.com", membership: "Drop-in", credits: 1, joinDate: "2025-09-22", city: "Mumbai", tags: ["New"], avatarColor: "sky" },
];

/** Map keyed by ID for O(1) lookups. */
export const MEMBER_MAP: Record<string, Member> = Object.fromEntries(
  MEMBERS.map((m) => [m.id, m]),
);

/** Find a member by case-insensitive name / email / phone / ID match. */
export function findMember(query: string): Member | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  return (
    MEMBERS.find(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.id.toLowerCase().includes(q),
    ) ?? null
  );
}
