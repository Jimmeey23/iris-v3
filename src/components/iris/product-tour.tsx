"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewName } from "@/lib/iris/store";
import { useUserCollections } from "@/lib/iris/user-collections";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";

/**
 * One-time guided tour of IRIS V3, shown at the next sign-in until finished.
 *
 * - Hands-on: "Try it" steps spotlight a real element in the app and wait for the
 *   person to use it (click the nav item, open a ticket, press ⌘K) before Next unlocks.
 *   Nothing in the tour is a mock; the highlighted element is the real thing.
 * - The tour never creates or changes data: it points at Mark Resolved but doesn't press it.
 * - Accessible: the spotlighted element is clickable through the overlay, and
 *   Tab / Shift+Tab cycle only between the tour card and that element.
 * - Completion is stored in user preferences (see user-collections TOUR_KEY).
 */

type Task =
  | { kind: "view"; view: ViewName; hint: string }
  | { kind: "ticket"; hint: string }
  | { kind: "click"; hint: string }
  | { kind: "palette"; hint: string };

type Step = {
  id: string;
  /** `data-tour` anchor to spotlight; centred card when absent or off screen. */
  target?: string;
  /** View to open before showing the step (info steps only). */
  view?: ViewName;
  /** Close any open ticket first so list-level controls are visible. */
  closeTicket?: boolean;
  title: string;
  body: string;
  task?: Task;
  cta?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Happy Diwali — IRIS has been updated",
    body: "Take two minutes to learn your way around. You'll click through the real app, so you'll know exactly where everything is.",
    cta: "Start the tour",
  },
  {
    id: "overview",
    target: "nav-overview",
    view: "overview",
    title: "Overview",
    body: "Your starting point. See what's open, what's urgent and what's due next at your studio.",
  },
  {
    id: "open-ai",
    target: "nav-ai_assistant",
    title: "Report an issue",
    body: "Every new issue starts in AI Assistant.",
    task: { kind: "view", view: "ai_assistant", hint: "Click AI Assistant" },
  },
  {
    id: "chat",
    target: "ai-input",
    view: "ai_assistant",
    title: "Describe it in your own words",
    body: "Write what happened, like a normal message. IRIS picks the category, owner and deadline, then asks only for what's missing. You can also ask questions, like “How many tickets are open at Bandra?”",
    task: { kind: "click", hint: "Click the message box" },
  },
  {
    id: "open-tickets",
    target: "nav-all_tickets",
    title: "Find any ticket",
    body: "All Tickets is one searchable, filterable list of everything reported.",
    task: { kind: "view", view: "all_tickets", hint: "Click All Tickets" },
  },
  {
    id: "open-ticket",
    target: "ticket-list",
    view: "all_tickets",
    title: "Open a ticket",
    body: "Click any ticket to see its details, history and comments.",
    task: { kind: "ticket", hint: "Click any ticket in the list" },
  },
  {
    id: "actions",
    target: "ticket-actions",
    title: "Update the ticket here",
    body: "Start work, ask for more time, or Mark Resolved with one line on what you did. Fixed bikes and mics are checked again after 5 and 10 days — if it's broken again, the ticket reopens.",
  },
  {
    id: "views",
    target: "saved-views",
    view: "all_tickets",
    closeTicket: true,
    title: "Save your filters",
    body: "Set filters once and save them here. Next time it's one click.",
  },
  {
    id: "palette",
    title: "Search from anywhere",
    body: "Jump to any ticket, member or template without leaving the page.",
    task: { kind: "palette", hint: "Press ⌘K (Ctrl K on Windows)" },
  },
  {
    id: "member-360",
    target: "member-360",
    title: "Look up a member",
    body: "Visits, memberships and past tickets for any member, in one place.",
  },
  {
    id: "templates",
    target: "nav-templates",
    title: "Use a ready-made form",
    body: "Forms for common issues. Save a draft and finish it later.",
    task: { kind: "view", view: "templates", hint: "Click Templates" },
  },
  {
    id: "escalations",
    target: "nav-escalations",
    title: "Overdue tickets",
    body: "Tickets past their deadline land here, and IRIS reminds the owner for you.",
  },
  {
    id: "notifications",
    target: "notifications",
    title: "Notifications",
    body: "New tickets, mentions and reminders show up here.",
  },
  {
    id: "done",
    title: "You're all set",
    body: "Spot a problem? Tell AI Assistant. Have an idea? Use the feedback button at the top. Shubh Deepavali!",
    cta: "Start using IRIS",
  },
];

