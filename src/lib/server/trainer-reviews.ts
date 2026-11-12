/**
 * Trainer reviews from the four evaluation forms, ported from iris-ai-v2 `lib/trainer-reviews.ts`.
 *
 * Two Fillout forms (Barre, Non-technical) and two Zite apps (Strength Lab, powerCycle). Zite is
 * Fillout's app builder: an app is a "flow", not a form, so the Fillout Forms API cannot read it
 * and the app's own public flow endpoint is used instead.
 *
 * Every source is normalised to one shape and stored in iris.trainer_assessments, which the
 * Trainers tab reads via /api/trainers/assessments. Re-running is safe: each row carries a
 * stable `source_ref` (`fillout:<formId>:<submissionId>` / `zite:<appId>:<rowId>`) with a unique
 * constraint, and the webhook writes the same refs, so a submission that arrives by webhook and
 * is later seen by the poll is stored once.
 */
import type { PoolClient } from "pg";
import { asSystem } from "./db";
import { loadCredentials } from "./integration-vault";
import { band as bandFor } from "@/lib/iris/fillout-assessment";
import { resolveTrainer } from "@/lib/iris/trainer-directory";

export type ReviewSource = { id: string; kind: "fillout-form" | "zite-app"; label: string };

export const TRAINER_REVIEW_SOURCES: ReviewSource[] = [
  { id: "dSw2VkfdGqus", kind: "fillout-form", label: "Training Quality Assessment — Barre" },
  { id: "syTsvPww8nus", kind: "fillout-form", label: "Training Quality Assessment — by staff" },
  { id: "srq1c6n7br", kind: "zite-app", label: "Trainer QA & Assessment — FIT & Lab" },
  { id: "pdtcpzhxas", kind: "zite-app", label: "Feedback Tracker Pro" },
];

export const sourceById = (id: string | null | undefined) => TRAINER_REVIEW_SOURCES.find((s) => s.id === id);

type RubricRow = { category: string; score: number; weightage: number; pct: number };

export type NormalisedReview = {
  sourceRef: string;
  sourceLabel: string;
  trainer: string;
  evaluator: string;
  studio: string;
  sessionName: string;
  at: string;
  score: number | null;
  band: string;
  strengths: string;
  improvements: string;
  coachingPlan: string;
  rubric: RubricRow[];
  answers: { label: string; value: string }[];
};

const str = (v: unknown) => (v == null ? "" : String(v).trim());
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** Neither upstream sends a denominator; the nearest conventional ceiling is used. */
const ceilingFor = (v: number) => (v <= 5 ? 5 : v <= 10 ? 10 : 100);
const prettyLabel = (key: string) =>
  (key.replace(/^score/, "").replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim() || key).replace(/^./, (c) => c.toUpperCase());

const ZITE_RUNNER = "https://workflows.zite.com";
const FILLOUT_API = "https://api.fillout.com/v1/api";

// === Zite ====================================================================

/** True when a payload is a Zite assessment row (what the Zite app's HTTP step should post). */
export function looksLikeZiteRow(payload: unknown): boolean {
  const p = obj(payload);
  const row = obj(p.assessment ?? p.record ?? p.data ?? p);
  return "trainerName" in row && ("totalScore" in row || Object.keys(row).some((k) => /^score[A-Z]/.test(k)));
}

