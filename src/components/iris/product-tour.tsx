"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewName } from "@/lib/iris/store";
import { useUserCollections } from "@/lib/iris/user-collections";

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

  const taskDone = Boolean(step.task && doneTasks[step.id]);
  const skippable = missingFor === step.id && !rect && (step.task?.kind === "click" || step.task?.kind === "ticket");
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
            className={cn("absolute rounded-lg ring-2 ring-primary transition-all duration-300 ease-out", taskPending && "iris-tour-pulse")}
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
    const gap = 12;
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
  }, [hole, step.id, cardRef, taskDone]);

  const t = step.task;
  const total = STEPS.length;
  const centred = isFirst || isLast;
  return (
    <div
      ref={cardRef}
      key={step.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-tour-title"
      aria-describedby="iris-tour-body"
      className={cn(
        "iris-tour-card absolute pointer-events-auto flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-lg",
        "transition-[left,top] duration-300 ease-out max-h-[calc(100vh-24px)] overflow-y-auto",
        centred ? "w-[min(400px,calc(100vw-24px))]" : "w-[min(340px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          <span>
            {index + 1} / {total}
          </span>
          {t && <span className="font-medium text-primary">Try it</span>}
        </div>
        <h2 id="iris-tour-title" className={cn("mt-1.5 font-semibold leading-snug tracking-tight", centred ? "text-[17px]" : "text-[15px]")}>
          {step.title}
        </h2>
        <p id="iris-tour-body" className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {t && (
          <div
            role="status"
            className={cn(
              "mt-3 flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] font-medium",
              taskDone ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-foreground",
            )}
          >
            {taskDone ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary iris-tour-pulse" />}
            <span>{taskDone ? "Done" : skippable ? "Not available here — you can skip this one." : t.hint}</span>
          </div>
        )}
        {t && !taskDone && (t.kind === "palette" || (t.kind === "view" && targetMissing)) && (
          <button
            onClick={onDoTask}
            className="mt-2 text-[12px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {t.kind === "palette" ? "Open search for me" : "Take me there"}
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="mt-4 mx-4 h-0.5 rounded-full bg-muted overflow-hidden" aria-hidden>
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {index > 0 && !isLast ? (
          <button
            onClick={onBack}
            className="h-8 px-2 -ml-2 rounded-md text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            "h-8 px-3.5 rounded-md text-[12.5px] font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-ring",
            taskPending ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {step.cta ?? (taskPending ? "Waiting for you…" : skippable && !taskDone ? "Skip" : "Next")}
          {!isLast && !taskPending && (step.cta || !skippable || taskDone) ? <ArrowRight className="w-3.5 h-3.5 ml-1" /> : null}
          {skippable && !taskDone && !step.cta ? <X className="w-3.5 h-3.5 ml-1" /> : null}
        </button>
      </div>
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
      @keyframes iris-tour-in { from { opacity: 0; translate: 0 4px } to { opacity: 1; translate: 0 0 } }
      @keyframes iris-tour-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
      @media (prefers-reduced-motion: no-preference) {
        .iris-tour-card { animation: iris-tour-in .2s ease-out both }
        .iris-tour-pulse { animation: iris-tour-pulse 1.6s ease-in-out infinite }
      }
    `}</style>
  );
}
