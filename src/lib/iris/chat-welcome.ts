import { ALL_TICKETS, isOwner } from "./sample-tickets";
import { STUDIO_MAP } from "./types";
import { matchArea, matchStudio } from "./aliases";
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

/** Most frequently reported issues at a studio in the last 90 days, as one-tap prompts. */
function commonIssues(studio: string | null, n = 4): string[] {
  const since = Date.now() - 90 * 86400_000;
  const groups = new Map<string, { count: number; title: string }>();
  for (const t of ALL_TICKETS) {
    if (studio && t.studioCode !== studio) continue;
    if (new Date(t.createdAt).getTime() < since || t.title.startsWith("[Recurrence check")) continue;
    const key = (t.subcategory || t.category || "").trim();
    if (!key) continue;
    const g = groups.get(key) ?? { count: 0, title: t.title };
    g.count++;
    groups.set(key, g);
  }
  const studioName = studio ? STUDIO_MAP[studio]?.name?.split(",")[0] : null;
  const top = [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, n)
    .map(([key]) => (studioName ? `${key} at ${studioName}` : key));
  return top.length >= 2 ? top : FALLBACK_ISSUES.slice(0, n);
}

export function buildWelcome(user: CurrentUser): { content: string; buttons: AIButton[] } {
  const first = (user.name || "there").split(" ")[0];
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const studio = homeStudio(user);
  const studioName = studio ? STUDIO_MAP[studio]?.name ?? studio : null;

  const open = ALL_TICKETS.filter((t) => isOpen(t) && (!studio || t.studioCode === studio));
  const breached = open.filter((t) => t.slaStatus === "breached").length;
  const urgent = open.filter((t) => t.priority === "P0" || t.priority === "P1").length;
  const mine = ALL_TICKETS.filter((t) => isOpen(t) && isOwner(t, user.id)).length;

  const facts: string[] = [];
  if (studioName) facts.push(`${studioName} has ${open.length} open ticket${open.length === 1 ? "" : "s"}${urgent ? `, ${urgent} urgent` : ""}${breached ? ` and ${breached} past SLA` : ""}.`);
  if (mine) facts.push(`You own ${mine} open ticket${mine === 1 ? "" : "s"}.`);

  const opener = pick([
    `${hello}, ${first}.`,
    `${hello}, ${first}. IRIS here.`,
    `Hi ${first}, ${hello.toLowerCase()}.`,
  ]);
  const ask = pick([
    "What's going on? Describe it in your own words and I'll classify, route and set the SLA.",
    "What do you need to report? Plain words are fine, I'll handle the rest.",
    "Tell me what happened and I'll take care of routing and SLA.",
  ]);
  const lead = studioName ? `Most reported at ${studioName.split(",")[0]} lately:` : "Common issues lately:";

  const content = [opener, facts.join(" "), ask, lead].filter(Boolean).join("\n\n");
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
  return out;
}
