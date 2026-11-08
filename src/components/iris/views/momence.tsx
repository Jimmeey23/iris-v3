"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";
import { useAppStore } from "@/lib/iris/store";
import {
  ConfirmActionDialog,
  MomenceMemberTabs,
  useCanWrite,
  useMomenceSection,
  type PendingAction,
} from "@/components/iris/momence-member-panel";
import {
  Plug,
  CheckCircle2,
  RefreshCw,
  Search,
  Users,
  Calendar,
  CreditCard,
  Webhook,
  Activity,
  Clock,
  Tag,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Ban,
  Ticket as TicketIcon,
  Plus,
  Loader2,
  Sparkles,
  Settings,
  GraduationCap,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type RegionFilter = "all" | "mum" | "blr";

interface MomenceStatusResponse {
  active: boolean;
  integrationEnabled: boolean;
  integrationStatus: string;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  regions: Array<{ code: "mum" | "blr"; label: string; configured: boolean }>;
  configuredRegions: Array<"mum" | "blr">;
  webhook: {
    secretConfigured: boolean;
    endpointPath: string;
    received24h: number;
    received7d: number;
    failed7d: number;
    recentEvents: Array<{
      id: string;
      event_type: string;
      status: string;
      ticket_id: string | null;
      processing_error: string | null;
      received_at: string;
      processed_at: string | null;
    }>;
  };
}

interface LiveMemberSummary {
  id: string;
  region: "mum" | "blr";
  name: string;
  email: string | null;
  phone: string | null;
  totalVisits: number;
  firstSeen: string | null;
  lastSeen: string | null;
  tags: string[];
}

interface LiveSessionSummary {
  id: string;
  region: "mum" | "blr";
  name: string;
  startsAt: string;
  durationMins: number | null;
  teacher: string | null;
  location: string | null;
  capacity: number | null;
  booked: number;
  cancelled: boolean;
}

const REGION_NAME: Record<"mum" | "blr", string> = {
  mum: "Mumbai",
  blr: "Bengaluru",
};

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function MomenceView() {
  const { setCurrentView, selectTicket, dataVersion } = useAppStore();
  const canWrite = useCanWrite();

  const [region, setRegion] = React.useState<RegionFilter>("all");
  const [activeTab, setActiveTab] = React.useState("members");

  // Status & connection health
  const [status, setStatus] = React.useState<MomenceStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);

  const loadStatus = React.useCallback(async () => {
    setStatusLoading(true);
    try {
      const r = await fetch("/api/momence/status", { cache: "no-store" });
      if (r.ok) setStatus(await r.json());
    } catch {
      /* offline safe */
    } finally {
      setStatusLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(() => loadStatus());
  }, [loadStatus]);

  // Member Directory state
  const [memberQuery, setMemberQuery] = React.useState("");
  const [debouncedMemberQuery, setDebouncedMemberQuery] = React.useState("");
  const [memberPage, setMemberPage] = React.useState(0);
  const [members, setMembers] = React.useState<LiveMemberSummary[]>([]);
  const [memberTotal, setMemberTotal] = React.useState(0);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [membersError, setMembersError] = React.useState<string | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<LiveMemberSummary | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedMemberQuery(memberQuery);
      setMemberPage(0);
    }, 280);
    return () => clearTimeout(t);
  }, [memberQuery]);

  const loadMembers = React.useCallback(async () => {
    if (status && status.configuredRegions.length === 0) {
      setMembers([]);
      setMemberTotal(0);
      return;
    }
    setMembersLoading(true);
    setMembersError(null);
    try {
      const qs = new URLSearchParams({
        list: "1",
        region,
        page: String(memberPage),
        pageSize: "25",
        ...(debouncedMemberQuery.trim() ? { q: debouncedMemberQuery.trim() } : {}),
      });
      const r = await fetch(`/api/momence/members?${qs.toString()}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed to load members (${r.status})`);
      const rows = (j.members ?? []) as LiveMemberSummary[];
      setMembers(rows);
      setMemberTotal(Number(j.totalCount ?? rows.length));
      setSelectedMember((cur) => {
        if (cur && rows.some((m) => m.id === cur.id)) return rows.find((m) => m.id === cur.id)!;
        return cur ?? rows[0] ?? null;
      });
    } catch (e) {
      setMembersError(e instanceof Error ? e.message : "Could not reach Momence API");
    } finally {
      setMembersLoading(false);
    }
  }, [region, memberPage, debouncedMemberQuery, status]);

  React.useEffect(() => {
    if (!statusLoading) void Promise.resolve().then(() => loadMembers());
  }, [loadMembers, statusLoading]);

  // Sessions state
  const [sessionWindow, setSessionWindow] = React.useState<"today" | "next3d" | "next7d" | "past7d">("next3d");
  const [sessionQuery, setSessionQuery] = React.useState("");
  const [debouncedSessionQuery, setDebouncedSessionQuery] = React.useState("");
  const [sessions, setSessions] = React.useState<LiveSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSessionQuery(sessionQuery), 280);
    return () => clearTimeout(t);
  }, [sessionQuery]);

  const loadSessions = React.useCallback(async () => {
    if (status && status.configuredRegions.length === 0) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      let from = startOfToday;
      let to = new Date(startOfToday.getTime() + 3 * 24 * 3_600_000);
      if (sessionWindow === "today") {
        to = new Date(startOfToday.getTime() + 24 * 3_600_000);
      } else if (sessionWindow === "next7d") {
        to = new Date(startOfToday.getTime() + 7 * 24 * 3_600_000);
      } else if (sessionWindow === "past7d") {
        from = new Date(startOfToday.getTime() - 7 * 24 * 3_600_000);
        to = new Date(now.getTime() + 6 * 3_600_000);
      }

      const qs = new URLSearchParams({
        region,
        from: from.toISOString(),
        to: to.toISOString(),
        limit: "80",
        ...(debouncedSessionQuery.trim() ? { q: debouncedSessionQuery.trim() } : {}),
      });
      const r = await fetch(`/api/momence/sessions?${qs.toString()}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to load sessions");
      const list = (j.sessions ?? []) as LiveSessionSummary[];
      setSessions(list);
      setSelectedSessionId((cur) => (cur && list.some((x) => x.id === cur) ? cur : (list[0]?.id ?? null)));
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [region, sessionWindow, debouncedSessionQuery, status]);

  React.useEffect(() => {
    if (!statusLoading && activeTab === "sessions") {
      void Promise.resolve().then(() => loadSessions());
    }
  }, [loadSessions, statusLoading, activeTab]);

  const handleRefreshAll = () => {
    void loadStatus();
    if (activeTab === "members") void loadMembers();
    if (activeTab === "sessions") void loadSessions();
  };

  const configuredCount = status?.configuredRegions.length ?? 0;

  // Linked tickets for currently selected member
  const memberLinkedTickets = React.useMemo(() => {
    void dataVersion;
    if (!selectedMember) return [];
    const rawNumeric = selectedMember.id.replace(/^\w+:/, "");
    const lowerName = selectedMember.name.toLowerCase();
    return ALL_TICKETS.filter(
      (t) =>
        t.clientMomenceId === selectedMember.id ||
        t.clientMomenceId === rawNumeric ||
        (t.affectedClient && t.affectedClient.toLowerCase() === lowerName),
    );
  }, [selectedMember, dataVersion]);

  const startTicketForMember = (m: LiveMemberSummary) => {
    const addAIMessage = useAppStore.getState().addAIMessage;
    addAIMessage({
      id: `momence_${Date.now()}`,
      role: "assistant",
      content: `Ready to file an issue for **${m.name}** (Momence ID \`${m.id}\`, ${REGION_NAME[m.region]}${m.email ? `, ${m.email}` : ""}). Describe what happened and I'll pre-fill the ticket.`,
      timestamp: new Date().toISOString(),
    });
    setCurrentView("ai_assistant");
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Plug className="w-3 h-3 text-emerald-500" />
            Momence Host API v2 · Live Workspace Integration
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Momence Live Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time member 360 profiles, class rosters, memberships, instructors, leads, and webhooks fetched directly from Momence.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Region Filter Pills */}
          <div className="inline-flex items-center bg-muted/60 rounded-lg p-0.5 text-[11px]">
            {(
              [
                { id: "all", label: "All Regions" },
                { id: "mum", label: "Mumbai" },
                { id: "blr", label: "Bengaluru" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setRegion(opt.id);
                  setMemberPage(0);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  region === opt.id
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={handleRefreshAll}
            disabled={statusLoading || membersLoading || sessionsLoading}
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 mr-1.5",
                (statusLoading || membersLoading || sessionsLoading) && "animate-spin",
              )}
            />
            Sync Live
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setCurrentView("settings")}>
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Settings
          </Button>
        </div>
      </div>

      {/* Live Connection Status Banner */}
      <div
        className={cn(
          "iris-card p-3.5 border-l-4 flex items-center justify-between flex-wrap gap-3",
          status?.active ? "border-l-emerald-500" : "border-l-amber-500",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              status?.active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {status?.active ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold">
                {statusLoading && !status
                  ? "Checking Momence Host API…"
                  : status?.active
                    ? "Connected to Momence Host API v2"
                    : configuredCount === 0
                      ? "Momence API Credentials Not Configured"
                      : "Momence Integration Paused in Settings"}
              </span>
              {status?.regions.map((r) => (
                <Badge
                  key={r.code}
                  variant="outline"
                  className={cn(
                    "text-[10px] h-5",
                    r.configured
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "text-muted-foreground",
                  )}
                >
                  {r.label}: {r.configured ? "Connected" : "No credentials"}
                </Badge>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {configuredCount > 0 ? (
                <>
                  OAuth 2.0 token auto-refresh active · Webhooks (24h):{" "}
                  <strong>{status?.webhook.received24h ?? 0}</strong> received
                  {status?.lastSyncedAt && <> · Last verified {fmtDateTime(status.lastSyncedAt)}</>}
                </>
              ) : (
                <>
                  Set <code className="font-mono">MOMENCE_CLIENT_ID</code>,{" "}
                  <code className="font-mono">MOMENCE_CLIENT_SECRET</code>,{" "}
                  <code className="font-mono">MOMENCE_USERNAME</code>, and{" "}
                  <code className="font-mono">MOMENCE_PASSWORD</code> (plus <code className="font-mono">*_BLR</code> for
                  Bengaluru) on the server to fetch live studio data.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Live Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/40 h-9 flex-wrap">
          <TabsTrigger value="members" className="text-[12px] data-[state=active]:bg-background">
            <Users className="w-3 h-3 mr-1.5" />
            Member Directory {memberTotal > 0 ? `(${memberTotal.toLocaleString()})` : ""}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-[12px] data-[state=active]:bg-background">
            <Calendar className="w-3 h-3 mr-1.5" />
            Sessions &amp; Rosters
          </TabsTrigger>
          <TabsTrigger value="catalogue" className="text-[12px] data-[state=active]:bg-background">
            <CreditCard className="w-3 h-3 mr-1.5" />
            Membership Catalogue
          </TabsTrigger>
          <TabsTrigger value="trainers" className="text-[12px] data-[state=active]:bg-background">
            <GraduationCap className="w-3 h-3 mr-1.5" />
            Instructors
          </TabsTrigger>
          <TabsTrigger value="leads" className="text-[12px] data-[state=active]:bg-background">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-[12px] data-[state=active]:bg-background">
            <Webhook className="w-3 h-3 mr-1.5" />
            Webhooks &amp; Health
          </TabsTrigger>
        </TabsList>

        {/* 1. Live Member Directory & Member 360 */}
        <TabsContent value="members" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4">
            {/* Left: Paginated Live Search & Directory */}
            <div className="iris-card overflow-hidden flex flex-col h-fit">
              <div className="p-3 border-b border-border space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search name, email, phone, or Momence ID…"
                    className="h-8 pl-8 text-[12px]"
                  />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>
                    {membersLoading
                      ? "Fetching from Momence…"
                      : memberTotal > 0
                        ? `${memberTotal.toLocaleString()} live members`
                        : "Live Momence search"}
                  </span>
                  {memberTotal > 25 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={memberPage === 0 || membersLoading}
                        onClick={() => setMemberPage((p) => Math.max(0, p - 1))}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <span className="tabular-nums">Page {memberPage + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={(memberPage + 1) * 25 >= memberTotal || membersLoading}
                        onClick={() => setMemberPage((p) => p + 1)}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {membersLoading && members.length === 0 ? (
                <div className="py-12 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading live members from Momence…
                </div>
              ) : membersError ? (
                <div className="p-6 text-center space-y-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mx-auto" />
                  <div className="text-[12px] text-rose-500 font-medium">{membersError}</div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void loadMembers()}>
                    Retry
                  </Button>
                </div>
              ) : configuredCount === 0 ? (
                <div className="p-6 text-center text-[12px] text-muted-foreground leading-relaxed">
                  Momence credentials are not set in this environment yet. Once{" "}
                  <code className="font-mono">MOMENCE_CLIENT_ID</code> &amp;{" "}
                  <code className="font-mono">MOMENCE_CLIENT_SECRET</code> are configured, live customer records appear
                  here automatically.
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center text-[12px] text-muted-foreground">
                  No Momence members matched &ldquo;{memberQuery}&rdquo;.
                </div>
              ) : (
                <div className="divide-y divide-border/60 max-h-[620px] overflow-y-auto iris-scrollbar">
                  {members.map((m) => {
                    const active = selectedMember?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMember(m)}
                        className={cn(
                          "w-full text-left p-3 hover:bg-muted/30 transition-colors",
                          active && "bg-primary/5 border-l-2 border-l-primary",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12.5px] font-semibold truncate">{m.name}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-auto shrink-0">
                            {REGION_NAME[m.region]}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {m.email || m.phone || m.id}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="font-mono">{m.id}</span>
                          <span>·</span>
                          <span>{m.totalVisits} visits</span>
                          {m.lastSeen && (
                            <>
                              <span>·</span>
                              <span>Last seen {fmtDate(m.lastSeen)}</span>
                            </>
                          )}
                        </div>
                        {m.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Live Member 360 Workspace */}
            <div className="iris-card p-5">
              {!selectedMember ? (
                <div className="py-16 text-center text-muted-foreground text-[12.5px]">
                  {configuredCount === 0
                    ? "Connect Momence credentials to inspect live Member 360 profiles, memberships, bookings, payments, and tags."
                    : "Select any member on the left to inspect their live Momence 360 profile."}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap pb-3 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold">{selectedMember.name}</h2>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {selectedMember.id}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {REGION_NAME[selectedMember.region]}
                        </Badge>
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        {[selectedMember.email, selectedMember.phone].filter(Boolean).join(" · ") || "No email/phone on file"}
                      </div>
                    </div>
                    <Button size="sm" className="h-8 text-[12px]" onClick={() => startTicketForMember(selectedMember)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Create Ticket for Member
                    </Button>
                  </div>

                  {/* Live MomenceMemberTabs (Overview, Memberships, Bookings, Payments, Notes, Tags) */}
                  <MomenceMemberTabs
                    key={selectedMember.id}
                    memberId={selectedMember.id}
                    overview={
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <MetricBox label="Total Visits" value={selectedMember.totalVisits} />
                          <MetricBox label="First Seen" value={fmtDate(selectedMember.firstSeen)} />
                          <MetricBox label="Last Seen" value={fmtDate(selectedMember.lastSeen)} />
                          <MetricBox label="IRIS Tickets" value={memberLinkedTickets.length} />
                        </div>

                        {selectedMember.tags.length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Customer Tags
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedMember.tags.map((t) => (
                                <Badge key={t} variant="outline" className="text-[10.5px]">
                                  <Tag className="w-2.5 h-2.5 mr-1" />
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Linked IRIS Tickets ({memberLinkedTickets.length})
                          </div>
                          {memberLinkedTickets.length === 0 ? (
                            <div className="text-[11.5px] text-muted-foreground p-3 rounded-lg bg-muted/30">
                              No IRIS tickets linked to this member yet.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {memberLinkedTickets.slice(0, 8).map((tk) => (
                                <button
                                  key={tk.id}
                                  type="button"
                                  onClick={() => selectTicket(tk.id)}
                                  className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/40 flex items-center justify-between gap-2 text-[12px]"
                                >
                                  <div className="min-w-0">
                                    <span className="font-mono text-[11px] text-primary mr-2">{tk.ticketId}</span>
                                    <span className="font-medium truncate">{tk.title}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {tk.status.replace("_", " ")}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 2. Live Class Schedule & Roster */}
        <TabsContent value="sessions" className="mt-3 space-y-3">
          <div className="iris-card p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center bg-muted/60 rounded-lg p-0.5 text-[11px]">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "next3d", label: "Next 3 Days" },
                  { id: "next7d", label: "Next 7 Days" },
                  { id: "past7d", label: "Past 7 Days" },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSessionWindow(w.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors",
                    sessionWindow === w.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={sessionQuery}
                onChange={(e) => setSessionQuery(e.target.value)}
                placeholder="Filter class, instructor, studio…"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
            <div className="iris-card overflow-hidden">
              {sessionsLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching live class schedule from Momence…
                </div>
              ) : sessionsError ? (
                <div className="p-6 text-center text-rose-500 text-[12px]">{sessionsError}</div>
              ) : sessions.length === 0 ? (
                <div className="py-12 text-center text-[12px] text-muted-foreground">
                  {configuredCount === 0
                    ? "Configure Momence API credentials to view live class schedules."
                    : "No sessions found in this window."}
                </div>
              ) : (
                <div className="divide-y divide-border/60 max-h-[620px] overflow-y-auto iris-scrollbar">
                  {sessions.map((s) => {
                    const active = selectedSessionId === s.id;
                    const pct = s.capacity ? Math.min(100, Math.round((s.booked / s.capacity) * 100)) : 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSessionId(s.id)}
                        className={cn(
                          "w-full text-left p-3.5 hover:bg-muted/25 transition-colors flex items-center gap-3",
                          active && "bg-primary/5 border-l-2 border-l-primary",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold truncate">{s.name}</span>
                            {s.cancelled && (
                              <Badge variant="outline" className="text-[9px] text-rose-500 border-rose-500/30">
                                Cancelled
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px]">
                              {REGION_NAME[s.region]}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {fmtDateTime(s.startsAt)}
                            {s.durationMins ? ` (${s.durationMins}m)` : ""}
                            {s.teacher ? ` · ${s.teacher}` : ""}
                            {s.location ? ` · ${s.location}` : ""}
                          </div>
                        </div>
                        <div className="text-right shrink-0 w-24">
                          <div className="text-[12px] font-semibold tabular-nums">
                            {s.booked}
                            {s.capacity != null ? ` / ${s.capacity}` : ""}
                          </div>
                          {s.capacity != null && (
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                              <div
                                className={cn("h-full rounded-full", pct >= 95 ? "bg-amber-500" : "bg-emerald-500")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <SessionRosterCard
              sessionId={selectedSessionId}
              canWrite={canWrite}
              onSelectMember={(memberId, name) => {
                const regionCode = (memberId.split(":")[0] === "blr" ? "blr" : "mum") as "mum" | "blr";
                setSelectedMember({
                  id: memberId,
                  region: regionCode,
                  name: name || memberId,
                  email: null,
                  phone: null,
                  totalVisits: 0,
                  firstSeen: null,
                  lastSeen: null,
                  tags: [],
                });
                setActiveTab("members");
              }}
            />
          </div>
        </TabsContent>

        {/* 3. Live Membership Catalogue */}
        <TabsContent value="catalogue" className="mt-3">
          <LiveCatalogueSection region={region} configured={configuredCount > 0} />
        </TabsContent>

        {/* 4. Live Trainers */}
        <TabsContent value="trainers" className="mt-3">
          <LiveTrainersSection region={region} configured={configuredCount > 0} />
        </TabsContent>

        {/* 5. Live Leads */}
        <TabsContent value="leads" className="mt-3">
          <LiveLeadsSection region={region === "blr" ? "blr" : "mum"} configured={configuredCount > 0} />
        </TabsContent>

        {/* 6. Real Webhooks & Capability Probe */}
        <TabsContent value="webhooks" className="mt-3">
          <LiveWebhooksAndHealthSection status={status} onRefresh={loadStatus} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/35 border border-border/60">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="text-[13px] font-semibold mt-0.5 tabular-nums truncate">{value}</div>
    </div>
  );
}

function SessionRosterCard({
  sessionId,
  canWrite,
  onSelectMember,
}: {
  sessionId: string | null;
  canWrite: boolean;
  onSelectMember: (id: string, name?: string | null) => void;
}) {
  const s = useMomenceSection<any>(sessionId ? `/api/momence/sessions/${encodeURIComponent(sessionId)}/roster` : null);
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  if (!sessionId) {
    return (
      <div className="iris-card p-6 text-center text-[12px] text-muted-foreground h-fit">
        Select a session to inspect its live attendee roster.
      </div>
    );
  }

  return (
    <div className="iris-card p-4 space-y-3 h-fit">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live Class Roster</div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={s.reload}>
          <RefreshCw className={cn("w-3 h-3 mr-1", s.loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {s.loading ? (
        <div className="py-10 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading roster…
        </div>
      ) : s.error ? (
        <div className="py-6 text-center text-[12px] text-rose-500">{s.error}</div>
      ) : s.data ? (
        <>
          <div>
            <div className="text-[14px] font-semibold">{s.data.session.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {fmtDateTime(s.data.session.startsAt)}
              {s.data.session.teacher ? ` · ${s.data.session.teacher}` : ""}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <MetricBox
                label="Booked"
                value={`${s.data.counts.booked}${s.data.session.capacity ? `/${s.data.session.capacity}` : ""}`}
              />
              <MetricBox label="Checked In" value={s.data.counts.checkedIn} />
              <MetricBox label="Waitlist" value={s.data.waitlist ?? 0} />
            </div>
          </div>

          <div className="divide-y divide-border/60 max-h-[420px] overflow-y-auto iris-scrollbar border-t border-border pt-1">
            {(s.data.roster ?? []).map((r: any) => (
              <div key={r.bookingId} className="py-2 flex items-center justify-between gap-2 text-[12px]">
                <div className="min-w-0">
                  {r.memberId ? (
                    <button
                      type="button"
                      onClick={() => onSelectMember(r.memberId, r.name)}
                      className="font-medium hover:text-primary truncate block text-left"
                    >
                      {r.name || r.memberId}
                    </button>
                  ) : (
                    <span className="font-medium">{r.name || r.bookingId}</span>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono">{r.bookingId}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.checkedIn ? (
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Checked in
                    </Badge>
                  ) : (
                    canWrite && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() =>
                          setPending({
                            title: "Check in attendee",
                            detail: `Mark ${r.name || "this member"} as checked in for ${s.data.session.name}.`,
                            payload: { action: "check_in", bookingId: r.bookingId },
                            onDone: s.reload,
                          })
                        }
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Check in
                      </Button>
                    )
                  )}
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10px] text-rose-500"
                      onClick={() =>
                        setPending({
                          title: "Cancel booking",
                          detail: `Cancel ${r.name || "this member"}'s booking in Momence and refund class credit if applicable.`,
                          danger: true,
                          payload: { action: "cancel_booking", bookingId: r.bookingId, refund: true },
                          onDone: s.reload,
                        })
                      }
                    >
                      <Ban className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {(!s.data.roster || s.data.roster.length === 0) && (
              <div className="py-6 text-center text-[11.5px] text-muted-foreground">No active bookings on this class.</div>
            )}
          </div>
        </>
      ) : null}
      <ConfirmActionDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}

function LiveCatalogueSection({ region, configured }: { region: RegionFilter; configured: boolean }) {
  const url = configured ? `/api/momence/catalogue${region !== "all" ? `?region=${region}` : ""}` : null;
  const s = useMomenceSection<any[]>(url);
  const [q, setQ] = React.useState("");

  const items = React.useMemo(() => {
    const rows = s.data ?? [];
    if (!q.trim()) return rows;
    const lower = q.toLowerCase();
    return rows.filter((m) => `${m.name} ${m.type}`.toLowerCase().includes(lower));
  }, [s.data, q]);

  if (!configured) {
    return (
      <div className="iris-card p-8 text-center text-[12px] text-muted-foreground">
        Configure Momence API credentials to browse live membership plans and pricing.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter memberships…"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">{items.length} plans</span>
      </div>

      {s.loading ? (
        <div className="iris-card py-12 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading membership catalogue from Momence…
        </div>
      ) : s.error ? (
        <div className="iris-card p-6 text-center text-rose-500 text-[12px]">{s.error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((m) => (
            <div key={m.id} className={cn("iris-card p-3.5 space-y-1.5", m.disabled && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-semibold leading-snug">{m.name}</div>
                <Badge variant="outline" className="text-[9px] shrink-0">
                  {REGION_NAME[m.region as "mum" | "blr"] ?? m.region}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                <span>{m.type}</span>
                {m.price != null && <span>· ₹{Number(m.price).toLocaleString("en-IN")}</span>}
                {m.credits != null && <span>· {m.credits} credits</span>}
                {m.duration && <span>· {m.duration}</span>}
              </div>
              <div className="flex gap-1.5 pt-1">
                {m.autoRenewing && (
                  <Badge variant="secondary" className="text-[9px]">
                    Auto-renews
                  </Badge>
                )}
                {m.intro && (
                  <Badge variant="secondary" className="text-[9px]">
                    Intro offer
                  </Badge>
                )}
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">{m.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveTrainersSection({ region, configured }: { region: RegionFilter; configured: boolean }) {
  const [q, setQ] = React.useState("");
  const [trainers, setTrainers] = React.useState<
    Array<{ id: string; name: string; region: "mum" | "blr"; locations: string[]; classes: number }>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams({ region, ...(q.trim() ? { q: q.trim() } : {}) });
        const r = await fetch(`/api/momence/trainers?${qs.toString()}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed to load instructors");
        if (!cancelled) setTrainers(j.trainers ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load instructors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [region, q, configured]);

  if (!configured) {
    return (
      <div className="iris-card p-8 text-center text-[12px] text-muted-foreground">
        Configure Momence API credentials to view live instructor class counts and studio assignments.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-72">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search instructor or studio…"
          className="h-8 pl-8 text-[12px]"
        />
      </div>
      {loading ? (
        <div className="iris-card py-12 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Aggregating live instructor sessions…
        </div>
      ) : err ? (
        <div className="iris-card p-6 text-center text-rose-500 text-[12px]">{err}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trainers.map((t) => (
            <div key={t.id} className="iris-card p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate">{t.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {t.locations.join(", ") || REGION_NAME[t.region]}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[14px] font-bold tabular-nums">{t.classes}</div>
                <div className="text-[10px] text-muted-foreground">classes (37d)</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveLeadsSection({ region, configured }: { region: "mum" | "blr"; configured: boolean }) {
  const [q, setQ] = React.useState("");
  const url = configured
    ? `/api/momence/leads?region=${region}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`
    : null;
  const s = useMomenceSection<any>(url);

  if (!configured) {
    return (
      <div className="iris-card p-8 text-center text-[12px] text-muted-foreground">
        Configure Momence API credentials to inspect live customer leads.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${REGION_NAME[region]} leads…`}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        {s.data?.total != null && (
          <span className="text-[11px] text-muted-foreground">{s.data.total.toLocaleString()} total leads</span>
        )}
      </div>

      {s.loading ? (
        <div className="iris-card py-12 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading leads from Momence…
        </div>
      ) : s.unavailable ? (
        <div className="iris-card p-8 text-center text-[12px] text-muted-foreground">
          Customer leads endpoint is not enabled on this Momence host account.
        </div>
      ) : s.error ? (
        <div className="iris-card p-6 text-center text-rose-500 text-[12px]">{s.error}</div>
      ) : (
        <div className="iris-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">Lead</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(s.data?.leads ?? []).map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium">{l.name || l.id}</td>
                  <td className="py-2 px-3 text-muted-foreground">{[l.email, l.phone].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="py-2 px-3">{l.source || "—"}</td>
                  <td className="py-2 px-3">
                    {l.stage ? <Badge variant="outline" className="text-[10px]">{l.stage}</Badge> : "—"}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-muted-foreground">{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
              {(!s.data?.leads || s.data.leads.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LiveWebhooksAndHealthSection({
  status,
  onRefresh,
}: {
  status: MomenceStatusResponse | null;
  onRefresh: () => void;
}) {
  const [probing, setProbing] = React.useState(false);
  const [caps, setCaps] = React.useState<Record<string, Record<string, number>> | null>(null);

  const runCapabilityProbe = async () => {
    setProbing(true);
    try {
      const r = await fetch("/api/momence/meta?what=capabilities", { cache: "no-store" });
      const j = await r.json();
      if (j.data) {
        setCaps(j.data);
        toast.success("Momence endpoint capability check complete");
      } else {
        toast.error(j.error || "Probe unavailable");
      }
    } catch {
      toast.error("Probe failed");
    } finally {
      setProbing(false);
    }
  };

  const endpointUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${status?.webhook.endpointPath ?? "/api/momence/webhook"}`
      : "/api/momence/webhook";

  return (
    <div className="space-y-4">
      <div className="iris-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">Incoming Momence Webhook Receiver</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                status?.webhook.secretConfigured
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20",
              )}
            >
              {status?.webhook.secretConfigured ? "Secret Configured" : "MOMENCE_WEBHOOK_SECRET Not Set"}
            </Badge>
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-1">
            POST <code className="font-mono text-foreground">{endpointUrl}</code> · Header{" "}
            <code className="font-mono">x-iris-webhook-secret</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && status.configuredRegions.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={runCapabilityProbe} disabled={probing}>
              <Activity className={cn("w-3.5 h-3.5 mr-1.5", probing && "animate-spin")} />
              {probing ? "Probing API…" : "Probe Host Endpoints"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Log
          </Button>
        </div>
      </div>

      {caps && (
        <div className="iris-card p-4 space-y-2">
          <div className="text-[12px] font-semibold">Live Endpoint Capability Matrix (HTTP Status)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(caps).map(([reg, endpoints]) => (
              <div key={reg} className="p-3 rounded-lg border border-border space-y-1.5">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {REGION_NAME[reg as "mum" | "blr"] ?? reg}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(endpoints).map(([ep, code]) => (
                    <span
                      key={ep}
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded",
                        code === 200
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {ep}: {code}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="iris-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-semibold">
            Recorded Webhook Deliveries (<code className="font-mono text-[11px]">iris.webhook_events</code>)
          </span>
          <span className="text-[11px] text-muted-foreground">
            24h: {status?.webhook.received24h ?? 0} · 7d: {status?.webhook.received7d ?? 0} · Failed:{" "}
            {status?.webhook.failed7d ?? 0}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">Received</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Linked Ticket / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(status?.webhook.recentEvents ?? []).map((ev) => (
                <tr key={ev.id} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(ev.received_at)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{ev.event_type}</td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        ev.status === "processed" || ev.status === "received"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20",
                      )}
                    >
                      {ev.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                    {ev.processing_error ? (
                      <span className="text-rose-500">{ev.processing_error}</span>
                    ) : ev.ticket_id ? (
                      <span className="font-mono">{ev.ticket_id}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {(!status?.webhook.recentEvents || status.webhook.recentEvents.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[12px] text-muted-foreground">
                    No Momence webhook events recorded in <code className="font-mono">iris.webhook_events</code> yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
