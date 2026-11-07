"use client";

import * as React from "react";
import { getTrainerImage } from "@/lib/iris/constants";
import { TrainerPhoto } from "./trainer-photo";
import {
  type Trainer,
  type Assessment,
  type RubricRow,
} from "@/lib/iris/trainer-directory";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const scoreColor = (v: number) =>
  v >= 80 ? "#34c759" : v >= 65 ? "#ff9500" : "#ff3b30";
const scoreTone = (v: number) =>
  v >= 80 ? "green" : v >= 65 ? "amber" : "red";
const toneVar = (tone: string) =>
  tone === "green" ? "#34c759"
  : tone === "amber" ? "#ff9500"
  : tone === "red" ? "#ff3b30"
  : "var(--primary)";

/** indiaDate from reference repo — formats in Asia/Kolkata timezone. */
function indiaDate(v: unknown, short = false): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    ...(short ? {} : { year: "numeric", hour: "numeric", minute: "2-digit" }),
  }).format(d);
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Section({
  index, title, subtitle, action, children,
}: {
  index: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="tr-section">
      <header className="tr-section-head">
        <span className="tr-index" aria-hidden>{index}</span>
        <div style={{ minWidth: 0 }}>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </header>
      <div className="tr-section-body">{children}</div>
    </section>
  );
}

function ScoreDial({ value, size = 104 }: { value: number; size?: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="tr-dial" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={scoreColor(value)} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - Math.min(100, Math.max(0, value)) / 100 * c}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="tr-dial-label">
        <strong>{value || "—"}</strong>
        <span>score</span>
      </div>
    </div>
  );
}

/** Score per assessment over time. Clicking a point loads that review into the rubric above. */
function TrendChart({
  points, selectedId, onSelect,
}: {
  points: { id: string; at: string; score: number }[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (points.length < 2) {
    return (
      <p style={{ fontSize: 12, textAlign: "center", padding: "24px 0", color: "var(--muted-foreground)" }}>
        Two or more reviews are needed to plot a trend.
      </p>
    );
  }
  const w = 640, h = 150, pad = 22;
  const step = (w - pad * 2) / (points.length - 1);
  const y = (s: number) => h - pad - s / 100 * (h - pad * 2);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(pad + i * step).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="tr-trend" role="img" aria-label="Assessment score trend">
      {[100, 80, 65, 50].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray="3 5" />
          <text x={2} y={y(g) + 3} style={{ fontSize: 10, fill: "var(--muted-foreground)" }}>{g}</text>
        </g>
      ))}
      <line x1={pad} x2={w - pad} y1={y(65)} y2={y(65)} stroke="#ff3b30" strokeOpacity=".45" strokeDasharray="4 3" />
      <path
        d={`${path} L${(pad + (points.length - 1) * step).toFixed(1)},${h - pad} L${pad},${h - pad} Z`}
        fill="var(--primary)" opacity=".08"
      />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const active = p.id === selectedId;
        return (
          <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
            <circle
              cx={pad + i * step}
              cy={y(p.score)}
              r={active ? 5 : 3.5}
              fill={active ? "var(--primary)" : "var(--card)"}
              stroke="var(--primary)" strokeWidth="2"
            />
            <text
              x={pad + i * step}
              y={y(p.score) - 9}
              textAnchor="middle"
              style={{ fontSize: 10, fontWeight: 600, fill: active ? "var(--primary)" : "var(--foreground)" }}
            >
              {p.score}
            </text>
            <text x={pad + i * step} y={h - 5} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted-foreground)" }}>
              {indiaDate(p.at, true)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RubricBar({ category, score, weightage, pct }: RubricRow) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {category}
        </span>
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {score}/{weightage} · {pct}%
        </span>
      </div>
      <div className="tr-bar">
        <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: scoreColor(pct) }} />
      </div>
    </div>
  );
}

