/**
 * Who the trainers are, and what the ticket history says about them.
 *
 * Structure follows the reference iris-ai-v2 repo (`lib/trainer-directory.ts` plus the
 * profile-building half of `api/trainers/route.ts`), with one difference in where the data
 * comes from: v2 reads a `trainer` column and a table of Fillout/Zite assessments. IRIS has
 * neither, so every figure here is derived from the live ticket list (ALL_TICKETS):
 *
 *  - a ticket is "about" a trainer when its description carries a `Trainer: <name>` line (what
 *    the intake form writes) or, for Trainer Feedback / Class Experience tickets, when the
 *    title or description names someone on the roster;
 *  - Trainer Feedback and Class Experience tickets are the member feedback; those whose
 *    subcategory, title or tags read as praise are compliments, the rest are flagged concerns;
 *  - assessments (weighted evaluation scores) come from iris.trainer_assessments - imported
 *    from v2 and fed live by the Fillout webhook - via /api/trainers/assessments. Only
 *    managers and admins can read them (RLS); for everyone else scores stay null.
 *
 * Grouping is by city, not studio. Bengaluru is a named list; everybody else is Mumbai.
 */
import { TRAINERS as ROSTER } from "./constants";
import { STUDIO_MAP } from "./types";
import type { Ticket } from "./sample-tickets";

export type TrainerCity = "Mumbai" | "Bengaluru";

export type RubricRow = {
  category: string;
  score: number;
  weightage: number;
  pct: number;
};

export type Assessment = {
  id: string;
  ticketNumber: string;
  studio: string | null;
  createdAt: string;
  submittedAt: string;
  score: number;
  evaluator: string;
  title: string;
  band: string;
  bandTone: string;
  sourceLabel: string;
  sessionName: string;
  strengths: string;
  improvements: string;
  coachingPlan: string;
  summary: string;
  rubric: RubricRow[];
  answers: { label: string; value: string }[];
};

export type FeedbackRow = {
  id: string;
  ticketNumber: string;
  title: string;
  subcategory: string;
  sentiment: string | null;
  status: string;
  createdAt: string;
  kind: string;
};

export type Trainer = {
  name: string;
  displayName?: string;
  hidden?: boolean;
  mergedFrom?: string[];
  ambiguousWith?: string[] | null;
  totalTickets: number;
  assessmentCount: number;
  feedbackCount: number;
  complimentCount: number;
  issueCount: number;
  avgScore: number | null;
  band: string | null;
  bandTone: string;
  primaryStudio: string;
  city: TrainerCity;
  studioSummary: { studio: string; count: number }[];
  latestAssessment: Assessment | null;
  assessments: Assessment[];
  recentFeedback: FeedbackRow[];
  /** Every feedback ticket on file (recentFeedback is the newest 8), for drill-downs. */
  feedback: FeedbackRow[];
};

export const TRAINERS: readonly string[] = ROSTER;

/** Trainers present in the ticket history who are not in the roster. Empty at present. */
export const KNOWN_TRAINERS: { name: string; city: TrainerCity; active: boolean }[] = [];

/**
 * Spellings in the ticket history that are known to be somebody already on the roster.
 * Corrections to the data rather than administrator preferences; an administrator's alias
 * is consulted first.
 */
const BUILT_IN_ALIASES: Record<string, string> = {
  "chaitanya padhye": "Chaitanya Nahar",
  "shruthi kulkarni": "Shruti Kulkarni",
  "siddhartha kasuma": "Siddhartha Kusuma",
  "bret saldhana": "Bret Saldanha",
  "richard d'souza": "Richard D'Costa",
};

/** Bengaluru, by first name as given: Kajol, Pushyank, Shruti, Siddhartha, Chaitanya.
 *  Everyone else is Mumbai. */
const BENGALURU_FIRST_NAMES = new Set(["kajol", "pushyank", "shruti", "siddhartha", "chaitanya"]);

export const DEFAULT_CITY: TrainerCity = "Mumbai";

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

/** The city a trainer belongs to before any administrator override. */
export function defaultCityFor(name: string): TrainerCity {
  return BENGALURU_FIRST_NAMES.has(firstName(name)) ? "Bengaluru" : DEFAULT_CITY;
}