/** One Zite assessment row. `totalScore` is already 0-100 on the app's own scale. */
export function normaliseZiteRow(raw: unknown, source: ReviewSource): NormalisedReview | null {
  const p = obj(raw);
  const r = obj(p.assessment ?? p.record ?? p.data ?? p);
  const id = str(r.id ?? r.recordId);
  const trainer = str(r.trainerName);
  if (!id || !trainer) return null;
  const rubric: RubricRow[] = Object.entries(r)
    .filter(([k, v]) => /^score[A-Z]/.test(k) && Number.isFinite(Number(v)))
    .map(([k, v]) => {
      const n = Number(v);
      const weightage = ceilingFor(n);
      return { category: prettyLabel(k), score: Math.round(n * 10) / 10, weightage, pct: Math.round((n / weightage) * 100) };
    });
  const total = Number(r.totalScore);
  return {
    sourceRef: `zite:${source.id}:${id}`,
    sourceLabel: source.label,
    trainer,
    evaluator: str(r.evaluatorName) || "Not recorded",
    studio: str(r.location),
    sessionName: str(r.sessionName),
    at: str(r.classDate) || str(r.submittedAt),
    score: Number.isFinite(total) ? Math.round(total) : null,
    band: str(r.performanceBand),
    strengths: str(r.keyStrengths),
    improvements: str(r.areasForImprovement),
    coachingPlan: str(r.coachingActionPlan),
    rubric,
    answers: [],
  };
}

async function fetchZite(source: ReviewSource): Promise<NormalisedReview[]> {
  const res = await fetch(`${ZITE_RUNNER}/public/${encodeURIComponent(source.id)}/api/getAssessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: {}, mode: "live" }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${source.label} returned ${res.status}.`);
  return arr(obj(await res.json()).assessments)
    .map((row) => normaliseZiteRow(row, source))
    .filter((r): r is NormalisedReview => r !== null);
}

// === Fillout =================================================================

/** Question types Fillout uses for a scored answer; the Barre labels don't say "score". */
const SCORED_TYPES = new Set(["NumberInput", "StarRating", "Slider", "OpinionScale", "ScaleRating", "Rating", "NumberRating", "Ranking"]);

/**
 * One Fillout submission (API row, or the `submission` of a webhook delivery), scored the v2
 * way: every scored question normalised against its own ceiling and averaged to 0-100.
 */
export function normaliseFilloutSubmission(raw: unknown, source: ReviewSource): NormalisedReview | null {
  const envelope = obj(raw);
  const r = obj(envelope.submission ?? envelope);
  const submissionId = str(r.submissionId ?? envelope.submissionId);
  const answers = arr(r.questions).map((q) => ({ name: str(obj(q).name), type: str(obj(q).type), value: obj(q).value }));
  const pick = (re: RegExp) => answers.find((a) => re.test(a.name) && a.value != null && str(a.value) !== "")?.value;
  const text = (v: unknown) => (Array.isArray(v) ? v.map(str).join(", ") : typeof v === "object" && v ? str(obj(v).name ?? obj(v).value ?? JSON.stringify(v)) : str(v));
  const trainer = text(pick(/trainer\s*name/i) ?? pick(/trainer|instructor/i));
  if (!submissionId || !trainer) return null;
  const scored = answers.filter(
    (a) => typeof a.value === "number" && (SCORED_TYPES.has(a.type) || /\brate|\bscore|rating/i.test(a.name)),
  );
  const rubric: RubricRow[] = scored.map((a) => {
    const n = Number(a.value);
    const weightage = ceilingFor(n);
    return { category: a.name.replace(/^[^\p{L}\p{N}]+/u, "").trim() || a.name, score: n, weightage, pct: Math.round((n / weightage) * 100) };
  });
  const score = rubric.length ? Math.round(rubric.reduce((n, x) => n + x.pct, 0) / rubric.length) : null;
  return {
    sourceRef: `fillout:${source.id}:${submissionId}`,
    sourceLabel: source.label,
    trainer,
    evaluator: text(pick(/evaluated\s*by|evaluator|assessor/i)) || "Not recorded",
    studio: text(pick(/center|centre|studio|location/i)),
    sessionName: text(pick(/level|class\s*(type|format|name)/i)),
    at: text(pick(/class\s*date|^date/i)) || str(r.submissionTime),
    score,
    band: "",
    strengths: text(pick(/strength|what went well/i)),
    improvements: text(pick(/improve|development|focus/i)),
    coachingPlan: text(pick(/coaching|action plan|next steps/i)),
    rubric,
    answers: answers
      .filter((a) => a.value != null && str(a.value) !== "" && !scored.includes(a))
      .map((a) => ({ label: a.name, value: text(a.value) }))
      .slice(0, 200),
  };
}

