"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, Command, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewName } from "@/lib/iris/store";
import { useUserCollections } from "@/lib/iris/user-collections";

/**
 * One-time Diwali tour of IRIS V3, shown at the next sign-in until finished.
 *
 * - Mandatory but short (~2 min) and hands-on: four steps wait for the person
 *   to do the thing (open a view, answer the example, open ⌘K) before Next unlocks.
 * - Accessible: the highlighted element is clickable through the spotlight, and
 *   Tab / Shift+Tab cycle only between the tour card and that element.
 * - Completion is stored in user preferences (see user-collections TOUR_KEY).
 */

type Task =
  | { kind: "view"; view: ViewName; hint: string }
  | { kind: "demo"; hint: string }
  | { kind: "resolve"; hint: string }
  | { kind: "palette"; hint: string };

type Step = {
  id: string;
  emoji: string;
  /** `data-tour` anchor to spotlight; centred card when absent or off screen. */
  target?: string;
  /** View to open before showing the step (info steps only). */
  view?: ViewName;
  eyebrow: string;
  title: string;
  body: string;
  task?: Task;
  /** Illustration shown inside the card. */
  visual?: "intake" | "chat" | "ask" | "resolve" | "recurrence";
  cta?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    emoji: "🪔",
    eyebrow: "What's new",
    title: "Happy Diwali, Physiquers! 🪔✨",
    body: "This Diwali, IRIS is lighting things up with some sizzling new updates! 🔥 A little sparkle, a lot of excitement, and plenty of reasons to cheer. Let's unwrap what's new! 🎁",
    cta: "Let's unwrap 🎁",
  },
  {
    id: "overview",
    emoji: "🏠",
    target: "nav-overview",
    view: "overview",
    eyebrow: "Home",
    title: "This is your home page",
    body: "See what's open, what's urgent and what's due next at your studio.",
  },
  {
    id: "open-ai",
    emoji: "🤖",
    target: "nav-ai_assistant",
    eyebrow: "Try it",
    title: "Report issues in AI Assistant",
    body: "This is where you tell IRIS about a problem.",
    task: { kind: "view", view: "ai_assistant", hint: "Click AI Assistant" },
  },
  {
    id: "chat",
    emoji: "💬",
    view: "ai_assistant",
    eyebrow: "Try it",
    title: "Just describe the problem",
    body: "Type it like a normal message. No forms, no codes.",
    visual: "chat",
    task: { kind: "demo", hint: "Tap the sample message to send it" },
  },
  {
    id: "demo",
    emoji: "📋",
    eyebrow: "Try it",
    title: "IRIS fills in the ticket for you",
    body: "It picks the type, the owner and the deadline. It only asks what's still missing.",
    visual: "intake",
    task: { kind: "demo", hint: "Answer the glowing question" },
  },
  {
    id: "ask",
    emoji: "❓",
    view: "ai_assistant",
    eyebrow: "Good to know",
    title: "You can ask questions too",
    body: "Ask about tickets in plain words and IRIS answers from live data.",
    visual: "ask",
  },
  {
    id: "open-tickets",
    emoji: "🎟️",
    target: "nav-all_tickets",
    eyebrow: "Try it",
    title: "See every ticket",
    body: "All tickets live in one list you can search and filter.",
    task: { kind: "view", view: "all_tickets", hint: "Click All Tickets" },
  },
  {
    id: "views",
    emoji: "🔖",
    target: "saved-views",
    view: "all_tickets",
    eyebrow: "New",
    title: "Save your favourite filters",
    body: "Set filters once, save them here, and open them in one click next time.",
  },
  {
    id: "resolve",
    emoji: "✅",
    eyebrow: "Try it",
    title: "Mark a ticket as resolved",
    body: "When it's fixed, click Mark Resolved and write one line on what you did.",
    visual: "resolve",
    task: { kind: "resolve", hint: "Click Mark Resolved" },
  },
  {
    id: "recurrence",
    emoji: "🔁",
    eyebrow: "Good to know",
    title: "Bikes and mics get checked again",
    body: "After a bike or mic is fixed, IRIS checks it again after 5 days and 10 days.",
    visual: "recurrence",
  },
  {
    id: "palette",
    emoji: "⚡",
    eyebrow: "Try it",
    title: "Search anything",
    body: "Find any ticket, member or template from anywhere.",
    task: { kind: "palette", hint: "Press ⌘K (Ctrl K on Windows)" },
  },
  {
    id: "member-360",
    emoji: "👤",
    target: "member-360",
    eyebrow: "Good to know",
    title: "Look up any member",
    body: "See a member's visits, memberships and past tickets in one place.",
  },
  {
    id: "templates",
    emoji: "📝",
    target: "nav-templates",
    view: "templates",
    eyebrow: "Good to know",
    title: "Ready-made forms",
    body: "Pick a form for common issues. You can save a draft and finish later.",
  },
  {
    id: "escalations",
    emoji: "🚨",
    target: "nav-escalations",
    eyebrow: "Good to know",
    title: "Overdue tickets",
    body: "Tickets that pass their deadline show up here. IRIS reminds the owner for you.",
  },
  {
    id: "notifications",
    emoji: "🔔",
    target: "notifications",
    eyebrow: "Good to know",
    title: "Your alerts",
    body: "New tickets, mentions and reminders appear here.",
  },
  {
    id: "done",
    emoji: "🎆",
    eyebrow: "All done",
    title: "Shubh Deepavali! 🎇",
    body: "You're ready! Spot a problem? Tell IRIS. Have an idea? Use the feedback button at the top.",
    cta: "Start using IRIS 🚀",
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

  const [index, setIndex] = React.useState(0);
  const [doneTasks, setDoneTasks] = React.useState<Record<string, boolean>>({});
  const [demoAnswer, setDemoAnswer] = React.useState<string | null>(null);
  const [chatPick, setChatPick] = React.useState<number | null>(null);
  const [resolved, setResolved] = React.useState(false);
  const [finale, setFinale] = React.useState(0);
  const [burst, setBurst] = React.useState(0);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const active = signedIn && tourCompletedAt === null;
  const step = STEPS[index];
  const taskDone = Boolean(step.task && doneTasks[step.id]);
  const taskPending = Boolean(step.task && !taskDone);

  // Info steps bring their view on screen; task steps wait for the person to go there.
  React.useEffect(() => {
    if (active && step.view && !step.task && currentView !== step.view) setCurrentView(step.view);
  }, [active, step, currentView, setCurrentView]);

  // Detect task completion, latched so closing ⌘K or leaving the view doesn't re-lock Next.
  React.useEffect(() => {
    if (!active || !step.task || doneTasks[step.id]) return;
    const t = step.task;
    const done =
      (t.kind === "view" && currentView === t.view) ||
      (t.kind === "palette" && paletteOpen) ||
      (t.kind === "demo" && (step.visual === "chat" ? chatPick !== null : demoAnswer !== null)) ||
      (t.kind === "resolve" && resolved);
    if (!done) return;
    const id = window.requestAnimationFrame(() => {
      setDoneTasks((d) => ({ ...d, [step.id]: true }));
      setBurst((b) => b + 1);
    });
    return () => window.cancelAnimationFrame(id);
  }, [active, step, currentView, paletteOpen, demoAnswer, chatPick, resolved, doneTasks]);

  // Diwali accent while the tour runs; the app's own (random or pinned) accent comes back after.
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

  const rect = useTargetRect(active ? step.target : undefined, currentView);
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

  // Move focus into the card on every step so keyboard users always start in the tour.
  React.useEffect(() => {
    if (!active || hidden) return;
    const id = window.requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [active, hidden, index, taskDone]);

  if (!active) return finale ? <Fireworks key={finale} onDone={() => setFinale(0)} /> : null;

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  const hole = rect ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null;

  const next = () => {
    if (isLast) {
      setFinale(Date.now());
      void completeTour();
      setCurrentView("overview");
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    // The wrapper itself never takes clicks; only the dimmed blockers and the card do.
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
            className={cn("absolute rounded-xl transition-all duration-300 ease-out", taskPending && "iris-tour-ring-pulse")}
            style={{
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              boxShadow: "0 0 0 2px #f59e0b, 0 0 0 6px rgba(245,158,11,.25), 0 0 36px 6px rgba(251,146,60,.55)",
            }}
          />
          {taskPending && (
            <div className="absolute text-[18px] iris-tour-point" style={{ left: hole.x + hole.w - 10, top: hole.y + hole.h - 6 }} aria-hidden>
              👆
            </div>
          )}
        </>
      ) : (
        <Blocker style={{ inset: 0 }} />
      )}

      {(isFirst || isLast) && <Sparkles count={isLast ? 28 : 18} />}
      <Confetti key={burst} active={burst > 0} />

      <TourCard
        cardRef={cardRef}
        step={step}
        index={index}
        hole={hole}
        taskPending={taskPending}
        taskDone={taskDone}
        isFirst={isFirst}
        isLast={isLast}
        targetMissing={!hole}
        demoAnswer={demoAnswer}
        onDemoAnswer={setDemoAnswer}
        chatPick={chatPick}
        onChatPick={setChatPick}
        resolved={resolved}
        onResolve={() => setResolved(true)}
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
  return (
    <div
      className={cn("absolute pointer-events-auto", !clear && "backdrop-blur-[2px]")}
      style={{ ...style, background: clear ? "transparent" : "radial-gradient(ellipse at 50% 30%, rgba(60,25,5,.55), rgba(10,6,15,.72))" }}
    />
  );
}

function TourCard({
  cardRef,
  step,
  index,
  hole,
  taskPending,
  taskDone,
  isFirst,
  isLast,
  targetMissing,
  demoAnswer,
  onDemoAnswer,
  chatPick,
  onChatPick,
  resolved,
  onResolve,
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
  isFirst: boolean;
  isLast: boolean;
  targetMissing: boolean;
  demoAnswer: string | null;
  onDemoAnswer: (v: string) => void;
  chatPick: number | null;
  onChatPick: (i: number) => void;
  resolved: boolean;
  onResolve: () => void;
  onDoTask: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const big = isFirst || isLast;

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
    const gap = 16;
    if (!hole || vw < 640) {
      set(vw < 640 && hole ? { left: "12px", right: "12px", bottom: "12px" } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" });
      return;
    }
    const clampX = (x: number) => Math.min(Math.max(12, x), vw - cw - 12);
    const clampY = (y: number) => Math.min(Math.max(12, y), vh - ch - 12);
    // Right of narrow targets (sidebar), below wide ones, above when there's no room.
    if (hole.x + hole.w + gap + cw < vw && hole.w < 320) set({ left: px(hole.x + hole.w + gap), top: px(clampY(hole.y + hole.h / 2 - ch / 2)) });
    else if (hole.y + hole.h + gap + ch < vh) set({ left: px(clampX(hole.x + hole.w / 2 - cw / 2)), top: px(hole.y + hole.h + gap) });
    else set({ left: px(clampX(hole.x + hole.w / 2 - cw / 2)), top: px(clampY(hole.y - gap - ch)) });
  }, [hole, step.id, cardRef, demoAnswer, chatPick, resolved]);

  const t = step.task;
  const total = STEPS.length;
  return (
    <div
      ref={cardRef}
      key={step.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-tour-title"
      aria-describedby="iris-tour-body"
      className={cn(
        "iris-tour-card absolute pointer-events-auto flex flex-col overflow-hidden rounded-3xl border border-amber-400/30 bg-card text-card-foreground",
        "shadow-[0_30px_80px_-20px_rgba(251,146,60,.45)] transition-[left,top] duration-300 ease-out max-h-[calc(100vh-24px)]",
        step.visual ? "w-[min(480px,calc(100vw-24px))]" : big ? "w-[min(440px,calc(100vw-24px))]" : "w-[min(380px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      <Toran />
      {big && (
        <Rangoli className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 opacity-[.14] dark:opacity-[.2] iris-tour-spin" />
      )}

      {/* Progress */}
      <div className="relative px-5 pt-7">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-medium text-muted-foreground tabular-nums">Step {index + 1} of {total}</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/25">
            {step.eyebrow}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-[width] duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Content (scrolls if the screen is short; footer stays visible) */}
      <div className="relative flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-1">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className={cn(
              "shrink-0 grid place-items-center rounded-2xl bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-rose-500/20 ring-1 ring-amber-400/40 iris-tour-pop",
              big ? "h-14 w-14 text-[30px]" : "h-11 w-11 text-[22px]",
            )}
          >
            {step.emoji}
          </div>
          <h2
            id="iris-tour-title"
            className={cn(
              "font-bold leading-tight tracking-tight",
              big ? "text-[22px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent" : "text-[18px]",
            )}
          >
            {step.title}
          </h2>
        </div>
        <p id="iris-tour-body" className={cn("mt-3 leading-relaxed text-foreground/80", big ? "text-[14.5px]" : "text-[14px]")}>
          {step.body}
        </p>

        {step.visual === "intake" && <DemoIntake answer={demoAnswer} onAnswer={onDemoAnswer} />}
        {step.visual === "chat" && <DemoChat sent={chatPick !== null} onSend={() => onChatPick(0)} />}
        {step.visual === "ask" && <DemoAsk />}
        {step.visual === "resolve" && <DemoResolve resolved={resolved} onResolve={onResolve} />}
        {step.visual === "recurrence" && <DemoRecurrence />}

        {t && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors",
              taskDone ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-400/50 bg-amber-400/10 text-foreground",
            )}
            role="status"
          >
            {taskDone ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : t.kind === "palette" ? (
              <Command className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-300" />
            ) : (
              <MousePointerClick className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-300" />
            )}
            <span>{taskDone ? "Done! 🎉" : `Your turn: ${t.hint}`}</span>
          </div>
        )}
        {t && !taskDone && (t.kind === "palette" || (t.kind === "view" && targetMissing)) && (
          <button
            onClick={onDoTask}
            className="mt-2 h-9 px-3 rounded-lg border border-amber-400/50 bg-background text-[12.5px] font-medium hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {t.kind === "palette" ? "Open search for me" : "Take me there"}
          </button>
        )}
      </div>

      {/* Footer: solid, always on top of any decoration */}
      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-5 py-3">
        {index > 0 && !isLast ? (
          <button
            onClick={onBack}
            className="h-10 px-3 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </button>
        ) : (
          <span />
        )}
        <button
          data-tour-primary
          onClick={onNext}
          disabled={taskPending}
          className={cn(
            "h-10 px-5 rounded-xl text-[13.5px] font-semibold inline-flex items-center justify-center whitespace-nowrap transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-amber-400",
            taskPending
              ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
              : "text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-[0_10px_24px_-10px_rgba(249,115,22,.9)] hover:brightness-110 active:scale-[.98]",
          )}
        >
          {step.cta ?? (taskPending ? "Finish the step above" : "Next")}
          {!isLast && !step.cta && !taskPending && <ArrowRight className="w-4 h-4 ml-1.5" />}
        </button>
      </div>
    </div>
  );
}

