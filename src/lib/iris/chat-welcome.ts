import { ALL_TICKETS, isOwner } from "./sample-tickets";
import { STUDIO_MAP } from "./types";
import { matchArea, matchFormat, matchStudio, matchTrainer, matchWhen } from "./aliases";
import { EMPLOYEES, DEPT_MAP } from "./types";
import { detailsFromText } from "./intake-details";
import type { AIButton, CurrentUser } from "./store";

const FALLBACK_ISSUES = [
  "AC is not working in the studio",
  "A client's class credits are not reflecting correctly",
  "Sound system has stopped working",
  "Payment deducted but not showing in system",
];

const isOpen = (t: { status: string }) => t.status !== "resolved" && t.status !== "closed";
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** The studio this user most likely works from: their own tickets first, then their assigned studios. */
function homeStudio(user: CurrentUser): string | null {
  const counts = new Map<string, number>();
  for (const t of ALL_TICKETS) {
    if (!t.studioCode) continue;
    if (t.reporterId === user.id || isOwner(t, user.id)) counts.set(t.studioCode, (counts.get(t.studioCode) ?? 0) + 1);
  }
  const mine = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (mine) return mine;
  if (user.studioCodes?.length === 1) return user.studioCodes[0];
  // Busiest studio among the ones they can see.
  const allowed = new Set(user.studioCodes ?? []);
  const busy = new Map<string, number>();
  for (const t of ALL_TICKETS) if (t.studioCode && isOpen(t) && (!allowed.size || allowed.has(t.studioCode))) busy.set(t.studioCode, (busy.get(t.studioCode) ?? 0) + 1);
  return [...busy.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Ticket types that are routine workflows, not problems anyone "reports". */
const PROCESS_TYPES = /lead capture|tracking|enquir|inquir|\bsop\b|survey|request for|onboarding|reporting|data entry|follow-up post/i;

/** A natural one-line prompt for a ticket type: a real title if they read naturally, else "Category: sub". */
function promptFor(category: string, sub: string | null, titles: string[]): string {
  const natural = titles
    .map((t) => t.trim())
    .filter((t) => t.length >= 12 && t.length <= 70 && !t.includes(" - ") && t.toLowerCase() !== (sub ?? "").toLowerCase());
  const counts = new Map<string, number>();
  for (const t of natural) counts.set(t, (counts.get(t) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (best) return best;
  return sub ? `${category}: ${sub.charAt(0).toLowerCase()}${sub.slice(1)}` : category;
}

/** Most reported problems at a studio in the last 90 days, as one-tap prompts. */
function commonIssues(studio: string | null, n = 4): string[] {
  const since = Date.now() - 90 * 86400_000;
  const groups = new Map<string, { score: number; category: string; sub: string | null; titles: string[] }>();
  for (const t of ALL_TICKETS) {
    if (studio && t.studioCode !== studio) continue;
    if (new Date(t.createdAt).getTime() < since || t.title.startsWith("[Recurrence check")) continue;
    const sub = t.subcategory?.trim() || null;
    if (!t.category || PROCESS_TYPES.test(`${t.category} ${sub ?? ""}`)) continue;
    const key = `${t.category}|${sub ?? ""}`;
    const g = groups.get(key) ?? { score: 0, category: t.category, sub, titles: [] };
    // Real problems count more than low-priority enquiries.
    g.score += t.priority === "P3" ? 0.5 : 1;
    g.titles.push(t.title);
    groups.set(key, g);
  }
  const top = [...groups.values()].sort((a, b) => b.score - a.score).slice(0, n).map((g) => promptFor(g.category, g.sub, g.titles));
  return top.length >= 2 ? top : FALLBACK_ISSUES.slice(0, n);
}

export function buildWelcome(user: CurrentUser): { content: string; buttons: AIButton[] } {
  const first = (user.name || "there").split(" ")[0];
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const studio = homeStudio(user);
  // One short name everywhere ("Kwality House", not "Kwality House, Kemps Corner").
  const studioName = studio ? (STUDIO_MAP[studio]?.name ?? studio).split(",")[0] : null;

  const open = ALL_TICKETS.filter((t) => isOpen(t) && (!studio || t.studioCode === studio));
  const breached = open.filter((t) => t.slaStatus === "breached").length;
  const urgent = open.filter((t) => t.priority === "P0" || t.priority === "P1").length;
  const mine = ALL_TICKETS.filter((t) => isOpen(t) && isOwner(t, user.id)).length;

  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const emoji = h < 12 ? "☀️" : h < 17 ? "👋" : "🌙";

  // Compact status line: "📍 **Kwality House** · 2 open · 1 urgent · 2 past SLA"
  const status: string[] = [];
  if (studioName) {
    status.push(
      open.length
        ? `📍 **${studioName}** · ${open.length} open${urgent ? ` · ${urgent} urgent` : ""}${breached ? ` · ${breached} past SLA` : ""}`
        : `📍 **${studioName}** · all clear, no open tickets 🎉`,
    );
  }
  if (mine) status.push(`🎫 You own ${plural(mine, "open ticket")}`);

  const ask = pick([
    "What's up? Tell me in your own words and I'll sort out the routing and SLA ✨",
    "Something to report? Plain words are perfect, I'll take it from there 🙌",
    "Tell me what happened and I'll handle the rest 💪",
  ]);
  const lead = studioName ? `Most reported at ${studioName} lately 👇` : "Common issues lately 👇";

  // Single line breaks inside a block; one blank line only before the suggestions.
  const content = [`${emoji} ${hello}, ${first}!`, ...status, ask].join("\n") + `\n\n${lead}`;
  const buttons = commonIssues(studio).map((label) => ({ label, value: label, captures: label }));
  return { content, buttons };
}

// ── Live context: fields recognised while the user types ─────────────────────

const CATEGORY_KEYWORDS: Array<[string, RegExp]> = [
  ["Facilities", /\b(ac|a\/c|aircon|air ?con|leak|water|light|power|electric|toilet|washroom|clean|smell|mirror|floor|barre)\b/i],
  ["Equipment", /\b(bike|pedal|saddle|cycle|powercycle|mic|microphone|speaker|sound|amp|machine|equipment|band|mat)\b/i],
  ["Billing & Payments", /\b(payment|paid|charged|refund|deducted|invoice|card|upi|pos|billing|price)\b/i],
  ["Membership & Credits", /\b(credit|credits|membership|freeze|renew|package|pack|expiry|expire)\b/i],
  ["Bookings & Classes", /\b(booking|booked|class|waitlist|cancel|cancellation|schedule|late|capacity)\b/i],
  ["Trainer", /\b(trainer|instructor|coach|teacher)\b/i],
  ["Technology", /\b(momence|app|wifi|wi-fi|internet|login|website|system|sync)\b/i],
  ["Health & Safety", /\b(injury|injured|hurt|fell|faint|collapsed|bleeding|first aid|ambulance|unsafe)\b/i],
  ["Client Experience", /\b(complain|complaint|rude|unhappy|feedback|review|angry)\b/i],
];

export type LiveField = { key: string; label: string; value: string };

const CATEGORY_DEPT: Record<string, string> = {
  Facilities: "FAC", Equipment: "OPS", "Billing & Payments": "PAY", "Membership & Credits": "MEM",
  "Bookings & Classes": "SCH", Trainer: "TRN", Technology: "ITS", "Health & Safety": "OPS", "Client Experience": "SCS",
};
/** Known sub-categories from ticket history, longest first (cached per data load). */
let subcatCache: { n: number; list: Array<{ name: string; dept: string | null }> } | null = null;
function SUBCATS() {
  if (subcatCache && subcatCache.n === ALL_TICKETS.length) return subcatCache.list;
  const m = new Map<string, string | null>();
  for (const t of ALL_TICKETS) if (t.subcategory && !m.has(t.subcategory)) m.set(t.subcategory, t.departmentCode ?? null);
  const list = [...m.entries()].map(([name, dept]) => ({ name, dept })).sort((a, b) => b.name.length - a.name.length);
  subcatCache = { n: ALL_TICKETS.length, list };
  return list;
}

export function detectLiveContext(text: string): LiveField[] {
  const raw = text.trim();
  if (raw.length < 3) return [];
  const out: LiveField[] = [];
  const studio = matchStudio(raw);
  if (studio) out.push({ key: "studio", label: "Studio", value: STUDIO_MAP[studio]?.name?.split(",")[0] ?? studio });
  const area = matchArea(raw, studio);
  if (area) out.push({ key: "location", label: "Location", value: area });
  const cat = CATEGORY_KEYWORDS.find(([, re]) => re.test(raw));
  if (cat) out.push({ key: "category", label: "Category", value: cat[0] });
  if (/\b(urgent|asap|emergency|immediately|injur|bleed|collapsed|fire|smoke|flood)/i.test(raw)) {
    out.push({ key: "priority", label: "Priority", value: "Urgent" });
  }
  const client = /\b(?:client|member|customer)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/.exec(raw)?.[1];
  if (client) out.push({ key: "affectedClient", label: "Client", value: client });
  if (/\b(again|recurring|keeps|every time|still|repeatedly)\b/i.test(raw)) out.push({ key: "recurrence", label: "Pattern", value: "Recurring" });

  const trainer = matchTrainer(raw, EMPLOYEES.filter((e) => e.departmentCode === "TRN").map((e) => e.name));
  if (trainer) out.push({ key: "trainer", label: "Trainer", value: trainer });
  const format = matchFormat(raw);
  if (format) out.push({ key: "class", label: "Class", value: format });
  const when = matchWhen(raw);
  if (when) out.push({ key: "date", label: "Date", value: when.replace(/^\w/, (c) => c.toUpperCase()) });
  const membership = /\b(\d+\s*-?\s*class(es)?\s*pack|annual|monthly|quarterly|unlimited|newcomer|intro offer|membership|package|credits?)\b/i.exec(raw)?.[0];
  if (membership) out.push({ key: "membership", label: "Membership", value: membership.toLowerCase() });
  // Sub-category: the longest known sub-category name the text mentions.
  const lower = raw.toLowerCase();
  const sub = SUBCATS().find((x) => x.name.length > 4 && lower.includes(x.name.toLowerCase()));
  if (sub) {
    out.push({ key: "subcategory", label: "Sub-category", value: sub.name });
    if (sub.dept && DEPT_MAP[sub.dept]) out.push({ key: "department", label: "Department", value: DEPT_MAP[sub.dept].name });
  } else if (cat) {
    const dept = CATEGORY_DEPT[cat[0]];
    if (dept && DEPT_MAP[dept]) out.push({ key: "department", label: "Department", value: DEPT_MAP[dept].name });
  }
  const mood = detailsFromText(raw).sentiment;
  if (mood) out.push({ key: "mood", label: "Mood", value: mood });
  return out;
}
