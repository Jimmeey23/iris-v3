"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { Ticket, getAssignee, getReporter, getStudio, getDepartment } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, EMPLOYEE_MAP, Priority, TicketStatus } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge, SLAProgressBar, StudioBadge, DepartmentBadge } from "../badges";
import { formatRelativeTime, formatDateTime, getInitials, getAvatarColor } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  PaperPlaneRight,
} from "lucide-react";

export function TicketWorkspace({ ticket }: { ticket: Ticket }) {
  const { selectTicket, setCurrentView } = useAppStore();
  const [activeTab, setActiveTab] = React.useState("resolution");
  const [comment, setComment] = React.useState("");
  const [status, setStatus] = React.useState<TicketStatus>(ticket.status);

  const assignee = getAssignee(ticket);
  const reporter = getReporter(ticket);
  const studio = getStudio(ticket);
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
            <span className="text-[11px] text-muted-foreground">Created {formatRelativeTime(ticket.createdAt)}</span>
            <div className="ml-auto flex items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              <SLABadge status={ticket.slaStatus} targetDate={ticket.slaResolutionTarget} />
            </div>
          </div>
          <h1 className="text-[18px] font-semibold leading-tight tracking-tight mb-1">{ticket.title}</h1>
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
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto iris-scrollbar">
        <div className="px-6 py-4 max-w-[1600px] mx-auto">
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
                    <div className="text-[12px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 mb-3 whitespace-pre-line">
                      {ticket.investigationNotes}
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Recommended Resolution Steps
                      </div>
                      <div className="text-[12px] text-foreground/90 leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 whitespace-pre-line">
                        {ticket.recommendedResolution}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <ActionButton icon={PlayCircle} label="Start Work" color="violet" />
                    <ActionButton icon={PauseCircle} label="Pause SLA" color="amber" />
                    <ActionButton icon={Shield} label="Request Approval" color="sky" />
                    <ActionButton icon={CheckCircle2} label="Mark Resolved" color="emerald" />
                  </div>

                  {/* Resolution Summary */}
                  {ticket.resolutionSummary ? (
                    <div className="iris-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div className="text-[13px] font-semibold">Resolution Summary</div>
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{ticket.resolutionSummary}</p>
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
                      />
                      <Button size="sm" className="mt-2 h-7 text-[12px]">
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
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="mt-3">
                  <div className="iris-card p-4 space-y-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                      <p className="text-[13px] text-foreground/90 leading-relaxed">{ticket.description}</p>
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
                      <Button variant="outline" size="sm" className="h-7 text-[11px]">
                        <Paperclip className="w-3 h-3 mr-1" />
                        Attach
                      </Button>
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
                      <Button size="sm" className="h-7 text-[12px]" disabled={!comment.trim()}>
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
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Assignee</div>
                    {assignee ? (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(assignee.name))}>
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium truncate">{assignee.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{assignee.role}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground italic p-2">Unassigned</div>
                    )}
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
                  {department && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground mb-1">Department</div>
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[12px] font-medium">{department.name}</span>
                      </div>
                    </div>
                  )}
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
                    Created {formatRelativeTime(ticket.createdAt)} via {ticket.source.replace("_", " ")}
                  </div>
                </div>
              </div>
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

function ActionButton({ icon: Icon, label, color }: { icon: React.ComponentType<{ className?: string }>; label: string; color: "violet" | "amber" | "sky" | "emerald" }) {
  const colors = {
    violet: "border-violet-500/30 hover:bg-violet-500/5 hover:border-violet-500/50 text-violet-600 dark:text-violet-400",
    amber: "border-amber-500/30 hover:bg-amber-500/5 hover:border-amber-500/50 text-amber-600 dark:text-amber-400",
    sky: "border-sky-500/30 hover:bg-sky-500/5 hover:border-sky-500/50 text-sky-600 dark:text-sky-400",
    emerald: "border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <button className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg border bg-card transition-all", colors[color])}>
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
