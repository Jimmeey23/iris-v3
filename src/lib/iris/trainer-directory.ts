/**
 * Trainer directory + reviews data — ported from the reference iris-ai-v2 repo.
 *
 * The reference repo pulls trainers from a database and assessments from
 * Fillout/Zite forms. This IRIS dashboard is a static front-end demo, so we
 * use the same trainer roster the reference repo ships in `constants.ts`
 * and generate deterministic mock assessments/feedback for each trainer so
 * the score dial, trend chart, radar chart, KPI tiles and review cards all
 * have realistic data to display.
 *
 * The 21 trainers and the city assignment logic come straight from
 * `lib/trainer-directory.ts` in the reference repo (Bengaluru is decided by
 * first name: Kajol, Pushyank, Shruti, Siddhartha, Chaitanya). Everybody
 * else is Mumbai.
 */

export type TrainerCity = "Mumbai" | "Bengaluru";

export type RubricRow = {
  category: string;
  score: number;
  weightage: number;
  pct: number;
};

export type Assessment = {
  id: number;
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
  id: number;
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
};

// === Trainer roster (from reference repo's constants.ts) ====================
export const TRAINERS = [
  "Anisha Shah",
  "Anmol Sharma",
  "Atulan Purohit",
  "Bret Saldanha",
  "Cauveri Vikrant",
  "Chaitanya Nahar",
  "Kajol Kanchan",
  "Karan Bhatia",
  "Karanvir Bhatia",
  "Mrigakshi Jaiswal",
  "Pranjali Jain",
  "Pushyank Nahar",
  "Raunak Khemuka",
  "Reshma Sharma",
  "Richard D'Costa",
  "Rohan Dahima",
  "Shruti Kulkarni",
  "Siddhartha Kusuma",
  "Simonelle De Vitre",
  "Vivaran Dhasmana",
  "Siya Mukund",
] as const;

// === City assignment (from reference repo's trainer-directory.ts) ============
const BENGALURU_FIRST_NAMES = new Set([
  "kajol",
  "pushyank",
  "shruti",
  "siddhartha",
  "chaitanya",
]);

export function defaultCityFor(name: string): TrainerCity {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return BENGALURU_FIRST_NAMES.has(first) ? "Bengaluru" : "Mumbai";
}

// === Studios (city → studios) ===============================================
const MUMBAI_STUDIOS = ["Kwality House", "Supreme HQ"];
const BENGALURU_STUDIOS = ["Kenkere House"];

function studiosForCity(city: TrainerCity): string[] {
  return city === "Bengaluru" ? BENGALURU_STUDIOS : MUMBAI_STUDIOS;
}

// === Deterministic PRNG (so mock data is stable across renders) =============
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// === Rubric categories (Barre assessment from reference repo) ===============
const RUBRIC_CATEGORIES: Array<{ category: string; weightage: number }> = [
  { category: "Pre-Class Setup & Vibe", weightage: 10 },
  { category: "Cueing & Instruction", weightage: 15 },
  { category: "Demonstration & Form", weightage: 15 },
  { category: "Music & Tempo", weightage: 10 },
  { category: "Class Flow & Pacing", weightage: 12 },
  { category: "Member Corrections", weightage: 13 },
  { category: "Energy & Presence", weightage: 10 },
  { category: "Safety & Modifications", weightage: 15 },
];

const EVALUATORS = [
  "Tara Kapoor",
  "Maya Sharma",
  "Reyaan Malhotra",
  "Studio Director",
  "Front Desk Lead",
];

const SESSION_NAMES = [
  "Barre Class — Beginner",
  "Cardio Barre — Intermediate",
  "Sculpt & Tone",
  "Advanced Barre",
  "Stretch & Restore",
  "Power Barre — Advanced",
  "Barre Express",
];

const STRENGTH_TEMPLATES = [
  "Strong command of the room; warm, encouraging tone throughout the class. Members visibly engaged from the warm-up.",
  "Excellent music selection that matched the choreography tempo. Clean transitions between sections kept the energy high.",
  "Confident demonstration of complex sequences. Gave clear, layered cues that beginners could follow.",
  "Great rapport with the regular members; remembered names and offered personalised encouragement.",
  "Held the space well — pacing was deliberate and the cooldown landed exactly on time.",
];

