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
    body: "Spot a problem? Tell AI Assistant. Have an idea? Use the feedback button at the top. Happy Diwali!",
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

  const taskPending = Boolean(step.task && !taskDone && !skippable);
  const hidden = paletteOpen && step.task?.kind === "palette";
  const cardRect = useElementRect(active && !hidden ? cardRef : null, `${index}:${taskDone}:${emptyList}`);

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

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  const next = React.useCallback(() => {
    if (isLast) {
      void completeTour();
      setCurrentView("overview");
      return;
    }
    setIndex((i) => i + 1);
  }, [isLast, completeTour, setCurrentView]);

  // ← / → to move between steps (not while typing, and Next stays locked on pending tasks).
  React.useEffect(() => {
    if (!active || hidden) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowRight" && !taskPending) { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" && index > 0 && !isLast) { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, hidden, taskPending, index, isLast, next]);

  if (!active) return null;

  const hole = rect ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null;
  const callout = step.task?.kind === "palette" ? "Press ⌘K" : step.task?.kind === "ticket" ? "Click a ticket" : "Click here";

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
          <Spotlight key={step.id} hole={hole} active={taskPending} callout={taskPending ? callout : null} />
          {cardRect && <Arrow key={`a-${step.id}`} from={cardRect} to={hole} />}
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

function useElementRect(ref: React.RefObject<HTMLElement | null> | null, tick: string) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!ref) return;
    let raf = 0;
    const measure = () => {
      const r = ref.current?.getBoundingClientRect() ?? null;
      setRect((prev) =>
        r && prev && Math.abs(prev.x - r.x) < 0.5 && Math.abs(prev.y - r.y) < 0.5 && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5
          ? prev
          : r,
      );
      raf = window.requestAnimationFrame(measure);
    };
    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [ref, tick]);
  return ref ? rect : null;
}

function Blocker({ style, clear }: { style: React.CSSProperties; clear?: boolean }) {
  return <div className={cn("absolute pointer-events-auto", !clear && "bg-slate-950/55 backdrop-blur-[1.5px]")} style={style} />;
}

type Box = { x: number; y: number; w: number; h: number };

/** Marching-ants outline, corner brackets and (on "Try it" steps) a click ripple + label. */
function Spotlight({ hole, active, callout }: { hole: Box; active: boolean; callout: string | null }) {
  const b = 12; // bracket length
  const o = 4; // bracket offset outside the outline
  const { x, y, w, h } = hole;
  const corners = [
    `M${x - o} ${y - o + b}V${y - o}H${x - o + b}`,
    `M${x + w + o - b} ${y - o}H${x + w + o}V${y - o + b}`,
    `M${x + w + o} ${y + h + o - b}V${y + h + o}H${x + w + o - b}`,
    `M${x - o + b} ${y + h + o}H${x - o}V${y + h + o - b}`,
  ];
  const labelAbove = y > 56;
  return (
    <>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <rect x={x} y={y} width={w} height={h} rx={12} className="iris-tour-outline" />
        {corners.map((d) => (
          <path key={d} d={d} className="iris-tour-bracket" />
        ))}
      </svg>
      {active && (
        <>
          <span className="iris-tour-ripple absolute block rounded-full" style={{ left: x + w / 2 - 10, top: y + h / 2 - 10 }} aria-hidden />
          {callout && (
            <span
              className="iris-tour-callout absolute whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-semibold text-white"
              style={{ left: Math.max(8, x + w / 2), top: labelAbove ? y - 34 : y + h + 10, translate: "-50% 0" }}
            >
              {callout}
            </span>
          )}
        </>
      )}
    </>
  );
}

