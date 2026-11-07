"use client";

import * as React from "react";
import {
  GraduationCap, Star, Heart, TriangleAlert, ChevronRight, Radio, Search, RefreshCw, Loader2, Settings2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";
import { loadAll } from "@/lib/iris/live-data";
import { useAppStore } from "@/lib/iris/store";
import { TRAINER_IMAGES } from "@/lib/iris/constants";
import {
  applyCorrection, buildTrainerProfiles, loadOverrides, orgAverage, saveOverrides,
  CITY_ORDER,
  type Trainer, type TrainerCorrection, type TrainerOverrides,
} from "@/lib/iris/trainer-directory";
import { TrainerReport } from "../trainer-report";
import { TrainerPhoto } from "../trainer-photo";
import { ImageStreamHero } from "../image-stream-hero";
import { RelativeTime } from "../relative-time";
import "./trainers.css";

/**
 * Trainers tab, structured like the reference iris-ai-v2 `app/trainers/page.tsx`:
 * header, image-stream hero with live facts, search, trainer cards grouped by city, the report
 * dialog on click, and an administrator-only dialog for corrections to a card.
 *
 * Data comes from the live ticket list (see lib/iris/trainer-directory). The hero's "listening"
 * toggle re-reads tickets every minute, as v2 re-reads its scorecards. v2's Fillout/Zite sync and
 * review removal have no IRIS counterpart (no assessments are stored) and are left out.
 */

const POLL_MS = 60000;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function TrainersView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const isAdmin = useAppStore((s) => s.currentUser.tier === "admin");

  // This view only mounts after <AuthGate> has loaded on the client, so reading localStorage
  // in the initializer cannot cause a hydration mismatch.
  const [overrides, setOverrides] = React.useState<TrainerOverrides>(() => loadOverrides());
  const [q, setQ] = React.useState("");
  const [activeName, setActiveName] = React.useState<string>();
  const [manage, setManage] = React.useState<Trainer>();
  const [mergeInto, setMergeInto] = React.useState("");
  const [renameTo, setRenameTo] = React.useState("");
  const [listening, setListening] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState<string | null>(null);
  const [ping, setPing] = React.useState("");
  const [error, setError] = React.useState("");
  const seen = React.useRef<Set<string> | null>(null);

  const build = React.useMemo(
    // dataVersion is bumped whenever ALL_TICKETS changes in place.
    () => buildTrainerProfiles(ALL_TICKETS, overrides),
    [overrides, dataVersion],
  );
  const { trainers, hidden, roster, sources } = build;

  const refresh = React.useCallback(async (quiet: boolean) => {
    if (!quiet) setRefreshing(true);
    try {
      await loadAll();
      bumpData();
      setLastSync(new Date().toISOString());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't refresh tickets");
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, [bumpData]);

  // A new piece of feedback that lands mid-session announces itself.
  React.useEffect(() => {
    const ids = new Set(trainers.flatMap((t) => t.recentFeedback.map((f) => f.id)));
    if (seen.current) {
      const fresh = [...ids].filter((id) => !seen.current!.has(id));
      if (fresh.length) {
        const owner = trainers.find((t) => t.recentFeedback.some((f) => f.id === fresh[0]));
        setPing(`${plural(fresh.length, "new feedback ticket")} received${owner ? ` · ${owner.displayName || owner.name}` : ""}`);
        const timer = setTimeout(() => setPing(""), 7000);
        seen.current = ids;
        return () => clearTimeout(timer);
      }
    }
    seen.current = ids;
  }, [trainers]);

  // Pauses while the tab is hidden and catches up as soon as it is visible again.
  React.useEffect(() => {
    if (!listening) return;
    const tick = () => { if (!document.hidden) void refresh(true); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [listening, refresh]);

  const filtered = React.useMemo(() => {
    const lower = q.toLowerCase();
    return trainers.filter((t) => !q || [t.displayName || t.name, t.primaryStudio, t.city].some((v) => (v || "").toLowerCase().includes(lower)));
  }, [trainers, q]);

  /** Mumbai and Bengaluru, and nothing below that: a trainer belongs to a city, and the
   *  studios they have been named at are on their card. */
  const grouped = React.useMemo(() => {
    const byCity = new Map<string, Trainer[]>();
    for (const t of filtered) byCity.set(t.city, [...(byCity.get(t.city) || []), t]);
    const order = (c: string) => { const i = CITY_ORDER.indexOf(c as never); return i < 0 ? CITY_ORDER.length : i; };
    return [...byCity.entries()]
      .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
      .map(([city, people]) => ({
        city,
        people: people.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name)),
      }));
  }, [filtered]);

  const active = React.useMemo(() => trainers.find((t) => t.name === activeName), [trainers, activeName]);
  const orgAvg = orgAverage(trainers);

  /** Administrator corrections. Every one is reversible and none touches a ticket. */
  function correct(c: TrainerCorrection, message: string) {
    try {
      const next = applyCorrection(overrides, c);
      setOverrides(next);
      saveOverrides(next);
      setPing(message);
      setTimeout(() => setPing(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't apply that correction");
    }
  }

  const portraits = React.useMemo(
    () => Object.values(TRAINER_IMAGES).map((src) => ({ src, alt: "Trainer portrait" })),
    [],
  );

  return (
    <div className="trainers-view p-8 max-w-[1400px] mx-auto">
      <div className="tv-head">
        <div>
          <span className="eyebrow">Training &amp; Quality</span>
          <h1>Trainer reviews</h1>
        </div>
        <div className="flex-row">
          <button className="btn" disabled={refreshing} onClick={() => void refresh(false)}>
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={14} />}
            {refreshing ? "Refreshing..." : "Refresh feedback"}
          </button>
          <span className="badge blue"><GraduationCap size={12} />{trainers.length} trainers tracked</span>
        </div>
      </div>

      {/* The corridor: every trainer portrait on file rides the two rails that open outward
          from the centred copy. */}
      <ImageStreamHero
        images={portraits}
        cards={9}
        speed={23}
        axis={50}
        className="tr-stream-hero"
        path={{ perspective: 26, railBirth: 15, railExit: 54, fan: 2.2, turnBirth: 10, turnExit: 32 }}
      >
        <div className="tr-stream-copy">
          <span className="eyebrow">Training &amp; Quality</span>
          <h2>Every assessment and every piece of feedback, in one scorecard.</h2>
          <p>Weighted evaluation scores, member compliments and logged concerns - combined per trainer so coaching conversations start from evidence.</p>
          <div className="tr-stream-facts">
            <button
              type="button"
              className="badge"
              onClick={() => setListening((v) => !v)}
              title={listening ? `Checking every ${POLL_MS / 1000} seconds` : "Live updates paused"}
            >
              <Radio size={11} style={{ color: listening ? "var(--tv-green)" : "var(--muted-foreground)" }} />
              {listening ? "Listening for new submissions" : "Live updates paused"}
            </button>
            {lastSync && <span className="badge">Last synced <RelativeTime date={lastSync} /></span>}
            {sources.map((s) => <span key={s.label} className="badge">{s.label} · {s.count}</span>)}
            {orgAvg !== null && (
              <span className={`badge ${orgAvg >= 80 ? "green" : orgAvg >= 65 ? "amber" : "red"}`}>Org average {orgAvg}%</span>
            )}
          </div>
        </div>
      </ImageStreamHero>

      {ping && <div className="info-box">✦ {ping}</div>}

      <div className="tv-search">
        <Search size={14} />
        <input placeholder="Find a trainer, studio or city..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <div className="error-box">{error}</div>}

      {!filtered.length ? (
        <div className="tv-empty">
          <GraduationCap size={28} style={{ margin: "0 auto 8px" }} />
          No trainers found
        </div>
      ) : (
        <div className="trainer-groups">
          {grouped.map((group) => (
            <section className="trainer-city-group" key={group.city}>
              <header className="trainer-group-heading">
                <span>{group.city} trainers</span>
                <small>{group.people.length} {group.people.length === 1 ? "trainer" : "trainers"}</small>
              </header>
              <div className="entity-grid">
                {group.people.map((t) => (
                  <div key={t.name} className="trainer-profile-card-wrap">
                    <button type="button" className="trainer-profile-card" onClick={() => setActiveName(t.name)}>
                      {/* Compact portrait row: a small framed headshot beside the name, so the
                          card leads with identity and data, not a photo wall. */}
                      <div className="trainer-profile-meta">
                        <div className="tpc-head">
                          <span className="tpc-photo">
                            <TrainerPhoto
                              name={t.name}
                              className="tpc-photo-img"
                              fallback={<>{(t.displayName || t.name).split(" ").map((w) => w[0]).slice(0, 2).join("")}</>}
                            />
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
                          {t.avgScore !== null
                            ? <span className={`badge ${t.bandTone}`}>{t.avgScore}%</span>
                            : <span className="badge">No assessments</span>}
                        </div>
                        <div className="flex-row wrap" style={{ marginTop: 3, gap: 6 }}>
                          <span className="tag"><Star size={10} />{t.assessmentCount} assessments</span>
                          <span className="tag"><Heart size={10} />{t.complimentCount} compliments</span>
                          <span className="tag"><TriangleAlert size={10} />{t.issueCount} flagged</span>
                        </div>
                        {/* Said on the card rather than silently: a folded spelling and an
                            unresolvable first name are both things somebody should know about
                            the data they are reading. */}
                        {!!t.mergedFrom?.length && <p className="tpc-note">Also filed as {t.mergedFrom.join(", ")}</p>}
                        {!!t.ambiguousWith?.length && (
                          <p className="tpc-note tpc-note-warn">
                            “{t.name}” could be {t.ambiguousWith.join(" or ")} - kept separate until somebody says which
                          </p>
                        )}
                        <div className="entity-foot"><span>{t.totalTickets} linked tickets</span><ChevronRight size={14} /></div>
                      </div>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="tpc-manage"
                        title="Edit this trainer card"
                        onClick={() => { setManage(t); setMergeInto(""); setRenameTo(t.displayName || t.name); }}
                      >
                        <Settings2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {isAdmin && hidden.length > 0 && (
            <section className="trainer-city-group">
              <header className="trainer-group-heading">
                <span>Hidden cards</span>
                <small>{hidden.length} removed from the page · tickets still on file</small>
              </header>
              <div className="flex-row wrap" style={{ gap: 8 }}>
                {hidden.map((h) => (
                  <button
                    key={h.name}
                    type="button"
                    className="badge"
                    onClick={() => correct({ action: "hide", name: h.name, hidden: false }, `${h.displayName} restored.`)}
                  >
                    {h.displayName} · {h.totalTickets} tickets · restore
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Consolidated trainer performance report */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActiveName(undefined)}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto iris-scrollbar p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{active?.displayName || active?.name} - performance report</DialogTitle>
          {active && (
            <div className="trainers-view p-4">
              <TrainerReport trainer={active} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Administrator corrections to one card. Deliberately a separate dialog from the report:
          the report is for reading somebody's file, this is for fixing the record. */}
      <Dialog open={!!manage} onOpenChange={(open) => !open && setManage(undefined)}>
        <DialogContent className="max-w-lg">
          {manage && (
            <div className="trainers-view">
              <DialogHeader>
                <DialogTitle>Edit {manage.displayName || manage.name}</DialogTitle>
                <DialogDescription>
                  Corrections to how this trainer is grouped and labelled. Tickets are not affected.
                </DialogDescription>
              </DialogHeader>
              <div className="tv-stack" style={{ marginTop: 16 }}>
                <div>
                  <span className="tr-kpi-label">City</span>
                  <p className="tv-field-note">Currently {manage.city}. Trainers are grouped by city, not by studio.</p>
                  <div className="flex-row">
                    {CITY_ORDER.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className={manage.city === city ? "btn-primary" : "btn"}
                        disabled={manage.city === city}
                        onClick={() => { correct({ action: "city", name: manage.name, city }, `${manage.displayName || manage.name} moved to ${city}.`); setManage(undefined); }}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="tr-kpi-label">Name on the card</span>
                  <p className="tv-field-note">A correction to the label only. It does not regroup anything, and clearing it restores {manage.name}.</p>
                  <div className="flex-row">
                    <input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder={manage.name} />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        correct({ action: "rename", name: manage.name, displayName: renameTo.trim() === manage.name ? "" : renameTo.trim() }, "Name updated.");
                        setManage(undefined);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div>
                  <span className="tr-kpi-label">Merge into another trainer</span>
                  <p className="tv-field-note">
                    Folds every ticket filed as “{manage.name}” into the trainer you choose. Use this for a
                    spelling that is the same person, and for a first name the app could not resolve on its own.
                  </p>
                  <div className="flex-row">
                    <select value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}>
                      <option value="">Choose a trainer...</option>
                      {roster.filter((name) => name !== manage.name).map((name) => <option key={name}>{name}</option>)}
                    </select>
                    <button
                      type="button"
                      className="btn"
                      disabled={!mergeInto}
                      onClick={() => { correct({ action: "merge", from: manage.name, into: mergeInto }, `“${manage.name}” merged into ${mergeInto}.`); setManage(undefined); }}
                    >
                      Merge
                    </button>
                  </div>
                  {!!manage.mergedFrom?.length && (
                    <div className="flex-row wrap" style={{ gap: 6, marginTop: 10 }}>
                      <span className="muted" style={{ fontSize: 11 }}>Folded in:</span>
                      {manage.mergedFrom.map((spelling) => (
                        <button
                          key={spelling}
                          type="button"
                          className="badge"
                          title="Separate this spelling again"
                          onClick={() => { correct({ action: "unmerge", from: spelling }, `“${spelling}” separated again.`); setManage(undefined); }}
                        >
                          {spelling} · undo
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <span className="tr-kpi-label">Remove the card</span>
                  <p className="tv-field-note">
                    Takes {manage.displayName || manage.name} off this page. The {plural(manage.totalTickets, "linked ticket")} stay
                    on file, and the card can be restored.
                  </p>
                  <button
                    type="button"
                    className="btn-danger-ghost"
                    onClick={() => { correct({ action: "hide", name: manage.name, hidden: true }, `${manage.displayName || manage.name} hidden.`); setManage(undefined); }}
                  >
                    Hide this trainer
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
