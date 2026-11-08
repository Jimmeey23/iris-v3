"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useSettingsStore, ACCENT_PALETTE } from "@/lib/iris/settings-store";

export type AccentName =
  | "blue" | "indigo" | "purple" | "pink" | "red" | "orange"
  | "green" | "mint" | "teal" | "cyan" | "violet" | "emerald"
  | "rose" | "amber";

const VALID_ACCENTS = new Set<string>(ACCENT_PALETTE.map((a) => a.id));

/**
 * Synchronizes user display preferences (`accentColor`, `compactMode`,
 * `animationsEnabled`, and `theme`) from `useSettingsStore` onto `<html>`
 * in real time whenever settings change.
 */
export function AccentRandomizer() {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const compactMode = useSettingsStore((s) => s.compactMode);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const preferredTheme = useSettingsStore((s) => s.theme);
  const serverHydrated = useSettingsStore((s) => s.serverHydrated);
  const { setTheme } = useTheme();

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (accentColor !== "random" && VALID_ACCENTS.has(accentColor)) {
      document.documentElement.setAttribute("data-accent", accentColor);
      try {
        localStorage.setItem("__irisAccentPinned", accentColor);
      } catch {}
    } else {
      try {
        localStorage.removeItem("__irisAccentPinned");
      } catch {}
    }
  }, [accentColor]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (compactMode) document.documentElement.setAttribute("data-compact", "true");
    else document.documentElement.removeAttribute("data-compact");
  }, [compactMode]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (!animationsEnabled) document.documentElement.setAttribute("data-reduce-motion", "true");
    else document.documentElement.removeAttribute("data-reduce-motion");
  }, [animationsEnabled]);

  React.useEffect(() => {
    if (!serverHydrated) return;
    setTheme(preferredTheme);
  }, [preferredTheme, serverHydrated, setTheme]);

  return null;
}

export function getCurrentAccent(): AccentName {
  if (typeof document === "undefined") return "blue";
  return (document.documentElement.getAttribute("data-accent") as AccentName) || "blue";
}
