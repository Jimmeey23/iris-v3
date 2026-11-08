"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/iris/store";
import { TICKET_TEMPLATES, type TicketTemplate, type TemplateField, type TemplateFieldType } from "@/lib/iris/templates";
import { resolveTemplateForm } from "@/lib/iris/template-form";
import {
  GENERAL_SUBCATEGORY,
  groupTemplatesByCategoryAndSubcategory,
  normalizeTemplateCategory,
  normalizeTemplateSubcategory,
  templateSubcategories,
  type TemplateCategoryGroup,
  type TemplateSubcategoryGroup,
} from "@/lib/iris/template-groups";
import {
  TEMPLATE_CATEGORY_ORDER,
  TEMPLATE_TAXONOMY,
  subcategoryDescription,
  templateCategoryLabel,
  templateCategoryMeta,
  type TemplateCategoryMeta,
} from "@/lib/iris/template-taxonomy";
import { REQUESTED_OUTCOMES } from "@/lib/iris/template-types";
import { templatesApi } from "@/lib/iris/library-api";
import {
  CATEGORIES,
  CATEGORY_MAP,
  IRIS_STUDIOS,
  OCCURRED_OPTIONS,
  REPORTED_BY_OPTIONS,
  SYSTEMS,
} from "@/lib/iris/iris-constants";
import { DEPARTMENTS, DEPT_MAP, PRIORITY_CONFIG, Priority } from "@/lib/iris/types";
import { TemplateTicketBuilder } from "@/components/iris/template-ticket-builder";
import { cn } from "@/lib/utils";
import { ACCENT_STYLES, PriorityMix, StepHeading, Stepper } from "@/components/iris/drilldown";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  Bike,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Edit2,
  Eye,
  Filter,
  FolderTree,
  HeartHandshake,
  Layers,
  ListChecks,
  Megaphone,
  MonitorSmartphone,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  Wand2,
  Wrench,
  X,
  type LucideIcon,
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

type Accent = TemplateCategoryMeta["accent"] | "slate";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Membership: BadgeCheck,
  Payment: CreditCard,
  Scheduling: CalendarClock,
  "Class & Trainer Experience": Activity,
  "Client Experience": HeartHandshake,
  Facilities: Wrench,
  "Equipment & Studio Assets": Bike,
  IT: MonitorSmartphone,
  "Safety & Security": ShieldAlert,
  Operations: ClipboardList,
  HR: Users,
  Marketing: Megaphone,
};

function categoryVisual(category: string): { Icon: LucideIcon; accent: (typeof ACCENT_STYLES)[Accent] } {
  const meta = templateCategoryMeta(category);
  return { Icon: CATEGORY_ICONS[category] ?? Layers, accent: ACCENT_STYLES[meta?.accent ?? "slate"] };
}

/**
 * Ticket Templates — a three-step drill-down: Category → Sub-category → Template.
 *
 * Nothing is listed until a category and sub-category are chosen; picking a
 * template opens its Preset Ticket Builder, which files a real ticket. Templates
 * live in Neon (/api/templates) and are editable by managers/admins (or roles
 * granted `templates.edit`).
 */