async function fetchFilloutForm(source: ReviewSource, apiKey: string): Promise<NormalisedReview[]> {
  const out: NormalisedReview[] = [];
  for (let offset = 0; offset < 1000; offset += 150) {
    const res = await fetch(
      `${FILLOUT_API}/forms/${encodeURIComponent(source.id)}/submissions?limit=150&offset=${offset}&sort=desc`,
      { headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30000) },
    );
    if (!res.ok) throw new Error(`${source.label} returned ${res.status} from Fillout.`);
    const rows = arr(obj(await res.json()).responses);
    for (const row of rows) {
      const n = normaliseFilloutSubmission(row, source);
      if (n) out.push(n);
    }
    if (rows.length < 150) break;
  }
  return out;
}

// === Storage =================================================================

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function matchStudio(raw: string, studios: string[]): string | null {
  const k = normKey(raw);
  if (!k) return null;
  return studios.find((s) => normKey(s) === k) ?? studios.find((s) => k.length > 4 && normKey(s).includes(k)) ?? null;
}

export type SaveOutcome = "imported" | "duplicate" | "deleted" | "unmatched-studio";

/** Stores one review. Rows from a studio that isn't ours are the apps' sample data and are skipped. */
export async function saveReview(c: PoolClient, review: NormalisedReview, studios: string[]): Promise<{ outcome: SaveOutcome; id?: string; ticketId?: string }> {
  const dupe = (await c.query("select id from iris.trainer_assessments where source_ref = $1", [review.sourceRef])).rows[0];
  if (dupe) return { outcome: "duplicate", id: dupe.id };
  if ((await deletedRefs(c)).has(review.sourceRef)) return { outcome: "deleted" };
  const studio = matchStudio(review.studio, studios);
  if (!studio) return { outcome: "unmatched-studio" };

  const canonical = resolveTrainer(review.trainer).name || review.trainer;
  const trainer = (
    await c.query(
      `select id, name from iris.trainers
        where lower(name) = lower($1) or lower(coalesce(display_name, '')) = lower($1) or aliases ? $1 or aliases ? $2
        limit 1`,
      [canonical, review.trainer],
    )
  ).rows[0] as { id: string; name: string } | undefined;

  const when = review.at && !Number.isNaN(Date.parse(review.at)) ? new Date(review.at).toISOString() : new Date().toISOString();
  const b = review.score !== null ? bandFor(review.score) : { band: review.band || "Not scored", tone: "" };
  const name = trainer?.name ?? canonical;
  const row = (
    await c.query(
      `insert into iris.trainer_assessments (source_ref, trainer_id, trainer_name, studio, submitted_at, score, band, band_tone, payload)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (source_ref) do nothing returning id`,
      [
        review.sourceRef, trainer?.id ?? null, name, studio, when, review.score, review.band || b.band, b.tone,
        JSON.stringify({
          id: review.sourceRef,
          title: `Trainer assessment · ${name}${review.sessionName ? ` · ${review.sessionName}` : ""}`,
          score: review.score ?? 0, band: review.band || b.band, bandTone: b.tone, studio,
          rubric: review.rubric, answers: review.answers, evaluator: review.evaluator,
          strengths: review.strengths, improvements: review.improvements, coachingPlan: review.coachingPlan,
          sessionName: review.sessionName, sourceLabel: review.sourceLabel, submittedAt: when, createdAt: when,
          summary: [review.strengths && `Key strengths: ${review.strengths}`, review.improvements && `Development areas: ${review.improvements}`]
            .filter(Boolean).join("\n\n"),
        }),
      ],
    )
  ).rows[0];
  let ticketId: string | undefined;
  if (row) {
    ticketId = await createAssessmentTicket(c, review, { name, studio, when, score: review.score, band: review.band || b.band });
    await c.query(
      `update iris.trainer_assessments set ticket_number = $2, payload = payload || jsonb_build_object('ticketNumber', $2::text) where id = $1`,
      [row.id, ticketId],
    );
  }
  if (trainer) {
    await c.query(
      `update iris.trainers t set assessment_count = s.n, avg_score = s.avg, updated_at = now()
         from (select count(*)::int n, round(avg(score))::int avg from iris.trainer_assessments where trainer_id = $1) s
        where t.id = $1`,
      [trainer.id],
    );
  }
  return { outcome: row ? "imported" : "duplicate", id: row?.id, ticketId };
}

