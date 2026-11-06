"use client";

import * as React from "react";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Initialize with welcome message if empty
  React.useEffect(() => {
    if (!hasInitialized && aiMessages.length === 0) {
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: `Hi ${currentUser.name.split(" ")[0]} — I'm IRIS, your intelligent operations assistant.\n\nI can help you report, investigate, and resolve any operational issue across all Physique 57 India studios. Just describe what's happening in your own words — I'll handle classification, investigation, routing, and SLA.\n\nWhat issue would you like to report today?`,
        timestamp: new Date().toISOString(),
        variant: "default",
        buttons: SUGGESTED_ISSUES.slice(0, 4).map((s) => ({ label: s.label, value: s.label, captures: s.label })),
      });
      setHasInitialized(true);
    } else if (aiMessages.length > 0) {
      setHasInitialized(true);
    }
  }, [hasInitialized, aiMessages.length, addAIMessage, currentUser.name]);

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

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;
    setInput("");
    setIsProcessing(true);

    // Add user message immediately
    addAIMessage({
      id: generateId("msg"),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    });

    // Process through conversation engine
    const response = processUserInput(conversationState, trimmed);

    // Update conversation state
    const newState = { ...conversationState, ...response.newState } as ConversationState;
    setConversationState(newState);

    // Stream the AI messages with appropriate delays
    for (let i = 0; i < response.messages.length; i++) {
      const msg = response.messages[i];

      // Show "thinking" indicator before each message
      if (msg.thinkingDuration && msg.thinkingDuration > 0) {
        await sleep(msg.thinkingDuration);
      }

      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: msg.content,
        timestamp: new Date().toISOString(),
        buttons: msg.buttons,
        inputType: msg.inputType,
        inputPlaceholder: msg.inputPlaceholder,
        isQuestion: msg.isQuestion,
        isAcknowledgment: msg.isAcknowledgment,
        isTransition: msg.isTransition,
        ticketPreview: msg.ticketPreview,
        agentActivity: msg.agentActivity,
        tools: msg.tools,
        metadata: msg.metadata,
        variant: msg.variant || "default",
      });
    }

    // If investigation needed, run it
    if (response.shouldInvestigate) {
      await sleep(900);
      const investigationResult = buildInvestigationResult(newState);
      await sleep(investigationResult.thinkingDuration || 200);

      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: "Investigation complete. Compiling findings...",
        timestamp: new Date().toISOString(),
        variant: "investigation",
        tools: investigationResult.tools?.map((t, i) => ({
          ...t,
          status: i === 0 ? "running" : "complete",
        })),
        agentActivity: [
          { agent: "Investigation Agent", action: "Momence API queried successfully", status: "complete" },
          { agent: "Ticket Intelligence Agent", action: "Compiling structured ticket", status: "active" },
          { agent: "Routing Agent", action: "Assignee selected", status: "complete" },
          { agent: "SLA Agent", action: "SLA targets computed", status: "complete" },
        ],
      });

      // Stream tool completions
      if (investigationResult.tools) {
        for (let i = 0; i < investigationResult.tools.length; i++) {
          await sleep(investigationResult.tools[i].duration || 400);
        }
      }

      await sleep(500);

      // Final ticket preview
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: investigationResult.content,
        timestamp: new Date().toISOString(),
        variant: "ticket",
        ticketPreview: investigationResult.ticketPreview,
        tools: investigationResult.tools,
        metadata: investigationResult.metadata,
      });

      setConversationState({ stage: "ready" });
    }

    setIsProcessing(false);
  };

  const handleButtonClick = (value: string, label: string) => {
    handleSend(label);
  };

  const handleReset = () => {
    clearAIChat();
    setConversationState(createInitialState());
    setHasInitialized(false);
    setTimeout(() => {
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: `Hi ${currentUser.name.split(" ")[0]} — I'm IRIS, your intelligent operations assistant.\n\nWhat issue would you like to report today? Just describe it in your own words.`,
        timestamp: new Date().toISOString(),
        variant: "default",
        buttons: SUGGESTED_ISSUES.slice(0, 4).map((s) => ({ label: s.label, value: s.label, captures: s.label })),
      });
      setHasInitialized(true);
    }, 100);
  };

  return (
    <div className="flex h-full iris-aurora">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Chat Header */}
        <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-background/60 backdrop-blur-xl">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background">
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold flex items-center gap-2">
              IRIS Assistant
              <span className="iris-badge-premium flex items-center gap-1">
                <span className="iris-live-dot" />
                Live
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-violet-500" />
              Multi-agent · GPT-4o + Claude · 6 specialized agents
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={handleReset}>
            <RefreshCw className="w-3 h-3 mr-1.5" />
            New Chat
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto iris-scrollbar">
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
            {aiMessages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onButtonClick={handleButtonClick}
                isLast={idx === aiMessages.length - 1}
              />
            ))}
            {isProcessing && <ThinkingIndicator />}
            <div className="h-4" />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background/60 backdrop-blur-xl p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative iris-ring-gradient rounded-2xl">
              <div className="flex items-end gap-2 p-2 bg-card rounded-2xl">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl hover:bg-violet-500/10">
                  <Paperclip className="w-4 h-4" />
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
                      ? "Ask a follow-up question or describe another issue..."
                      : "Describe the issue in your own words..."
                  }
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-0 outline-none text-[14px] py-2 px-1 max-h-32 placeholder:text-muted-foreground"
                  style={{ minHeight: "36px" }}
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl hover:bg-violet-500/10">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl iris-btn-premium"
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Prompt injection protected · All actions audited
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                Press Enter to send
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversation Intelligence */}
      <div className="w-80 border-l border-border hidden lg:flex flex-col bg-sidebar/40 backdrop-blur-sm">
        <ConversationIntelligencePanel state={conversationState} />
      </div>
    </div>
  );
}