export function TemplatesView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const currentUser = useAppStore((s) => s.currentUser);
  const nav = useAppStore((s) => s.templateNav);
  const setNav = useAppStore((s) => s.setTemplateNav);
  const tier = currentUser?.tier;
  const hasPerm = currentUser?.permissions?.includes("templates.edit");
  const canEdit = tier === "admin" || tier === "manager" || Boolean(hasPerm);

  // TICKET_TEMPLATES is updated in place by library-api; dataVersion re-reads it.
  const templates = React.useMemo(() => {
    void dataVersion;
    return [...TICKET_TEMPLATES];
  }, [dataVersion]);
  const groups = React.useMemo<TemplateCategoryGroup[]>(() => groupTemplatesByCategoryAndSubcategory(templates), [templates]);
  const categories = React.useMemo(() => groups.map((g) => g.category), [groups]);
  const subcategoryTotal = React.useMemo(() => groups.reduce((n, g) => n + g.subcategoryCount, 0), [groups]);

  const [search, setSearch] = React.useState("");
  const [detailCode, setDetailCode] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ template: TicketTemplate; isNew: boolean } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const topRef = React.useRef<HTMLDivElement>(null);

  // Where we are in the drill-down (a deep-linked template implies its category / sub-category).
  const activeTemplate = nav.templateCode ? (templates.find((t) => t.code === nav.templateCode) ?? null) : null;
  const category = nav.category ?? (activeTemplate ? normalizeTemplateCategory(activeTemplate.category) : null);
  const subcategory = nav.subcategory ?? (activeTemplate ? normalizeTemplateSubcategory(activeTemplate.subcategory) : null);
  const catGroup = category ? (groups.find((g) => g.category === category) ?? null) : null;
  const subGroup = catGroup && subcategory ? (catGroup.subcategories.find((s) => s.subcategory === subcategory) ?? null) : null;
  const step: 1 | 2 | 3 | 4 = activeTemplate ? 4 : subGroup ? 3 : catGroup ? 2 : 1;
  const detailTemplate = detailCode ? (templates.find((t) => t.code === detailCode) ?? null) : null;

  const scrollTop = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  const go = (next: { category?: string | null; subcategory?: string | null; templateCode?: string | null }) => {
    setNav({ category: next.category ?? null, subcategory: next.subcategory ?? null, templateCode: next.templateCode ?? null });
    setSearch("");
    scrollTop();
  };
  const goHome = () => go({});
  const goCategory = (c: string) => go({ category: c });
  const goSubcategory = (c: string, s: string) => go({ category: c, subcategory: s });
  const openBuilder = (t: TicketTemplate) =>
    go({
      category: normalizeTemplateCategory(t.category),
      subcategory: normalizeTemplateSubcategory(t.subcategory),
      templateCode: t.code,
    });

  const q = search.trim().toLowerCase();
  const results = React.useMemo(() => {
    if (!q) return [];
    const terms = q.split(/\s+/);
    return templates.filter((t) => {
      const hay = [
        t.code,
        t.title,
        t.description,
        t.category,
        templateCategoryLabel(t.category),
        t.subcategory ?? "",
        t.form?.subcategory ?? "",
        DEPT_MAP[t.departmentCode]?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => hay.includes(term));
    });
  }, [q, templates]);

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
    if (ok) {
      setEditing(null);
      setDetailCode(null);
      if (nav.templateCode === code) setNav({ category, subcategory, templateCode: null });
    }
  };

  const handleDuplicate = async (t: TicketTemplate) => {
    const ok = await run(() => templatesApi.duplicate(t), "Template duplicated");
    if (ok) setDetailCode(null);
  };

  const handleNew = (presetCategory?: string | null, presetSubcategory?: string | null) => {
    const cat = presetCategory || category || TEMPLATE_CATEGORY_ORDER[0];
    const sub = presetSubcategory ?? subcategory;
    const meta = templateCategoryMeta(cat);
    setEditing({
      isNew: true,
      template: {
        code: "",
        title: "",
        description: "",
        category: cat,
        subcategory: sub && sub !== GENERAL_SUBCATEGORY ? sub : "",
        departmentCode: meta?.defaultDept && DEPT_MAP[meta.defaultDept] ? meta.defaultDept : DEPARTMENTS[0]?.code || "OPS",
        defaultPriority: "P2",
        defaultSeverity: "Medium",
        suggestedAssigneeRole: "",
        requiredFields: [],
        recommendedActions: "",
        estimatedResolutionHours: 24,
        form: { fields: [] },
      },
    });
  };

  const avgHours = templates.length
    ? Math.round(templates.reduce((n, t) => n + t.estimatedResolutionHours, 0) / templates.length)
    : 0;

  return (
    <div ref={topRef} className="p-6 max-w-[1600px] mx-auto space-y-4 scroll-mt-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Wand2 className="w-3 h-3 text-violet-500" />
            {templates.length} Templates · {categories.length} Categories · {subcategoryTotal} Sub-categories
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ticket Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-3xl">
            Pick a category, then a sub-category, then the exact scenario. Each template is a preset ticket form — answer
            a few questions and submit a real ticket, already categorised, prioritised and routed.
          </p>
        </div>
        {canEdit && (
          <Button className="h-8 text-[12px]" onClick={() => handleNew()}>
            <Plus className="w-3 h-3 mr-1.5" />
            New Template
          </Button>
        )}
      </div>

      <Stepper
        ariaLabel="Template steps"
        step={q && step < 4 ? 0 : step}
        labels={[
          catGroup ? templateCategoryLabel(catGroup.category) : "Category",
          subGroup ? subGroup.subcategory : "Sub-category",
          activeTemplate ? activeTemplate.code : "Template",
          "Build ticket",
        ]}
        onStep={(n) => {
          if (n === 1) goHome();
          else if (n === 2 && catGroup) goCategory(catGroup.category);
          else if (n === 3 && catGroup && subGroup) goSubcategory(catGroup.category, subGroup.subcategory);
        }}
      />

      {step < 4 && (
        <div className="relative max-w-xl">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search all templates by scenario, code, sub-category or team…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 pr-8 text-[12px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {q && step < 4 ? (
        <SearchResults results={results} query={search.trim()} onOpen={openBuilder} onDetails={(t) => setDetailCode(t.code)} />
      ) : step === 1 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Templates" value={templates.length} icon={Wand2} color="violet" />
            <StatCard label="Categories" value={categories.length} icon={Layers} color="sky" />
            <StatCard label="Sub-categories" value={subcategoryTotal} icon={FolderTree} color="emerald" />
            <StatCard label="Avg target resolution" value={templates.length ? `${avgHours}h` : "—"} icon={Clock} color="amber" />
          </div>
          <StepHeading
            n={1}
            title="Choose a category"
            subtitle="What area is the issue or request about?"
          />
          {groups.length === 0 ? (
            <div className="text-center py-20 iris-card">
              <Wand2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-[13px] font-medium">No templates yet</div>
              {canEdit && <div className="text-[11px] text-muted-foreground mt-1">Use “New Template” to create the first one.</div>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
              {groups.map((g, i) => (
                <CategoryCard key={g.category} group={g} index={i} onSelect={() => goCategory(g.category)} />
              ))}
            </div>
          )}
        </>
      ) : step === 2 && catGroup ? (
        <SubcategoryStep
          group={catGroup}
          canEdit={canEdit}
          onBack={goHome}
          onSelect={(s) => goSubcategory(catGroup.category, s)}
          onNew={(s) => handleNew(catGroup.category, s)}
        />
      ) : step === 3 && catGroup && subGroup ? (
        <TemplateStep
          category={catGroup}
          group={subGroup}
          canEdit={canEdit}
          onBack={() => goCategory(catGroup.category)}
          onOpen={openBuilder}
          onDetails={(t) => setDetailCode(t.code)}
          onNew={() => handleNew(catGroup.category, subGroup.subcategory)}
        />
      ) : activeTemplate ? (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px] -ml-2"
            onClick={() => (catGroup && subcategory ? goSubcategory(catGroup.category, subcategory) : goHome())}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to {subcategory ?? "templates"}
          </Button>
          <TemplateTicketBuilder
            template={activeTemplate}
            onBack={() => (catGroup && subcategory ? goSubcategory(catGroup.category, subcategory) : goHome())}
            onShowDetails={() => setDetailCode(activeTemplate.code)}
          />
        </div>
      ) : null}

      {/* Detail */}
      <Dialog open={!!detailTemplate} onOpenChange={(open) => !open && setDetailCode(null)}>
        {detailTemplate && (
          <TemplateDetail
            t={detailTemplate}
            canEdit={canEdit}
            busy={busy}
            isOpenInBuilder={activeTemplate?.code === detailTemplate.code}
            onUse={() => {
              openBuilder(detailTemplate);
              setDetailCode(null);
            }}
            onEdit={() => {
              setEditing({ template: detailTemplate, isNew: false });
              setDetailCode(null);
            }}
            onDuplicate={() => handleDuplicate(detailTemplate)}
            onDelete={() => handleDelete(detailTemplate.code)}
          />
        )}
      </Dialog>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <EditTemplateModal
            key={editing.template.code || `${editing.template.category}-${editing.template.subcategory}-new`}
            template={editing.template}
            allTemplates={templates}
            isNew={editing.isNew}
            categories={categories}
            busy={busy}
            onSave={(d) => handleSave(d, editing.isNew)}
            onCancel={() => setEditing(null)}
            onDelete={() => handleDelete(editing.template.code)}
          />
        )}
      </Dialog>
    </div>
  );
}

