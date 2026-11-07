"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { KNOWLEDGE_ARTICLES, KNOWLEDGE_CATEGORIES, KnowledgeArticle } from "@/lib/iris/knowledge-base-data";
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
  Shield,
  ChevronRight,
  Star,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Class Experience": Users,
  "Trainer Feedback": Users,
  "Repair and Maintenance": Wrench,
  "Pricing and Memberships": CreditCard,
  "Scheduling": Calendar,
  "Safety and Security": Shield,
  "Customer Service and Communication": Users,
  "Theft and Lost Items": AlertTriangle,
};

export function KnowledgeBaseView() {
  const { setCurrentView } = useAppStore();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [selectedArticle, setSelectedArticle] = React.useState<KnowledgeArticle | null>(null);

  const filtered = React.useMemo(() => {
    return KNOWLEDGE_ARTICLES.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) &&
            !a.summary.toLowerCase().includes(q) &&
            !a.steps.some(s => s.toLowerCase().includes(q))) return false;
      }
      if (category !== "all" && a.category !== category) return false;
      return true;
    });
  }, [search, category]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
            <BookOpen className="w-3 h-3" />
            {KNOWLEDGE_ARTICLES.length} Articles · Curated
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Operational guides, troubleshooting steps, and protocols — curated from the P57 Brand Book and member issue data.
          </p>
        </div>
        <Button className="h-8 text-[12px]">
          <Plus className="w-3 h-3 mr-1.5" />
          New Article
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total Articles" value={KNOWLEDGE_ARTICLES.length} icon={BookOpen} />
        <StatCard label="Categories" value={KNOWLEDGE_CATEGORIES.length} icon={HelpCircle} />
        <StatCard label="Troubleshooting" value={KNOWLEDGE_ARTICLES.filter(a => a.category === "Repair and Maintenance").length} icon={Wrench} />
        <StatCard label="Safety Protocols" value={KNOWLEDGE_ARTICLES.filter(a => a.category === "Safety and Security").length} icon={Shield} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search articles..."
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
              category === "all" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {KNOWLEDGE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c] || BookOpen;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                  category === c ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {KNOWLEDGE_ARTICLES.length} articles
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a, i) => {
          const Icon = CATEGORY_ICONS[a.category] || BookOpen;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedArticle(a)}
              className="text-left iris-card p-4 hover:border-primary/30 transition-colors iris-fade-in-up group"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-muted-foreground">{a.id}</div>
                  <div className="text-[13px] font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {a.title}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                {a.summary}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px] h-4 px-1">{a.category}</Badge>
                <span className="flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {a.steps.length} steps
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] text-muted-foreground">No articles match your search</div>
        </div>
      )}

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        {selectedArticle && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{selectedArticle.id}</span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{selectedArticle.category}</Badge>
              </div>
              <DialogTitle className="text-[16px] leading-tight">{selectedArticle.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
                <p className="text-[13px] text-foreground/90 leading-relaxed">{selectedArticle.summary}</p>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  Troubleshooting Steps
                </div>
                <div className="space-y-2">
                  {selectedArticle.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md border border-border">
                      <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[11px] font-bold tabular-nums">
                        {i + 1}
                      </div>
                      <div className="text-[12px] text-foreground/90 leading-relaxed flex-1">{step}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedArticle.prevention && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Prevention
                  </div>
                  <div className="text-[12px] text-foreground/90 leading-relaxed">{selectedArticle.prevention}</div>
                </div>
              )}

              {selectedArticle.escalation && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Escalation Criteria
                  </div>
                  <div className="text-[12px] text-foreground/90 leading-relaxed">{selectedArticle.escalation}</div>
                </div>
              )}

              {selectedArticle.relatedTemplates && selectedArticle.relatedTemplates.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Related Templates</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedArticle.relatedTemplates.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedArticle(null); setCurrentView("templates"); }}
                        className="px-2 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="iris-card p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-[16px] font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
