"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Command,
  MousePointerClick,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppStore, type ViewName } from "@/lib/iris/store";
import { useUserCollections } from "@/lib/iris/user-collections";

/**
 * One-time guided tour of IRIS V3, shown at the next sign-in until finished.
 * It can't be skipped, but it is short (≈2 min) and hands-on: four steps wait
 * for the person to actually do the thing (open a view, send a practice report,
 * open ⌘K) before "Next" unlocks. Completion is stored in user preferences.
 */

type Task =
  | { kind: "view"; view: ViewName; hint: string }
  | { kind: "demo"; hint: string }
  | { kind: "palette"; hint: string };

type Step = {
  id: string;
  /** `data-tour` anchor to spotlight; centred card when absent or not on screen. */
  target?: string;
  /** View to open before showing the step (info steps only). */
  view?: ViewName;
  eyebrow: string;
  title: string;
  body: string;
  task?: Task;
  /** Renders the dummy intake walkthrough inside the card. */
  demo?: boolean;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    eyebrow: "Welcome to IRIS V3",
    title: "Two minutes, four things to try",
    body: "IRIS now classifies reports with AI, routes them to the right owner with an SLA, and asks only the questions that matter. Let's take a quick hands-on look.",
  },
  {
    id: "overview",
    target: "nav-overview",
    view: "overview",
    eyebrow: "Overview",
    title: "Your studio's pulse",
    body: "Open, urgent and past-SLA tickets for your studio, what's due next, and what's being raised most. Start your day here.",
  },
  {
    id: "open-ai",
    target: "nav-ai_assistant",
    eyebrow: "Try it · 1 of 4",
    title: "Report an issue in plain words",
    body: "No forms to hunt for. You describe what happened and IRIS works out the rest.",
    task: {
      kind: "view",
      view: "ai_assistant",
      hint: "Click AI Assistant in the sidebar",
    },
  },
  {
    id: "demo",
    eyebrow: "Try it · 2 of 4",
    title: "Here's what a report looks like",
    body: "Someone typed the message below. IRIS picked the category, owner and SLA, and asks only what an AC fault needs. Answer the highlighted question to see the follow-up appear.",
    demo: true,
    task: { kind: "demo", hint: "Answer \u201cHave members complained?\u201d" },
  },
  {
    id: "open-tickets",
    target: "nav-all_tickets",
    eyebrow: "Try it · 3 of 4",
    title: "Every ticket, one place",
    body: "Search, filter, group and act on tickets in bulk.",
    task: {
      kind: "view",
      view: "all_tickets",
      hint: "Click All Tickets in the sidebar",
    },
  },
  {
    id: "views",
    target: "saved-views",
    view: "all_tickets",
    eyebrow: "New",
    title: "Saved views",
    body: "Set up the filters you use every day (say, breached P0s at your studio), then save them here and bring them back with one click.",
  },
  {
    id: "palette",
    eyebrow: "Try it · 4 of 4",
    title: "Find anything in a keystroke",
    body: "Tickets, members, templates and articles from anywhere in IRIS.",
    task: { kind: "palette", hint: "Press ⌘K (Ctrl K on Windows)" },
  },
  {
    id: "member-360",
    target: "member-360",
    eyebrow: "Members",
    title: "Member 360",
    body: "Look up any member's Momence profile, memberships, visits and past tickets before you reply to them.",
  },
  {
    id: "templates",
    target: "nav-templates",
    view: "templates",
    eyebrow: "Templates",
    title: "Ready-made forms, and your drafts",
    body: "Hundreds of templates for common issues. Half-filled ones can be saved as drafts (up to three) and resumed later.",
  },
  {
    id: "escalations",
    target: "nav-escalations",
    eyebrow: "Escalations",
    title: "Nothing slips past SLA",
    body: "Breached and escalated tickets gather here, and owners are nudged automatically.",
  },
  {
    id: "notifications",
    target: "notifications",
    eyebrow: "Stay in the loop",
    title: "Notifications",
    body: "Assignments, mentions, nudges and SLA warnings land here.",
  },
  {
    id: "done",
    eyebrow: "You're all set",
    title: "That's IRIS V3",
    body: "Report issues from AI Assistant or the New issue button. Questions or ideas? Use the feedback button at the top right.",
  },
];

