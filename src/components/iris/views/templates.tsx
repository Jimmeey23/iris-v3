"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/iris/store";
import { TICKET_TEMPLATES, templateCategories, type TicketTemplate, type TemplateField, type TemplateFieldType } from "@/lib/iris/templates";
import { resolveTemplateForm } from "@/lib/iris/template-form";
import { templatesApi } from "@/lib/iris/library-api";
import { CATEGORIES, CATEGORY_MAP, IRIS_STUDIOS } from "@/lib/iris/iris-constants";
import { DEPARTMENTS, DEPT_MAP, PRIORITY_CONFIG, Priority } from "@/lib/iris/types";
import { DynamicFormIntake } from "@/components/iris/dynamic-form-intake";
import { cn } from "@/lib/utils";
import {
  Search, Filter, Plus, Clock, Building2, Eye, Wand2, Sparkles, Tag, X, Save, Edit2, Trash2, Copy, ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WIDE = "sm:max-w-4xl max-h-[90vh] overflow-y-auto iris-scrollbar";
const FIELD_TYPES: { value: TemplateFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Single choice" },
  { value: "multiselect", label: "Multiple choice" },
  { value: "checkbox", label: "Checkbox" },
];

/**
 * Templates library. Templates live in Neon (/api/templates) and are editable by
 * managers/admins: create, edit (incl. the form fields and their defaults),
 * duplicate and delete. "Use This Template" opens the dynamic form builder
 * pre-populated from the template.
 */
export function TemplatesView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const tier = useAppStore((s) => s.currentUser?.tier);
  const canEdit = tier === "admin" || tier === "manager";

  // TICKET_TEMPLATES is updated in place by library-api; dataVersion re-reads it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const templates = React.useMemo(() => [...TICKET_TEMPLATES], [dataVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categories = React.useMemo(() => templateCategories(), [dataVersion]);

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [department, setDepartment] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ template: TicketTemplate; isNew: boolean } | null>(null);
  const [using, setUsing] = React.useState<TicketTemplate | null>(null);
  const [busy, setBusy] = React.useState(false);

  const selectedTemplate = React.useMemo(() => templates.find((t) => t.code === selectedCode) ?? null, [templates, selectedCode]);

  const filtered = React.useMemo(() => {
    return templates.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) &&
            !t.code.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      }
      if (category !== "all" && t.category !== category) return false;
      if (department !== "all" && t.departmentCode !== department) return false;
      if (priority !== "all" && t.defaultPriority !== priority) return false;
      return true;
    });
  }, [templates, search, category, department, priority]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (draft: TicketTemplate, isNew: boolean) => {
    const { code, ...body } = draft;
    const ok = await run(
      () => (isNew ? templatesApi.create({ ...body, ...(code ? { code } : {}) }) : templatesApi.update(code, body)),
      isNew ? "Template created" : "Template saved",
    );
    if (ok) setEditing(null);
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Delete template ${code}? This cannot be undone.`)) return;
    const ok = await run(() => templatesApi.remove(code), "Template deleted");
    if (ok) { setEditing(null); setSelectedCode(null); }
  };

  const handleDuplicate = async (t: TicketTemplate) => {
    const ok = await run(() => templatesApi.duplicate(t), "Template duplicated");
    if (ok) setSelectedCode(null);
  };

  const handleNew = () => {
    setEditing({
      isNew: true,
      template: {
        code: "",
        title: "",
        description: "",
        category: categories[0] || "Operations",
        subcategory: "",
        departmentCode: DEPARTMENTS[0]?.code || "OPS",
        defaultPriority: "P3",
        defaultSeverity: "Medium",
        suggestedAssigneeRole: "",
        requiredFields: [],
        recommendedActions: "",
        estimatedResolutionHours: 24,
        form: { fields: [] },
      },
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Wand2 className="w-3 h-3 text-violet-500" />
            {templates.length} Templates Available
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ticket Templates Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choosing a template opens the ticket form pre-filled with its category, priority, department and exact field set.
            {canEdit ? " Managers can create, edit, duplicate and delete templates." : " Only managers and admins can edit templates."}
          </p>
        </div>
        {canEdit && (
          <Button className="h-8 text-[12px]" onClick={handleNew}>
            <Plus className="w-3 h-3 mr-1.5" />
            New Template
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Templates" value={templates.length} icon={Wand2} color="violet" />
        <StatCard label="Categories" value={categories.length} icon={Tag} color="sky" />
        <StatCard label="Departments" value={new Set(templates.map((t) => t.departmentCode)).size} icon={Building2} color="emerald" />
        <StatCard label="Avg Resolution" value={templates.length ? `${Math.round(templates.reduce((n, t) => n + t.estimatedResolutionHours, 0) / templates.length)}h` : "—"} icon={Clock} color="amber" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search templates by title, description, code..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-[12px]" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-[160px] text-[12px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-8 w-[180px] text-[12px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-[120px] text-[12px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="P0">P0 - Critical</SelectItem>
            <SelectItem value="P1">P1 - High</SelectItem>
            <SelectItem value="P2">P2 - Medium</SelectItem>
            <SelectItem value="P3">P3 - Low</SelectItem>
          </SelectContent>
        </Select>
        {(search || category !== "all" || department !== "all" || priority !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={() => { setSearch(""); setCategory("all"); setDepartment("all"); setPriority("all"); }}>
            <X className="w-3 h-3 mr-1" />Clear
          </Button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {templates.length} templates
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t, i) => {
          const dept = DEPT_MAP[t.departmentCode];
          const pc = PRIORITY_CONFIG[t.defaultPriority];
          const nFields = resolveTemplateForm(t).fields.length;
          return (
            <button
              key={t.code}
              onClick={() => setSelectedCode(t.code)}
              className="text-left iris-card p-3.5 hover:scale-[1.01] transition-transform iris-fade-in-up group"
              style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", pc.bg, pc.text)}>{t.defaultPriority}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{t.category}</span>
              </div>
              <div className="text-[13px] font-semibold leading-tight mb-1.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">{t.title}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {t.description || <span className="italic">No description</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {dept && <span className="flex items-center gap-1"><Building2 className="w-2.5 h-2.5" />{dept.name.split(" ")[0]}</span>}
                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{t.estimatedResolutionHours}h</span>
                {nFields > 0 && <span className="flex items-center gap-1"><Filter className="w-2.5 h-2.5" />{nFields} fields</span>}
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

      {/* Detail */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedCode(null)}>
        {selectedTemplate && <TemplateDetail
          t={selectedTemplate}
          canEdit={canEdit}
          busy={busy}
          onUse={() => { setUsing(selectedTemplate); setSelectedCode(null); }}
          onEdit={() => { setEditing({ template: selectedTemplate, isNew: false }); setSelectedCode(null); }}
          onDuplicate={() => handleDuplicate(selectedTemplate)}
          onDelete={() => handleDelete(selectedTemplate.code)}
        />}
      </Dialog>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <EditTemplateModal
            key={editing.template.code || "new"}
            template={editing.template}
            isNew={editing.isNew}
            categories={categories}
            busy={busy}
            onSave={(d) => handleSave(d, editing.isNew)}
            onCancel={() => setEditing(null)}
            onDelete={() => handleDelete(editing.template.code)}
          />
        )}
      </Dialog>

      {/* Form builder, pre-populated from the chosen template */}
      {using && <DynamicFormIntake template={using} onClose={() => setUsing(null)} />}
    </div>
  );
}

function TemplateDetail({ t, canEdit, busy, onUse, onEdit, onDuplicate, onDelete }: {
  t: TicketTemplate; canEdit: boolean; busy: boolean;
  onUse: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const form = resolveTemplateForm(t);
  return (
    <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto iris-scrollbar">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", PRIORITY_CONFIG[t.defaultPriority].bg, PRIORITY_CONFIG[t.defaultPriority].text)}>{t.defaultPriority}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
          <span className="text-[10px] text-muted-foreground">{t.category}</span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{t.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-[13px] text-foreground/90 leading-relaxed">{t.description || <span className="italic text-muted-foreground">No description</span>}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoBox label="Department" value={DEPT_MAP[t.departmentCode]?.name || t.departmentCode || "—"} />
          <InfoBox label="Default Priority" value={t.defaultPriority} />
          <InfoBox label="Default Severity" value={t.defaultSeverity || "—"} />
          <InfoBox label="Form category" value={form.category || "—"} />
          <InfoBox label="Form subcategory" value={form.subcategory || "—"} />
          <InfoBox label="Estimated Resolution" value={`${t.estimatedResolutionHours} hours`} />
          <InfoBox label="Suggested Assignee" value={t.suggestedAssigneeRole || "Auto-routed"} />
          {form.studioOptions && <InfoBox label="Studios" value={form.studioOptions.map((s) => s.split(",")[0]).join(", ")} />}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3" />Form fields ({form.fields.length})
          </div>
          {form.fields.length === 0 ? (
            <div className="text-[11px] italic text-muted-foreground">This template only uses the standard ticket fields.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {form.fields.map((f) => (
                <div key={f.id} className="px-2.5 py-1.5 rounded-md bg-muted/40 border border-border text-[11px]">
                  <span className="font-medium">{f.label}</span>
                  {f.required && <span className="text-rose-500">*</span>}
                  <span className="text-muted-foreground"> · {FIELD_TYPES.find((x) => x.value === f.type)?.label}</span>
                  {f.options && <div className="text-muted-foreground mt-0.5 truncate">{f.options.join(" / ")}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recommended Actions</div>
          <div className="p-3 rounded-md bg-muted/30 border border-border text-[12px] whitespace-pre-line leading-relaxed">
            {t.recommendedActions || <span className="italic text-muted-foreground">No recommended actions defined</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
          <Button className="h-8 flex-1 min-w-[160px] text-[12px]" onClick={onUse}>
            <Sparkles className="w-3 h-3 mr-1.5" />Use This Template
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" className="h-8 text-[12px]" onClick={onEdit}><Edit2 className="w-3 h-3 mr-1.5" />Edit</Button>
              <Button variant="outline" className="h-8 text-[12px]" onClick={onDuplicate} disabled={busy}><Copy className="w-3 h-3 mr-1.5" />Duplicate</Button>
              <Button variant="ghost" className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={onDelete} disabled={busy}>
                <Trash2 className="w-3 h-3 mr-1.5" />Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

/* === Editor === */

function EditTemplateModal({
  template, isNew, categories, busy, onSave, onCancel, onDelete,
}: {
  template: TicketTemplate; isNew: boolean; categories: string[]; busy: boolean;
  onSave: (updated: TicketTemplate) => void; onCancel: () => void; onDelete: () => void;
}) {
  const initial = React.useMemo(() => resolveTemplateForm(template), [template]);
  const [draft, setDraft] = React.useState<TicketTemplate>({ ...template });
  const [fields, setFields] = React.useState<TemplateField[]>(() => initial.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })));
  const [fCategory, setFCategory] = React.useState(initial.category);
  const [fSub, setFSub] = React.useState(initial.subcategory);
  const [studioOptions, setStudioOptions] = React.useState<string[]>(initial.studioOptions ?? []);
  const [areaOptions, setAreaOptions] = React.useState((initial.areaOptions ?? []).join(", "));
  const [formStudio, setFormStudio] = React.useState(initial.studio ?? "");
  const [formArea, setFormArea] = React.useState(initial.area ?? "");
  const [requestedOutcome, setRequestedOutcome] = React.useState(initial.requestedOutcome ?? "");

  const update = <K extends keyof TicketTemplate>(key: K, value: TicketTemplate[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const patchField = (i: number, p: Partial<TemplateField>) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const moveField = (i: number, dir: -1 | 1) =>
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addField = () => {
    let n = fields.length + 1;
    while (fields.some((f) => f.id === `field${n}`)) n++;
    setFields((fs) => [...fs, { id: `field${n}`, label: `Field ${n}`, type: "text" }]);
  };

  const handleSave = () => {
    if (!draft.title.trim()) return toast.error("Title is required");
    const ids = new Set<string>();
    for (const f of fields) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(f.id)) return toast.error(`Field id "${f.id}" must start with a letter and use only letters, numbers or _`);
      if (ids.has(f.id)) return toast.error(`Duplicate field id "${f.id}"`);
      ids.add(f.id);
      if (!f.label.trim()) return toast.error(`Field "${f.id}" needs a label`);
      if ((f.type === "select" || f.type === "multiselect") && !f.options?.length) return toast.error(`"${f.label}" needs at least one option`);
    }
    const cleaned = fields.map((f) => {
      const o: TemplateField = { id: f.id, label: f.label.trim(), type: f.type };
      if (f.required) o.required = true;
      if (f.options?.length && (f.type === "select" || f.type === "multiselect")) o.options = f.options;
      if (f.default !== undefined && f.default !== "" && !(Array.isArray(f.default) && !f.default.length)) o.default = f.default;
      if (f.helper?.trim()) o.helper = f.helper.trim();
      return o;
    });
    onSave({
      ...draft,
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      subcategory: draft.subcategory?.trim() || undefined,
      suggestedAssigneeRole: draft.suggestedAssigneeRole?.trim() || undefined,
      defaultSeverity: draft.defaultSeverity?.trim() || undefined,
      recommendedActions: draft.recommendedActions.trim(),
      requiredFields: cleaned.filter((f) => f.required).map((f) => f.id),
      form: {
        fields: cleaned,
        category: fCategory || undefined,
        subcategory: fSub || undefined,
        studio: formStudio || undefined,
        area: formArea.trim() || undefined,
        studioOptions: studioOptions.length ? studioOptions : undefined,
        areaOptions: areaOptions.split(",").map((s) => s.trim()).filter(Boolean),
        requestedOutcome: requestedOutcome.trim() || undefined,
        occurred: initial.occurred,
        reportedBy: initial.reportedBy,
        system: initial.system,
      },
    });
  };

  const row = "space-y-1";
  const lbl = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

  return (
    <DialogContent className={WIDE}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Edit2 className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{isNew ? "New Template" : `Edit Template · ${template.code}`}</span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{draft.title || "Untitled Template"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div className={row}>
          <label className={lbl}>Title</label>
          <Input value={draft.title} onChange={(e) => update("title", e.target.value)} className="text-[13px] h-9" placeholder="e.g. Membership Incorrectly Frozen" />
        </div>
        <div className={row}>
          <label className={lbl}>Description</label>
          <Textarea value={draft.description} onChange={(e) => update("description", e.target.value)} className="text-[13px] min-h-[64px]" placeholder="Pre-fills the summary in the form." />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={row}>
            <label className={lbl}>Code {isNew && <span className="normal-case font-normal">(auto if blank)</span>}</label>
            <Input value={draft.code} disabled={!isNew} onChange={(e) => update("code", e.target.value.toUpperCase())} className="text-[12px] font-mono h-9" placeholder="TPL-XXX" />
          </div>
          <div className={row}>
            <label className={lbl}>Library category</label>
            <Select value={draft.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...new Set([...categories, draft.category])].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <label className={lbl}>Library subcategory</label>
            <Input value={draft.subcategory || ""} onChange={(e) => update("subcategory", e.target.value)} className="text-[12px] h-9" />
          </div>
          <div className={row}>
            <label className={lbl}>Est. hours</label>
            <Input type="number" min={1} value={draft.estimatedResolutionHours} onChange={(e) => update("estimatedResolutionHours", Math.max(1, parseInt(e.target.value, 10) || 1))} className="text-[12px] h-9" />
          </div>
          <div className={row}>
            <label className={lbl}>Priority</label>
            <Select value={draft.defaultPriority} onValueChange={(v) => update("defaultPriority", v as Priority)}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0 - Critical</SelectItem>
                <SelectItem value="P1">P1 - High</SelectItem>
                <SelectItem value="P2">P2 - Medium</SelectItem>
                <SelectItem value="P3">P3 - Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <label className={lbl}>Department</label>
            <Select value={draft.departmentCode} onValueChange={(v) => update("departmentCode", v)}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <label className={lbl}>Severity</label>
            <Select value={draft.defaultSeverity || "none"} onValueChange={(v) => update("defaultSeverity", v === "none" ? undefined : v)}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {["Critical", "High", "Medium", "Low", "Not sure"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <label className={lbl}>Assignee role</label>
            <Input value={draft.suggestedAssigneeRole || ""} onChange={(e) => update("suggestedAssigneeRole", e.target.value)} className="text-[12px] h-9" />
          </div>
        </div>

        {/* Form builder prefill */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="text-[12px] font-semibold flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5 text-violet-500" />Form builder pre-fill</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={row}>
              <label className={lbl}>Form category</label>
              <Select value={fCategory || "none"} onValueChange={(v) => { setFCategory(v === "none" ? "" : v); setFSub(""); }}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Auto-detect</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>Form subcategory</label>
              <Select value={fSub || "none"} onValueChange={(v) => setFSub(v === "none" ? "" : v)} disabled={!fCategory}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Auto-detect</SelectItem>
                  {(CATEGORY_MAP[fCategory] ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>Allowed studios (none selected = all)</label>
              <div className="flex flex-wrap gap-1.5">
                {IRIS_STUDIOS.map((s) => {
                  const on = studioOptions.includes(s.name);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStudioOptions((o) => (on ? o.filter((x) => x !== s.name) : [...o, s.name]))}
                      className={cn("px-2 py-1 rounded-md border text-[11px]", on ? "border-violet-500 bg-violet-500/10 text-violet-600" : "border-border hover:bg-muted")}
                    >
                      {s.name.split(",")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={row}>
              <label className={lbl}>Pre-selected studio</label>
              <Select value={formStudio || "none"} onValueChange={(v) => setFormStudio(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ask the user</SelectItem>
                  {IRIS_STUDIOS.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>Area choices (comma separated)</label>
              <Input value={areaOptions} onChange={(e) => setAreaOptions(e.target.value)} className="text-[12px] h-9" placeholder="Studio 1, Studio 2, Reception" />
            </div>
            <div className={row}>
              <label className={lbl}>Pre-selected area</label>
              <Input value={formArea} onChange={(e) => setFormArea(e.target.value)} className="text-[12px] h-9" />
            </div>
          </div>
          <div className={row}>
            <label className={lbl}>Requested outcome (pre-selected)</label>
            <Select value={requestedOutcome || "none"} onValueChange={(v) => setRequestedOutcome(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {["Fix the issue", "Refund / credit", "Information only", "Process change", "Escalate to management"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Field editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={lbl}>Template fields ({fields.length})</label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={addField}><Plus className="w-3 h-3 mr-1" />Add field</Button>
          </div>
          {fields.length === 0 && <div className="text-[11px] italic text-muted-foreground">No custom fields — the form will only ask the standard questions.</div>}
          {fields.map((f, i) => {
            const hasOptions = f.type === "select" || f.type === "multiselect";
            return (
              <div key={i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-12 md:col-span-4 h-8 text-[12px]" value={f.label} placeholder="Label"
                    onChange={(e) => patchField(i, { label: e.target.value, ...(f.id.startsWith("field") ? { id: toId(e.target.value, f.id) } : {}) })} />
                  <Input className="col-span-6 md:col-span-3 h-8 text-[11px] font-mono" value={f.id} placeholder="id" onChange={(e) => patchField(i, { id: e.target.value })} />
                  <Select value={f.type} onValueChange={(v) => patchField(i, { type: v as TemplateFieldType, default: undefined })}>
                    <SelectTrigger className="col-span-6 md:col-span-2 h-8 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <label className="col-span-4 md:col-span-1 flex items-center gap-1 text-[11px]">
                    <input type="checkbox" checked={!!f.required} onChange={(e) => patchField(i, { required: e.target.checked })} className="accent-violet-600" />Req.
                  </label>
                  <div className="col-span-8 md:col-span-2 flex justify-end gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => moveField(i, -1)}><ArrowUp className="w-3 h-3" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === fields.length - 1} onClick={() => moveField(i, 1)}><ArrowDown className="w-3 h-3" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-rose-500" onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
                {hasOptions && (
                  <Input className="h-8 text-[12px]" placeholder="Options, comma separated"
                    defaultValue={(f.options ?? []).join(", ")}
                    onBlur={(e) => patchField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <DefaultEditor field={f} onChange={(d) => patchField(i, { default: d })} />
                  <Input className="h-8 text-[12px]" placeholder="Helper text (optional)" value={f.helper ?? ""} onChange={(e) => patchField(i, { helper: e.target.value })} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={row}>
          <label className={lbl}>Recommended actions</label>
          <Textarea value={draft.recommendedActions} onChange={(e) => update("recommendedActions", e.target.value)} className="text-[12px] min-h-[90px] font-mono" placeholder={"1. Verify...\n2. Check..."} />
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {!isNew && (
            <Button type="button" variant="ghost" className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={onDelete} disabled={busy}>
              <Trash2 className="w-3 h-3 mr-1" />Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={onCancel}>Cancel</Button>
          <Button type="button" className="h-8 text-[12px]" onClick={handleSave} disabled={busy}>
            <Save className="w-3 h-3 mr-1.5" />{busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function toId(label: string, fallback: string) {
  const words = label.replace(/[^A-Za-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  const id = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("");
  return /^[A-Za-z]/.test(id) ? id : fallback;
}

/** Default value control matching the field type (checkbox default, select default, ...). */
function DefaultEditor({ field, onChange }: { field: TemplateField; onChange: (v: TemplateField["default"]) => void }) {
  const cls = "h-8 text-[12px]";
  if (field.type === "checkbox")
    return (
      <label className="flex items-center gap-2 text-[11px] h-8">
        <input type="checkbox" checked={field.default === true} onChange={(e) => onChange(e.target.checked)} className="accent-violet-600" />
        Checked by default
      </label>
    );
  if (field.type === "select")
    return (
      <Select value={(field.default as string) || "none"} onValueChange={(v) => onChange(v === "none" ? undefined : v)}>
        <SelectTrigger className={cls}><SelectValue placeholder="Default option" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No default option</SelectItem>
          {(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  if (field.type === "multiselect")
    return (
      <div className="flex flex-wrap gap-1 items-center min-h-8">
        <span className="text-[11px] text-muted-foreground mr-1">Default:</span>
        {(field.options ?? []).map((o) => {
          const cur = Array.isArray(field.default) ? field.default : [];
          const on = cur.includes(o);
          return (
            <button key={o} type="button" onClick={() => onChange(on ? cur.filter((x) => x !== o) : [...cur, o])}
              className={cn("px-1.5 py-0.5 rounded border text-[10px]", on ? "border-violet-500 bg-violet-500/10 text-violet-600" : "border-border")}>{o}</button>
          );
        })}
      </div>
    );
  return <Input className={cls} placeholder="Default value (optional)" value={(field.default as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
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
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colors[color])}><Icon className="w-4 h-4" /></div>
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
