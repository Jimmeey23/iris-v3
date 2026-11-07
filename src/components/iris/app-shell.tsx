"use client";

import * as React from "react";
import { useAppStore, ViewName } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import { IrisLogo } from "./iris-logo";
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
  Search,
  Command,
  Moon,
  Sun,
  Plus,
  AlertTriangle,
  Brain,
  Users,
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
  { id: "department_queue", label: "Department", icon: Building2, group: "main" },
  { id: "escalations", label: "Escalations", icon: AlertTriangle, group: "main", badge: () => ALL_TICKETS.filter(t => t.status === "escalated" || t.slaStatus === "breached").length },
  { id: "trainers", label: "Trainers", icon: Users, group: "main" },
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
  const { currentView, setCurrentView, sidebarCollapsed, toggleSidebar, currentUser } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-out relative z-30",
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
              <div className="text-[8px] text-muted-foreground font-medium tracking-wide mt-0.5">
                Intelligent Routing & Intuitive Systems
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
                              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                              isActive
                                ? "bg-[#f9f9f9] dark:bg-[#1c1c1e] text-primary"
                                : "text-muted-foreground hover:bg-[#f9f9f9]/50 dark:hover:bg-[#1c1c1e]/50 hover:text-foreground",
                              sidebarCollapsed && "justify-center px-0"
                            )}
                          >
                            <Icon className={cn("w-[16px] h-[16px] shrink-0", isActive && "text-primary")} />
                            {!sidebarCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
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
                    AM
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-[12px] font-medium truncate">{currentUser.name}</div>
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
        {/* Top Bar */}
        <header className="h-12 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search..."
                className="h-7 pl-8 pr-10 text-[12px] bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-border"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-medium text-muted-foreground bg-background px-1 py-px rounded border border-border flex items-center gap-0.5">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground">
            <span className="iris-live-dot" />
            Operational
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {mounted && theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle theme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 relative">
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">3 notifications</TooltipContent>
          </Tooltip>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <div className="iris-fade-in h-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
