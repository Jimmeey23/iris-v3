"use client";

import * as React from "react";

/**
 * AccentRandomizer
 *
 * Picks a random accent color from a curated palette and applies it to the
 * document root via a `data-accent="<name>"` attribute. The actual color
 * tokens (--primary, --accent, --ring, etc.) are defined in globals.css
 * under the `:root[data-accent="..."]` selectors, so this component only
 * needs to set the attribute - the CSS does the rest.
 *
 * Runs ONCE on mount (client-side only, after hydration) so server-rendered
 * HTML always matches the first client render. The accent changes randomly
 * on every page load / hard refresh / route reload that re-mounts the app.
 *
 * Also exposes the current accent on `window` for any component that needs
 * to read the active accent (e.g. to pick a matching chart color).
 */

const ACCENTS = [
  "blue",
  "indigo",
  "purple",
  "pink",
  "red",
  "orange",
  "green",
  "mint",
  "teal",
  "cyan",
  "violet",
  "emerald",
  "rose",
  "amber",
] as const;

export type AccentName = (typeof ACCENTS)[number];

export function useAccentColor(): AccentName | null {
  const [accent, setAccent] = React.useState<AccentName | null>(null);

  React.useEffect(() => {
    // Only run on client. Pick a random accent that differs from the
    // currently-applied one (if any) so a refresh always feels fresh.
    const current = document.documentElement.getAttribute("data-accent") as AccentName | null;
    const pool = current ? ACCENTS.filter((a) => a !== current) : [...ACCENTS];
    const next = pool[Math.floor(Math.random() * pool.length)];
    document.documentElement.setAttribute("data-accent", next);
    setAccent(next);
    // Expose for any other component that wants to read it
    (window as unknown as { __irisAccent?: AccentName }).__irisAccent = next;
  }, []);

  return accent;
}

/**
 * Inline randomizer component - drop this anywhere in the tree (typically
 * near the root layout, inside the AppShell) to enable accent rotation.
 */
export function AccentRandomizer() {
  useAccentColor();
  return null;
}

/**
 * Read the currently-applied accent (or "blue" as fallback) - safe to call
 * from any client component after mount.
 */
export function getCurrentAccent(): AccentName {
  if (typeof document === "undefined") return "blue";
  return (document.documentElement.getAttribute("data-accent") as AccentName) || "blue";
}