/** Assessments under this score need a coaching follow-up, so their ticket stays open. */
const COACHING_THRESHOLD = 65;

/**
 * Files the submission as a Training ticket, as v2 does, so it shows on the board with the
 * rest of the trainer's history. The `trainer-assessment` tag keeps it out of the Trainers
 * tab's member-feedback counts (it is already counted as an assessment). A score that needs
 * coaching stays open for Training; anything else is filed already resolved, so a routine
 * evaluation never sits in someone's queue or trips an SLA.
 */
async function createAssessmentTicket(
  c: PoolClient,
  review: NormalisedReview,
  t: { name: string; studio: string; when: string; score: number | null; band: string },
): Promise<string> {
  const studioCode =
    ((await c.query("select code from iris.studios where name = $1 limit 1", [t.studio])).rows[0]?.code as string | undefined) ?? null;
  const needsCoaching = t.score !== null && t.score < COACHING_THRESHOLD;
  const lines = [
    `• Trainer: ${t.name}`,
    `• Studio: ${t.studio}`,
    review.sessionName && `• Class: ${review.sessionName}`,
    `• Evaluator: ${review.evaluator}`,
    `• Score: ${t.score ?? "not scored"}${t.band ? ` (${t.band})` : ""}`,
    `• Submitted: ${new Date(t.when).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}`,
    `• Source: ${review.sourceLabel}`,
    review.strengths && `\nKey strengths: ${review.strengths}`,
    review.improvements && `\nDevelopment areas: ${review.improvements}`,
    review.coachingPlan && `\nCoaching action plan: ${review.coachingPlan}`,
    review.rubric.length && `\nScorecard:\n${review.rubric.map((r) => `  - ${r.category}: ${r.score}/${r.weightage}`).join("\n")}`,
  ].filter(Boolean);
  const { rows } = await c.query(
    `insert into iris.tickets (title, description, category, subcategory, priority, status, studio_code, department_code,
       tags, source, collected_info, resolution, resolution_summary, resolved_at)
     values ($1, $2, 'Trainer Feedback', 'Trainer Assessment / Evaluation Submission', $3, $4, $5, 'TRN', $6, 'webhook', $7::jsonb, $8, $8, $9)
     returning id, ticket_id`,
    [
      `Trainer assessment · ${t.name}${review.sessionName ? ` · ${review.sessionName}` : ""}`,
      lines.join("\n"),
      needsCoaching ? "P2" : "P3",
      needsCoaching ? "open" : "resolved",
      studioCode,
      ["trainer-assessment", "trainer-evaluation", review.sourceRef.startsWith("zite:") ? "via-zite" : "via-fillout"],
      JSON.stringify({ sourceRef: review.sourceRef, evaluationScore: t.score, evaluator: review.evaluator, sourceLabel: review.sourceLabel }),
      needsCoaching ? null : "Assessment recorded — no follow-up required.",
      needsCoaching ? null : new Date().toISOString(),
    ],
  );
  return rows[0].ticket_id as string;
}

// === Deleted-review tombstones ==============================================

const DELETED_KEY = "trainers:deleted-refs";