/* === Drill-down chrome === */

function CategoryCard({ group: g, index, onSelect }: { group: TemplateCategoryGroup; index: number; onSelect: () => void }) {
  const meta = templateCategoryMeta(g.category);
  const { Icon, accent } = categoryVisual(g.category);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "text-left iris-card p-4 transition-all hover:shadow-md group iris-fade-in-up relative overflow-hidden flex flex-col",
        accent.hover,
      )}
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms` }}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", accent.bar)} />
      <div className="flex items-start gap-3">
        <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-snug group-hover:text-primary transition-colors">
            {meta?.label ?? g.category}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {meta?.tagline ?? "Custom category"}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{g.count}</span> templates
        </span>
        <span>·</span>
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{g.subcategoryCount}</span> sub-categories
        </span>
        <span className="ml-auto">
          <PriorityMix counts={{ P0: g.priorityCounts.P0, P1: g.priorityCounts.P1, P2: 0, P3: 0 }} />
        </span>
      </div>
    </button>
  );
}

function SubcategoryStep({
  group,
  canEdit,
  onBack,
  onSelect,
  onNew,
}: {
  group: TemplateCategoryGroup;
  canEdit: boolean;
  onBack: () => void;
  onSelect: (subcategory: string) => void;
  onNew: (subcategory: string | null) => void;
}) {
  const meta = templateCategoryMeta(group.category);
  const { Icon, accent } = categoryVisual(group.category);
  const present = new Set(group.subcategories.map((s) => s.subcategory));
  const emptyTaxonomySubs = canEdit ? (meta?.subcategories ?? []).filter((s) => !present.has(s.name)) : [];

  return (
    <div className="space-y-4">
      <div className="iris-card p-4 flex items-start gap-3 flex-wrap">
        <span className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">{meta?.label ?? group.category}</div>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-3xl leading-relaxed">
            {meta?.description ?? "Templates in a custom category."}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{group.count}</span> templates
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{group.subcategoryCount}</span> sub-categories
            </span>
            {meta?.defaultDept && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Usually {DEPT_MAP[meta.defaultDept]?.name ?? meta.defaultDept}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          All categories
        </Button>
      </div>

      <StepHeading n={2} title="Choose a sub-category" subtitle={`Narrow down the ${meta?.label ?? group.category} issue.`}>
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={() => onNew(null)}>
            <Plus className="w-3 h-3 mr-1" />
            New template in {meta?.label ?? group.category}
          </Button>
        )}
      </StepHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {group.subcategories.map((s, i) => (
          <SubcategoryCard key={s.key} group={s} index={i} accent={accent} onSelect={() => onSelect(s.subcategory)} />
        ))}
        {emptyTaxonomySubs.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onNew(s.name)}
            className="text-left rounded-xl border border-dashed border-border p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="text-[13px] font-semibold text-muted-foreground">{s.name}</div>
            <div className="text-[11px] text-muted-foreground mt-1">No templates yet — add the first one.</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubcategoryCard({
  group: s,
  index,
  accent,
  onSelect,
}: {
  group: TemplateSubcategoryGroup;
  index: number;
  accent: (typeof ACCENT_STYLES)[Accent];
  onSelect: () => void;
}) {
  const description = subcategoryDescription(s.category, s.subcategory);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("text-left iris-card p-4 transition-all hover:shadow-md group iris-fade-in-up flex flex-col", accent.hover)}
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms` }}
    >
      <div className="flex items-start gap-2">
        <FolderTree className={cn("w-4 h-4 mt-0.5 shrink-0", accent.text)} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug group-hover:text-primary transition-colors">{s.subcategory}</div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">
            {description ?? (s.subcategory === GENERAL_SUBCATEGORY ? "Templates without a sub-category." : "Custom sub-category.")}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-auto pt-3 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{s.count}</span> {s.count === 1 ? "template" : "templates"}
        </span>
        <span className="ml-auto">
          <PriorityMix counts={s.priorityCounts} />
        </span>
      </div>
    </button>
  );
}

