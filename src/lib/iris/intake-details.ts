/**
 * Per-ticket-type intake questions and the rich ticket draft built from them.
 *
 * The intake form won't offer "Review ticket" until the required answers for the
 * chosen category/sub-category are in (e.g. what the client said word for word, how
 * they feel, when it happened). The draft then carries everything the owner needs:
 * routing, predicted owner, SLA and expected closure, reporter, departments
 * involved, member profile, action steps from the Knowledge Base, related tickets
 * and dynamic tags.
 */
import { ALL_TICKETS } from "./sample-tickets";
import { DEPARTMENTS, DEPT_MAP, EMPLOYEES, EMPLOYEE_MAP, PRIORITY_CONFIG, STUDIO_MAP } from "./types";
import { KNOWLEDGE_ARTICLES } from "./knowledge-base-data";
import { TEMPLATE_MAP } from "./templates";
import type { AgentTicketDraft, CurrentUser, IntakeState } from "./store";
import { descriptionText } from "./description-format";
import { FIELDS, fieldsFor, isSpecial, missingFields } from "./intake-schema";

// ── Questions ────────────────────────────────────────────────────────────────

/** Any field key from the intake schema (see ./intake-schema). */
export type DetailKey = string;

/** Required answers still missing for this report, as readable labels. */
export function missingDetails(s: IntakeState): string[] {
  return missingFields(s).map((f) => f.label.toLowerCase());
}

