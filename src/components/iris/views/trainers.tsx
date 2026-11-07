"use client";

import * as React from "react";
import {
  GraduationCap, Star, Heart, TriangleAlert, ChevronRight,
  Radio, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  TRAINERS_FULL, ORG_AVG,
  type Trainer,
} from "@/lib/iris/trainer-directory";
import { TrainerReport } from "../trainer-report";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Trainers view — ported from the reference iris-ai-v2 repo's
 * `app/trainers/page.tsx`, adapted to this dashboard's app shell (no Shell
 * component, no API calls — uses the static TRAINERS_FULL roster instead).
 *
 * The visual structure matches the reference:
 *   - Hero with eyebrow + headline + copy + facts row (org avg, listening
 *     toggle, trainers tracked count)
 *   - Search field
 *   - Trainer groups by city (Mumbai first, Bengaluru second)
 *   - Profile cards in a lean grid (auto-fill, minmax 268px)
 *   - Click a card → modal with the full TrainerReport
 *
 * All the scorecard visuals (masthead, KPI tiles, score dial, trend chart,
 * radar chart, rubric bars, review cards) live in the TrainerReport
 * component and the .tr-* CSS in globals.css.
 */
export function TrainersView() {
  const [q, setQ] = React.useState("");
  const [activeName, setActiveName] = React.useState<string>();
  const [listening, setListening] = React.useState(true);

  const filtered = React.useMemo(() => {
    if (!q) return TRAINERS_FULL;
    const lower = q.toLowerCase();
    return TRAINERS_FULL.filter((t) =>
      [t.displayName || t.name, t.primaryStudio, t.city]
        .some((v) => (v || "").toLowerCase().includes(lower)),
    );
  }, [q]);

  /** Group by city, Mumbai first. */
  const grouped = React.useMemo(() => {
    const cityOrder = (city: string) => (city === "Mumbai" ? 0 : 1);
    const byCity = new Map<string, Trainer[]>();
    for (const t of filtered) {
      if (!byCity.has(t.city)) byCity.set(t.city, []);
      byCity.get(t.city)!.push(t);
    }
    return [...byCity.entries()]
      .sort(([a], [b]) => cityOrder(a) - cityOrder(b))
      .map(([city, people]) => ({
        city,
        people: people.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name)),
      }));
  }, [filtered]);

  const active = React.useMemo(
    () => TRAINERS_FULL.find((t) => t.name === activeName),
    [activeName],
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* === Hero === */}
      <div className="relative overflow-hidden rounded-2xl border border-border p-8 iris-fade-in-up iris-hero-tint">
        {/* Floating orbs colored with accent vars (follows random accent) */}
        <div
          className="absolute -top-20 -right-10 w-80 h-80 rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, var(--iris-hero-from), transparent 65%)",
            animation: "trainer-orb-a 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-20 left-20 w-60 h-60 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, var(--iris-hero-to), transparent 65%)",
            animation: "trainer-orb-b 10s ease-in-out infinite",
          }}
        />
        <div className="absolute inset-0 iris-grid-bg opacity-40" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Training &amp; Quality
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">
            Trainer Reviews
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Every assessment and every piece of feedback, in one scorecard.
            Weighted evaluation scores, member compliments and logged concerns -
            combined per trainer so coaching conversations start from evidence.
          </p>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              type="button"
              onClick={() => setListening((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors",
                listening
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-border bg-muted text-muted-foreground",
              )}
              title={listening ? "Checking every 60 seconds" : "Live updates paused"}
            >
              <Radio className="w-2.5 h-2.5" style={{ color: listening ? "#34c759" : undefined }} />
              {listening ? "Listening for new submissions" : "Live updates paused"}
            </button>
            {ORG_AVG !== null && (
              <span
                className={cn(
                  "iris-tr-badge",
                  ORG_AVG >= 80 ? "tone-green" : ORG_AVG >= 65 ? "tone-amber" : "tone-red",
                )}
              >
                Org average {ORG_AVG}%
              </span>
            )}
            <span className="iris-tr-badge tone-none">
              <GraduationCap className="w-2.5 h-2.5 mr-0.5" style={{ display: "inline" }} />
              {TRAINERS_FULL.length} trainers tracked
            </span>
          </div>
        </div>
        <style>{`
          @keyframes trainer-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-15px,15px) scale(1.1); } }
          @keyframes trainer-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(15px,-15px) scale(0.9); } }
        `}</style>
      </div>

      {/* === Search === */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Find a trainer, studio or city..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 pl-8 text-[12px]"
        />
      </div>

      {/* === Trainer groups by city === */}
      {!filtered.length ? (
        <div className="text-center py-20">
          <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] text-muted-foreground">No trainers found</div>
        </div>
      ) : (
        <div className="trainer-groups">
          {grouped.map((group) => (
            <section className="trainer-city-group" key={group.city}>
              <header className="trainer-group-heading">
                <span>{group.city} trainers</span>
                <small>
                  {group.people.length} {group.people.length === 1 ? "trainer" : "trainers"}
                </small>
              </header>
              <div className="entity-grid trainer-grid">
                {group.people.map((t) => (
                  <div key={t.name} className="trainer-profile-card-wrap">
                    <button
                      type="button"
                      className="trainer-profile-card"
                      onClick={() => setActiveName(t.name)}
                    >
                      <div className="trainer-profile-meta">
                        {/* Compact portrait row */}
                        <div className="tpc-head">
                          <span className="tpc-photo">
                            {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </span>
                          <span className="tpc-id">
                            <h3>{t.displayName || t.name}</h3>
                            <p>
                              {t.band || "Awaiting a formal assessment"} ·{" "}
                              {t.studioSummary.length
                                ? t.studioSummary.length + (t.studioSummary.length === 1 ? " studio" : " studios")
                                : "No studio on record"}
                            </p>
                          </span>
                          {t.avgScore !== null ? (
                            <span className={`iris-tr-badge tone-${t.bandTone}`}>{t.avgScore}%</span>
                          ) : (
                            <span className="iris-tr-badge tone-none">No assessments</span>
                          )}
                        </div>
                        <div className="tpc-tags">
                          <span className="tpc-tag">
                            <Star className="w-2.5 h-2.5" style={{ display: "inline" }} />
                            {t.assessmentCount} assessments
                          </span>
                          <span className="tpc-tag">
                            <Heart className="w-2.5 h-2.5" style={{ display: "inline" }} />
                            {t.complimentCount} compliments
                          </span>
                          {t.issueCount > 0 && (
                            <span className="tpc-tag tag-red">
                              <TriangleAlert className="w-2.5 h-2.5" style={{ display: "inline" }} />
                              {t.issueCount} flagged
                            </span>
                          )}
                        </div>
                        <div className="entity-foot">
                          <span>{t.totalTickets} linked tickets</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* === Trainer report modal === */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActiveName(undefined)}>
        <DialogContent
          className="max-w-4xl max-h-[88vh] overflow-y-auto iris-scrollbar p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {active?.displayName || active?.name} - performance report
          </DialogTitle>
          {active && (
            <div className="p-4">
              <TrainerReport trainer={active} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
