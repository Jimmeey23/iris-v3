"use client";

import * as React from "react";
import { useAppStore, ViewName } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  Ticket,
  UserCircle,
  Building2,
  TrendingUp,
  BarChart3,
  BookOpen,
  LayoutTemplate,
  FileBarChart,
  Plug,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  AlertTriangle,
  Bell,
  Search,
  Command,
  Moon,
  Sun,
  Plus,
} from "lucide-react";
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
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";

interface NavItem {
  id: ViewName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "main" | "intelligence" | "config";
  badge?: () => number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "main" },
  { id: "ai_assistant", label: "AI Assistant", icon: Sparkles, group: "main" },
  { id: "all_tickets", label: "All Tickets", icon: Ticket, group: "main", badge: () => ALL_TICKETS.filter(t => t.status !== "closed" && t.status !== "resolved").length },
  { id: "my_tickets", label: "My Tickets", icon: UserCircle, group: "main", badge: () => ALL_TICKETS.filter(t => t.assigneeId === "emp_001").length },
  { id: "department_queue", label: "Department Queue", icon: Building2, group: "main" },
  { id: "escalations", label: "Escalations", icon: AlertTriangle, group: "main", badge: () => ALL_TICKETS.filter(t => t.status === "escalated" || t.slaStatus === "breached").length },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "intelligence" },
  { id: "templates", label: "Ticket Templates", icon: LayoutTemplate, group: "intelligence" },
  { id: "reports", label: "Reports Library", icon: FileBarChart, group: "intelligence" },
  { id: "knowledge_base", label: "Knowledge Base", icon: BookOpen, group: "intelligence" },
  { id: "momence", label: "Momence Integration", icon: Plug, group: "config" },
  { id: "email_templates", label: "Email Templates", icon: Mail, group: "config" },
  { id: "settings", label: "Settings", icon: Settings, group: "config" },
];

const NAV_GROUPS = [
  { id: "main", label: "" },
  { id: "intelligence", label: "Intelligence" },
  { id: "config", label: "Configuration" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, sidebarCollapsed, toggleSidebar, currentUser } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out relative z-30",
          sidebarCollapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white font-bold text-base tracking-tight">IR</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
          </div>
          {!sidebarCollapsed && (
            <div className="iris-fade-in overflow-hidden">
              <div className="text-[15px] font-semibold tracking-tight text-sidebar-foreground leading-tight">
                IRIS
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Physique 57 India
              </div>
            </div>
          )}
        </div>

        {/* New Ticket Button */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => setCurrentView("ai_assistant")}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium px-3 py-2.5 iris-btn-glow transition-all hover:from-violet-500 hover:to-indigo-500",
              sidebarCollapsed && "px-0"
            )}
          >
            <Plus className="w-4 h-4" />
            {!sidebarCollapsed && <span>New Issue</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 iris-scrollbar">
          {NAV_GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group.id);
            if (items.length === 0) return null;
            return (
              <div key={group.id} className="mb-1">
                {!sidebarCollapsed && group.label && (
                  <div className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                )}
                {sidebarCollapsed && group.label && <div className="h-3" />}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = currentView === item.id;
                    const badgeCount = item.badge?.();
                    const Icon = item.icon;
                    return (
                      <Tooltip key={item.id} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setCurrentView(item.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group relative",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                              sidebarCollapsed && "justify-center px-0"
                            )}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-violet-500 to-indigo-600" />
                            )}
                            <Icon
                              className={cn(
                                "w-[18px] h-[18px] shrink-0 transition-colors",
                                isActive ? "text-violet-500 dark:text-violet-400" : ""
                              )}
                            />
                            {!sidebarCollapsed && (
                              <span className="flex-1 text-left truncate iris-fade-in">{item.label}</span>
                            )}
                            {!sidebarCollapsed && badgeCount && badgeCount > 0 && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "h-5 px-1.5 text-[10px] font-semibold tabular-nums",
                                  item.id === "escalations"
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {badgeCount}
                              </Badge>
                            )}
                            {sidebarCollapsed && badgeCount && badgeCount > 0 && (
                              <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                            )}
                          </button>
                        </TooltipTrigger>
                        {sidebarCollapsed && (
                          <TooltipContent side="right" className="font-medium">
                            {item.label}
                            {badgeCount && badgeCount > 0 && (
                              <span className="ml-2 text-muted-foreground">({badgeCount})</span>
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

        {/* Sidebar Footer */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          <div className={cn("flex items-center gap-2", sidebarCollapsed && "justify-center")}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 flex-1 min-w-0 iris-fade-in">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-semibold">
                    AM
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-[12px] font-semibold truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{currentUser.role}</div>
                </div>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors shrink-0"
                >
                  {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{sidebarCollapsed ? "Expand" : "Collapse"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search tickets, members, templates..."
                className="h-8 pl-8 pr-12 text-[13px] bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-border"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border flex items-center gap-0.5">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
          </div>

          {/* Live status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 text-[11px] font-medium">
            <span className="iris-pulse-dot" />
            <span className="text-muted-foreground">All systems operational</span>
          </div>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle theme</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">3 new notifications</TooltipContent>
          </Tooltip>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto iris-scrollbar">
          <div className="iris-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
