"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewName } from "./store";

export type AccentPreference =
  | "random"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "green"
  | "mint"
  | "teal"
  | "cyan"
  | "violet"
  | "emerald"
  | "rose"
  | "amber";

export const ACCENT_PALETTE: Array<{ id: Exclude<AccentPreference, "random">; label: string; hex: string }> = [
  { id: "indigo", label: "Indigo", hex: "#5b5bd6" },
  { id: "violet", label: "Violet", hex: "#7c3aed" },
  { id: "purple", label: "Purple", hex: "#9333ea" },
  { id: "blue", label: "Blue", hex: "#2563eb" },
  { id: "cyan", label: "Cyan", hex: "#0891b2" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
  { id: "mint", label: "Mint", hex: "#10b981" },
  { id: "emerald", label: "Emerald", hex: "#059669" },
  { id: "green", label: "Green", hex: "#16a34a" },
  { id: "amber", label: "Amber", hex: "#d97706" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
  { id: "red", label: "Red", hex: "#dc2626" },
  { id: "rose", label: "Rose", hex: "#e11d48" },
  { id: "pink", label: "Pink", hex: "#db2777" },
];

export interface IRISUserSettings {
  // AI Assistant preferences
  aiModel: "gpt-4o" | "gpt-4o-mini" | "claude-sonnet" | "auto";
  conversationStyle: "concise" | "detailed" | "friendly";
  autoInvestigate: boolean;
  showAgentActivity: boolean;
  showConfidenceScores: boolean;
  preferredInputMethod: "chat" | "form";

  // Notification preferences
  notifyOnAssignment: boolean;
  notifyOnEscalation: boolean;
  notifyOnSLAWarning: boolean;
  notifyOnResolution: boolean;
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  soundAlerts: boolean;
  digestFrequency: "none" | "daily" | "weekly";

  // SLA preferences
  defaultPriorityView: "all" | "critical_only" | "my_tickets";
  slaWarningThreshold: number;
  autoEscalate: boolean;

  // Display & Appearance preferences
  theme: "dark" | "light" | "system";
  accentColor: AccentPreference;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  showTagsInList: boolean;
  defaultTicketView: "list" | "grid" | "board";
  defaultLandingView: ViewName;
  preferredStudioCode: string;

  // Routing preferences
  autoRouteTickets: boolean;
  preferSameStudioAssignee: boolean;
  maxWorkloadThreshold: number;

  // Momence integration
  momenceAutoSearch: boolean;
  momenceDefaultStudio: string;

  // Recurrence
  autoCreateRecurrenceTickets: boolean;

  // API usage
  dailyTokenLimit: number;
  monthlyBudgetUSD: number;
}

interface SettingsStore extends IRISUserSettings {
  serverHydrated: boolean;
  update: <K extends keyof IRISUserSettings>(key: K, value: IRISUserSettings[K]) => void;
  updateBatch: (settings: Partial<IRISUserSettings>) => void;
  hydrateFromServer: (row?: Record<string, unknown> | null) => void;
  saveToServer: (patch: Partial<IRISUserSettings>) => Promise<void>;
  reset: () => void;
}

const DEFAULT_SETTINGS: IRISUserSettings = {
  aiModel: "auto",
  conversationStyle: "concise",
  autoInvestigate: true,
  showAgentActivity: true,
  showConfidenceScores: true,
  preferredInputMethod: "chat",

  notifyOnAssignment: true,
  notifyOnEscalation: true,
  notifyOnSLAWarning: true,
  notifyOnResolution: false,
  notificationChannels: {
    inApp: true,
    email: true,
    whatsapp: false,
  },
  soundAlerts: true,
  digestFrequency: "daily",

  defaultPriorityView: "all",
  slaWarningThreshold: 75,
  autoEscalate: true,

  theme: "dark",
  accentColor: "random",
  sidebarCollapsed: false,
  compactMode: false,
  animationsEnabled: true,
  showTagsInList: true,
  defaultTicketView: "list",
  defaultLandingView: "overview",
  preferredStudioCode: "",

  autoRouteTickets: true,
  preferSameStudioAssignee: true,
  maxWorkloadThreshold: 80,

  momenceAutoSearch: true,
  momenceDefaultStudio: "",

  autoCreateRecurrenceTickets: true,

  dailyTokenLimit: 50000,
  monthlyBudgetUSD: 500,
};

const VALID_ACCENTS = new Set<string>(ACCENT_PALETTE.map((a) => a.id));

function syncAccentStorage(accent: AccentPreference) {
  if (typeof window === "undefined") return;
  try {
    if (accent === "random" || !VALID_ACCENTS.has(accent)) {
      localStorage.removeItem("__irisAccentPinned");
    } else {
      localStorage.setItem("__irisAccentPinned", accent);
      document.documentElement.setAttribute("data-accent", accent);
    }
  } catch {
    /* private browsing safe */
  }
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      serverHydrated: false,

      update: (key, value) => {
        set({ [key]: value } as Partial<SettingsStore>);
        if (key === "accentColor") syncAccentStorage(value as AccentPreference);
      },

      updateBatch: (settings) => {
        set(settings);
        if (settings.accentColor !== undefined) syncAccentStorage(settings.accentColor);
      },

      hydrateFromServer: (row) => {
        if (!row || typeof row !== "object") {
          set({ serverHydrated: true });
          return;
        }
        const extra =
          row.preferences && typeof row.preferences === "object"
            ? (row.preferences as Record<string, unknown>)
            : {};
        const patch: Partial<IRISUserSettings> = {};
        if (row.theme === "dark" || row.theme === "light" || row.theme === "system") {
          patch.theme = row.theme;
        }
        if (row.accent_color === null || row.accent_color === "random") {
          patch.accentColor = "random";
        } else if (typeof row.accent_color === "string" && VALID_ACCENTS.has(row.accent_color)) {
          patch.accentColor = row.accent_color as AccentPreference;
        }
        const compactVal = extra.compact_mode ?? row.compact_mode;
        if (typeof compactVal === "boolean") patch.compactMode = compactVal;
        const animVal = extra.animations ?? row.animations;
        if (typeof animVal === "boolean") patch.animationsEnabled = animVal;
        if (typeof row.default_view === "string" && row.default_view) {
          patch.defaultLandingView = row.default_view as ViewName;
        }
        const soundVal = extra.sound_alerts ?? row.sound_alerts;
        if (typeof soundVal === "boolean") patch.soundAlerts = soundVal;
        const digestVal = extra.digest_frequency ?? row.digest_frequency;
        if (digestVal === "none" || digestVal === "daily" || digestVal === "weekly") {
          patch.digestFrequency = digestVal;
        }
        const studioVal = extra.preferred_studio_code ?? row.preferred_studio_code;
        if (typeof studioVal === "string") {
          patch.preferredStudioCode = studioVal;
          patch.momenceDefaultStudio = studioVal;
        }
        const curChannels = get().notificationChannels;
        patch.notificationChannels = {
          inApp: typeof row.push_notifications === "boolean" ? row.push_notifications : curChannels.inApp,
          email: typeof row.email_notifications === "boolean" ? row.email_notifications : curChannels.email,
          whatsapp: typeof row.whatsapp_notifications === "boolean" ? row.whatsapp_notifications : curChannels.whatsapp,
        };
        set({ ...patch, serverHydrated: true });
        if (patch.accentColor !== undefined) syncAccentStorage(patch.accentColor);
      },

      saveToServer: async (patch) => {
        get().updateBatch(patch);
        const next = { ...get(), ...patch };
        const dbPayload: Record<string, unknown> = {
          theme: next.theme,
          accent_color: next.accentColor === "random" ? null : next.accentColor,
          default_view: next.defaultLandingView,
          email_notifications: next.notificationChannels.email,
          push_notifications: next.notificationChannels.inApp,
          whatsapp_notifications: next.notificationChannels.whatsapp,
          preferences: {
            compact_mode: next.compactMode,
            animations: next.animationsEnabled,
            sound_alerts: next.soundAlerts,
            digest_frequency: next.digestFrequency,
            preferred_studio_code: next.preferredStudioCode || "",
          },
        };
        const res = await fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dbPayload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save user preferences");
        }
      },

      reset: () => {
        set(DEFAULT_SETTINGS);
        syncAccentStorage("random");
      },
    }),
    {
      name: "iris-user-settings",
      partialize: (state) => {
        const { serverHydrated: _sh, update: _u, updateBatch: _ub, hydrateFromServer: _h, saveToServer: _s, reset: _r, ...rest } = state;
        return rest;
      },
    },
  ),
);