async function deletedRefs(c: PoolClient): Promise<Set<string>> {
  const v = (await c.query("select value from iris.app_settings where key = $1", [DELETED_KEY])).rows[0]?.value;
  const refs = obj(v).refs;
  return new Set(Array.isArray(refs) ? refs.filter((r): r is string => typeof r === "string") : []);
}

// === Sync ====================================================================

const SYNC_KEY = "trainer-reviews:sync";
/** How stale the tab may be. Each pass is four upstream calls. */
const SYNC_TTL_MS = 60_000;

export type SyncResult = {
  lastSync: string;
  imported: number;
  sources: { id: string; label: string; total: number; imported: number; skipped: number; unmatched: string[]; error?: string }[];
};

/** Reads all four sources and stores anything not already on file. Safe to call repeatedly. */
export async function syncTrainerReviews(): Promise<SyncResult> {
  const { apiKey, studios } = await asSystem(async (c) => ({
    apiKey: (await loadCredentials(c, "fillout")).values.api_key ?? "",
    studios: (await c.query("select name from iris.studios where is_active")).rows.map((r) => r.name as string),
  }));
  const result: SyncResult = { lastSync: new Date().toISOString(), imported: 0, sources: [] };
  for (const source of TRAINER_REVIEW_SOURCES) {
    const entry: SyncResult["sources"][number] = { id: source.id, label: source.label, total: 0, imported: 0, skipped: 0, unmatched: [] };
    result.sources.push(entry);
    let reviews: NormalisedReview[];
    try {
      if (source.kind === "fillout-form" && !apiKey) throw new Error("No Fillout API key saved under Integrations → Fillout.");
      reviews = source.kind === "zite-app" ? await fetchZite(source) : await fetchFilloutForm(source, apiKey);
    } catch (e) {
      entry.error = e instanceof Error ? e.message : "Could not be read";
      continue;
    }
    entry.total = reviews.length;
    await asSystem(async (c) => {
      for (const review of reviews) {
        const { outcome } = await saveReview(c, review, studios);
        if (outcome === "imported") entry.imported++;
        else if (outcome === "unmatched-studio") {
          if (!entry.unmatched.includes(review.studio || "(blank)")) entry.unmatched.push(review.studio || "(blank)");
        } else entry.skipped++;
      }
    });
    result.imported += entry.imported;
  }
  result.lastSync = new Date().toISOString();
  await asSystem((c) =>
    c.query(
      `insert into iris.app_settings (key, value, category, updated_at) values ($1, $2::jsonb, 'integrations', now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [SYNC_KEY, JSON.stringify({ lastSync: result.lastSync, claimedAt: result.lastSync, sources: result.sources })],
    ),
  ).catch(() => null);
  return result;
}

/** Claims the next pass atomically so concurrent requests on any instance agree on one winner. */
async function claimSyncSlot(): Promise<boolean> {
  return asSystem(async (c) => {
    const now = new Date();
    const r = await c.query(
      `insert into iris.app_settings (key, value, category, updated_at) values ($1, '{}'::jsonb, 'integrations', $2)
       on conflict (key) do update set updated_at = excluded.updated_at
        where iris.app_settings.updated_at < $3
       returning key`,
      [SYNC_KEY, now, new Date(now.getTime() - SYNC_TTL_MS)],
    );
    return r.rowCount! > 0;
  });
}

let inflight: Promise<SyncResult> | undefined;
/** Sync unless one ran within the last minute. Meant for `after()`, not the response path. */
export async function syncTrainerReviewsThrottled(): Promise<SyncResult | null> {
  if (inflight) return inflight;
  if (!(await claimSyncSlot())) return null;
  inflight = syncTrainerReviews().finally(() => {
    inflight = undefined;
  });
  return inflight;
}

export async function lastSyncAt(): Promise<string | null> {
  const v = await asSystem(async (c) => (await c.query("select value from iris.app_settings where key = $1", [SYNC_KEY])).rows[0]?.value);
  const at = obj(v).lastSync;
  return typeof at === "string" ? at : null;
}
