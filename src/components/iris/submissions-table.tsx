"use client";

import * as React from "react";
import { Sparkles, ArrowUpDown } from "lucide-react";
import { performanceBand, bandTone, resolveTrainer, type Assessment } from "@/lib/iris/trainer-directory";

type Row = Assessment & { trainerName: string };

const SEEN_KEY = "iris:trainer-submissions:seen-at";
/** Anything imported in this window is "new" even for someone who has never opened the table. */
const NEW_WINDOW_MS = 48 * 3600_000;

function readSeen(): number {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeSeen(at: number) {
  try {
    window.localStorage.setItem(SEEN_KEY, String(at));
  } catch {
    /* storage unavailable: "new" falls back to the 48h window */
  }
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

type SortKey = "submittedAt" | "createdAt" | "score" | "trainer";
type Sort = { key: SortKey; dir: 1 | -1 };

function Th({ k, sort, onSort, children }: { k: SortKey; sort: Sort; onSort: (k: SortKey) => void; children: React.ReactNode }) {
  return (
    <th aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="st-sort" onClick={() => onSort(k)}>
        {children}
        <ArrowUpDown size={11} />
      </button>
    </th>
  );
}

/**
 * Every Fillout / Zite submission on file in one table, newest first. A row is "new" when it
 * arrived since this browser last opened the table, or in the last 48 hours.
 */
export function SubmissionsTable({
  assessments,
  query,
  onOpenTrainer,
}: {
  assessments: Row[];
  query: string;
  onOpenTrainer: (name: string) => void;
}) {
  // What counted as "seen" when the table was opened; marked seen again on the way out, so the
  // highlights stay put while someone is reading them.
  const [seenAt] = React.useState(readSeen);
  React.useEffect(() => () => writeSeen(Date.now()), []);

  const [source, setSource] = React.useState("all");
  const [onlyNew, setOnlyNew] = React.useState(false);
  const [sort, setSort] = React.useState<Sort>({ key: "createdAt", dir: -1 });

  const now = Date.now();
  const isNew = React.useCallback(
    (a: Row) => {
      const at = Date.parse(a.createdAt);
      return at > seenAt || now - at < NEW_WINDOW_MS;
    },
    [seenAt, now],
  );

  const sources = React.useMemo(() => [...new Set(assessments.map((a) => a.sourceLabel))].sort(), [assessments]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = assessments
      .map((a) => ({ ...a, trainer: resolveTrainer(a.trainerName).name || a.trainerName }))
      .filter((a) => source === "all" || a.sourceLabel === source)
      .filter((a) => !onlyNew || isNew(a))
      .filter(
        (a) =>
          !q ||
          [a.trainer, a.studio, a.evaluator, a.sessionName, a.sourceLabel, a.ticketNumber].join(" ").toLowerCase().includes(q),
      );
    const val = (a: (typeof list)[number]) =>
      sort.key === "score" ? a.score : sort.key === "trainer" ? a.trainer.toLowerCase() : Date.parse(a[sort.key]);
    return list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [assessments, query, source, onlyNew, sort, isNew]);

  const newCount = assessments.filter(isNew).length;
  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }));
  return (
    <section className="st-wrap">
      {newCount > 0 && (
        <button type="button" className={`st-new-banner${onlyNew ? " on" : ""}`} onClick={() => setOnlyNew((v) => !v)}>
          <Sparkles size={14} />
          <strong>{newCount} new {newCount === 1 ? "submission" : "submissions"}</strong>
          <span>{onlyNew ? "Showing new only — show all" : "since you last looked — show only these"}</span>
        </button>
      )}

      <div className="st-toolbar">
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by form">
          <option value="all">All forms ({assessments.length})</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s} ({assessments.filter((a) => a.sourceLabel === s).length})
            </option>
          ))}
        </select>
        <span className="st-count">{rows.length} shown</span>
      </div>

      {!rows.length ? (
        <div className="tv-empty">No submissions match.</div>
      ) : (
        <div className="st-scroll">
          <table className="st-table">
            <thead>
              <tr>
                <Th k="createdAt" sort={sort} onSort={toggle}>Received</Th>
                <Th k="trainer" sort={sort} onSort={toggle}>Trainer</Th>
                <Th k="score" sort={sort} onSort={toggle}>Score</Th>
                <th>Form</th>
                <th>Studio</th>
                <th>Class</th>
                <th>Evaluator</th>
                <Th k="submittedAt" sort={sort} onSort={toggle}>Class date</Th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const fresh = isNew(a);
                const band = a.band || performanceBand(a.score);
                return (
                  <tr key={a.id} className={fresh ? "st-row-new" : undefined}>
                    <td className="st-nowrap">
                      {fresh && <span className="st-new-pill">New</span>}
                      {fmt(a.createdAt)}
                    </td>
                    <td>
                      <button type="button" className="st-link" onClick={() => onOpenTrainer(a.trainer)}>{a.trainer}</button>
                    </td>
                    <td className="st-nowrap">
                      <span className={`badge ${a.bandTone || bandTone(performanceBand(a.score))}`}>{a.score}%</span>
                      <small className="st-band">{band}</small>
                    </td>
                    <td>{a.sourceLabel}</td>
                    <td>{a.studio || "—"}</td>
                    <td>{a.sessionName || "—"}</td>
                    <td>{a.evaluator}</td>
                    <td className="st-nowrap">{fmt(a.submittedAt)}</td>
                    <td className="st-nowrap">{a.ticketNumber || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