function ConversationIntelligencePanel({ state }: { state: ConversationState }) {
  const collectedEntries = Object.entries(state.collectedInfo).filter(([_, v]) => v && v !== "");
  const totalQuestions = state.questionsRemaining.length + state.questionsAsked.length;
  const answeredQuestions = state.questionsAsked.length;
  const progressPct = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-violet-500" />
          Conversation Intelligence
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {answeredQuestions} of {totalQuestions} questions answered · Stage: <span className="font-medium text-foreground">{state.stage.replace("_", " ")}</span>
          </div>
        </div>
      </div>

      {/* Captured Info */}
      <div className="flex-1 overflow-y-auto iris-scrollbar p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Target className="w-3 h-3 text-emerald-500" />
          Captured Information
          {collectedEntries.length > 0 && (
            <span className="ml-auto text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
              {collectedEntries.length}
            </span>
          )}
        </div>
        {collectedEntries.length === 0 ? (
          <div className="p-3 rounded-lg border border-dashed border-border text-center">
            <Target className="w-5 h-5 mx-auto text-muted-foreground/50 mb-1" />
            <div className="text-[11px] text-muted-foreground">No info captured yet. Start describing your issue.</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {collectedEntries.map(([key, value]) => (
              <div key={key} className="p-2 rounded-md bg-card border border-border iris-slide-up">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  {formatFieldName(key)}
                </div>
                <div className="text-[12px] font-medium leading-tight truncate">{String(value)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Active Agents */}
        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-violet-500" />
            AI Agents Status
          </div>
          <div className="space-y-1">
            {AGENTS.map((agent) => {
              const isActive =
                (state.stage === "collecting" && agent.name === "Conversational Agent") ||
                (state.stage === "investigating" && agent.name === "Investigation Agent") ||
                (state.stage === "ready" && agent.name === "Quality Agent");
              return (
                <div
                  key={agent.name}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border transition-all",
                    isActive
                      ? "border-violet-500/40 bg-violet-500/5"
                      : "border-transparent hover:bg-muted/40"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", isActive ? "bg-violet-500/15" : "bg-muted")}>
                    <agent.icon className={cn("w-3.5 h-3.5", isActive ? agent.color : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate">{agent.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{agent.desc}</div>
                  </div>
                  {isActive ? (
                    <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Templates */}
        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <Wand2 className="w-3 h-3 text-amber-500" />
            Quick Templates
          </div>
          <div className="space-y-1">
            {["AC malfunction", "Sound system issue", "Membership freeze", "Payment missing", "Credit discrepancy", "Booking cancellation"].map((t) => (
              <button
                key={t}
                className="w-full text-left px-2 py-1.5 text-[11px] rounded-md hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1.5 group"
              >
                <TicketIcon className="w-3 h-3 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                {t}
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* AI Tip */}
        <div className="mt-6 p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-3 h-3 text-violet-500" />
            <div className="text-[11px] font-semibold">How IRIS Works</div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            I analyse each message, extract key info, and ask only the questions genuinely needed — one at a time. The conversation shapes the ticket.
          </p>
        </div>
      </div>

      {/* Footer — API Usage */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-500" />
          API Usage Today
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Tokens used</span>
            <span className="font-semibold tabular-nums">{847 + state.turnCount * 120}</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, 23 + state.turnCount * 3)}%` }}
            />
          </div>
          <div className="text-[9px] text-muted-foreground">{Math.min(100, 23 + state.turnCount * 3)}% of daily limit · ${((847 + state.turnCount * 120) * 0.00003).toFixed(2)} spent</div>
        </div>
      </div>
    </>
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
  isLast,
}: {
  message: AIMessage;
  onButtonClick: (value: string, label: string) => void;
  isLast: boolean;
}) {
  const isUser = message.role === "user";
  const variant = message.variant || "default";

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
    <div className={cn("flex gap-3 iris-slide-up", isUser && "flex-row-reverse")}>
      <Avatar className="w-9 h-9 shrink-0 mt-0.5">
        {isUser ? (
          <AvatarFallback className={cn("text-white text-[11px] font-semibold", getAvatarColor("Aarav Mehta"))}>
            AM
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Sparkles className="w-4 h-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className={cn("flex-1 min-w-0", isUser && "flex flex-col items-end")}>
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[12px] font-semibold">{isUser ? "You" : "IRIS"}</span>
          {!isUser && (
            <span className="text-[9px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Brain className="w-2.5 h-2.5" />
              {variant === "investigation" ? "Claude Sonnet" : variant === "ticket" ? "Multi-agent" : "GPT-4o"}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </span>
        </div>

        {/* Content bubble */}
        <div
          className={cn(
            "iris-bubble max-w-full",
            isUser
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-md"
              : variant === "info"
              ? "iris-bubble-info rounded-tl-md"
              : variant === "question"
              ? "iris-bubble-question rounded-tl-md"
              : variant === "investigation"
              ? "iris-bubble-investigation rounded-tl-md"
              : variant === "ticket"
              ? "iris-card-elevated rounded-tl-md p-0 overflow-hidden"
              : "bg-card border border-border rounded-tl-md"
          )}
        >
          {variant === "ticket" && message.ticketPreview ? (
            <TicketPreviewCard ticket={message.ticketPreview} metadata={message.metadata} />
          ) : (
            <div className="text-[13px] leading-relaxed whitespace-pre-line">
              {renderRichContent(message.content)}
            </div>
          )}
        </div>

        {/* Captured fields chips (for info messages) */}
        {variant === "info" && message.metadata?.capturedFields && message.metadata.capturedFields.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.metadata.capturedFields.map((f, i) => (
              <span key={i} className="iris-chip">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {formatFieldName(f.field)}: {f.value}
              </span>
            ))}
          </div>
        )}

        {/* Agent activity — compact inline indicator */}
        {message.agentActivity && (
          <div className="mt-1.5 iris-fade-in">
            <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-1 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5 text-violet-500" />
              {message.agentActivity.filter((a) => a.status === "complete").length}/{message.agentActivity.length} agents
            </div>
            <div className="flex flex-wrap gap-1">
              {message.agentActivity.map((a, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                    a.status === "active"
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
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
              <div className="grid grid-cols-1 gap-1.5">
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
              <div className="grid grid-cols-2 gap-1.5">
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

  const handleReviewFull = () => {
    const detail = buildTicketDetail(conversationState);
    setTicketDetailData(detail);
    setShowFullModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TicketIcon className="w-4 h-4" />
          <div className="text-[12px] font-semibold">Ticket Preview — Ready to Create</div>
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
              onClick={() => setCurrentView("all_tickets")}
              className="flex-1 px-3 py-2.5 rounded-lg iris-btn-premium text-[12px] flex items-center justify-center gap-1.5 iris-action-shimmer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Create & Route Ticket
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
          {/* Secondary actions */}
          <div className="flex items-center gap-2">
            <button className="flex-1 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" />
              Save as Draft
            </button>
            <button className="flex-1 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Escalate Now
            </button>
            <button className="flex-1 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1">
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Modal */}
      {showFullModal && ticketDetailData && (
        <TicketPreviewModal
          data={ticketDetailData}
          onClose={() => setShowFullModal(false)}
          onCreate={() => {
            setShowFullModal(false);
            setCurrentView("all_tickets");
          }}
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
    <div className="flex gap-3 iris-fade-in">
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
          <Sparkles className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold">IRIS</span>
          <span className="text-[9px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Brain className="w-2.5 h-2.5" />
            Thinking
          </span>
        </div>
        <div className="iris-bubble-question rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
          <span className="iris-thinking-dot" />
          <span className="iris-thinking-dot" />
          <span className="iris-thinking-dot" />
          <span className="text-[11px] text-muted-foreground ml-2">Processing your input...</span>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
