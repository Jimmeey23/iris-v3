"use client";
import { absUrl } from "@/lib/iris/utils";

import * as React from "react";
import { toast } from "sonner";
import {
  NOTIFICATION_EMAIL_CATALOG,
  renderDigestEmail,
  renderNotificationEmail,
  type EmailTemplateOverride,
  type EmailTemplateOverridesMap,
  type EmailTicketContext,
  type RecipientRole,
} from "@/lib/iris/email-renderer";
import { DIGEST_TYPES, generateDailyDigest, generateWeeklyDigest } from "@/lib/iris/digest-templates";
import { ALL_TICKETS, getAssignee, getDepartment, getReporter, getStudio } from "@/lib/iris/sample-tickets";
import { STUDIOS } from "@/lib/iris/types";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import {
  Mail,
  Send,
  Eye,
  Code2,
  Clock,
  CheckCircle2,
  Bell,
  AlertTriangle,
  Play,
  Calendar,
  TrendingUp,
  RefreshCw,
  Smartphone,
  Monitor,
  FileText,
  Edit2,
  Copy,
  Inbox,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type EmailServiceStatus = {
  service: {
    active: boolean;
    configured: boolean;
    transport: "mailtrap_api" | "mailtrap_smtp" | "dry_run" | "unconfigured";
    from: string;
    replyTo: string;
    emailChannelEnabled: boolean;
    inAppChannelEnabled: boolean;
    integrationEnabled: boolean;
    outboxEnabled: boolean;
  };
  stats: {
    sentToday: number;
    sent7d: number;
    failed7d: number;
    queued: number;
    skippedToday: number;
    deliveryRatePct: number;
  };
  outbox: {
    pending: number;
    sending: number;
    failed: number;
  };
  rules: Array<{ event: string; in_app: boolean; email: boolean; whatsapp: boolean }>;
  overrides: EmailTemplateOverridesMap;
  digestSchedule: {
    dailyEnabled?: boolean;
    dailyTimeIst?: string;
    weeklyEnabled?: boolean;
    weeklyDay?: string;
    weeklyTimeIst?: string;
    recipients?: string;
  };
  recentLogs: Array<{
    id: string;
    event: string;
    ticket_id: string | null;
    recipient: string;
    subject: string;
    status: string;
    provider: string | null;
    provider_id: string | null;
    error: string | null;
    created_at: string;
    sent_at: string | null;
    outbox_id?: string | null;
    outbox_attempts?: number | null;
  }>;
};

const SAMPLE_PREVIEW_TICKET: EmailTicketContext = {
  id: "tkt_sample_preview",
  ticketId: "P57-00142",
  title: "Air Conditioning Malfunction - Main Barre Studio, Kwality House",
  description:
    "The main workout floor AC unit is blinking a fault indicator and blowing warm air ahead of the 6:00 PM Signature Barre session. Two members reported discomfort during the previous class.",
  priority: "P1",
  status: "in_progress",
  slaStatus: "at_risk",
  category: "Repair and Maintenance",
  subcategory: "AC & Ventilation Repairs",
  studioCode: "KH",
  studioName: "Kwality House, Kemps Corner",
  studioCity: "Mumbai",
  departmentCode: "FAC",
  departmentName: "Facilities & Maintenance",
  assigneeName: "Arjun Pillai",
  ownerNames: ["Arjun Pillai", "Sanaya Wadia"],
  reporterName: "Aarav Mehta",
  affectedClient: "Ananya Verma",
  slaResponseTarget: new Date(Date.now() + 30 * 60_000).toISOString(),
  slaResolutionTarget: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  resolutionSummary:
    "HVAC technician cleared condenser fault, recharged refrigerant line, verified 19.5°C floor temperature, and scheduled a 5-day preventive follow-up check.",
  escalationLevel: 1,
  escalationReason: "Automatic escalation level 1: approaching high-priority SLA target during peak evening classes.",
};

export function EmailTemplatesView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const isAdmin = currentUser?.tier === "admin";
  const canEdit = currentUser?.tier === "admin" || currentUser?.tier === "manager";

  const [selectedCode, setSelectedCode] = React.useState(NOTIFICATION_EMAIL_CATALOG[0].code);
  const [selectedDigest, setSelectedDigest] = React.useState<"daily_digest" | "weekly_digest">("daily_digest");
  const [digestStudio, setDigestStudio] = React.useState<string>(() => STUDIOS[0]?.name.split(",")[0] || "Kwality House");
  const [previewMode, setPreviewMode] = React.useState<"desktop" | "mobile" | "text" | "code">("desktop");
  const [recipientRole, setRecipientRole] = React.useState<RecipientRole>("owner");
  const [selectedTicketId, setSelectedTicketId] = React.useState<string>("sample");
  const [mainTab, setMainTab] = React.useState("notifications");

  const [statusData, setStatusData] = React.useState<EmailServiceStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [sendingTest, setSendingTest] = React.useState(false);
  const [testDialogOpen, setTestDialogOpen] = React.useState<"notification" | "digest" | null>(null);
  const [customRecipient, setTestRecipient] = React.useState("");
  const testRecipient = customRecipient || currentUser?.email || "";
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(absUrl("/api/notifications/email"), { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as EmailServiceStatus;
        setStatusData(json);
      }
    } catch {
      /* preview / offline safe */
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    fetch(absUrl("/api/notifications/email"), { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: EmailServiceStatus | null) => {
        if (active && json) setStatusData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedEntry =
    NOTIFICATION_EMAIL_CATALOG.find((t) => t.code === selectedCode) ?? NOTIFICATION_EMAIL_CATALOG[0];

  const ticketOptions = React.useMemo(() => {
    void dataVersion;
    return ALL_TICKETS.slice(0, 25);
  }, [dataVersion]);

  const previewTicket = React.useMemo<EmailTicketContext>(() => {
    if (selectedTicketId === "sample") return SAMPLE_PREVIEW_TICKET;
    const found = ALL_TICKETS.find((t) => t.id === selectedTicketId);
    if (!found) return SAMPLE_PREVIEW_TICKET;
    const studio = getStudio(found);
    const dept = getDepartment(found);
    const assignee = getAssignee(found);
    const reporter = getReporter(found);
    return {
      id: found.id,
      ticketId: found.ticketId,
      title: found.title,
      description: found.description,
      priority: found.priority,
      status: found.status,
      slaStatus: found.slaStatus,
      category: found.category,
      subcategory: found.subcategory,
      studioCode: found.studioCode,
      studioName: studio?.name ?? found.studioCode,
      studioCity: studio?.city ?? null,
      departmentCode: found.departmentCode,
      departmentName: dept?.name ?? found.departmentCode,
      assigneeName: assignee?.name ?? null,
      reporterName: reporter?.name ?? null,
      affectedClient: found.affectedClient ?? null,
      slaResponseTarget: found.slaResponseTarget ? found.slaResponseTarget.toISOString() : null,
      slaResolutionTarget: found.slaResolutionTarget ? found.slaResolutionTarget.toISOString() : null,
      resolutionSummary: found.resolutionSummary ?? null,
      escalationLevel: found.escalationLevel ?? 0,
    };
  }, [selectedTicketId, dataVersion]);

  const overrides = statusData?.overrides ?? {};
  const appUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const renderedNotification = React.useMemo(() => {
    return renderNotificationEmail({
      event: selectedEntry.event,
      ticket: previewTicket,
      recipient: {
        name: currentUser?.name || "Arjun Pillai",
        email: currentUser?.email || "arjun@physique57india.com",
        role: recipientRole,
      },
      actorName: "Priya Nair",
      previousStatus: "resolved",
      previousOwnerName: "Ishita Nair",
      addedDepartmentNames: ["IT & Systems"],
      comment: {
        author: "Sanaya Wadia",
        content:
          "HVAC vendor arrived on site at Kwality House. Checked compressor pressure and reset main breaker; monitoring studio floor temperature over the next 20 minutes.",
        isInternal: false,
      },
      appUrl,
      override: overrides[selectedEntry.event],
    });
  }, [selectedEntry.event, previewTicket, currentUser?.name, currentUser?.email, recipientRole, appUrl, overrides]);

  const digestData = React.useMemo(() => {
    void dataVersion;
    const recipient = currentUser?.name || "Aarav Mehta";
    return selectedDigest === "daily_digest"
      ? generateDailyDigest(digestStudio, recipient)
      : generateWeeklyDigest(digestStudio, recipient);
  }, [selectedDigest, digestStudio, currentUser?.name, dataVersion]);

  const renderedDigest = React.useMemo(() => {
    return renderDigestEmail(digestData, {
      appUrl,
      override: overrides[selectedDigest],
    });
  }, [digestData, appUrl, overrides, selectedDigest]);

  const ruleByEventName = React.useMemo(() => {
    const map = new Map<string, { in_app: boolean; email: boolean }>();
    for (const r of statusData?.rules ?? []) map.set(r.event, r);
    return map;
  }, [statusData?.rules]);

  const isRuleEmailEnabled = (ruleName: string) => {
    const row = ruleByEventName.get(ruleName);
    return row ? row.email : true;
  };

  const handleToggleRule = async (ruleName: string, nextVal: boolean) => {
    try {
      const res = await fetch(absUrl("/api/notifications/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_rule", eventName: ruleName, email: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update rule");
      toast.success(`${ruleName}: email notifications ${nextVal ? "enabled" : "disabled"}`);
      void loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not toggle rule");
    }
  };

  const handleSendTest = async (kind: "notification" | "digest") => {
    if (!testRecipient.trim()) return toast.error("Enter a recipient email address");
    setSendingTest(true);
    try {
      const payload =
        kind === "digest"
          ? { action: "send_digest", to: testRecipient.trim(), digestData }
          : {
              action: "send_test",
              to: testRecipient.trim(),
              event: selectedEntry.event,
              ticketId: selectedTicketId,
            };
      const res = await fetch(absUrl("/api/notifications/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Email dispatch failed");
      } else if (json.dryRun) {
        toast.success(`Dry-run verified (${json.subject}) - logged to delivery ledger`);
        setTestDialogOpen(null);
      } else {
        toast.success(`Sent via ${json.transport} to ${json.to}`);
        setTestDialogOpen(null);
      }
      void loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to dispatch test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveOverride = async (key: string, override: EmailTemplateOverride) => {
    try {
      const res = await fetch(absUrl("/api/notifications/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_override", key, override }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save template customization");
      setStatusData((prev) => (prev ? { ...prev, overrides: json.overrides } : prev));
      setEditingKey(null);
      toast.success("Email template customization saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save template");
    }
  };

  const handleSaveSchedule = async (schedule: EmailServiceStatus["digestSchedule"]) => {
    try {
      const res = await fetch(absUrl("/api/notifications/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_schedule", schedule }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save schedule");
      setStatusData((prev) => (prev ? { ...prev, digestSchedule: json.digestSchedule } : prev));
      setScheduleOpen(false);
      toast.success("Digest schedule saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save schedule");
    }
  };

  const handleOutboxAction = async (action: "drain_outbox" | "retry_failed", outboxId?: string) => {
    try {
      const res = await fetch(absUrl("/api/notifications/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, outboxId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Outbox operation failed");
      if (action === "drain_outbox") {
        toast.success(
          `Outbox drained: ${json.summary.succeeded} sent, ${json.summary.retrying} retrying, ${json.summary.failed} failed`,
        );
      } else {
        toast.success("Failed email(s) requeued for delivery");
      }
      void loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Outbox action failed");
    }
  };

  const transportLabel = {
    mailtrap_api: "Active · Mailtrap HTTP API",
    mailtrap_smtp: "Active · SMTP TLS",
    dry_run: "Active · Dry-Run Simulation",
    unconfigured: "Credentials Not Configured",
  }[statusData?.service.transport ?? "unconfigured"];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Mail className="w-3 h-3 text-violet-500" />
            {NOTIFICATION_EMAIL_CATALOG.length} Lifecycle Templates · {DIGEST_TYPES.length} Intelligence Digests
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Email Notifications &amp; Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live preview, customization, delivery diagnostics, and test dispatch for every IRIS email notification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 text-[12px]" onClick={() => void loadStatus()} disabled={loadingStatus}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loadingStatus && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-8 text-[12px]" onClick={() => setTestDialogOpen("notification")}>
            <Send className="w-3 h-3 mr-1.5" />
            Send Test Email
          </Button>
        </div>
      </div>

      {/* Live Email Service Health Banner */}
      <div
        className={cn(
          "iris-card p-3.5 border-l-4 flex items-center justify-between flex-wrap gap-3",
          statusData?.service.active
            ? "border-l-emerald-500"
            : statusData?.service.transport === "unconfigured"
              ? "border-l-amber-500"
              : "border-l-rose-500",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              statusData?.service.active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {statusData?.service.active ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold">Email Service Status:</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5",
                  statusData?.service.active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                )}
              >
                {loadingStatus && !statusData ? "Checking…" : transportLabel}
              </Badge>
              {statusData?.service.outboxEnabled && (
                <Badge variant="outline" className="text-[10px] h-5">
                  Persistent Outbox Enabled
                </Badge>
              )}
              {statusData && !statusData.service.emailChannelEnabled && (
                <Badge variant="outline" className="text-[10px] h-5 bg-rose-500/10 text-rose-500 border-rose-500/20">
                  Global Email Channel Off in Settings
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {statusData?.service.configured ? (
                <>
                  Sender: <span className="font-mono text-foreground/85">{statusData.service.from}</span>
                  {statusData.service.replyTo && (
                    <>
                      {" "}· Reply-To: <span className="font-mono text-foreground/85">{statusData.service.replyTo}</span>
                    </>
                  )}
                </>
              ) : (
                "Configure MAILTRAP_FROM_EMAIL + MAILTRAP_API_KEY (or MAILTRAP_SMTP_*) in environment variables to deliver live external emails."
              )}
            </div>
          </div>
        </div>
        {statusData && (statusData.outbox.pending > 0 || statusData.outbox.failed > 0) && isAdmin && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">
              Outbox: <strong>{statusData.outbox.pending}</strong> pending · <strong>{statusData.outbox.failed}</strong> failed
            </span>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleOutboxAction("drain_outbox")}>
              Drain Now
            </Button>
          </div>
        )}
      </div>

      {/* Live Telemetry KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Lifecycle Templates" value={NOTIFICATION_EMAIL_CATALOG.length} sub="100% table-safe HTML" icon={Bell} color="violet" />
        <StatCard
          label="Sent Today (IST)"
          value={statusData ? statusData.stats.sentToday : "-"}
          sub={statusData ? `${statusData.stats.sent7d} in last 7 days` : "Loading ledger…"}
          icon={Send}
          color="emerald"
        />
        <StatCard
          label="7d Delivery Rate"
          value={statusData ? `${statusData.stats.deliveryRatePct}%` : "-"}
          sub={statusData ? `${statusData.stats.failed7d} failed · ${statusData.outbox.pending} queued` : "Loading…"}
          icon={CheckCircle2}
          color="sky"
        />
        <StatCard
          label="Digest Schedules"
          value={DIGEST_TYPES.length}
          sub={
            statusData?.digestSchedule?.dailyEnabled !== false
              ? `Daily ${statusData?.digestSchedule?.dailyTimeIst || "08:00"} IST`
              : "Paused"
          }
          icon={Calendar}
          color="amber"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="bg-muted/40 h-9">
          <TabsTrigger value="notifications" className="text-[12px] data-[state=active]:bg-background">
            <Bell className="w-3 h-3 mr-1.5" />
            Lifecycle Templates ({NOTIFICATION_EMAIL_CATALOG.length})
          </TabsTrigger>
          <TabsTrigger value="digests" className="text-[12px] data-[state=active]:bg-background">
            <Calendar className="w-3 h-3 mr-1.5" />
            Intelligence Digests ({DIGEST_TYPES.length})
          </TabsTrigger>
          {canEdit && (
            <TabsTrigger value="logs" className="text-[12px] data-[state=active]:bg-background">
              <Inbox className="w-3 h-3 mr-1.5" />
              Delivery Ledger ({statusData?.recentLogs.length ?? 0})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Lifecycle Notification Templates */}
        <TabsContent value="notifications" className="mt-3 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-4">
            <div className="iris-card overflow-hidden h-fit">
              <div className="px-3.5 py-2.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Notification Events</span>
                <span className="text-[10px] font-normal normal-case">Email rule</span>
              </div>
              <div className="max-h-[680px] overflow-y-auto iris-scrollbar divide-y divide-border/60">
                {NOTIFICATION_EMAIL_CATALOG.map((item) => {
                  const enabled = isRuleEmailEnabled(item.ruleName);
                  const customized = Boolean(overrides[item.event]);
                  const active = selectedCode === item.code;
                  const dotColors: Record<string, string> = {
                    indigo: "bg-indigo-500",
                    amber: "bg-amber-500",
                    rose: "bg-rose-500",
                    emerald: "bg-emerald-500",
                    sky: "bg-sky-500",
                    violet: "bg-violet-500",
                  };
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSelectedCode(item.code)}
                      className={cn(
                        "w-full text-left p-3 transition-colors",
                        active ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", dotColors[item.accentColor])} />
                        <span className="text-[12px] font-semibold truncate">{item.name}</span>
                        {customized && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                            Custom
                          </span>
                        )}
                        <span
                          className={cn(
                            "ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded",
                            enabled
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {enabled ? "On" : "Off"}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-muted-foreground line-clamp-2 pl-4">{item.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview & Controls */}
            <div className="iris-card overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{selectedEntry.name}</span>
                    <Badge variant="outline" className="text-[10px] h-5">
                      Rule: {selectedEntry.ruleName}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    Recipients: {selectedEntry.recipientSummary}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isAdmin && (
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-2 cursor-pointer">
                      <Switch
                        checked={isRuleEmailEnabled(selectedEntry.ruleName)}
                        onCheckedChange={(v) => handleToggleRule(selectedEntry.ruleName, v)}
                      />
                      <span>Send Email</span>
                    </label>
                  )}
                  <ViewportTabs mode={previewMode} onChange={setPreviewMode} />
                </div>
              </div>

              {/* Context Simulation Controls */}
              <div className="px-4 py-2.5 bg-muted/20 border-b border-border flex items-center gap-3 flex-wrap text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Preview with ticket:</span>
                  <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                    <SelectTrigger className="h-7 w-[240px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="sample">Sample · P57-00142 (Kwality House AC)</SelectItem>
                      {ticketOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.ticketId} - {t.title.slice(0, 36)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Recipient role:</span>
                  <Select value={recipientRole} onValueChange={(v) => setRecipientRole(v as RecipientRole)}>
                    <SelectTrigger className="h-7 w-[145px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Assigned Owner</SelectItem>
                      <SelectItem value="reporter">Reporter</SelectItem>
                      <SelectItem value="manager">Manager / Head</SelectItem>
                      <SelectItem value="previous_owner">Previous Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject Bar */}
              <div className="px-4 py-2.5 bg-card border-b border-border flex items-center gap-2 text-[12px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                  Subject:
                </span>
                <span className="font-medium truncate">{renderedNotification.subject}</span>
              </div>

              {/* Rendered Body */}
              <div className="p-4 bg-[#f1f0f6] dark:bg-zinc-950/60 flex-1">
                {previewMode === "desktop" || previewMode === "mobile" ? (
                  <div
                    className={cn(
                      "mx-auto rounded-xl overflow-hidden shadow-sm border border-border bg-white transition-all",
                      previewMode === "mobile" ? "max-w-[385px]" : "max-w-[660px]",
                    )}
                  >
                    <iframe
                      srcDoc={renderedNotification.html}
                      className="w-full border-0 block"
                      style={{ height: "640px", background: "#f1f0f6" }}
                      title={`${selectedEntry.name} Email Preview`}
                    />
                  </div>
                ) : previewMode === "text" ? (
                  <div className="max-w-[660px] mx-auto bg-card rounded-xl border border-border p-4">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                      Plain-Text Multipart Fallback
                    </div>
                    <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {renderedNotification.text}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-zinc-900 rounded-xl p-4 max-h-[640px] overflow-y-auto iris-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-200 whitespace-pre-wrap break-all leading-relaxed">
                      {renderedNotification.html}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
                <Button size="sm" className="h-8 text-[12px]" onClick={() => setTestDialogOpen("notification")}>
                  <Play className="w-3 h-3 mr-1.5" />
                  Send Test
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={() => setEditingKey(selectedEntry.event)}
                  >
                    <Edit2 className="w-3 h-3 mr-1.5" />
                    Customize Template
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={() => {
                    void navigator.clipboard.writeText(renderedNotification.html);
                    toast.success("Rendered HTML copied to clipboard");
                  }}
                >
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy HTML
                </Button>
                <div className="ml-auto text-[11px] text-muted-foreground">
                  Inline table CSS · Outlook, Gmail &amp; Apple Mail verified
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Intelligence Digests */}
        <TabsContent value="digests" className="mt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DIGEST_TYPES.map((digest) => {
              const active = selectedDigest === digest.code;
              return (
                <button
                  key={digest.code}
                  type="button"
                  onClick={() => setSelectedDigest(digest.code as "daily_digest" | "weekly_digest")}
                  className={cn(
                    "text-left p-4 rounded-xl border transition-all iris-card",
                    active ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {digest.code === "daily_digest" ? (
                        <Calendar className="w-5 h-5" />
                      ) : (
                        <TrendingUp className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold">{digest.name}</div>
                      <div className="text-[11px] text-muted-foreground">{digest.schedule}</div>
                    </div>
                    {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground leading-relaxed">{digest.description}</div>
                </button>
              );
            })}
          </div>

          <div className="iris-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[13px] font-semibold">
                  {DIGEST_TYPES.find((d) => d.code === selectedDigest)?.name}
                </div>
                <div className="text-[11px] text-muted-foreground">{renderedDigest.subject}</div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={digestStudio} onValueChange={setDigestStudio}>
                  <SelectTrigger className="h-8 w-[200px] text-[12px]">
                    <SelectValue placeholder="Studio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Studios">All Studios</SelectItem>
                    {STUDIOS.map((s) => {
                      const short = s.name.split(",")[0];
                      return (
                        <SelectItem key={s.code} value={short}>
                          {short} ({s.city})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <ViewportTabs mode={previewMode} onChange={setPreviewMode} />
              </div>
            </div>

            <div className="p-4 bg-[#f1f0f6] dark:bg-zinc-950/60">
              {previewMode === "desktop" || previewMode === "mobile" ? (
                <div
                  className={cn(
                    "mx-auto rounded-xl overflow-hidden shadow-sm border border-border bg-white transition-all",
                    previewMode === "mobile" ? "max-w-[385px]" : "max-w-[660px]",
                  )}
                >
                  <iframe
                    srcDoc={renderedDigest.html}
                    className="w-full border-0 block"
                    style={{ height: "720px", background: "#f1f0f6" }}
                    title="Digest Preview"
                  />
                </div>
              ) : previewMode === "text" ? (
                <div className="max-w-[660px] mx-auto bg-card rounded-xl border border-border p-4">
                  <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed">{renderedDigest.text}</pre>
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-xl p-4 max-h-[680px] overflow-y-auto iris-scrollbar">
                  <pre className="text-[10.5px] font-mono text-zinc-200 whitespace-pre-wrap break-all leading-relaxed">
                    {renderedDigest.html}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
              <Button size="sm" className="h-8 text-[12px]" onClick={() => setTestDialogOpen("digest")}>
                <Play className="w-3 h-3 mr-1.5" />
                Send Test Digest
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={() => setEditingKey(selectedDigest)}
                  >
                    <Edit2 className="w-3 h-3 mr-1.5" />
                    Customize Digest
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setScheduleOpen(true)}>
                    <Calendar className="w-3 h-3 mr-1.5" />
                    Schedule Settings
                  </Button>
                </>
              )}
              <div className="ml-auto text-[11px] text-muted-foreground">
                Daily: {statusData?.digestSchedule?.dailyTimeIst || "08:00"} IST · Weekly:{" "}
                {statusData?.digestSchedule?.weeklyDay || "Monday"} {statusData?.digestSchedule?.weeklyTimeIst || "08:00"} IST
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Delivery Ledger & Outbox */}
        {canEdit && (
          <TabsContent value="logs" className="mt-3 space-y-4">
            <div className="iris-card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[13px] font-semibold">Persistent Outbox &amp; Recent Email Deliveries</div>
                <div className="text-[11px] text-muted-foreground">
                  Idempotent audit trail from <code className="font-mono">iris.email_log</code> and retry queue in{" "}
                  <code className="font-mono">iris.outbox</code>.
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={() => handleOutboxAction("drain_outbox")}
                  >
                    <Play className="w-3 h-3 mr-1.5" />
                    Drain Pending ({statusData?.outbox.pending ?? 0})
                  </Button>
                  {(statusData?.outbox.failed ?? 0) > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[12px]"
                      onClick={() => handleOutboxAction("retry_failed")}
                    >
                      <RotateCcw className="w-3 h-3 mr-1.5" />
                      Retry All Failed ({statusData?.outbox.failed ?? 0})
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="iris-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Transport / Detail</th>
                      {isAdmin && <th className="py-2.5 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(statusData?.recentLogs ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                          {new Date(row.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{row.event}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{row.recipient}</td>
                        <td className="py-2.5 px-3 max-w-[300px] truncate" title={row.subject}>
                          {row.subject}
                        </td>
                        <td className="py-2.5 px-3">
                          <DeliveryStatusBadge status={row.status} />
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-[260px] truncate" title={row.error || row.provider || ""}>
                          {row.error ? (
                            <span className="text-rose-500">{row.error}</span>
                          ) : (
                            row.provider || "queued"
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right">
                            {row.outbox_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => handleOutboxAction("retry_failed", row.outbox_id!)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!statusData?.recentLogs || statusData.recentLogs.length === 0) && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-muted-foreground text-[12px]">
                          No email deliveries logged yet. Click &ldquo;Send Test Email&rdquo; above to verify end-to-end delivery.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Send Test Email Dialog */}
      <Dialog open={!!testDialogOpen} onOpenChange={(o) => !o && setTestDialogOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              {testDialogOpen === "digest"
                ? `Send Test ${selectedDigest === "weekly_digest" ? "Weekly" : "Daily"} Digest`
                : `Send Test: ${selectedEntry.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Dispatches the exact HTML and plain-text multipart email currently shown in the preview via the active
              IRIS mail transport and logs the result in <code className="font-mono">iris.email_log</code>.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Recipient email</label>
              <Input
                type="email"
                placeholder="you@physique57india.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="h-9 text-[12px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setTestDialogOpen(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sendingTest || !testRecipient.trim()}
                onClick={() => testDialogOpen && void handleSendTest(testDialogOpen)}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {sendingTest ? "Sending…" : "Send Now"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customize Template Override Dialog */}
      <Dialog open={!!editingKey} onOpenChange={(o) => !o && setEditingKey(null)}>
        {editingKey && (
          <TemplateOverrideModal
            templateKey={editingKey}
            initial={overrides[editingKey as keyof EmailTemplateOverridesMap] ?? {}}
            onCancel={() => setEditingKey(null)}
            onSave={(ov) => void handleSaveOverride(editingKey, ov)}
          />
        )}
      </Dialog>

      {/* Digest Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        {scheduleOpen && (
          <DigestScheduleModal
            initial={statusData?.digestSchedule ?? {}}
            onCancel={() => setScheduleOpen(false)}
            onSave={(sched) => void handleSaveSchedule(sched)}
          />
        )}
      </Dialog>
    </div>
  );
}

function ViewportTabs({
  mode,
  onChange,
}: {
  mode: "desktop" | "mobile" | "text" | "code";
  onChange: (m: "desktop" | "mobile" | "text" | "code") => void;
}) {
  const items: Array<{ id: typeof mode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "desktop", label: "Desktop", icon: Monitor },
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "text", label: "Text", icon: FileText },
    { id: "code", label: "HTML", icon: Code2 },
  ];
  return (
    <div className="inline-flex items-center bg-muted/60 rounded-md p-0.5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              "px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors",
              mode === it.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    sent: { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
    dry_run: { cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: Eye },
    queued: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: Clock },
    skipped: { cls: "bg-muted text-muted-foreground", icon: AlertTriangle },
    failed: { cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400", icon: XCircle },
  };
  const cfg = styles[status] ?? styles.skipped;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", cfg.cls)}>
      <Icon className="w-2.5 h-2.5" />
      {status.replace("_", " ")}
    </span>
  );
}

function TemplateOverrideModal({
  templateKey,
  initial,
  onSave,
  onCancel,
}: {
  templateKey: string;
  initial: EmailTemplateOverride;
  onSave: (o: EmailTemplateOverride) => void;
  onCancel: () => void;
}) {
  const [subjectPrefix, setSubjectPrefix] = React.useState(initial.subjectPrefix ?? "");
  const [customHeading, setCustomHeading] = React.useState(initial.customHeading ?? "");
  const [customIntro, setCustomIntro] = React.useState(initial.customIntro ?? "");
  const [ctaLabel, setCtaLabel] = React.useState(initial.ctaLabel ?? "");
  const [footerNote, setFooterNote] = React.useState(initial.footerNote ?? "");

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-[15px]">Customize Email Template ({templateKey})</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-[12px]">
        <p className="text-[11.5px] text-muted-foreground">
          Overrides take effect immediately for both live previews and outgoing server notifications. Leave any field
          blank to use the default IRIS copy.
        </p>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Subject prefix (optional)</label>
          <Input
            value={subjectPrefix}
            onChange={(e) => setSubjectPrefix(e.target.value)}
            placeholder="e.g. [P57 Ops]"
            className="h-8 text-[12px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Custom headline</label>
          <Input
            value={customHeading}
            onChange={(e) => setCustomHeading(e.target.value)}
            placeholder="Leave blank for event default"
            className="h-8 text-[12px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Custom intro paragraph</label>
          <Textarea
            value={customIntro}
            onChange={(e) => setCustomIntro(e.target.value)}
            placeholder="Leave blank for dynamic ticket summary"
            className="min-h-[68px] text-[12px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">CTA button label</label>
            <Input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="e.g. Open Ticket in IRIS"
              className="h-8 text-[12px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Extra footer note</label>
            <Input
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="e.g. Escalations desk: +91..."
              className="h-8 text-[12px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[11px]"
            onClick={() => onSave({})}
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                onSave({ subjectPrefix, customHeading, customIntro, ctaLabel, footerNote })
              }
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

function DigestScheduleModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: EmailServiceStatus["digestSchedule"];
  onSave: (s: EmailServiceStatus["digestSchedule"]) => void;
  onCancel: () => void;
}) {
  const [dailyEnabled, setDailyEnabled] = React.useState(initial.dailyEnabled !== false);
  const [dailyTimeIst, setDailyTimeIst] = React.useState(initial.dailyTimeIst || "08:00");
  const [weeklyEnabled, setWeeklyEnabled] = React.useState(initial.weeklyEnabled !== false);
  const [weeklyDay, setWeeklyDay] = React.useState(initial.weeklyDay || "Monday");
  const [weeklyTimeIst, setWeeklyTimeIst] = React.useState(initial.weeklyTimeIst || "08:00");
  const [recipients, setRecipients] = React.useState(initial.recipients || "managers_and_admins");

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-[15px]">Intelligence Digest Schedule</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-[12px]">
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
          <div>
            <div className="font-medium">Daily Morning Digest</div>
            <div className="text-[11px] text-muted-foreground">24-hour studio summary &amp; personal queue</div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={dailyTimeIst}
              onChange={(e) => setDailyTimeIst(e.target.value)}
              className="h-8 w-28 text-[12px]"
              disabled={!dailyEnabled}
            />
            <Switch checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
          </div>
        </div>

        <div className="space-y-2 p-2.5 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Weekly Operations Summary</div>
              <div className="text-[11px] text-muted-foreground">7-day trends, SLA score &amp; recurring patterns</div>
            </div>
            <Switch checked={weeklyEnabled} onCheckedChange={setWeeklyEnabled} />
          </div>
          {weeklyEnabled && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Select value={weeklyDay} onValueChange={setWeeklyDay}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="time"
                value={weeklyTimeIst}
                onChange={(e) => setWeeklyTimeIst(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Audience</label>
          <Select value={recipients} onValueChange={setRecipients}>
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="managers_and_admins">Managers, Dept Heads &amp; Admins</SelectItem>
              <SelectItem value="all_active_staff">All Active Staff (with email enabled)</SelectItem>
              <SelectItem value="admins_only">Admins Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({ dailyEnabled, dailyTimeIst, weeklyEnabled, weeklyDay, weeklyTimeIst, recipients })
            }
          >
            Save Schedule
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "violet" | "sky" | "emerald" | "amber";
}) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="iris-card p-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
        <div className="text-[10.5px] text-muted-foreground truncate">{sub}</div>
      </div>
    </div>
  );
}
