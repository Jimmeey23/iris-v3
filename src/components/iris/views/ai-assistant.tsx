"use client";

import * as React from "react";
import { TrainerAvatar } from "@/components/iris/trainer-photo";
import { useVisibleInterval } from "@/lib/iris/use-visible-interval";
import { useAppStore, AIMessage } from "@/lib/iris/store";
import {
  processUserInput,
  buildInvestigationResult,
  createInitialState,
  ConversationState,
} from "@/lib/iris/conversation-engine";
import { buildTicketDetail, TicketDetailData } from "@/lib/iris/ticket-detail-builder";
import { TicketPreviewModal } from "@/components/iris/ticket-preview-modal";
import { MomenceSearchField, MomenceEntity } from "@/components/iris/momence-search-field";
import { DynamicFormIntake } from "@/components/iris/dynamic-form-intake";
import { IrisLoader } from "@/components/iris/iris-loader";
import { cn } from "@/lib/utils";
import { STUDIOS, EMPLOYEES } from "@/lib/iris/types";
import { generateId, getInitials, getAvatarColor } from "@/lib/iris/utils";
import {
  Sparkles,
  Send,
  Paperclip,
  Mic,
  Brain,
  Cpu,
  Search,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Trash2,
  Ticket as TicketIcon,
  User,
  Building2,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Wand2,
  RefreshCw,
  Activity,
  Target,
  Clock,
  TrendingUp,
  MessageSquare,
  Plus,
  X,
  CornerDownLeft,
  Cog,
  Layers,
  Edit2,
  FileText,
  Download,
  Copy,
  ChevronDown,
  Printer,
  FileJson,
  FileSpreadsheet,
  Hash,
  Check,
  CreditCard,
  Calendar,
  Users,
  History as HistoryIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IrisAvatar } from "@/components/iris/iris-avatar";
import { Button } from "@/components/ui/button";
import { createTicketFromDetail, api, ticketsApi } from "@/lib/iris/live-data";
import type { AgentTicketDraft } from "@/lib/iris/store";
import { routeDeterministic } from "@/lib/iris/intent-router";
import type { IntakeState, IntakeTaxonomy } from "@/lib/iris/store";
import { IntakeCard, missingRequired } from "@/components/iris/intake-card";

type ClassifyResponse = {
  candidates: Array<{ category: string; subcategory: string | null; department: string | null; priority: "P0" | "P1" | "P2" | "P3" }>;
  confident: boolean;
  taxonomy: IntakeTaxonomy;
  fields?: { studioCode?: string; area?: string; when?: string; classFormat?: string; trainerName?: string; clientName?: string; title?: string; urgent?: "P0" | "P1" };
  question?: string | null;
  source: "rules" | "ai";
};

/** Questions and investigation requests go to the full agent; reports go to the intake form. */
/** Records which path answered a turn (for the "answered without AI" figure). Never blocks the chat. */
function logTurn(route: "rules" | "intake" | "ai", rule: string | null, escalated = false) {
  void api("/api/ai/answer", { method: "POST", json: { log: route, rule, escalated } }).catch(() => {});
}

function looksLikeQuestion(text: string) {
  const t = text.trim().toLowerCase();
  return (
    /^(why|how (many|often|come)|has |have |did |does |is there|are there|was there|what (happened|is the status|caused)|who (handled|resolved)|can you (check|investigate|find|look into|compare|summari)|investigate|analy[sz]e|compare|summari[sz]e|any (similar|previous|past))/.test(t) ||
    (/\?$/.test(t) && t.split(/\s+/).length > 3 && /\b(before|again|similar|history|pattern|trend|usually|recurring|last time)\b/.test(t))
  );
}
import { PRIORITY_CONFIG, DEPT_MAP, STUDIO_MAP, EMPLOYEE_MAP } from "@/lib/iris/types";
import { toast } from "sonner";
import { buildWelcome, detectLiveContext } from "@/lib/iris/chat-welcome";
import { detailsFromText, memberLines } from "@/lib/iris/intake-details";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportAndSave,
  copyChatToClipboard,
  copySingleMessage,
  EXPORT_FORMATS,
  ExportFormat,
  ExportMeta,
} from "@/lib/iris/chat-export";

const SUGGESTED_ISSUES = [
  { label: "AC is not working in Studio 2 at Kwality House", icon: "🔧" },
  { label: "A client's class credits are not reflecting correctly", icon: "💳" },
  { label: "Sound system has stopped working", icon: "🔊" },
  { label: "Payment deducted but not showing in system", icon: "💸" },
  { label: "Recurring booking is not getting cancelled", icon: "📅" },
  { label: "A client wants to change her membership", icon: "👤" },
];

const AGENTS = [
  { name: "Conversational Agent", icon: MessageSquare, color: "text-violet-500", desc: "GPT-4o · Primary" },
  { name: "Classification Agent", icon: Cpu, color: "text-sky-500", desc: "GPT-4o-mini" },
  { name: "Investigation Agent", icon: Search, color: "text-amber-500", desc: "Claude Sonnet" },
  { name: "Routing Agent", icon: Zap, color: "text-emerald-500", desc: "Rule-based" },
  { name: "SLA Agent", icon: ShieldCheck, color: "text-rose-500", desc: "Deterministic" },
  { name: "Quality Agent", icon: CheckCircle2, color: "text-indigo-500", desc: "GPT-4o-mini" },
];