function Sparkles({ count }: { count: number }) {
  const dots = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        delay: `${(i % 7) * 0.45}s`,
        size: 8 + ((i * 7) % 10),
        char: i % 3 === 0 ? "✨" : i % 3 === 1 ? "•" : "✦",
      })),
    [count],
  );
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d, i) => (
        <span key={i} className="absolute iris-tour-twinkle text-amber-300" style={{ left: d.left, top: d.top, animationDelay: d.delay, fontSize: d.size }}>
          {d.char}
        </span>
      ))}
    </div>
  );
}

/** Small celebratory burst from the centre whenever a task is completed. */
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = ["🎉", "✨", "🪔", "🎆", "⭐", "🧡", "✨", "🎇", "💛", "✨", "🎉", "⭐"];
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 text-[18px] iris-tour-burst"
            style={{ "--dx": `${Math.cos(angle) * 220}px`, "--dy": `${Math.sin(angle) * 160}px` } as React.CSSProperties}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
}

function TourStyles() {
  return (
    <style>{`
      :root[data-accent="diwali"] {
        --primary: #f97316; --ring: #f97316; --accent-foreground: #ea580c;
        --sidebar-primary: #f97316; --sidebar-accent-foreground: #f97316; --sidebar-ring: #f97316;
        --iris-hero-from: #f59e0b; --iris-hero-to: #e11d48;
      }
      @keyframes iris-tour-twinkle-soft { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
      @keyframes iris-tour-in { from { opacity: 0; translate: 0 10px; scale: .97 } to { opacity: 1; translate: 0 0; scale: 1 } }
      @keyframes iris-tour-pop { 0% { scale: .6; rotate: -12deg } 60% { scale: 1.12; rotate: 6deg } 100% { scale: 1; rotate: 0deg } }
      @keyframes iris-tour-float { 0%,100% { translate: 0 0 } 50% { translate: 0 -5px } }
      @keyframes iris-tour-twinkle { 0%,100% { opacity: 0; scale: .5 } 50% { opacity: .95; scale: 1 } }
      @keyframes iris-tour-flicker { 0%,100% { filter: drop-shadow(0 0 2px #f59e0b) } 50% { filter: drop-shadow(0 0 6px #fb923c) } }
      @keyframes iris-tour-ring { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
      @keyframes iris-tour-spin { to { rotate: 360deg } }
      @keyframes iris-tour-point { 0%,100% { translate: 0 0 } 50% { translate: -4px -4px } }
      @keyframes iris-tour-burst { 0% { opacity: 1; transform: translate(-50%,-50%) scale(.4) } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1) rotate(25deg) } }
      @media (prefers-reduced-motion: no-preference) {
        .iris-tour-card { animation: iris-tour-in .35s cubic-bezier(.2,.8,.2,1) both }
        .iris-tour-pop { animation: iris-tour-pop .5s cubic-bezier(.2,.8,.2,1) both }
        .iris-tour-float { display: inline-block; animation: iris-tour-float 2.4s ease-in-out infinite }
        .iris-tour-twinkle { animation: iris-tour-twinkle 2.8s ease-in-out infinite }
        .iris-tour-flicker { display: inline-block; animation: iris-tour-flicker 1.4s ease-in-out infinite }
        .iris-tour-ring-pulse, .iris-tour-glow-pulse { animation: iris-tour-ring 1.3s ease-in-out infinite }
        .iris-tour-twinkle-soft { animation: iris-tour-twinkle-soft 1.6s ease-in-out infinite }
        .iris-tour-spin { animation: iris-tour-spin 60s linear infinite }
        .iris-tour-point { animation: iris-tour-point 1s ease-in-out infinite }
        .iris-tour-burst { animation: iris-tour-burst .9s cubic-bezier(.2,.7,.3,1) forwards }
      }
      @media (prefers-reduced-motion: reduce) { .iris-tour-burst { display: none } }
    `}</style>
  );
}