/** Curved, self-drawing arrow from the card's nearest edge to the spotlight. */
function Arrow({ from, to }: { from: DOMRect; to: Box }) {
  const card = { x: from.left, y: from.top, w: from.width, h: from.height };
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  const tx = to.x + to.w / 2;
  const ty = to.y + to.h / 2;
  // Skip when the card sits on top of / right next to the target.
  const gapX = Math.max(to.x - (card.x + card.w), card.x - (to.x + to.w), 0);
  const gapY = Math.max(to.y - (card.y + card.h), card.y - (to.y + to.h), 0);
  if (gapX < 28 && gapY < 28) return null;

  const horizontal = gapX >= gapY;
  const sx = horizontal ? (tx > cx ? card.x + card.w : card.x) : Math.min(Math.max(tx, card.x + 24), card.x + card.w - 24);
  const sy = horizontal ? Math.min(Math.max(ty, card.y + 24), card.y + card.h - 24) : ty > cy ? card.y + card.h : card.y;
  const ex = horizontal ? (tx > cx ? to.x - 6 : to.x + to.w + 6) : Math.min(Math.max(sx, to.x + 16), to.x + to.w - 16);
  const ey = horizontal ? Math.min(Math.max(sy, to.y + 10), to.y + to.h - 10) : ty > cy ? to.y - 6 : to.y + to.h + 6;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const bend = Math.min(60, Math.hypot(ex - sx, ey - sy) * 0.25);
  const qx = horizontal ? mx : mx + bend;
  const qy = horizontal ? my - bend : my;
  const d = `M${sx} ${sy} Q${qx} ${qy} ${ex} ${ey}`;
  const ang = Math.atan2(ey - qy, ex - qx);
  const head = (a: number) => `${ex - 10 * Math.cos(ang - a)} ${ey - 10 * Math.sin(ang - a)}`;
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <path d={d} className="iris-tour-arrow" pathLength={1} />
      <path d={`M${head(0.45)} L${ex} ${ey} L${head(-0.45)}`} className="iris-tour-arrowhead" />
      <circle cx={sx} cy={sy} r={3.5} className="iris-tour-arrowdot" />
    </svg>
  );
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
  onDoTask,
  onBack,
  onNext,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  step: Step;
  index: number;
  hole: Box | null;
  taskPending: boolean;
  taskDone: boolean;
  skippable: boolean;
  isFirst: boolean;
  isLast: boolean;
  targetMissing: boolean;
  emptyList: boolean;
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
    const gap = 56; // room for the arrow
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
        "iris-tour-card absolute pointer-events-auto flex flex-col rounded-2xl text-card-foreground overflow-x-hidden",
        "transition-[left,top] duration-300 ease-out max-h-[calc(100vh-24px)] overflow-y-auto",
        centred ? "w-[min(400px,calc(100vw-24px))]" : "w-[min(348px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      {centred ? <FestiveBanner /> : <span className="iris-tour-goldline" aria-hidden />}
      {!centred && <RangoliMotif />}
      <div className={cn("relative px-5", centred ? "pt-4 text-center" : "pt-5")}>
        <div className={cn("flex items-center gap-2 text-[11px] font-medium tabular-nums text-muted-foreground", centred && "justify-center")}>
          <span>
            {String(index + 1).padStart(2, "0")} <span className="opacity-50">/ {total}</span>
          </span>
          {t && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-px text-[10.5px] font-semibold uppercase tracking-wide text-primary">
              Try it
            </span>
          )}
        </div>
        <h2 id="iris-tour-title" className={cn("mt-2 font-semibold leading-snug tracking-tight", centred ? "text-[18px]" : "text-[15.5px]")}>
          {step.title}
        </h2>
        <p id="iris-tour-body" className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {t && (
          <div
            role="status"
            className={cn(
              "mt-3.5 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium text-left transition-colors",
              taskDone ? "border-emerald-500/30 bg-emerald-500/[.08] text-emerald-700 dark:text-emerald-300" : "border-border bg-muted/50 text-foreground",
            )}
          >
            <span
              className={cn(
                "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                taskDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-primary/60",
              )}
            >
              {taskDone ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-primary iris-tour-pulse" />}
            </span>
            <span>
              {taskDone
                ? "Done. Continue when you're ready."
                : skippable
                  ? "Not available here. You can skip this step."
                  : emptyList
                    ? "Your list is empty right now. Open a recent ticket instead."
                    : t.hint}
            </span>
          </div>
        )}
        {showHelper && (
          <button
            onClick={onDoTask}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {t?.kind === "palette" ? "Open search for me" : t?.kind === "ticket" ? "Open a recent ticket for me" : "Take me there"}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Segmented progress */}
      <div className="mt-4 flex gap-1 px-5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s.id} className={cn("h-1 flex-1 rounded-full transition-all duration-300", i < index ? "iris-tour-seg-done" : i === index ? "iris-tour-seg-now" : "bg-muted")} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-3">
        {index > 0 && !isLast ? (
          <button
            onClick={onBack}
            className="h-8 px-2.5 -ml-2.5 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
          </button>
        ) : (
          <span className="hidden sm:inline text-[11px] text-muted-foreground">
            Use <kbd className="iris-tour-kbd">←</kbd> <kbd className="iris-tour-kbd">→</kbd> to move
          </span>
        )}
        <button
          data-tour-primary
          onClick={onNext}
          disabled={taskPending}
          className={cn(
            "h-8 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center whitespace-nowrap transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-ring",
            taskPending
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[.98] shadow-sm",
          )}
        >
          {step.cta ?? (taskPending ? "Waiting for you" : skippable && !taskDone ? "Skip" : "Next")}
          {!isLast && !taskPending && (step.cta || !skippable || taskDone) ? <ArrowRight className="w-3.5 h-3.5 ml-1" /> : null}
          {skippable && !taskDone && !step.cta ? <X className="w-3.5 h-3.5 ml-1" /> : null}
        </button>
      </div>
    </div>
  );
}