const IMPROVEMENT_TEMPLATES = [
  "Could offer more modifications for members with wrist or knee sensitivity. Demonstrate the regression alongside the progression.",
  "Music volume dipped during the strength section — check the mix before the next class.",
  "Some members in the back row were missing the timing cues; consider moving around the room more.",
  "A couple of form corrections missed — be more proactive with hands-on adjustments during the thigh section.",
  "Final stretch felt rushed. Add 30 seconds to the cooldown so members don't feel they're being pushed out.",
];

const COACHING_PLAN_TEMPLATES = [
  "Focus the next two weeks on modification cues — pair with a senior trainer for shadow teaching during the 6 PM class.",
  "Review the music playlist for the next class with the Studio Operations Manager; align tempo to the choreography notes.",
  "Schedule a 30-minute form-correction refresher with the Training Manager before the next Advanced Barre.",
  "Add a pre-class walkthrough to confirm mic, music, and equipment 10 minutes before start time.",
  "Practice the cooldown sequence pacing in the next peer review session; aim for the full 5-minute restore.",
];

const COMPLIMENT_TITLES = [
  "Member praised the instructor's energy",
  "Positive feedback on the music selection",
  "Member complimented the corrections they received",
  "Member said the class was the best they've taken this month",
  "Regular member mentioned how welcome they always feel",
];

const ISSUE_TITLES = [
  "Member felt the class was too fast",
  "Complaint about insufficient modifications",
  "Member said the mic was cutting out",
  "Member mentioned the cooldown was too short",
  "Member noted the instructor seemed distracted",
];

const SUBCATEGORIES = [
  "Class Experience",
  "Trainer Feedback",
  "Audio Issue",
  "Scheduling",
];