const PAD = 6;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useTargetRect(anchor: string | undefined, tick: string) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!anchor) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      const r = el?.getBoundingClientRect();
      const visible = r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
      setRect((prev) =>
        visible
          ? prev && Math.abs(prev.x - r.x) < 0.5 && Math.abs(prev.y - r.y) < 0.5 && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5
            ? prev
            : r
          : null,
      );
      raf = window.requestAnimationFrame(measure);
    };
    document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [anchor, tick]);
  return anchor ? rect : null;
}

export function ProductTour({ paletteOpen, openPalette }: { paletteOpen: boolean; openPalette: () => void }) {
  const tourCompletedAt = useUserCollections((s) => s.tourCompletedAt);
  const completeTour = useUserCollections((s) => s.completeTour);
  const signedIn = useAppStore((s) => Boolean(s.currentUser?.userId));
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedTicketId = useAppStore((s) => s.selectedTicketId);
  const selectTicket = useAppStore((s) => s.selectTicket);

  const [index, setIndex] = React.useState(0);
  const [doneTasks, setDoneTasks] = React.useState<Record<string, boolean>>({});
  const [clicked, setClicked] = React.useState<Record<string, boolean>>({});
  const [missingFor, setMissingFor] = React.useState<string | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const active = signedIn && tourCompletedAt === null;
  const step = STEPS[index];

  // Info steps bring their screen up; task steps wait for the person to go there.
  React.useEffect(() => {
    if (!active) return;
    if (step.closeTicket && selectedTicketId) selectTicket(null);
    if (step.view && !step.task && currentView !== step.view) setCurrentView(step.view);
  }, [active, step, currentView, setCurrentView, selectedTicketId, selectTicket]);

  // "click" tasks: listen on the real element for a click or focus.
  React.useEffect(() => {
    if (!active || step.task?.kind !== "click" || !step.target) return;
    const id = step.id;
    const onHit = (e: Event) => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el && e.target instanceof Node && el.contains(e.target)) setClicked((c) => ({ ...c, [id]: true }));
    };
    document.addEventListener("pointerdown", onHit, true);
    document.addEventListener("focusin", onHit, true);
    return () => {
      document.removeEventListener("pointerdown", onHit, true);
      document.removeEventListener("focusin", onHit, true);
    };
  }, [active, step]);

  // Detect task completion, latched so closing ⌘K or leaving the screen doesn't re-lock Next.
  React.useEffect(() => {
    if (!active || !step.task || doneTasks[step.id]) return;
    const t = step.task;
    const done =
      (t.kind === "view" && currentView === t.view) ||
      (t.kind === "palette" && paletteOpen) ||
      (t.kind === "ticket" && selectedTicketId !== null) ||
      (t.kind === "click" && clicked[step.id]);
    if (!done) return;
    const id = window.requestAnimationFrame(() => setDoneTasks((d) => ({ ...d, [step.id]: true })));
    return () => window.cancelAnimationFrame(id);
  }, [active, step, currentView, paletteOpen, selectedTicketId, clicked, doneTasks]);

  // Festive accent while the tour runs; the app's own accent comes back after.
  React.useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previous = root.getAttribute("data-accent");
    root.setAttribute("data-accent", "diwali");
    return () => {
      if (previous) root.setAttribute("data-accent", previous);
      else root.removeAttribute("data-accent");
    };
  }, [active]);

  const rect = useTargetRect(active ? step.target : undefined, `${currentView}:${selectedTicketId ?? ""}`);

  // If a task's element never shows up (e.g. no tickets yet), don't trap the person.
  React.useEffect(() => {
    if (!active || !step.target || rect) return;
    const stepId = step.id;
    const id = window.setTimeout(() => setMissingFor(stepId), 800);
    return () => window.clearTimeout(id);
  }, [active, step.id, step.target, rect]);

  // "Open a ticket" with an empty list (filters, or nothing assigned yet): don't stall.
  const [listEmpty, setListEmpty] = React.useState(false);
  React.useEffect(() => {
    if (!active || step.task?.kind !== "ticket") return;
    const check = () => setListEmpty(Boolean(document.querySelector('[data-tour="ticket-list"] [data-tour-empty]')));
    check();
    const id = window.setInterval(check, 300);
    return () => window.clearInterval(id);
  }, [active, step]);
  const emptyList = step.task?.kind === "ticket" && listEmpty;

  const taskDone = Boolean(step.task && doneTasks[step.id]);
  const skippable =
    (missingFor === step.id && !rect && (step.task?.kind === "click" || step.task?.kind === "ticket")) ||
    (emptyList && ALL_TICKETS.length === 0);

  // Little sparkle burst each time a task is completed, and on the last step.
  // Changes only when a task finishes or the last step opens, so the burst re-fires then.
  const burst = Object.values(doneTasks).filter(Boolean).length + (index === STEPS.length - 1 ? 1000 : 0);
  const taskPending = Boolean(step.task && !taskDone && !skippable);
  const hidden = paletteOpen && step.task?.kind === "palette";

  // Keyboard: keep Tab inside the card + the spotlighted element (when it's a task).
  React.useEffect(() => {
    if (!active || hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const target = taskPending && step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      const pool = [
        ...(target ? [target, ...Array.from(target.querySelectorAll<HTMLElement>(FOCUSABLE))] : []),
        ...Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)),
      ].filter((el) => el.offsetParent !== null || el === target);
      if (!pool.length) return;
      e.preventDefault();
      const i = pool.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? pool.length - 1 : i - 1) : i === -1 || i === pool.length - 1 ? 0 : i + 1;
      pool[next].focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, hidden, taskPending, step.target]);

  // Focus the card's main button on info steps; on task steps leave focus free for the app.
  React.useEffect(() => {
    if (!active || hidden || taskPending) return;
    const id = window.requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [active, hidden, index, taskPending]);

  if (!active) return null;

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  const hole = rect ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null;

  const next = () => {
    if (isLast) {
      void completeTour();
      setCurrentView("overview");
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    // The wrapper never takes clicks; only the dimmed blockers and the card do.
    <div className={cn("fixed inset-0 z-[90] pointer-events-none", hidden && "invisible")}>
      <TourStyles />
      {hole ? (
        <>
          <Blocker style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.y) }} />
          <Blocker style={{ left: 0, top: hole.y + hole.h, right: 0, bottom: 0 }} />
          <Blocker style={{ left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }} />
          <Blocker style={{ left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h }} />
          {/* Info steps: the highlighted element is for looking at, not clicking. */}
          {!taskPending && <Blocker clear style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />}
          <div
            className={cn("absolute rounded-xl ring-2 ring-amber-400 iris-tour-glow transition-all duration-300 ease-out", taskPending && "iris-tour-pulse")}
            style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          />
        </>
      ) : (
        <Blocker style={{ inset: 0 }} />
      )}

      <TourCard
        cardRef={cardRef}
        step={step}
        index={index}
        hole={hole}
        taskPending={taskPending}
        taskDone={taskDone}
        skippable={skippable && !taskDone}
        isFirst={isFirst}
        isLast={isLast}
        targetMissing={!hole}
        emptyList={emptyList && ALL_TICKETS.length > 0}
        burst={burst}
        onDoTask={() => {
          if (step.task?.kind === "view") setCurrentView(step.task.view);
          else if (step.task?.kind === "palette") openPalette();
          else if (step.task?.kind === "ticket") {
            const newest = [...ALL_TICKETS].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
            if (newest) selectTicket(newest.id);
          }
        }}
        onBack={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={next}
      />
    </div>
  );
}