/** Criterion attainment against the trainer's own average. */
function RadarChart({ rows, benchmark, size = 280 }: { rows: RubricRow[]; benchmark: number; size?: number }) {
  if (rows.length < 3) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.29, n = rows.length, gutter = 52;
  const angle = (i: number) => i / n * Math.PI * 2 - Math.PI / 2;
  const pt = (i: number, frac: number) => [cx + Math.cos(angle(i)) * r * frac, cy + Math.sin(angle(i)) * r * frac];
  const poly = (frac: (i: number) => number) =>
    rows.map((_, i) => pt(i, Math.max(0, Math.min(1, frac(i)))).join(",")).join(" ");
  const short = (s: string) => s.length > 18 ? s.slice(0, 17).trimEnd() + "…" : s;
  return (
    <svg viewBox={`${-gutter} 0 ${size + gutter * 2} ${size}`} className="tr-radar" role="img" aria-label="Rubric attainment radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={poly(() => f)} fill="none" stroke="var(--border)" />
      ))}
      {rows.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" />;
      })}
      <polygon points={poly(() => benchmark / 100)} fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 4" />
      <polygon points={poly((i) => rows[i].pct / 100)} fill="var(--primary)" fillOpacity=".16" stroke="var(--primary)" strokeWidth="2" />
      {rows.map((row, i) => {
        const [x, y] = pt(i, row.pct / 100);
        return (
          <circle key={row.category} cx={x} cy={y} r="3.5" fill={scoreColor(row.pct)} stroke="var(--card)" strokeWidth="1.5" />
        );
      })}
      {rows.map((row, i) => {
        const [x, y] = pt(i, 1.3);
        return (
          <text
            key={row.category}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10, fontWeight: 600, fill: "var(--muted-foreground)" }}
          >
            {short(row.category)}
          </text>
        );
      })}
    </svg>
  );
}

function KpiTile({
  label, value, sub, tone, pct,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  pct?: number;
}) {
  const color = tone || "var(--primary)";
  return (
    <div className="tr-kpi">
      <span className="tr-kpi-label">{label}</span>
      <strong style={{ color }}>{value}</strong>
      <span className="tr-kpi-sub">{sub}</span>
      {pct !== undefined && (
        <span className="tr-kpi-rail">
          <i style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }} />
        </span>
      )}
    </div>
  );
}

