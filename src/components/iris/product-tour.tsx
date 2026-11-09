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
  demo?: boolean;
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
    title: "Your studio's pulse",
    body: "Open, urgent and past-SLA tickets for your studio, what's due next, and what's being raised most. Your morning chai companion ☕",
  },
  {
    id: "open-ai",
    emoji: "🤖",
    target: "nav-ai_assistant",
    eyebrow: "Your turn · 1 of 4",
    title: "Meet your new sidekick",
    body: "No more hunting for forms. Tell IRIS what happened in plain words and it does the rest.",
    task: { kind: "view", view: "ai_assistant", hint: "Click AI Assistant (or Tab to it and press Enter)" },
  },
  {
    id: "demo",
    emoji: "🧾",
    eyebrow: "Your turn · 2 of 4",
    title: "Watch IRIS do the heavy lifting",
    body: "Someone sent the message below. IRIS picked the category, owner and SLA, pre-filled what it could, and asks only what an AC fault needs. Answer the glowing question ✨",
    demo: true,
    task: { kind: "demo", hint: "Answer “Members complained?”" },
  },
  {
    id: "open-tickets",
    emoji: "🎟️",
    target: "nav-all_tickets",
    eyebrow: "Your turn · 3 of 4",
    title: "Every ticket, one place",
    body: "Search, filter, group and act on tickets in bulk.",
    task: { kind: "view", view: "all_tickets", hint: "Open All Tickets" },
  },
  {
    id: "views",
    emoji: "🔖",
    target: "saved-views",
    view: "all_tickets",
    eyebrow: "Brand new",
    title: "Saved views",
    body: "Set up the filters you use daily (like breached P0s at your studio), save them here, and bring them back in one click. Like a speed-dial for tickets 📞",
  },
  {
    id: "palette",
    emoji: "⚡",
    eyebrow: "Your turn · 4 of 4",
    title: "Find anything, instantly",
    body: "Tickets, members, templates and articles from anywhere in IRIS. Faster than finding the last box of kaju katli 🍬",
    task: { kind: "palette", hint: "Press ⌘K (Ctrl K on Windows)" },
  },
  {
    id: "member-360",
    emoji: "👤",
    target: "member-360",
    eyebrow: "Know your members",
    title: "Member 360",
    body: "A member's Momence profile, memberships, visits and past tickets, all before you reply.",
  },
  {
    id: "templates",
    emoji: "📋",
    target: "nav-templates",
    view: "templates",
    eyebrow: "Shortcuts",
    title: "Templates & drafts",
    body: "Hundreds of ready-made forms. Got interrupted mid-way? Save a draft (up to three) and pick up later.",
  },
  {
    id: "escalations",
    emoji: "🚨",
    target: "nav-escalations",
    eyebrow: "Nothing slips",
    title: "Escalations",
    body: "Breached and escalated tickets gather here, and owners get nudged automatically.",
  },
  {
    id: "notifications",
    emoji: "🔔",
    target: "notifications",
    eyebrow: "Stay in the loop",
    title: "Notifications",
    body: "Assignments, mentions, nudges and SLA warnings, all in one place.",
  },
  {
    id: "done",
    emoji: "🎆",
    eyebrow: "That's a wrap",
    title: "Shubh Deepavali! 🎇",
    body: "You're all set. Report issues from AI Assistant or the New issue button, and send ideas through the feedback button at the top. May your tickets be few and your SLAs always green 💚",
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
      (t.kind === "demo" && demoAnswer !== null);
    if (!done) return;
    const id = window.requestAnimationFrame(() => {
      setDoneTasks((d) => ({ ...d, [step.id]: true }));
      setBurst((b) => b + 1);
    });
    return () => window.cancelAnimationFrame(id);
  }, [active, step, currentView, paletteOpen, demoAnswer, doneTasks]);

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
  }, [hole, step.id, cardRef, demoAnswer]);

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
        step.demo ? "w-[min(540px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto" : big ? "w-[min(460px,calc(100vw-24px))]" : "w-[min(370px,calc(100vw-24px))]",
      )}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      {/* Festive glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 100% 0%, rgba(251,146,60,.18), transparent 60%), radial-gradient(90% 60% at 0% 100%, rgba(236,72,153,.12), transparent 60%)" }}
      />
      {big && (
        <div aria-hidden className="pointer-events-none absolute top-2 inset-x-0 flex justify-around text-[15px] opacity-90">
          {["🪔", "✨", "🪔", "✨", "🪔"].map((c, i) => (
            <span key={i} className="iris-tour-float" style={{ animationDelay: `${i * 0.25}s` }}>{c}</span>
          ))}
        </div>
      )}

      <div className={cn("relative", big ? "p-6 pt-10" : "p-5")}>
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

        {step.demo && <DemoIntake answer={demoAnswer} onAnswer={onDemoAnswer} />}

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
      @keyframes iris-tour-in { from { opacity: 0; translate: 0 10px; scale: .97 } to { opacity: 1; translate: 0 0; scale: 1 } }
      @keyframes iris-tour-pop { 0% { scale: .6; rotate: -12deg } 60% { scale: 1.12; rotate: 6deg } 100% { scale: 1; rotate: 0deg } }
      @keyframes iris-tour-float { 0%,100% { translate: 0 0 } 50% { translate: 0 -5px } }
      @keyframes iris-tour-twinkle { 0%,100% { opacity: 0; scale: .5 } 50% { opacity: .95; scale: 1 } }
      @keyframes iris-tour-flicker { 0%,100% { filter: drop-shadow(0 0 2px #f59e0b) } 50% { filter: drop-shadow(0 0 6px #fb923c) } }
      @keyframes iris-tour-ring { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
      @keyframes iris-tour-point { 0%,100% { translate: 0 0 } 50% { translate: -4px -4px } }
      @keyframes iris-tour-burst { 0% { opacity: 1; transform: translate(-50%,-50%) scale(.4) } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1) rotate(25deg) } }
      @media (prefers-reduced-motion: no-preference) {
        .iris-tour-card { animation: iris-tour-in .35s cubic-bezier(.2,.8,.2,1) both }
        .iris-tour-pop { animation: iris-tour-pop .5s cubic-bezier(.2,.8,.2,1) both }
        .iris-tour-float { display: inline-block; animation: iris-tour-float 2.4s ease-in-out infinite }
        .iris-tour-twinkle { animation: iris-tour-twinkle 2.8s ease-in-out infinite }
        .iris-tour-flicker { display: inline-block; animation: iris-tour-flicker 1.4s ease-in-out infinite }
        .iris-tour-ring-pulse, .iris-tour-glow-pulse { animation: iris-tour-ring 1.3s ease-in-out infinite }
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
