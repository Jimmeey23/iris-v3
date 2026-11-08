/**
 * Fillout trainer-assessment submission → IRIS assessment record.
 *
 * Ported from iris-ai-v2 (lib/fillout.ts + the assessment rubrics in
 * lib/guided-templates.ts). Pure: no I/O, so the parsing and scoring are unit
 * tested. The webhook route does the database work.
 *
 * Scoring: every rubric criterion is answered 0–5 (or 0–weight when the form
 * scores "by weight"); the assessment score is the weighted percentage.
 */

export type RubricFormat = "PowerCycle" | "Strength / FIT" | "Barre" | "Non-technical";

/** [criterion, weight] - weights per format sum to 100. */
export const RUBRICS: Record<RubricFormat, [string, number][]> = {
  PowerCycle: [
    ["Attendance & bike fill rate", 12.5], ["Retention & repeat riders", 12.5], ["Member connection", 12.5],
    ["Member feedback", 12.5], ["Motivation & USP", 8], ["Musicality & beat matching", 10],
    ["Energy, vocals & command", 10], ["Programming & sequencing", 8], ["Safety, setup & form", 8],
    ["Work ethics & core values", 6],
  ],
  "Strength / FIT": [
    ["Pre-class setup", 8], ["Verbal cues", 8], ["Visual demonstrations", 8], ["Injury modifications", 8],
    ["Level-appropriate modifications", 8], ["Motivation & connection", 8], ["Music choices", 7],
    ["Space & equipment", 7], ["Time management & flow", 7], ["Use of member names", 7], ["Overall energy", 8],
    ["Mindful moment", 8], ["Post-class spiel", 8],
  ],
  Barre: [
    ["Client attendance", 12.5], ["Client retention", 12.5], ["Client outreach, communication and connection", 12.5],
    ["Client feedback", 12.5], ["Mindful moment / USP integration / Motivation", 8], ["Musicality", 8],
    ["Energy and vocals", 8], ["Choreography and sequencing", 8], ["Learning styles and use of names", 8],
    ["Classes, workshops, meetings and core values", 10],
  ],
  "Non-technical": [["Overall class experience", 5]],
};

export type Answer = { label: string; value: string };
export type RubricRow = { category: string; weightage: number; score: number; pct: number };
export type ParsedAssessment = {
  formId: string;
  submissionId: string;
  sourceRef: string;
  format: RubricFormat;
  trainer: string;
  studio: string;
  sessionName: string;
  evaluator: string;
  submittedAt: string;
  rubric: RubricRow[];
  score: number;
  band: string;
  bandTone: string;
  strengths: string;
  improvements: string;
  coachingPlan: string;
  answers: Answer[];
};

export class FilloutError extends Error {}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function clean(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(clean).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = obj(v);
    return clean(o.value ?? o.name ?? o.label ?? o.text ?? o.answer);
  }
  return String(v).trim();
}