/** Night-sky header for the welcome and closing cards: hanging lanterns, a row of diyas, drifting embers. */
function FestiveBanner() {
  return (
    <div className="iris-tour-banner relative h-[112px] overflow-hidden rounded-t-2xl" aria-hidden>
      {/* embers */}
      {[12, 26, 41, 58, 72, 87].map((l, i) => (
        <span key={l} className="iris-tour-ember absolute bottom-6 block h-1 w-1 rounded-full" style={{ left: `${l}%`, animationDelay: `${i * 0.55}s` }} />
      ))}
      {/* lanterns */}
      <Lantern className="absolute left-[14%] top-0" drop={30} delay="0s" />
      <Lantern className="absolute right-[14%] top-0" drop={18} delay=".7s" />
      {/* diyas */}
      <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="iris-tour-diya-glow" style={{ animationDelay: `${i * 0.25}s` }}>
            <Diya size={i === 2 ? 28 : 20} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Line-art akash kandil (hanging lantern) that sways gently. */
function Lantern({ className, drop, delay }: { className?: string; drop: number; delay: string }) {
  return (
    <svg className={cn("iris-tour-lantern", className)} style={{ animationDelay: delay, transformOrigin: "12px 0" }} width="24" height={drop + 40} viewBox={`0 0 24 ${drop + 40}`} fill="none">
      <line x1="12" y1="0" x2="12" y2={drop} stroke="#fcd34d" strokeOpacity=".6" />
      <path d={`M6 ${drop + 4}h12l3 9-9 13-9-13z`} fill="#f59e0b" fillOpacity=".18" stroke="#fbbf24" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={`M3 ${drop + 13}h18M12 ${drop + 4}v22`} stroke="#fbbf24" strokeOpacity=".6" />
      <rect x="8" y={drop} width="8" height="4" rx="1" fill="#fbbf24" />
      <path d={`M10 ${drop + 27}l-1 9M12 ${drop + 27}v11M14 ${drop + 27}l1 9`} stroke="#fb923c" strokeOpacity=".8" strokeLinecap="round" />
    </svg>
  );
}

/** Faint geometric rangoli in the card corner. */
function RangoliMotif() {
  return (
    <svg className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-primary opacity-[.07]" viewBox="0 0 100 100" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="50" cy="24" rx="7" ry="20" fill="none" stroke="currentColor" strokeWidth="3" transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="9" fill="currentColor" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 6" />
    </svg>
  );
}

/** Minimal line-art diya: the one festive accent, used on the welcome and closing cards. */
function Diya({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path className="iris-tour-flame" style={{ transformOrigin: "12px 11px" }} d="M12 2.5c2 2.7 2.6 4.6 0 8-2.6-3.4-2-5.3 0-8z" fill="#fbbf24" />
      <path d="M12 5.5c.9 1.3 1.1 2.3 0 4-1.1-1.7-.9-2.7 0-4z" fill="#fef3c7" />
      <path d="M3 13h18c-.8 4.6-4.4 7.5-9 7.5S3.8 17.6 3 13z" fill="#ea580c" fillOpacity=".25" stroke="#fb923c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
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
        background: var(--card);
        border: 1px solid color-mix(in oklab, var(--border) 80%, #ea580c 20%);
        box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 20px 50px -18px rgba(15,23,42,.45), 0 4px 12px -6px rgba(15,23,42,.18);
      }
      .iris-tour-banner {
        background:
          radial-gradient(60% 90% at 50% 110%, rgba(251,146,60,.45), transparent 70%),
          radial-gradient(40% 60% at 20% 0%, rgba(251,191,36,.12), transparent 70%),
          linear-gradient(180deg, #0b1023 0%, #1a1433 100%);
      }
      .iris-tour-goldline { position: absolute; inset: 0 0 auto 0; height: 3px; border-radius: 16px 16px 0 0; background: linear-gradient(90deg, #fbbf24, #ea580c 50%, #db2777); }
      .iris-tour-seg-done { background: linear-gradient(90deg, #fbbf24, #ea580c); opacity: .75; }
      .iris-tour-seg-now { background: linear-gradient(90deg, #f59e0b, #ea580c); box-shadow: 0 0 8px rgba(245,158,11,.7); }
      .iris-tour-diya-glow { display: inline-flex; filter: drop-shadow(0 0 6px rgba(251,191,36,.75)); }
      .iris-tour-ember { background: #fcd34d; box-shadow: 0 0 6px 1px rgba(252,211,77,.8); opacity: 0; }
      .iris-tour-badge { color: #ea580c; background: color-mix(in oklab, #ea580c 10%, transparent); box-shadow: inset 0 0 0 1px color-mix(in oklab, #ea580c 25%, transparent); }
      .iris-tour-kbd { display: inline-flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid var(--border); font-size: 10px; padding: 0 4px; background: var(--muted); }
      .iris-tour-outline { fill: none; stroke: #fbbf24; stroke-width: 2; stroke-dasharray: 6 5; filter: drop-shadow(0 0 6px rgba(251,146,60,.55)); }
      .iris-tour-bracket { fill: none; stroke: #fff; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; opacity: .95; }
      .iris-tour-arrow { fill: none; stroke: #fdba74; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
      .iris-tour-arrowhead { fill: none; stroke: #fdba74; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .iris-tour-arrowdot { fill: #fdba74; }
      .iris-tour-ripple { width: 20px; height: 20px; background: rgba(251,146,60,.9); box-shadow: 0 0 0 0 rgba(251,146,60,.6); }
      .iris-tour-callout { background: #0f172a; box-shadow: 0 6px 16px -6px rgba(0,0,0,.5); }
      .iris-tour-callout::after { content: ""; position: absolute; left: 50%; translate: -50% 0; border: 5px solid transparent; }
      @keyframes iris-tour-in { from { opacity: 0; translate: 0 6px; scale: .98 } to { opacity: 1; translate: 0 0; scale: 1 } }
      @keyframes iris-tour-pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
      @keyframes iris-tour-march { to { stroke-dashoffset: -22 } }
      @keyframes iris-tour-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
      @keyframes iris-tour-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes iris-tour-ripple { 0% { box-shadow: 0 0 0 0 rgba(251,146,60,.55); scale: .9 } 70% { box-shadow: 0 0 0 18px rgba(251,146,60,0); scale: 1 } 100% { box-shadow: 0 0 0 0 rgba(251,146,60,0); scale: .9 } }
      @keyframes iris-tour-bob { 0%,100% { translate: -50% 0 } 50% { translate: -50% -3px } }
      @keyframes iris-tour-sway { 0%,100% { rotate: -3deg } 50% { rotate: 3deg } }
      @keyframes iris-tour-rise { 0% { opacity: 0; translate: 0 0 } 20% { opacity: .9 } 100% { opacity: 0; translate: 6px -70px } }
      @keyframes iris-tour-glow { 0%,100% { filter: drop-shadow(0 0 4px rgba(251,191,36,.55)) } 50% { filter: drop-shadow(0 0 9px rgba(251,191,36,.95)) } }
      @keyframes iris-tour-flicker { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08,.92) } }
      @media (prefers-reduced-motion: no-preference) {
        .iris-tour-card { animation: iris-tour-in .24s cubic-bezier(.2,.8,.2,1) both }
        .iris-tour-pulse { animation: iris-tour-pulse 1.6s ease-in-out infinite }
        .iris-tour-outline { animation: iris-tour-march 1s linear infinite }
        .iris-tour-bracket { animation: iris-tour-fade .3s ease-out both }
        .iris-tour-arrow { stroke-dasharray: 1; animation: iris-tour-draw .5s .12s cubic-bezier(.4,0,.2,1) both }
        .iris-tour-arrowhead, .iris-tour-arrowdot { animation: iris-tour-fade .2s .55s both }
        .iris-tour-ripple { animation: iris-tour-ripple 1.6s ease-out infinite }
        .iris-tour-callout { animation: iris-tour-bob 1.6s ease-in-out infinite }
        .iris-tour-flame { animation: iris-tour-flicker 1.8s ease-in-out infinite }
        .iris-tour-lantern { animation: iris-tour-sway 4s ease-in-out infinite }
        .iris-tour-ember { animation: iris-tour-rise 3.2s ease-out infinite }
        .iris-tour-diya-glow { animation: iris-tour-glow 2.4s ease-in-out infinite }
      }
    `}</style>
  );
}
