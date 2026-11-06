"use client";

import * as React from "react";
import { useAppStore, AIMessage } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import { EMPLOYEES, STUDIOS } from "@/lib/iris/types";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const SUGGESTED_ISSUES = [
  "AC is not working in Studio 2 at Kwality House",
  "A client's class credits are not reflecting correctly",
  "Sound system has stopped working",
  "Payment deducted but not showing in system",
  "Client wants to change her membership",
  "Recurring booking is not getting cancelled",
];

const AGENTS = [
  { name: "Conversational Agent", icon: Brain, color: "text-violet-500" },
  { name: "Classification Agent", icon: Cpu, color: "text-sky-500" },
  { name: "Investigation Agent", icon: Search, color: "text-amber-500" },
  { name: "Routing Agent", icon: Zap, color: "text-emerald-500" },
  { name: "SLA Agent", icon: ShieldCheck, color: "text-rose-500" },
];

export function AIAssistantView() {
  const { aiMessages, addAIMessage, clearAIChat, currentUser } = useAppStore();
  const [input, setInput] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Initialize with welcome message if empty
  React.useEffect(() => {
    if (aiMessages.length === 0) {
      addAIMessage({
        id: generateId("msg"),
        role: "assistant",
        content: `Hi ${currentUser.name.split(" ")[0]}! I'm IRIS, your intelligent operations assistant. I can help you report, investigate, and resolve any operational issue across all Physique 57 India studios.\n\nWhat issue would you like to report today? You can describe it in your own words — I'll handle the rest.`,
        timestamp: new Date().toISOString(),
        buttons: SUGGESTED_ISSUES.slice(0, 4).map(s => ({ label: s, value: s })),
      });
    }
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages, isProcessing]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setInput("");
    setIsProcessing(true);

    // Add user message
    addAIMessage({
      id: generateId("msg"),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });

    // Simulate AI multi-agent workflow
    await sleep(400);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: "Let me analyze this issue. I'll coordinate with my specialist agents to investigate.",
      timestamp: new Date().toISOString(),
      agentActivity: [
        { agent: "Classification Agent", action: "Analyzing issue category and severity", status: "active" },
        { agent: "Investigation Agent", action: "Checking related historical tickets", status: "pending" },
        { agent: "Routing Agent", action: "Awaiting classification", status: "pending" },
      ],
    });

    await sleep(800);
    addAIMessage({
      id: generateId("msg"),
      role: "system",
      content: "I need a bit more context to route this correctly.",
      timestamp: new Date().toISOString(),
    });

    await sleep(300);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: "Which studio is experiencing the issue?",
      timestamp: new Date().toISOString(),
      buttons: STUDIOS.map(s => ({ label: s.name, value: s.code })),
    });

    await sleep(1200);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: "How severely is the issue affecting operations?",
      timestamp: new Date().toISOString(),
      buttons: [
        { label: "Critical — Classes/operations disrupted", value: "critical" },
        { label: "High — Significant inconvenience", value: "high" },
        { label: "Medium — Partial functionality affected", value: "medium" },
        { label: "Low — Minor inconvenience", value: "low" },
        { label: "Not sure", value: "unsure" },
      ],
    });

    await sleep(1500);
    addAIMessage({
      id: generateId("msg"),
      role: "assistant",
      content: "I've completed my investigation. Here's the structured ticket I've prepared for your review.",
      timestamp: new Date().toISOString(),
      tools: [
        { name: "Momence API — Member Search", status: "complete", result: "Member found: Priya Agarwal (MM-89342)" },
        { name: "Historical Ticket Search", status: "complete", result: "Found 2 similar tickets in past 90 days" },
        { name: "Department Routing Lookup", status: "complete", result: "Routed to Facilities & Maintenance" },
      ],
      ticketPreview: {
        ticketId: `IRIS-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
        title: text.length > 60 ? text.substring(0, 57) + "..." : text,
        description: `Issue reported by ${currentUser.name}: ${text}. The system has analyzed this report and prepared a comprehensive ticket with relevant context, business impact assessment, and recommended resolution steps.`,
        priority: "P1",
        department: "Facilities & Maintenance",
        assigneeName: "Arjun Pillai",
        studio: "Kwality House",
        estimatedResolution: "4 hours",
        slaResponse: "1 hour",
        slaResolution: "12 hours",
      },
      metadata: {
        investigationSteps: [
          "Analyzed user input for intent and category",
          "Searched historical tickets — found 2 similar",
          "Retrieved employee directory for routing",
          "Calculated SLA based on priority and department",
          "Identified primary assignee based on workload and skills",
        ],
        confidenceScore: 92,
      },
    });

    setIsProcessing(false);
  };

  const handleButtonClick = (value: string, label: string) => {
    handleSend(label);
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-background/80 backdrop-blur-xl">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold flex items-center gap-2">
              IRIS Assistant
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Online</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Multi-agent · GPT-4o + Claude · 8 specialized agents</div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={clearAIChat}>
            <RefreshCw className="w-3 h-3 mr-1.5" />
            New Chat
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto iris-scrollbar">
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
            {aiMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onButtonClick={handleButtonClick} />
            ))}
            {isProcessing && <TypingIndicator />}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background/80 backdrop-blur-xl p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative iris-ai-border rounded-2xl">
              <div className="flex items-end gap-2 p-2 bg-card rounded-2xl border border-border">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(input);
                    }
                  }}
                  placeholder="Describe the issue in your own words..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-0 outline-none text-[14px] py-2 px-1 max-h-32 placeholder:text-muted-foreground"
                  style={{ minHeight: "36px" }}
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600"
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isProcessing}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="text-[10px] text-muted-foreground">
                IRIS uses multi-agent AI · All actions are audited · Press Enter to send
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Prompt injection protected
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Agent Activity */}
      <div className="w-72 border-l border-border hidden lg:flex flex-col bg-sidebar/30">
        <div className="p-4 border-b border-border">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Active Agents
          </div>
          <div className="space-y-1.5">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors">
                <div className={cn("w-7 h-7 rounded-md bg-muted flex items-center justify-center", agent.color)}>
                  <agent.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{agent.name}</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Ready
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 iris-scrollbar">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Quick Templates
          </div>
          <div className="space-y-1">
            {["AC malfunction", "Sound system issue", "Membership freeze", "Payment missing", "Credit discrepancy", "Booking cancellation"].map(t => (
              <button
                key={t}
                onClick={() => handleSend(t)}
                className="w-full text-left px-2 py-1.5 text-[11px] rounded-md hover:bg-muted/60 transition-colors flex items-center gap-1.5 group"
              >
                <TicketIcon className="w-3 h-3 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                {t}
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          <div className="mt-6 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-3 h-3 text-violet-500" />
              <div className="text-[11px] font-semibold">AI Tip</div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Describe issues in plain language. IRIS will identify category, severity, and route to the right team automatically.
            </p>
          </div>
        </div>

        <div className="p-3 border-t border-sidebar-border text-[10px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>API Usage Today</span>
            <span className="font-semibold tabular-nums">847 tokens</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: "23%" }} />
          </div>
          <div className="text-[9px] mt-1">23% of daily limit</div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onButtonClick }: { message: AIMessage; onButtonClick: (value: string, label: string) => void }) {
  const { selectTicket, setCurrentView } = useAppStore();
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground my-2">
        <div className="flex-1 h-px bg-border" />
        <span>{message.content}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 iris-fade-in-up", isUser && "flex-row-reverse")}>
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        {isUser ? (
          <AvatarFallback className={cn("text-white text-[11px] font-semibold", getAvatarColor("Aarav Mehta"))}>
            AM
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className={cn("flex-1 min-w-0", isUser && "flex flex-col items-end")}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[12px] font-semibold">{isUser ? "You" : "IRIS"}</span>
          {!isUser && (
            <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded font-medium">
              GPT-4o · Multi-agent
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </span>
        </div>

        {/* Content */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-md"
              : "bg-card border border-border rounded-tl-md"
          )}
        >
          {message.content}
        </div>

        {/* Agent activity */}
        {message.agentActivity && (
          <div className="mt-2 rounded-lg border border-border bg-card p-3 space-y-1.5 iris-scale-in">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-violet-500" />
              Agent Activity
            </div>
            {message.agentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                {a.status === "active" ? (
                  <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
                ) : a.status === "pending" ? (
                  <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
                <span className="font-medium">{a.agent}</span>
                <span className="text-muted-foreground">— {a.action}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tools */}
        {message.tools && (
          <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden iris-scale-in">
            <div className="px-3 py-2 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wand2 className="w-3 h-3 text-violet-500" />
              Tool Execution
            </div>
            <div className="divide-y divide-border">
              {message.tools.map((tool, i) => (
                <div key={i} className="px-3 py-2">
                  <div className="flex items-center gap-2 text-[12px]">
                    {tool.status === "running" ? (
                      <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    )}
                    <span className="font-medium">{tool.name}</span>
                  </div>
                  {tool.result && (
                    <div className="mt-1 ml-5 text-[11px] text-muted-foreground font-mono">
                      → {tool.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investigation metadata */}
        {message.metadata?.investigationSteps && (
          <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1.5">
              <Search className="w-3 h-3" />
              Investigation Summary
            </div>
            <ol className="space-y-1">
              {message.metadata.investigationSteps.map((step, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                  <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
            {message.metadata.confidenceScore && (
              <div className="mt-2 pt-2 border-t border-violet-500/20 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Confidence Score</span>
                <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">{message.metadata.confidenceScore}%</span>
              </div>
            )}
          </div>
        )}

        {/* Ticket Preview */}
        {message.ticketPreview && (
          <TicketPreviewCard ticket={message.ticketPreview} onView={() => {
            setCurrentView("all_tickets");
          }} />
        )}

        {/* Buttons */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.buttons.map((btn, i) => (
              <button
                key={i}
                onClick={() => onButtonClick(btn.value, btn.label)}
                className="px-3 py-1.5 text-[12px] rounded-lg border border-border bg-card hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400 transition-all iris-scale-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketPreviewCard({ ticket, onView }: { ticket: NonNullable<AIMessage["ticketPreview"]>; onView: () => void }) {
  return (
    <div className="mt-2.5 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 overflow-hidden iris-scale-in">
      <div className="px-4 py-3 bg-violet-500/10 border-b border-violet-500/20 flex items-center gap-2">
        <TicketIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <div className="text-[12px] font-semibold text-violet-600 dark:text-violet-400">Ticket Preview</div>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{ticket.ticketId}</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title</div>
          <div className="text-[14px] font-semibold leading-tight">{ticket.title}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
          <div className="text-[12px] text-muted-foreground leading-relaxed">{ticket.description}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <InfoBox label="Priority" value={ticket.priority} highlight />
          <InfoBox label="Department" value={ticket.department} />
          <InfoBox label="Assignee" value={ticket.assigneeName} icon="user" />
          <InfoBox label="Studio" value={ticket.studio} icon="building" />
          <InfoBox label="SLA Response" value={ticket.slaResponse} />
          <InfoBox label="Est. Resolution" value={ticket.estimatedResolution} />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onView}
            className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[12px] font-medium flex items-center justify-center gap-1.5 iris-btn-glow"
          >
            Create & Route Ticket
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button className="px-3 py-2 rounded-lg border border-border text-[12px] font-medium hover:bg-muted transition-colors">
            Edit Details
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: "user" | "building" }) {
  return (
    <div className="p-2 rounded-md bg-card border border-border">
      <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className={cn("text-[11px] font-semibold flex items-center gap-1", highlight && value === "P1" && "text-amber-600 dark:text-amber-400")}>
        {icon === "user" && <User className="w-3 h-3 text-muted-foreground" />}
        {icon === "building" && <Building2 className="w-3 h-3 text-muted-foreground" />}
        {value}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 iris-fade-in">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
          <Sparkles className="w-3.5 h-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-md bg-card border border-border px-4 py-3 flex items-center gap-1.5">
        <span className="iris-typing-dot" />
        <span className="iris-typing-dot" />
        <span className="iris-typing-dot" />
        <span className="text-[11px] text-muted-foreground ml-2">IRIS is thinking...</span>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
