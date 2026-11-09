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
  | "equipment"
  | "radar"
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
  /** Open a ticket from any screen: lands on All Tickets with it selected. */
  openTicket: (ticketId: string) => void;

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
  /** Raw Claude transcript for the current chat (sent back to /api/ai/chat each turn). */
  aiTranscript: unknown[];
  setAiTranscript: (t: unknown[]) => void;
  addAIMessage: (msg: AIMessage) => void;
  updateAIMessage: (id: string, patch: Partial<AIMessage>) => void;
  clearAIChat: () => void;
  conversationState: ConversationState;
  setConversationState: (state: ConversationState | Partial<ConversationState>) => void;
  resetConversation: () => void;

  // Signed-in user (set by <AuthGate> from /api/auth/me)
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;

  // Live workspace settings hydrated from /api/reference and updated immediately from Settings
  workspaceName: string;
  workspaceSettings: Record<string, unknown>;
  setWorkspaceSettings: (patch: Record<string, unknown>) => void;

  // Bumped whenever live data changes so views re-read ALL_TICKETS etc.
  dataVersion: number;
  bumpData: () => void;

  // Templates page drill-down: Category → Sub-category → Template (preset ticket builder)
  templateNav: TemplateNav;
  setTemplateNav: (nav: TemplateNav) => void;
  /** Jump straight to a template's ticket builder (e.g. from search or a KB article). */
  openTemplate: (code: string) => void;

  // Knowledge Base drill-down: Category → Sub-category → Guide (an open guide implies its own place)
  kbNav: KnowledgeNav;
  setKbNav: (nav: KnowledgeNav) => void;
  // Knowledge base article to show when the Knowledge Base view is open
  kbArticleId: string | null;
  setKbArticleId: (id: string | null) => void;
  /** Navigate to the Knowledge Base with an article open. */
  openKnowledgeArticle: (id: string) => void;
}

export interface KnowledgeNav {
  category: string | null;
  subcategory: string | null;
}

