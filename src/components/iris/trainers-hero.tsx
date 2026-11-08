"use client";

import * as React from "react";
import { Radio, Star, Heart, TriangleAlert, Sparkles } from "lucide-react";
import type { Trainer } from "@/lib/iris/trainer-directory";
import { TrainerAvatar } from "./trainer-photo";
import { RelativeTime } from "./relative-time";

/**
 * Trainers hero, built on the same card as the Overview hero: white base, one faint accent
 * wash, copy and stat tiles on the left, a live panel on the right.
 *
 * The animation: trainer portraits orbit the organisation's average score ring on two slow
 * counter-rotating tracks (each face counter-rotated so it stays upright), while a spotlight
 * cross-fades through the top-scored trainers. Respects prefers-reduced-motion.
 */
export function TrainersHero({
  trainers,
  orgAvg,
  listening,
  onToggleListening,
  lastSync,
  sources,
  pollSeconds,
}: {
  trainers: Trainer[];
  orgAvg: number | null;
  listening: boolean;
  onToggleListening: () => void;
  lastSync: string | null;
  sources: Array<{ label: string; count: number }>;
  pollSeconds: number;
}) {
  const totals = React.useMemo(
    () => ({
      assessments: trainers.reduce((n, t) => n + t.assessmentCount, 0),
      compliments: trainers.reduce((n, t) => n + t.complimentCount, 0),
      flagged: trainers.reduce((n, t) => n + t.issueCount, 0),
    }),
    [trainers],
  );
  const ranked = React.useMemo(
    () => trainers.filter((t) => t.avgScore !== null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)).slice(0, 6),
    [trainers],
  );
  // Busiest first so the orbit shows the faces people know.
  const orbit = React.useMemo(
    () => [...trainers].sort((a, b) => b.totalTickets - a.totalTickets).slice(0, 14),
    [trainers],
  );
  const inner = orbit.slice(0, 6);
  const outer = orbit.slice(6, 14);

  const [spot, setSpot] = React.useState(0);
  React.useEffect(() => {
    if (ranked.length < 2) return;
    const iv = window.setInterval(() => setSpot((i) => (i + 1) % ranked.length), 4200);
    return () => window.clearInterval(iv);
  }, [ranked.length]);
  const star = ranked[ranked.length ? spot % ranked.length : 0];

  const ring = orgAvg ?? 0;
  const C = 2 * Math.PI * 46;

  return (
    <section className="trh relative overflow-hidden rounded-2xl border border-border bg-white dark:bg-card iris-fade-in-up mb-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 4%, transparent) 45%, transparent 75%)" }}
      />
      <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-stretch">
        {/* Left: copy and stats */}
        <div className="min-w-0 px-6 py-5 sm:px-7">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <button type="button" onClick={onToggleListening} className="inline-flex items-center gap-1.5 hover:text-foreground"
              title={listening ? `Checking every ${pollSeconds} seconds` : "Live updates paused"}>
              {listening ? <span className="iris-live-dot" /> : <Radio className="w-3 h-3" />}
              {listening ? "Listening for new feedback" : "Live updates paused"}
            </button>
            {lastSync && (<><span className="text-border">/</span><span>Synced <RelativeTime date={lastSync} /></span></>)}
          </div>
          <h1 className="mt-1.5 text-[26px] sm:text-[28px] font-semibold tracking-[-0.02em] leading-[1.1]">
            Trainer <span className="text-primary">reviews</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-xl leading-relaxed">
            Weighted assessments, member compliments and logged concerns, combined per trainer so every coaching conversation starts from evidence.
          </p>

          <dl className="mt-3 grid grid-cols-3 gap-2 max-w-xl">
            {[
              { k: "Assessments", v: totals.assessments, icon: Star, tone: "text-primary" },
              { k: "Compliments", v: totals.compliments, icon: Heart, tone: "text-emerald-600 dark:text-emerald-400" },
              { k: "Flagged", v: totals.flagged, icon: TriangleAlert, tone: "text-rose-600 dark:text-rose-400" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border/70 bg-card/60 backdrop-blur px-3.5 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                  <s.icon className={`w-3 h-3 ${s.tone}`} />{s.k}
                </dt>
                <dd className="mt-1 text-[20px] font-semibold tabular-nums leading-none">{s.v}</dd>
              </div>
            ))}
          </dl>

          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span key={s.label} className="inline-flex items-center h-6 px-2 rounded-full border border-border/70 bg-card/70 text-[10.5px] text-muted-foreground">
                  {s.label} · <b className="ml-1 text-foreground tabular-nums">{s.count}</b>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: orbit + spotlight */}
        <div className="relative flex flex-col items-center justify-center gap-3 border-t lg:border-t-0 lg:border-l border-border/70 bg-white/70 dark:bg-card/60 backdrop-blur-md px-6 py-5 overflow-hidden">
          <div className="trh-orbit relative" style={{ width: 236, height: 236 }}>
            <div className="trh-track trh-track-outer absolute inset-0 rounded-full border border-dashed border-primary/20">
              {outer.map((t, i) => (
                <OrbitFace key={t.name} t={t} i={i} n={outer.length} radius={118} size={30} cls="trh-face-outer" />
              ))}
            </div>
            <div className="trh-track trh-track-inner absolute rounded-full border border-primary/15" style={{ inset: 38 }}>
              {inner.map((t, i) => (
                <OrbitFace key={t.name} t={t} i={i} n={inner.length} radius={80} size={34} cls="trh-face-inner" />
              ))}
            </div>
            {/* Org average ring */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative" style={{ width: 104, height: 104 }}>
                <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
                  <circle cx="52" cy="52" r="46" fill="var(--card)" stroke="var(--border)" strokeWidth="6" />
                  <circle cx="52" cy="52" r="46" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(ring / 100) * C} ${C}`} transform="rotate(-90 52 52)" className="trh-ring" style={{ ["--c" as string]: C }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-semibold tabular-nums tracking-tight">{orgAvg === null ? "-" : `${orgAvg}%`}</span>
                  <span className="text-[8.5px] uppercase tracking-[.16em] text-muted-foreground">org average</span>
                </div>
              </div>
            </div>
          </div>

          {star && (
            <div key={star.name} className="trh-spot w-full max-w-[320px] flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2">
              <TrainerAvatar name={star.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-[.14em] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Top rated · #{(spot % ranked.length) + 1}
                </div>
                <div className="text-[13px] font-semibold truncate">{star.displayName || star.name}</div>
              </div>
              <span className="text-[15px] font-semibold tabular-nums text-primary">{star.avgScore}%</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes trh-spin { to { transform: rotate(360deg); } }
        @keyframes trh-unspin { to { transform: rotate(-360deg); } }
        @keyframes trh-ring { from { stroke-dashoffset: var(--c); } to { stroke-dashoffset: 0; } }
        @keyframes trh-spot { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes trh-pop { from { opacity: 0; scale: .6; } to { opacity: 1; scale: 1; } }
        .trh-track-outer { animation: trh-spin 90s linear infinite; }
        .trh-track-inner { animation: trh-unspin 60s linear infinite; }
        .trh-track-outer .trh-face { animation: trh-unspin 90s linear infinite; }
        .trh-track-inner .trh-face { animation: trh-spin 60s linear infinite; }
        .trh-face > span { animation: trh-pop .7s cubic-bezier(.16,1,.3,1) both; animation-delay: var(--d); }
        .trh-face { transition: filter .2s; }
        .trh-face:hover { filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--primary) 45%, transparent)); z-index: 2; }
        .trh-ring { animation: trh-ring 1.6s cubic-bezier(0.16,1,0.3,1); }
        .trh-spot { animation: trh-spot .5s cubic-bezier(.16,1,.3,1); }
        .trh-orbit:hover .trh-track, .trh-orbit:hover .trh-face { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .trh-track, .trh-face, .trh-face > span, .trh-ring, .trh-spot { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

function OrbitFace({ t, i, n, radius, size, cls }: { t: Trainer; i: number; n: number; radius: number; size: number; cls: string }) {
  const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
  // Position relative to the track's own centre (track is a square, centre = 50%).
  const x = Math.cos(a) * radius;
  const y = Math.sin(a) * radius;
  return (
    <div
      className={`trh-face ${cls} absolute`}
      style={{ left: `calc(50% + ${x}px - ${size / 2}px)`, top: `calc(50% + ${y}px - ${size / 2}px)`, ["--d" as string]: `${i * 70}ms` }}
      title={`${t.displayName || t.name}${t.avgScore !== null ? ` · ${t.avgScore}%` : ""}`}
    >
      <TrainerAvatar name={t.name} size={size} className="shadow-sm" />
    </div>
  );
}