/** Every name this module knows, roster first. */
export function knownTrainerNames(): string[] {
  return [...new Set([...TRAINERS, ...KNOWN_TRAINERS.map((t) => t.name)])];
}

export type TrainerOverrides = {
  /** Variant spelling (lowercased) to the canonical name it belongs to. */
  aliases: Record<string, string>;
  /** Canonical name to the city an administrator put them in. */
  cities: Record<string, TrainerCity>;
  /** Canonical names an administrator has removed from the page. Tickets stay on file. */
  hidden: string[];
  /** Canonical name to the display name an administrator prefers. */
  displayNames: Record<string, string>;
};

export const EMPTY_OVERRIDES: TrainerOverrides = { aliases: {}, cities: {}, hidden: [], displayNames: {} };

const OVERRIDES_KEY = "iris:trainer-overrides:v1";

/** Administrator corrections live in this browser: IRIS has no settings row to hold them. */
export function loadOverrides(): TrainerOverrides {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(OVERRIDES_KEY) : null;
    const v = (raw ? JSON.parse(raw) : {}) as Partial<TrainerOverrides>;
    return {
      aliases: v.aliases && typeof v.aliases === "object" ? v.aliases : {},
      cities: v.cities && typeof v.cities === "object" ? v.cities : {},
      hidden: Array.isArray(v.hidden) ? v.hidden.filter((n): n is string => typeof n === "string") : [],
      displayNames: v.displayNames && typeof v.displayNames === "object" ? v.displayNames : {},
    };
  } catch {
    return EMPTY_OVERRIDES;
  }
}

export function saveOverrides(o: TrainerOverrides) {
  try {
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
  } catch {
    /* storage unavailable: the correction lasts for this session only */
  }
}

/** One administrator correction, as the edit dialog issues it. */
export type TrainerCorrection =
  | { action: "merge"; from: string; into: string }
  | { action: "unmerge"; from: string }
  | { action: "city"; name: string; city: TrainerCity }
  | { action: "rename"; name: string; displayName: string }
  | { action: "hide"; name: string; hidden: boolean };

export function applyCorrection(o: TrainerOverrides, c: TrainerCorrection): TrainerOverrides {
  switch (c.action) {
    case "merge":
      if (c.from.toLowerCase() === c.into.toLowerCase()) throw new Error("A trainer cannot be merged into themselves.");
      return { ...o, aliases: { ...o.aliases, [c.from.toLowerCase()]: c.into } };
    case "unmerge": {
      const { [c.from.toLowerCase()]: removed, ...rest } = o.aliases;
      if (!removed) throw new Error("That spelling is not merged into anything.");
      return { ...o, aliases: rest };
    }
    case "city":
      return { ...o, cities: { ...o.cities, [c.name]: c.city } };
    case "rename": {
      const next = { ...o.displayNames };
      if (c.displayName) next[c.name] = c.displayName;
      else delete next[c.name];
      return { ...o, displayNames: next };
    }
    case "hide":
      return {
        ...o,
        hidden: c.hidden ? [...new Set([...o.hidden, c.name])] : o.hidden.filter((n) => n !== c.name),
      };
  }
}

export type Resolution =
  | { name: string; via: "exact" | "alias" | "first-name" }
  /** A first name that matches more than one trainer. Kept as its own group. */
  | { name: string; via: "ambiguous"; candidates: string[] };

/**
 * Resolves one written trainer string to the name its tickets should be grouped under:
 * an administrator's alias, then a built-in correction, then an exact roster match, then a
 * unique first name. Anything else is returned unchanged so an unknown trainer still gets a card.
 */
