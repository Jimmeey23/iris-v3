"use client";

import * as React from "react";
import { getTrainerImage } from "@/lib/iris/constants";
import { TrainerPhoto } from "./trainer-photo";
import {
  type Trainer,
  type Assessment,
  type RubricRow,
  type FeedbackRow,
} from "@/lib/iris/trainer-directory";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronRight, ExternalLink } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/* One restrained palette: ink and grey for structure, the app accent for data,
 * and a single alert colour reserved for results under the 65% threshold. */
const ALERT = "var(--tr-alert)";
const THRESHOLD = 65;
const scoreColor = (v: number) => (v > 0 && v < THRESHOLD ? ALERT : "var(--primary)");
const scoreTone = (v: number) => (v > 0 && v < THRESHOLD ? "red" : "");
const toneVar = (tone: string) => (tone === "red" ? ALERT : "var(--foreground)");

/** indiaDate from reference repo - formats in Asia/Kolkata timezone. */
function indiaDate(v: unknown, short = false): string {
  if (!v) return "-";
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
          <text x={2} y={y(g) + 3} style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>{g}</text>
        </g>
      ))}
      <line x1={pad} x2={w - pad} y1={y(THRESHOLD)} y2={y(THRESHOLD)} stroke="var(--tr-alert)" strokeOpacity=".5" strokeDasharray="2 3" />
      <text x={w - pad} y={y(THRESHOLD) - 4} textAnchor="end" style={{ fontSize: 9, fill: "var(--muted-foreground)", letterSpacing: ".08em" }}>THRESHOLD {THRESHOLD}</text>
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

function RubricBar({ category, score, weightage, pct, onOpen }: RubricRow & { onOpen?: () => void }) {
  return (
    <div className={onOpen ? "tr-click tr-rubric-row" : undefined} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen} onKeyDown={onOpen ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen()) : undefined}
      title={onOpen ? `See ${category} across every review` : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {category}
        </span>
        <span className="tr-num" style={{ flexShrink: 0 }}>
          <span style={{ color: "var(--muted-foreground)" }}>{score}/{weightage}</span>
          <b style={{ color: pct < THRESHOLD ? ALERT : "var(--foreground)", marginLeft: 8 }}>{pct}%</b>
        </span>
      </div>
      <div className="tr-bar">
        <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: scoreColor(pct) }} />
        <i className="tr-bar-tick" style={{ left: `${THRESHOLD}%` }} aria-hidden />
      </div>
    </div>
  );
}

/** Criterion attainment against the trainer's own average. */
function RadarChart({ rows, benchmark, size = 280, onPick }: { rows: RubricRow[]; benchmark: number; size?: number; onPick?: (category: string) => void }) {
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
          <circle key={row.category} cx={x} cy={y} r="4" fill={scoreColor(row.pct)} stroke="var(--card)" strokeWidth="1.5"
            onClick={() => onPick?.(row.category)} style={{ cursor: onPick ? "pointer" : undefined }}><title>{`${row.category}: ${row.pct}%`}</title></circle>
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
            style={{ fontSize: 10, fontWeight: 600, fill: "var(--muted-foreground)", cursor: onPick ? "pointer" : undefined }}
            onClick={() => onPick?.(row.category)}
            className={onPick ? "tr-radar-label" : undefined}
          >
            {short(row.category)}
          </text>
        );
      })}
    </svg>
  );
}

function KpiTile({
  label, value, sub, tone, pct, onOpen,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  pct?: number;
  onOpen?: () => void;
}) {
  const color = tone || "var(--primary)";
  return (
    <button type="button" className="tr-kpi tr-click" onClick={onOpen} disabled={!onOpen}>
      <span className="tr-kpi-label">{label}</span>
      <strong>{value}</strong>
      <span className="tr-kpi-sub">{sub}</span>
      {pct !== undefined && (
        <span className="tr-kpi-rail">
          <i style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }} />
        </span>
      )}
    </button>
  );
}

function IrisBadge({
  tone,
  children,
}: {
  tone?: string;
  children: React.ReactNode;
}) {
  const cls = tone === "red" ? "tr-chip tr-chip-alert" : tone === "blue" ? "tr-chip tr-chip-accent" : "tr-chip";
  return (
    <span className={cls}>
      {children}
    </span>
  );
}

