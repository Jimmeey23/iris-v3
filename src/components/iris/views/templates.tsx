"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { TICKET_TEMPLATES, TEMPLATE_CATEGORIES, type TicketTemplate } from "@/lib/iris/templates";
import { DEPARTMENTS, DEPT_MAP, PRIORITY_CONFIG, Priority } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Plus,
  Clock,
  Building2,
  Zap,
  Eye,
  Wand2,
  Sparkles,
  Tag,
  ChevronRight,
  X,
  Save,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Templates view — with a working Edit modal.
 *
 * Templates are lifted into React state on mount (cloned from the static
 * TICKET_TEMPLATES list). Edits update local state, so they persist for the
 * session. The "New Template" button creates a fresh template that can be
 * filled in via the same editor.
 *
 * The editor lets you change:
 *   - title, description, code, category, subcategory
 *   - default priority, department, suggested assignee role, default severity
 *   - estimated resolution hours
 *   - required fields (add/remove, free text)
 *   - recommended actions (multiline)
 */
export function TemplatesView() {
  const { setCurrentView } = useAppStore();

  // Lift templates into state so edits persist for the session.
  const [templates, setTemplates] = React.useState<TicketTemplate[]>(() =>
    TICKET_TEMPLATES.map((t) => ({ ...t })),
  );

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [department, setDepartment] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [editingCode, setEditingCode] = React.useState<string | null>(null);

  const selectedTemplate = React.useMemo(
    () => templates.find((t) => t.code === selectedCode) ?? null,
    [templates, selectedCode],
  );
  const editingTemplate = React.useMemo(
    () => templates.find((t) => t.code === editingCode) ?? null,
    [templates, editingCode],
  );

  const filtered = React.useMemo(() => {
    return templates.filter((t) => {
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
  }, [templates, search, category, department, priority]);

  const handleSaveTemplate = (updated: TicketTemplate) => {
    setTemplates((prev) =>
      prev.map((t) => (t.code === updated.code ? updated : t)),
    );
    setEditingCode(null);
    // If we were viewing the same template, refresh the view too
    if (selectedCode === updated.code) {
      setSelectedCode(updated.code);
    }
  };

  const handleNewTemplate = () => {
    // Generate a fresh code that doesn't collide with existing templates
    const maxNum = templates.reduce((max, t) => {
      const m = t.code.match(/^TPL-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const code = `TPL-${String(maxNum + 1).padStart(3, "0")}`;
    const fresh: TicketTemplate = {
      code,
      title: "Untitled Template",
      description: "",
      category: TEMPLATE_CATEGORIES[0] || "Operations",
      subcategory: "",
      departmentCode: DEPARTMENTS[0]?.code || "OPS",
      defaultPriority: "P3",
      defaultSeverity: "Medium",
      suggestedAssigneeRole: "",
      requiredFields: [],
      recommendedActions: "",
      estimatedResolutionHours: 24,
    };
    setTemplates((prev) => [fresh, ...prev]);
    setEditingCode(code);
    setSelectedCode(null);
  };

  const handleDeleteTemplate = (code: string) => {
    if (!window.confirm(`Delete template ${code}? This cannot be undone.`)) return;
    setTemplates((prev) => prev.filter((t) => t.code !== code));
    setEditingCode(null);
    setSelectedCode(null);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Wand2 className="w-3 h-3 text-violet-500" />
            {templates.length} Templates Available
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ticket Templates Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pre-configured templates for faster ticket submission across all operational scenarios. Click any template to view, then "Edit Template" to customize.
          </p>
        </div>
        <Button className="h-8 text-[12px]" onClick={handleNewTemplate}>
          <Plus className="w-3 h-3 mr-1.5" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Templates" value={templates.length} icon={Wand2} color="violet" />
        <StatCard label="Categories" value={TEMPLATE_CATEGORIES.length} icon={Tag} color="sky" />
        <StatCard label="Departments" value={new Set(templates.map((t) => t.departmentCode)).size} icon={Building2} color="emerald" />
        <StatCard label="Avg Resolution" value={`${Math.round(templates.reduce((n, t) => n + t.estimatedResolutionHours, 0) / templates.length)}h`} icon={Clock} color="amber" />
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
            <SelectItem value="P0">P0 - Critical</SelectItem>
            <SelectItem value="P1">P1 - High</SelectItem>
            <SelectItem value="P2">P2 - Medium</SelectItem>
            <SelectItem value="P3">P3 - Low</SelectItem>
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
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {templates.length} templates
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t, i) => {
          const dept = DEPT_MAP[t.departmentCode];
          const priorityConfig = PRIORITY_CONFIG[t.defaultPriority];
          return (
            <button
              key={t.code}
              onClick={() => setSelectedCode(t.code)}
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
                {t.description || <span className="italic">No description</span>}
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
                {t.requiredFields.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Filter className="w-2.5 h-2.5" />
                    {t.requiredFields.length} fields
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
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedCode(null)}>
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
                <p className="text-[13px] text-foreground/90 leading-relaxed">{selectedTemplate.description || <span className="italic text-muted-foreground">No description</span>}</p>
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

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recommended Actions</div>
                <div className="p-3 rounded-md bg-muted/30 border border-border text-[12px] text-foreground/90 whitespace-pre-line leading-relaxed">
                  {selectedTemplate.recommendedActions || <span className="italic text-muted-foreground">No recommended actions defined</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  className="h-8 flex-1 text-[12px]"
                  onClick={() => {
                    setSelectedCode(null);
                    setCurrentView("ai_assistant");
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={() => {
                    setEditingCode(selectedTemplate.code);
                    setSelectedCode(null);
                  }}
                >
                  <Edit2 className="w-3 h-3 mr-1.5" />
                  Edit Template
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* === EDIT TEMPLATE DIALOG === */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingCode(null)}>
        {editingTemplate && (
          <EditTemplateModal
            template={editingTemplate}
            categories={TEMPLATE_CATEGORIES}
            onSave={handleSaveTemplate}
            onCancel={() => setEditingCode(null)}
            onDelete={() => handleDeleteTemplate(editingTemplate.code)}
          />
        )}
      </Dialog>
    </div>
  );
}

/* === Edit modal — full editable form === */

function EditTemplateModal({
  template, categories, onSave, onCancel, onDelete,
}: {
  template: TicketTemplate;
  categories: string[];
  onSave: (updated: TicketTemplate) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  // Local working copy — only commits to parent on Save
  const [draft, setDraft] = React.useState<TicketTemplate>({ ...template });
  const [newField, setNewField] = React.useState("");

  // Reset draft whenever the template prop changes (e.g. when opening a
  // different template without closing the dialog first)
  React.useEffect(() => {
    setDraft({ ...template });
    setNewField("");
  }, [template]);

  const update = <K extends keyof TicketTemplate>(key: K, value: TicketTemplate[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const addRequiredField = () => {
    const v = newField.trim();
    if (!v) return;
    if (draft.requiredFields.includes(v)) {
      setNewField("");
      return;
    }
    update("requiredFields", [...draft.requiredFields, v]);
    setNewField("");
  };

  const removeRequiredField = (field: string) => {
    update("requiredFields", draft.requiredFields.filter((f) => f !== field));
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!draft.code.trim()) {
      alert("Code is required");
      return;
    }
    onSave({
      ...draft,
      title: draft.title.trim(),
      code: draft.code.trim(),
      description: draft.description.trim(),
      subcategory: draft.subcategory?.trim() || undefined,
      suggestedAssigneeRole: draft.suggestedAssigneeRole?.trim() || undefined,
      defaultSeverity: draft.defaultSeverity?.trim() || undefined,
      recommendedActions: draft.recommendedActions.trim(),
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto iris-scrollbar">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Edit2 className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Edit Template
          </span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">
          {draft.title || "Untitled Template"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Title */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Title</label>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            className="text-[13px] h-9"
            placeholder="e.g. Membership Incorrectly Frozen"
          />
        </div>

        {/* Code + Category + Subcategory */}
        <div className="grid grid-cols-2 gap-3">
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Code</label>
            <Input
              value={draft.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              className="text-[12px] font-mono h-9"
              placeholder="TPL-XXX"
            />
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Category</label>
            <Select value={draft.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Subcategory</label>
            <Input
              value={draft.subcategory || ""}
              onChange={(e) => update("subcategory", e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Freeze Issue"
            />
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Estimated Resolution (hours)</label>
            <Input
              type="number"
              min={1}
              value={draft.estimatedResolutionHours}
              onChange={(e) => update("estimatedResolutionHours", Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="text-[12px] h-9"
            />
          </div>
        </div>

        {/* Description */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Description</label>
          <Textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            className="text-[13px] min-h-[70px] resize-y"
            placeholder="When does this template apply? What does the client report?"
          />
        </div>

        {/* Priority + Department + Severity + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Default Priority</label>
            <Select value={draft.defaultPriority} onValueChange={(v) => update("defaultPriority", v as Priority)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0 - Critical</SelectItem>
                <SelectItem value="P1">P1 - High</SelectItem>
                <SelectItem value="P2">P2 - Medium</SelectItem>
                <SelectItem value="P3">P3 - Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Department</label>
            <Select value={draft.departmentCode} onValueChange={(v) => update("departmentCode", v)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Default Severity</label>
            <Input
              value={draft.defaultSeverity || ""}
              onChange={(e) => update("defaultSeverity", e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Medium"
            />
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Suggested Assignee Role</label>
            <Input
              value={draft.suggestedAssigneeRole || ""}
              onChange={(e) => update("suggestedAssigneeRole", e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Memberships Manager"
            />
          </div>
        </div>

        {/* Required fields editor */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">
            Required Fields ({draft.requiredFields.length})
          </label>
          <div className="iris-edit-field-list">
            {draft.requiredFields.length === 0 && (
              <div className="text-[11px] text-muted-foreground italic">No required fields yet — add the first one below.</div>
            )}
            {draft.requiredFields.map((field) => (
              <div key={field} className="iris-edit-field-row">
                <Input
                  value={field}
                  readOnly
                  className="text-[12px] h-8 bg-muted/40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-rose-500"
                  onClick={() => removeRequiredField(field)}
                  title="Remove field"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <div className="iris-edit-field-row">
              <Input
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRequiredField();
                  }
                }}
                placeholder="Add a required field (e.g. clientName, studio, amount)"
                className="text-[12px] h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px] shrink-0"
                onClick={addRequiredField}
                disabled={!newField.trim()}
              >
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
          </div>
        </div>

        {/* Recommended actions */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Recommended Actions</label>
          <Textarea
            value={draft.recommendedActions}
            onChange={(e) => update("recommendedActions", e.target.value)}
            className="text-[12px] min-h-[100px] resize-y font-mono"
            placeholder={"One step per line, e.g.\n1. Verify freeze status in Momence.\n2. Check if freeze was scheduled.\n3. If incorrect, unfreeze and apply credit."}
          />
          <div className="text-[10px] text-muted-foreground">
            Use line breaks to separate steps. They will be displayed as a pre-formatted block.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 mr-1" />Delete
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            className="h-8 text-[12px]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-8 text-[12px]"
            onClick={handleSave}
          >
            <Save className="w-3 h-3 mr-1.5" />Save Changes
          </Button>
        </div>
      </div>
    </DialogContent>
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
