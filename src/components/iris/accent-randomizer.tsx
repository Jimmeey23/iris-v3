"use client";

import * as React from "react";

/**
 * AccentRandomizer (now a no-op)
 *
 * The accent color is set by a synchronous inline `<script>` in
 * `src/app/layout.tsx` that runs BEFORE React hydrates and BEFORE first
 * paint. This means:
 *   - The accent is applied instantly on every page load (no flash of blue)
 *   - The script picks a fresh random accent from 14 colors, excluding
 *     the previously-chosen one (stored in localStorage) so back-to-back
 *     loads ALWAYS change color.
 *
 * This component is kept as a no-op so existing imports (AppShell mounts
 * `<AccentRandomizer />`) don't break. It does nothing at runtime.
 */

export function AccentRandomizer() {
  return null;
}

/**
 * Read the currently-applied accent (or "blue" as fallback) - safe to call
 * from any client component after mount. The accent is set before React
 * renders, so this is reliable from the very first render.
 */
export type AccentName =
  | "blue" | "indigo" | "purple" | "pink" | "red" | "orange"
  | "green" | "mint" | "teal" | "cyan" | "violet" | "emerald"
  | "rose" | "amber";

export function getCurrentAccent(): AccentName {
  if (typeof document === "undefined") return "blue";
  return (document.documentElement.getAttribute("data-accent") as AccentName) || "blue";
}