export interface TemplateNav {
  category: string | null;
  subcategory: string | null;
  templateCode: string | null;
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
  studioCodes?: string[];
  permissions?: string[];
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

export interface AgentTicketDraft {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: "P0" | "P1" | "P2" | "P3";
  studioCode?: string;
  departmentCode?: string;
  assigneeId?: string;
  affectedClient?: string;
  clientMomenceId?: string;
  membershipId?: string;
  bookingId?: string;
  severity?: string;
  businessImpact?: string;
  recommendedResolution?: string;
  tags?: string[];
  /** Secondary departments that also need to act. */
  departmentCodes?: string[];
  /** Presentation-only details for the review card (owner, SLA, steps, member profile...). */
  extras?: import("./intake-details").DraftExtras;
}

export type IntakeTaxonomy = Array<{
  category: string;
  department: string | null;
  subcategories: Array<{ name: string; department: string | null; priority: "P0" | "P1" | "P2" | "P3"; n: number }>;
}>;

/** State of a structured intake (deterministic form filled from the user's message). */
export interface IntakeRouting {
  departmentCode: string | null;
  departmentName: string | null;
  owner: { id: string; name: string; source: "policy" | "ai" | "workload" | "head" } | null;
  sla: { priority: "P0" | "P1" | "P2" | "P3"; responseMins: number; resolutionMins: number; slaResponseTarget: string; slaResolutionTarget: string } | null;
  routedByRule: string | null;
  ownershipRule: string | null;
}

export interface IntakeState {
  text: string;
  category: string | null;
  subcategory: string | null;
  department: string | null;
  priority: "P0" | "P1" | "P2" | "P3";
  prioritySuggested: boolean;
  studioCode: string | null;
  when: string | null;
  classFormat: string | null;
  /** Room/area on the studio plan, e.g. "PowerCycle Studio". */
  area?: string | null;
  title: string | null;
  member: { id: string; name: string } | null;
  session: { id: string; name: string; subtitle?: string } | null;
  trainer: { id: string; name: string } | null;
  clientNameHint: string | null;
  trainerNameHint: string | null;
  suggestions: Array<{ category: string; subcategory: string | null }>;
  taxonomy: IntakeTaxonomy;
  detectedBy: "rules" | "ai";
  /** Server routing preview for the picked category: owner and SLA. Cleared when the category changes. */
  routing?: IntakeRouting | null;
  done: boolean;
  /** Answers to the per-type questions (client's words, mood, impact...). */
  details?: Record<string, string>;
  /** Momence profile, memberships and visits of the picked member. */
  memberSnapshot?: import("./intake-details").MemberSnapshot | null;
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
  variant?: "default" | "question" | "info" | "success" | "investigation" | "ticket" | "draft" | "error" | "intake";
  /** Ticket proposed by the AI agent, awaiting the user's confirmation. */
  ticketDraft?: AgentTicketDraft;
  /** Set when the user discarded the draft. */
  discarded?: boolean;
  /** Set once the draft has been created. */
  createdTicket?: { id: string; ticketId: string };
  /** Structured intake form shown in this message. */
  intake?: IntakeState;
  /** Who produced this reply: Claude ("ai") or a deterministic rule ("rules"). */
  source?: "ai" | "rules";
  /** Name of the rule that answered (when source is "rules"). */
  rule?: string;
  /** The question a data answer replied to, so "Ask AI instead" can re-send it to the agent. */
  askAi?: string;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: "overview",
      selectedTicketId: null,
      // Navigating to a view always lands on its root: no open ticket, article or template step.
      // (openTemplate / openKnowledgeArticle deep-link instead.)
      setCurrentView: (view) =>
        set({
          currentView: view,
          selectedTicketId: null,
          kbArticleId: null,
          kbNav: { category: null, subcategory: null },
          templateNav: { category: null, subcategory: null, templateCode: null },
        }),
      selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),
      openTicket: (ticketId) =>
        set({
          currentView: "all_tickets",
          selectedTicketId: ticketId,
          kbArticleId: null,
          kbNav: { category: null, subcategory: null },
          templateNav: { category: null, subcategory: null, templateCode: null },
        }),

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
      updateAIMessage: (id, patch) => set((s) => ({ aiMessages: s.aiMessages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearAIChat: () => set({ aiMessages: [], aiTranscript: [], conversationState: createInitialState() }),
      aiTranscript: [],
      setAiTranscript: (t) => set({ aiTranscript: t }),
      conversationState: createInitialState(),
      setConversationState: (state) =>
        set((s) => ({
          conversationState:
            typeof state === "object" && state !== null
              ? { ...s.conversationState, ...(state as Partial<ConversationState>) }
              : s.conversationState,
        })),
      resetConversation: () => set({ aiMessages: [], aiTranscript: [], conversationState: createInitialState() }),

      currentUser: { id: "", userId: "", email: "", name: "", role: "", tier: "executive" },
      setCurrentUser: (user) => set({ currentUser: user }),

      workspaceName: "Physique 57 India",
      workspaceSettings: {},
      setWorkspaceSettings: (patch) =>
        set((s) => {
          const next = { ...s.workspaceSettings, ...patch };
          const orgName =
            typeof next["org.name"] === "string" && next["org.name"].trim()
              ? next["org.name"].trim()
              : s.workspaceName;
          return { workspaceSettings: next, workspaceName: orgName };
        }),

      dataVersion: 0,
      bumpData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),

      templateNav: { category: null, subcategory: null, templateCode: null },
      setTemplateNav: (nav) => set({ templateNav: nav }),
      openTemplate: (code) =>
        set({ currentView: "templates", selectedTicketId: null, templateNav: { category: null, subcategory: null, templateCode: code } }),

      kbNav: { category: null, subcategory: null },
      setKbNav: (nav) => set({ kbNav: nav }),
      kbArticleId: null,
      setKbArticleId: (id) => set({ kbArticleId: id }),
      openKnowledgeArticle: (id) =>
        set({ currentView: "knowledge_base", selectedTicketId: null, kbArticleId: id, kbNav: { category: null, subcategory: null } }),
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
