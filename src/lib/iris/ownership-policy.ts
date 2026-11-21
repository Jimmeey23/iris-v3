/**
 * Who owns a new ticket: Physique 57's standing routing rulebook.
 *
 * Each rule names the team(s) that act, one primary owner, optional co-owners, and the
 * escalation chain (level 1, 2, 3 ... after SLA breach), per city. The intake AI reads
 * ROUTING_GUIDE and picks a primary rule plus any secondary rules (e.g. an AC failure that
 * hurts member experience → facilities primary, member_sales secondary). The keyword
 * matchers below are only the fallback when the AI is off, unsure or returns nothing valid.
 *
 * A ticket has exactly one primary owner (assigneeId). Secondary rules add their
 * departments and their first owner as co-owners so they see the ticket.
 *
 * Pure: no I/O.
 */

export const PEOPLE = {
  saachi: "emp_saachi",
  saachiJr: "emp_saachi_jr",
  mitali: "emp_mitali",
  jimmeey: "emp_jimmeey",
  zahur: "emp_zahur",
  prathap: "emp_prathap",
  shifa: "emp_shifa",
  mrigakshi: "emp_mrigakshi",
  vivaran: "emp_vivaran",
  pushyank: "emp_pushyank",
  anisha: "emp_anisha",
  akshay: "emp_akshay",
  shipra: "emp_shipra",
  shaina: "emp_shaina",
  reyna: "emp_reyna",
} as const;
const P = PEOPLE;

const MUMBAI = new Set(["KH", "SHQ", "CTS", "PU"]);
const BENGALURU = new Set(["KHB", "CCB"]);

export const ROUTING_RULE_IDS = [
  "safety_legal",
  "accounts",
  "hosted_class",
  "scheduling",
  "trainer",
  "facilities",
  "member_sales",
] as const;
export type RoutingRuleId = (typeof ROUTING_RULE_IDS)[number];

export type PolicyInput = {
  category: string;
  subcategory: string | null;
  title: string;
  description: string;
  studioCode: string | null;
  studioCity: string | null;
  reporterEmployeeId: string | null;
  /** Department the classifier/routing picked, if any. */
  departmentCode?: string | null;
};

/** What the intake AI decided, from ROUTING_GUIDE. */
export type AiRouting = { rule?: string | null; also?: string[] | null };

export type PolicyDecision = {
  rule: RoutingRuleId;
  label: string;
  /** The one primary owner. */
  assigneeId: string;
  /** Primary owner first, then co-owners and secondary teams' owners. */
  ownerIds: string[];
  /** Primary department first. */
  departmentCodes: string[];
  /** Escalation targets in order: [level 1, level 2, level 3, ...]. */
  escalationChain: string[];
  /** Level-1 escalation (kept for older readers of _escalation_l2). */
  escalationL2: string | null;
  /** Level-2 escalation (kept for older readers of _escalation_l3). */
  escalationL3?: string | null;
  /** Secondary rules that also got the ticket. */
  alsoRules: RoutingRuleId[];
  /** "ai" when the AI's pick was used, "rules" for the keyword fallback. */
  decidedBy: "ai" | "rules";
  /** Unused since the studio round robin was retired; kept so callers compile. */
  roundRobinKey?: string;
};

type City = "Mumbai" | "Bengaluru";
type Team = { owner: string; co?: string[]; esc: string[]; who: string };

type RuleDef = {
  id: RoutingRuleId;
  title: string;
  depts: string[];
  /** Plain-language scope the AI reads. */
  covers: string;
  team: (city: City, studioCode: string | null) => Team;
  match: (i: PolicyInput) => boolean;
};

const has = (re: RegExp, ...parts: (string | null | undefined)[]) => re.test(parts.filter(Boolean).join(" "));
const head = (i: PolicyInput) => [i.category, i.subcategory, i.title] as const;