const PAD = 6;

function useTargetRect(anchor: string | undefined, tick: number) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!anchor) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      const r = el?.getBoundingClientRect();
      const visible =
        r &&
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.top < window.innerHeight;
      setRect((prev) =>
        visible
          ? prev &&
            Math.abs(prev.x - r.x) < 0.5 &&
            Math.abs(prev.y - r.y) < 0.5 &&
            Math.abs(prev.width - r.width) < 0.5 &&
            Math.abs(prev.height - r.height) < 0.5
            ? prev
            : r
          : null,
      );
      raf = window.requestAnimationFrame(measure);
    };
    const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [anchor, tick]);
  return anchor ? rect : null;
}

export function ProductTour({
  paletteOpen,
  openPalette,
}: {
  paletteOpen: boolean;
  openPalette: () => void;
}) {
  const tourCompletedAt = useUserCollections((s) => s.tourCompletedAt);
  const completeTour = useUserCollections((s) => s.completeTour);
  const signedIn = useAppStore((s) => Boolean(s.currentUser?.userId));
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [demoAnswer, setDemoAnswer] = React.useState<string | null>(null);

  const [index, setIndex] = React.useState(0);
  const [doneTasks, setDoneTasks] = React.useState<Record<string, boolean>>({});

  const active = signedIn && tourCompletedAt === null;
  const step = STEPS[index];

  // Info steps bring their view on screen; task steps wait for the person to go there.
  React.useEffect(() => {
    if (active && step.view && !step.task && currentView !== step.view)
      setCurrentView(step.view);
  }, [active, step, currentView, setCurrentView]);

  // Detect task completion.
  React.useEffect(() => {
    if (!active || !step.task || doneTasks[step.id]) return;
    const t = step.task;
    const done =
      (t.kind === "view" && currentView === t.view) ||
      (t.kind === "palette" && paletteOpen) ||
      (t.kind === "demo" && demoAnswer !== null);
    if (!done) return;
    // Latch it (next frame), so closing ⌘K or leaving the view doesn't re-lock "Next".
    const id = window.requestAnimationFrame(() =>
      setDoneTasks((d) => ({ ...d, [step.id]: true })),
    );
    return () => window.cancelAnimationFrame(id);
  }, [active, step, currentView, paletteOpen, demoAnswer, doneTasks]);

  const rect = useTargetRect(
    active ? step.target : undefined,
    currentView.length,
  );

  if (!active) return null;

  const taskPending = Boolean(step.task && !doneTasks[step.id]);
  const isLast = index === STEPS.length - 1;
  const hole = rect
    ? {
        x: rect.left - PAD,
        y: rect.top - PAD,
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : null;
  // While the palette is open (task 4), get out of its way entirely.
  const hidden = paletteOpen && step.task?.kind === "palette";

  const next = () => {
    if (isLast) {
      void completeTour();
      setCurrentView("overview");
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <div
      className={cn("fixed inset-0 z-[90]", hidden && "invisible")}
      aria-live="polite"
    >
      {/* Dim everything except the spotlight. Clicks pass through the hole only on task steps. */}
      {hole ? (
        <>
          <Blocker
            style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.y) }}
          />
          <Blocker
            style={{ left: 0, top: hole.y + hole.h, right: 0, bottom: 0 }}
          />
          <Blocker
            style={{
              left: 0,
              top: hole.y,
              width: Math.max(0, hole.x),
              height: hole.h,
            }}
          />
          <Blocker
            style={{
              left: hole.x + hole.w,
              top: hole.y,
              right: 0,
              height: hole.h,
            }}
          />
          {!taskPending && (
            <Blocker
              clear
              style={{
                left: hole.x,
                top: hole.y,
                width: hole.w,
                height: hole.h,
              }}
            />
          )}
          <div
            className={cn(
              "pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300 ease-out",
              taskPending && "animate-pulse",
            )}
            style={{
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              boxShadow:
                "0 0 0 1px rgba(255,255,255,.15), 0 0 28px 2px var(--primary)",
            }}
          />
        </>
      ) : (
        <Blocker style={{ inset: 0 }} />
      )}

      <TourCard
        step={step}
        index={index}
        hole={hole}
        taskPending={taskPending}
        taskDone={Boolean(step.task && doneTasks[step.id])}
        isLast={isLast}
        targetMissing={!hole}
        demoAnswer={demoAnswer}
        onDemoAnswer={setDemoAnswer}
        onDoTask={() => {
          if (step.task?.kind === "view") setCurrentView(step.task.view);
          else if (step.task?.kind === "palette") openPalette();
        }}
        onBack={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={next}
      />
    </div>
  );
}

