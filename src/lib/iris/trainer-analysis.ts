import type { Trainer } from "./trainer-directory";

/**
 * Executive analysis of one trainer, ported from v2's /api/trainers/[id]/analysis.
 * `localAnalysis` is pure and runs in the browser (instant, no server cost); the server
 * may refine the wording with AI once per assessment set and cache it (see
 * /api/trainers/analysis). `analysisSignature` changes only when the evidence does.
 */

export type TrainerAnalysis = {
  headline: string;
  narrative: string;
  strengths: string[];
  priorities: string[];
  coachingPlan: { horizon: string; action: string }[];
  trajectory: string;
  risk: "high" | "watch" | "stable" | "rising";
  engine: string;
};

export type AnalysisFacts = {
  name: string;
  scores: number[];
  band: string;
  rubric: { category: string; pct: number }[];
  positives: number;
  negatives: number;
  assessments: number;
  latestNotes: { strengths: string; improvements: string; coachingPlan: string };
};

function linearSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den ? num / den : 0;
}

export function analysisFacts(trainer: Trainer): AnalysisFacts {
  const scored = [...trainer.assessments]
    .filter((a) => a.score > 0)
    .sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));
  const map = new Map<string, { s: number; w: number }>();
  for (const a of scored) {
    for (const r of a.rubric) {
      const cur = map.get(r.category) ?? { s: 0, w: 0 };
      cur.s += r.score;
      cur.w += r.weightage;
      map.set(r.category, cur);
    }
  }
  const last = scored[scored.length - 1];
  return {
    name: trainer.displayName || trainer.name,
    scores: scored.map((a) => a.score),
    band: last?.band ?? trainer.band ?? "Not assessed",
    rubric: [...map.entries()].map(([category, v]) => ({ category, pct: v.w ? Math.round((v.s / v.w) * 100) : 0 })),
    positives: trainer.complimentCount,
    negatives: trainer.issueCount,
    assessments: scored.length,
    latestNotes: {
      strengths: last?.strengths ?? "",
      improvements: last?.improvements ?? "",
      coachingPlan: last?.coachingPlan ?? "",
    },
  };
}

/** Changes only when a scored assessment or a feedback ticket is added. */
export function analysisSignature(trainer: Trainer): string {
  const ids = trainer.assessments.map((a) => a.id).sort().join(",");
  return `${trainer.assessments.length}:${trainer.feedbackCount}:${ids.length}:${ids.slice(-80)}`;
}

export function localAnalysis(f: AnalysisFacts): TrainerAnalysis {
  const slope = linearSlope(f.scores);
  const latest = f.scores[f.scores.length - 1] ?? 0;
  const avg = f.scores.length ? Math.round(f.scores.reduce((a, b) => a + b, 0) / f.scores.length) : 0;
  const projected = Math.max(0, Math.min(100, Math.round(latest + slope)));
  const s1 = Math.round(slope * 10) / 10;

  if (!f.scores.length) {
    return {
      headline: `${f.name} has not been formally assessed yet`,
      narrative: `No scored evaluation is on file. ${f.negatives ? `${f.negatives} concern${f.negatives === 1 ? "" : "s"} and ` : ""}${f.positives} compliment${f.positives === 1 ? "" : "s"} have been logged by members.`,
      strengths: [],
      priorities: ["Schedule a baseline assessment"],
      coachingPlan: [
        { horizon: "This week", action: "Book a full rubric observation to establish a baseline." },
        { horizon: "This month", action: "Review member feedback with the trainer and agree first goals." },
        { horizon: "Next review", action: "Reassess against the baseline." },
      ],
      trajectory: "No trend yet",
      risk: f.negatives > f.positives ? "watch" : "stable",
      engine: "IRIS analysis (local)",
    };
  }

  const risk: TrainerAnalysis["risk"] =
    latest < 65 || projected < 65 ? "high" : slope < -2 ? "watch" : slope > 2 ? "rising" : "stable";
  const weakest = [...f.rubric].sort((a, b) => a.pct - b.pct).slice(0, 3);
  const strongest = [...f.rubric].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const direction = slope > 2 ? "improving steadily" : slope < -2 ? "regressing" : "holding steady";

  const headline =
    risk === "high"
      ? `${f.name} needs focused coaching support`
      : risk === "rising"
        ? `${f.name} is on a strong upward trajectory`
        : risk === "watch"
          ? `${f.name} has slipped and warrants a check-in`
          : `${f.name} is performing consistently`;

  const narrative = [
    `${f.name} holds a ${avg}% weighted average across ${f.scores.length} assessment${f.scores.length === 1 ? "" : "s"}, with the most recent at ${latest}% (${f.band}).`,
    f.scores.length > 1
      ? `The trajectory is ${direction} at ${s1 >= 0 ? "+" : ""}${s1} points per review, projecting roughly ${projected}% at the next assessment.`
      : "A second assessment is needed before a trend can be read.",
    f.negatives > 0
      ? `Members logged ${f.negatives} concern${f.negatives === 1 ? "" : "s"} against ${f.positives} compliment${f.positives === 1 ? "" : "s"}, which ${f.negatives > f.positives ? "corroborates" : "partially offsets"} the rubric picture.`
      : f.positives > 0
        ? `Member feedback is entirely positive: ${f.positives} compliment${f.positives === 1 ? "" : "s"} and no concerns.`
        : "No member feedback has been logged against this trainer yet.",
  ].join(" ");

  return {
    headline,
    narrative,
    strengths: strongest.map((s) => `${s.category}: sustaining ${s.pct}% attainment`),
    priorities: weakest.map((s) => `${s.category} at ${s.pct}%: the largest gap to close`),
    coachingPlan: [
      { horizon: "This week", action: weakest[0] ? `Observe one class focused solely on ${weakest[0].category.toLowerCase()}.` : "Run a standard class observation." },
      { horizon: "This month", action: weakest[1] ? `Pair with a peer strong in ${weakest[1].category.toLowerCase()} and co-teach once.` : "Set two measurable rubric targets." },
      { horizon: "Next review", action: `Target ${Math.min(100, Math.max(latest + 8, 75))}% overall, with no criterion below 70%.` },
    ],
    trajectory: f.scores.length > 1 ? `${s1 >= 0 ? "+" : ""}${s1} pts/review · projecting ${projected}%` : `${latest}% · single review`,
    risk,
    engine: "IRIS analysis (local)",
  };
}