const RULES: RuleDef[] = [
  {
    id: "safety_legal",
    title: "Safety, theft, injury & legal",
    depts: ["OPS", "MGT"],
    covers: "Safety incidents, theft or lost belongings, member or staff injury or getting hurt, harassment, security, fire or emergencies, and anything with legal implications (legal notices, consumer complaints threatening action, licences, compliance, contracts, franchise/brand legal).",
    team: () => ({ owner: P.saachi, esc: [P.mitali, P.jimmeey], who: "Saachi → Mitali → Jimmeey" }),
    match: (i) =>
      i.category === "Safety and Security" ||
      has(/\b(injur\w*|hurt|accident|fell|faint\w*|bleed\w*|theft|stolen|steal\w*|robbery|harass\w*|assault|unsafe|safety|security|fire|emergency|police|legal|lawyer|lawsuit|consumer court|trademark|franchis\w*|licen[cs]e\w*|compliance)\b/i, ...head(i)) ||
      has(/\b(injur\w*|theft|stolen|harass\w*|assault|legal notice|lawyer|lawsuit|consumer court|police)\b/i, i.description),
  },
  {
    id: "accounts",
    title: "Accounts, payments & refunds",
    depts: ["OPS"],
    covers: "Any money movement or accounts work: payments, refunds, double charges, failed or pending transactions, invoices, receipts, GST, EMI, chargebacks, payment links, reconciliation. Handled by Operations, not the accounts team.",
    team: () => ({ owner: P.saachi, esc: [P.mitali], who: "Saachi → Mitali" }),
    match: (i) =>
      has(/\b(payments?|refunds?|billing|bill|invoices?|charge[ds]?|double charged|overcharged|debit(ed)?|emi|gst|receipts?|accounts?|finance|razorpay|stripe|upi|credit card|transactions?|chargeback|reconcil\w*)\b/i, i.subcategory, i.title),
  },
  {
    id: "hosted_class",
    title: "Hosted class feedback",
    depts: ["MKT"],
    covers: "Feedback, issues or follow-ups about hosted / partner / community / brand-collab classes and events (not their scheduling, which is the scheduling rule).",
    team: (city) =>
      city === "Bengaluru"
        ? { owner: P.saachiJr, esc: [P.reyna, P.saachi, P.jimmeey], who: "Saachi Jr → Reyna → Saachi → Jimmeey" }
        : { owner: P.shaina, esc: [P.reyna, P.saachi, P.jimmeey], who: "Shaina → Reyna → Saachi → Jimmeey" },
    match: (i) => has(/\bhosted (class|session|event)s?\b/i, ...head(i)) && !has(/\b(schedul\w*|timings?|time ?slots?|book(ing)? the slot)\b/i, ...head(i)),
  },
  {
    id: "scheduling",
    title: "Class & trainer scheduling",
    depts: ["SCH", "TRN"],
    covers: "Class schedule and timetable, class timings and changes of timing, new class requests, class format requests, trainer swaps and substitutes, trainer scheduling and availability, hosted class scheduling, private class scheduling.",
    team: (city) =>
      city === "Bengaluru"
        ? { owner: P.pushyank, esc: [P.anisha], who: "Pushyank → Anisha" }
        : { owner: P.mrigakshi, co: [P.vivaran], esc: [P.anisha], who: "Mrigakshi + Vivaran → Anisha" },
    match: (i) =>
      i.category === "Scheduling" ||
      has(/\b(schedul\w*|timetable|time ?slots?|class timings?|timings?|new class|class requests?|format requests?|trainer swaps?|swap(ped)?|substitut\w*|cover(ing)? (the |a )?class|trainer availability|private (class|session)s?|rota)\b/i, i.subcategory, i.title),
  },
  {
    id: "trainer",
    title: "Anything about a trainer",
    depts: ["TRN"],
    covers: "Anything about a specific trainer or instructor: assessments, feedback, complaints, compliments, lateness, personal hygiene, competence, cueing, conduct, form corrections.",
    team: (city) =>
      city === "Bengaluru"
        ? { owner: P.pushyank, co: [P.anisha, P.mrigakshi, P.vivaran], esc: [P.anisha], who: "Pushyank (+ Anisha, Mrigakshi, Vivaran) → Anisha" }
        : { owner: P.mrigakshi, co: [P.vivaran, P.anisha, P.pushyank], esc: [P.anisha], who: "Mrigakshi (+ Vivaran, Anisha, Pushyank) → Anisha" },
    match: (i) =>
      i.category === "Trainer Feedback" ||
      has(/\b(trainers?|instructors?|coach(es)?|teacher)\b/i, i.subcategory, i.title),
  },
  {
    id: "facilities",
    title: "Studio operations & facilities",
    depts: ["OPS"],
    covers: "All studio repairs, malfunctions, defects, broken items or anything not working (AC, lights, plumbing, mics, speakers, music system, equipment, reformers, bikes, lockers, doors), cleaning, housekeeping, pest control, hygiene of the studio, washrooms and showers, overcrowding, insufficient or missing amenities and supplies, valet and parking, and general studio operations.",
    team: (city) =>
      city === "Bengaluru"
        ? { owner: P.prathap, esc: [P.shifa, P.saachi, P.mitali], who: "Prathap → Shifa → Saachi → Mitali" }
        : { owner: P.zahur, esc: [P.saachi, P.mitali], who: "Zahur → Saachi → Mitali" },
    match: (i) =>
      i.category === "Repair and Maintenance" ||
      i.category === "Studio Amenities and Facilities" ||
      has(/\b(facilit\w*|housekeeping|clean(ing|liness)?|dirty|hygiene|pest\w*|cockroach\w*|rats?|mosquito\w*|smell\w*|odou?r|repair\w*|maintenance|broken|not working|malfunction\w*|defect\w*|faulty|out of (use|order)|damaged?|leak\w*|plumbing|electrical|ac|hvac|air.?con\w*|lights?|lighting|mics?|microphones?|headsets?|speakers?|sound system|music system|audio|equipment|reformers?|bikes?|lockers?|amenit\w*|supplies|toiletries|towels?|washrooms?|showers?|overcrowd\w*|crowded|valet|parking|drinking water)\b/i, i.subcategory, i.title),
  },
  {
    id: "member_sales",
    title: "Member experience, sales & memberships",
    depts: ["SCS"],
    covers: "Member experience, sales, leads and trials, memberships and packages, pricing, discounts, offers, membership transfers, freezes and renewals, member complaints and general feedback (anything not about a specific trainer, a facility fault, money movement or safety).",
    team: (city, studio) => {
      if (city === "Bengaluru") return { owner: P.prathap, esc: [P.shifa, P.jimmeey, P.mitali], who: "Prathap → Shifa → Jimmeey → Mitali" };
      if (studio === "SHQ") return { owner: P.shipra, esc: [P.jimmeey, P.mitali], who: "Shipra → Jimmeey → Mitali" };
      if (studio === "KH") return { owner: P.akshay, esc: [P.jimmeey, P.mitali], who: "Akshay → Jimmeey → Mitali" };
      return { owner: P.akshay, co: [P.shipra], esc: [P.jimmeey, P.mitali], who: "Akshay + Shipra → Jimmeey → Mitali" };
    },
    match: (i) =>
      ["Pricing and Memberships", "Sales", "Customer Service", "Member Experience", "Class Experience", "Brand Feedback"].includes(i.category) ||
      has(/\b(member(ship)?s?|packages?|pricing|price|discounts?|offers?|transfers?|freeze|renewals?|complaints?|feedback|sales|leads?|trials?|enquir\w*)\b/i, i.subcategory, i.title),
  },
];