function TemplateStep({
  category,
  group,
  canEdit,
  onBack,
  onOpen,
  onDetails,
  onNew,
}: {
  category: TemplateCategoryGroup;
  group: TemplateSubcategoryGroup;
  canEdit: boolean;
  onBack: () => void;
  onOpen: (t: TicketTemplate) => void;
  onDetails: (t: TicketTemplate) => void;
  onNew: () => void;
}) {
  const { Icon, accent } = categoryVisual(category.category);
  const description = subcategoryDescription(group.category, group.subcategory);
  return (
    <div className="space-y-4">
      <div className="iris-card p-4 flex items-start gap-3 flex-wrap">
        <span className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">{templateCategoryLabel(category.category)}</div>
          <div className="text-[16px] font-semibold">{group.subcategory}</div>
          {description && <p className="text-[12px] text-muted-foreground mt-0.5 max-w-3xl leading-relaxed">{description}</p>}
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {templateCategoryLabel(category.category)} sub-categories
        </Button>
      </div>

      <StepHeading
        n={3}
        title="Choose the template"
        subtitle={`${group.count} preset ${group.count === 1 ? "form" : "forms"} — pick the one that matches the situation.`}
      >
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={onNew}>
            <Plus className="w-3 h-3 mr-1" />
            New template here
          </Button>
        )}
      </StepHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {group.templates.map((t, i) => (
          <TemplateCard key={t.code} template={t} index={i} onOpen={() => onOpen(t)} onDetails={() => onDetails(t)} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template: t,
  index,
  showTaxonomy,
  onOpen,
  onDetails,
}: {
  template: TicketTemplate;
  index: number;
  showTaxonomy?: boolean;
  onOpen: () => void;
  onDetails: () => void;
}) {
  const dept = DEPT_MAP[t.departmentCode];
  const pc = PRIORITY_CONFIG[t.defaultPriority];
  const form = resolveTemplateForm(t);
  const nFields = form.fields.length;
  const nRequired = form.fields.filter((f) => f.required).length;

  return (
    <div
      onClick={onOpen}
      className="text-left iris-card p-4 hover:border-primary/40 hover:shadow-md transition-all iris-fade-in-up group cursor-pointer flex flex-col"
      style={{ animationDelay: `${Math.min(index * 20, 240)}ms` }}
    >
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", pc.bg, pc.text)}>{t.defaultPriority}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
        {showTaxonomy && (
          <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[220px]">
            {templateCategoryLabel(t.category)} › {normalizeTemplateSubcategory(t.subcategory)}
          </span>
        )}
      </div>
      <div className="text-[14px] font-semibold leading-snug mb-1.5 group-hover:text-primary transition-colors">{t.title}</div>
      <div className="text-[12px] text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
        {t.description || <span className="italic">No description</span>}
      </div>
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-muted-foreground mt-auto">
        {dept && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {dept.name}
          </span>
        )}
        <span className="flex items-center gap-1 tabular-nums">
          <Clock className="w-3 h-3" />
          {t.estimatedResolutionHours}h target
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <ListChecks className="w-3 h-3" />
          {nFields} {nFields === 1 ? "question" : "questions"}
          {nRequired > 0 && <span className="opacity-75">({nRequired} required)</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/50">
        <Button
          size="sm"
          className="h-8 text-[12px] flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <Sparkles className="w-3 h-3 mr-1.5" />
          Use template
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[12px]"
          onClick={(e) => {
            e.stopPropagation();
            onDetails();
          }}
        >
          <Eye className="w-3 h-3 mr-1.5" />
          Details
        </Button>
      </div>
    </div>
  );
}

function SearchResults({
  results,
  query,
  onOpen,
  onDetails,
}: {
  results: TicketTemplate[];
  query: string;
  onOpen: (t: TicketTemplate) => void;
  onDetails: (t: TicketTemplate) => void;
}) {
  if (!results.length) {
    return (
      <div className="text-center py-16 iris-card">
        <Search className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
        <div className="text-[13px] font-medium">No templates match “{query}”</div>
        <div className="text-[11px] text-muted-foreground mt-1">Try fewer words, or browse by category.</div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-[12px] text-muted-foreground">
        {results.length} {results.length === 1 ? "template matches" : "templates match"} “{query}”
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {results.slice(0, 60).map((t, i) => (
          <TemplateCard key={t.code} template={t} index={i} showTaxonomy onOpen={() => onOpen(t)} onDetails={() => onDetails(t)} />
        ))}
      </div>
      {results.length > 60 && (
        <div className="text-[11px] text-muted-foreground text-center">Showing the first 60 — refine the search to see more.</div>
      )}
    </div>
  );
}

function TemplateDetail({
  t,
  canEdit,
  busy,
  isOpenInBuilder,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  t: TicketTemplate;
  canEdit: boolean;
  busy: boolean;
  isOpenInBuilder: boolean;
  onUse: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const form = resolveTemplateForm(t);
  return (
    <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto iris-scrollbar">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums",
              PRIORITY_CONFIG[t.defaultPriority].bg,
              PRIORITY_CONFIG[t.defaultPriority].text,
            )}
          >
            {t.defaultPriority}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground/80 font-medium">
            {templateCategoryLabel(normalizeTemplateCategory(t.category))} › {normalizeTemplateSubcategory(t.subcategory)}
          </span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{t.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-[13px] text-foreground/90 leading-relaxed">
          {t.description || <span className="italic text-muted-foreground">No description</span>}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoBox label="Library category" value={templateCategoryLabel(normalizeTemplateCategory(t.category))} />
          <InfoBox label="Library sub-category" value={normalizeTemplateSubcategory(t.subcategory)} />
          <InfoBox label="Department" value={DEPT_MAP[t.departmentCode]?.name || t.departmentCode || "—"} />
          <InfoBox label="Default Priority" value={t.defaultPriority} />
          <InfoBox label="Default Severity" value={t.defaultSeverity || "—"} />
          <InfoBox label="Estimated Resolution" value={`${t.estimatedResolutionHours} hours`} />
          <InfoBox label="Ticket category" value={form.category || "—"} />
          <InfoBox label="Ticket sub-category" value={form.subcategory || "—"} />
          <InfoBox label="Requested outcome" value={form.requestedOutcome || "—"} />
          <InfoBox label="Suggested Assignee" value={t.suggestedAssigneeRole || "Auto-routed"} />
          {form.studioOptions && (
            <InfoBox label="Studios" value={form.studioOptions.map((s) => s.split(",")[0]).join(", ")} />
          )}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            Scenario questions ({form.fields.length})
          </div>
          {form.fields.length === 0 ? (
            <div className="text-[11px] italic text-muted-foreground">
              This template only uses the standard ticket fields.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {form.fields.map((f) => (
                <div key={f.id} className="px-2.5 py-1.5 rounded-md bg-muted/40 border border-border text-[11px]">
                  <span className="font-medium">{f.label}</span>
                  {f.required && <span className="text-rose-500">*</span>}
                  <span className="text-muted-foreground">
                    {" "}
                    · {FIELD_TYPES.find((x) => x.value === f.type)?.label}
                  </span>
                  {f.options && <div className="text-muted-foreground mt-0.5 truncate">{f.options.join(" / ")}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Handling playbook (filed as the recommended resolution)
          </div>
          <div className="p-3 rounded-md bg-muted/30 border border-border text-[12px] whitespace-pre-line leading-relaxed">
            {t.recommendedActions || <span className="italic text-muted-foreground">No recommended actions defined</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
          <Button className="h-8 flex-1 min-w-[160px] text-[12px]" onClick={onUse}>
            <Sparkles className="w-3 h-3 mr-1.5" />
            {isOpenInBuilder ? "Back to the ticket form" : "Build a ticket from this template"}
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" className="h-8 text-[12px]" onClick={onEdit}>
                <Edit2 className="w-3 h-3 mr-1.5" />
                Edit
              </Button>
              <Button variant="outline" className="h-8 text-[12px]" onClick={onDuplicate} disabled={busy}>
                <Copy className="w-3 h-3 mr-1.5" />
                Duplicate
              </Button>
              <Button
                variant="ghost"
                className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete
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
  template,
  allTemplates,
  isNew,
  categories,
  busy,
  onSave,
  onCancel,
  onDelete,
}: {
  template: TicketTemplate;
  allTemplates: TicketTemplate[];
  isNew: boolean;
  categories: string[];
  busy: boolean;
  onSave: (updated: TicketTemplate) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const initial = React.useMemo(() => resolveTemplateForm(template), [template]);
  const [draft, setDraft] = React.useState<TicketTemplate>({ ...template });
  const [fields, setFields] = React.useState<TemplateField[]>(() =>
    initial.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
  );
  const [fCategory, setFCategory] = React.useState(initial.category);
  const [fSub, setFSub] = React.useState(initial.subcategory);
  const [studioOptions, setStudioOptions] = React.useState<string[]>(initial.studioOptions ?? []);
  const [areaOptions, setAreaOptions] = React.useState((initial.areaOptions ?? []).join(", "));
  const [formStudio, setFormStudio] = React.useState(initial.studio ?? "");
  const [formArea, setFormArea] = React.useState(initial.area ?? "");
  const [requestedOutcome, setRequestedOutcome] = React.useState(initial.requestedOutcome ?? "");
  const [occurred, setOccurred] = React.useState(initial.occurred ?? "");
  const [reportedBy, setReportedBy] = React.useState(initial.reportedBy ?? "");
  const [system, setSystem] = React.useState(initial.system ?? "");
  const [titlePrefill, setTitlePrefill] = React.useState(initial.titlePrefill ?? "");
  const [summaryPrefill, setSummaryPrefill] = React.useState(initial.summaryPrefill ?? "");

  const subSuggestions = React.useMemo(() => {
    const fromTaxonomy = templateCategoryMeta(draft.category)?.subcategories.map((s) => s.name) ?? [];
    const inUse = templateSubcategories(allTemplates, draft.category || "all").filter((s) => s !== GENERAL_SUBCATEGORY);
    return [...new Set([...fromTaxonomy, ...inUse])];
  }, [allTemplates, draft.category]);

  const update = <K extends keyof TicketTemplate>(key: K, value: TicketTemplate[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const patchField = (i: number, p: Partial<TemplateField>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f)));
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
    if (!draft.category.trim()) return toast.error("Category is required");
    const ids = new Set<string>();
    for (const f of fields) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(f.id))
        return toast.error(`Field id "${f.id}" must start with a letter and use only letters, numbers or _`);
      if (ids.has(f.id)) return toast.error(`Duplicate field id "${f.id}"`);
      ids.add(f.id);
      if (!f.label.trim()) return toast.error(`Field "${f.id}" needs a label`);
      if ((f.type === "select" || f.type === "multiselect") && !f.options?.length)
        return toast.error(`"${f.label}" needs at least one option`);
    }
    const cleaned = fields.map((f) => {
      const o: TemplateField = { id: f.id, label: f.label.trim(), type: f.type };
      if (f.required) o.required = true;
      if (f.options?.length && (f.type === "select" || f.type === "multiselect")) o.options = f.options;
      if (f.default !== undefined && f.default !== "" && !(Array.isArray(f.default) && !f.default.length))
        o.default = f.default;
      if (f.helper?.trim()) o.helper = f.helper.trim();
      return o;
    });
    onSave({
      ...draft,
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category.trim(),
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
        areaOptions: areaOptions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        requestedOutcome: requestedOutcome.trim() || undefined,
        occurred: occurred || undefined,
        reportedBy: reportedBy || undefined,
        system: system || undefined,
        titlePrefill: titlePrefill.trim() || undefined,
        summaryPrefill: summaryPrefill.trim() || undefined,
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isNew ? "New Template" : `Edit Template · ${template.code}`}
          </span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{draft.title || "Untitled Template"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div className={row}>
          <label className={lbl}>Title</label>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            className="text-[13px] h-9"
            placeholder="e.g. Membership Incorrectly Frozen"
          />
        </div>
        <div className={row}>
          <label className={lbl}>Description</label>
          <Textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            className="text-[13px] min-h-[64px]"
            placeholder="Pre-fills the summary in the form."
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={row}>
            <label className={lbl}>Code {isNew && <span className="normal-case font-normal">(auto if blank)</span>}</label>
            <Input
              value={draft.code}
              disabled={!isNew}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              className="text-[12px] font-mono h-9"
              placeholder="TPL-XXX"
            />
          </div>
          <div className={row}>
            <label className={lbl}>Library category</label>
            <Input
              list="iris-tpl-categories"
              value={draft.category}
              onChange={(e) => update("category", e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Membership"
            />
            <datalist id="iris-tpl-categories">
              {[...new Set([...TEMPLATE_CATEGORY_ORDER, ...categories, draft.category])].filter(Boolean).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className={row}>
            <label className={lbl}>Library sub-category</label>
            <Input
              list="iris-tpl-subcategories"
              value={draft.subcategory || ""}
              onChange={(e) => update("subcategory", e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Freezes & Pauses"
            />
            <datalist id="iris-tpl-subcategories">
              {subSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className={row}>
            <label className={lbl}>Est. hours</label>
            <Input
              type="number"
              min={1}
              value={draft.estimatedResolutionHours}
              onChange={(e) => update("estimatedResolutionHours", Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="text-[12px] h-9"
            />
          </div>
          <div className={row}>
            <label className={lbl}>Priority</label>
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
          <div className={row}>
            <label className={lbl}>Department</label>
            <Select value={draft.departmentCode} onValueChange={(v) => update("departmentCode", v)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <label className={lbl}>Severity</label>
            <Select
              value={draft.defaultSeverity || "none"}
              onValueChange={(v) => update("defaultSeverity", v === "none" ? undefined : v)}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {["Critical", "High", "Medium", "Low", "Not sure"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <label className={lbl}>Assignee role</label>
            <Input
              value={draft.suggestedAssigneeRole || ""}
              onChange={(e) => update("suggestedAssigneeRole", e.target.value)}
              className="text-[12px] h-9"
            />
          </div>
        </div>

        {/* Form builder prefill */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="text-[12px] font-semibold flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-violet-500" />
            Ticket form pre-fill
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={row}>
              <label className={lbl}>Ticket category</label>
              <Select
                value={fCategory || "none"}
                onValueChange={(v) => {
                  setFCategory(v === "none" ? "" : v);
                  setFSub("");
                }}
              >
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Auto-detect</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>Ticket sub-category</label>
              <Select value={fSub || "none"} onValueChange={(v) => setFSub(v === "none" ? "" : v)} disabled={!fCategory}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Auto-detect</SelectItem>
                  {(CATEGORY_MAP[fCategory] ?? []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
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
                      className={cn(
                        "px-2 py-1 rounded-md border text-[11px]",
                        on ? "border-violet-500 bg-violet-500/10 text-violet-600" : "border-border hover:bg-muted",
                      )}
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
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ask the user</SelectItem>
                  {IRIS_STUDIOS.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>Area choices (comma separated)</label>
              <Input
                value={areaOptions}
                onChange={(e) => setAreaOptions(e.target.value)}
                className="text-[12px] h-9"
                placeholder="Studio 1, Studio 2, Reception"
              />
            </div>
            <div className={row}>
              <label className={lbl}>Pre-selected area</label>
              <Input value={formArea} onChange={(e) => setFormArea(e.target.value)} className="text-[12px] h-9" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={row}>
              <label className={lbl}>Ticket title prefill</label>
              <Input
                value={titlePrefill}
                onChange={(e) => setTitlePrefill(e.target.value)}
                className="text-[12px] h-9"
                placeholder={draft.title || "Defaults to the template title"}
              />
            </div>
            <div className={row}>
              <label className={lbl}>System involved (pre-selected)</label>
              <Select value={system || "none"} onValueChange={(v) => setSystem(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">None</SelectItem>
                  {SYSTEMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>When it happened (pre-selected)</label>
              <Select value={occurred || "none"} onValueChange={(v) => setOccurred(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ask the user</SelectItem>
                  {OCCURRED_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={row}>
              <label className={lbl}>How it was reported (pre-selected)</label>
              <Select value={reportedBy || "none"} onValueChange={(v) => setReportedBy(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ask the user</SelectItem>
                  {REPORTED_BY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className={row}>
            <label className={lbl}>Summary prefill</label>
            <Textarea
              value={summaryPrefill}
              onChange={(e) => setSummaryPrefill(e.target.value)}
              className="text-[12px] min-h-[56px]"
              placeholder="Defaults to the template description"
            />
          </div>
          <div className={row}>
            <label className={lbl}>Requested outcome (pre-selected)</label>
            <Select value={requestedOutcome || "none"} onValueChange={(v) => setRequestedOutcome(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {REQUESTED_OUTCOMES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Field editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={lbl}>Scenario questions ({fields.length})</label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={addField}>
              <Plus className="w-3 h-3 mr-1" />
              Add field
            </Button>
          </div>
          {fields.length === 0 && (
            <div className="text-[11px] italic text-muted-foreground">
              No scenario questions — the ticket form will only ask the basics.
            </div>
          )}
          {fields.map((f, i) => {
            const hasOptions = f.type === "select" || f.type === "multiselect";
            return (
              <div key={i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-12 md:col-span-4 h-8 text-[12px]"
                    value={f.label}
                    placeholder="Label"
                    onChange={(e) =>
                      patchField(i, {
                        label: e.target.value,
                        ...(f.id.startsWith("field") ? { id: toId(e.target.value, f.id) } : {}),
                      })
                    }
                  />
                  <Input
                    className="col-span-6 md:col-span-3 h-8 text-[11px] font-mono"
                    value={f.id}
                    placeholder="id"
                    onChange={(e) => patchField(i, { id: e.target.value })}
                  />
                  <Select value={f.type} onValueChange={(v) => patchField(i, { type: v as TemplateFieldType, default: undefined })}>
                    <SelectTrigger className="col-span-6 md:col-span-2 h-8 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="col-span-4 md:col-span-1 flex items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={!!f.required}
                      onChange={(e) => patchField(i, { required: e.target.checked })}
                      className="accent-violet-600"
                    />
                    Req.
                  </label>
                  <div className="col-span-8 md:col-span-2 flex justify-end gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === 0}
                      onClick={() => moveField(i, -1)}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === fields.length - 1}
                      onClick={() => moveField(i, 1)}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-rose-500"
                      onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {hasOptions && (
                  <Input
                    className="h-8 text-[12px]"
                    placeholder="Options, comma separated"
                    defaultValue={(f.options ?? []).join(", ")}
                    onBlur={(e) =>
                      patchField(i, {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <DefaultEditor field={f} onChange={(d) => patchField(i, { default: d })} />
                  <Input
                    className="h-8 text-[12px]"
                    placeholder="Helper text (optional)"
                    value={f.helper ?? ""}
                    onChange={(e) => patchField(i, { helper: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className={row}>
          <label className={lbl}>Recommended actions</label>
          <Textarea
            value={draft.recommendedActions}
            onChange={(e) => update("recommendedActions", e.target.value)}
            className="text-[12px] min-h-[90px] font-mono"
            placeholder={"1. Verify...\n2. Check..."}
          />
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {!isNew && (
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className="h-8 text-[12px]" onClick={handleSave} disabled={busy}>
            <Save className="w-3 h-3 mr-1.5" />
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function toId(label: string, fallback: string) {
  const words = label
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return fallback;
  const id = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("");
  return /^[A-Za-z]/.test(id) ? id : fallback;
}

/** Default value control matching the field type (checkbox default, select default, ...). */
function DefaultEditor({
  field,
  onChange,
}: {
  field: TemplateField;
  onChange: (v: TemplateField["default"]) => void;
}) {
  const cls = "h-8 text-[12px]";
  if (field.type === "checkbox")
    return (
      <label className="flex items-center gap-2 text-[11px] h-8">
        <input
          type="checkbox"
          checked={field.default === true}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-violet-600"
        />
        Checked by default
      </label>
    );
  if (field.type === "select")
    return (
      <Select value={(field.default as string) || "none"} onValueChange={(v) => onChange(v === "none" ? undefined : v)}>
        <SelectTrigger className={cls}>
          <SelectValue placeholder="Default option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No default option</SelectItem>
          {(field.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
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
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? cur.filter((x) => x !== o) : [...cur, o])}
              className={cn(
                "px-1.5 py-0.5 rounded border text-[10px]",
                on ? "border-violet-500 bg-violet-500/10 text-violet-600" : "border-border",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  return (
    <Input
      className={cls}
      placeholder="Default value (optional)"
      value={(field.default as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
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