// === Build a deterministic assessment for a trainer =========================
function buildAssessment(
  trainer: string,
  index: number,
  rng: () => number,
): Assessment {
  const city = defaultCityFor(trainer);
  const studios = studiosForCity(city);
  const studio = pick(rng, studios);
  const evaluator = pick(rng, EVALUATORS);
  const sessionName = pick(rng, SESSION_NAMES);

  // Generate per-category scores in the 60-95 range, slightly correlated
  // with the trainer's overall tendency.
  const trainerHash = hashStr(trainer);
  const tendency = 70 + (trainerHash % 20); // 70-89 baseline
  const rubric: RubricRow[] = RUBRIC_CATEGORIES.map((c) => {
    const noise = Math.floor(rng() * 16) - 6; // -6 to +9
    const scoreRaw = Math.max(50, Math.min(100, tendency + noise));
    const score = Math.round((scoreRaw / 100) * c.weightage * 10) / 10;
    const pct = Math.round((score / c.weightage) * 100);
    return {
      category: c.category,
      score,
      weightage: c.weightage,
      pct,
    };
  });

  // Weighted overall score
  const totalWeight = rubric.reduce((n, r) => n + r.weightage, 0);
  const totalScore = rubric.reduce((n, r) => n + r.score, 0);
  const score = Math.round((totalScore / totalWeight) * 100);

  const band =
    score >= 90 ? "Exceptional" :
    score >= 80 ? "Good" :
    score >= 70 ? "Average" :
    score >= 60 ? "Poor" : "Needs help";
  const bandTone =
    score >= 80 ? "green" :
    score >= 65 ? "amber" : "red";

  // Generate the submitted timestamp — most recent first, ~30-45 days apart
  const daysAgo = 30 + index * 38;
  const submittedAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

  const sourceLabels = [
    "Training Quality Assessment — Barre",
    "Training Quality Assessment — by staff",
    "Trainer QA & Assessment — FIT & Lab",
    "Feedback Tracker Pro",
  ];

  const ticketNum = `IRIS-2026-${String(1400 + index + hashStr(trainer) % 200).padStart(4, "0")}`;

  const strengths = pick(rng, STRENGTH_TEMPLATES);
  const improvements = pick(rng, IMPROVEMENT_TEMPLATES);
  const coachingPlan = pick(rng, COACHING_PLAN_TEMPLATES);

  return {
    id: trainerHash * 100 + index,
    ticketNumber: ticketNum,
    studio: `${studio}, ${city}`,
    createdAt: submittedAt,
    submittedAt,
    score,
    evaluator,
    title: `${sessionName} — assessment`,
    band,
    bandTone,
    sourceLabel: pick(rng, sourceLabels),
    sessionName,
    strengths,
    improvements,
    coachingPlan,
    summary: `${trainer}'s ${sessionName.toLowerCase()} on ${new Date(submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Scored ${score}% (${band}).`,
    rubric,
    answers: [
      { label: "Trainer", value: trainer },
      { label: "Session", value: sessionName },
      { label: "Studio", value: `${studio}, ${city}` },
      { label: "Evaluator", value: evaluator },
      { label: "Submitted", value: new Date(submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
      { label: "Overall band", value: band },
    ],
  };
}

function buildFeedback(
  trainer: string,
  index: number,
  rng: () => number,
  kind: "compliment" | "issue",
): FeedbackRow {
  const city = defaultCityFor(trainer);
  const studios = studiosForCity(city);
  const studio = pick(rng, studios);
  const daysAgo = Math.floor(rng() * 60) + 1;
  const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const titles = kind === "compliment" ? COMPLIMENT_TITLES : ISSUE_TITLES;
  return {
    id: hashStr(trainer) * 1000 + index + (kind === "compliment" ? 0 : 500),
    ticketNumber: `IRIS-2026-${String(1500 + index + hashStr(trainer) % 200).padStart(4, "0")}`,
    title: pick(rng, titles),
    subcategory: pick(rng, SUBCATEGORIES),
    sentiment: kind === "compliment" ? "positive" : "negative",
    status: pick(rng, ["open", "resolved", "closed"]),
    createdAt,
    kind,
  };
}

// === Build the full trainer roster with assessments + feedback ==============
function buildTrainer(name: string): Trainer {
  const seed = hashStr(name);
  const rng = mulberry32(seed);
  const city = defaultCityFor(name);
  const studios = studiosForCity(city);

  // 3-7 assessments per trainer, oldest first
  const assessmentCount = 3 + Math.floor(rng() * 5);
  const assessments: Assessment[] = [];
  for (let i = 0; i < assessmentCount; i++) {
    assessments.push(buildAssessment(name, assessmentCount - 1 - i, rng));
  }
  assessments.sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));

  const scored = assessments.filter((a) => a.score > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((n, a) => n + a.score, 0) / scored.length)
    : null;

  const band = avgScore === null
    ? null
    : avgScore >= 90 ? "Exceptional"
    : avgScore >= 80 ? "Good"
    : avgScore >= 70 ? "Average"
    : avgScore >= 65 ? "Developing"
    : "Needs focus";
  const bandTone = avgScore === null
    ? ""
    : avgScore >= 80 ? "green"
    : avgScore >= 65 ? "amber" : "red";

  // Feedback rows
  const complimentCount = Math.floor(rng() * 12);
  const issueCount = Math.floor(rng() * 4);
  const feedback: FeedbackRow[] = [];
  for (let i = 0; i < complimentCount; i++) {
    feedback.push(buildFeedback(name, i, rng, "compliment"));
  }
  for (let i = 0; i < issueCount; i++) {
    feedback.push(buildFeedback(name, i + 20, rng, "issue"));
  }
  feedback.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  // Studio summary
  const studioSummary: { studio: string; count: number }[] = studios.map((s) => ({
    studio: s,
    count: 0,
  }));
  for (const a of assessments) {
    if (a.studio) {
      const studioName = a.studio.split(",")[0].trim();
      const entry = studioSummary.find((s) => s.studio === studioName);
      if (entry) entry.count++;
    }
  }

  const latestAssessment = assessments[assessments.length - 1] ?? null;
  const totalTickets = Math.floor(rng() * 14) + 1;

  return {
    name,
    totalTickets,
    assessmentCount: assessments.length,
    feedbackCount: feedback.length,
    complimentCount,
    issueCount,
    avgScore,
    band,
    bandTone,
    primaryStudio: studios[0],
    city,
    studioSummary,
    latestAssessment,
    assessments,
    recentFeedback: feedback.slice(0, 6),
  };
}

/** All trainers, fully built with assessments + feedback. */
export const TRAINERS_FULL: Trainer[] = TRAINERS.map(buildTrainer);

/** The org-wide average across every trainer with a score. */
export const ORG_AVG: number | null = (() => {
  const withScores = TRAINERS_FULL.filter((t) => t.avgScore !== null);
  if (!withScores.length) return null;
  return Math.round(
    withScores.reduce((n, t) => n + (t.avgScore || 0), 0) / withScores.length,
  );
})();