const BY_ID = new Map(RULES.map((r) => [r.id, r]));
export const isRoutingRuleId = (x: unknown): x is RoutingRuleId => typeof x === "string" && BY_ID.has(x as RoutingRuleId);

/** Rulebook text for the intake AI prompt. Stable bytes, so it caches. */
export const ROUTING_GUIDE = RULES.map(
  (r) =>
    `${r.id} (${r.depts.join(" + ")}) - ${r.title}: ${r.covers}\n  Mumbai: ${r.team("Mumbai", "KH").who}${r.id === "member_sales" ? " at Kemps; Shipra → Jimmeey → Mitali at Bandra" : ""}. Bengaluru: ${r.team("Bengaluru", "KHB").who}.`,
).join("\n");

function city(i: PolicyInput): City {
  if (i.studioCode && BENGALURU.has(i.studioCode)) return "Bengaluru";
  if (i.studioCode && MUMBAI.has(i.studioCode)) return "Mumbai";
  if (i.studioCity && /beng|bangal/i.test(i.studioCity)) return "Bengaluru";
  // Mumbai is home: any studio we can't place uses the Mumbai chains.
  return "Mumbai";
}

/** Facility faults that the report says hurt members also go to the studio team. */
const MEMBER_IMPACT = /affect\w* (the )?member|member experience|members? (have )?complain\w*|clients? complain\w*|class (was |got )?(cancel\w*|disrupt\w*|stopp\w*)|yes, significantly/i;