function Blocker({
  style,
  clear,
}: {
  style: React.CSSProperties;
  clear?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute pointer-events-auto",
        !clear && "bg-black/55 backdrop-blur-[1.5px]",
      )}
      style={style}
    />
  );
}

function TourCard({
  step,
  index,
  hole,
  taskPending,
  taskDone,
  isLast,
  targetMissing,
  demoAnswer,
  onDemoAnswer,
  onDoTask,
  onBack,
  onNext,
}: {
  step: Step;
  index: number;
  hole: { x: number; y: number; w: number; h: number } | null;
  taskPending: boolean;
  taskDone: boolean;
  isLast: boolean;
  targetMissing: boolean;
  demoAnswer: string | null;
  onDemoAnswer: (v: string) => void;
  onDoTask: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const place = (
    style: Partial<
      Record<"left" | "top" | "right" | "bottom" | "transform", string>
    >,
  ) => {
    const el = ref.current;
    if (!el) return;
    el.style.left = style.left ?? "";
    el.style.top = style.top ?? "";
    el.style.right = style.right ?? "";
    el.style.bottom = style.bottom ?? "";
    el.style.transform = style.transform ?? "";
  };
  const px = (n: number) => `${Math.round(n)}px`;

  React.useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const gap = 14;
    if (!hole || vw < 640) {
      place(
        vw < 640 && hole
          ? { left: "12px", right: "12px", bottom: "12px" }
          : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
      );
      return;
    }
    const clampX = (x: number) => Math.min(Math.max(12, x), vw - cw - 12);
    const clampY = (y: number) => Math.min(Math.max(12, y), vh - ch - 12);
    // Prefer right of narrow targets (sidebar), below wide ones, above when there's no room.
    if (hole.x + hole.w + gap + cw < vw && hole.w < 320)
      place({
        left: px(hole.x + hole.w + gap),
        top: px(clampY(hole.y + hole.h / 2 - ch / 2)),
      });
    else if (hole.y + hole.h + gap + ch < vh)
      place({
        left: px(clampX(hole.x + hole.w / 2 - cw / 2)),
        top: px(hole.y + hole.h + gap),
      });
    else
      place({
        left: px(clampX(hole.x + hole.w / 2 - cw / 2)),
        top: px(clampY(hole.y - gap - ch)),
      });
  }, [hole, step.id]);

  const t = step.task;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-tour-title"
      className={cn(
        "absolute pointer-events-auto iris-card-elevated rounded-2xl border border-border bg-card shadow-2xl transition-[left,top] duration-300 ease-out",
        step.demo
          ? "w-[min(520px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto"
          : "w-[min(360px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      <div className="h-1 rounded-t-2xl bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
          {index === 0 || isLast ? (
            <Sparkles className="w-3 h-3" />
          ) : t ? (
            <MousePointerClick className="w-3 h-3" />
          ) : null}
          {step.eyebrow}
        </div>
        <h2
          id="iris-tour-title"
          className="mt-1 text-[16px] font-semibold leading-snug"
        >
          {step.title}
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {t && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px]",
              taskDone
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                : "border-primary/30 bg-primary/5",
            )}
          >
            {taskDone ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : t.kind === "palette" ? (
              <Command className="w-3.5 h-3.5 shrink-0 text-primary" />
            ) : (
              <MousePointerClick className="w-3.5 h-3.5 shrink-0 text-primary" />
            )}
            <span className="font-medium">{taskDone ? "Done" : t.hint}</span>
          </div>
        )}
        {/* Fallback when the target isn't on screen (e.g. collapsed sidebar on a phone) or there's no keyboard. */}
        {t &&
          !taskDone &&
          (t.kind === "palette" || (t.kind === "view" && targetMissing)) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-[11px]"
              onClick={onDoTask}
            >
              {t.kind === "palette" ? "Open search" : "Take me there"}
            </Button>
          )}
        {step.demo && (
          <DemoIntake answer={demoAnswer} onAnswer={onDemoAnswer} />
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10.5px] tabular-nums text-muted-foreground">
            {index + 1} / {STEPS.length}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {index > 0 && !isLast && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-[12px]"
                onClick={onBack}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 px-3.5 text-[12px]"
              disabled={taskPending}
              onClick={onNext}
              autoFocus
            >
              {isLast ? "Start using IRIS" : index === 0 ? "Let's go" : "Next"}
              {!isLast && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoRow({
  label,
  children,
  done,
}: {
  label: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-2 items-start">
      <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
        {done ? (
          <Check className="w-3 h-3 text-emerald-600" />
        ) : (
          <span className="text-rose-500">*</span>
        )}
        {label}
      </div>
      <div className="min-w-0 text-[12px]">{children}</div>
    </div>
  );
}

/** A static, made-up intake card. Nothing here calls IRIS or creates anything. */
function DemoIntake({
  answer,
  onAnswer,
}: {
  answer: string | null;
  onAnswer: (v: string) => void;
}) {
  const chip = (on: boolean) =>
    cn(
      "px-2.5 py-1 rounded-full border text-[11px] transition-colors",
      on
        ? "border-primary bg-primary/10 text-primary font-medium"
        : "border-border hover:border-primary/50",
    );
  const captured = 7 + (answer ? 1 : 0);
  return (
    <div className="mt-3 space-y-2.5" aria-label="Example report">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-[12px] leading-relaxed">
        AC in Studio 1 at Kwality House isn&apos;t cooling since this morning.
        Front desk moved the 7am class to Studio 2.
      </div>
      <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2 text-[11px]">
          <span className="font-semibold">AC &amp; Ventilation Repairs</span>
          <span className="ml-auto text-muted-foreground">
            <b className="text-foreground">{captured}/14</b> captured
          </span>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Routes to{" "}
              <b className="text-foreground font-medium">Facilities</b>
            </span>
            <span>
              Owner{" "}
              <b className="text-foreground font-medium">Facilities lead</b>
            </span>
            <span>SLA respond 1h · resolve 1d</span>
          </div>
          <DemoRow label="Studio · area" done>
            <span>Kwality House · Studio 1</span>
          </DemoRow>
          <DemoRow label="Since when" done>
            <span>Today</span>
          </DemoRow>
          <DemoRow label="Steps taken" done>
            <span>Moved 7am class to Studio 2</span>
          </DemoRow>
          <div
            className={cn(
              "rounded-lg -mx-1.5 px-1.5 py-1.5",
              !answer && "ring-2 ring-primary/60 bg-primary/5 animate-pulse",
            )}
          >
            <DemoRow label="Members complained?" done={!!answer}>
              <div className="flex flex-wrap gap-1.5">
                {["Yes", "No", "Don't know"].map((o) => (
                  <button
                    key={o}
                    onClick={() => onAnswer(o)}
                    className={chip(answer === o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </DemoRow>
          </div>
          {answer === "Yes" && (
            <div className="space-y-2 iris-fade-in">
              <DemoRow label="Who complained">
                <span className="text-muted-foreground italic">
                  asked only because you said Yes
                </span>
              </DemoRow>
              <DemoRow label="What they said">
                <span className="text-muted-foreground italic">
                  their words, as close as possible
                </span>
              </DemoRow>
            </div>
          )}
          <DemoRow label="Vendor contacted?">
            <span className="text-muted-foreground">
              Yes, visit scheduled · Yes, awaiting reply · Not yet · Not needed
            </span>
          </DemoRow>
          <DemoRow label="Expected fix date">
            <span className="text-muted-foreground">dd / mm / yyyy</span>
          </DemoRow>
          <div className="pt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            The ticket draft unlocks once every * answer is in.
            &ldquo;Don&apos;t know&rdquo; counts.
          </div>
        </div>
      </div>
    </div>
  );
}