function IrisBadge({
  tone,
  children,
}: {
  tone?: string;
  children: React.ReactNode;
}) {
  const cls = tone === "green" ? "tone-green"
    : tone === "amber" ? "tone-amber"
    : tone === "red" ? "tone-red"
    : tone === "blue" ? "tone-none"
    : "tone-none";
  return (
    <span
      className={`iris-tr-badge ${cls}`}
      style={tone === "blue" ? { background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)" } : undefined}
    >
      {children}
    </span>
  );
}

/** One review, in full: score, who gave it, coaching notes, every rubric row and answer. */
function ReviewCard({
  review, open, onToggle, onSelect, active, latest,
}: {
  review: Assessment;
  open: boolean;
  onToggle: () => void;
  onSelect: () => void;
  active: boolean;
  latest?: boolean;
}) {
  const evaluator = review.evaluator && review.evaluator !== "—" ? review.evaluator : "Evaluator not recorded";
  return (
    <div className={`tr-review${active ? " active" : ""}${open ? " open" : ""}${latest ? " latest" : ""}`}>
      <div className="tr-review-head">
        <button
          type="button"
          className="tr-review-score"
          style={{ color: active ? "var(--primary)" : scoreColor(review.score) }}
          onClick={onSelect}
          title="Load this review into the rubric and radar above"
        >
          {review.score ? review.score + "%" : "—"}
        </button>
        <button type="button" className="tr-review-summary" onClick={onToggle} aria-expanded={open}>
          <span className="tr-review-title">
            {latest ? "Most recent review" : indiaDate(review.submittedAt)}
            {latest && <em> · {indiaDate(review.submittedAt)}</em>}
          </span>
          <span className="tr-review-meta">
            {evaluator} · {review.sourceLabel}
            {review.sessionName ? " · " + review.sessionName : ""}
            {review.studio ? " · " + review.studio.split(",")[0] : ""} · {review.ticketNumber}
          </span>
        </button>
        <div className="tr-review-badges">
          <IrisBadge tone={review.bandTone}>{review.band}</IrisBadge>
          {active && <IrisBadge tone="blue">In report above</IrisBadge>}
          <button
            type="button"
            className="tr-review-toggle"
            onClick={onToggle}
            aria-label={open ? "Collapse this review" : "Expand this review"}
          >
            {open ? "▴" : "▾"}
          </button>
        </div>
      </div>

      {open && (
        <div className="tr-review-body">
          <dl className="tr-review-facts">
            <div><dt>Score</dt><dd style={{ color: scoreColor(review.score) }}>{review.score ? review.score + "%" : "Not scored"}</dd></div>
            <div><dt>Evaluated by</dt><dd>{evaluator}</dd></div>
            <div><dt>Submitted</dt><dd>{indiaDate(review.submittedAt)}</dd></div>
            <div><dt>Source</dt><dd>{review.sourceLabel}</dd></div>
            {review.sessionName && <div><dt>Session</dt><dd>{review.sessionName}</dd></div>}
            {review.studio && <div><dt>Studio</dt><dd>{review.studio}</dd></div>}
            <div><dt>Band</dt><dd>{review.band}</dd></div>
            <div><dt>Ticket</dt><dd>{review.ticketNumber}</dd></div>
          </dl>

          {(review.strengths || review.improvements || review.coachingPlan || review.summary) && (
            <div className="tr-notes">
              {review.strengths && (
                <div className="tr-note" style={{ boxShadow: "inset 3px 0 0 #34c759" }}>
                  <strong style={{ color: "#34c759" }}>Key strengths</strong>
                  <p>{review.strengths}</p>
                </div>
              )}
              {review.improvements && (
                <div className="tr-note" style={{ boxShadow: "inset 3px 0 0 #ff9500" }}>
                  <strong style={{ color: "#ff9500" }}>Development areas</strong>
                  <p>{review.improvements}</p>
                </div>
              )}
              {review.coachingPlan && (
                <div className="tr-note" style={{ boxShadow: "inset 3px 0 0 var(--primary)" }}>
                  <strong style={{ color: "var(--primary)" }}>Coaching action plan</strong>
                  <p>{review.coachingPlan}</p>
                </div>
              )}
              {!review.strengths && !review.improvements && !review.coachingPlan && review.summary && (
                <div className="tr-note">
                  <strong>Summary</strong>
                  <p>{review.summary}</p>
                </div>
              )}
            </div>
          )}

          {review.rubric.length > 0 && (
            <div className="tr-review-rubric">
              <span className="tr-kpi-label">Scored criteria · weakest first</span>
              <div className="tr-rubric-cols">
                {[...review.rubric].sort((a, b) => a.pct - b.pct).map((row) => (
                  <RubricBar key={row.category} {...row} />
                ))}
              </div>
            </div>
          )}

          {review.answers.length > 0 && (
            <div className="tr-answers">
              <span className="tr-kpi-label">The submission as it was filled in · {review.answers.length} answers</span>
              {review.answers.map((answer, i) => (
                <div key={i}>
                  <span>{answer.label}</span>
                  <p>{answer.value || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

export function TrainerReport({ trainer }: { trainer: Trainer }) {
  const [selection, setSelection] = React.useState<{ for: string; id: string }>();
  const selectedId = selection?.for === trainer.name ? selection.id : null;
  const setSelectedId = (id: string) => setSelection({ for: trainer.name, id });

  const newestFirst = React.useMemo(
    () => [...trainer.assessments].sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt)),
    [trainer.assessments],
  );

  const [openOverride, setOpenOverride] = React.useState<{ for: string; ids: Set<string> }>();
  const openIds = openOverride?.for === trainer.name
    ? openOverride.ids
    : new Set(newestFirst.slice(0, 1).map((a) => a.id));
  const setOpenIds = (ids: Set<string>) => setOpenOverride({ for: trainer.name, ids });

  const [rubricFilter, setRubricFilter] = React.useState<"all" | "strong" | "focus">("all");

  const toggleOpen = (id: string) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
  };

  const sorted = React.useMemo(
    () => [...trainer.assessments].sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt)),
    [trainer.assessments],
  );
  const scored = React.useMemo(() => sorted.filter((a) => a.score > 0), [sorted]);
  const avg = trainer.avgScore ?? 0;
  const latest = scored[scored.length - 1] || sorted[sorted.length - 1] || null;
  const delta = scored.length > 1 ? scored[scored.length - 1]!.score - scored[scored.length - 2]!.score : 0;
  const best = scored.length ? Math.max(...scored.map((a) => a.score)) : 0;
  const worst = scored.length ? Math.min(...scored.map((a) => a.score)) : 0;

  const selected = React.useMemo(
    () => trainer.assessments.find((a) => a.id === selectedId) || latest,
    [trainer.assessments, selectedId, latest],
  );
  const selectedRubric = React.useMemo(() => selected?.rubric ?? [], [selected]);
  const filteredRubric = React.useMemo(() => {
    if (rubricFilter === "strong") return selectedRubric.filter((r) => r.pct >= 80);
    if (rubricFilter === "focus") return selectedRubric.filter((r) => r.pct < 65);
    return selectedRubric;
  }, [selectedRubric, rubricFilter]);

  const lifetimeRubric = React.useMemo(() => {
    const map = new Map<string, { score: number; weightage: number; n: number }>();
    for (const a of trainer.assessments) {
      for (const r of a.rubric) {
        const cur = map.get(r.category) ?? { score: 0, weightage: 0, n: 0 };
        cur.score += r.score;
        cur.weightage += r.weightage;
        cur.n += 1;
        map.set(r.category, cur);
      }
    }
    return [...map.entries()]
      .map(([category, v]) => ({
        category,
        score: Math.round((v.score / v.n) * 10) / 10,
        weightage: Math.round((v.weightage / v.n) * 10) / 10,
        pct: v.weightage > 0 ? Math.round((v.score / v.weightage) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [trainer.assessments]);

  const evaluators = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const a of trainer.assessments) {
      const key = a.evaluator?.trim() || "Unattributed";
      const cur = map.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += a.score;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([evaluator, v]) => ({ evaluator, count: v.count, avg: Math.round(v.total / v.count) }))
      .sort((a, b) => b.count - a.count);
  }, [trainer.assessments]);

  const studios = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const a of trainer.assessments) {
      const key = a.studio?.split(",")[0].trim() || "Unspecified";
      const cur = map.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += a.score;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([studio, v]) => ({ studio, count: v.count, avg: Math.round(v.total / v.count) }))
      .sort((a, b) => b.count - a.count);
  }, [trainer.assessments]);

  const now = Date.now();
  const daysSince = latest ? Math.floor((now - +new Date(latest.submittedAt)) / 86400000) : null;
  const alerts: { tone: string; title: string; body: string }[] = [];
  if (latest && latest.score > 0 && latest.score < 65) {
    alerts.push({ tone: "red", title: "Coaching priority", body: `The latest weighted score is ${latest.score}%, below the 65% threshold.` });
  }
  if (delta <= -8) {
    alerts.push({ tone: "amber", title: `Down ${Math.abs(delta)} points`, body: "A regression since the previous assessment - review the weakest criteria." });
  }
  if (delta >= 8) {
    alerts.push({ tone: "green", title: `Up ${delta} points`, body: "A clear improvement since the last review." });
  }
  if (trainer.issueCount >= 3) {
    alerts.push({ tone: "red", title: `${trainer.issueCount} flagged concerns`, body: "Member feedback on this trainer is trending negative." });
  }
  if (daysSince !== null && daysSince > 90) {
    alerts.push({ tone: "amber", title: "Review overdue", body: `Last assessed ${daysSince} days ago.` });
  }
  if (!trainer.assessments.length) {
    alerts.push({ tone: "amber", title: "Never assessed", body: "No evaluation is on file for this trainer yet." });
  }
  if (trainer.complimentCount >= 3 && trainer.issueCount === 0) {
    alerts.push({ tone: "green", title: "Consistently praised", body: `${trainer.complimentCount} compliments, no concerns logged.` });
  }

  const initials = trainer.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="tr-report">
      {/* 01 — masthead */}
      <section className="tr-masthead">
        <div className="tr-portrait" data-empty={getTrainerImage(trainer.name) ? undefined : "true"}>
          <TrainerPhoto
            name={trainer.name}
            className="trainer-photo-lg"
            fallback={<span className="tr-portrait-initials">{initials}</span>}
          />
        </div>
        <div className="tr-masthead-body">
          <span className="eyebrow">TRAINER PERFORMANCE REPORT</span>
          <h2>{trainer.displayName || trainer.name}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            <IrisBadge tone={trainer.bandTone}>{trainer.band || "Awaiting a formal assessment"}</IrisBadge>
            {delta !== 0 && (
              <IrisBadge tone={delta > 0 ? "green" : "red"}>
                {delta > 0 ? "+" : ""}{delta} vs previous
              </IrisBadge>
            )}
            <IrisBadge>{trainer.assessmentCount} assessments</IrisBadge>
            <IrisBadge>{trainer.totalTickets} linked tickets</IrisBadge>
            {latest && <IrisBadge>Last reviewed {indiaDate(latest.submittedAt)}</IrisBadge>}
          </div>
        </div>
        <ScoreDial value={avg} />
      </section>

      <div className="tr-kpis">
        <KpiTile
          label="Profile average"
          value={trainer.avgScore !== null ? trainer.avgScore + "%" : "—"}
          sub={trainer.band || "No assessments yet"}
          tone={scoreColor(avg)}
          pct={avg}
        />
        <KpiTile
          label="Best on record"
          value={best ? best + "%" : "—"}
          sub="Highest weighted result"
          tone="#34c759"
          pct={best}
        />
        <KpiTile
          label="Lowest on record"
          value={worst ? worst + "%" : "—"}
          sub="Weakest weighted result"
          tone="#ff3b30"
          pct={worst}
        />
        <KpiTile
          label="Member signal"
          value={`${trainer.complimentCount} / ${trainer.issueCount}`}
          sub="Compliments vs flagged concerns"
          tone="var(--primary)"
        />
      </div>

      {alerts.length > 0 && (
        <Section index="01" title="What needs attention" subtitle="Derived from the assessments and feedback on file">
          <div className="tr-alerts">
            {alerts.map((a) => (
              <div key={a.title} className="tr-alert" style={{ boxShadow: `inset 3px 0 0 ${toneVar(a.tone)}` }}>
                <strong style={{ color: toneVar(a.tone) }}>{a.title}</strong>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 02 — trajectory */}
      <Section
        index="02"
        title="Score trajectory"
        subtitle="Weighted result per assessment · select a point to load it below"
        action={<IrisBadge>{scored.length} scored reviews</IrisBadge>}
      >
        <TrendChart
          points={scored.map((a) => ({ id: a.id, at: a.submittedAt, score: a.score }))}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
      </Section>

      {/* 03 — rubric for the selected review */}
      <Section
        index="03"
        title="Rubric attainment"
        subtitle={selected ? `${indiaDate(selected.submittedAt)} · ${selected.sourceLabel} · weakest criteria first` : "No assessment selected"}
        action={selected ? <IrisBadge tone={scoreTone(selected.score)}>{selected.score}% overall</IrisBadge> : undefined}
      >
        {!selectedRubric.length ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "12px 0" }}>
            No per-criterion scores on this review.
          </p>
        ) : (
          <div className="tr-rubric-grid">
            <div className="tr-radar-wrap">
              <RadarChart rows={selectedRubric} benchmark={avg} />
              <div style={{ display: "flex", gap: 12, fontSize: 10, justifyContent: "center", alignItems: "center" }}>
                <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <i className="tr-key" style={{ background: "var(--primary)" }} />
                  This review
                </span>
                <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <i className="tr-key" style={{ background: "var(--muted-foreground)" }} />
                  Profile average ({avg}%)
                </span>
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="tr-seg">
                {([["all", "All"], ["strong", "Strong ≥80%"], ["focus", "Needs focus <65%"]] as const).map(([k, l]) => (
                  <button key={k} data-active={rubricFilter === k} onClick={() => setRubricFilter(k)}>{l}</button>
                ))}
              </div>
              {!filteredRubric.length ? (
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No criteria match this filter.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {filteredRubric.map((r) => <RubricBar key={r.category} {...r} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* 04 — coaching notes from the selected review */}
      {selected && (selected.strengths || selected.improvements || selected.coachingPlan || selected.summary) && (
        <Section index="04" title="Coaching notes" subtitle={`As recorded on ${selected.ticketNumber}`}>
          <div className="tr-notes">
            {selected.strengths && (
              <div className="tr-note" style={{ boxShadow: "inset 3px 0 0 #34c759" }}>
                <strong style={{ color: "#34c759" }}>Key strengths</strong>
                <p>{selected.strengths}</p>
              </div>
            )}
            {selected.improvements && (
              <div className="tr-note" style={{ boxShadow: "inset 3px 0 0 #ff9500" }}>
                <strong style={{ color: "#ff9500" }}>Development areas</strong>
                <p>{selected.improvements}</p>
              </div>
            )}
            {selected.coachingPlan && (
              <div className="tr-note" style={{ boxShadow: "inset 3px 0 0 var(--primary)" }}>
                <strong style={{ color: "var(--primary)" }}>Coaching action plan</strong>
                <p>{selected.coachingPlan}</p>
              </div>
            )}
            {!selected.strengths && !selected.improvements && !selected.coachingPlan && (
              <div className="tr-note">
                <strong>Summary</strong>
                <p>{selected.summary}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 05 — lifetime rubric */}
      {lifetimeRubric.length > 0 && (
        <Section
          index="05"
          title="Recurring strengths and levers"
          subtitle="Averaged across every review on file · weakest first"
          action={<IrisBadge>{lifetimeRubric.length} criteria</IrisBadge>}
        >
          <div className="tr-rubric-cols">
            {lifetimeRubric.map((r) => <RubricBar key={r.category} {...r} />)}
          </div>
        </Section>
      )}

      {/* 06 — the reviews themselves */}
      <Section
        index="06"
        title="Reviews on file"
        subtitle="The most recent review in full; earlier ones collapsed - open any of them, or select a score to load it into the rubric and radar above"
        action={<IrisBadge>{trainer.assessments.length} on file</IrisBadge>}
      >
        {!trainer.assessments.length ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No assessments recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {newestFirst.map((a, index) => (
              <ReviewCard
                key={a.id}
                review={a}
                latest={index === 0}
                open={openIds.has(a.id)}
                onToggle={() => toggleOpen(a.id)}
                onSelect={() => setSelectedId(a.id)}
                active={a.id === selected?.id}
              />
            ))}
            {newestFirst.length > 1 && (
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-danger-ghost"
                  style={{ borderColor: "var(--border)", background: "var(--muted)", color: "var(--foreground)" }}
                  onClick={() => setOpenIds(new Set(newestFirst.map((a) => a.id)))}
                >
                  Expand every review
                </button>
                <button
                  type="button"
                  className="btn-danger-ghost"
                  style={{ borderColor: "var(--border)", background: "var(--muted)", color: "var(--foreground)" }}
                  onClick={() => setOpenIds(new Set(newestFirst.slice(0, 1).map((a) => a.id)))}
                >
                  Collapse history
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 07 — evaluators + studios */}
      {(evaluators.length > 0 || studios.length > 0) && (
        <Section
          index="07"
          title="Evaluator and studio breakdown"
          subtitle="Who is assessing this trainer, and where"
        >
          <div className="tr-split">
            <div>
              <span className="tr-kpi-label">By evaluator</span>
              {!evaluators.length ? (
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No evaluations recorded yet.</p>
              ) : (
                evaluators.map((r) => (
                  <div key={r.evaluator} className="tr-split-row">
                    <span>{r.evaluator}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {r.count} · <b style={{ color: scoreColor(r.avg) }}>{r.avg}%</b>
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <span className="tr-kpi-label">By studio</span>
              {!studios.length ? (
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No evaluations recorded yet.</p>
              ) : (
                studios.map((r) => (
                  <div key={r.studio} className="tr-split-row">
                    <span>{r.studio}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {r.count} · <b style={{ color: scoreColor(r.avg) }}>{r.avg}%</b>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 08 — member feedback */}
      <Section
        index="08"
        title="Member feedback and compliments"
        subtitle="Everything logged against this trainer outside a formal assessment"
        action={<IrisBadge>{trainer.feedbackCount} entries</IrisBadge>}
      >
        {!trainer.recentFeedback.length ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No feedback logged yet.</p>
        ) : (
          trainer.recentFeedback.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                padding: "8px 12px", borderRadius: 10, background: "var(--muted)",
                marginBottom: 6,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <small style={{ color: "var(--muted-foreground)", fontSize: 10 }}>
                  {f.ticketNumber} · {f.subcategory} · {indiaDate(f.createdAt, true)}
                </small>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--foreground)" }}>{f.title}</p>
              </div>
              <IrisBadge tone={f.kind === "compliment" ? "green" : f.sentiment === "negative" ? "red" : ""}>
                {f.kind === "compliment" ? "Compliment" : f.sentiment || "neutral"}
              </IrisBadge>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}
