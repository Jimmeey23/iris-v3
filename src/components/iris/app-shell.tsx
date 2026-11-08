"use client";
import { absUrl } from "@/lib/iris/utils";

import * as React from "react";
import { FeedbackButton } from "./feedback-dialog";
import { useAppStore, ViewName } from "@/lib/iris/store";
import { useSettingsStore } from "@/lib/iris/settings-store";
import { cn } from "@/lib/utils";
import { IrisLogo } from "./iris-logo";
import { AccentRandomizer } from "./accent-randomizer";
import {
  LayoutDashboard,
  Sparkles,
  Ticket,
  UserCircle,
  Building2,
  BarChart3,
  BookOpen,
  LayoutTemplate,
  FileBarChart,
  Plug,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  RefreshCw,
  Lock,
  Search,
  Command,
  Moon,
  Sun,
  Plus,
  AlertTriangle,
  Brain,
  Users,
  CheckCircle2,
  Clock,
  Flame,
  X,
  UserSearch,
  LogOut,
  Wrench,
  Radar as RadarIcon,
} from "lucide-react";
import { useAuth } from "./auth-gate";
import { getInitials } from "@/lib/iris/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ALL_TICKETS, isOwner } from "@/lib/iris/sample-tickets";
import { RelativeTime } from "./relative-time";
import { CommandPalette } from "./command-palette";
import { Member360Lookup } from "./member-360";

interface NavItem {
  id: ViewName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "main" | "intelligence" | "config";
  badge?: () => number;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "main" },
  { id: "ai_assistant", label: "AI Assistant", icon: Sparkles, group: "main" },
  { id: "all_tickets", label: "All Tickets", icon: Ticket, group: "main", badge: () => ALL_TICKETS.filter(t => t.status !== "closed" && t.status !== "resolved").length },
  { id: "my_tickets", label: "My Tickets", icon: UserCircle, group: "main", badge: () => ALL_TICKETS.filter(t => isOwner(t, useAppStore.getState().currentUser.id) && t.status !== "closed" && t.status !== "resolved").length },
  { id: "department_queue", label: "Department", icon: Building2, group: "main" },
  { id: "escalations", label: "Escalations", icon: AlertTriangle, group: "main", badge: () => ALL_TICKETS.filter(t => t.status === "escalated" || t.slaStatus === "breached").length },
  { id: "trainers", label: "Trainers", icon: Users, group: "main", adminOnly: true },
  { id: "equipment", label: "Equipment", icon: Wrench, group: "main" },
  { id: "radar", label: "Radar", icon: RadarIcon, group: "main" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "intelligence" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, group: "intelligence" },
  { id: "reports", label: "Reports", icon: FileBarChart, group: "intelligence" },
  { id: "knowledge_base", label: "Knowledge", icon: BookOpen, group: "intelligence" },
  { id: "momence", label: "Momence", icon: Plug, group: "config" },
  { id: "email_templates", label: "Emails", icon: Mail, group: "config" },
  { id: "settings", label: "Settings", icon: Settings, group: "config" },
];

