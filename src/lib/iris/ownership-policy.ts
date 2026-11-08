/**
 * Who owns a new ticket. Physique 57's standing rules, applied before the generic
 * department/workload auto-assignment, in this order:
 *
 *  1. Accounts & payments            → Saachi + Mitali (Payments & Finance)
 *  2. Brand, expansion, licence, legal → Mitali (Management)
 *  3. Facilities, housekeeping, repair & maintenance, amenities, supplies
 *       Mumbai     → Zahur (L1), Saachi (L2, on escalation)
 *       Bengaluru  → Prathap (L1), Shifa (L2, on escalation)
 *  4. Anything else at Kwality House or Supreme HQ Bandra → the studio team:
 *       the reporter if they are on that team, otherwise round robin.
 *
 * Returns null when no rule applies (the generic auto-assignment then runs).
 * Pure: the caller supplies the round-robin position.
 */

export const PEOPLE = {
  saachi: "emp_saachi",
  mitali: "emp_mitali",
  zahur: "emp_zahur",
  prathap: "emp_prathap",
  shifa: "emp_shifa",
} as const;

export const STUDIO_TEAMS: Record<string, string[]> = {
  KH: ["emp_akshay", "emp_vahishta", "emp_tahira", "emp_sheetal"],
  SHQ: ["emp_shipra", "emp_nadiya", "emp_deesha", "emp_imran"],
};

const MUMBAI = new Set(["KH", "SHQ", "CTS", "PU"]);
const BENGALURU = new Set(["KHB", "CCB"]);

export type PolicyInput = {
  category: string;
  subcategory: string | null;
  title: string;
  description: string;
  studioCode: string | null;
  studioCity: string | null;
  reporterEmployeeId: string | null;
};

export type PolicyDecision = {
  rule: "accounts" | "brand_legal" | "facilities" | "studio_team";
  label: string;
  assigneeId: string;
  ownerIds: string[];
  departmentCodes: string[];
  /** Escalation level 1 goes here instead of the owner's reporting manager. */
  escalationL2: string | null;
  /** Set for the round-robin rule: the team key whose counter was used. */
  roundRobinKey?: string;
};

const has = (re: RegExp, ...parts: (string | null)[]) => re.test(parts.filter(Boolean).join(" "));

export function isAccounts(i: PolicyInput) {
  return (
    has(/\b(payment|payments|refund|refunds|billing|bill|invoice|invoices|charge[ds]?|double charged|overcharged|debit(ed)?|emi|gst|receipt|accounts?|finance|razorpay|stripe|upi|credit card|transaction|chargeback|pricing|price|fee|fees|discount)\b/i, i.subcategory, i.title) ||
    (i.category === "Pricing and Memberships" && has(/\b(refund|payment|billing|charge|invoice|price|pricing|fee|discount|emi)\b/i, i.subcategory, i.description))
  );
}

export function isBrandLegal(i: PolicyInput) {
  return (
    i.category === "Brand Feedback" ||
    has(/\b(brand|expansion|expand|franchis\w*|licen[cs]e\w*|legal|lawyer|contract|trademark|copyright|compliance|lease|partnership agreement)\b/i, i.subcategory, i.title) ||
    // The description only counts with an unambiguous term; "brand" or "contract" in passing doesn't.
    has(/\b(franchis\w*|licen[cs]e\w*|legal|lawyer|trademark|expansion)\b/i, i.description)
  );
}

export function isFacilities(i: PolicyInput) {
  return (
    i.category === "Repair and Maintenance" ||
    i.category === "Studio Amenities and Facilities" ||
    has(/\b(facilit\w*|housekeeping|cleaning|cleanliness|hygiene|repair\w*|maintenance|amenit\w*|supplies|toiletries|towels?|plumbing|leak\w*|electrical|ac|hvac|air.?condition\w*|lighting|locker repair|washroom|shower)\b/i, i.subcategory, i.title)
  );
}

function city(i: PolicyInput): "Mumbai" | "Bengaluru" | null {
  if (i.studioCode && BENGALURU.has(i.studioCode)) return "Bengaluru";
  if (i.studioCode && MUMBAI.has(i.studioCode)) return "Mumbai";
  if (i.studioCity && /beng|bangal/i.test(i.studioCity)) return "Bengaluru";
  if (i.studioCity && /mumbai/i.test(i.studioCity)) return "Mumbai";
  return null;
}

export function decideOwnership(i: PolicyInput, roundRobinIndex: (team: string) => number): PolicyDecision | null {
  if (isAccounts(i)) {
    return {
      rule: "accounts", label: "Accounts & payments → Saachi and Mitali",
      assigneeId: PEOPLE.saachi, ownerIds: [PEOPLE.saachi, PEOPLE.mitali], departmentCodes: ["PAY"], escalationL2: null,
    };
  }
  if (isBrandLegal(i)) {
    return {
      rule: "brand_legal", label: "Brand, expansion, licence & legal → Mitali",
      assigneeId: PEOPLE.mitali, ownerIds: [PEOPLE.mitali], departmentCodes: ["MGT"], escalationL2: null,
    };
  }
  if (isFacilities(i)) {
    const c = city(i);
    if (c === "Bengaluru") {
      return {
        rule: "facilities", label: "Facilities (Bengaluru) → Prathap, escalates to Shifa",
        assigneeId: PEOPLE.prathap, ownerIds: [PEOPLE.prathap], departmentCodes: ["FAC"], escalationL2: PEOPLE.shifa,
      };
    }
    // Mumbai, and any studio we can't place, default to the Mumbai facilities chain.
    return {
      rule: "facilities", label: "Facilities (Mumbai) → Zahur, escalates to Saachi",
      assigneeId: PEOPLE.zahur, ownerIds: [PEOPLE.zahur], departmentCodes: ["FAC"], escalationL2: PEOPLE.saachi,
    };
  }
  const team = i.studioCode ? STUDIO_TEAMS[i.studioCode] : undefined;
  if (team) {
    if (i.reporterEmployeeId && team.includes(i.reporterEmployeeId)) {
      return {
        rule: "studio_team", label: "Studio team → raised by a team member, assigned to them",
        assigneeId: i.reporterEmployeeId, ownerIds: [i.reporterEmployeeId], departmentCodes: [], escalationL2: null,
      };
    }
    const pick = team[((roundRobinIndex(i.studioCode!) % team.length) + team.length) % team.length];
    return {
      rule: "studio_team", label: "Studio team → round robin",
      assigneeId: pick, ownerIds: [pick], departmentCodes: [], escalationL2: null, roundRobinKey: i.studioCode!,
    };
  }
  return null;
}
