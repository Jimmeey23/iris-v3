"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ticketsApi } from "@/lib/iris/live-data";
import { toast } from "sonner";
import { Ticket, getAssignee, getReporter, getStudio, getDepartment, isOwner as isTicketOwner } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, EMPLOYEE_MAP, Priority, TicketStatus } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge, SLAProgressBar, StudioBadge, DepartmentBadge } from "../badges";
import { MultiSelect } from "../multi-select";
import { SmartBadges } from "../smart-badges";
import { MomenceContextPanel } from "../momence-member-panel";
import { AIResolutionSuggestions } from "../ai-resolution-suggestions";
import { AdminTicketControls } from "../admin-ticket-controls";
import { RecurrencePanel } from "../recurrence-panel";
import { FormattedText } from "../formatted-text";
import { formatRelativeTime, formatDateTime, getInitials, getAvatarColor } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ExtensionRequestDialog } from "@/components/iris/sla-breach-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Clock,
  User,
  Building2,
  Send,
  Paperclip,
  MessageSquare,
  Activity,
  GitBranch,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Brain,
  FileText,
  Image as ImageIcon,
  Wrench,
  PlayCircle,
  PauseCircle,
  ChevronRight,
  History,
  Tag,
  Link2,
  Lock,
  BellRing,
  Hash,
  Layers,
  Timer,
  Users,
} from "lucide-react";

