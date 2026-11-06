"use client";

import * as React from "react";
import { EMAIL_TEMPLATES, EMAIL_TRIGGERS } from "@/lib/iris/email-templates";
import { cn } from "@/lib/utils";
import {
  Mail,
  Send,
  Eye,
  Code2,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  Bell,
  AlertTriangle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function EmailTemplatesView() {
  const [selectedCode, setSelectedCode] = React.useState(EMAIL_TEMPLATES[0].code);
  const [view, setView] = React.useState<"preview" | "code">("preview");
  const selected = EMAIL_TEMPLATES.find((t) => t.code === selectedCode)!;

  // Render the template HTML with sample data
  const renderedHtml = React.useMemo(() => {
    return selected.bodyHtml
      .replace(/{{ticketId}}/g, "IRIS-2026-0142")
      .replace(/{{ticketTitle}}/g, "Air Conditioning Malfunction — Main Workout Studio, Kwality House")
      .replace(/{{ticketDescription}}/g, "The air conditioning system in the main workout studio is reportedly malfunctioning. Multiple clients have experienced discomfort during sessions.")
      .replace(/{{priority}}/g, "P1")
      .replace(/{{priorityColor}}/g, "#f59e0b")
      .replace(/{{assigneeName}}/g, "Arjun Pillai")
      .replace(/{{managerName}}/g, "Sanaya Wadia")
      .replace(/{{newAssigneeName}}/g, "Meera Krishnan")
      .replace(/{{previousAssigneeName}}/g, "Ishita Nair")
      .replace(/{{reporterName}}/g, "Aarav Mehta")
      .replace(/{{studioName}}/g, "Kwality House")
      .replace(/{{departmentName}}/g, "Facilities & Maintenance")
      .replace(/{{responseDue}}/g, "1 hour")
      .replace(/{{resolutionDeadline}}/g, "Today, 6:00 PM")
      .replace(/{{resolutionSummary}}/g, "HVAC technician dispatched and issue resolved. AC unit serviced and cooling restored. Client notified of resolution.")
      .replace(/{{escalationReason}}/g, "P0/P1 ticket approaching SLA breach. Auto-escalated after 4 hours without resolution.")
      .replace(/{{reassignmentReason}}/g, "Original assignee on leave. Ticket reassigned based on availability and expertise matching.")
      .replace(/{{reopenReason}}/g, "Client reports the AC issue has recurred. Same studio, same equipment.")
      .replace(/{{ticketStatus}}/g, "In Progress")
      .replace(/{{ticketUrl}}/g, "#");
  }, [selected]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Mail className="w-3 h-3 text-violet-500" />
            {EMAIL_TEMPLATES.length} Email Templates
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modern, styled email templates for ticket lifecycle notifications.
          </p>
        </div>
        <Button className="h-8 text-[12px]">
          <Plus className="w-3 h-3 mr-1.5" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Templates" value={EMAIL_TEMPLATES.length} icon={Mail} color="violet" />
        <StatCard label="Triggers" value={EMAIL_TRIGGERS.length} icon={Bell} color="sky" />
        <StatCard label="Sent Today" value="42" icon={Send} color="emerald" />
        <StatCard label="Delivery Rate" value="99.2%" icon={CheckCircle2} color="amber" />
      </div>

      {/* Triggers Overview */}
      <div className="iris-card p-4">
        <div className="text-[12px] font-semibold mb-3 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-violet-500" />
          Lifecycle Triggers
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {EMAIL_TRIGGERS.map((trigger) => {
            const template = EMAIL_TEMPLATES.find((t) => t.trigger === trigger.code);
            const isAvailable = !!template;
            return (
              <button
                key={trigger.code}
                onClick={() => template && setSelectedCode(template.code)}
                className={cn(
                  "text-left p-2.5 rounded-lg border transition-all",
                  selectedCode === template?.code
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-border hover:border-violet-500/30 hover:bg-violet-500/5"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TriggerIcon code={trigger.code} />
                  <div className="text-[11px] font-medium">{trigger.label}</div>
                  {isAvailable ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-500 ml-auto" />
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">{trigger.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template List & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Template List */}
        <div className="iris-card overflow-hidden h-fit">
          <div className="px-3 py-2 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Templates
          </div>
          <div className="max-h-[600px] overflow-y-auto iris-scrollbar">
            {EMAIL_TEMPLATES.map((t) => (
              <button
                key={t.code}
                onClick={() => setSelectedCode(t.code)}
                className={cn(
                  "w-full text-left p-3 border-b border-border last:border-0 transition-colors",
                  selectedCode === t.code ? "bg-violet-500/5" : "hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    t.trigger === "ticket_created" ? "bg-violet-500" :
                    t.trigger === "escalation" ? "bg-rose-500" :
                    t.trigger === "assignment" ? "bg-sky-500" :
                    t.trigger === "due_3h" || t.trigger === "due_today" ? "bg-amber-500" :
                    t.trigger === "past_due_3h" ? "bg-rose-500" :
                    t.trigger === "resolved" ? "bg-emerald-500" :
                    "bg-indigo-500"
                  )} />
                  <div className="text-[12px] font-medium">{t.name}</div>
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 ml-3.5">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Detail */}
        <div className="iris-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{selected.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{selected.subject}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">{selected.recipientType.replace("_", " ")}</Badge>
              <div className="flex items-center bg-muted/60 rounded-md p-0.5">
                <button
                  onClick={() => setView("preview")}
                  className={cn("p-1.5 rounded transition-colors", view === "preview" ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setView("code")}
                  className={cn("p-1.5 rounded transition-colors", view === "code" ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  <Code2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <InfoBox label="Trigger" value={EMAIL_TRIGGERS.find(t => t.code === selected.trigger)?.label || selected.trigger} />
              <InfoBox label="Recipient" value={selected.recipientType.replace("_", " ")} />
              <InfoBox label="Status" value="Active" status="emerald" />
            </div>

            {view === "preview" ? (
              <div className="bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto iris-scrollbar">
                <div className="bg-white rounded-lg p-3 mb-3 border border-border">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Email Subject</div>
                  <div className="text-[13px] font-medium">{selected.subject.replace(/{{ticketId}}/g, "IRIS-2026-0142").replace(/{{ticketTitle}}/g, "Air Conditioning Malfunction...")}</div>
                </div>
                <div className="bg-white rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f5f5f7;font-family:sans-serif;">${renderedHtml}</body></html>`}
                    className="w-full border-0"
                    style={{ minHeight: "500px", background: "#f5f5f7" }}
                    title="Email Preview"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-lg p-4 max-h-[600px] overflow-y-auto iris-scrollbar">
                <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                  {selected.bodyHtml}
                </pre>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
            <Button size="sm" className="h-8 text-[12px]">
              <Play className="w-3 h-3 mr-1.5" />
              Send Test
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]">
              <Code2 className="w-3 h-3 mr-1.5" />
              Edit Template
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]">
              <Sparkles className="w-3 h-3 mr-1.5" />
              AI Improve
            </Button>
            <div className="ml-auto text-[10px] text-muted-foreground">
              Last edited: 2 days ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriggerIcon({ code }: { code: string }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    ticket_created: Mail,
    escalation: AlertTriangle,
    assignment: Send,
    due_3h: Clock,
    due_today: Clock,
    past_due_3h: AlertTriangle,
    resolved: CheckCircle2,
    reopened: Bell,
  };
  const Icon = icons[code] || Mail;
  return <Icon className="w-3 h-3 text-violet-500" />;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: "violet" | "sky" | "emerald" | "amber" }) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="iris-card p-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, status }: { label: string; value: string; status?: "emerald" }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className={cn("text-[12px] font-semibold capitalize", status === "emerald" && "text-emerald-600 dark:text-emerald-400")}>{value}</div>
    </div>
  );
}