export function AIAssistantView() {
  const {
    aiMessages,
    addAIMessage,
    clearAIChat,
    conversationState,
    setConversationState,
    currentUser,
    setCurrentView,
  } = useAppStore();

  const [input, setInput] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [hasInitialized, setHasInitialized] = React.useState(false);
  const [showFormIntake, setShowFormIntake] = React.useState(false);
  const isProcessingRef = React.useRef(false); // Synchronous guard - prevents race conditions
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Initialize with welcome message ONCE on mount only
  // Using a ref guard + empty dep array ensures it never duplicates
  React.useEffect(() => {
    // Only add welcome if truly empty (fresh mount or after clear)
    if (aiMessages.length === 0 && !hasInitialized) {
      const welcome = buildWelcome(currentUser);
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: welcome.content,
        timestamp: new Date().toISOString(),
        variant: "default",
        buttons: welcome.buttons,
      });
      setHasInitialized(true);
    }
  }, []); // Empty deps = run ONCE on mount

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [aiMessages, isProcessing]);

  // Focus input when a text question is asked
  React.useEffect(() => {
    const lastMsg = aiMessages[aiMessages.length - 1];
    if (lastMsg?.isQuestion && (!lastMsg.buttons || lastMsg.buttons.length === 0) && !isProcessing) {
      inputRef.current?.focus();
    }
  }, [aiMessages, isProcessing]);

  /** Questions IRIS can answer from its own data, without spending AI tokens. */
  const answerFromData = async (message: string): Promise<boolean> => {
    const r = await api<{ answered: boolean; content?: string; rule?: string }>("/api/ai/answer", {
      method: "POST",
      json: { message },
    }).catch(() => ({ answered: false }) as { answered: boolean; content?: string; rule?: string });
    if (!r.answered || !r.content) return false;
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: r.content,
      timestamp: new Date().toISOString(),
      variant: "default",
      source: "rules",
      rule: r.rule,
      askAi: message,
    });
    const { aiTranscript, setAiTranscript } = useAppStore.getState();
    setAiTranscript([
      ...aiTranscript,
      { role: "user", content: message },
      { role: "assistant", content: [{ type: "text", text: `[Answered from IRIS data] ${r.content}` }] },
    ]);
    return true;
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    // Use BOTH the ref (synchronous, prevents race) AND state (for UI feedback)
    if (!trimmed || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setInput("");
    setIsProcessing(true);

    // Add user message immediately
    addAIMessage({
      id: generateId("msg"),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    });

    // Deterministic first: predictable requests are answered instantly with no AI tokens.
    const pendingMsg = [...useAppStore.getState().aiMessages].reverse().find((m) => m.ticketDraft);
    const pendingDraft = pendingMsg && !pendingMsg.createdTicket && !pendingMsg.discarded ? pendingMsg : undefined;
    const ruled = await routeDeterministic(trimmed, {
      user: currentUser,
      pendingDraft: pendingDraft?.ticketDraft ?? null,
      fetchJson: (url) => api(url),
    }).catch(() => null);
    if (ruled) {
      if (ruled.action === "create_draft" && pendingDraft?.ticketDraft) {
        const t = await createAgentDraft(pendingDraft.id, pendingDraft.ticketDraft);
        ruled.content = t ? `Created **${t.ticketId}**. You'll find it under All Tickets.` : "I couldn't create the ticket - see the error above and try again.";
      }
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: ruled.content,
        timestamp: new Date().toISOString(),
        variant: "default",
        source: "rules",
        rule: ruled.rule,
      });
      // Keep Claude aware of what happened, without spending a call now.
      const { aiTranscript, setAiTranscript } = useAppStore.getState();
      setAiTranscript([
        ...aiTranscript,
        { role: "user", content: trimmed },
        { role: "assistant", content: [{ type: "text", text: `[Answered automatically] ${ruled.content}` }] },
      ]);
      logTurn("rules", ruled.rule);
      setIsProcessing(false);
      isProcessingRef.current = false;
      return;
    }

    try {
      // A form is open and the user typed more details → fold them in (no AI).
      const openIntake = [...useAppStore.getState().aiMessages].reverse().find((m) => m.intake && !m.intake.done);
      if (openIntake?.intake && !looksLikeQuestion(trimmed) && (await addDetailsToIntake(openIntake.id, openIntake.intake, trimmed))) {
        // folded into the open form
      } else if (await answerFromData(trimmed)) {
        // Answered from IRIS data (equipment, counts, history, trainers, knowledge) - no AI.
      } else if (looksLikeQuestion(trimmed)) {
        // Investigation / open question the data path couldn't answer → full agent.
        await runAgent(trimmed);
        logTurn("ai", null);
      } else {
        // New report → classify (rules + history; AI only if unsure) → structured form.
        await startIntake(trimmed);
        logTurn("intake", null);
      }
    } catch (e) {
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: e instanceof Error ? e.message : "Something went wrong. Try again.",
        timestamp: new Date().toISOString(),
        variant: "error",
      });
    }

    setIsProcessing(false);
    isProcessingRef.current = false;
  };

  /** Full Claude agent with tools (Momence, ticket history, workload). Costs tokens. */
  const runAgent = async (message: string) => {
    const { aiTranscript, setAiTranscript } = useAppStore.getState();
    const out = await api<{
      transcript: unknown[];
      reply: string;
      draft: AgentTicketDraft | null;
      trace: Array<{ name: string; summary: string; ok: boolean }>;
    }>("/api/ai/chat", { method: "POST", json: { history: aiTranscript, message } });
    setAiTranscript(out.transcript);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: out.reply || (out.draft ? "I've drafted a ticket - review it below." : "Done."),
      timestamp: new Date().toISOString(),
      variant: "default",
      source: "ai",
      tools: out.trace.length
        ? out.trace.map((t) => ({ name: t.summary, status: "complete" as const, result: t.ok ? undefined : "failed" }))
        : undefined,
    });
    if (out.draft) {
      addAIMessage({ id: generateId("msg"), role: "assistant", content: "", timestamp: new Date().toISOString(), variant: "draft", ticketDraft: out.draft, source: "ai" });
    }
  };

  /** "Ask AI instead" on a data answer: same question, full agent. */
  React.useEffect(() => {
    const onAsk = (e: Event) => {
      const question = (e as CustomEvent<string>).detail;
      if (!question || isProcessingRef.current) return;
      isProcessingRef.current = true;
      setIsProcessing(true);
      runAgent(question)
        .then(() => logTurn("ai", "Asked AI instead", true))
        .catch((err) =>
          addAIMessage({ id: generateId("msg"), role: "assistant", content: err instanceof Error ? err.message : "Something went wrong.", timestamp: new Date().toISOString(), variant: "error" }),
        )
        .finally(() => {
          setIsProcessing(false);
          isProcessingRef.current = false;
        });
    };
    window.addEventListener("iris:ask-ai", onAsk);
    return () => window.removeEventListener("iris:ask-ai", onAsk);
  });

  /** Classify a new report and open the structured intake form. */
  const startIntake = async (text: string) => {
    const r = await api<ClassifyResponse>("/api/intake/classify", { method: "POST", json: { text } });
    const top = r.confident ? r.candidates[0] : undefined;
    const f = r.fields ?? {};
    const intake: IntakeState = {
      text,
      category: top?.category ?? null,
      subcategory: top?.subcategory ?? null,
      department: top?.department ?? null,
      // History can over-rate a category (e.g. bikes); only explicit urgency signals justify P0.
      priority: f.urgent ?? (top?.priority === "P0" ? "P1" : top?.priority) ?? "P2",
      prioritySuggested: !f.urgent,
      studioCode: f.studioCode ?? null,
      area: f.area ?? null,
      when: f.when ?? null,
      classFormat: f.classFormat ?? null,
      title: f.title ?? null,
      member: null,
      session: null,
      trainer: null,
      clientNameHint: f.clientName ?? null,
      trainerNameHint: f.trainerName ?? null,
      suggestions: r.candidates.map((c) => ({ category: c.category, subcategory: c.subcategory })),
      taxonomy: r.taxonomy,
      detectedBy: r.source,
      done: false,
      details: detailsFromText(text),
      memberSnapshot: null,
    };
    const lead = top
      ? `Got it - this looks like **${top.subcategory ?? top.category}**${f.studioCode ? ` at ${STUDIO_MAP[f.studioCode]?.name ?? f.studioCode}` : ""}. ` +
        (missingRequired(intake).length
          ? `Before I draft the ticket I need a few details below: ${missingRequired(intake).join(", ")}.`
          : "Check the details and review the ticket.")
      : r.question
        ? r.question
        : "I couldn't tell what kind of issue this is. Pick the closest category below, or add a bit more detail.";
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: lead,
      timestamp: new Date().toISOString(),
      variant: "intake",
      intake,
      source: r.source,
      rule: r.source === "rules" ? "Classified from your message + similar tickets" : undefined,
    });
  };

  /** Extra details typed while a form is open: fill empty fields (no AI). */
  const addDetailsToIntake = async (messageId: string, state: IntakeState, text: string) => {
    // A clearly different issue starts a new report instead of being merged.
    const alone = await api<ClassifyResponse>("/api/intake/classify", { method: "POST", json: { text, allowAi: false } });
    const own = alone.confident ? alone.candidates[0] : undefined;
    if (own && state.category && own.category !== state.category && text.split(/\s+/).length >= 5) return false;
    const r = await api<ClassifyResponse>("/api/intake/classify", { method: "POST", json: { text: `${state.text}\n${text}`, allowAi: false } });
    const f = r.fields ?? {};
    const top = r.confident ? r.candidates[0] : undefined;
    const next: IntakeState = {
      ...state,
      text: `${state.text}\n${text}`,
      details: { ...detailsFromText(text), ...Object.fromEntries(Object.entries(state.details ?? {}).filter(([, v]) => v)) },
      studioCode: state.studioCode ?? f.studioCode ?? null,
      area: state.area ?? f.area ?? null,
      when: state.when ?? f.when ?? null,
      classFormat: state.classFormat ?? f.classFormat ?? null,
      trainerNameHint: state.trainerNameHint ?? f.trainerName ?? null,
      priority: f.urgent && state.prioritySuggested ? f.urgent : state.priority,
      ...(state.category || !top ? {} : { category: top.category, subcategory: top.subcategory, department: top.department }),
      suggestions: state.category ? state.suggestions : r.candidates.map((c) => ({ category: c.category, subcategory: c.subcategory })),
    };
    useAppStore.getState().updateAIMessage(messageId, { intake: next });
    const changed = [
      !state.category && next.category && `category → ${next.subcategory ?? next.category}`,
      !state.studioCode && next.studioCode && `studio → ${STUDIO_MAP[next.studioCode]?.name ?? next.studioCode}`,
      !state.when && next.when && `when → ${next.when}`,
      next.priority !== state.priority && `priority → ${next.priority}`,
    ].filter(Boolean);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: changed.length ? `Added to the report: ${changed.join(", ")}.` : "Added that to the description.",
      timestamp: new Date().toISOString(),
      variant: "default",
      source: "rules",
      rule: "Form update",
    });
    return true;
  };

  /** Form submitted → show the draft for confirmation (no AI). */
  const submitIntake = (draft: AgentTicketDraft) => {
    addAIMessage({ id: generateId("msg"), role: "assistant", content: "", timestamp: new Date().toISOString(), variant: "draft", ticketDraft: draft, source: "rules", rule: "Built from the form" });
  };

  /** User chose AI investigation for this report. */
  const askAiAbout = async (state: IntakeState) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    const details = [
      state.text,
      state.category && `Category: ${state.category}${state.subcategory ? ` › ${state.subcategory}` : ""}`,
      state.studioCode && `Studio: ${state.studioCode}`,
      state.member && `Member: ${state.member.name} (${state.member.id})`,
      state.session && `Class: ${state.session.name} ${state.session.subtitle ?? ""} (${state.session.id})`,
      state.trainer && `Trainer: ${state.trainer.name}`,
      state.when && `When: ${state.when}`,
      `Priority so far: ${state.priority}`,
    ].filter(Boolean).join("\n");
    try {
      await runAgent(`Please investigate this report and draft the ticket:\n${details}`);
    } catch (e) {
      addAIMessage({ id: generateId("msg"), role: "assistant", content: e instanceof Error ? e.message : "Something went wrong.", timestamp: new Date().toISOString(), variant: "error" });
    }
    setIsProcessing(false);
    isProcessingRef.current = false;
  };

  const handleButtonClick = (value: string, label: string) => {
    handleSend(label);
  };

  const handleExportChat = (format: ExportFormat) => {
    const meta: ExportMeta = {
      user: currentUser.name,
      exportedAt: new Date().toISOString(),
      messageCount: aiMessages.length,
    };
    exportAndSave(aiMessages, meta, format);
  };

  const [copyStatus, setCopyStatus] = React.useState<"idle" | "ok" | "err">("idle");
  const handleCopyChat = async (format: ExportFormat) => {
    const meta: ExportMeta = {
      user: currentUser.name,
      exportedAt: new Date().toISOString(),
      messageCount: aiMessages.length,
    };
    const ok = await copyChatToClipboard(aiMessages, meta, format);
    setCopyStatus(ok ? "ok" : "err");
    setTimeout(() => setCopyStatus("idle"), 1800);
  };

  // Per-message copy handler - bubbles the copy state up so the button can
  // show a transient "Copied!" check mark.
  const handleMessageCopy = async (
    msg: AIMessage,
    format: ExportFormat,
    setMsgState: (s: "idle" | "ok" | "err") => void,
  ) => {
    const ok = await copySingleMessage(msg, format);
    setMsgState(ok ? "ok" : "err");
    setTimeout(() => setMsgState("idle"), 1800);
  };

  const handleReset = () => {
    // Clear everything in one go - no setTimeout, no manual welcome message
    // The useEffect on mount won't re-run, so we add the welcome directly here
    isProcessingRef.current = false;
    clearAIChat();
    setConversationState(createInitialState());
    // Add fresh welcome message directly (not via useEffect or setTimeout)
    const welcome = buildWelcome(currentUser);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: welcome.content,
      timestamp: new Date().toISOString(),
      variant: "default",
      buttons: welcome.buttons,
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="h-12 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-background">
          <div className="relative">
            <IrisAvatar size={34} className="shadow-[0_4px_14px_-4px_var(--primary)]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold flex items-center gap-2">
              IRIS Assistant
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <span className="iris-live-dot" />
                Online
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Claude · live Momence & ticket data
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setShowFormIntake(true)}>
            <FileText className="w-3 h-3 mr-1" />
            Form Mode
          </Button>

          {/* Copy chat - dropdown with multiple formats */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={aiMessages.length === 0}>
                {copyStatus === "ok" ? (
                  <><Check className="w-3 h-3 mr-1 text-emerald-500" /> Copied</>
                ) : copyStatus === "err" ? (
                  <><AlertTriangle className="w-3 h-3 mr-1 text-amber-500" /> Failed</>
                ) : (
                  <><Copy className="w-3 h-3 mr-1" /> Copy <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-60" /></>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Copy chat to clipboard
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EXPORT_FORMATS.filter((f) => f.value !== "html").map((f) => (
                <DropdownMenuItem
                  key={f.value}
                  onClick={() => handleCopyChat(f.value)}
                  className="text-[12px] flex items-start gap-2 py-2"
                >
                  {f.value === "txt" && <Hash className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "md" && <FileText className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "json" && <FileJson className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "csv" && <FileSpreadsheet className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{f.label}</div>
                    <div className="text-[10px] text-muted-foreground">{f.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export chat - dropdown with multiple formats (download / print) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={aiMessages.length === 0}>
                <Download className="w-3 h-3 mr-1" /> Export <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Export chat as file
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EXPORT_FORMATS.map((f) => (
                <DropdownMenuItem
                  key={f.value}
                  onClick={() => handleExportChat(f.value)}
                  className="text-[12px] flex items-start gap-2 py-2"
                >
                  {f.value === "txt" && <Hash className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "md" && <FileText className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "json" && <FileJson className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "html" && <Printer className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  {f.value === "csv" && <FileSpreadsheet className="w-3 h-3 mt-0.5 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{f.label}</div>
                    <div className="text-[10px] text-muted-foreground">{f.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/5"
            onClick={() => { if (aiMessages.length <= 1 || window.confirm("Clear this chat? Drafts that weren't approved will be lost.")) handleReset(); }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear chat
          </Button>
        </div>

        {/* Context Bar - highlights fields as they're identified */}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 py-5 space-y-3">
            {aiMessages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onButtonClick={handleButtonClick}
                onCopyMessage={handleMessageCopy}
                isLast={idx === aiMessages.length - 1}
                onIntakeSubmit={submitIntake}
                onIntakeAskAi={askAiAbout}
              />
            ))}
            {isProcessing && <ThinkingIndicator />}
            <div className="h-4" />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background p-4 shrink-0">
          <div className="max-w-5xl mx-auto">
            {/* Momence hint - shown when the latest question expects a Momence
                search. Encourages the user to use the search field above
                instead of typing free-text into the regular input. */}
            {(() => {
              const lastQuestion = [...aiMessages].reverse().find(
                (m) => m.role === "assistant" && m.isQuestion,
              );
              const momenceType =
                lastQuestion?.inputType === "momence_member" ? "member" :
                lastQuestion?.inputType === "momence_session" ? "session" :
                lastQuestion?.inputType === "momence_trainer" ? "trainer" : null;
              if (!momenceType) return null;
              return (
                <div className="mb-2 px-2 py-1.5 rounded-md bg-violet-500/5 border border-violet-500/20 text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                  <Lightbulb className="w-3 h-3 shrink-0" />
                  Tip: use the {momenceType} search field above to pick a verified {momenceType} from Momence.
                  Typing here won't verify against Momence records.
                </div>
              );
            })()}
            <ContextBar state={conversationState} draft={input} intake={[...aiMessages].reverse().find((m) => m.intake && !m.intake.done)?.intake} />
            <div className="flex items-end gap-1.5 p-1.5 bg-card border border-border rounded-xl focus-within:border-primary/40 transition-colors">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                placeholder={
                  conversationState.stage === "collecting"
                    ? "Type your answer..."
                    : conversationState.stage === "ready"
                    ? "Ask a follow-up..."
                    : "Describe the issue..."
                }
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-[13px] py-1.5 px-1 max-h-32 placeholder:text-muted-foreground"
                style={{ minHeight: "32px" }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                <Mic className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isProcessing}
              >
                {isProcessing ? <IrisLoader size="sm" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                Protected · Audited
              </div>
              <div className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <CornerDownLeft className="w-2.5 h-2.5" />
                Enter to send
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversation Intelligence */}
      <div className="w-72 border-l border-border hidden lg:flex flex-col bg-sidebar">
        <ConversationIntelligencePanel state={conversationState} onSend={handleSend} />
        <AIUsageFooter refreshKey={aiMessages.length} />
      </div>

      {/* Dynamic Form Intake Modal */}
      {showFormIntake && (
        <DynamicFormIntake onClose={() => setShowFormIntake(false)} />
      )}
    </div>
  );
}

// === CONTEXT BAR - highlights identified fields during conversation ===

const CONTEXT_SLOTS: Array<{ key: string; label: string; tone: string; core?: boolean }> = [
  { key: "category", label: "Category", tone: "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300", core: true },
  { key: "subcategory", label: "Sub-category", tone: "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300", core: true },
  { key: "department", label: "Department", tone: "border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", core: true },
  { key: "studio", label: "Studio", tone: "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300", core: true },
  { key: "location", label: "Location", tone: "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300", core: true },
  { key: "date", label: "Date", tone: "border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", core: true },
  { key: "time", label: "Time", tone: "border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", core: true },
  { key: "affectedClient", label: "Member", tone: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300", core: true },
  { key: "contact", label: "Contact", tone: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { key: "membership", label: "Membership", tone: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300", core: true },
  { key: "amount", label: "Amount", tone: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" },
  { key: "trainer", label: "Trainer", tone: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", core: true },
  { key: "class", label: "Class", tone: "border-lime-500/50 bg-lime-500/10 text-lime-700 dark:text-lime-300", core: true },
  { key: "equipment", label: "Equipment", tone: "border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  { key: "priority", label: "Priority", tone: "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300", core: true },
  { key: "injury", label: "Injury", tone: "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  { key: "mood", label: "Mood", tone: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300", core: true },
  { key: "clientAsk", label: "Client ask", tone: "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  { key: "impact", label: "Impact", tone: "border-pink-500/50 bg-pink-500/10 text-pink-700 dark:text-pink-300" },
  { key: "actionsTaken", label: "Action taken", tone: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { key: "recurrence", label: "Pattern", tone: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
];

/** Sits above the input. Slots light up in their own colour as fields are recognised, live while typing. */
function ContextBar({ state, draft, intake }: { state: ConversationState; draft: string; intake?: IntakeState }) {
  const info = state.collectedInfo;
  const str = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : String(v));
  const known: Record<string, string | undefined> = intake
    ? {
        category: str(intake.category),
        subcategory: str(intake.subcategory),
        department: intake.department ? DEPT_MAP[intake.department]?.name ?? intake.department : undefined,
        studio: intake.studioCode ? STUDIO_MAP[intake.studioCode]?.name.split(",")[0] : undefined,
        date: str(intake.when),
        affectedClient: intake.member?.name ?? str(intake.clientNameHint),
        membership: intake.memberSnapshot?.memberships[0]?.name ?? (intake.memberSnapshot ? "None active" : undefined),
        trainer: intake.trainer?.name ?? str(intake.trainerNameHint),
        class: intake.session?.name ?? str(intake.classFormat),
        priority: intake.priority,
        mood: str(intake.details?.sentiment),
        location: str(intake.area),
        equipment: str(intake.details?.item),
        amount: str(intake.details?.itemValue),
        injury: str(intake.details?.injury),
        clientAsk: str(intake.details?.clientAsk),
        impact: str(intake.details?.impact),
        actionsTaken: str(intake.details?.actionsTaken),
      }
    : {
        category: str(info.category),
        subcategory: str(info.subcategory),
        studio: str(info.studio),
        priority: str(state.intent.suggestedPriority) ?? str(info.severity),
        affectedClient: str(info.affectedClient),
        department: str(state.intent.suggestedDepartment),
      };
  const live = React.useMemo(() => detectLiveContext(draft), [draft]);
  const liveMap = Object.fromEntries(live.map((f) => [f.key, f.value]));
  const slots = CONTEXT_SLOTS.map((s) => ({ ...s, value: liveMap[s.key] ?? known[s.key], isLive: Boolean(liveMap[s.key]) }));
  const found = slots.filter((s) => s.value).length;
  const confidence = Math.min(100, Math.max(state.intent.confidenceScore || 0, Math.round((found / 9) * 100)));
  const visible = slots.filter((s) => s.value || s.core);

  return (
    <div className="mb-2 flex items-center gap-1.5 flex-nowrap" aria-live="polite">
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5">Context</span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden iris-scrollbar pb-0.5 [scrollbar-width:thin]">
      {visible.map((s) => (
        <span
          key={s.key}
          className={cn(
            "shrink-0 whitespace-nowrap inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[10.5px] transition-all duration-300",
            s.value ? cn(s.tone, "font-medium") : "border-dashed border-border text-muted-foreground/60",
            s.isLive && "shadow-sm ring-2 ring-offset-0 ring-current/10",
          )}
        >
          {s.value && s.key === "trainer" ? <TrainerAvatar name={s.value} size={16} className="ring-0 -ml-1" /> : s.value ? <CheckCircle2 className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
          <span className={cn(s.value && "opacity-70")}>{s.label}</span>
          {s.value && <span className="truncate max-w-[140px] font-semibold" title={s.value}>{s.value}</span>}
        </span>
      ))}
      </div>
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <div className="w-14 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", confidence >= 75 ? "bg-emerald-500" : confidence >= 40 ? "bg-amber-500" : "bg-rose-500")}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">{confidence}%</span>
      </div>
    </div>
  );
}

function ConversationIntelligencePanel({ onSend }: { state?: ConversationState; onSend: (text: string) => void }) {
  const tools: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; detail: string }> = [
    { icon: Search, label: "Momence members", detail: "Mumbai + Bengaluru: contact, visits, tags" },
    { icon: CreditCard, label: "Memberships & bookings", detail: "Credits left, freezes, recent classes, check-ins" },
    { icon: Calendar, label: "Classes & trainers", detail: "Schedules, capacity, cancellations" },
    { icon: HistoryIcon, label: "Ticket history", detail: "Similar past issues and how they were resolved" },
    { icon: Users, label: "Staff workload", detail: "Who's available in the right department" },
    { icon: TicketIcon, label: "Ticket draft", detail: "Proposed for your review; nothing is saved until you click Create" },
  ];
  return (
    <div className="flex-1 overflow-y-auto iris-scrollbar p-4 space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-violet-500" />
          What IRIS can check
        </div>
        <div className="space-y-2">
          {tools.map((t) => (
            <div key={t.label} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                <t.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium">{t.label}</div>
                <div className="text-[10px] text-muted-foreground leading-snug">{t.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Wand2 className="w-3 h-3 text-amber-500" />
          Try asking
        </div>
        <div className="space-y-1">
          {[
            "The AC in Studio 2 at Kwality House isn't cooling",
            "A client says her credits are wrong after her last class",
            "The 7pm class at Supreme HQ started 15 minutes late",
            "Has the sound system at Kenkere House failed before?",
          ].map((t) => (
            <button
              key={t}
              onClick={() => onSend(t)}
              className="w-full text-left px-2 py-1.5 text-[11px] rounded-md hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1.5 group"
            >
              <MessageSquare className="w-3 h-3 text-muted-foreground group-hover:text-violet-500 shrink-0" />
              <span className="truncate">{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb className="w-3 h-3 text-violet-500" />
          <div className="text-[11px] font-semibold">Tip</div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Describe it the way you'd tell a colleague: who, where, when. IRIS looks up the member and class itself and only asks what it can't find.
        </p>
      </div>
    </div>
  );
}

function formatFieldName(key: string): string {
  const map: Record<string, string> = {
    issue: "Issue Description",
    category: "Category",
    subcategory: "Subcategory",
    studio: "Studio",
    studioCity: "City",
    severity: "Severity",
    impact: "Impact",
    affectedClient: "Affected Client",
    clientIdentifier: "Client Contact",
    membershipType: "Membership Type",
    momenceId: "Momence ID",
    paymentAmount: "Payment Amount",
    paymentMethod: "Payment Method",
    paymentReference: "Payment Reference",
    timeOfIssue: "Time of Issue",
    duration: "Duration",
    affectedCount: "Affected Count",
    attemptedResolution: "Attempted Resolution",
    preferredContact: "Preferred Contact",
    urgency: "Urgency",
    equipment: "Equipment",
    location: "Location",
    instructor: "Instructor",
    sessionTime: "Session Time",
    additionalContext: "Additional Context",
    hasAttachments: "Has Attachments",
    businessImpact: "Business Impact",
  };
  return map[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function MessageBubble({
  message,
  onButtonClick,
  onCopyMessage,
  isLast,
  onIntakeSubmit,
  onIntakeAskAi,
}: {
  message: AIMessage;
  onButtonClick: (value: string, label: string) => void;
  onCopyMessage?: (
    msg: AIMessage,
    format: ExportFormat,
    setState: (s: "idle" | "ok" | "err") => void,
  ) => void;
  isLast: boolean;
  onIntakeSubmit?: (draft: AgentTicketDraft) => void;
  onIntakeAskAi?: (state: IntakeState) => void;
}) {
  const isUser = message.role === "user";
  const variant = message.variant || "default";
  const [copyState, setCopyState] = React.useState<"idle" | "ok" | "err">("idle");
  const [copyMenuOpen, setCopyMenuOpen] = React.useState(false);

  if (message.role === "system") {
    return (
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground my-2">
        <div className="flex-1 h-px bg-border" />
        <span>{message.content}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div className={cn("group flex gap-2.5 iris-fade-in-up", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
          <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
            {getInitials(useAppStore.getState().currentUser.name || "You")}
          </AvatarFallback>
        </Avatar>
      ) : (
        <IrisAvatar size={30} className="mt-0.5" />
      )}

      <div className={cn("flex-1 min-w-0", isUser && "flex flex-col items-end")}>
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[11px] font-semibold">{isUser ? "You" : "IRIS"}</span>
          {!isUser && message.variant !== "error" && <SourceBadge source={message.source ?? "rules"} rule={message.rule} />}
          {!isUser && message.askAi && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("iris:ask-ai", { detail: message.askAi }))}
              className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
              title="Not what you needed? Ask the AI agent the same question (uses tokens)"
            >
              <Sparkles className="w-2.5 h-2.5" />Ask AI instead
            </button>
          )}
          <span className="text-[9px] text-muted-foreground tabular-nums">
            {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </span>

          {/* Per-message copy dropdown - shows on hover via .group class */}
          {onCopyMessage && message.content && (
            <DropdownMenu open={copyMenuOpen} onOpenChange={setCopyMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Copy message"
                  className={cn(
                    "iris-msg-action-btn transition-opacity",
                    copyState === "ok" && "opacity-100",
                  )}
                  data-copied={copyState === "ok"}
                >
                  {copyState === "ok" ? (
                    <><Check className="w-2.5 h-2.5" /> Copied</>
                  ) : copyState === "err" ? (
                    <><AlertTriangle className="w-2.5 h-2.5" /> Failed</>
                  ) : (
                    <><Copy className="w-2.5 h-2.5" /> Copy</>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isUser ? "end" : "start"} className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Copy as
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EXPORT_FORMATS.filter((f) => f.value !== "html").map((f) => (
                  <DropdownMenuItem
                    key={f.value}
                    onClick={() => {
                      onCopyMessage(message, f.value, setCopyState);
                      setCopyMenuOpen(false);
                    }}
                    className="text-[11px] flex items-center gap-2"
                  >
                    {f.value === "txt" && <Hash className="w-3 h-3 text-muted-foreground" />}
                    {f.value === "md" && <FileText className="w-3 h-3 text-muted-foreground" />}
                    {f.value === "json" && <FileJson className="w-3 h-3 text-muted-foreground" />}
                    {f.value === "csv" && <FileSpreadsheet className="w-3 h-3 text-muted-foreground" />}
                    {f.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content bubble */}
        <div
          className={cn(
            "max-w-full rounded-xl px-3.5 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : variant === "info"
              ? "bg-muted/50 border border-border rounded-tl-sm"
              : variant === "question"
              ? "bg-card border border-border rounded-tl-sm"
              : variant === "investigation"
              ? "bg-muted/50 border border-border rounded-tl-sm"
              : variant === "ticket" || variant === "draft" || variant === "intake"
              ? "bg-card border border-border rounded-tl-sm p-0 overflow-hidden"
              : variant === "error"
              ? "bg-rose-500/5 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-tl-sm"
              : "bg-card border border-border rounded-tl-sm"
          )}
        >
          {variant === "intake" && message.intake ? (
            <div>
              {message.content && (
                <div className="px-4 pt-3 text-[13px] leading-relaxed whitespace-pre-line">{renderRichContent(message.content)}</div>
              )}
              <IntakeCard messageId={message.id} state={message.intake} onSubmit={onIntakeSubmit!} onAskAi={onIntakeAskAi!} />
            </div>
          ) : variant === "draft" && message.ticketDraft ? (
            <AgentDraftCard messageId={message.id} draft={message.ticketDraft} created={message.createdTicket} discarded={message.discarded} />
          ) : variant === "ticket" && message.ticketPreview ? (
            <TicketPreviewCard ticket={message.ticketPreview} metadata={message.metadata} />
          ) : (
            <div className="text-[13px] leading-relaxed whitespace-pre-line">
              {renderRichContent(message.content)}
            </div>
          )}
        </div>

        {/* Agent activity - compact inline indicator */}
        {message.agentActivity && (
          <div className="mt-1 iris-fade-in">
            <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-1 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5 text-primary" />
              {message.agentActivity.filter((a) => a.status === "complete").length}/{message.agentActivity.length} agents
            </div>
            <div className="flex flex-wrap gap-1">
              {message.agentActivity.map((a, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                    a.status === "active"
                      ? "bg-primary/10 text-primary"
                      : a.status === "pending"
                      ? "bg-muted/60 text-muted-foreground/60"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {a.status === "active" ? (
                    <Loader2 className="w-2 h-2 animate-spin" />
                  ) : a.status === "pending" ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                  ) : (
                    <CheckCircle2 className="w-2 h-2" />
                  )}
                  <span className="truncate max-w-[100px]">{a.agent.replace(" Agent", "")}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tool execution */}
        {message.tools && message.tools.length > 0 && (
          <div className="mt-2.5 rounded-xl border border-violet-500/20 bg-card overflow-hidden iris-scale-in">
            <div className="px-3 py-2 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-violet-500/20 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
              <Wand2 className="w-3 h-3" />
              Tool Execution
              <span className="ml-auto text-[9px] font-normal text-muted-foreground">
                {message.tools.filter((t) => t.status === "complete").length}/{message.tools.length} done
              </span>
            </div>
            <div className="divide-y divide-border">
              {message.tools.map((tool, i) => (
                <div key={i} className="px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[12px]">
                    {tool.status === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="font-medium font-mono text-[11px] truncate">{tool.name}</span>
                    {tool.duration && (
                      <span className="ml-auto text-[9px] text-muted-foreground tabular-nums shrink-0">{(tool.duration / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  {tool.result && (
                    <div className="mt-1 ml-5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/5 px-2 py-1 rounded">
                      → {tool.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investigation steps */}
        {message.metadata?.investigationSteps && (
          <div className="mt-2.5 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-3 iris-scale-in">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1.5">
              <Search className="w-3 h-3" />
              Investigation Trail
            </div>
            <ol className="space-y-1.5">
              {message.metadata.investigationSteps.map((step, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-2 leading-relaxed">
                  <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {message.metadata.confidenceScore && (
              <div className="mt-3 pt-2.5 border-t border-violet-500/20 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Overall Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                      style={{ width: `${message.metadata.confidenceScore}%` }}
                    />
                  </div>
                  <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums text-[11px]">{message.metadata.confidenceScore}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {message.buttons.length <= 4 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {message.buttons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => onButtonClick(btn.value, btn.label)}
                    className="iris-option iris-scale-in group"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="flex-1">{btn.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                {message.buttons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => onButtonClick(btn.value, btn.label)}
                    className="iris-option iris-scale-in text-[11px]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="flex-1">{btn.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Momence-linked search field */}
        {message.isQuestion && message.inputType && message.inputType !== "none" && message.inputType !== "text" && (
          <div className="mt-3">
            {message.inputType === "momence_member" && (
              <MomenceSearchField
                type="momence_member"
                placeholder={message.inputPlaceholder}
                onSelect={(entity) => {
                  if (entity.name) {
                    onButtonClick(entity.id || entity.name, entity.name);
                  }
                }}
              />
            )}
            {message.inputType === "momence_session" && (
              <MomenceSearchField
                type="momence_session"
                placeholder={message.inputPlaceholder}
                onSelect={(entity) => {
                  if (entity.name) {
                    onButtonClick(entity.id || entity.name, entity.name);
                  }
                }}
              />
            )}
            {message.inputType === "momence_trainer" && (
              <MomenceSearchField
                type="momence_trainer"
                placeholder={message.inputPlaceholder}
                onSelect={(entity) => {
                  if (entity.name) {
                    onButtonClick(entity.id || entity.name, entity.name);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Hint for text input questions */}
        {message.isQuestion && message.inputType === "text" && message.inputPlaceholder && (
          <div className="mt-2 text-[10px] text-muted-foreground italic flex items-center gap-1">
            <CornerDownLeft className="w-2.5 h-2.5" />
            Type your answer in the input below
          </div>
        )}
      </div>
    </div>
  );
}

function renderRichContent(content: string) {
  // Render markdown-like **bold** formatting
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function TicketPreviewCard({ ticket, metadata }: { ticket: NonNullable<AIMessage["ticketPreview"]>; metadata?: AIMessage["metadata"] }) {
  const { setCurrentView, conversationState } = useAppStore();
  const [showFullModal, setShowFullModal] = React.useState(false);
  const [ticketDetailData, setTicketDetailData] = React.useState<TicketDetailData | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState<string | null>(null);
  const selectTicket = useAppStore((s) => s.selectTicket);

  const handleReviewFull = () => {
    const detail = buildTicketDetail(conversationState);
    setTicketDetailData(detail);
    setShowFullModal(true);
  };

  const handleCreate = async () => {
    if (creating || created) return;
    setCreating(true);
    try {
      const t = await createTicketFromDetail(ticketDetailData ?? buildTicketDetail(conversationState));
      setCreated(t.ticketId);
      setShowFullModal(false);
      toast.success(`Ticket ${t.ticketId} created`, {
        action: { label: "Open", onClick: () => { setCurrentView("all_tickets"); selectTicket(t.id); } },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the ticket");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TicketIcon className="w-4 h-4" />
          <div className="text-[12px] font-semibold">Ticket Preview - Ready to Create</div>
          <span className="ml-auto text-[10px] font-mono bg-white/15 px-1.5 py-0.5 rounded">{ticket.ticketId}</span>
        </div>
        <div className="text-[10px] text-white/80">All fields auto-populated by IRIS multi-agent system · Click "Review Full Details" for advanced view</div>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title</div>
          <div className="text-[15px] font-semibold leading-tight">{ticket.title}</div>
        </div>

        {/* Description */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
          <div className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">{ticket.description}</div>
        </div>

        {/* Business impact */}
        {ticket.businessImpact && (
          <div className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Business Impact</div>
            <div className="text-[12px] text-foreground/90 leading-relaxed line-clamp-2">{ticket.businessImpact}</div>
          </div>
        )}

        {/* Key fields grid */}
        <div className="grid grid-cols-2 gap-2">
          <FieldBox label="Priority" value={ticket.priority} highlight />
          <FieldBox label="Department" value={ticket.department} />
          <FieldBox label="Assignee" value={ticket.assigneeName} icon="user" />
          <FieldBox label="Studio" value={ticket.studio} icon="building" />
          <FieldBox label="SLA Response" value={ticket.slaResponse} />
          <FieldBox label="Est. Resolution" value={ticket.estimatedResolution} />
        </div>

        {/* Recommended actions */}
        {ticket.recommendedActions && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Recommended Resolution
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border text-[12px] text-foreground/90 leading-relaxed whitespace-pre-line line-clamp-3">
              {ticket.recommendedActions.split("\n").slice(0, 3).join("\n")}
            </div>
          </div>
        )}

        {/* Collected fields summary */}
        {ticket.collectedFields && ticket.collectedFields.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Captured Fields ({ticket.collectedFields.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {ticket.collectedFields.slice(0, 8).map((f, i) => (
                <span key={i} className="iris-chip text-[9px]">
                  {formatFieldName(f.field)}
                </span>
              ))}
              {ticket.collectedFields.length > 8 && (
                <span className="iris-chip text-[9px]">+{ticket.collectedFields.length - 8} more</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-3 border-t border-border">
          {/* Primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || Boolean(created)}
              className="flex-1 px-3 py-2.5 rounded-lg iris-btn-premium text-[12px] flex items-center justify-center gap-1.5 iris-action-shimmer disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {created ? `Created ${created}` : creating ? "Creating…" : "Create & Route Ticket"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReviewFull}
              className="px-3 py-2.5 rounded-lg border border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-[12px] font-medium hover:bg-violet-500/10 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Review Full Details
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Modal */}
      {showFullModal && ticketDetailData && (
        <TicketPreviewModal
          data={ticketDetailData}
          onClose={() => setShowFullModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function FieldBox({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: "user" | "building" }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border">
      <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className={cn("text-[11px] font-semibold flex items-center gap-1 truncate", highlight && value === "P1" && "text-amber-600 dark:text-amber-400", highlight && value === "P0" && "text-rose-600 dark:text-rose-400")}>
        {icon === "user" && <User className="w-3 h-3 text-muted-foreground shrink-0" />}
        {icon === "building" && <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-2.5 iris-fade-in">
      <IrisAvatar size={30} thinking />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold">IRIS</span>
        <div className="bg-card border border-border rounded-xl rounded-tl-sm px-3.5 py-3">
          <IrisLoader size="sm" label="Investigating" />
        </div>
      </div>
    </div>
  );
}

type UsageSummary = {
  model: string;
  priced: boolean;
  today: { tokens: number; inputTokens: number; outputTokens: number; cachedTokens: number; costUsd: number; calls: number; myCostUsd: number };
  month: { tokens: number; costUsd: number };
  limits: { dailyTokens: number | null; monthlyBudgetUsd: number | null; alertPct: number };
  withoutAi?: { today: { answered: number; total: number }; month: { answered: number; total: number } };
};

const fmtUsd = (n: number) => (n === 0 ? "$0.00" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString("en-IN");

/** Real Claude usage recorded from every assistant call (org-wide; IST day and month). */
function AIUsageFooter({ refreshKey }: { refreshKey: number }) {
  const [u, setU] = React.useState<UsageSummary | null>(null);
  const [error, setError] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);

  // Live: refresh after every AI turn (refreshKey), every 30s, and when the tab regains focus.
  React.useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    let settled = false;
    // Abort defensively: some fetch wrappers (extensions, dev tooling) throw
    // synchronously from abort(), which React surfaces as a runtime error.
    const abort = (reason: string) => {
      if (settled || ac.signal.aborted) return;
      try { ac.abort(new DOMException(reason, "AbortError")); } catch { /* ignore */ }
    };
    const timeout = window.setTimeout(() => abort("usage request timed out"), 15_000);
    api<UsageSummary>("/api/ai/usage", { signal: ac.signal })
      .then((d) => {
        if (cancelled) return;
        setU(d);
        setError(false);
        setUpdatedAt(Date.now());
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => { settled = true; window.clearTimeout(timeout); });
    return () => {
      cancelled = true;
      abort("component unmounted");
      window.clearTimeout(timeout);
    };
  }, [refreshKey, tick]);
  // Refresh every 30s while visible; a hidden tab makes no requests and catches up on return.
  useVisibleInterval(() => setTick((t) => t + 1), 30_000);

  const dayPct = u?.limits.dailyTokens ? Math.min(100, (u.today.tokens / u.limits.dailyTokens) * 100) : null;
  const monthPct = u?.limits.monthlyBudgetUsd ? Math.min(100, (u.month.costUsd / u.limits.monthlyBudgetUsd) * 100) : null;
  const warn = (pct: number | null) => pct !== null && u !== null && pct >= u.limits.alertPct;

  return (
    <div className="p-3 border-t border-sidebar-border shrink-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-amber-500" />
        AI usage today
        {u && <span className="ml-auto font-mono normal-case tracking-normal text-[9px]">{u.model}</span>}
      </div>
      {error && !u ? (
        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
          Couldn&apos;t load usage.
          <button onClick={() => setTick((t) => t + 1)} className="text-primary hover:underline">Retry</button>
        </div>
      ) : !u ? (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[18px] font-semibold tabular-nums">{u.priced ? fmtUsd(u.today.costUsd) : "-"}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {fmtTokens(u.today.tokens)} tokens · {u.today.calls} call{u.today.calls === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground tabular-nums">
            <div>
              <div className="text-foreground font-medium text-[10px]">{fmtTokens(u.today.inputTokens)}</div>input
            </div>
            <div>
              <div className="text-foreground font-medium text-[10px]">{fmtTokens(u.today.cachedTokens)}</div>from cache
            </div>
            <div>
              <div className="text-foreground font-medium text-[10px]">{fmtTokens(u.today.outputTokens)}</div>output
            </div>
          </div>
          {dayPct !== null && (
            <div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-500", warn(dayPct) ? "bg-rose-500" : "bg-gradient-to-r from-violet-500 to-indigo-500")}
                  style={{ width: `${dayPct}%` }}
                />
              </div>
              <div className="text-[9px] text-muted-foreground mt-1 tabular-nums">
                {dayPct < 1 && u.today.tokens > 0 ? "<1" : Math.round(dayPct)}% of {fmtTokens(u.limits.dailyTokens!)} daily token limit
              </div>
            </div>
          )}
          {u.withoutAi && u.withoutAi.month.total > 0 && (
            <div className="flex items-center justify-between text-[9px] text-emerald-600 dark:text-emerald-400 tabular-nums" title="Turns answered by rules, IRIS data or a form - no tokens spent">
              <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" />Answered without AI</span>
              <span>
                {Math.round((100 * u.withoutAi.month.answered) / u.withoutAi.month.total)}% this month ({u.withoutAi.month.answered}/{u.withoutAi.month.total})
              </span>
            </div>
          )}
          <div className="pt-1.5 border-t border-border text-[9px] text-muted-foreground tabular-nums space-y-0.5">
            <div className="flex justify-between">
              <span>This month</span>
              <span className={cn(warn(monthPct) && "text-rose-500 font-semibold")}>
                {u.priced ? fmtUsd(u.month.costUsd) : "-"}
                {u.limits.monthlyBudgetUsd ? ` of $${u.limits.monthlyBudgetUsd}` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Your share today</span>
              <span>{u.priced ? fmtUsd(u.today.myCostUsd) : "-"}</span>
            </div>
            {!u.priced && <div>No price on file for this model, so cost isn&apos;t shown.</div>}
            <div className="flex justify-between">
              <span>{error ? "Offline, showing last numbers" : "Live"}</span>
              <span>{updatedAt ? `updated ${new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}


/** Ticket proposed by the agent; nothing is saved until the user clicks Create. */
/** Create a ticket from an agent draft and mark that draft message as done. */
async function createAgentDraft(messageId: string, draft: AgentTicketDraft) {
  try {
    const { extras: _extras, ...body } = draft;
    const prior = (body as { collectedInfo?: Record<string, unknown> }).collectedInfo ?? {};
    const t = await ticketsApi.create({ ...body, source: "ai_assistant", collectedInfo: { ...prior, agentDraft: true } });
    useAppStore.getState().updateAIMessage(messageId, { createdTicket: { id: t.id, ticketId: t.ticketId } });
    toast.success(`Ticket ${t.ticketId} created`);
    return t;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Couldn't create the ticket");
    return null;
  }
}

/** Small marker showing whether a reply came from Claude or an instant rule. */
function SourceBadge({ source, rule }: { source: "ai" | "rules"; rule?: string }) {
  const ai = source === "ai";
  return (
    <span
      title={ai ? "Answered by AI (Claude) - uses tokens" : `Instant answer${rule ? ` (${rule})` : ""} `}
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-medium",
        ai ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {ai ? <Sparkles className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
      {ai ? "AI" : "Instant"}
    </span>
  );
}

/** Ticket proposed by IRIS; nothing is saved until the user approves it. */
function AgentDraftCard({ messageId, draft, created, discarded }: { messageId: string; draft: AgentTicketDraft; created?: { id: string; ticketId: string }; discarded?: boolean }) {
  const { setCurrentView, selectTicket, currentUser } = useAppStore();
  const [creating, setCreating] = React.useState(false);
  const p = PRIORITY_CONFIG[draft.priority];
  const x = draft.extras;
  const assignee = draft.assigneeId ? EMPLOYEE_MAP[draft.assigneeId] : undefined;
  const ownerName = x?.owner?.name ?? assignee?.name;

  const create = async () => {
    setCreating(true);
    // Persist the extra context so the owner sees it on the ticket, not just in this chat.
    const { extras, ...rest } = draft;
    await createAgentDraft(messageId, {
      ...rest,
      ...(extras ? { collectedInfo: { intake: { details: extras.details, when: extras.when, reporter: extras.reporter, kbArticle: extras.kbArticle, member: extras.member, related: extras.related.map((r) => r.ticketId) } } } : {}),
    } as AgentTicketDraft);
    setCreating(false);
  };
  const discard = () => useAppStore.getState().updateAIMessage(messageId, { discarded: true });

  // Fallbacks for AI-proposed drafts that come without the intake extras.
  const reporter = x?.reporter ?? { name: currentUser.name, role: currentUser.role };
  const fmtMins = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
  const sla = x ? `${x.slaResponse} response · ${x.slaResolution} resolution` : p ? `${fmtMins(p.responseMins)} response · ${fmtMins(p.resolutionMins)} resolution` : undefined;
  const closure = x?.expectedClosure ?? (p ? new Date(Date.now() + p.resolutionMins * 60_000).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : undefined);
  const steps = x?.actionSteps ?? (draft.recommendedResolution ? draft.recommendedResolution.split(/\n+/).map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "")).filter(Boolean) : []);
  const depts = (x?.departmentsInvolved ?? draft.departmentCodes ?? (draft.departmentCode ? [draft.departmentCode] : [])).map((c) => DEPT_MAP[c]?.name ?? c);
  const d = x?.details ?? {};

  const facts: Array<[string, React.ReactNode]> = [
    ["Routes to", draft.departmentCode ? DEPT_MAP[draft.departmentCode]?.name ?? draft.departmentCode : "Auto"],
    ["Owner", ownerName ? <span>{ownerName}{x?.owner?.reason && <span className="block text-[10px] font-normal text-muted-foreground">{x.owner.reason}</span>}</span> : "Auto-assign on create"],
    ["Priority", p ? `${p.label}` : draft.priority],
    ["SLA", sla],
    ["Expected closure", closure],
    ["Departments", depts.join(", ") || undefined],
    ["Studio", draft.studioCode ? STUDIO_MAP[draft.studioCode]?.name ?? draft.studioCode : undefined],
    ["Category", [draft.category, draft.subcategory].filter(Boolean).join(" › ")],
    ["Reporter", `${reporter.name} · ${reporter.role}`],
    ["When", x?.when ?? undefined],
  ];
  const quick: Array<[string, string | undefined]> = [
    ["Client mood", d.sentiment],
    ["Client wants", d.clientAsk],
    ["Impact", [d.impact, d.usable, d.injury].filter(Boolean).join(" · ") || undefined],
    ["Done so far", d.actionsTaken],
  ];
  // Intake drafts show the structured parts as cards below; AI drafts keep their full text.
  const summary = !x ? draft.description : draft.description.split(/\n(?=Client said|Client mood|Client wants|Impact|Item|Done so far|Context|Member profile|Related open tickets)\n?/)[0].trim();

  return (
    <div className={cn(discarded && "opacity-60")}>
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center gap-2">
        <TicketIcon className="w-4 h-4" />
        <div className="text-[12px] font-semibold">{discarded ? "Draft discarded" : created ? "Ticket created" : "Ticket draft - review before approving"}</div>
        {p && <span className="ml-auto text-[10px] font-semibold bg-white/15 px-1.5 py-0.5 rounded">{p.label}</span>}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[14px] font-semibold leading-snug">{draft.title}</div>
          <div className="text-[12px] text-muted-foreground mt-1 whitespace-pre-line">{summary}</div>
        </div>

        {d.verbatim && (
          <blockquote className="border-l-2 border-primary/60 pl-3 text-[12px] italic text-foreground/90">“{d.verbatim}”</blockquote>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-[11px] rounded-lg border border-border p-3 bg-muted/20">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-2 min-w-0">
              <dt className="text-muted-foreground shrink-0 w-24">{k}</dt>
              <dd className="font-medium min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>

        {quick.some(([, v]) => v) && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5 text-[11px]">
            {quick.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground shrink-0 w-24">{k}</dt>
                <dd className="font-medium min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {x?.member && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-3">
            <div className="text-[11px] font-semibold mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-sky-600" />Member profile</div>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground">
              {memberLines(x.member).map((l, i) => <li key={i} className={cn(i === 0 && "text-foreground font-medium")}>{l}</li>)}
            </ul>
          </div>
        )}

        {steps.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <div className="text-[11px] font-semibold mb-1.5">
              Recommended action steps
              {x?.kbArticle && <span className="font-normal text-muted-foreground"> · from {x.kbArticle.id} {x.kbArticle.title}</span>}
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
              {steps.map((st, i) => <li key={i}>{st}</li>)}
            </ol>
          </div>
        )}

        {x?.related && x.related.length > 0 && (
          <div className="text-[11px]">
            <span className="font-semibold">Related open tickets: </span>
            <span className="text-muted-foreground">{x.related.map((r) => `${r.ticketId} (${r.status.replace(/_/g, " ")})`).join(", ")}</span>
          </div>
        )}

        {draft.tags && draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {draft.tags.map((t) => <span key={t} className="iris-chip text-[9px]">{t}</span>)}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {created ? (
            <>
              <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />Created {created.ticketId}
              </span>
              <Button size="sm" variant="outline" className="ml-auto h-7 text-[11px]" onClick={() => { setCurrentView("all_tickets"); selectTicket(created.id); }}>
                Open ticket<ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </>
          ) : discarded ? (
            <>
              <span className="text-[11px] text-muted-foreground">Discarded. Nothing was saved.</span>
              <Button size="sm" variant="ghost" className="ml-auto h-7 text-[11px]" onClick={() => useAppStore.getState().updateAIMessage(messageId, { discarded: false })}>Undo</Button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">Want changes? Tell IRIS below.</span>
              <Button size="sm" variant="outline" className="ml-auto h-8 text-[12px] text-rose-600 border-rose-500/30 hover:bg-rose-500/5" onClick={discard} disabled={creating}>
                <X className="w-3.5 h-3.5 mr-1" />Discard draft
              </Button>
              <Button size="sm" className="h-8 text-[12px]" onClick={create} disabled={creating}>
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve &amp; create</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
