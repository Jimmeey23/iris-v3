"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TicketDetailData, AssigneeDetail, CandidateAssignee } from "@/lib/iris/ticket-detail-builder";
import { PRIORITY_CONFIG } from "@/lib/iris/types";
import { useAppStore } from "@/lib/iris/store";
import { getInitials, getAvatarColor } from "@/lib/iris/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  X,
  Ticket as TicketIcon,
  Building2,
  User,
  Clock,
  Shield,
  Brain,
  GitBranch,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Target,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Cpu,
  Search,
  FileText,
  ListChecks,
  Network,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Tag,
  Link2,
  History,
  ShieldCheck,
  Lock,
  Unlock,
  Award,
  Users,
  Briefcase,
  Layers,
  Gauge,
  PauseCircle,
  RefreshCw,
} from "lucide-react";

export function TicketPreviewModal({
  data,
  onClose,
  onCreate,
}: {
  data: TicketDetailData;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const priorityConfig = PRIORITY_CONFIG[data.priority];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col iris-shadow-hero iris-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-transparent shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
              <TicketIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{data.ticketId}</span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", priorityConfig.bg, priorityConfig.text)}>
                  {data.priority}
                </span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                  AI-Generated
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  Ready to Create
                </Badge>
              </div>
              <h2 className="text-[16px] font-semibold leading-tight pr-8">{data.title}</h2>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{data.studio || "—"}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{data.routing.department}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{data.routing.selectedAssignee?.name}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />SLA: {data.sla.responseTarget} response</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 border-b border-border shrink-0">
            <TabsList className="bg-muted/40 h-9 flex-wrap">
              <TabsTrigger value="overview" className="text-[12px] data-[state=active]:bg-background">
                <Layers className="w-3 h-3 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="investigation" className="text-[12px] data-[state=active]:bg-background">
                <Search className="w-3 h-3 mr-1.5" />
                Investigation
              </TabsTrigger>
              <TabsTrigger value="routing" className="text-[12px] data-[state=active]:bg-background">
                <GitBranch className="w-3 h-3 mr-1.5" />
                Routing & Assignment
              </TabsTrigger>
              <TabsTrigger value="sla" className="text-[12px] data-[state=active]:bg-background">
                <Clock className="w-3 h-3 mr-1.5" />
                SLA & Priority
              </TabsTrigger>
              <TabsTrigger value="resolution" className="text-[12px] data-[state=active]:bg-background">
                <ListChecks className="w-3 h-3 mr-1.5" />
                Resolution
              </TabsTrigger>
              <TabsTrigger value="risk" className="text-[12px] data-[state=active]:bg-background">
                <AlertTriangle className="w-3 h-3 mr-1.5" />
                Risk & Related
              </TabsTrigger>
              <TabsTrigger value="connected" className="text-[12px] data-[state=active]:bg-background">
                <Link2 className="w-3 h-3 mr-1.5" />
                Connected
              </TabsTrigger>
              {data.recurrence && (
                <TabsTrigger value="recurrence" className="text-[12px] data-[state=active]:bg-background">
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Recurrence
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto iris-scrollbar p-5">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab data={data} />
            </TabsContent>
            <TabsContent value="investigation" className="mt-0">
              <InvestigationTab data={data} />
            </TabsContent>
            <TabsContent value="routing" className="mt-0">
              <RoutingTab data={data} />
            </TabsContent>
            <TabsContent value="sla" className="mt-0">
              <SLATab data={data} />
            </TabsContent>
            <TabsContent value="resolution" className="mt-0">
              <ResolutionTab data={data} />
            </TabsContent>
            <TabsContent value="risk" className="mt-0">
              <RiskTab data={data} />
            </TabsContent>
            <TabsContent value="connected" className="mt-0">
              <ConnectedTab data={data} />
            </TabsContent>
            {data.recurrence && (
              <TabsContent value="recurrence" className="mt-0">
                <RecurrenceTab data={data} />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Authorization: <span className="font-semibold text-foreground">{data.resolution.approvalRequired.length > 0 ? "Approvals Required" : "Auto-approved"}</span></span>
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="h-8 text-[12px]">
              <FileText className="w-3 h-3 mr-1.5" />
              Save Draft
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]">
              <AlertTriangle className="w-3 h-3 mr-1.5" />
              Escalate Now
            </Button>
            <Button size="sm" className="h-8 text-[12px] iris-btn-premium iris-action-shimmer" onClick={onCreate}>
              <CheckCircle2 className="w-3 h-3 mr-1.5" />
              Create & Route Ticket
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === OVERVIEW TAB ===

function OverviewTab({ data }: { data: TicketDetailData }) {
  return (
    <div className="space-y-4">
      {/* Issue Summary */}
      <Section title="Issue Summary" icon={FileText}>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title</div>
            <div className="text-[14px] font-semibold leading-tight p-2.5 rounded-md bg-muted/30 border border-border">{data.title}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
            <div className="text-[12px] text-foreground/90 leading-relaxed p-2.5 rounded-md bg-muted/30 border border-border">{data.description}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <InfoBox label="Category" value={data.category} icon={Tag} />
            <InfoBox label="Subcategory" value={data.subcategory || "—"} icon={Layers} />
            <InfoBox label="Source" value={data.source} icon={Sparkles} />
          </div>
        </div>
      </Section>

      {/* Impact Assessment */}
      <Section title="Impact Assessment" icon={AlertTriangle}>
        <div className="space-y-2">
          <ImpactRow label="Business Impact" value={data.businessImpact} color="violet" />
          <ImpactRow label="Operational Impact" value={data.operationalImpact} color="amber" />
          <ImpactRow label="Client Impact" value={data.clientImpact} color="sky" />
          {data.financialImpact && <ImpactRow label="Financial Impact" value={data.financialImpact} color="emerald" icon={DollarSign} />}
        </div>
      </Section>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Location & Studio" icon={Building2}>
          <div className="space-y-2">
            <DetailRow icon={Building2} label="Studio" value={data.studio || "—"} />
            <DetailRow icon={Building2} label="City" value={data.studioCity || "—"} />
            <DetailRow icon={Layers} label="Specific Location" value={data.location || "—"} />
          </div>
        </Section>

        <Section title="Client Information" icon={User}>
          {data.affectedClient ? (
            <div className="space-y-2">
              <DetailRow icon={User} label="Client Name" value={data.affectedClient} />
              <DetailRow icon={Tag} label="Momence ID" value={data.clientMomenceId || "—"} mono />
              {data.clientContact && <DetailRow icon={Phone} label="Contact" value={data.clientContact} />}
              {data.membershipType && <DetailRow icon={Award} label="Membership" value={data.membershipType} />}
              {data.membershipId && <DetailRow icon={Tag} label="Membership ID" value={data.membershipId} mono />}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground italic p-2">No specific client affected</div>
          )}
        </Section>

        {data.paymentAmount && (
          <Section title="Payment Details" icon={DollarSign}>
            <div className="space-y-2">
              <DetailRow icon={DollarSign} label="Amount" value={data.paymentAmount} />
              <DetailRow icon={Tag} label="Method" value={data.paymentMethod || "—"} />
              {data.paymentReference && <DetailRow icon={Tag} label="Reference" value={data.paymentReference} mono />}
            </div>
          </Section>
        )}

        {(data.sessionTime || data.instructor) && (
          <Section title="Session Details" icon={Calendar}>
            <div className="space-y-2">
              {data.sessionTime && <DetailRow icon={Clock} label="Session Time" value={data.sessionTime} />}
              {data.instructor && <DetailRow icon={User} label="Instructor" value={data.instructor} />}
              {data.bookingId && <DetailRow icon={Tag} label="Booking ID" value={data.bookingId} mono />}
            </div>
          </Section>
        )}

        <Section title="Severity & Scope" icon={Gauge}>
          <div className="space-y-2">
            <DetailRow icon={AlertTriangle} label="Severity" value={data.severity || "—"} />
            <DetailRow icon={Clock} label="Duration" value={data.duration || "—"} />
            <DetailRow icon={Users} label="Affected Count" value={data.affectedCount || "—"} />
          </div>
        </Section>

        <Section title="Tags" icon={Tag}>
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-[10px] rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

// === INVESTIGATION TAB ===

function InvestigationTab({ data }: { data: TicketDetailData }) {
  const inv = data.investigation;
  return (
    <div className="space-y-4">
      {/* Confidence Summary */}
      <Section title="Investigation Confidence" icon={Brain}>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 iris-ring" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" stroke="var(--muted)" />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="url(#conf-grad)"
                strokeDasharray={`${(inv.confidenceScore / 100) * 226} 226`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="conf-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-[18px] font-bold tabular-nums">{inv.confidenceScore}%</span>
              <span className="text-[8px] text-muted-foreground uppercase tracking-wider">confidence</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {inv.confidenceBreakdown.map((cf, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-[10px] text-muted-foreground w-28 truncate">{cf.factor}</div>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${cf.contribution}%` }} />
                </div>
                <div className="text-[10px] font-semibold tabular-nums w-8 text-right">{cf.contribution}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 p-2.5 rounded-md bg-violet-500/5 border border-violet-500/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">Evidence Quality</div>
          <div className="text-[11px] text-foreground/90">
            {inv.evidenceQuality === "verified" && "✓ Verified via external API (Momence)"}
            {inv.evidenceQuality === "user_reported" && "○ User-reported — not yet externally verified"}
            {inv.evidenceQuality === "ai_hypothesis" && "△ AI-generated hypothesis — requires verification"}
          </div>
        </div>
      </Section>

      {/* Investigation Steps */}
      <Section title="Investigation Trail" icon={ListChecks} subtitle={`${inv.steps.length} steps executed by multi-agent system`}>
        <div className="relative">
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-2">
            {inv.steps.map((step, i) => (
              <div key={i} className="flex gap-3 relative">
                <div className="w-8 h-8 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 ring-4 ring-background text-[11px] font-bold tabular-nums">
                  {step.step}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold">{step.agent}</span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{(step.duration / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="text-[11px] text-foreground/90 mb-0.5">{step.action}</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/5 px-2 py-0.5 rounded inline-block">
                    → {step.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Tools Executed */}
      <Section title="Tool Execution" icon={Cpu} subtitle={`${inv.toolsExecuted.length} tools executed · ${inv.toolsExecuted.reduce((s, t) => s + t.apiCalls, 0)} API calls`}>
        <div className="space-y-1.5">
          {inv.toolsExecuted.map((tool, i) => (
            <div key={i} className="p-2.5 rounded-md border border-border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-medium font-mono flex-1 truncate">{tool.name}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1">{tool.provider}</Badge>
                <span className="text-[9px] text-muted-foreground tabular-nums">{(tool.duration / 1000).toFixed(1)}s</span>
                <span className="text-[9px] text-muted-foreground tabular-nums">{tool.apiCalls} API calls</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono ml-5">
                <div className="truncate"><span className="text-muted-foreground/60">in:</span> {tool.input}</div>
                <div className="truncate text-emerald-600 dark:text-emerald-400"><span className="text-muted-foreground/60">out:</span> {tool.output}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Findings */}
      <Section title="Findings" icon={Search} subtitle={`${inv.findings.length} findings from investigation`}>
        <div className="space-y-1.5">
          {inv.findings.map((finding, i) => (
            <div key={i} className="p-2.5 rounded-md border border-border bg-card">
              <div className="flex items-start gap-2">
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5",
                  finding.type === "verified_fact" ? "bg-emerald-500/15 text-emerald-600" :
                  finding.type === "historical_pattern" ? "bg-sky-500/15 text-sky-600" :
                  finding.type === "user_reported" ? "bg-amber-500/15 text-amber-600" :
                  "bg-violet-500/15 text-violet-600"
                )}>
                  {finding.type === "verified_fact" ? <CheckCircle2 className="w-3 h-3" /> :
                   finding.type === "historical_pattern" ? <History className="w-3 h-3" /> :
                   finding.type === "user_reported" ? <User className="w-3 h-3" /> :
                   <Brain className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium mb-0.5">{finding.description}</div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span className="uppercase tracking-wider font-semibold">{finding.type.replace(/_/g, " ")}</span>
                    <span>·</span>
                    <span>Source: {finding.source}</span>
                    <span>·</span>
                    <span className="font-semibold tabular-nums">{finding.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Data Sources */}
      <Section title="Data Sources Consulted" icon={Network}>
        <div className="flex flex-wrap gap-1.5">
          {inv.dataSources.map((src) => (
            <span key={src} className="px-2 py-1 text-[10px] rounded-md bg-muted text-muted-foreground font-medium flex items-center gap-1">
              <Network className="w-2.5 h-2.5" />
              {src}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

// === ROUTING TAB ===

function RoutingTab({ data }: { data: TicketDetailData }) {
  const r = data.routing;
  return (
    <div className="space-y-4">
      {/* Routing Path */}
      <Section title="Routing Decision Path" icon={GitBranch} subtitle="How IRIS routed this ticket">
        <div className="flex items-center flex-wrap gap-1">
          {r.routingPath.map((step, i) => (
            <React.Fragment key={i}>
              <div className="px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                {step}
              </div>
              {i < r.routingPath.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </Section>

      {/* Department */}
      <Section title="Department Routing" icon={Building2}>
        <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">{r.department}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{r.departmentCode}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">Routing Confidence</div>
              <div className="text-[14px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">{r.routingConfidence}%</div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">{r.departmentDescription}</div>
        </div>
        <div className="mt-2 p-2.5 rounded-md bg-muted/30 border border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Routing Reasoning</div>
          <div className="text-[11px] text-foreground/90 leading-relaxed">{r.routingReasoning}</div>
        </div>
      </Section>

      {/* Lead Owner + Co-Owners */}
      <Section title="Lead Owner & Co-Owners" icon={User} subtitle="Lead owner is responsible; co-owners collaborate on resolution">
        <AssigneeCard assignee={r.selectedAssignee} selected />
        {r.coOwners && r.coOwners.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Co-Owners</div>
            {r.coOwners.map((co, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(co.name))}>
                    {getInitials(co.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium">{co.name}</div>
                  <div className="text-[10px] text-muted-foreground">{co.role} · Match: {co.matchScore}%</div>
                </div>
                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-muted">Co-Owner</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Candidate Comparison */}
      <Section title="Candidate Assignee Analysis" icon={Users} subtitle={`${r.candidateAssignees.length} candidates evaluated by IRIS Routing Agent`}>
        <div className="overflow-x-auto iris-scrollbar">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="text-left py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Match Score</th>
                <th className="text-left py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Workload</th>
                <th className="text-left py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Availability</th>
                <th className="text-left py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Match Reasons</th>
                <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Selected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.candidateAssignees.map((c) => (
                <tr key={c.id} className={cn("hover:bg-muted/30 transition-colors", c.selected && "bg-violet-500/5")}>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className={cn("text-white text-[9px] font-semibold", getAvatarColor(c.name))}>
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-[11px] font-medium">{c.name}</div>
                        <div className="text-[9px] text-muted-foreground">{c.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", c.matchScore > 80 ? "bg-emerald-500" : c.matchScore > 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${c.matchScore}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums">{c.matchScore}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", c.workloadPercentage > 80 ? "bg-rose-500" : c.workloadPercentage > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${c.workloadPercentage}%` }} />
                      </div>
                      <span className="text-[9px] tabular-nums">{c.workload}/{c.maxWorkload}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium",
                      c.availability === "available" ? "bg-emerald-500/10 text-emerald-600" :
                      c.availability === "busy" ? "bg-amber-500/10 text-amber-600" :
                      "bg-rose-500/10 text-rose-600"
                    )}>
                      {c.availability.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="text-[9px] text-muted-foreground leading-tight max-w-[180px]">
                      {c.matchReasons.join(" · ")}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    {c.selected ? (
                      <CheckCircle2 className="w-4 h-4 text-violet-600 mx-auto" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-muted-foreground/30 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Routing Rules Applied */}
      <Section title="Routing Rules Applied" icon={ListChecks} subtitle={`${r.routingRulesApplied.filter(rule => rule.matched).length} rules matched`}>
        <div className="space-y-1.5">
          {r.routingRulesApplied.map((rule) => (
            <div key={rule.id} className={cn(
              "flex items-center gap-3 p-2.5 rounded-md border",
              rule.matched ? "border-emerald-500/20 bg-emerald-500/5" : "border-border opacity-60"
            )}>
              <div className={cn(
                "w-5 h-5 rounded flex items-center justify-center shrink-0",
                rule.matched ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
              )}>
                {rule.matched ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium">{rule.name}</div>
                <div className="text-[9px] text-muted-foreground font-mono">{rule.condition}</div>
              </div>
              <Badge variant="outline" className="text-[9px] h-4 px-1 tabular-nums">P{rule.priority}</Badge>
              <span className="text-[9px] font-mono text-muted-foreground">{rule.id}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Escalation Chain */}
      <Section title="Escalation Chain" icon={TrendingUp} subtitle="Automatic escalation if SLA breached">
        <div className="space-y-1.5">
          {r.escalationChain.map((esc, i) => (
            <div key={i} className={cn(
              "flex items-center gap-3 p-2.5 rounded-md border",
              i === 0 ? "border-violet-500/30 bg-violet-500/5" : "border-border"
            )}>
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold",
                i === 0 ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                L{esc.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium">{esc.assignee}</div>
                <div className="text-[9px] text-muted-foreground">{esc.role}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-muted-foreground">{esc.trigger}</div>
                <div className="text-[10px] font-semibold tabular-nums">{esc.timeframe}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Secondary Stakeholders */}
      {r.secondaryStakeholders.length > 0 && (
        <Section title="Secondary Stakeholders" icon={Users} subtitle="Kept informed but not directly responsible">
          <div className="space-y-1.5">
            {r.secondaryStakeholders.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(s.name))}>
                    {getInitials(s.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium">{s.name}</div>
                  <div className="text-[9px] text-muted-foreground">{s.role} · {s.department}</div>
                </div>
                <div className="text-[9px] text-muted-foreground max-w-[200px] text-right">{s.reason}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// === SLA TAB ===

function SLATab({ data }: { data: TicketDetailData }) {
  const sla = data.sla;
  return (
    <div className="space-y-4">
      {/* Priority Score */}
      <Section title="Priority Calculation" icon={Gauge} subtitle="How IRIS determined the priority level">
        <div className="flex items-center gap-4 mb-3">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 iris-ring" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="42" stroke="var(--muted)" />
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="url(#prio-grad)"
                strokeDasharray={`${(sla.priorityScore / 100) * 264} 264`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="prio-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-[22px] font-bold tabular-nums">{sla.priorityScore}</span>
              <span className="text-[8px] text-muted-foreground uppercase tracking-wider">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground mb-1">Computed Priority</div>
            <div className={cn("text-[24px] font-bold mb-1", PRIORITY_CONFIG[data.priority].text)}>
              {data.priority}
            </div>
            <div className="text-[10px] text-muted-foreground">{PRIORITY_CONFIG[data.priority].description}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {sla.priorityFactors.map((f, i) => (
            <div key={i} className="p-2 rounded-md bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium">{f.factor}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground tabular-nums">Weight: {f.weight}</span>
                  <span className="text-[10px] font-bold tabular-nums text-violet-600 dark:text-violet-400">{f.score}/{f.weight}</span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${(f.score / f.weight) * 100}%` }} />
              </div>
              <div className="text-[9px] text-muted-foreground">{f.reasoning}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* SLA Targets */}
      <Section title="SLA Targets" icon={Clock}>
        <div className="grid grid-cols-2 gap-3">
          <SLATargetCard
            label="First Response"
            target={sla.responseTarget}
            mins={sla.responseTargetMins}
            icon={Zap}
            color="violet"
          />
          <SLATargetCard
            label="Resolution"
            target={sla.resolutionTarget}
            mins={sla.resolutionTargetMins}
            icon={CheckCircle2}
            color="emerald"
          />
          <SLATargetCard
            label="Escalation Threshold"
            target={sla.escalationThreshold}
            mins={Math.floor(sla.responseTargetMins * 1.5)}
            icon={AlertTriangle}
            color="amber"
          />
          <SLATargetCard
            label="Business Hours"
            target={sla.businessHoursOnly ? `${sla.businessHoursStart}–${sla.businessHoursEnd}` : "24/7"}
            mins={0}
            icon={Clock}
            color="sky"
          />
        </div>
      </Section>

      {/* SLA Calculation */}
      <Section title="SLA Calculation Details" icon={Brain}>
        <div className="p-3 rounded-md bg-muted/30 border border-border text-[11px] text-foreground/90 leading-relaxed">
          {sla.slaCalculation}
        </div>
      </Section>

      {/* Pause Conditions */}
      <Section title="SLA Pause Conditions" icon={PauseCircle}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sla.pauseConditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border">
              <div className="w-5 h-5 rounded bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <PauseCircle className="w-3 h-3" />
              </div>
              <span className="text-[11px]">{cond}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Holiday Calendar */}
      <Section title="Holiday Calendar" icon={Calendar}>
        <div className="p-2.5 rounded-md bg-muted/30 border border-border">
          <div className="text-[11px] font-medium mb-0.5">{sla.holidayCalendar}</div>
          <div className="text-[10px] text-muted-foreground">SLA automatically pauses on declared holidays. Next holiday: Diwali (Nov 12, 2026)</div>
        </div>
      </Section>
    </div>
  );
}

// === RESOLUTION TAB ===

function ResolutionTab({ data }: { data: TicketDetailData }) {
  const res = data.resolution;
  const perms = data.resolutionPermissions;
  return (
    <div className="space-y-4">
      {/* Resolution Permissions Banner */}
      <div className={cn(
        "p-3 rounded-lg border",
        perms.canEdit ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
      )}>
        <div className="flex items-start gap-2">
          {perms.canEdit ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
          <div>
            <div className="text-[12px] font-semibold mb-0.5">
              {perms.canEdit ? "You can edit resolution fields" : "Resolution fields are read-only"}
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">{perms.canEditReason}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] text-muted-foreground">Your role:</span>
              <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-muted">{perms.currentUserRole}</span>
              <span className="text-[9px] text-muted-foreground">· Allowed:</span>
              {perms.allowedRoles.map((r) => (
                <span key={r} className="text-[9px] font-medium px-1 py-px rounded bg-emerald-500/10 text-emerald-600">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Path */}
      <Section title="Resolution Path" icon={GitBranch}>
        <div className="p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[12px] font-semibold">Estimated Resolution: {res.estimatedResolutionTime}</span>
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">{res.resolutionPath}</div>
          {res.autoResolutionPossible ? (
            <div className="mt-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-3 h-3 inline mr-1" />
              {res.autoResolutionReason}
            </div>
          ) : (
            <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {res.autoResolutionReason}
            </div>
          )}
        </div>
      </Section>

      {/* Recommended Actions */}
      <Section title="Recommended Actions" icon={ListChecks} subtitle={`${res.recommendedActions.length} steps to resolve`}>
        <div className="space-y-1.5">
          {res.recommendedActions.map((action, i) => (
            <div key={i} className="p-3 rounded-md border border-border bg-card">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0 text-[11px] font-bold tabular-nums">
                  {action.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium mb-1">{data.action}</div>
                  <div className="text-[11px] text-foreground/90">{action.action}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{action.owner}</span>
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{action.estimatedDuration}</span>
                    <span className="flex items-center gap-1">
                      {action.approvalLevel === "none" ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      {action.approvalLevel === "none" ? "No approval needed" : `${action.approvalLevel} approval`}
                    </span>
                  </div>
                </div>
                {action.required && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-violet-500/10 text-violet-600 border-violet-500/20">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Required Resources */}
      <Section title="Required Resources" icon={Briefcase} subtitle={`${res.requiredResources.length} resources needed`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {res.requiredResources.map((resource, i) => (
            <div key={i} className="p-2.5 rounded-md border border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                  resource.type === "person" ? "bg-violet-500/15 text-violet-600" :
                  resource.type === "vendor" ? "bg-amber-500/15 text-amber-600" :
                  resource.type === "system" ? "bg-sky-500/15 text-sky-600" :
                  resource.type === "budget" ? "bg-emerald-500/15 text-emerald-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {resource.type === "person" ? <User className="w-3.5 h-3.5" /> :
                   resource.type === "vendor" ? <Briefcase className="w-3.5 h-3.5" /> :
                   resource.type === "system" ? <Cpu className="w-3.5 h-3.5" /> :
                   resource.type === "budget" ? <DollarSign className="w-3.5 h-3.5" /> :
                   <Tag className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium">{resource.name}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{resource.type}</div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">{resource.description}</div>
              <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {resource.availability}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Approval Requirements */}
      {res.approvalRequired.length > 0 && (
        <Section title="Approval Requirements" icon={ShieldCheck} subtitle={`${res.approvalRequired.length} approvals needed before execution`}>
          <div className="space-y-1.5">
            {res.approvalRequired.map((approval, i) => (
              <div key={i} className="p-2.5 rounded-md border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium mb-0.5">{approval.action}</div>
                    <div className="text-[10px] text-muted-foreground">{approval.reason}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-600 border-amber-500/20 capitalize">
                        {approval.level} approval
                      </Badge>
                      <span className="text-[9px] text-muted-foreground">Approver: {approval.approver}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Resolution Fields (with permissions) */}
      <Section title="Resolution Fields" icon={FileText} subtitle={perms.canEdit ? "Editable — you are the assigned owner or manager" : "Read-only — only the assigned owner or reporting manager can edit"}>
        <div className="space-y-2">
          {perms.fields.map((field) => (
            <div key={field.name} className="p-2.5 rounded-md border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-medium flex-1">{field.label}</span>
                {field.editable ? (
                  <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-emerald-500/10 text-emerald-600 flex items-center gap-0.5">
                    <Unlock className="w-2.5 h-2.5" /> Editable
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Read-only
                  </span>
                )}
              </div>
              {field.editable ? (
                <textarea
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="w-full text-[11px] px-2 py-1.5 rounded border border-border bg-card focus:outline-none focus:border-primary resize-none"
                  rows={2}
                />
              ) : (
                <div className="text-[10px] text-muted-foreground italic px-2 py-1.5 rounded bg-muted/30">
                  Field locked — awaiting owner input upon resolution
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// === RISK TAB ===

function RiskTab({ data }: { data: TicketDetailData }) {
  const risk = data.risk;
  return (
    <div className="space-y-4">
      {/* Risk Score */}
      <Section title="Risk Assessment" icon={AlertTriangle}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0",
            risk.level === "critical" ? "bg-rose-500/15 text-rose-600" :
            risk.level === "high" ? "bg-amber-500/15 text-amber-600" :
            risk.level === "medium" ? "bg-sky-500/15 text-sky-600" :
            "bg-emerald-500/15 text-emerald-600"
          )}>
            <span className="text-[20px] font-bold tabular-nums">{risk.score}</span>
            <span className="text-[8px] uppercase tracking-wider font-semibold">{risk.level}</span>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-1">Risk Level: <span className="capitalize">{risk.level}</span></div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Composite risk score based on priority, impact scope, client involvement, financial exposure, and issue duration.
            </div>
          </div>
        </div>
      </Section>

      {/* Risk Factors */}
      <Section title="Risk Factors" icon={Target}>
        <div className="space-y-1.5">
          {risk.factors.map((factor, i) => (
            <div key={i} className="p-2.5 rounded-md border border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  factor.severity === "high" ? "bg-rose-500" :
                  factor.severity === "medium" ? "bg-amber-500" :
                  "bg-emerald-500"
                )} />
                <span className="text-[11px] font-medium flex-1">{factor.factor}</span>
                <Badge variant="outline" className={cn(
                  "text-[9px] h-4 px-1 capitalize",
                  factor.severity === "high" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                  factor.severity === "medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}>
                  {factor.severity}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">{factor.impact}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Risk Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RiskDimensionCard title="Escalation Risk" value={risk.escalationRisk} icon={TrendingUp} />
        <RiskDimensionCard title="Client Trust Risk" value={risk.clientTrustRisk} icon={User} />
        <RiskDimensionCard title="Operational Risk" value={risk.operationalRisk} icon={Building2} />
      </div>

      {/* Mitigations */}
      <Section title="Risk Mitigations" icon={ShieldCheck} subtitle={`${risk.mitigations.length} mitigations in place`}>
        <div className="space-y-1.5">
          {risk.mitigations.map((mitigation, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px]">{mitigation}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Related Tickets */}
      <Section title="Related Historical Tickets" icon={History} subtitle={`${data.relatedTickets.length} similar issues found in last 90 days`}>
        <div className="space-y-1.5">
          {data.relatedTickets.map((rel, i) => (
            <div key={i} className="p-2.5 rounded-md border border-border hover:border-violet-500/30 transition-colors cursor-pointer group">
              <div className="flex items-start gap-2 mb-1">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{rel.ticketId}</span>
                    <span className="text-[11px] font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{rel.title}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{rel.matchReason}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-muted-foreground">Similarity</div>
                  <div className="text-[12px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">{rel.similarity}%</div>
                </div>
              </div>
              <div className="ml-5 grid grid-cols-2 gap-2 text-[9px] text-muted-foreground">
                <div><span className="font-medium">Resolution:</span> {rel.resolution}</div>
                <div><span className="font-medium">Time:</span> {rel.resolutionTime}</div>
                <div><span className="font-medium">Department:</span> {rel.department}</div>
                <div><span className="font-medium">Recurrence:</span> {rel.recurrenceRisk}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Audit Preview */}
      <Section title="Audit Trail Preview" icon={History} subtitle="Actions logged for this ticket">
        <div className="space-y-1">
          {data.auditPreview.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
              <span className="font-mono text-muted-foreground shrink-0">{new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="font-medium">{entry.actor}</span>
              <span className="font-mono text-muted-foreground">{entry.action}</span>
              <span className="text-muted-foreground truncate flex-1">{entry.details}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// === SHARED COMPONENTS ===

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="iris-card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-tight">{title}</div>
          {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoBox({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border">
      <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </div>
      <div className="text-[11px] font-semibold truncate">{value}</div>
    </div>
  );
}

function ImpactRow({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: React.ComponentType<{ className?: string }> }) {
  const colors: Record<string, string> = {
    violet: "border-violet-500/20 bg-violet-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    sky: "border-sky-500/20 bg-sky-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
  };
  return (
    <div className={cn("p-2.5 rounded-md border", colors[color])}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </div>
      <div className="text-[11px] text-foreground/90 leading-relaxed">{value}</div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn("font-medium truncate", mono && "font-mono text-[10px]")}>{value}</span>
    </div>
  );
}

function AssigneeCard({ assignee, selected }: { assignee: AssigneeDetail; selected?: boolean }) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      selected ? "border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-indigo-500/5" : "border-border"
    )}>
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-12 h-12 shrink-0">
          <AvatarFallback className={cn("text-white text-sm font-semibold", getAvatarColor(assignee.name))}>
            {getInitials(assignee.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-semibold truncate">{assignee.name}</div>
            {selected && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-violet-500/10 text-violet-600 border-violet-500/20">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                Selected
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">{assignee.title}</div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <Mail className="w-2.5 h-2.5" />
            <span className="truncate">{assignee.email}</span>
          </div>
          {assignee.phone && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Phone className="w-2.5 h-2.5" />
              <span>{assignee.phone}</span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] text-muted-foreground">Match Score</div>
          <div className="text-[18px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">{assignee.matchScore}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-card border border-border text-center">
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Workload</div>
          <div className="text-[11px] font-bold tabular-nums">{assignee.workloadPercentage}%</div>
          <div className="text-[8px] text-muted-foreground">{assignee.workload}/{assignee.maxWorkload}</div>
        </div>
        <div className="p-1.5 rounded-md bg-card border border-border text-center">
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Availability</div>
          <div className={cn("text-[10px] font-semibold capitalize",
            assignee.availability === "available" ? "text-emerald-600" :
            assignee.availability === "busy" ? "text-amber-600" :
            "text-rose-600"
          )}>{assignee.availability.replace("_", " ")}</div>
        </div>
        <div className="p-1.5 rounded-md bg-card border border-border text-center">
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Escalation</div>
          <div className="text-[11px] font-bold tabular-nums">L{assignee.escalationOrder}</div>
        </div>
      </div>

      <div className="mb-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Match Reasons</div>
        <div className="flex flex-wrap gap-1">
          {assignee.matchReasons.map((reason, i) => (
            <span key={i} className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ {reason}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Skills</div>
        <div className="flex flex-wrap gap-1">
          {assignee.skills.map((skill) => (
            <span key={skill} className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assigned Studios</div>
        <div className="flex flex-wrap gap-1">
          {assignee.studioCodes.map((code) => (
            <span key={code} className="px-1.5 py-0.5 text-[9px] rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium font-mono">
              {code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SLATargetCard({ label, target, mins, icon: Icon, color }: { label: string; target: string; mins: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400",
    sky: "from-sky-500/10 to-sky-500/5 border-sky-500/20 text-sky-600 dark:text-sky-400",
  };
  return (
    <div className={cn("p-3 rounded-lg border bg-gradient-to-br", colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[16px] font-bold tabular-nums">{target}</div>
      {mins > 0 && <div className="text-[9px] text-muted-foreground tabular-nums">{mins} minutes</div>}
    </div>
  );
}

function RiskDimensionCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="text-[11px] leading-relaxed">{value}</div>
    </div>
  );
}

// === CONNECTED TICKETS TAB ===

function ConnectedTab({ data }: { data: TicketDetailData }) {
  return (
    <div className="space-y-4">
      <Section title="Connected Tickets" subtitle={`${data.connectedTickets.length} tickets linked by member, equipment, studio, or category`} icon={Link2}>
        <div className="space-y-2">
          {data.connectedTickets.map((ct, i) => (
            <div key={i} className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                  ct.connectionType === "same_member" ? "bg-violet-500/10 text-violet-600" :
                  ct.connectionType === "same_equipment" ? "bg-amber-500/10 text-amber-600" :
                  ct.connectionType === "same_studio" ? "bg-sky-500/10 text-sky-600" :
                  "bg-emerald-500/10 text-emerald-600"
                )}>
                  <Link2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{ct.ticketId}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-muted text-muted-foreground capitalize">{ct.connectionType.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-[12px] font-medium group-hover:text-primary transition-colors">{ct.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{ct.connectionReason}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn(
                    "text-[10px] font-semibold capitalize",
                    ct.status === "resolved" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {ct.status.replace(/_/g, " ")}
                  </div>
                  {ct.resolvedAt && <div className="text-[9px] text-muted-foreground">{ct.resolvedAt}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Sentiment Analysis */}
      {data.sentiment && (
        <Section title="Sentiment Analysis" subtitle="AI-detected sentiment from the reporter's language" icon={Brain}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0",
              data.sentiment === "angry" ? "bg-rose-500/10 text-rose-600" :
              data.sentiment === "frustrated" ? "bg-amber-500/10 text-amber-600" :
              data.sentiment === "urgent" ? "bg-orange-500/10 text-orange-600" :
              data.sentiment === "positive" ? "bg-emerald-500/10 text-emerald-600" :
              "bg-muted text-muted-foreground"
            )}>
              <span className="text-[14px] font-bold capitalize">{data.sentiment}</span>
              <span className="text-[8px] uppercase tracking-wider font-semibold mt-0.5">sentiment</span>
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground mb-2">Sentiment Score: <span className="font-semibold tabular-nums">{data.sentimentScore}/100</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={cn(
                  "h-full rounded-full transition-all",
                  (data.sentimentScore || 50) < 35 ? "bg-rose-500" :
                  (data.sentimentScore || 50) < 50 ? "bg-amber-500" :
                  (data.sentimentScore || 50) < 65 ? "bg-sky-500" :
                  "bg-emerald-500"
                )} style={{ width: `${data.sentimentScore}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {(data.sentimentScore || 50) < 35 ? "High negative sentiment — prioritize empathetic response" :
                 (data.sentimentScore || 50) < 50 ? "Negative sentiment detected — handle with care" :
                 (data.sentimentScore || 50) < 65 ? "Neutral sentiment — standard handling" :
                 "Positive sentiment — standard handling"}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// === RECURRENCE TAB ===

function RecurrenceTab({ data }: { data: TicketDetailData }) {
  if (!data.recurrence) return null;
  const rec = data.recurrence;
  return (
    <div className="space-y-4">
      <Section title="Recurrence Tickets" subtitle="Auto-generated follow-up tickets for PowerCycle/mic issues" icon={RefreshCw}>
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-amber-600 dark:text-amber-400 mb-1">Recurrence Protocol Activated</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">{rec.reason}</div>
            </div>
          </div>
        </div>

        <div className="mb-3 p-2.5 rounded-md bg-muted/30 border border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Assigned To (Original Reporter)</div>
          <div className="text-[12px] font-medium">{rec.assignedTo}</div>
          <div className="text-[10px] text-muted-foreground">{rec.assignedToRole}</div>
        </div>

        <div className="space-y-2">
          {rec.tickets.map((rt, i) => (
            <div key={i} className="p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{rt.id}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-violet-500/10 text-violet-600 capitalize">{rt.type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-[12px] font-medium mt-0.5">{rt.title}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Due Date</div>
                  <div className="text-[12px] font-semibold tabular-nums">{rt.dueDate}</div>
                  <div className="text-[9px] text-muted-foreground">{rt.daysAfterResolution} days after resolution</div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed ml-9">{rt.description}</div>
              <div className="mt-2 ml-9 flex items-center gap-2">
                <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-amber-500/10 text-amber-600 capitalize">{rt.status}</span>
                <span className="text-[9px] text-muted-foreground">Auto-creates when original ticket is marked resolved</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