function DemoRow({ label, children, done }: { label: string; children: React.ReactNode; done?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
      <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
        {done ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="text-rose-500">*</span>}
        {label}
      </div>
      <div className="min-w-0 text-[12px]">{children}</div>
    </div>
  );
}

/** A static, made-up intake card. Nothing here calls IRIS or creates anything. */
function DemoIntake({ answer, onAnswer }: { answer: string | null; onAnswer: (v: string) => void }) {
  const chip = (on: boolean) =>
    cn(
      "px-2.5 py-1 rounded-full border text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
      on ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium" : "border-border hover:border-amber-400/60",
    );
  const captured = 2 + (answer ? 1 : 0);
  return (
    <div className="mt-4 space-y-2.5" aria-label="Example report">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-[12px] leading-relaxed shadow-sm">
          AC in Studio 1 at Kwality House isn&apos;t cooling since this morning 🥵
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2 text-[11px]">
          <span className="font-semibold">AC &amp; Ventilation Repairs</span>
          <span className="ml-auto text-muted-foreground">
            <b className={cn("tabular-nums", answer ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{captured}/3</b> answered
          </span>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5 text-[10.5px]">
            <span className="rounded-full bg-muted px-2 py-0.5">🏢 Facilities</span>
            <span className="rounded-full bg-muted px-2 py-0.5">👷 Owner: Facilities lead</span>
            <span className="rounded-full bg-muted px-2 py-0.5">⏱️ Fix within 1 day</span>
          </div>
          <DemoRow label="Studio · area" done>Kwality House · Studio 1</DemoRow>
          <DemoRow label="Since when" done>Today</DemoRow>
          <div className={cn("rounded-xl -mx-1.5 px-1.5 py-1.5 transition-colors", !answer && "ring-2 ring-amber-400/70 bg-amber-400/10 iris-tour-glow-pulse")}>
            <DemoRow label="Members complained?" done={!!answer}>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Members complained?">
                {["Yes", "No", "Don't know"].map((o) => (
                  <button key={o} role="radio" aria-checked={answer === o} onClick={() => onAnswer(o)} className={chip(answer === o)}>
                    {o}
                  </button>
                ))}
              </div>
            </DemoRow>
          </div>
          {answer === "Yes" && (
            <div className="iris-tour-card">
              <DemoRow label="Who complained?"><span className="text-muted-foreground italic">IRIS asks this only because you said Yes ✨</span></DemoRow>
            </div>
          )}
          <div className="pt-1 text-[11.5px] text-muted-foreground">
            🔒 The ticket unlocks once every * question is answered. &ldquo;Don&apos;t know&rdquo; is fine too.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Illustrations ─────────────────────────────────────────────────────────────

/** One sample message; tapping it "sends" it and shows IRIS's reply. Nothing is sent anywhere. */
function DemoChat({ sent, onSend }: { sent: boolean; onSend: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/70 p-3 space-y-2.5">
      <div className="flex justify-end">
        <button
          onClick={onSend}
          disabled={sent}
          className={cn(
            "max-w-[90%] rounded-2xl rounded-br-md px-3 py-2 text-left text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
            sent ? "bg-primary text-primary-foreground" : "bg-primary/90 text-primary-foreground ring-2 ring-amber-400 iris-tour-glow-pulse hover:brightness-110",
          )}
        >
          Bike 7 at Bandra keeps squeaking 😩
          {!sent && <span className="block mt-1 text-[10.5px] opacity-80">Tap to send ➜</span>}
        </button>
      </div>
      {sent && (
        <div className="flex items-end gap-2 iris-tour-card">
          <div className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[11px] text-white font-bold">I</div>
          <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-[13px] leading-relaxed">
            Got it! 🛠️ I&apos;ve logged a <b>bike repair</b> for Facilities. Just a few quick questions next.
          </div>
        </div>
      )}
    </div>
  );
}

/** A static question-and-answer example. */
function DemoAsk() {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/70 p-3 space-y-2.5">
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-[13px]">How many tickets are open at Kwality House?</div>
      </div>
      <div className="flex items-end gap-2">
        <div className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[11px] text-white font-bold">I</div>
        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-[13px] leading-relaxed">4 are open: 1 urgent and 2 due today 📊</div>
      </div>
    </div>
  );
}

/** A make-believe ticket you can resolve with one click. Nothing is saved. */
function DemoResolve({ resolved, onResolve }: { resolved: boolean; onResolve: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/70 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
        <span className="text-[13px] font-semibold truncate">Mic crackling in Studio 2</span>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            resolved ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
          )}
        >
          {resolved ? "Resolved ✓" : "In progress"}
        </span>
      </div>
      <div className="p-3">
        {resolved ? (
          <div className="space-y-1.5 text-[12.5px] iris-tour-card">
            <div className="text-[11px] font-medium text-muted-foreground">What you did (required)</div>
            <div className="rounded-lg bg-emerald-500/10 px-2.5 py-2 text-emerald-900 dark:text-emerald-100">Replaced the mic battery. Tested it, works fine.</div>
          </div>
        ) : (
          <button
            onClick={onResolve}
            className="iris-tour-glow-pulse inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Check className="w-4 h-4" />Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
}

/** Timeline of the bike / mic recurrence protocol. */
function DemoRecurrence() {
  const nodes = [
    { day: "Day 0", label: "Fixed", emoji: "🛠️", cls: "from-emerald-400 to-emerald-600" },
    { day: "Day 5", label: "Check 1", emoji: "🔍", cls: "from-amber-400 to-orange-500" },
    { day: "Day 10", label: "Check 2", emoji: "🔍", cls: "from-orange-400 to-rose-500" },
  ];
  return (
    <div className="mt-4 space-y-3">
      <div className="relative rounded-2xl border border-border bg-background/70 px-3 pt-4 pb-3">
        <div aria-hidden className="absolute left-[16%] right-[16%] top-[34px] h-[3px] rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-70" />
        <div className="relative grid grid-cols-3 text-center">
          {nodes.map((n, i) => (
            <div key={n.day} className="flex flex-col items-center gap-1">
              <div className={cn("h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br text-[16px] shadow-md ring-4 ring-card iris-tour-pop", n.cls)} style={{ animationDelay: `${i * 0.15}s` }}>
                {n.emoji}
              </div>
              <div className="text-[11.5px] font-semibold">{n.label}</div>
              <div className="text-[10.5px] text-muted-foreground">{n.day}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12.5px]">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">✅ Still working</div>
          <div className="text-muted-foreground">All good, nothing to do.</div>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
          <div className="font-semibold text-rose-700 dark:text-rose-300">↩️ Broken again</div>
          <div className="text-muted-foreground">The ticket reopens.</div>
        </div>
      </div>
    </div>
  );
}

/** Decorative rangoli, drawn in SVG so it stays crisp and theme-friendly. */
function Rangoli({ className }: { className?: string }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="-50 -50 100 100" aria-hidden className={className}>
      <g fill="none" strokeWidth="1.4">
        {petals.map((a) => (
          <path key={a} d="M0 -8 C 7 -18, 7 -30, 0 -42 C -7 -30, -7 -18, 0 -8 Z" transform={`rotate(${a})`} stroke="#f59e0b" fill="rgba(251,146,60,.12)" />
        ))}
        {petals.map((a) => (
          <circle key={`d${a}`} cx="0" cy="-46" r="1.8" transform={`rotate(${a + 15})`} fill="#e11d48" stroke="none" />
        ))}
        <circle r="13" stroke="#e11d48" fill="rgba(225,29,72,.08)" />
        <circle r="6" stroke="#f59e0b" fill="rgba(245,158,11,.35)" />
      </g>
    </svg>
  );
}

/** A string of festive lights across the top of the card. */
function Toran() {
  const colors = ["#f59e0b", "#e11d48", "#22c55e", "#f97316", "#a855f7", "#facc15"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6">
      <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M0 2 Q 100 18 200 6 T 400 2" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1" className="text-foreground" />
      </svg>
      <div className="absolute inset-x-3 top-1 flex justify-between">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full iris-tour-twinkle-soft"
            style={{
              background: colors[i % colors.length],
              boxShadow: `0 0 8px ${colors[i % colors.length]}`,
              marginTop: `${Math.round(6 * Math.sin((i / 13) * Math.PI))}px`,
              animationDelay: `${(i % 5) * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Two confetti cannons from the bottom corners, played once when the tour ends. */
function Fireworks({ onDone }: { onDone: () => void }) {
  React.useEffect(() => {
    const id = window.setTimeout(onDone, 3600);
    return () => window.clearTimeout(id);
  }, [onDone]);
  const colors = ["#f59e0b", "#f97316", "#e11d48", "#facc15", "#ec4899", "#fde68a", "#ffffff", "#a855f7", "#22c55e"];
  // Deterministic pseudo-random so the render stays pure.
  const rnd = (n: number) => {
    const x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  const pieces = (side: "left" | "right") =>
    Array.from({ length: 80 }, (_, i) => {
      const seed = i + (side === "left" ? 0 : 1000);
      const angle = (-70 + rnd(seed) * 45) * (Math.PI / 180); // up and inwards
      const power = 420 + rnd(seed + 1) * 520;
      // Left cannon fires up-and-right, right cannon up-and-left.
      const dx = Math.cos(angle) * power * 0.55 * (side === "left" ? 1 : -1);
      const dy = Math.sin(angle) * power;
      return {
        key: `${side}${i}`,
        side,
        color: colors[Math.floor(rnd(seed + 2) * colors.length)],
        w: 6 + rnd(seed + 3) * 6,
        h: rnd(seed + 4) > 0.5 ? 6 + rnd(seed + 5) * 10 : 6 + rnd(seed + 3) * 6,
        round: rnd(seed + 6) > 0.6,
        delay: rnd(seed + 7) * 0.25,
        dur: 2.2 + rnd(seed + 8) * 1.2,
        spin: (rnd(seed + 9) > 0.5 ? 1 : -1) * (360 + rnd(seed + 10) * 720),
        dx,
        dy,
      };
    });
  return (
    <div aria-hidden className="fixed inset-0 z-[95] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes iris-cannon {
          0%   { opacity: 1; transform: translate(0,0) rotate(0deg) }
          45%  { opacity: 1; transform: translate(var(--dx), var(--dy)) rotate(calc(var(--spin) * .5)) }
          100% { opacity: 0; transform: translate(calc(var(--dx) * 1.25), calc(var(--dy) + 340px)) rotate(var(--spin)) }
        }
        @keyframes iris-flash { 0% { opacity: 0; scale: .2 } 30% { opacity: 1 } 100% { opacity: 0; scale: 1.6 } }
        @media (prefers-reduced-motion: reduce) { .iris-cannon-piece, .iris-flash { display: none } }
      `}</style>
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className="iris-flash absolute bottom-[-60px] h-40 w-40 rounded-full"
          style={{
            [side]: "-40px",
            background: "radial-gradient(circle, rgba(253,230,138,.9), rgba(249,115,22,.35) 45%, transparent 70%)",
            animation: "iris-flash .9s ease-out forwards",
          }}
        />
      ))}
      {[...pieces("left"), ...pieces("right")].map((p) => (
        <span
          key={p.key}
          className="iris-cannon-piece absolute bottom-0"
          style={
            {
              [p.side]: "2vw",
              width: p.w,
              height: p.h,
              background: p.color,
              borderRadius: p.round ? "9999px" : "2px",
              boxShadow: `0 0 6px ${p.color}`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--spin": `${p.spin}deg`,
              animation: `iris-cannon ${p.dur}s cubic-bezier(.15,.65,.35,1) ${p.delay}s forwards`,
              opacity: 0,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="absolute inset-x-0 top-[18%] text-center text-[44px] iris-tour-card" style={{ animation: "iris-flash 2.6s ease-out forwards" }}>
        🎆🪔🎆
      </div>
    </div>
  );
}
