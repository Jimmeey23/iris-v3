"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Search,
  Plus,
  Clock,
  TrendingUp,
  HelpCircle,
  Wrench,
  Users,
  CreditCard,
  Calendar,
  Building2,
  Cpu,
  ChevronRight,
  Star,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ARTICLES = [
  { id: "KB-001", title: "How to handle membership freeze requests", category: "Membership", views: 234, helpful: 96, lastUpdated: "2 days ago", icon: CreditCard },
  { id: "KB-002", title: "Resolving Momence payment sync issues", category: "Payment", views: 187, helpful: 92, lastUpdated: "1 week ago", icon: CreditCard },
  { id: "KB-003", title: "AC malfunction troubleshooting checklist", category: "Facilities", views: 312, helpful: 98, lastUpdated: "3 days ago", icon: Wrench },
  { id: "KB-004", title: "Setting up recurring class bookings", category: "Scheduling", views: 156, helpful: 89, lastUpdated: "5 days ago", icon: Calendar },
  { id: "KB-005", title: "Front desk check-in error resolution", category: "Front Desk", views: 421, helpful: 94, lastUpdated: "1 day ago", icon: Users },
  { id: "KB-006", title: "Sound system reboot procedures", category: "Facilities", views: 198, helpful: 91, lastUpdated: "1 week ago", icon: Wrench },
  { id: "KB-007", title: "Refund authorization workflow", category: "Payment", views: 167, helpful: 95, lastUpdated: "4 days ago", icon: CreditCard },
  { id: "KB-008", title: "Momence member search best practices", category: "IT", views: 289, helpful: 97, lastUpdated: "2 days ago", icon: Cpu },
  { id: "KB-009", title: "Studio closure notification process", category: "Operations", views: 145, helpful: 88, lastUpdated: "1 week ago", icon: Building2 },
  { id: "KB-010", title: "VIP client handling guidelines", category: "Client Experience", views: 178, helpful: 93, lastUpdated: "3 days ago", icon: Star },
  { id: "KB-011", title: "Credit adjustment approval matrix", category: "Membership", views: 134, helpful: 90, lastUpdated: "5 days ago", icon: CreditCard },
  { id: "KB-012", title: "Instructor schedule conflict resolution", category: "Training", views: 112, helpful: 87, lastUpdated: "1 week ago", icon: Users },
];

const CATEGORIES = Array.from(new Set(ARTICLES.map((a) => a.category)));

export function KnowledgeBaseView() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");

  const filtered = ARTICLES.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q)) return false;
    }
    if (category !== "all" && a.category !== category) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <BookOpen className="w-3 h-3 text-violet-500" />
            {ARTICLES.length} Articles
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational guides, troubleshooting steps, and best practices for all teams.
          </p>
        </div>
        <Button className="h-8 text-[12px]">
          <Plus className="w-3 h-3 mr-1.5" />
          New Article
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Articles" value={ARTICLES.length} icon={BookOpen} />
        <StatCard label="Categories" value={CATEGORIES.length} icon={HelpCircle} />
        <StatCard label="Total Views" value="2,533" icon={Eye} />
        <StatCard label="Avg Helpfulness" value="93%" icon={TrendingUp} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search knowledge base..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
              category === "all" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                category === c ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a, i) => (
          <button
            key={a.id}
            className="text-left iris-card p-4 hover:scale-[1.01] transition-transform iris-fade-in-up group"
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <a.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-muted-foreground">{a.id}</div>
                <div className="text-[13px] font-semibold leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                  {a.title}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">{a.category}</Badge>
              <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{a.views}</span>
              <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5 text-amber-500" />{a.helpful}%</span>
              <span className="ml-auto flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{a.lastUpdated}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="iris-card p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