export function resolveTrainer(raw: string, overrides: TrainerOverrides = EMPTY_OVERRIDES): Resolution {
  const written = raw.trim().replace(/\s+/g, " ");
  if (!written) return { name: "", via: "exact" };
  const lower = written.toLowerCase();

  const alias = overrides.aliases[lower] ?? BUILT_IN_ALIASES[lower];
  if (alias) return { name: alias, via: "alias" };

  const known = knownTrainerNames();
  const exact = known.find((name) => name.toLowerCase() === lower);
  if (exact) return { name: exact, via: "exact" };

  if (!written.includes(" ")) {
    const candidates = known.filter((name) => firstName(name) === lower);
    if (candidates.length === 1) return { name: candidates[0], via: "first-name" };
    if (candidates.length > 1) return { name: written, via: "ambiguous", candidates };
  }
  return { name: written, via: "exact" };
}

export function displayNameFor(canonical: string, overrides: TrainerOverrides = EMPTY_OVERRIDES): string {
  return overrides.displayNames[canonical] || canonical;
}

export function cityFor(canonical: string, overrides: TrainerOverrides = EMPTY_OVERRIDES): TrainerCity {
  return overrides.cities[canonical] || defaultCityFor(canonical);
}

/** City order on the page: Mumbai first (the larger group), then Bengaluru. */
export const CITY_ORDER: TrainerCity[] = ["Mumbai", "Bengaluru"];

// === Deriving profiles from tickets =========================================

/** Categories whose tickets count as member feedback about a trainer. */
export const FEEDBACK_CATEGORIES = ["Trainer Feedback", "Class Experience"] as const;

const isFeedback = (t: Ticket) => (FEEDBACK_CATEGORIES as readonly string[]).includes(t.category);
const PRAISE = /compliment|praise|appreciat|kudos|shout-?out|positive feedback|loved|great class/i;
const isCompliment = (t: Ticket) => PRAISE.test([t.subcategory, t.title, ...(t.tags ?? [])].join(" "));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The trainer names a ticket mentions, as written. */
export function trainerMentions(t: Ticket): string[] {
  const out = new Set<string>();
  // The intake form writes "• Trainer: Name" into the description.
  for (const m of t.description.matchAll(/^[\s•*-]*Trainers?\s*:\s*(.+)$/gim)) {
    for (const part of m[1].split(/,|&|\band\b/i)) {
      const name = part.replace(/\(.*?\)/g, "").trim();
      if (name) out.add(name);
    }
  }
  if (!out.size && isFeedback(t)) {
    const text = `${t.title}\n${t.description}`;
    for (const name of knownTrainerNames()) {
      if (new RegExp(`\\b${escapeRe(name)}\\b`, "i").test(text)) out.add(name);
    }
    // Titles read "Subcategory - Trainer - Studio", so a bare first name there is deliberate.
    if (!out.size) {
      for (const seg of t.title.split(/\s[\u2014\u2013-]\s/)) {
        const w = seg.trim();
        if (w && !w.includes(" ") && knownTrainerNames().some((n) => firstName(n) === w.toLowerCase())) out.add(w);
      }
    }
  }
  return [...out];
}

export function performanceBand(score: number): string {
  if (score < 65) return "High coaching priority";
  if (score < 80) return "Development watch";
  return "On-track performance";
}
export const bandTone = (band: string) =>
  band === "On-track performance" ? "green" : band === "Development watch" ? "amber" : "red";

export type TrainerBuild = {
  /** Visible trainers, busiest first. */
  trainers: Trainer[];
  hidden: { name: string; displayName: string; totalTickets: number }[];
  roster: string[];
  /** Feedback tickets per category, for the hero's source badges. */
  sources: { label: string; count: number }[];
};

