"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  digestFrequency: "none" | "daily" | "weekly";

  // SLA preferences
  defaultPriorityView: "all" | "critical_only" | "my_tickets";
  slaWarningThreshold: number; // percentage
  autoEscalate: boolean;

  // Display preferences
  theme: "dark" | "light" | "system";
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showTagsInList: boolean;
  defaultTicketView: "list" | "grid" | "board";

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
  update: (key: keyof IRISUserSettings, value: any) => void;
  updateBatch: (settings: Partial<IRISUserSettings>) => void;
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
  digestFrequency: "daily",

  defaultPriorityView: "all",
  slaWarningThreshold: 75,
  autoEscalate: true,

  theme: "dark",
  sidebarCollapsed: false,
  compactMode: false,
  showTagsInList: true,
  defaultTicketView: "list",

  autoRouteTickets: true,
  preferSameStudioAssignee: true,
  maxWorkloadThreshold: 80,

  momenceAutoSearch: true,
  momenceDefaultStudio: "",

  autoCreateRecurrenceTickets: true,

  dailyTokenLimit: 50000,
  monthlyBudgetUSD: 500,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (key, value) => set({ [key]: value } as any),
      updateBatch: (settings) => set(settings),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "iris-user-settings",
    }
  )
);
