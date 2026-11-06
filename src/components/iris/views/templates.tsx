"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { TICKET_TEMPLATES, TEMPLATE_CATEGORIES, TicketTemplate } from "@/lib/iris/templates";
import { DEPARTMENTS, DEPT_MAP, PRIORITY_CONFIG } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Plus,
  Clock,
  User,
  Building2,
  Zap,
  Eye,
  Wand2,
  Sparkles,
  Tag,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TemplatesView() {
  const { setCurrentView } = useAppStore();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [department, setDepartment] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [selectedTemplate, setSelectedTemplate] = React.useState<TicketTemplate | null>(null);

  const filtered = React.useMemo(() => {
    return TICKET_TEMPLATES.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) &&
            !t.description.toLowerCase().includes(q) &&
            !t.code.toLowerCase().includes(q) &&
            !t.category.toLowerCase().includes(q)) return false;
      }
      if (category !== "all" && t.category !== category) return false;
      if (department !== "all" && t.departmentCode !== department) return false;
      if (priority !== "all" && t.defaultPriority !== priority) return false;
      return true;
    });
  }, [search, category, department, priority]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Wand2 className="w-3 h-3 text-violet-500" />
            {TICKET_TEMPLATES.length} Templates Available
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ticket Templates Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pre-configured templates for faster ticket submission across all operational scenarios.
          </p>
        </div>
        <Button className="h-8 text-[12px]">
          <Plus className="w-3 h-3 mr-1.5" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Templates" value={TICKET_TEMPLATES.length} icon={Wand2} color="violet" />
        <StatCard label="Categories" value={TEMPLATE_CATEGORIES.length} icon={Tag} color="sky" />
        <StatCard label="Departments" value={new Set(TICKET_TEMPLATES.map(t => t.departmentCode)).size} icon={Building2} color="emerald" />
        <StatCard label="Avg Resolution" value="42h" icon={Clock} color="amber" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search templates by title, description, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-[160px] text-[12px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-8 w-[180px] text-[12px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-[120px] text-[12px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="P0">P0 — Critical</SelectItem>
            <SelectItem value="P1">P1 — High</SelectItem>
            <SelectItem value="P2">P2 — Medium</SelectItem>
            <SelectItem value="P3">P3 — Low</SelectItem>
          </SelectContent>
        </Select>
        {(search || category !== "all" || department !== "all" || priority !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => { setSearch(""); setCategory("all"); setDepartment("all"); setPriority("all"); }}
          >
            <X className="w-3 h-3 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Templates Grid */}
      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {TICKET_TEMPLATES.length} templates
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t, i) => {
          const dept = DEPT_MAP[t.departmentCode];
          const priorityConfig = PRIORITY_CONFIG[t.defaultPriority];
          return (
            <button
              key={t.code}
              onClick={() => setSelectedTemplate(t)}
              className="text-left iris-card p-3.5 hover:scale-[1.01] transition-transform iris-fade-in-up group"
              style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", priorityConfig.bg, priorityConfig.text)}>
                  {t.defaultPriority}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{t.category}</span>
              </div>
              <div className="text-[13px] font-semibold leading-tight mb-1.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                {t.title}
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {t.description}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {dept && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5" />
                    {dept.name.split(" ")[0]}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {t.estimatedResolutionHours}h
                </span>
                {t.customFields && t.customFields.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {t.customFields.length} custom
                  </span>
                )}
                <Eye className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Wand2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] text-muted-foreground">No templates match your filters</div>
        </div>
      )}

      {/* Template Detail Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        {selectedTemplate && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto iris-scrollbar">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", PRIORITY_CONFIG[selectedTemplate.defaultPriority].bg, PRIORITY_CONFIG[selectedTemplate.defaultPriority].text)}>
                  {selectedTemplate.defaultPriority}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{selectedTemplate.code}</span>
                <span className="text-[10px] text-muted-foreground">{selectedTemplate.category}</span>
              </div>
              <DialogTitle className="text-[16px] leading-tight">{selectedTemplate.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                <p className="text-[13px] text-foreground/90 leading-relaxed">{selectedTemplate.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoBox label="Department" value={DEPT_MAP[selectedTemplate.departmentCode]?.name || "—"} />
                <InfoBox label="Default Priority" value={selectedTemplate.defaultPriority} />
                <InfoBox label="Subcategory" value={selectedTemplate.subcategory || "—"} />
                <InfoBox label="Estimated Resolution" value={`${selectedTemplate.estimatedResolutionHours} hours`} />
                <InfoBox label="Suggested Assignee" value={selectedTemplate.suggestedAssigneeRole || "Auto-routed"} />
                <InfoBox label="Default Severity" value={selectedTemplate.defaultSeverity || "Auto-detected"} />
              </div>

              {selectedTemplate.requiredFields.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Filter className="w-3 h-3" />Required Fields ({selectedTemplate.requiredFields.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.requiredFields.map((f) => (
                      <span key={f} className="px-2 py-0.5 text-[11px] rounded-md bg-muted text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.prefilledOptions && selectedTemplate.prefilledOptions.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-violet-500" />Prefilled Options
                  </div>
                  <div className="space-y-2">
                    {selectedTemplate.prefilledOptions.map((p, i) => (
                      <div key={i} className="p-2 rounded-md bg-violet-500/5 border border-violet-500/20">
                        <div className="text-[11px] font-medium mb-1">{p.field}</div>
                        <div className="flex flex-wrap gap-1">
                          {p.options.map((o) => (
                            <span key={o} className="px-1.5 py-0.5 text-[10px] rounded bg-background border border-border">{o}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.conditionalFields && selectedTemplate.conditionalFields.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" />Conditional Fields
                  </div>
                  <div className="space-y-2">
                    {selectedTemplate.conditionalFields.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20">
                        <div className="text-[12px] font-medium mb-1">If: {c.condition}</div>
                        <div className="text-[11px] text-muted-foreground mb-1.5">Then show: {c.field}</div>
                        <div className="flex flex-wrap gap-1">
                          {c.options.map((o) => (
                            <span key={o} className="px-1.5 py-0.5 text-[10px] rounded bg-background border border-border">{o}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.customFields && selectedTemplate.customFields.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Wand2 className="w-3 h-3 text-violet-500" />Custom Fields
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.customFields.map((f, i) => (
                      <div key={i} className="p-2 rounded-md border border-border">
                        <div className="text-[11px] font-medium">{f.name}</div>
                        <div className="text-[10px] text-muted-foreground">{f.type}</div>
                        {f.options && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {f.options.map((o) => (
                              <span key={o} className="px-1 py-0 text-[9px] rounded bg-muted">{o}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recommended Actions</div>
                <div className="p-3 rounded-md bg-muted/30 border border-border text-[12px] text-foreground/90 whitespace-pre-line leading-relaxed">
                  {selectedTemplate.recommendedActions}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  className="h-8 flex-1 text-[12px]"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setCurrentView("ai_assistant");
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Use This Template
                </Button>
                <Button variant="outline" className="h-8 text-[12px]">
                  Edit Template
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: "violet" | "sky" | "emerald" | "amber" }) {
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[12px] font-semibold">{value}</div>
    </div>
  );
}