export function keywordRule(i: PolicyInput): RoutingRuleId | null {
  return RULES.find((r) => r.match(i))?.id ?? null;
}

export function decideOwnership(i: PolicyInput, _roundRobinIndex?: (team: string) => number, ai?: AiRouting | null): PolicyDecision | null {
  let primary: RoutingRuleId | null = null;
  let also: RoutingRuleId[] = [];
  let decidedBy: "ai" | "rules" = "rules";

  if (ai?.rule && isRoutingRuleId(ai.rule)) {
    primary = ai.rule;
    also = (ai.also ?? []).filter(isRoutingRuleId);
    decidedBy = "ai";
  } else {
    primary = keywordRule(i);
    if (primary === "facilities" && MEMBER_IMPACT.test(`${i.title} ${i.description}`)) also = ["member_sales"];
  }
  if (!primary) return null;

  const c = city(i);
  const rule = BY_ID.get(primary)!;
  const team = rule.team(c, i.studioCode);
  also = [...new Set(also)].filter((r) => r !== primary);

  const owners = [team.owner, ...(team.co ?? [])];
  const depts = [...rule.depts];
  for (const id of also) {
    const r = BY_ID.get(id)!;
    owners.push(r.team(c, i.studioCode).owner);
    depts.push(...r.depts);
  }
  const chain = team.esc.filter((p) => p !== team.owner);

  return {
    rule: primary,
    label: `${rule.title} (${c}) → ${team.who}${also.length ? `; also ${also.map((a) => BY_ID.get(a)!.title).join(", ")}` : ""}${decidedBy === "ai" ? " · routed by IRIS AI" : ""}`,
    assigneeId: team.owner,
    ownerIds: [...new Set(owners)],
    departmentCodes: [...new Set(depts)],
    escalationChain: chain,
    escalationL2: chain[0] ?? null,
    escalationL3: chain[1] ?? null,
    alsoRules: also,
    decidedBy,
  };
}

/** collected_info keys every ticket-creating path writes for a policy decision. */
export function policyCollectedInfo(p: PolicyDecision): Record<string, unknown> {
  return {
    _ownership_rule: p.label,
    _routing: { rule: p.rule, also: p.alsoRules, decided_by: p.decidedBy },
    _escalation_chain: p.escalationChain,
    ...(p.escalationL2 ? { _escalation_l2: p.escalationL2 } : {}),
    ...(p.escalationL3 ? { _escalation_l3: p.escalationL3 } : {}),
  };
}