/** Builds every trainer's profile from the ticket list. */
export function buildTrainerProfiles(
  tickets: readonly Ticket[],
  overrides: TrainerOverrides = EMPTY_OVERRIDES,
  assessments: readonly (Assessment & { trainerName: string })[] = [],
): TrainerBuild {
  const byTrainer = new Map<string, Ticket[]>(knownTrainerNames().map((n) => [n, []]));
  // Assessments by resolved trainer, newest first. A trainer with assessments but no
  // tickets still gets a profile.
  const assessedBy = new Map<string, Assessment[]>();
  for (const a of [...assessments].sort((x, y) => y.submittedAt.localeCompare(x.submittedAt))) {
    const name = resolveTrainer(a.trainerName, overrides).name ?? a.trainerName;
    if (!assessedBy.has(name)) assessedBy.set(name, []);
    assessedBy.get(name)!.push(a);
    if (!byTrainer.has(name)) byTrainer.set(name, []);
  }
  const spellings = new Map<string, Set<string>>();
  const ambiguous = new Map<string, string[]>();
  const newestFirst = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const t of newestFirst) {
    for (const written of new Set(trainerMentions(t))) {
      const resolved = resolveTrainer(written, overrides);
      if (!resolved.name) continue;
      if (resolved.via === "ambiguous") ambiguous.set(resolved.name, resolved.candidates);
      const list = byTrainer.get(resolved.name);
      if (list) list.push(t);
      else byTrainer.set(resolved.name, [t]);
      if (written !== resolved.name) {
        if (!spellings.has(resolved.name)) spellings.set(resolved.name, new Set());
        spellings.get(resolved.name)!.add(written);
      }
    }
  }

  const profiles: Trainer[] = [...byTrainer.keys()].sort().map((name) => {
    const related = byTrainer.get(name)!;
    const feedbackTickets = related.filter(isFeedback);
    const compliments = feedbackTickets.filter(isCompliment);
    const studioCounts = new Map<string, number>();
    for (const t of related) {
      const studio = t.studioCode ? STUDIO_MAP[t.studioCode]?.name : undefined;
      if (studio) studioCounts.set(studio, (studioCounts.get(studio) ?? 0) + 1);
    }
    const studioSummary = [...studioCounts.entries()]
      .map(([studio, count]) => ({ studio, count }))
      .sort((a, b) => b.count - a.count || a.studio.localeCompare(b.studio));
    const scored = assessedBy.get(name) ?? [];
    const avgScore = scored.length ? Math.round(scored.reduce((n, a) => n + a.score, 0) / scored.length) : null;
    const trainerBand = avgScore === null ? null : performanceBand(avgScore);
    const feedbackRows: FeedbackRow[] = feedbackTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketId,
      title: t.title,
      subcategory: t.subcategory ?? t.category,
      sentiment: isCompliment(t) ? "positive" : null,
      status: t.status,
      createdAt: t.createdAt,
      kind: isCompliment(t) ? "compliment" : "issue",
    }));
    return {
      name,
      displayName: displayNameFor(name, overrides),
      hidden: overrides.hidden.includes(name),
      mergedFrom: [...(spellings.get(name) ?? [])].sort(),
      ambiguousWith: ambiguous.get(name) ?? null,
      totalTickets: related.length,
      assessmentCount: scored.length,
      feedbackCount: feedbackTickets.length,
      complimentCount: compliments.length,
      issueCount: feedbackTickets.length - compliments.length,
      avgScore,
      band: trainerBand,
      bandTone: trainerBand ? bandTone(trainerBand) : "",
      primaryStudio: studioSummary[0]?.studio ?? "Studio not assigned",
      city: cityFor(name, overrides),
      studioSummary,
      latestAssessment: scored[0] ?? null,
      assessments: scored,
      recentFeedback: feedbackRows.slice(0, 8),
      feedback: feedbackRows,
    };
  });
  profiles.sort((a, b) => b.totalTickets - a.totalTickets || a.name.localeCompare(b.name));

  const sources = FEEDBACK_CATEGORIES.map((label) => ({
    label: label as string,
    count: tickets.filter((t) => t.category === label && trainerMentions(t).length > 0).length,
  })).filter((s) => s.count > 0);

  return {
    trainers: profiles.filter((p) => !p.hidden),
    hidden: profiles
      .filter((p) => p.hidden)
      .map((p) => ({ name: p.name, displayName: p.displayName || p.name, totalTickets: p.totalTickets })),
    roster: knownTrainerNames(),
    sources,
  };
}

/** Average of every trainer's score, or null when nobody has been assessed. */
export function orgAverage(trainers: readonly Trainer[]): number | null {
  const scored = trainers.filter((t) => t.avgScore !== null);
  if (!scored.length) return null;
  return Math.round(scored.reduce((n, t) => n + (t.avgScore || 0), 0) / scored.length);
}