/** One review, in full: score, who gave it, coaching notes, every rubric row and answer. */
function ReviewCard({
  review, open, onToggle, onSelect, active, latest, onCriterion,
}: {
  onCriterion?: (category: string) => void;
  review: Assessment;
  open: boolean;
  onToggle: () => void;
  onSelect: () => void;
  active: boolean;
  latest?: boolean;
}) {
  const evaluator = review.evaluator && review.evaluator !== "-" ? review.evaluator : "Evaluator not recorded";
  return (
    <div className={`tr-review${active ? " active" : ""}${open ? " open" : ""}${latest ? " latest" : ""}`}>
      <div className="tr-review-head">
        <button
          type="button"
          className="tr-review-score"
          style={{ color: review.score > 0 && review.score < THRESHOLD ? ALERT : "var(--foreground)" }}
          onClick={onSelect}
          title="Load this review into the rubric and radar above"
        >
          {review.score ? review.score + "%" : "-"}
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
            <div><dt>Score</dt><dd style={{ color: review.score > 0 && review.score < THRESHOLD ? ALERT : undefined }}>{review.score ? review.score + "%" : "Not scored"}</dd></div>
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
                <div className="tr-note">
                  <strong>Key strengths</strong>
                  <p>{review.strengths}</p>
                </div>
              )}
              {review.improvements && (
                <div className="tr-note">
                  <strong>Development areas</strong>
                  <p>{review.improvements}</p>
                </div>
              )}
              {review.coachingPlan && (
                <div className="tr-note">
                  <strong>Coaching action plan</strong>
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
                  <RubricBar key={row.category} {...row} onOpen={onCriterion ? () => onCriterion(row.category) : undefined} />
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
                  <p>{answer.value || "-"}</p>
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
/* Drill-down                                                          */
/* ------------------------------------------------------------------ */

type Drill =
  | { kind: "reviews"; title: string; subtitle?: string; reviews: Assessment[] }
  | { kind: "criterion"; category: string }
  | { kind: "feedback"; title: string; subtitle?: string; items: FeedbackRow[] }
  | { kind: "compare" };

function DrillStat({ label, value, alert }: { label: string; value: React.ReactNode; alert?: boolean }) {
  return (
    <div className="tr-drill-stat">
      <span>{label}</span>
      <strong style={{ color: alert ? ALERT : undefined }}>{value}</strong>
    </div>
  );
}

function DrillPanel({
  drill, trainer, onClose, onLoadReview, onOpenTicket,
}: {
  drill: Drill | null;
  trainer: Trainer;
  onClose: () => void;
  onLoadReview: (id: string) => void;
  onOpenTicket?: (id: string, ticketNumber?: string) => void;
}) {
  const scored = React.useMemo(
    () => [...trainer.assessments].filter((a) => a.score > 0).sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt)),
    [trainer.assessments],
  );

  let title = "";
  let subtitle = "";
  let body: React.ReactNode = null;

  if (drill?.kind === "reviews") {
    title = drill.title;
    subtitle = drill.subtitle ?? `${drill.reviews.length} review${drill.reviews.length === 1 ? "" : "s"}`;
    const rs = [...drill.reviews].sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
    const vals = rs.filter((r) => r.score > 0).map((r) => r.score);
    body = (
      <>
        {vals.length > 0 && (
          <div className="tr-drill-stats">
            <DrillStat label="Reviews" value={rs.length} />
            <DrillStat label="Average" value={`${Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)}%`} />
            <DrillStat label="High" value={`${Math.max(...vals)}%`} />
            <DrillStat label="Low" value={`${Math.min(...vals)}%`} alert={Math.min(...vals) < THRESHOLD} />
          </div>
        )}
        <table className="tr-drill-table">
          <thead><tr><th>Date</th><th>Score</th><th>Evaluator</th><th>Studio</th><th /></tr></thead>
          <tbody>
            {rs.map((r) => (
              <tr key={r.id} className="tr-click" onClick={() => onLoadReview(r.id)} title="Load this review into the report">
                <td className="tr-num">{indiaDate(r.submittedAt, true)}</td>
                <td className="tr-num" style={{ color: r.score > 0 && r.score < THRESHOLD ? ALERT : undefined, fontWeight: 600 }}>{r.score ? `${r.score}%` : "-"}</td>
                <td>{r.evaluator && r.evaluator !== "-" ? r.evaluator : "Unattributed"}<small>{r.sourceLabel}</small></td>
                <td>{r.studio?.split(",")[0] || "-"}<small>{r.sessionName || r.ticketNumber}</small></td>
                <td><ChevronRight size={13} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rs.length && <p className="tr-drill-empty">No reviews match.</p>}
      </>
    );
  } else if (drill?.kind === "criterion") {
    title = drill.category;
    const rows = scored
      .map((a) => ({ a, r: a.rubric.find((x) => x.category === drill.category) }))
      .filter((x): x is { a: Assessment; r: RubricRow } => !!x.r);
    const pcts = rows.map((x) => x.r.pct);
    subtitle = `Scored in ${rows.length} of ${scored.length} reviews`;
    const first = pcts[0];
    const last = pcts[pcts.length - 1];
    body = (
      <>
        {pcts.length > 0 && (
          <div className="tr-drill-stats">
            <DrillStat label="Average" value={`${Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)}%`} />
            <DrillStat label="Latest" value={`${last}%`} alert={last < THRESHOLD} />
            <DrillStat label="Best" value={`${Math.max(...pcts)}%`} />
            <DrillStat label="Change" value={pcts.length > 1 ? `${last - first >= 0 ? "+" : ""}${last - first} pts` : "-"} alert={last - first < 0} />
          </div>
        )}
        {pcts.length > 1 && (
          <TrendChart points={rows.map(({ a, r }) => ({ id: a.id, at: a.submittedAt, score: r.pct }))} onSelect={onLoadReview} />
        )}
        <table className="tr-drill-table">
          <thead><tr><th>Date</th><th>Points</th><th>Attainment</th><th>Evaluator</th></tr></thead>
          <tbody>
            {[...rows].reverse().map(({ a, r }) => (
              <tr key={a.id} className="tr-click" onClick={() => onLoadReview(a.id)} title="Load this review into the report">
                <td className="tr-num">{indiaDate(a.submittedAt, true)}</td>
                <td className="tr-num">{r.score}/{r.weightage}</td>
                <td>
                  <span className="tr-drill-bar"><i style={{ width: `${Math.max(2, Math.min(100, r.pct))}%`, background: scoreColor(r.pct) }} /></span>
                  <b className="tr-num" style={{ color: r.pct < THRESHOLD ? ALERT : undefined }}>{r.pct}%</b>
                </td>
                <td>{a.evaluator && a.evaluator !== "-" ? a.evaluator : "Unattributed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  } else if (drill?.kind === "feedback") {
    title = drill.title;
    subtitle = drill.subtitle ?? `${drill.items.length} ticket${drill.items.length === 1 ? "" : "s"}`;
    const comp = drill.items.filter((f) => f.kind === "compliment").length;
    body = (
      <>
        <div className="tr-drill-stats">
          <DrillStat label="Tickets" value={drill.items.length} />
          <DrillStat label="Compliments" value={comp} />
          <DrillStat label="Concerns" value={drill.items.length - comp} alert={drill.items.length - comp > 0} />
          <DrillStat label="Open" value={drill.items.filter((f) => !["resolved", "closed"].includes(f.status)).length} />
        </div>
        <table className="tr-drill-table">
          <thead><tr><th>Date</th><th>Feedback</th><th>Type</th><th>Status</th><th /></tr></thead>
          <tbody>
            {drill.items.map((f) => (
              <tr key={f.id} className={onOpenTicket ? "tr-click" : undefined} onClick={() => onOpenTicket?.(f.id, f.ticketNumber)} title="Open the ticket">
                <td className="tr-num">{indiaDate(f.createdAt, true)}</td>
                <td>{f.title}<small>{f.ticketNumber} · {f.subcategory}</small></td>
                <td><span className={f.kind === "compliment" ? "tr-chip" : "tr-chip tr-chip-alert"}>{f.kind === "compliment" ? "Compliment" : "Concern"}</span></td>
                <td className="tr-num">{f.status.replace(/_/g, " ")}</td>
                <td>{onOpenTicket && <ExternalLink size={12} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!drill.items.length && <p className="tr-drill-empty">Nothing logged.</p>}
      </>
    );
  } else if (drill?.kind === "compare") {
    const cur = scored[scored.length - 1];
    const prev = scored[scored.length - 2];
    title = "Change since the previous review";
    subtitle = cur && prev ? `${indiaDate(prev.submittedAt, true)} → ${indiaDate(cur.submittedAt, true)}` : "Needs two scored reviews";
    const diffs = cur && prev
      ? cur.rubric.map((r) => {
          const p = prev.rubric.find((x) => x.category === r.category);
          return { category: r.category, now: r.pct, before: p?.pct ?? null, delta: p ? r.pct - p.pct : null };
        }).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      : [];
    body = cur && prev ? (
      <>
        <div className="tr-drill-stats">
          <DrillStat label="Previous" value={`${prev.score}%`} />
          <DrillStat label="Latest" value={`${cur.score}%`} alert={cur.score < THRESHOLD} />
          <DrillStat label="Change" value={`${cur.score - prev.score >= 0 ? "+" : ""}${cur.score - prev.score} pts`} alert={cur.score - prev.score < 0} />
          <DrillStat label="Criteria down" value={diffs.filter((d) => (d.delta ?? 0) < 0).length} />
        </div>
        <table className="tr-drill-table">
          <thead><tr><th>Criterion</th><th>Before</th><th>Now</th><th>Change</th></tr></thead>
          <tbody>
            {diffs.map((d) => (
              <tr key={d.category}>
                <td>{d.category}</td>
                <td className="tr-num">{d.before === null ? "-" : `${d.before}%`}</td>
                <td className="tr-num">{d.now}%</td>
                <td className="tr-num" style={{ color: (d.delta ?? 0) < 0 ? ALERT : undefined, fontWeight: 600 }}>
                  {d.delta === null ? "new" : `${d.delta >= 0 ? "+" : ""}${d.delta}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="tr-drill-btn" onClick={() => onLoadReview(prev.id)}>Load previous</button>
          <button type="button" className="tr-drill-btn" onClick={() => onLoadReview(cur.id)}>Load latest</button>
        </div>
      </>
    ) : <p className="tr-drill-empty">Two scored reviews are needed for a comparison.</p>;
  }

  return (
    <Sheet open={!!drill} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto iris-scrollbar p-0">
        <div className="tr-report tr-drill">
          <SheetHeader className="tr-drill-head">
            <span className="tr-drill-eyebrow">{trainer.displayName || trainer.name} · drill-down</span>
            <SheetTitle className="tr-drill-title">{title}</SheetTitle>
            <SheetDescription className="tr-drill-sub">{subtitle}</SheetDescription>
          </SheetHeader>
          <div className="tr-drill-body">{body}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

export function TrainerReport({ trainer, onOpenTicket }: { trainer: Trainer; onOpenTicket?: (id: string, ticketNumber?: string) => void }) {
  const [drill, setDrill] = React.useState<Drill | null>(null);
  const anchorId = `tr-rubric-${React.useId().replace(/:/g, "")}`;
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

  const loadReview = (id: string) => {
    setSelectedId(id);
    setOpenIds(new Set([...openIds, id]));
    setDrill(null);
    requestAnimationFrame(() => document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const reviewsDrill = (title: string, reviews: Assessment[], subtitle?: string) => setDrill({ kind: "reviews", title, reviews, subtitle });
  const feedbackDrill = (title: string, items: FeedbackRow[], subtitle?: string) => setDrill({ kind: "feedback", title, items, subtitle });
  const criterionDrill = (category: string) => setDrill({ kind: "criterion", category });

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
  const alerts: { tone: string; title: string; body: string; open?: () => void }[] = [];
  if (latest && latest.score > 0 && latest.score < 65) {
    alerts.push({ tone: "red", title: "Coaching priority", body: `The latest weighted score is ${latest.score}%, below the 65% threshold.`, open: () => loadReview(latest.id) });
  }
  if (delta <= -8) {
    alerts.push({ tone: "amber", title: `Down ${Math.abs(delta)} points`, body: "A regression since the previous assessment - review the weakest criteria.", open: () => setDrill({ kind: "compare" }) });
  }
  if (delta >= 8) {
    alerts.push({ tone: "green", title: `Up ${delta} points`, body: "A clear improvement since the last review.", open: () => setDrill({ kind: "compare" }) });
  }
  if (trainer.issueCount >= 3) {
    alerts.push({ tone: "red", title: `${trainer.issueCount} flagged concerns`, body: "Member feedback on this trainer is trending negative.", open: () => feedbackDrill("Flagged concerns", trainer.feedback.filter((f) => f.kind !== "compliment")) });
  }
  if (daysSince !== null && daysSince > 90) {
    alerts.push({ tone: "amber", title: "Review overdue", body: `Last assessed ${daysSince} days ago.`, open: () => reviewsDrill("Assessment history", trainer.assessments) });
  }
  if (!trainer.assessments.length) {
    alerts.push({ tone: "amber", title: "Never assessed", body: "No evaluation is on file for this trainer yet.", open: () => feedbackDrill("Everything on file", trainer.feedback) });
  }
  if (trainer.complimentCount >= 3 && trainer.issueCount === 0) {
    alerts.push({ tone: "green", title: "Consistently praised", body: `${trainer.complimentCount} compliments, no concerns logged.`, open: () => feedbackDrill("Compliments", trainer.feedback.filter((f) => f.kind === "compliment")) });
  }

  const initials = trainer.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="tr-report">
      {/* 01 - masthead */}
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
          <dl className="tr-meta">
            <div><dt>Band</dt><dd>{trainer.band || "Awaiting assessment"}</dd></div>
            <div><dt>City</dt><dd>{trainer.city || "-"}</dd></div>
            <div role="button" tabIndex={0} className="tr-click" onClick={() => reviewsDrill("Assessment history", trainer.assessments)}><dt>Assessments</dt><dd>{trainer.assessmentCount}</dd></div>
            <div role="button" tabIndex={0} className="tr-click" onClick={() => feedbackDrill("Linked feedback tickets", trainer.feedback)}><dt>Linked tickets</dt><dd>{trainer.totalTickets}</dd></div>
            <div role="button" tabIndex={0} className="tr-click" onClick={() => latest && loadReview(latest.id)}><dt>Last reviewed</dt><dd>{latest ? indiaDate(latest.submittedAt, true) : "-"}</dd></div>
          </dl>
        </div>
        <div className="tr-scoreblock tr-click" role="button" tabIndex={0} title="Compare with the previous review"
          onClick={() => setDrill({ kind: "compare" })} onKeyDown={(e) => e.key === "Enter" && setDrill({ kind: "compare" })} aria-label={`Profile average ${trainer.avgScore ?? "not scored"}`}>
          <span className="tr-scoreblock-label">Profile average</span>
          <div className="tr-scoreblock-value">
            <strong style={{ color: avg > 0 && avg < THRESHOLD ? ALERT : undefined }}>{trainer.avgScore ?? "-"}</strong>
            {trainer.avgScore !== null && <span>/100</span>}
          </div>
          <span className="tr-scoreblock-meter" aria-hidden>
            <i style={{ width: `${Math.max(0, Math.min(100, avg))}%`, background: scoreColor(avg) }} />
            <b style={{ left: `${THRESHOLD}%` }} />
          </span>
          <span className="tr-scoreblock-sub">
            {delta !== 0 ? `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} pts vs previous` : scored.length ? "No change vs previous" : "Not yet scored"}
          </span>
        </div>
      </section>

      <div className="tr-kpis">
        <KpiTile
          label="Profile average"
          value={trainer.avgScore !== null ? trainer.avgScore + "%" : "-"}
          sub={trainer.band || "No assessments yet"}
          tone={scoreColor(avg)}
          pct={avg}
          onOpen={() => reviewsDrill("Every scored review", scored)}
        />
        <KpiTile
          label="Best on record"
          value={best ? best + "%" : "-"}
          sub="Highest weighted result"
          tone="var(--primary)"
          pct={best}
          onOpen={best ? () => reviewsDrill("Best on record", scored.filter((a) => a.score === best)) : undefined}
        />
        <KpiTile
          label="Lowest on record"
          value={worst ? worst + "%" : "-"}
          sub="Weakest weighted result"
          tone={scoreColor(worst)}
          pct={worst}
          onOpen={worst ? () => reviewsDrill("Lowest on record", scored.filter((a) => a.score === worst)) : undefined}
        />
        <KpiTile
          label="Member signal"
          value={`${trainer.complimentCount} / ${trainer.issueCount}`}
          sub="Compliments vs flagged concerns"
          tone="var(--primary)"
          onOpen={() => feedbackDrill("Member feedback", trainer.feedback)}
        />
      </div>

      {alerts.length > 0 && (
        <Section index="01" title="What needs attention" subtitle="Derived from the assessments and feedback on file">
          <div className="tr-alerts">
            {alerts.map((a) => (
              <button type="button" key={a.title} className="tr-alert tr-click" data-tone={a.tone} onClick={a.open} disabled={!a.open}>
                <i className="tr-alert-mark" aria-hidden />
                <strong style={{ color: toneVar(a.tone) }}>{a.title}</strong>
                <span className="tr-alert-p">{a.body}</span>
                <ChevronRight size={13} className="tr-alert-go" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 02 - trajectory */}
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

      {/* 03 - rubric for the selected review */}
      <div id={anchorId} style={{ scrollMarginTop: 12 }} />
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
              <RadarChart rows={selectedRubric} benchmark={avg} onPick={criterionDrill} />
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
                  {filteredRubric.map((r) => <RubricBar key={r.category} {...r} onOpen={() => criterionDrill(r.category)} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* 04 - coaching notes from the selected review */}
      {selected && (selected.strengths || selected.improvements || selected.coachingPlan || selected.summary) && (
        <Section index="04" title="Coaching notes" subtitle={`As recorded on ${selected.ticketNumber}`}>
          <div className="tr-notes">
            {selected.strengths && (
              <div className="tr-note">
                <strong>Key strengths</strong>
                <p>{selected.strengths}</p>
              </div>
            )}
            {selected.improvements && (
              <div className="tr-note">
                <strong>Development areas</strong>
                <p>{selected.improvements}</p>
              </div>
            )}
            {selected.coachingPlan && (
              <div className="tr-note">
                <strong>Coaching action plan</strong>
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

      {/* 05 - lifetime rubric */}
      {lifetimeRubric.length > 0 && (
        <Section
          index="05"
          title="Recurring strengths and levers"
          subtitle="Averaged across every review on file · weakest first"
          action={<IrisBadge>{lifetimeRubric.length} criteria · click any to drill in</IrisBadge>}
        >
          <div className="tr-rubric-cols">
            {lifetimeRubric.map((r) => <RubricBar key={r.category} {...r} onOpen={() => criterionDrill(r.category)} />)}
          </div>
        </Section>
      )}

      {/* 06 - the reviews themselves */}
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
                onCriterion={criterionDrill}
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

      {/* 07 - evaluators + studios */}
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
                  <div key={r.evaluator} className="tr-split-row tr-click" role="button" tabIndex={0}
                    onClick={() => reviewsDrill(`Reviews by ${r.evaluator}`, trainer.assessments.filter((a) => (a.evaluator?.trim() || "Unattributed") === r.evaluator))}>
                    <span>{r.evaluator}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {r.count} · <b style={{ color: r.avg < THRESHOLD ? ALERT : "var(--foreground)" }}>{r.avg}%</b>
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
                  <div key={r.studio} className="tr-split-row tr-click" role="button" tabIndex={0}
                    onClick={() => reviewsDrill(`Reviews at ${r.studio}`, trainer.assessments.filter((a) => (a.studio?.split(",")[0].trim() || "Unspecified") === r.studio))}>
                    <span>{r.studio}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {r.count} · <b style={{ color: r.avg < THRESHOLD ? ALERT : "var(--foreground)" }}>{r.avg}%</b>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 08 - member feedback */}
      <Section
        index="08"
        title="Member feedback and compliments"
        subtitle="Everything logged against this trainer outside a formal assessment"
        action={
          <button type="button" className="tr-chip tr-chip-accent tr-click" onClick={() => feedbackDrill("Member feedback", trainer.feedback)}>
            View all {trainer.feedbackCount}
          </button>
        }
      >
        {!trainer.recentFeedback.length ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No feedback logged yet.</p>
        ) : (
          trainer.recentFeedback.map((f) => (
            <div key={f.id} className={onOpenTicket ? "tr-feed-row tr-click" : "tr-feed-row"} role={onOpenTicket ? "button" : undefined}
              tabIndex={onOpenTicket ? 0 : undefined} onClick={() => onOpenTicket?.(f.id, f.ticketNumber)} title="Open the ticket">
              <span className="tr-num tr-feed-date">{indiaDate(f.createdAt, true)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p>{f.title}</p>
                <small>{f.ticketNumber} · {f.subcategory}</small>
              </div>
              <IrisBadge tone={f.sentiment === "negative" && f.kind !== "compliment" ? "red" : ""}>
                {f.kind === "compliment" ? "Compliment" : f.sentiment || "neutral"}
              </IrisBadge>
            </div>
          ))
        )}
      </Section>

      <DrillPanel drill={drill} trainer={trainer} onClose={() => setDrill(null)} onLoadReview={loadReview} onOpenTicket={onOpenTicket} />
    </div>
  );
}
