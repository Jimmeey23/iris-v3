"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewName =
  | "overview"
  | "ai_assistant"
  | "all_tickets"
  | "my_tickets"
  | "department_queue"
  | "escalations"
  | "analytics"
  | "knowledge_base"
  | "templates"
  | "reports"
  | "momence"
  | "email_templates"
  | "settings";

interface AppState {
  // Navigation
  currentView: ViewName;
  selectedTicketId: string | null;
  setCurrentView: (view: ViewName) => void;
  selectTicket: (ticketId: string | null) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Filters
  ticketFilters: {
    search: string;
    priority: string[];
    status: string[];
    studio: string[];
    department: string[];
    slaStatus: string[];
  };
  setTicketFilter: (key: string, value: any) => void;
  resetTicketFilters: () => void;

  // AI Chat state
  aiMessages: AIMessage[];
  addAIMessage: (msg: AIMessage) => void;
  clearAIChat: () => void;

  // User (mock current user)
  currentUser: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
}

export interface AIButton {
  label: string;
  value: string;
  icon?: string;
}

export interface AITicketPreview {
  ticketId: string;
  title: string;
  description: string;
  priority: string;
  department: string;
  assigneeName: string;
  studio: string;
  estimatedResolution: string;
  slaResponse: string;
  slaResolution: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  // Rich content options
  buttons?: AIButton[];
  ticketPreview?: AITicketPreview;
  agentActivity?: { agent: string; action: string; status: "pending" | "active" | "complete" }[];
  tools?: { name: string; status: "running" | "complete"; result?: string }[];
  attachments?: { name: string; type: string }[];
  metadata?: { investigationSteps?: string[]; confidenceScore?: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: "overview",
      selectedTicketId: null,
      setCurrentView: (view) => set({ currentView: view, selectedTicketId: null }),
      selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      ticketFilters: {
        search: "",
        priority: [],
        status: [],
        studio: [],
        department: [],
        slaStatus: [],
      },
      setTicketFilter: (key, value) =>
        set((s) => ({
          ticketFilters: { ...s.ticketFilters, [key]: value },
        })),
      resetTicketFilters: () =>
        set({
          ticketFilters: {
            search: "",
            priority: [],
            status: [],
            studio: [],
            department: [],
            slaStatus: [],
          },
        }),

      aiMessages: [],
      addAIMessage: (msg) => set((s) => ({ aiMessages: [...s.aiMessages, msg] })),
      clearAIChat: () => set({ aiMessages: [] }),

      currentUser: {
        id: "emp_001",
        name: "Aarav Mehta",
        role: "Front Desk Lead",
      },
    }),
    {
      name: "iris-app-state",
      partialize: (state) => ({
        currentView: state.currentView,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
