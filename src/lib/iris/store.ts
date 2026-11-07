"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConversationState, createInitialState } from "./conversation-engine";

export type ViewName =
  | "overview"
  | "ai_assistant"
  | "all_tickets"
  | "my_tickets"
  | "department_queue"
  | "escalations"
  | "trainers"
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
  conversationState: ConversationState;
  setConversationState: (state: ConversationState | Partial<ConversationState>) => void;
  resetConversation: () => void;

  // Signed-in user (set by <AuthGate> from /api/auth/me)
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;

  // Bumped whenever live data changes so views re-read ALL_TICKETS etc.
  dataVersion: number;
  bumpData: () => void;
}

export interface CurrentUser {
  /** Employee id when linked, otherwise the user id. */
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: "admin" | "manager" | "executive";
  departmentCode?: string | null;
  avatar?: string;
}

export interface AIButton {
  label: string;
  value: string;
  icon?: string;
  captures?: string;
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
  category?: string;
  subcategory?: string;
  affectedClient?: string;
  businessImpact?: string;
  recommendedActions?: string;
  collectedFields?: Array<{ field: string; value: string }>;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  buttons?: AIButton[];
  inputType?: "text" | "select" | "multiselect" | "date" | "none" | "momence_member" | "momence_session" | "momence_trainer";
  inputPlaceholder?: string;
  isQuestion?: boolean;
  isAcknowledgment?: boolean;
  isTransition?: boolean;
  thinkingDuration?: number;
  ticketPreview?: AITicketPreview;
  agentActivity?: { agent: string; action: string; status: "pending" | "active" | "complete" }[];
  tools?: { name: string; status: "running" | "complete"; result?: string; duration?: number }[];
  attachments?: { name: string; type: string }[];
  metadata?: {
    investigationSteps?: string[];
    confidenceScore?: number;
    capturedFields?: Array<{ field: string; value: string }>;
  };
  variant?: "default" | "question" | "info" | "success" | "investigation" | "ticket";
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
      clearAIChat: () => set({ aiMessages: [], conversationState: createInitialState() }),
      conversationState: createInitialState(),
      setConversationState: (state) =>
        set((s) => ({
          conversationState:
            typeof state === "object" && state !== null
              ? { ...s.conversationState, ...(state as Partial<ConversationState>) }
              : s.conversationState,
        })),
      resetConversation: () => set({ aiMessages: [], conversationState: createInitialState() }),

      currentUser: { id: "", userId: "", email: "", name: "", role: "", tier: "executive" },
      setCurrentUser: (user) => set({ currentUser: user }),

      dataVersion: 0,
      bumpData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
    }),
    {
      name: "iris-app-state-v2",
      partialize: (state) => ({
        currentView: state.currentView,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