export function TicketWorkspace({ ticket }: { ticket: Ticket }) {
  const { selectTicket, setCurrentView, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = React.useState("resolution");
  const [comment, setComment] = React.useState("");
  const [status, setStatus] = React.useState<TicketStatus>(ticket.status);
  const [slaPaused, setSlaPaused] = React.useState(ticket.slaStatus === "paused");
  const [busy, setBusy] = React.useState(false);
  const [summaryDraft, setSummaryDraft] = React.useState("");
  const isAdmin = currentUser.tier === "admin";
  // Admins can act on any ticket, including imported ones.
  const readOnly = Boolean(ticket.legacy) && !isAdmin;
  const assignmentLocked = !isAdmin && (readOnly || Boolean(ticket.assignmentLocked));
  const [ownerIds, setOwnerIds] = React.useState<string[]>(ticket.assigneeIds?.length ? ticket.assigneeIds : ticket.assigneeId ? [ticket.assigneeId] : []);
  const [primaryOwner, setPrimaryOwner] = React.useState<string | null>(ticket.assigneeId ?? null);
  const [deptCodes, setDeptCodes] = React.useState<string[]>(ticket.departmentCodes?.length ? ticket.departmentCodes : ticket.departmentCode ? [ticket.departmentCode] : []);
  const [primaryDept, setPrimaryDept] = React.useState<string | null>(ticket.departmentCode ?? null);

  /** Persist a change; on failure show why and keep the UI as it was. */
  const save = async (changes: Record<string, unknown>, success: string) => {
    if (readOnly) {
      toast.error("Imported legacy tickets are closed and read-only.");
      return false;
    }
    setBusy(true);
    try {
      await ticketsApi.update(ticket.id, changes);
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveOwners = async (next: string[]) => {
    const prev = ownerIds;
    setOwnerIds(next);
    if (!(await save({ assigneeIds: next }, "Owners updated"))) setOwnerIds(prev);
    else setPrimaryOwner(next.includes(primaryOwner ?? "") ? primaryOwner : next[0] ?? null);
  };
  const makePrimaryOwner = async (id: string) => {
    if (id === primaryOwner) return;
    if (await save({ assigneeId: id }, "Primary owner updated")) setPrimaryOwner(id);
  };
  const saveDepts = async (next: string[]) => {
    const prev = deptCodes;
    setDeptCodes(next);
    if (!(await save({ departmentCodes: next }, "Departments updated"))) setDeptCodes(prev);
    else setPrimaryDept(next.includes(primaryDept ?? "") ? primaryDept : next[0] ?? null);
  };
  const makePrimaryDept = async (code: string) => {
    if (code === primaryDept) return;
    if (await save({ departmentCode: code }, "Primary department updated")) setPrimaryDept(code);
  };

  const startWork = async () => {
    if (await save({ status: "in_progress" }, "Work started")) setStatus("in_progress");
  };
  const toggleSlaPause = async () => {
    const next = !slaPaused;
    if (await save({ slaStatus: next ? "paused" : "on_track" }, next ? "SLA paused" : "SLA resumed")) setSlaPaused(next);
  };
  const submitSummary = async () => {
    if (!summaryDraft.trim()) return;
    if (await save({ resolutionSummary: summaryDraft.trim() }, "Resolution summary saved")) setSummaryDraft("");
  };
  const [showResolveDialog, setShowResolveDialog] = React.useState(false);
  const [showExtensionDialog, setShowExtensionDialog] = React.useState(false);
  const [showRequestDialog, setShowRequestDialog] = React.useState(false);
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [resolutionActions, setResolutionActions] = React.useState("");
  const [extensionHours, setExtensionHours] = React.useState(4);
  const [extensionReason, setExtensionReason] = React.useState("");
  const [resolutionLog, setResolutionLog] = React.useState<Array<{ author: string; type: string; content: string; timestamp: string }>>(
    ticket.comments.map(c => ({ author: c.author, type: "comment", content: c.content, timestamp: c.timestamp }))
  );
  const [newLogEntry, setNewLogEntry] = React.useState("");
  const [logEntryType, setLogEntryType] = React.useState("note");

  const assignee = getAssignee(ticket);
  const reporter = getReporter(ticket);
  const studio = getStudio(ticket);

  // Resolution permission - only owner or their reporting manager can resolve
  const isOwner = isTicketOwner(ticket, currentUser.id) || ownerIds.includes(currentUser.id);
  const isManager = currentUser.tier === "admin" || currentUser.tier === "manager";
  const canResolve = isOwner || isManager;

  const logEntry = async (type: string, content: string) => {
    const saved = await ticketsApi.comment(ticket.id, type === "comment" || type === "note" ? content : `[${type.replace(/_/g, " ")}] ${content}`);
    setResolutionLog((log) => [...log, { author: saved.author, type, content, timestamp: saved.timestamp }]);
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await ticketsApi.comment(ticket.id, comment.trim());
      setComment("");
      toast.success("Comment added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add comment");
    } finally {
      setBusy(false);
    }
  };

  const handleAddLogEntry = async () => {
    if (!newLogEntry.trim()) return;
    setBusy(true);
    try {
      await logEntry(logEntryType, newLogEntry.trim());
      setNewLogEntry("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add entry");
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNote.trim()) return;
    const summary = `${resolutionNote.trim()}${resolutionActions ? `\nActions taken: ${resolutionActions.trim()}` : ""}`;
    if (!(await save({ status: "resolved", resolutionSummary: summary }, "Ticket resolved"))) return;
    setStatus("resolved");
    await logEntry("resolution", `Ticket resolved. Summary: ${summary}`).catch(() => {});
    setShowResolveDialog(false);
  };

  const handleExtension = async () => {
    const ok = await save({ extendSlaHours: extensionHours }, `SLA extended by ${extensionHours}h`);
    if (!ok) return;
    await logEntry("sla_extension", `SLA extended +${extensionHours} hours. Reason: ${extensionReason || "Not specified"}`).catch(() => {});
    setShowExtensionDialog(false);
    setExtensionReason("");
    setExtensionHours(4);
  };
  const department = getDepartment(ticket);

  const handleBack = () => {
    selectTicket(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-6 py-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={handleBack}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono">{ticket.ticketId}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">Created {formatDateTime(ticket.createdAt)} ({formatRelativeTime(ticket.createdAt)})</span>
            <div className="ml-auto flex items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              <SLABadge status={ticket.slaStatus} targetDate={ticket.slaResolutionTarget} />
            </div>
          </div>
          <h1 className="text-[18px] font-semibold leading-tight tracking-tight mb-1">{ticket.title}</h1>
          {/* Smart intelligence badges - breach risk, ETA, recurrence */}
          <SmartBadges ticket={ticket} variant="sm" className="mb-1" />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            {studio && <StudioBadge studioCode={studio.code} showCity />}
            {department && <DepartmentBadge departmentCode={department.code} />}
            <span>· Reported by {reporter?.name}</span>
            {ticket.source === "ai_assistant" && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400">
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                AI Created
              </Badge>
            )}
            {ticket.routedByRule && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-indigo-500/5 border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                Rule: {ticket.routedByRule}
              </Badge>
            )}
            {ticket.acknowledgedAt && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                Acknowledged
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto iris-scrollbar">
        <div className="px-6 py-4 max-w-[1600px] mx-auto space-y-3">
          {ticket.requiresAcknowledgment && !ticket.acknowledgedAt && !["resolved", "closed"].includes(ticket.status) && (
            <div className="iris-card p-3 border-l-4 border-l-amber-500 bg-amber-500/5 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[12px]">
                <span className="font-semibold text-amber-700 dark:text-amber-400">Ownership Acknowledgment Required:</span>{" "}
                <span className="text-muted-foreground">
                  Confirm receipt of this ticket to record your first-response timestamp and begin SLA tracking.
                </span>
              </div>
              <Button
                size="sm"
                className="h-7 text-[11px]"
                disabled={busy}
                onClick={() => void save({ acknowledge: true, status: ticket.status === "open" ? "in_progress" : ticket.status }, "Ownership acknowledged")}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Acknowledge Ownership
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            {/* Main Content */}
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/40 h-9">
                  <TabsTrigger value="resolution" className="text-[12px] data-[state=active]:bg-background">
                    <Wrench className="w-3 h-3 mr-1.5" />
                    Resolution Center
                  </TabsTrigger>
                  <TabsTrigger value="details" className="text-[12px] data-[state=active]:bg-background">
                    <FileText className="w-3 h-3 mr-1.5" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-[12px] data-[state=active]:bg-background">
                    <Activity className="w-3 h-3 mr-1.5" />
                    Activity
                    <span className="ml-1 text-[10px] text-muted-foreground">({ticket.activities.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-[12px] data-[state=active]:bg-background">
                    <MessageSquare className="w-3 h-3 mr-1.5" />
                    Comments
                    <span className="ml-1 text-[10px] text-muted-foreground">({ticket.comments.length})</span>
                  </TabsTrigger>
                </TabsList>

                {/* Resolution Center Tab */}
                <TabsContent value="resolution" className="mt-3 space-y-3">
                  {ticket.description && (
                    <div className="iris-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <div className="text-[13px] font-semibold">Issue Description</div>
                      </div>
                      <FormattedText text={ticket.description} className="text-[12px] text-foreground/90" />
                    </div>
                  )}
                  {/* Bike / microphone recurrence check: outcome buttons, or the schedule on the original */}
                  <RecurrencePanel key={`${ticket.id}:${ticket.status}`} ticketId={ticket.id} readOnly={readOnly} />

                  {/* AI Resolution Suggestions - auto-matched KB articles, similar tickets, template */}
                  <AIResolutionSuggestions ticket={ticket} />

                  {/* AI Investigation Panel */}
                  <div className="iris-card iris-ai-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">AI Investigation</div>
                        <div className="text-[10px] text-muted-foreground">Performed by IRIS Investigation Agent</div>
                      </div>
                      <div className="ml-auto text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                        92% Confidence
                      </div>
                    </div>
                    <div className="text-[12px] text-muted-foreground bg-muted/30 rounded-lg p-3 mb-3">
                      <FormattedText text={ticket.investigationNotes} />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Recommended Resolution Steps
                      </div>
                      <div className="text-[12px] text-foreground/90 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                        <FormattedText text={ticket.recommendedResolution} />
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <AdminTicketControls ticket={ticket} onStatus={setStatus} onDeleted={() => selectTicket(null)} />
                  )}

                  {/* Action Buttons - functional */}
                  <div data-tour="ticket-actions" className={cn("grid grid-cols-2 gap-2", isAdmin ? "md:grid-cols-4" : "md:grid-cols-3")}>
                    <ActionButton icon={PlayCircle} label="Start Work" color="violet" onClick={startWork} disabled={readOnly || busy || (status !== "open" && status !== "awaiting_response")} />
                    {isAdmin && <ActionButton icon={PauseCircle} label={slaPaused ? "Resume SLA" : "Pause SLA"} color="amber" onClick={toggleSlaPause} disabled={readOnly || busy} />}
                    {isAdmin ? (
                      <ActionButton icon={Clock} label="Extend SLA" color="sky" onClick={() => setShowExtensionDialog(true)} disabled={readOnly || busy} />
                    ) : (
                      <ActionButton icon={Clock} label="Ask for More Time" color="sky" onClick={() => setShowRequestDialog(true)} disabled={readOnly || busy || status === "resolved" || status === "closed"} />
                    )}
                    <ActionButton icon={CheckCircle2} label="Mark Resolved" color="emerald" onClick={() => setShowResolveDialog(true)} disabled={readOnly || busy || !canResolve || status === "resolved" || status === "closed"} />
                  </div>

                  {readOnly && (
                    <div className="p-2.5 rounded-md bg-muted/40 border border-border flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[11px] text-muted-foreground">Imported from the previous ticketing system. Closed, read-only and exempt from SLAs. You can still add notes.</span>
                    </div>
                  )}

                  {/* Resolve permission notice */}
                  {!canResolve && !readOnly && (
                    <div className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] text-muted-foreground">Only the assigned owner or their reporting manager can resolve this ticket. You are viewing as <span className="font-semibold">{currentUser.role}</span>.</span>
                    </div>
                  )}

                  {/* SLA paused indicator */}
                  {slaPaused && (
                    <div className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20 flex items-center gap-2">
                      <PauseCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">SLA clock paused. Click "Pause SLA" again to resume.</span>
                    </div>
                  )}

                  {/* Resolution Summary */}
                  {ticket.resolutionSummary ? (
                    <div className="iris-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div className="text-[13px] font-semibold">Resolution Summary</div>
                      </div>
                      <FormattedText text={ticket.resolutionSummary} className="text-[12px] text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="iris-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div className="text-[13px] font-semibold">Add Resolution Summary</div>
                      </div>
                      <Textarea
                        placeholder="Document the resolution steps taken, root cause, and any preventive measures..."
                        className="text-[12px] min-h-[80px]"
                        value={summaryDraft}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                        disabled={readOnly}
                      />
                      <Button size="sm" className="mt-2 h-7 text-[12px]" onClick={submitSummary} disabled={readOnly || busy || !summaryDraft.trim()}>
                        <Send className="w-3 h-3 mr-1" />
                        Submit Resolution
                      </Button>
                    </div>
                  )}

                  {/* Quick actions footer */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" className="h-7 text-[12px]">
                      <Link2 className="w-3 h-3 mr-1.5" />
                      Link Related Ticket
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[12px]">
                      <Tag className="w-3 h-3 mr-1.5" />
                      Add Tag
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[12px]">
                      <History className="w-3 h-3 mr-1.5" />
                      View History
                    </Button>
                  </div>

                  {/* Resolution Log - notes, comments, follow-ups */}
                  <div className="iris-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <div className="text-[13px] font-semibold">Resolution Log</div>
                      <span className="text-[10px] text-muted-foreground">({resolutionLog.length} entries)</span>
                    </div>

                    {/* Log entries */}
                    <div className="space-y-2 max-h-[200px] overflow-y-auto mb-3">
                      {resolutionLog.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground italic p-2">No entries yet. Add a note, comment, or follow-up below.</div>
                      ) : (
                        resolutionLog.map((entry, i) => (
                          <div key={i} className="p-2.5 rounded-md border border-border bg-muted/20">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-[9px] font-semibold px-1.5 py-px rounded capitalize",
                                entry.type === "resolution" ? "bg-emerald-500/10 text-emerald-600" :
                                entry.type === "sla_extension" ? "bg-amber-500/10 text-amber-600" :
                                entry.type === "follow_up" ? "bg-violet-500/10 text-violet-600" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {entry.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] font-medium">{entry.author}</span>
                              <span className="text-[9px] text-muted-foreground ml-auto">{formatRelativeTime(entry.timestamp)}</span>
                            </div>
                            <div className="text-[11px] text-foreground/90 leading-relaxed whitespace-pre-line">{entry.content}</div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add new entry */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={logEntryType}
                          onChange={(e) => setLogEntryType(e.target.value)}
                          className="h-7 px-2 text-[11px] rounded-md border border-border bg-card"
                        >
                          <option value="note">Note</option>
                          <option value="comment">Comment</option>
                          <option value="follow_up">Follow-up</option>
                          <option value="observation">Observation</option>
                        </select>
                        <input
                          type="text"
                          value={newLogEntry}
                          onChange={(e) => setNewLogEntry(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddLogEntry(); }}
                          placeholder={`Add a ${logEntryType.replace(/_/g, " ")}...`}
                          className="flex-1 h-7 px-2.5 text-[12px] rounded-md border border-border bg-card focus:outline-none focus:border-primary"
                        />
                        <Button size="sm" className="h-7 text-[11px] px-2" onClick={handleAddLogEntry} disabled={busy || !newLogEntry.trim()}>
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Resolve Dialog */}
                {showResolveDialog && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm" onClick={() => setShowResolveDialog(false)}>
                    <div className="bg-card border border-border rounded-xl max-w-lg w-full p-5 iris-scale-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className="text-[15px] font-semibold">Resolve Ticket</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mb-4">A resolution summary is required. This will be logged and visible to all stakeholders.</div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">Resolution Summary *</label>
                          <textarea
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            placeholder="Describe what was done to resolve this issue..."
                            rows={3}
                            className="w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:border-primary resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">Actions Taken</label>
                          <textarea
                            value={resolutionActions}
                            onChange={(e) => setResolutionActions(e.target.value)}
                            placeholder="Step-by-step actions taken to resolve..."
                            rows={2}
                            className="w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:border-primary resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setShowResolveDialog(false)}>Cancel</Button>
                        <div className="flex-1" />
                        <Button size="sm" className="h-8 text-[12px]" onClick={handleResolve} disabled={!resolutionNote.trim()}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirm Resolution
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLA Extension Dialog */}
                <ExtensionRequestDialog
                  breach={showRequestDialog ? { id: ticket.id, ticketId: ticket.id, title: ticket.title } : null}
                  onClose={() => setShowRequestDialog(false)}
                  onSent={() => setShowRequestDialog(false)}
                />
                {showExtensionDialog && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm" onClick={() => setShowExtensionDialog(false)}>
                    <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 iris-scale-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-sky-500" />
                        <div className="text-[15px] font-semibold">Request SLA Extension</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mb-4">Push the SLA deadline back manually. This will be logged in the resolution log.</div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">Extension Duration (hours)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={1}
                              max={48}
                              value={extensionHours}
                              onChange={(e) => setExtensionHours(Number(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-[14px] font-bold tabular-nums w-16 text-right">{extensionHours}h</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">Reason</label>
                          <textarea
                            value={extensionReason}
                            onChange={(e) => setExtensionReason(e.target.value)}
                            placeholder="Why is the extension needed? (e.g. awaiting vendor, part ordered, etc.)"
                            rows={2}
                            className="w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:border-primary resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setShowExtensionDialog(false)}>Cancel</Button>
                        <div className="flex-1" />
                        <Button size="sm" className="h-8 text-[12px]" onClick={handleExtension}>
                          <Clock className="w-3 h-3 mr-1" />
                          Extend by {extensionHours}h
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Details Tab */}
                <TabsContent value="details" className="mt-3">
                  <div className="iris-card p-4 space-y-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                      <FormattedText text={ticket.description} className="text-[13px] text-foreground/90" />
                    </div>

                    {ticket.businessImpact && (
                      <DetailRow label="Business Impact" value={ticket.businessImpact} />
                    )}
                    {ticket.operationalImpact && (
                      <DetailRow label="Operational Impact" value={ticket.operationalImpact} />
                    )}
                    {ticket.severity && (
                      <DetailRow label="Severity" value={ticket.severity} />
                    )}
                    {ticket.affectedClient && (
                      <DetailRow label="Affected Client" value={ticket.affectedClient} />
                    )}
                    {ticket.clientMomenceId && (
                      <DetailRow label="Momence ID" value={ticket.clientMomenceId} mono />
                    )}
                    {ticket.membershipId && (
                      <DetailRow label="Membership ID" value={ticket.membershipId} mono />
                    )}
                    {ticket.bookingId && (
                      <DetailRow label="Booking ID" value={ticket.bookingId} mono />
                    )}
                    {(ticket.clientMomenceId || ticket.bookingId) && (
                      <MomenceContextPanel clientMomenceId={ticket.clientMomenceId} bookingId={ticket.bookingId} />
                    )}

                    {ticket.tags && ticket.tags.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {ticket.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 text-[11px] rounded-md bg-muted text-muted-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Related Tickets</div>
                        <div className="space-y-1">
                          {ticket.relatedTickets.map((tid) => (
                            <div key={tid} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                              <Link2 className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[12px] font-mono">{tid}</span>
                              <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-3">
                  <div className="iris-card p-4">
                    <div className="relative">
                      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-3">
                        {[...ticket.activities].reverse().map((activity, i) => (
                          <div key={i} className="flex gap-3 relative">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-background",
                              activity.type === "created" ? "bg-violet-500/15 text-violet-500" :
                              activity.type === "assigned" || activity.type === "reassigned" ? "bg-emerald-500/15 text-emerald-500" :
                              activity.type === "escalated" ? "bg-rose-500/15 text-rose-500" :
                              activity.type === "resolved" || activity.type === "closed" ? "bg-emerald-500/15 text-emerald-500" :
                              activity.type === "comment" ? "bg-sky-500/15 text-sky-500" :
                              "bg-amber-500/15 text-amber-500"
                            )}>
                              <Activity className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="text-[12px]">
                                <span className="font-medium">{activity.description}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {activity.actor && <span>{activity.actor} · </span>}
                                {formatDateTime(activity.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-3 space-y-3">
                  <div className="iris-card p-4">
                    {ticket.comments.length === 0 ? (
                      <div className="text-center py-8 text-[12px] text-muted-foreground">
                        No comments yet. Be the first to add one.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ticket.comments.map((c, i) => (
                          <div key={i} className="flex gap-3">
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(c.author))}>
                                {getInitials(c.author)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[12px] font-semibold">{c.author}</span>
                                {c.isInternal ? (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400">
                                    Internal
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-sky-500/5 border-sky-500/20 text-sky-600 dark:text-sky-400">
                                    Client-visible
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">{formatRelativeTime(c.timestamp)}</span>
                              </div>
                              <div className="text-[12px] text-foreground/90 bg-muted/30 rounded-lg p-2.5">
                                {c.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="iris-card p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="ml-auto flex items-center gap-1.5 text-[10px]">
                        <span className="text-muted-foreground">Visibility:</span>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">Internal</Badge>
                      </div>
                    </div>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add an internal comment..."
                      className="text-[12px] min-h-[60px] resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[10px] text-muted-foreground">Markdown supported</div>
                      <Button size="sm" className="h-7 text-[12px]" onClick={postComment} disabled={busy || !comment.trim()}>
                        <Send className="w-3 h-3 mr-1" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              {isAdmin && !["resolved", "closed"].includes(status) && (
                <NudgeCard key={ownerIds.join(",")} ticket={ticket} ownerIds={ownerIds} />
              )}
              {/* Status & Assignee */}
              <div className="iris-card">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status & Assignment</div>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Status</div>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Owners{ownerIds.length > 1 && " (click a chip to make primary)"}</div>
                    <MultiSelect
                      size="md"
                      value={ownerIds}
                      onChange={saveOwners}
                      primary={ownerIds.length > 1 ? primaryOwner : null}
                      onPrimaryChange={ownerIds.length > 1 ? makePrimaryOwner : undefined}
                      disabled={assignmentLocked || busy}
                      placeholder="Unassigned"
                      options={EMPLOYEES.map((e) => ({ value: e.id, label: e.name, hint: e.role }))}
                    />
                    {ticket.assignmentLocked && !isAdmin && <div className="text-[10px] text-muted-foreground mt-1">Imported legacy ticket: owners are locked.</div>}
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Escalation Level</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", ticket.escalationLevel > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, ticket.escalationLevel * 33 + 33)}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums">L{ticket.escalationLevel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Routing */}
              <div className="iris-card">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <GitBranch className="w-3 h-3" />
                    Routing
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Departments</div>
                    <MultiSelect
                      size="md"
                      value={deptCodes}
                      onChange={saveDepts}
                      primary={deptCodes.length > 1 ? primaryDept : null}
                      onPrimaryChange={deptCodes.length > 1 ? makePrimaryDept : undefined}
                      disabled={readOnly || busy}
                      placeholder="None"
                      options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.name, hint: d.code }))}
                    />
                  </div>
                  {studio && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground mb-1">Studio</div>
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <div>
                          <div className="text-[12px] font-medium">{studio.name}</div>
                          <div className="text-[10px] text-muted-foreground">{studio.city}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Routing Rule Applied</div>
                    <div className="text-[11px] p-2 rounded-md bg-violet-500/5 border border-violet-500/20">
                      Auto-assigned by IRIS Routing Agent based on department expertise and workload.
                    </div>
                  </div>
                </div>
              </div>

              {/* SLA */}
              <div className="iris-card">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    SLA Tracking
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground">First Response</span>
                      <span className="text-[10px] font-semibold tabular-nums">{ticket.firstResponseAt ? "Completed" : formatDateTime(ticket.slaResponseTarget || ticket.createdAt)}</span>
                    </div>
                    <SLAProgressBar createdAt={ticket.createdAt} targetDate={ticket.slaResponseTarget || ticket.createdAt} breached={ticket.slaStatus === "breached"} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground">Resolution</span>
                      <span className="text-[10px] font-semibold tabular-nums">{formatDateTime(ticket.slaResolutionTarget || ticket.createdAt)}</span>
                    </div>
                    <SLAProgressBar createdAt={ticket.createdAt} targetDate={ticket.slaResolutionTarget || ticket.createdAt} breached={ticket.slaStatus === "breached"} />
                  </div>
                </div>
              </div>

              {/* Ticket facts */}
              <div className="iris-card">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Ticket Details
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <FactRow icon={Hash} label="Ticket ID" value={ticket.ticketId} mono />
                  <FactRow icon={Tag} label="Category" value={ticket.category || "Uncategorised"} />
                  {ticket.subcategory && <FactRow icon={ChevronRight} label="Sub-category" value={ticket.subcategory} />}
                  <FactRow icon={Sparkles} label="Source" value={ticket.source.replace(/_/g, " ")} />
                  <FactRow icon={Clock} label="Created" value={formatDateTime(ticket.createdAt)} />
                  <FactRow icon={History} label="Last updated" value={formatRelativeTime(ticket.updatedAt || ticket.createdAt)} />
                  {ticket.affectedClient && <FactRow icon={User} label="Client" value={ticket.affectedClient} />}
                  {ticket.clientMomenceId && <FactRow icon={Link2} label="Momence ID" value={ticket.clientMomenceId} mono />}
                </div>
              </div>

              {/* Engagement */}
              <div className="iris-card p-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatTile icon={MessageSquare} label="Comments" value={ticket.comments.length} />
                  <StatTile icon={Activity} label="Events" value={ticket.activities.length} />
                  <StatTile icon={Users} label="Owners" value={ownerIds.length} />
                </div>
              </div>

              {/* Reporter */}
              <div className="iris-card">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Reporter
                  </div>
                </div>
                <div className="p-3">
                  {reporter && (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(reporter.name))}>
                          {getInitials(reporter.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate">{reporter.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{reporter.role}</div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    Created {formatRelativeTime(ticket.createdAt)} via {ticket.source.replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div className="iris-card">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />
                      Tags
                    </div>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1">
                    {ticket.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-[11px] rounded-md bg-muted text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {ticket.activities.length > 0 && (
                <div className="iris-card">
                  <div className="px-3 py-2 border-b border-border flex items-center">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Timer className="w-3 h-3" />
                      Recent Activity
                    </div>
                    <button type="button" onClick={() => setActiveTab("activity")} className="ml-auto text-[10px] text-primary hover:underline">
                      View all
                    </button>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {[...ticket.activities].reverse().slice(0, 5).map((a, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] leading-snug line-clamp-2">{a.description}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            {a.actor ? `${a.actor} · ` : ""}{formatRelativeTime(a.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <div className="text-[11px] font-medium text-muted-foreground pt-0.5">{label}</div>
      <div className={cn("text-[12px] leading-relaxed", mono && "font-mono text-[11px]")}>{value}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, color, onClick, disabled }: { icon: React.ComponentType<{ className?: string }>; label: string; color: "violet" | "amber" | "sky" | "emerald"; onClick?: () => void; disabled?: boolean }) {
  const colors = {
    violet: "border-violet-500/30 hover:bg-violet-500/5 hover:border-violet-500/50 text-violet-600 dark:text-violet-400",
    amber: "border-amber-500/30 hover:bg-amber-500/5 hover:border-amber-500/50 text-amber-600 dark:text-amber-400",
    sky: "border-sky-500/30 hover:bg-sky-500/5 hover:border-sky-500/50 text-sky-600 dark:text-sky-400",
    emerald: "border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg border bg-card transition-all", colors[color], disabled && "opacity-40 cursor-not-allowed hover:bg-card hover:border-current")}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function FactRow({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn("flex-1 min-w-0 truncate text-right font-medium capitalize", mono && "font-mono normal-case")}>{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 py-2">
      <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
      <div className="text-[15px] font-semibold tabular-nums mt-0.5">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/** Admin-only: send an instant in-app nudge asking owners to close the ticket on priority. */
function NudgeCard({ ticket, ownerIds }: { ticket: Ticket; ownerIds: string[] }) {
  const [targets, setTargets] = React.useState<string[]>(ownerIds);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    if (!targets.length) {
      toast.error("Pick at least one person to nudge");
      return;
    }
    setSending(true);
    try {
      const res = await ticketsApi.nudge(ticket.id, { employeeIds: targets, message: message.trim() || undefined });
      if (res.sent.length) toast.success(`Nudge sent to ${res.sent.join(", ")}`);
      if (res.skipped.length) toast.warning(`No IRIS login for ${res.skipped.join(", ")}, nudge not delivered`);
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send nudge");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="iris-card border-l-4 border-l-rose-500">
      <div className="px-3 py-2 border-b border-border">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <BellRing className="w-3 h-3" />
          Nudge to Close
        </div>
      </div>
      <div className="p-3 space-y-2">
        <MultiSelect
          size="md"
          value={targets}
          onChange={setTargets}
          placeholder="Choose who to nudge"
          options={EMPLOYEES.map((e) => ({ value: e.id, label: e.name, hint: e.role }))}
        />
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message, e.g. client is waiting, please close today"
          className="text-[12px] min-h-[52px] resize-none"
        />
        <Button size="sm" className="w-full h-8 text-[12px] bg-rose-600 hover:bg-rose-700 text-white" onClick={send} disabled={sending || !targets.length}>
          <BellRing className="w-3.5 h-3.5 mr-1.5" />
          {sending ? "Sending..." : "Send instant nudge"}
        </Button>
      </div>
    </div>
  );
}
