"use client";

// Shared chrome for the three-step drill-down pages (Templates and Knowledge Base):
// Category → Sub-category → item, with a clickable stepper and step headings.

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG, type Priority } from "@/lib/iris/types";

export type DrilldownAccent =
  | "violet"
  | "emerald"
  | "sky"
  | "amber"
  | "pink"
  | "orange"
  | "rose"
  | "indigo"
  | "red"
  | "cyan"
  | "teal"
  | "purple"
  | "slate";

export interface AccentStyle {
  icon: string;
  bar: string;
  hover: string;
  text: string;
}

/** Literal class strings per accent so Tailwind can see them. */
export const ACCENT_STYLES: Record<DrilldownAccent, AccentStyle> = {
  violet: { icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400", bar: "bg-violet-500", hover: "hover:border-violet-500/50", text: "text-violet-600 dark:text-violet-400" },
  emerald: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", hover: "hover:border-emerald-500/50", text: "text-emerald-600 dark:text-emerald-400" },
  sky: { icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400", bar: "bg-sky-500", hover: "hover:border-sky-500/50", text: "text-sky-600 dark:text-sky-400" },
  amber: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400", bar: "bg-amber-500", hover: "hover:border-amber-500/50", text: "text-amber-600 dark:text-amber-400" },
  pink: { icon: "bg-pink-500/10 text-pink-600 dark:text-pink-400", bar: "bg-pink-500", hover: "hover:border-pink-500/50", text: "text-pink-600 dark:text-pink-400" },
  orange: { icon: "bg-orange-500/10 text-orange-600 dark:text-orange-400", bar: "bg-orange-500", hover: "hover:border-orange-500/50", text: "text-orange-600 dark:text-orange-400" },
  rose: { icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400", bar: "bg-rose-500", hover: "hover:border-rose-500/50", text: "text-rose-600 dark:text-rose-400" },
  indigo: { icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-500", hover: "hover:border-indigo-500/50", text: "text-indigo-600 dark:text-indigo-400" },
  red: { icon: "bg-red-500/10 text-red-600 dark:text-red-400", bar: "bg-red-500", hover: "hover:border-red-500/50", text: "text-red-600 dark:text-red-400" },
  cyan: { icon: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", bar: "bg-cyan-500", hover: "hover:border-cyan-500/50", text: "text-cyan-600 dark:text-cyan-400" },
  teal: { icon: "bg-teal-500/10 text-teal-600 dark:text-teal-400", bar: "bg-teal-500", hover: "hover:border-teal-500/50", text: "text-teal-600 dark:text-teal-400" },
  purple: { icon: "bg-purple-500/10 text-purple-600 dark:text-purple-400", bar: "bg-purple-500", hover: "hover:border-purple-500/50", text: "text-purple-600 dark:text-purple-400" },
  slate: { icon: "bg-slate-500/10 text-slate-600 dark:text-slate-400", bar: "bg-slate-500", hover: "hover:border-slate-500/50", text: "text-slate-600 dark:text-slate-400" },
};

export const PRIORITY_ORDER: Priority[] = ["P0", "P1", "P2", "P3"];

/**
 * Four-step breadcrumb: Category → Sub-category → item → final step. `step` 0 means
 * "searching" (nothing current). Completed steps 1–3 are clickable.
 */
export function Stepper({
  step,
  labels,
  onStep,
  ariaLabel = "Steps",
}: {
  step: 0 | 1 | 2 | 3 | 4;
  labels: string[];
  onStep: (n: number) => void;
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-1 flex-wrap text-[12px]">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const current = step === n;
        const clickable = done && n < 4;
        return (
          <React.Fragment key={n}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStep(n)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors max-w-[260px]",
                current && "bg-primary/10 text-primary font-semibold",
                done && "text-foreground hover:bg-muted/60",
                !current && !done && "text-muted-foreground",
                !clickable && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                  current ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted",
                )}
              >
                {n}
              </span>
              <span className="truncate">{label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function StepHeading({ n, title, subtitle, children }: { n: number; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap pt-1">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Step {n} of 3</div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Compact "P0·2 P1·5 …" pills (zero counts hidden). */
export function PriorityMix({ counts }: { counts: Record<Priority, number> }) {
  return (
    <div className="flex items-center gap-1">
      {PRIORITY_ORDER.filter((p) => counts[p] > 0).map((p) => (
        <span
          key={p}
          className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums", PRIORITY_CONFIG[p].bg, PRIORITY_CONFIG[p].text)}
          title={`${counts[p]} × ${PRIORITY_CONFIG[p].label}`}
        >
          {p}·{counts[p]}
        </span>
      ))}
    </div>
  );
}