function Blocker({ style, clear }: { style: React.CSSProperties; clear?: boolean }) {
  return <div className={cn("absolute pointer-events-auto", !clear && "bg-black/45")} style={style} />;
}

function TourCard({
  cardRef,
  step,
  index,
  hole,
  taskPending,
  taskDone,
  skippable,
  isFirst,
  isLast,
  targetMissing,
  emptyList,
  burst,
  onDoTask,
  onBack,
  onNext,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  step: Step;
  index: number;
  hole: { x: number; y: number; w: number; h: number } | null;
  taskPending: boolean;
  taskDone: boolean;
  skippable: boolean;
  isFirst: boolean;
  isLast: boolean;
  targetMissing: boolean;
  emptyList: boolean;
  burst: number;
  onDoTask: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  React.useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const set = (s: Partial<Record<"left" | "top" | "right" | "bottom" | "transform", string>>) => {
      el.style.left = s.left ?? "";
      el.style.top = s.top ?? "";
      el.style.right = s.right ?? "";
      el.style.bottom = s.bottom ?? "";
      el.style.transform = s.transform ?? "";
    };
    const px = (n: number) => `${Math.round(n)}px`;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const gap = 14;
    if (!hole || vw < 640) {
      set(vw < 640 && hole ? { left: "12px", right: "12px", bottom: "12px" } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" });
      return;
    }
    const clampX = (x: number) => Math.min(Math.max(12, x), vw - cw - 12);
    const clampY = (y: number) => Math.min(Math.max(12, y), vh - ch - 12);
    // Right of narrow targets (sidebar), below wide ones, above if no room, else bottom-right corner.
    if (hole.x + hole.w + gap + cw < vw && hole.w < 320) set({ left: px(hole.x + hole.w + gap), top: px(clampY(hole.y + hole.h / 2 - ch / 2)) });
    else if (hole.y + hole.h + gap + ch < vh) set({ left: px(clampX(hole.x + hole.w / 2 - cw / 2)), top: px(hole.y + hole.h + gap) });
    else if (hole.y - gap - ch > 0) set({ left: px(clampX(hole.x + hole.w / 2 - cw / 2)), top: px(hole.y - gap - ch) });
    else set({ right: "16px", bottom: "16px" });
  }, [hole, step.id, cardRef, taskDone, emptyList]);

  const t = step.task;
  const total = STEPS.length;
  const centred = isFirst || isLast;
  const showHelper = t && !taskDone && (t.kind === "palette" || (t.kind === "view" && targetMissing) || (t.kind === "ticket" && emptyList));
  return (
    <div
      ref={cardRef}
      key={step.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-tour-title"
      aria-describedby="iris-tour-body"
      className={cn(
        "iris-tour-card absolute pointer-events-auto flex flex-col rounded-2xl text-card-foreground",
        "transition-[left,top] duration-300 ease-out max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden",
        centred ? "w-[min(420px,calc(100vw-24px))]" : "w-[min(352px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      <Toran />
      <Sparkles burst={burst} />

      {centred && (
        <div className="relative mx-auto mt-3 h-[92px] w-[92px]" aria-hidden>
          <Rangoli className="absolute inset-0 h-full w-full iris-tour-spin" />
          <Diya lit size={34} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%]" />
        </div>
      )}

      <div className={cn("px-5", centred ? "pt-2 text-center" : "pt-3")}>
        <div className={cn("flex items-center gap-2 text-[11px] tabular-nums", centred && "justify-center")}>
          <span className="rounded-full bg-[var(--tour-soft)] px-2 py-0.5 font-medium text-[var(--tour-deep)]">
            Step {index + 1} of {total}
          </span>
          {t && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tour-gold-soft)] px-2 py-0.5 font-semibold text-[var(--tour-gold-deep)]">
              ✨ Try it
            </span>
          )}
        </div>
        <h2
          id="iris-tour-title"
          className={cn("mt-2 font-semibold leading-snug tracking-tight", centred ? "text-[19px] iris-tour-shimmer" : "text-[15.5px]")}
        >
          {step.title}
        </h2>
        <p id="iris-tour-body" className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {t && (
          <div
            role="status"
            className={cn(
              "mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium text-left transition-colors",
              taskDone
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-[var(--tour-line)] bg-[var(--tour-soft)] text-foreground",
            )}
          >
            {taskDone ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <Diya lit size={18} className="shrink-0" />
            )}
            <span>
              {taskDone
                ? "Shabaash! Done — on to the next one."
                : skippable
                  ? "Not available here — you can skip this one."
                  : emptyList
                    ? "Your list is empty right now, so let's open a recent ticket instead."
                    : t.hint}
            </span>
          </div>
        )}
        {showHelper && (
          <button
            onClick={onDoTask}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--tour-line)] px-3 py-1 text-[12px] font-semibold text-[var(--tour-deep)] hover:bg-[var(--tour-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t?.kind === "palette" ? "Open search for me" : t?.kind === "ticket" ? "Open a recent ticket for me" : "Take me there"}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Progress: one diya per step, lit as you go. */}
      <div className={cn("mt-4 flex items-end gap-[3px] px-5", centred && "justify-center")} aria-hidden>
        {STEPS.map((s, i) => (
          <Diya key={s.id} lit={i <= index} size={i === index ? 17 : 13} className="transition-all duration-300" />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-3">
        {index > 0 && !isLast ? (
          <button
            onClick={onBack}
            className="h-9 px-3 -ml-3 rounded-full text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
          </button>
        ) : (
          <span />
        )}
        <button
          data-tour-primary
          onClick={onNext}
          disabled={taskPending}
          className={cn(
            "h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center justify-center whitespace-nowrap transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-ring",
            taskPending
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "iris-tour-cta text-white shadow-[0_6px_18px_-6px_rgba(234,88,12,.7)] hover:brightness-110 active:scale-[.97]",
          )}
        >
          {step.cta ?? (taskPending ? "Your turn…" : skippable && !taskDone ? "Skip" : "Next")}
          {!isLast && !taskPending && (step.cta || !skippable || taskDone) ? <ArrowRight className="w-3.5 h-3.5 ml-1" /> : null}
          {skippable && !taskDone && !step.cta ? <X className="w-3.5 h-3.5 ml-1" /> : null}
          {isLast ? <span className="ml-1.5" aria-hidden>🪔</span> : null}
        </button>
      </div>
    </div>
  );
}

/** Clay diya with a flickering flame. */
function Diya({ lit, size = 16, className }: { lit?: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      {lit && (
        <g className="iris-tour-flame" style={{ transformOrigin: "16px 15px" }}>
          <ellipse cx="16" cy="10" rx="7" ry="8" fill="#fbbf24" opacity=".25" />
          <path d="M16 3c3 4 4 7 0 12-4-5-3-8 0-12z" fill="#f59e0b" />
          <path d="M16 7c1.6 2.4 2 4.2 0 7-2-2.8-1.6-4.6 0-7z" fill="#fde68a" />
        </g>
      )}
      <path d="M3 17h26c-1 6.5-6.5 10.5-13 10.5S4 23.5 3 17z" fill={lit ? "#c2410c" : "#a8a29e"} />
      <path d="M3 17h26" stroke={lit ? "#7c2d12" : "#78716c"} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 21.5q7 3 14 0" stroke={lit ? "#fdba74" : "#d6d3d1"} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="11" cy="22.8" r=".9" fill={lit ? "#fde68a" : "#e7e5e4"} />
      <circle cx="16" cy="23.8" r=".9" fill={lit ? "#fde68a" : "#e7e5e4"} />
      <circle cx="21" cy="22.8" r=".9" fill={lit ? "#fde68a" : "#e7e5e4"} />
    </svg>
  );
}

/** Marigold-and-mango-leaf garland (toran) across the top of the card. */
function Toran() {
  const n = 13;
  return (
    <svg className="block w-full h-[30px] shrink-0" viewBox="0 0 260 30" preserveAspectRatio="none" aria-hidden>
      <path d="M0 4 Q130 16 260 4" stroke="#a16207" strokeWidth="1.2" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const x = 10 + i * (240 / (n - 1));
        const y = 4 + 12 * (1 - Math.pow((x - 130) / 130, 2)) * 0.95;
        return i % 2 ? (
          <path key={i} d={`M${x} ${y} q5 8 0 17 q-5 -9 0 -17z`} fill="#15803d" />
        ) : (
          <g key={i}>
            <circle cx={x} cy={y + 2} r="4.6" fill={i % 4 ? "#f59e0b" : "#ea580c"} />
            <circle cx={x} cy={y + 2} r="2" fill={i % 4 ? "#fde047" : "#fb923c"} />
            <circle cx={x} cy={y + 9} r="3" fill="#ea580c" />
          </g>
        );
      })}
    </svg>
  );
}

