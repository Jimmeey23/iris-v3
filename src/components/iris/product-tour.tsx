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
  visual?: "intake" | "chat" | "resolve" | "recurrence";
  cta?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    emoji: "🪔",
    eyebrow: "Festive update",
    title: "Happy Diwali, Physiquers! 🪔✨",
    body: "This Diwali, IRIS is lighting things up with some sizzling new updates! 🔥 A little sparkle, a lot of excitement, and plenty of reasons to cheer. Let's unwrap what's new! 🎁",
    cta: "Let's unwrap 🎁",
  },
  {
    id: "overview",
    emoji: "🏠",
    target: "nav-overview",
    view: "overview",
    eyebrow: "Home base",
    title: "Your studio at a glance",
    body: "What's open, what's urgent and what's due next. One look and you're in the know 👀",
  },
  {
    id: "open-ai",
    emoji: "🤖",
    target: "nav-ai_assistant",
    eyebrow: "Your turn · 1 of 6",
    title: "Meet your new sidekick",
    body: "Just tell IRIS what happened, the way you'd tell a friend. It takes it from there 💬",
    task: { kind: "view", view: "ai_assistant", hint: "Click AI Assistant to continue" },
  },
  {
    id: "chat",
    emoji: "💬",
    view: "ai_assistant",
    eyebrow: "Your turn · 2 of 6",
    title: "Three things you can ask IRIS",
    body: "Report a problem, ask a question, or ask it to dig deeper. Plain words work best. Tap a bubble to see what IRIS does with it 👇",
    visual: "chat",
    task: { kind: "demo", hint: "Tap any example bubble" },
  },
  {
    id: "demo",
    emoji: "🧾",
    eyebrow: "Your turn · 3 of 6",
    title: "Watch IRIS do the heavy lifting",
    body: "Here's a sample report. IRIS sorted it, picked who fixes it and set a deadline, all on its own. It only asks what it still needs. Try answering the glowing question ✨",
    visual: "intake",
    task: { kind: "demo", hint: "Answer “Members complained?”" },
  },
  {
    id: "open-tickets",
    emoji: "🎟️",
    target: "nav-all_tickets",
    eyebrow: "Your turn · 4 of 6",
    title: "Every ticket, one place",
    body: "Search, filter and sort every ticket. Nothing hides from you here 🔍",
    task: { kind: "view", view: "all_tickets", hint: "Open All Tickets" },
  },
  {
    id: "views",
    emoji: "🔖",
    target: "saved-views",
    view: "all_tickets",
    eyebrow: "Brand new",
    title: "Saved views",
    body: "Set your filters once, save them, and open them in one click next time. Less clicking, more doing 🙌",
  },
  {
    id: "resolve",
    emoji: "✅",
    eyebrow: "Your turn · 5 of 6",
    title: "Closing the loop",
    body: "Fixed it? Open the ticket and hit Mark Resolved. IRIS asks for a short summary of what you did, so everyone knows how it ended. Give it a go 👇",
    visual: "resolve",
    task: { kind: "resolve", hint: "Mark the sample ticket resolved" },
  },
  {
    id: "recurrence",
    emoji: "🔁",
    eyebrow: "Fixed means fixed",
    title: "Recurrence checks",
    body: "When a PowerCycle bike or a mic is fixed, IRIS doesn't just take our word for it. It sets up two follow-up checks to make sure the fault stays gone.",
    visual: "recurrence",
  },
  {
    id: "palette",
    emoji: "⚡",
    eyebrow: "Your turn · 6 of 6",
    title: "Find anything, instantly",
    body: "Looking for a ticket, member or template? One shortcut finds it, from anywhere ⚡",
    task: { kind: "palette", hint: "Press ⌘K (Ctrl K on Windows)" },
  },
  {
    id: "member-360",
    emoji: "👤",
    target: "member-360",
    eyebrow: "Know your members",
    title: "Member 360",
    body: "Everything about a member in one place: visits, memberships and past tickets. Know them before you reply 🤝",
  },
  {
    id: "templates",
    emoji: "📋",
    target: "nav-templates",
    view: "templates",
    eyebrow: "Shortcuts",
    title: "Templates & drafts",
    body: "Ready-made forms for common issues. Got interrupted? Save a draft and finish later. IRIS will wait 😌",
  },
  {
    id: "escalations",
    emoji: "🚨",
    target: "nav-escalations",
    eyebrow: "Nothing slips",
    title: "Escalations",
    body: "Overdue tickets land here, and IRIS nudges their owners for you. No chasing needed 🏃",
  },
  {
    id: "notifications",
    emoji: "🔔",
    target: "notifications",
    eyebrow: "Stay in the loop",
    title: "Notifications",
    body: "New tickets for you, mentions and reminders all ping here. You won't miss a thing 🔔",
  },
  {
    id: "done",
    emoji: "🎆",
    eyebrow: "That's a wrap",
    title: "Shubh Deepavali! 🎇",
    body: "You're all set! Spot an issue? Tell IRIS. Have an idea? Hit the feedback button. Wishing you a bright Diwali and very few tickets 💛",
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
  return (
    <div
      ref={cardRef}
      key={step.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-tour-title"
      aria-describedby="iris-tour-body"
      className={cn(
        "iris-tour-card absolute pointer-events-auto overflow-hidden rounded-3xl border border-amber-400/30 bg-card text-card-foreground",
        "shadow-[0_30px_80px_-20px_rgba(251,146,60,.45),0_0_0_1px_rgba(255,255,255,.04)] transition-[left,top] duration-300 ease-out",
        step.visual ? "w-[min(540px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto" : big ? "w-[min(460px,calc(100vw-24px))]" : "w-[min(370px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      {/* Festive glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 100% 0%, rgba(251,146,60,.18), transparent 60%), radial-gradient(90% 60% at 0% 100%, rgba(236,72,153,.12), transparent 60%)" }}
      />
      <Toran />
      <Rangoli className={cn("pointer-events-none absolute opacity-[.16] dark:opacity-[.22] iris-tour-spin", big ? "-right-14 -bottom-14 h-56 w-56" : "-right-10 -bottom-10 h-36 w-36")} />
      {big && (
        <div aria-hidden className="pointer-events-none absolute top-5 inset-x-0 flex justify-around text-[15px] opacity-90">
          {["🪔", "✨", "🪔", "✨", "🪔"].map((c, i) => (
            <span key={i} className="iris-tour-float" style={{ animationDelay: `${i * 0.25}s` }}>{c}</span>
          ))}
        </div>
      )}

      <div className={cn("relative", big ? "p-6 pt-12" : "p-5 pt-7")}>
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className={cn(
              "shrink-0 grid place-items-center rounded-2xl bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-rose-500/20 ring-1 ring-amber-400/40 iris-tour-pop",
              big ? "h-14 w-14 text-[30px]" : "h-11 w-11 text-[22px]",
            )}
          >
            {step.emoji}
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/25">
              {step.eyebrow}
            </span>
            <h2
              id="iris-tour-title"
              className={cn(
                "mt-1.5 font-semibold leading-tight tracking-tight",
                big ? "text-[22px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent" : "text-[17px]",
              )}
            >
              {step.title}
            </h2>
          </div>
        </div>
        <p id="iris-tour-body" className={cn("mt-3 leading-relaxed text-muted-foreground", big ? "text-[14px]" : "text-[13px]")}>
          {step.body}
        </p>

        {t && (
          <div
            className={cn(
              "mt-3.5 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] transition-colors",
              taskDone ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-400/40 bg-amber-400/10",
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
            <span className="font-medium">{taskDone ? "Nailed it! 🎉" : t.hint}</span>
          </div>
        )}
        {t && !taskDone && (t.kind === "palette" || (t.kind === "view" && targetMissing)) && (
          <button
            onClick={onDoTask}
            className="mt-2 h-8 px-3 rounded-lg border border-amber-400/40 text-[12px] font-medium hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {t.kind === "palette" ? "Open search for me" : "Take me there"}
          </button>
        )}

        {step.visual === "intake" && <DemoIntake answer={demoAnswer} onAnswer={onDemoAnswer} />}
        {step.visual === "chat" && <DemoChat pick={chatPick} onPick={onChatPick} />}
        {step.visual === "resolve" && <DemoResolve resolved={resolved} onResolve={onResolve} />}
        {step.visual === "recurrence" && <DemoRecurrence />}

        <div className="mt-5 flex items-center gap-3">
          <Diyas index={index} total={STEPS.length} />
          <div className="ml-auto flex items-center gap-1.5">
            {index > 0 && !isLast && (
              <button
                onClick={onBack}
                className="h-9 px-3 rounded-xl text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
              </button>
            )}
            <button
              data-tour-primary
              onClick={onNext}
              disabled={taskPending}
              className={cn(
                "h-9 px-4 rounded-xl text-[13px] font-semibold inline-flex items-center text-white transition",
                "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-[0_10px_24px_-10px_rgba(249,115,22,.9)]",
                "hover:brightness-110 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-amber-400",
                "disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed",
              )}
            >
              {step.cta ?? (taskPending ? "Your turn ☝️" : "Next")}
              {!isLast && !step.cta && !taskPending && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Progress as a row of diyas that light up. */
function Diyas({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Step ${index + 1} of ${total}`} role="img">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "text-[11px] transition-all duration-300",
            i < index ? "opacity-90" : i === index ? "scale-125 iris-tour-flicker" : "opacity-25 grayscale",
          )}
        >
          🪔
        </span>
      ))}
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
  const captured = 7 + (answer ? 1 : 0);
  return (
    <div className="mt-4 space-y-2.5" aria-label="Example report">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-[12px] leading-relaxed shadow-sm">
          AC in Studio 1 at Kwality House isn&apos;t cooling since this morning. Front desk moved the 7am class to Studio 2. 🥵
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2 text-[11px]">
          <span className="font-semibold">AC &amp; Ventilation Repairs</span>
          <span className="ml-auto text-muted-foreground">
            <b className={cn("tabular-nums", answer ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{captured}/14</b> captured
          </span>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5 text-[10.5px]">
            <span className="rounded-full bg-muted px-2 py-0.5">🏢 Facilities</span>
            <span className="rounded-full bg-muted px-2 py-0.5">👷 Owner: Facilities lead</span>
            <span className="rounded-full bg-muted px-2 py-0.5">⏱️ Respond 1h · resolve 1d</span>
          </div>
          <DemoRow label="Studio · area" done>Kwality House · Studio 1</DemoRow>
          <DemoRow label="Since when" done>Today</DemoRow>
          <DemoRow label="Steps taken" done>Moved 7am class to Studio 2</DemoRow>
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
            <div className="space-y-2 iris-tour-card">
              <DemoRow label="Who complained"><span className="text-muted-foreground italic">asked only because you said Yes ✨</span></DemoRow>
              <DemoRow label="What they said"><span className="text-muted-foreground italic">their words, as close as possible</span></DemoRow>
            </div>
          )}
          <DemoRow label="Vendor contacted?"><span className="text-muted-foreground">Visit scheduled · Awaiting reply · Not yet · Not needed</span></DemoRow>
          <DemoRow label="Expected fix date"><span className="text-muted-foreground">dd / mm / yyyy</span></DemoRow>
          <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-300">
            🔒 The ticket draft unlocks once every * answer is in. &ldquo;Don&apos;t know&rdquo; counts too.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Illustrations ─────────────────────────────────────────────────────────────

const CHAT_EXAMPLES = [
  {
    tag: "Report",
    you: "Bike 7 at Bandra keeps squeaking 😩",
    iris: "Logged it! 🛠️ PowerCycle bike repair, sent to Facilities, due in 1 day. I'll ask only for what's missing, like the bike number and whether it's still usable.",
  },
  {
    tag: "Ask",
    you: "How many tickets are open at Kwality House?",
    iris: "4 open right now 📊 1 urgent, 2 due today, 1 waiting on a vendor. Want me to list them?",
  },
  {
    tag: "Dig deeper",
    you: "Why do the mics keep failing at Kemps?",
    iris: "I checked past tickets 🔎 3 mic faults in 30 days, all the same headset, all after 7pm classes. Likely battery. Shall I raise a ticket to replace it?",
  },
];

/** Three example prompts; tapping one shows how IRIS replies. Nothing is sent anywhere. */
function DemoChat({ pick, onPick }: { pick: number | null; onPick: (i: number) => void }) {
  const ex = pick === null ? null : CHAT_EXAMPLES[pick];
  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-1.5">
        {CHAT_EXAMPLES.map((c, i) => (
          <button
            key={c.tag}
            onClick={() => onPick(i)}
            className={cn(
              "group flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-[12.5px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
              pick === i ? "border-amber-500 bg-amber-500/10 shadow-sm" : "border-border hover:border-amber-400/60 hover:-translate-y-px",
              pick === null && "iris-tour-glow-pulse",
            )}
          >
            <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">{c.tag}</span>
            <span className="truncate">“{c.you}”</span>
          </button>
        ))}
      </div>
      {ex && (
        <div key={pick} className="rounded-2xl border border-border bg-background/70 p-3 space-y-2 iris-tour-card">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-[12px]">{ex.you}</div>
          </div>
          <div className="flex items-end gap-2">
            <div className="h-6 w-6 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[11px] text-white font-bold">I</div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-[12px] leading-relaxed">{ex.iris}</div>
          </div>
        </div>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px] text-muted-foreground">
        <li className="rounded-xl bg-muted/50 px-2.5 py-1.5">➕ Keep typing to add details. IRIS updates the report as you go.</li>
        <li className="rounded-xl bg-muted/50 px-2.5 py-1.5">👤 Mention a member and pick them from Momence.</li>
        <li className="rounded-xl bg-muted/50 px-2.5 py-1.5">🔍 &ldquo;Investigate with AI&rdquo; checks past tickets and workload.</li>
        <li className="rounded-xl bg-muted/50 px-2.5 py-1.5">📤 Export the chat whenever you need a record.</li>
      </ul>
    </div>
  );
}

/** A make-believe ticket you can resolve. Nothing is saved. */
function DemoResolve({ resolved, onResolve }: { resolved: boolean; onResolve: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("Replaced the headset battery and tested the mic for a full class. Working fine.");
  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/70 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
        <span className="text-[10.5px] font-mono text-muted-foreground">TKT-1042</span>
        <span className="text-[12.5px] font-semibold truncate">Headset mic crackling in Studio 2</span>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
            resolved ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
          )}
        >
          {resolved ? "Resolved ✓" : "In progress"}
        </span>
      </div>
      <div className="p-3 space-y-2.5">
        {!resolved && !open && (
          <button
            onClick={() => setOpen(true)}
            className="iris-tour-glow-pulse inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Check className="w-3.5 h-3.5" />Mark Resolved
          </button>
        )}
        {!resolved && open && (
          <div className="space-y-2 iris-tour-card">
            <label className="block text-[11px] font-medium" htmlFor="iris-tour-resolution">
              What did you do? <span className="text-rose-500">*</span>
              <span className="font-normal text-muted-foreground"> (required, everyone involved can see it)</span>
            </label>
            <textarea
              id="iris-tour-resolution"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            <button
              onClick={onResolve}
              disabled={!note.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Check className="w-3.5 h-3.5" />Resolve ticket
            </button>
          </div>
        )}
        {resolved && (
          <div className="space-y-1.5 text-[12px] iris-tour-card">
            <div className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-emerald-800 dark:text-emerald-200">📝 {note}</div>
            <div className="text-muted-foreground">🎯 The reporter is notified. It&apos;s a mic, so IRIS has also booked follow-up checks. More on that next 👉</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Timeline of the bike / mic recurrence protocol. */
function DemoRecurrence() {
  const nodes = [
    { day: "Day 0", label: "Resolved", emoji: "✅", cls: "from-emerald-400 to-emerald-600" },
    { day: "Day 5", label: "Check #1", emoji: "🔍", cls: "from-amber-400 to-orange-500" },
    { day: "Day 10", label: "Check #2", emoji: "🔍", cls: "from-orange-400 to-rose-500" },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">✅ No recurrence</div>
          <div className="mt-0.5 text-muted-foreground">Check closes and the next one is lined up. Two passes and you&apos;re done.</div>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5">
          <div className="font-semibold text-rose-700 dark:text-rose-300">↩️ Fault returned</div>
          <div className="mt-0.5 text-muted-foreground">The original ticket reopens and the remaining checks are cancelled.</div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        📅 Each check turns into a ticket only on its due day, so your queue stays clean. Only bikes and mics get checks; everything else just closes.
      </p>
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