/** Pre-fill answers we can read straight from the message: quoted words, mood words. */
export function detailsFromText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const quote = /["“]([^"”]{6,})["”]/.exec(text)?.[1];
  if (quote) out.verbatim = quote.trim();
  const t = text.toLowerCase();
  if (/\b(cancel (my|her|his) membership|leave|quit|never coming back|review|refund or)\b/.test(t)) out.sentiment = "Threatening to leave";
  else if (/\b(furious|angry|shouting|yelled|rude|livid)\b/.test(t)) out.sentiment = "Angry";
  else if (/\b(frustrat|annoyed|upset|irritated|fed up)\w*/.test(t)) out.sentiment = "Frustrated";
  else if (/\b(disappoint|unhappy|sad|not happy)\w*/.test(t)) out.sentiment = "Disappointed";
  if (/\b(injur|bleed|fell|faint|collapsed|ambulance|hurt)\w*/.test(t)) out.injury = /ambulance|hospital|collapsed|faint/.test(t) ? "Needs medical attention" : "Minor (first aid)";
  if (/\b(out of order|not working|broken|dead|won'?t turn on)\b/.test(t)) out.usable = "Out of use";
  return out;
}

/** "Today", "Yesterday", "This week", or a date, as chips for the When row. */
export const WHEN_CHIPS = ["Today", "Yesterday", "Earlier this week"] as const;

// ── Member profile ───────────────────────────────────────────────────────────

export type MemberSnapshot = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  totalVisits?: number;
  firstSeen?: string | null;
  lastSeen?: string | null;
  tags?: string[];
  memberships: Array<{ name: string; type?: string; endDate?: string | null; creditsLeft?: number | null; creditsTotal?: number | null; frozen?: boolean }>;
  recentVisits: Array<{ name: string; startsAt?: string; teacher?: string | null; location?: string | null; checkedIn?: boolean; cancelled?: boolean }>;
};

type MemberDetailsResponse = {
  member: { id: string; name: string; email: string | null; phone: string | null; totalVisits: number; firstSeen: string | null; lastSeen: string | null; tags: string[] } | null;
  activeMemberships: Array<{ name: string; type: string; endDate: string | null; isFrozen: boolean; classCreditsLeft: number | null; classCreditsTotal: number | null }>;
  recentBookings: Array<{ checkedIn: boolean; cancelledAt: string | null; session: { name: string; startsAt: string; teacher: string | null; location: string | null } | null }>;
};

export function toMemberSnapshot(id: string, name: string, d: MemberDetailsResponse): MemberSnapshot {
  const m = d.member;
  return {
    id,
    name: m?.name ?? name,
    email: m?.email,
    phone: m?.phone,
    totalVisits: m?.totalVisits,
    firstSeen: m?.firstSeen,
    lastSeen: m?.lastSeen,
    tags: m?.tags ?? [],
    memberships: (d.activeMemberships ?? []).map((x) => ({
      name: x.name, type: x.type, endDate: x.endDate, creditsLeft: x.classCreditsLeft, creditsTotal: x.classCreditsTotal, frozen: x.isFrozen,
    })),
    recentVisits: (d.recentBookings ?? [])
      .filter((b) => b.session)
      .sort((a, b) => (b.session!.startsAt ?? "").localeCompare(a.session!.startsAt ?? ""))
      .slice(0, 6)
      .map((b) => ({ name: b.session!.name, startsAt: b.session!.startsAt, teacher: b.session!.teacher, location: b.session!.location, checkedIn: b.checkedIn, cancelled: Boolean(b.cancelledAt) })),
  };
}

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");

export function memberLines(m: MemberSnapshot): string[] {
  const lines = [
    `${m.name} (${m.id})${[m.phone, m.email].filter(Boolean).length ? ` · ${[m.phone, m.email].filter(Boolean).join(" · ")}` : ""}`,
    `${m.totalVisits ?? 0} visits · member since ${day(m.firstSeen)} · last visit ${day(m.lastSeen)}`,
  ];
  for (const ms of m.memberships) {
    const credits = ms.creditsTotal ? ` · ${ms.creditsLeft ?? 0}/${ms.creditsTotal} credits left` : "";
    lines.push(`Active: ${ms.name}${credits}${ms.endDate ? ` · ends ${day(ms.endDate)}` : ""}${ms.frozen ? " · FROZEN" : ""}`);
  }
  if (!m.memberships.length) lines.push("No active membership");
  for (const v of m.recentVisits.slice(0, 4)) {
    lines.push(`Visit: ${v.name} · ${day(v.startsAt)}${v.teacher ? ` · ${v.teacher}` : ""}${v.cancelled ? " · cancelled" : v.checkedIn ? " · checked in" : ""}`);
  }
  if (m.tags?.length) lines.push(`Momence tags: ${m.tags.join(", ")}`);
  return lines;
}

// ── Rich draft ───────────────────────────────────────────────────────────────

export type DraftExtras = {
  reporter: { name: string; role: string; email?: string };
  owner?: { id: string; name: string; role: string; reason: string };
  departmentsInvolved: string[];
  slaResponse: string;
  slaResolution: string;
  expectedClosure: string;
  actionSteps: string[];
  kbArticle?: { id: string; title: string };
  related: Array<{ id: string; ticketId: string; title: string; status: string }>;
  member?: MemberSnapshot;
  when?: string | null;
  details: Record<string, string>;
};

const mins = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

/** Best Knowledge Base guide for this sub-category (via its linked ticket forms, then by name). */
function kbFor(category: string | null, subcategory: string | null) {
  if (!subcategory && !category) return undefined;
  const sub = (subcategory ?? "").toLowerCase();
  const scored = KNOWLEDGE_ARTICLES.map((a) => {
    let score = 0;
    for (const code of a.relatedTemplates ?? []) {
      const t = TEMPLATE_MAP[code];
      if (t?.subcategory && t.subcategory.toLowerCase() === sub) score += 5;
      else if (t?.category && t.category === category) score += 1;
    }
    if (sub && a.title.toLowerCase().includes(sub)) score += 4;
    if (sub && (a.subcategory ?? "").toLowerCase() === sub) score += 3;
    return { a, score };
  }).filter((x) => x.score > 0 && x.a.steps?.length);
  return scored.sort((x, y) => y.score - x.score)[0]?.a;
}

const DEFAULT_STEPS: Record<string, string[]> = {
  "Trainer Feedback": ["Call the client within the response SLA and acknowledge the feedback", "Share the feedback privately with the trainer and their head trainer", "Agree a corrective action (coaching, observation, class change)", "Update the client on what was done and log it on the ticket"],
  "Class Experience": ["Acknowledge the client and apologise for the experience", "Check the class roster and trainer notes in Momence", "Fix the root cause (room, music, capacity, timing)", "Offer a goodwill gesture if appropriate and confirm with the client"],
  "Customer Service and Communication": ["Call the client back and confirm what they need", "Review the interaction with the staff member involved", "Resolve the request and confirm in writing", "Note any process gap for the team"],
  "Pricing and Memberships": ["Pull up the member's membership and payment history in Momence", "Confirm what they're asking for against policy", "Apply the change or explain the policy clearly", "Confirm the outcome with the member in writing"],
  "Repair and Maintenance": ["Take the item out of use and label it if unsafe", "Raise it with the vendor / technician with photos", "Track the visit date and test after repair", "Return it to use and close with the fix noted"],
  "Safety and Security": ["Make sure everyone is safe and first aid is given", "Record what happened, witnesses and CCTV timestamps", "Inform the Studio Director and follow up with the person affected", "Close with the root cause and prevention step"],
};

export function buildRichDraft(s: IntakeState, user: CurrentUser): { draft: AgentTicketDraft; extras: DraftExtras } {
  const studio = s.studioCode ? STUDIO_MAP[s.studioCode] : undefined;
  const who = s.member?.name ?? s.clientNameHint ?? undefined;
  const d = s.details ?? {};
  const p = PRIORITY_CONFIG[s.priority];

  // Departments involved: the routed one, plus who else has to act.
  const involved = new Set<string>(s.department ? [s.department] : []);
  if (s.trainer) involved.add("TRN");
  if (s.member && s.department !== "SCS") involved.add("SCS");
  if (["Repair and Maintenance", "Studio Amenities and Facilities"].includes(s.category ?? "")) involved.add("FAC");
  if (s.category === "Safety and Security") involved.add("OPS");
  const departmentsInvolved = [...involved].filter((c) => DEPT_MAP[c]);

  // Predicted owner: available, in the department, covering the studio, lightest load.
  let owner: DraftExtras["owner"];
  if (s.department) {
    const pool = EMPLOYEES.filter((e) => e.departmentCode === s.department);
    const ranked = pool
      .map((e) => ({
        e,
        score:
          (e.availability === "available" ? 0 : 50) +
          (s.studioCode && e.studioCodes?.includes(s.studioCode) ? 0 : 20) +
          (e.maxWorkload ? (100 * (e.workload ?? 0)) / e.maxWorkload : e.workload ?? 0) / 4,
      }))
      .sort((a, b) => a.score - b.score);
    const top = ranked[0]?.e;
    const head = DEPARTMENTS.find((x) => x.code === s.department)?.headId;
    const routed = s.routing?.owner && s.routing.departmentCode === s.department ? EMPLOYEE_MAP[s.routing.owner.id] : undefined;
    const pick = routed ?? top ?? (head ? EMPLOYEE_MAP[head] : undefined);
    if (pick) {
      owner = {
        id: pick.id,
        name: pick.name,
        role: pick.role,
        reason: routed
          ? s.routing?.ownershipRule ?? (s.routing?.owner?.source === "ai" ? "Suggested by IRIS from skills and studio" : `${DEPT_MAP[s.department]?.name ?? s.department}, ${pick.workload ?? 0}/${pick.maxWorkload ?? "?"} open`)
          : top
          ? `${DEPT_MAP[s.department]?.name ?? s.department}${s.studioCode && pick.studioCodes?.includes(s.studioCode) ? `, covers ${studio?.name.split(",")[0]}` : ""}, ${pick.workload ?? 0}/${pick.maxWorkload ?? "?"} open`
          : `Head of ${DEPT_MAP[s.department]?.name ?? s.department} (nobody else in the team)`,
      };
    }
  }

  const kb = kbFor(s.category, s.subcategory);
  const actionSteps = (kb?.steps?.length ? kb.steps : DEFAULT_STEPS[s.category ?? ""] ?? ["Contact the person affected and confirm the details", "Fix the root cause", "Confirm the outcome and close with notes"]).slice(0, 7);

  const related = ALL_TICKETS.filter(
    (t) =>
      t.status !== "resolved" && t.status !== "closed" &&
      ((s.member && t.clientMomenceId === s.member.id) || (s.studioCode && t.studioCode === s.studioCode && s.subcategory && t.subcategory === s.subcategory)),
  )
    .slice(0, 5)
    .map((t) => ({ id: t.id, ticketId: t.ticketId, title: t.title, status: t.status }));

  const snap = s.memberSnapshot;
  const tags = new Set<string>(
    [s.category, s.subcategory, studio?.name.split(",")[0], s.area, s.classFormat, d.sentiment, d.impact, d.usable, d.injury].filter(Boolean) as string[],
  );
  if (s.trainer) tags.add(`trainer:${s.trainer.name}`);
  if (s.member) tags.add("member");
  if (related.length) tags.add("repeat-issue");
  if (snap) {
    if ((snap.totalVisits ?? 0) <= 3) tags.add("new-client");
    if ((snap.totalVisits ?? 0) >= 100) tags.add("loyal-client");
    if (snap.memberships.some((m) => m.frozen)) tags.add("frozen-membership");
    if (snap.memberships.some((m) => m.creditsTotal && (m.creditsLeft ?? 0) <= 2)) tags.add("low-credits");
    if (!snap.memberships.length) tags.add("no-active-membership");
    if (snap.tags?.some((t) => /vip/i.test(t))) tags.add("VIP");
  }
  if (d.sentiment === "Threatening to leave") tags.add("churn-risk");

  const title =
    s.title ??
    [s.subcategory ?? s.category, s.trainer ? s.trainer.name : who, studio ? studio.name.split(",")[0] : null].filter(Boolean).join(" - ");

  const section = (h: string, body?: string | string[] | null) =>
    body && (Array.isArray(body) ? body.length : body.trim()) ? `\n${h}\n${Array.isArray(body) ? body.map((x) => `- ${x}`).join("\n") : body.trim()}` : "";
  const rawDescription = [
    s.text.trim(),
    section(
      "Details captured",
      fieldsFor(s)
        .filter((f) => !isSpecial(f.key) && (d[f.key] ?? "").trim())
        .map((f) => `${FIELDS[f.key].label}: ${f.key === "verbatim" || f.key === "complaintWhat" ? `"${d[f.key]!.trim()}"` : d[f.key]!.trim()}`),
    ),
    section("Still unknown", missingFields(s).map((f) => f.label)),
    section(
      "Context",
      [
        s.when && `When: ${s.when}`,
        studio && `Studio: ${studio.name}${s.area ? ` · ${s.area}` : ""}`,
        s.session && `Class: ${s.session.name}${s.session.subtitle ? ` · ${s.session.subtitle}` : ""} (${s.session.id})`,
        s.trainer && `Trainer: ${s.trainer.name}`,
        s.classFormat && !s.session && `Format: ${s.classFormat}`,
      ].filter(Boolean) as string[],
    ),
    section("Member profile", snap ? memberLines(snap) : s.member ? [`${s.member.name} (${s.member.id})`] : null),
    section("Related open tickets", related.map((r) => `${r.ticketId} - ${r.title}`)),
  ].join("\n");
  const description = descriptionText(rawDescription);

  const due = new Date(Date.now() + p.resolutionMins * 60_000);
  const extras: DraftExtras = {
    reporter: { name: user.name, role: user.role, email: user.email },
    owner,
    departmentsInvolved,
    slaResponse: mins(p.responseMins),
    slaResolution: mins(p.resolutionMins),
    expectedClosure: due.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    actionSteps,
    kbArticle: kb ? { id: kb.id, title: kb.title } : undefined,
    related,
    member: snap ?? undefined,
    when: s.when,
    details: d,
  };

  const draft: AgentTicketDraft = {
    title: title.slice(0, 200),
    description,
    category: s.category ?? "Miscellaneous",
    subcategory: s.subcategory ?? undefined,
    priority: s.priority,
    studioCode: s.studioCode ?? undefined,
    departmentCode: s.department ?? undefined,
    departmentCodes: departmentsInvolved,
    assigneeId: owner?.id,
    affectedClient: who,
    clientMomenceId: s.member?.id,
    bookingId: s.session?.id,
    severity: d.injury === "Needs medical attention" || d.usable === "Safety risk" ? "sev-1" : undefined,
    businessImpact: [d.impact, d.sentiment && `Client mood: ${d.sentiment}`].filter(Boolean).join(" · ") || undefined,
    recommendedResolution: actionSteps.map((x, i) => `${i + 1}. ${x}`).join("\n"),
    tags: [...tags].slice(0, 20),
    extras,
  };
  return { draft, extras };
}