const NAV_GROUPS: { id: NavItem["group"]; label?: string }[] = [
  { id: "main" },
  { id: "intelligence", label: "Intelligence" },
  { id: "config", label: "System" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    currentView,
    setCurrentView,
    sidebarCollapsed,
    toggleSidebar,
    currentUser,
    workspaceName,
    workspaceSettings,
    dataVersion,
    selectTicket,
  } = useAppStore();
  const inAppPref = useSettingsStore((s) => s.notificationChannels.inApp);
  const inAppAlertsActive = workspaceSettings["notifications.in_app_enabled"] !== false && inAppPref !== false;
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Support deep-links from notification emails (`/?ticket=P57-00142` or `/?ticket=<id>`)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ticketParam = url.searchParams.get("ticket");
    if (!ticketParam) return;
    const matched = ALL_TICKETS.find((t) => t.id === ticketParam || t.ticketId === ticketParam);
    if (matched) {
      selectTicket(matched.id);
      url.searchParams.delete("ticket");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [dataVersion, selectTicket]);

  const myOpenCount = React.useMemo(() => {
    void dataVersion;
    return ALL_TICKETS.filter((t) => isOwner(t, currentUser.id) && t.status !== "resolved" && t.status !== "closed").length;
  }, [dataVersion, currentUser.id]);
  const breachedCount = React.useMemo(() => {
    void dataVersion;
    return ALL_TICKETS.filter((t) => t.slaStatus === "breached" && t.status !== "resolved" && t.status !== "closed").length;
  }, [dataVersion]);
  const [refreshing, setRefreshing] = React.useState(false);
  const refreshData = async () => {
    setRefreshing(true);
    try {
      const { loadAll } = await import("@/lib/iris/live-data");
      await loadAll();
      useAppStore.getState().bumpData();
    } catch {
      /* keep what we have */
    } finally {
      setRefreshing(false);
    }
  };

  // ⌘K Command Palette state
  const [cmdOpen, setCmdOpen] = React.useState(false);
  // Member 360 Lookup state
  const [memberLookupOpen, setMemberLookupOpen] = React.useState(false);
  const [memberLookupQuery, setMemberLookupQuery] = React.useState("");

  // Global ⌘K / Ctrl+K keyboard listener
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Real in-app notifications (iris.notifications) via /api/notifications, polled every minute.
  type BellNotification = {
    id: string;
    title: string;
    body: string;
    type: "critical" | "sla" | "escalated" | "assignment" | "comment" | "mention" | "info";
    ticketId?: string | null;
    isRead: boolean;
    createdAt: string;
  };
  const [notifications, setNotifications] = React.useState<BellNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetch(absUrl("/api/notifications?limit=20"), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* offline: keep the last list */
    }
  }, []);
  React.useEffect(() => {
    if (!inAppAlertsActive) return;
    void loadNotifications();
    const timer = window.setInterval(loadNotifications, 60_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications, inAppAlertsActive]);
  const markRead = React.useCallback(async (body: { ids?: string[]; all?: boolean }) => {
    setNotifications((list) => list.map((n) => (body.all || body.ids?.includes(n.id) ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => (body.all ? 0 : Math.max(0, c - (body.ids?.length ?? 0))));
    try {
      await fetch(absUrl("/api/notifications"), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      void loadNotifications();
    }
  }, [loadNotifications]);

  const handleNotificationClick = (n: BellNotification) => {
    if (!n.isRead) void markRead({ ids: [n.id] });
    if (n.ticketId) {
      // selectTicket exists on store; use it directly
      useAppStore.getState().selectTicket(n.ticketId);
      setCurrentView("all_tickets");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mount the accent randomizer - applies a random data-accent attribute on every load */}
      <AccentRandomizer />
      {/* Sidebar */}
      <aside
        className={cn(
          "iris-app-sidebar flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-out relative z-30",
          sidebarCollapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <button
          onClick={() => setCurrentView("overview")}
          className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border shrink-0 hover:bg-sidebar-accent/50 transition-colors"
        >
          <div className="shrink-0 transition-transform hover:scale-105">
            <IrisLogo size={28} />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden text-left">
              <div className="text-[14px] font-semibold tracking-tight text-sidebar-foreground leading-none">
                IRIS
              </div>
              <div className="text-[8.5px] text-muted-foreground font-medium tracking-wide mt-0.5 truncate">
                {workspaceName || "Physique 57 India"}
              </div>
            </div>
          )}
        </button>

        {/* New Issue */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={() => setCurrentView("ai_assistant")}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium px-3 py-2 transition-opacity hover:opacity-90",
              sidebarCollapsed && "px-0"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span>New Issue</span>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {NAV_GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group.id);
            if (items.length === 0) return null;
            return (
              <div key={group.id} className="mb-0.5">
                {!sidebarCollapsed && group.label && (
                  <div className="px-2.5 pt-4 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                    {group.label}
                  </div>
                )}
                {sidebarCollapsed && group.label && <div className="h-3" />}
                <div className="space-y-px">
                  {items.map((item) => {
                    const isActive = currentView === item.id;
                    const badgeCount = item.badge?.();
                    const Icon = item.icon;
                    return (
                      <Tooltip key={item.id} delayDuration={400}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setCurrentView(item.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                              sidebarCollapsed && "justify-center px-0"
                            )}
                          >
                            <Icon className={cn("w-[16px] h-[16px] shrink-0", isActive && "text-primary")} />
                            {!sidebarCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                            {!sidebarCollapsed && item.adminOnly && currentUser.tier !== "admin" && (
                              <Lock className="w-3 h-3 text-muted-foreground/70 shrink-0" aria-label="Admins only" />
                            )}
                            {!sidebarCollapsed && badgeCount != null && badgeCount > 0 && (
                              <span className={cn(
                                "text-[10px] font-semibold tabular-nums px-1.5 py-px rounded",
                                item.id === "escalations"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {badgeCount}
                              </span>
                            )}
                            {sidebarCollapsed && badgeCount != null && badgeCount > 0 && (
                              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
                            )}
                          </button>
                        </TooltipTrigger>
                        {sidebarCollapsed && (
                          <TooltipContent side="right" className="text-[12px] font-medium">
                            {item.label}
                            {badgeCount != null && badgeCount > 0 && (
                              <span className="ml-1.5 text-muted-foreground">({badgeCount})</span>
                            )}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <div className={cn("flex items-center gap-2", sidebarCollapsed && "justify-center")}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 flex-1 min-w-0 px-1.5 py-1">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
                    {getInitials(currentUser.name || currentUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-[12px] font-medium truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{currentUser.role}</div>
                </div>
              </div>
            )}
            {!sidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    aria-label="Sign out"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Sign out</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const next = !sidebarCollapsed;
                    toggleSidebar();
                    useSettingsStore.getState().update("sidebarCollapsed", next);
                    void useSettingsStore.getState().saveToServer({ sidebarCollapsed: next }).catch(() => {});
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors shrink-0"
                >
                  {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{sidebarCollapsed ? "Expand" : "Collapse"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_IRIS_PREVIEW_MODE === "true" && <div className="shrink-0 bg-amber-500/15 border-b border-amber-500/25 px-5 py-2 text-[11px] text-amber-700 dark:text-amber-300">Preview mode · Authentication is bypassed locally. Live data and changes are unavailable.</div>}
        {/* Top Bar */}
        <header className="iris-app-header h-16 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 flex items-center px-5 gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            {/* Click-to-open the ⌘K command palette. The visual is a fake input
                so it looks like a search field, but clicking it opens the palette. */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="relative flex-1 text-left h-9 pl-9 pr-10 text-[12px] bg-muted/50 border border-border/50 hover:border-border rounded-lg text-muted-foreground cursor-pointer transition-colors"
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
              Search tickets, members, articles...
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-medium text-muted-foreground bg-background px-1 py-px rounded border border-border flex items-center gap-0.5 pointer-events-none">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </div>

          {/* Live queue counters */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentView("my_tickets")}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-card/70 text-[11px] font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
              title="Open tickets you own"
            >
              <UserCircle className="w-3.5 h-3.5 text-primary" />
              My queue
              <span className="tabular-nums text-[10px] font-bold px-1.5 rounded bg-primary/10 text-primary">{myOpenCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("escalations")}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-medium transition-colors",
                breachedCount ? "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10" : "border-border bg-card/70 text-muted-foreground hover:bg-muted/60",
              )}
              title="Open tickets past their SLA"
            >
              <Clock className="w-3.5 h-3.5" />
              Past SLA
              <span className="tabular-nums text-[10px] font-bold">{breachedCount}</span>
            </button>
          </div>

          {/* Right cluster: status + actions, pinned to extreme right */}
          <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <span className="iris-live-dot" />
            Operational
          </div>

          <button
            type="button"
            onClick={() => setCurrentView("ai_assistant")}
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium shadow-[0_6px_16px_-8px_var(--primary)] hover:brightness-110 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New issue
          </button>

          <div className="flex items-center gap-0.5 p-0.5 rounded-xl border border-border/80 bg-muted/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Refresh data"
                onClick={() => void refreshData()}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh tickets and reference data</TooltipContent>
          </Tooltip>

          {/* Member 360 Lookup button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Member 360 Lookup"
                onClick={() => { setMemberLookupQuery(""); setMemberLookupOpen(true); }}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <UserSearch className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Member 360 Lookup</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-background"
                onClick={() => {
                  const next = theme === "dark" ? "light" : "dark";
                  setTheme(next);
                  void useSettingsStore.getState().saveToServer({ theme: next }).catch(() => {});
                }}
              >
                {mounted && theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle theme</TooltipContent>
          </Tooltip>

          <FeedbackButton />

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Notifications"
                className="relative inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                {inAppAlertsActive && unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-80 p-0 max-h-[480px] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[12px] font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => void markRead({ all: true })}
                >
                  Mark all read
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <div className="text-[12px] font-medium">All caught up</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">No active notifications.</div>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon =
                      n.type === "critical" ? Flame :
                      n.type === "sla" ? Clock :
                      n.type === "escalated" ? AlertTriangle :
                      n.type === "assignment" ? UserCircle :
                      n.type === "comment" || n.type === "mention" ? Mail :
                      Brain;
                    const colorClass =
                      n.type === "critical" ? "text-rose-500" :
                      n.type === "sla" ? "text-amber-500" :
                      n.type === "escalated" ? "text-orange-500" :
                      "text-primary";
                    const unread = !n.isRead;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className="iris-notif-item w-full text-left"
                      >
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Icon className={cn("w-3.5 h-3.5", colorClass)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[12px] leading-tight truncate", unread ? "font-semibold" : "font-medium text-muted-foreground")}>{n.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">{n.body}</div>
                          <div className="text-[9px] text-muted-foreground/70 mt-0.5"><RelativeTime date={n.createdAt} /></div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-border p-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentView("escalations")}
                    className="w-full text-center text-[11px] font-medium text-primary hover:underline py-1"
                  >
                    Open Escalations queue
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          </div>

          {/* Account menu */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Account" className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full hover:bg-muted/60 transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
                    {getInitials(currentUser.name || currentUser.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:block text-left leading-tight">
                  <span className="block text-[11px] font-semibold max-w-[120px] truncate">{currentUser.name}</span>
                  <span className="block text-[9px] text-muted-foreground capitalize">{currentUser.tier}</span>
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-56 p-1">
              <div className="px-2.5 py-2 border-b border-border mb-1">
                <div className="text-[12px] font-semibold truncate">{currentUser.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{currentUser.email}</div>
                <div className="text-[10px] text-muted-foreground">{currentUser.role}</div>
              </div>
              {[
                { icon: UserCircle, label: "My tickets", view: "my_tickets" as const },
                { icon: Building2, label: "My department queue", view: "department_queue" as const },
                { icon: Settings, label: "Settings", view: "settings" as const },
              ].map((it) => (
                <button key={it.label} type="button" onClick={() => setCurrentView(it.view)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] hover:bg-muted/60">
                  <it.icon className="w-3.5 h-3.5 text-muted-foreground" />{it.label}
                </button>
              ))}
              <button type="button" onClick={() => setCmdOpen(true)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] hover:bg-muted/60">
                <Command className="w-3.5 h-3.5 text-muted-foreground" />Command palette<kbd className="ml-auto text-[9px] text-muted-foreground">⌘K</kbd>
              </button>
              <div className="h-px bg-border my-1" />
              <button type="button" onClick={signOut} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-rose-600 hover:bg-rose-500/5">
                <LogOut className="w-3.5 h-3.5" />Sign out
              </button>
            </PopoverContent>
          </Popover>
          </div>
        </header>

        {/* Content */}
        <main className="iris-app-main flex-1 overflow-hidden">
          <div className="iris-fade-in h-full overflow-y-auto">{children}</div>
        </main>
      </div>

      {/* === GLOBAL OVERLAYS === */}
      {/* ⌘K Command Palette - global smart search across tickets / members / KB / templates */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      {/* Member 360 Lookup - full member profile modal */}
      <Member360Lookup
        open={memberLookupOpen}
        onOpenChange={setMemberLookupOpen}
        initialQuery={memberLookupQuery}
      />
    </div>
  );
}