/** Every question → answer pair in a Fillout submission, however deeply nested. */
export function answerPairs(input: unknown, depth = 0): Answer[] {
  if (depth > 8 || !input || typeof input !== "object") return [];
  if (Array.isArray(input)) return input.flatMap((i) => answerPairs(i, depth + 1));
  const r = obj(input);
  const label = clean(r.name || r.label || r.title || r.question);
  const value = clean(r.value ?? r.answer ?? r.text);
  const found = label && value && !/^(id|type)$/i.test(label) ? [{ label, value }] : [];
  // Zite (and Fillout "record" payloads) send flat "Question label": value pairs.
  const flat = depth > 0 || label
    ? []
    : Object.entries(r)
        .filter(([k, v]) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean") && !/^(id|_id|type|formid|form_id|submissionid|submission_id|recordid|record_id|createdat|created_at|updatedat|updated_at|submissiontime|lastupdatedat)$/i.test(k.replace(/\s/g, "")))
        .map(([k, v]) => ({ label: k, value: String(v).trim() }))
        .filter((a) => a.value !== "");
  const nested = Object.entries(r)
    .filter(([k, v]) => !["value", "answer", "text"].includes(k) && v && typeof v === "object")
    .flatMap(([, v]) => answerPairs(v, depth + 1));
  return [...found, ...flat, ...nested];
}

export function band(score: number): { band: string; tone: string } {
  if (score >= 90) return { band: "Exceptional", tone: "green" };
  if (score >= 80) return { band: "Good", tone: "green" };
  if (score >= 70) return { band: "Average", tone: "amber" };
  return { band: "Poor", tone: score < 60 ? "red" : "amber" };
}

function detectFormat(answers: Answer[], requested?: string): RubricFormat {
  const want = norm(requested ?? "");
  const byName = (Object.keys(RUBRICS) as RubricFormat[]).find((f) => want && norm(f) === want);
  if (byName) return byName;
  const format = answers.find((a) => /class (type|format)|format|discipline/i.test(a.label))?.value ?? "";
  if (/power\s*cycle|cycle|spin/i.test(format)) return "PowerCycle";
  if (/barre/i.test(format)) return "Barre";
  if (/strength|fit|lab|hiit/i.test(format)) return "Strength / FIT";
  // No format answer: pick the rubric whose criteria the form actually answered most of.
  const labels = new Set(answers.map((a) => norm(a.label)));
  const best = (Object.keys(RUBRICS) as RubricFormat[])
    .map((f) => [f, RUBRICS[f].filter(([l]) => labels.has(norm(l))).length] as const)
    .sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : "Non-technical";
}

export type ParseOptions = {
  /** Field map from Integrations: {"rating0": "Your Fillout question label", ...}. */
  fieldMap?: Record<string, string>;
  /** "5" (each criterion 0–5, default) or "weight" (each criterion 0–its weight). */
  scoreScale?: string;
  /** Studio names IRIS knows, to normalise the answer. */
  studios?: string[];
};

export function parseFilloutAssessment(raw: unknown, opts: ParseOptions & { sourceId?: string } = {}): ParsedAssessment {
  const envelope = obj(raw);
  const submission = obj(envelope.submission ?? envelope.record ?? obj(envelope.data).submission ?? envelope.data ?? raw);
  const submissionId = clean(
    envelope.submissionId ?? submission.submissionId ?? envelope.recordId ?? submission.recordId ?? submission.id ?? envelope.id,
  );
  // Zite flows don't name a form: the webhook URL carries ?source=<app id> instead.
  const formId = clean(envelope.formId ?? submission.formId ?? obj(envelope.form).id ?? envelope.appId ?? opts.sourceId);
  if (!submissionId || !formId) {
    throw new FilloutError("The payload has no submission/record id, or no form id (add ?source=<form or app id> to the webhook URL).");
  }

  const answers = answerPairs(submission);
  const find = (re: RegExp) => answers.find((a) => re.test(a.label))?.value ?? "";
  const exact = (label: string) => answers.find((a) => norm(a.label) === norm(label))?.value;

  const trainer = find(/^(instructor|trainer)( name| assessed)?$/i) || find(/trainer|instructor/i);
  if (!trainer) throw new FilloutError("No trainer name was found in the submission.");
  const studioRaw = find(/studio|location/i);
  const studio =
    opts.studios?.find((s) => norm(s) === norm(studioRaw)) ??
    opts.studios?.find((s) => studioRaw.length > 4 && norm(s).includes(norm(studioRaw))) ??
    studioRaw;

  const format = detectFormat(answers, clean(envelope.format ?? envelope.templateId).replace(/^trainer-assessment-\d$/, ""));
  const byWeight = opts.scoreScale === "weight";
  const rubric: RubricRow[] = RUBRICS[format].map(([category, weight], i) => {
    const label = opts.fieldMap?.[`rating${i}`] ?? category;
    const answer = exact(label);
    if (answer === undefined) {
      throw new FilloutError(`Missing a score for "${category}". Map it under Integrations → Fillout → field map ("rating${i}").`);
    }
    const n = Number(answer.match(/-?\d+(\.\d+)?/)?.[0]);
    if (!Number.isFinite(n)) throw new FilloutError(`"${category}" isn't a number: ${answer.slice(0, 40)}`);
    const out5 = byWeight ? (n / weight) * 5 : n;
    if (out5 < 0 || out5 > 5) throw new FilloutError(`"${category}" is outside the score scale (${byWeight ? `0–${weight}` : "0–5"}).`);
    return {
      category,
      weightage: weight,
      score: Math.round((out5 / 5) * weight * 10) / 10,
      pct: Math.round((out5 / 5) * 100),
    };
  });
  const totalWeight = rubric.reduce((n, r) => n + r.weightage, 0);
  const score = Math.round((rubric.reduce((n, r) => n + (r.pct / 100) * r.weightage, 0) / totalWeight) * 100);
  const b = band(score);
  const submittedAt = clean(submission.submissionTime ?? submission.lastUpdatedAt ?? submission.createdAt) || new Date().toISOString();

  return {
    formId,
    submissionId,
    sourceRef: `fillout:${formId}:${submissionId}`,
    format,
    trainer,
    studio,
    sessionName: find(/session|class name/i) || `${format} class`,
    evaluator: find(/evaluator|assessor|reviewed by|assessed by/i) || "Not provided in form",
    submittedAt: Number.isNaN(Date.parse(submittedAt)) ? new Date().toISOString() : new Date(submittedAt).toISOString(),
    rubric,
    score,
    band: b.band,
    bandTone: b.tone,
    strengths: find(/strength|positive|went well/i),
    improvements: find(/improvement|development|focus area/i),
    coachingPlan: find(/coaching|action plan|goals|next steps/i),
    answers: answers.slice(0, 200),
  };
}
