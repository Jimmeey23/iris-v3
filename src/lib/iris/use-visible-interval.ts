"use client";

import * as React from "react";

/**
 * setInterval that only runs while the tab is visible. A hidden tab makes no requests;
 * when it becomes visible again, `fn` runs once immediately if a tick was missed.
 * Saves serverless invocations and bandwidth for tabs left open in the background.
 */
export function useVisibleInterval(fn: () => void, ms: number, enabled = true) {
  const ref = React.useRef(fn);
  React.useEffect(() => {
    ref.current = fn;
  }, [fn]);

  React.useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    let missed = false;
    const start = () => {
      if (timer === null) timer = window.setInterval(() => ref.current(), ms);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (missed) ref.current();
        missed = false;
        start();
      } else {
        missed = true;
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    else missed = true;
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms, enabled]);
}

/* One shared clock for every relative timestamp on the page, instead of one timer each. */
const listeners = new Set<() => void>();
let clockTimer: number | null = null;
let clockNow = Date.now();
function ensureClock() {
  if (clockTimer !== null || typeof window === "undefined") return;
  clockTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    clockNow = Date.now();
    listeners.forEach((l) => l());
  }, 30_000);
}
export function useSharedClock(): number {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      ensureClock();
      return () => {
        listeners.delete(cb);
        if (!listeners.size && clockTimer !== null) {
          window.clearInterval(clockTimer);
          clockTimer = null;
        }
      };
    },
    () => clockNow,
    () => 0,
  );
}