/** Simple rangoli: petals in brand-friendly festive colours. */
function Rangoli({ className }: { className?: string }) {
  const ring = (count: number, r: number, len: number, w: number, fill: string, rot = 0) =>
    Array.from({ length: count }, (_, i) => (
      <ellipse key={`${r}-${i}`} cx="50" cy={50 - r} rx={w} ry={len} fill={fill} transform={`rotate(${(360 / count) * i + rot} 50 50)`} />
    ));
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="48" fill="#fff7ed" stroke="#fdba74" strokeDasharray="2 3" />
      {ring(12, 34, 9, 4.5, "#db2777")}
      {ring(12, 34, 6, 2.6, "#f9a8d4")}
      {ring(8, 22, 9, 5, "#f59e0b", 22.5)}
      {ring(8, 22, 5, 2.4, "#fde68a", 22.5)}
      {ring(16, 44, 2.2, 2.2, "#0d9488")}
      <circle cx="50" cy="50" r="11" fill="#ea580c" />
      <circle cx="50" cy="50" r="6" fill="#fde047" />
    </svg>
  );
}

/** Phuljhadi-style sparkle burst; re-fires whenever `burst` changes. */
function Sparkles({ burst }: { burst: number }) {
  // The card remounts per step, so only fire on a change after mount (or on mount for the finale).
  const [initial] = React.useState(burst >= 1000 ? -1 : burst);
  if (burst === initial) return null;
  const show = burst; // new value -> new key -> sparks replay; their animation ends invisible
  const colors = ["#f59e0b", "#ea580c", "#fde047", "#db2777", "#22c55e"];
  return (
    <div key={show} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const d = 70 + (i % 5) * 18;
        return (
          <span
            key={i}
            className="iris-tour-spark absolute left-1/2 top-1/2 block rounded-full"
            style={{
              width: i % 3 ? 5 : 7,
              height: i % 3 ? 5 : 7,
              background: colors[i % colors.length],
              ["--dx" as string]: `${Math.cos(a) * d}px`,
              ["--dy" as string]: `${Math.sin(a) * d}px`,
              animationDelay: `${(i % 4) * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function TourStyles() {
  return (
    <style>{`
      :root[data-accent="diwali"] {
        --primary: #ea580c; --ring: #ea580c; --accent-foreground: #ea580c;
        --sidebar-primary: #ea580c; --sidebar-accent-foreground: #ea580c; --sidebar-ring: #ea580c;
      }
      .iris-tour-card {
        --tour-soft: #fff7ed; --tour-line: #fed7aa; --tour-deep: #c2410c;
        --tour-gold-soft: #fef3c7; --tour-gold-deep: #a16207;
        background:
          radial-gradient(120% 60% at 100% 0%, rgba(251,191,36,.16), transparent 60%),
          radial-gradient(100% 60% at 0% 100%, rgba(219,39,119,.08), transparent 60%),
          var(--card);
        border: 1px solid #fdba74;
        box-shadow: 0 24px 60px -20px rgba(194,65,12,.45), 0 0 0 4px rgba(251,191,36,.12);
      }
      .dark .iris-tour-card {
        --tour-soft: rgba(234,88,12,.12); --tour-line: rgba(251,146,60,.35); --tour-deep: #fdba74;
        --tour-gold-soft: rgba(245,158,11,.15); --tour-gold-deep: #fcd34d;
        border-color: rgba(251,146,60,.45);
      }
      .iris-tour-cta { background: linear-gradient(135deg, #f59e0b, #ea580c 55%, #db2777); }
      .iris-tour-glow { box-shadow: 0 0 0 4px rgba(251,191,36,.25), 0 0 28px 6px rgba(245,158,11,.45); }
      .iris-tour-shimmer {
        background: linear-gradient(90deg, #c2410c, #f59e0b, #db2777, #c2410c);
        background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      @keyframes iris-tour-in { from { opacity: 0; translate: 0 8px; scale: .97 } to { opacity: 1; translate: 0 0; scale: 1 } }
      @keyframes iris-tour-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
      @keyframes iris-tour-flicker { 0%,100% { transform: scale(1) rotate(-2deg) } 30% { transform: scale(1.08,.94) rotate(2deg) } 60% { transform: scale(.95,1.06) rotate(-1deg) } }
      @keyframes iris-tour-spin { to { rotate: 360deg } }
      @keyframes iris-tour-shine { to { background-position: 200% center } }
      @keyframes iris-tour-spark {
        0% { transform: translate(-50%,-50%) scale(1); opacity: 1 }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.2); opacity: 0 }
      }
      .iris-tour-spark { opacity: 0 }
      @media (prefers-reduced-motion: no-preference) {
        .iris-tour-card { animation: iris-tour-in .28s cubic-bezier(.2,.9,.3,1.2) both }
        .iris-tour-pulse { animation: iris-tour-pulse 1.6s ease-in-out infinite }
        .iris-tour-flame { animation: iris-tour-flicker 1.4s ease-in-out infinite }
        .iris-tour-spin { animation: iris-tour-spin 40s linear infinite }
        .iris-tour-shimmer { animation: iris-tour-shine 4s linear infinite }
        .iris-tour-spark { animation: iris-tour-spark .9s ease-out both }
      }
    `}</style>
  );
}
