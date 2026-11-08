"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/iris/store";
import {
  TICKET_TEMPLATES,
  templateCategories,
  type TicketTemplate,
  type TemplateField,
  type TemplateFieldType,
} from "@/lib/iris/templates";
import { resolveTemplateForm } from "@/lib/iris/template-form";
import {
  GENERAL_SUBCATEGORY,
  groupTemplatesByCategoryAndSubcategory,
  normalizeTemplateCategory,
  normalizeTemplateSubcategory,
  sortTemplateCategories,
  templateSubcategories,
  type TemplateCategoryGroup,
} from "@/lib/iris/template-groups";
import { templatesApi } from "@/lib/iris/library-api";
import { CATEGORIES, CATEGORY_MAP, IRIS_STUDIOS } from "@/lib/iris/iris-constants";
import { DEPARTMENTS, DEPT_MAP, PRIORITY_CONFIG, Priority } from "@/lib/iris/types";
import { DynamicFormIntake } from "@/components/iris/dynamic-form-intake";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Plus,
  Clock,
  Building2,
  Eye,
  Wand2,
  Sparkles,
  Tag,
  X,
  Save,
  Edit2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layers,
  LayoutGrid,
  ChevronsDownUp,
  ChevronsUpDown,
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

const CATEGORY_ACCENTS: Record<string, { dot: string; pill: string; border: string }> = {
  Membership: {
    dot: "bg-violet-500",
    pill: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    border: "border-l-violet-500",
  },
  Payment: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    border: "border-l-emerald-500",
  },
  Scheduling: {
    dot: "bg-sky-500",
    pill: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    border: "border-l-sky-500",
  },
  "Client Experience": {
    dot: "bg-pink-500",
    pill: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    border: "border-l-pink-500",
  },
  Facilities: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    border: "border-l-amber-500",
  },
  IT: {
    dot: "bg-indigo-500",
    pill: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    border: "border-l-indigo-500",
  },
  Operations: {
    dot: "bg-cyan-500",
    pill: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    border: "border-l-cyan-500",
  },
  HR: {
    dot: "bg-rose-500",
    pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    border: "border-l-rose-500",
  },
  Marketing: {
    dot: "bg-orange-500",
    pill: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    border: "border-l-orange-500",
  },
};

function categoryAccent(cat: string) {
  return (
    CATEGORY_ACCENTS[cat] ?? {
      dot: "bg-primary",
      pill: "bg-primary/10 text-primary border-primary/20",
      border: "border-l-primary",
    }
  );
}

/**
 * Templates library grouped hierarchically by Category -> Sub-category.
 * Templates live in Neon (/api/templates) and are editable by managers/admins
 * (or roles granted `templates.edit`). "Use This Template" opens the dynamic
 * form builder pre-populated from the template.
 */
export function TemplatesView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const currentUser = useAppStore((s) => s.currentUser);
  const tier = currentUser?.tier;
  const hasPerm = currentUser?.permissions?.includes("templates.edit");
  const canEdit = tier === "admin" || tier === "manager" || Boolean(hasPerm);

  // TICKET_TEMPLATES is updated in place by library-api; dataVersion re-reads it.
  const templates = React.useMemo(() => {
    void dataVersion;
    return [...TICKET_TEMPLATES];
  }, [dataVersion]);
  const categories = React.useMemo(() => {
    void dataVersion;
    return sortTemplateCategories(templateCategories());
  }, [dataVersion]);

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [rawSubcategory, setSubcategory] = React.useState("all");
  const [department, setDepartment] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grouped" | "flat">("grouped");
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});
  const [collapsedSubcategories, setCollapsedSubcategories] = React.useState<Record<string, boolean>>({});
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ template: TicketTemplate; isNew: boolean } | null>(null);
  const [using, setUsing] = React.useState<TicketTemplate | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Derive valid subcategory filter if selected category no longer contains it
  const availableSubcategories = React.useMemo(
    () => templateSubcategories(templates, category),
    [templates, category],
  );
  const subcategory =
    rawSubcategory !== "all" && !availableSubcategories.includes(rawSubcategory) ? "all" : rawSubcategory;

  const allSubcategoryCount = React.useMemo(() => {
    const pairs = new Set(
      templates.map((t) => `${normalizeTemplateCategory(t.category)}::${normalizeTemplateSubcategory(t.subcategory)}`),
    );
    return pairs.size;
  }, [templates]);

  const categoryTotals = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of templates) {
      const cat = normalizeTemplateCategory(t.category);
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [templates]);

  const selectedTemplate = React.useMemo(
    () => templates.find((t) => t.code === selectedCode) ?? null,
    [templates, selectedCode],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      const cat = normalizeTemplateCategory(t.category);
      const sub = normalizeTemplateSubcategory(t.subcategory);
      if (q) {
        const deptName = DEPT_MAP[t.departmentCode]?.name?.toLowerCase() ?? "";
        const hit =
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          sub.toLowerCase().includes(q) ||
          t.departmentCode.toLowerCase().includes(q) ||
          deptName.includes(q);
        if (!hit) return false;
      }
      if (category !== "all" && cat !== category) return false;
      if (subcategory !== "all" && sub !== subcategory) return false;
      if (department !== "all" && t.departmentCode !== department) return false;
      if (priority !== "all" && t.defaultPriority !== priority) return false;
      return true;
    });
  }, [templates, search, category, subcategory, department, priority]);

  const grouped = React.useMemo<TemplateCategoryGroup[]>(
    () => groupTemplatesByCategoryAndSubcategory(filtered),
    [filtered],
  );

  const filteredSubcategoryCount = React.useMemo(
    () => grouped.reduce((acc, g) => acc + g.subcategoryCount, 0),
    [grouped],
  );

  const isFiltering = Boolean(
    search.trim() || category !== "all" || subcategory !== "all" || department !== "all" || priority !== "all",
  );

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleSubcategoryCollapse = (key: string) => {
    setCollapsedSubcategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setCollapsedCategories({});
    setCollapsedSubcategories({});
  };

  const collapseAll = () => {
    const nextCat: Record<string, boolean> = {};
    for (const g of grouped) nextCat[g.category] = true;
    setCollapsedCategories(nextCat);
  };

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
      setSelectedCode(null);
    }
  };

  const handleDuplicate = async (t: TicketTemplate) => {
    const ok = await run(() => templatesApi.duplicate(t), "Template duplicated");
    if (ok) setSelectedCode(null);
  };

  const handleNew = (presetCategory?: string, presetSubcategory?: string) => {
    setEditing({
      isNew: true,
      template: {
        code: "",
        title: "",
        description: "",
        category: presetCategory || (category !== "all" ? category : categories[0] || "Operations"),
        subcategory:
          presetSubcategory && presetSubcategory !== GENERAL_SUBCATEGORY
            ? presetSubcategory
            : subcategory !== "all" && subcategory !== GENERAL_SUBCATEGORY
              ? subcategory
              : "",
        departmentCode: DEPARTMENTS[0]?.code || "MGT",
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
            {templates.length} Templates · {categories.length} Categories · {allSubcategoryCount} Sub-categories
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ticket Templates Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organized by category and sub-category. Choosing a template opens the ticket form pre-filled with its taxonomy, priority, department and field set.
          </p>
        </div>
        {canEdit && (
          <Button className="h-8 text-[12px]" onClick={() => handleNew()}>
            <Plus className="w-3 h-3 mr-1.5" />
            New Template
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Templates" value={templates.length} icon={Wand2} color="violet" />
        <StatCard label="Categories" value={categories.length} icon={Layers} color="sky" />
        <StatCard label="Sub-categories" value={allSubcategoryCount} icon={FolderTree} color="emerald" />
        <StatCard
          label="Avg Resolution"
          value={
            templates.length
              ? `${Math.round(templates.reduce((n, t) => n + t.estimatedResolutionHours, 0) / templates.length)}h`
              : "—"
          }
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Category quick-selector strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 iris-scrollbar">
        <button
          type="button"
          onClick={() => {
            setCategory("all");
            setSubcategory("all");
          }}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors shrink-0",
            category === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card hover:bg-muted/60 text-muted-foreground border-border",
          )}
        >
          All Categories <span className="opacity-75 tabular-nums ml-1">({templates.length})</span>
        </button>
        {categories.map((cat) => {
          const active = category === cat;
          const accent = categoryAccent(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(active ? "all" : cat);
                setSubcategory("all");
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors shrink-0 flex items-center gap-1.5",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card hover:bg-muted/60 text-foreground border-border",
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-primary-foreground" : accent.dot)} />
              {cat}
              <span className={cn("text-[10px] tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                {categoryTotals.get(cat) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-category quick chips when a specific category is active */}
      {category !== "all" && availableSubcategories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <FolderTree className="w-3 h-3" />
            {category} Sub-categories:
          </span>
          <button
            type="button"
            onClick={() => setSubcategory("all")}
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] border transition-colors",
              subcategory === "all"
                ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            All ({categoryTotals.get(category) ?? 0})
          </button>
          {availableSubcategories.map((sub) => {
            const count = templates.filter(
              (t) =>
                normalizeTemplateCategory(t.category) === category &&
                normalizeTemplateSubcategory(t.subcategory) === sub,
            ).length;
            const active = subcategory === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setSubcategory(active ? "all" : sub)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] border transition-colors",
                  active
                    ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {sub} <span className="opacity-70 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + Filters + View Mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title, code, category, sub-category, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setSubcategory("all");
          }}
        >
          <SelectTrigger className="h-8 w-[165px] text-[12px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subcategory} onValueChange={setSubcategory}>
          <SelectTrigger className="h-8 w-[180px] text-[12px]">
            <SelectValue placeholder="Sub-category" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All Sub-categories</SelectItem>
            {availableSubcategories.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-8 w-[175px] text-[12px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d.code} value={d.code}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-[130px] text-[12px]">
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
        {isFiltering && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setSubcategory("all");
              setDepartment("all");
              setPriority("all");
            }}
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {viewMode === "grouped" && grouped.length > 1 && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={expandAll} title="Expand all categories">
                <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                Expand all
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={collapseAll} title="Collapse all categories">
                <ChevronsDownUp className="w-3.5 h-3.5 mr-1" />
                Collapse all
              </Button>
            </>
          )}
          <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors",
                viewMode === "grouped" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FolderTree className="w-3 h-3" />
              Grouped
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors",
                viewMode === "flat" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="w-3 h-3" />
              Grid
            </button>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
        <div>
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {templates.length} templates
          {grouped.length > 0 && (
            <>
              {" "}across <span className="font-semibold text-foreground">{grouped.length}</span>{" "}
              {grouped.length === 1 ? "category" : "categories"} and{" "}
              <span className="font-semibold text-foreground">{filteredSubcategoryCount}</span>{" "}
              {filteredSubcategoryCount === 1 ? "sub-category" : "sub-categories"}
            </>
          )}
        </div>
      </div>

      {/* Grouped View: Category -> Sub-category -> Template Cards */}
      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {grouped.map((catGroup) => {
            const accent = categoryAccent(catGroup.category);
            // Auto-expand while actively searching so matches are never hidden
            const isCatCollapsed = !search.trim() && Boolean(collapsedCategories[catGroup.category]);

            return (
              <section
                key={catGroup.category}
                className={cn("iris-card overflow-hidden border-l-4", accent.border)}
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border/60 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(catGroup.category)}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-[200px] group"
                    aria-expanded={!isCatCollapsed}
                  >
                    {isCatCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", accent.dot)} />
                    <h2 className="text-[15px] font-semibold tracking-tight">{catGroup.category}</h2>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border tabular-nums", accent.pill)}>
                      {catGroup.count} {catGroup.count === 1 ? "template" : "templates"}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      · {catGroup.subcategoryCount} {catGroup.subcategoryCount === 1 ? "sub-category" : "sub-categories"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    {catGroup.priorityCounts.P0 > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 tabular-nums">
                        {catGroup.priorityCounts.P0} P0
                      </span>
                    )}
                    {catGroup.priorityCounts.P1 > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 tabular-nums">
                        {catGroup.priorityCounts.P1} P1
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />~{catGroup.avgResolutionHours}h avg
                    </span>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => handleNew(catGroup.category)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>

                {/* Nested Sub-category Groups */}
                {!isCatCollapsed && (
                  <div className="divide-y divide-border/50">
                    {catGroup.subcategories.map((subGroup) => {
                      const isSubCollapsed = !search.trim() && Boolean(collapsedSubcategories[subGroup.key]);
                      return (
                        <div key={subGroup.key} className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleSubcategoryCollapse(subGroup.key)}
                              className="flex items-center gap-2 text-left group"
                              aria-expanded={!isSubCollapsed}
                            >
                              {isSubCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                              )}
                              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                              <h3 className="text-[13px] font-semibold text-foreground/95 group-hover:text-primary transition-colors">
                                {subGroup.subcategory}
                              </h3>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                                {subGroup.count}
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {subGroup.departments.map((deptCode) => {
                                const d = DEPT_MAP[deptCode];
                                return (
                                  <span
                                    key={deptCode}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground flex items-center gap-1"
                                  >
                                    <Building2 className="w-2.5 h-2.5" />
                                    {d ? d.name.split(" ")[0] : deptCode}
                                  </span>
                                );
                              })}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleNew(catGroup.category, subGroup.subcategory)}
                                  className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 flex items-center gap-0.5 transition-colors"
                                  title={`New template in ${catGroup.category} › ${subGroup.subcategory}`}
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  New
                                </button>
                              )}
                            </div>
                          </div>

                          {!isSubCollapsed && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-1">
                              {subGroup.templates.map((t, i) => (
                                <TemplateCard
                                  key={t.code}
                                  template={t}
                                  index={i}
                                  showTaxonomy={false}
                                  onSelect={() => setSelectedCode(t.code)}
                                  onQuickUse={(e) => {
                                    e.stopPropagation();
                                    setUsing(t);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* Flat Grid Fallback */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, i) => (
            <TemplateCard
              key={t.code}
              template={t}
              index={i}
              showTaxonomy
              onSelect={() => setSelectedCode(t.code)}
              onQuickUse={(e) => {
                e.stopPropagation();
                setUsing(t);
              }}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20 iris-card">
          <Wand2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] font-medium">No templates match your filters</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Try clearing your search or selecting a different category / sub-category.
          </div>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedCode(null)}>
        {selectedTemplate && (
          <TemplateDetail
            t={selectedTemplate}
            canEdit={canEdit}
            busy={busy}
            onUse={() => {
              setUsing(selectedTemplate);
              setSelectedCode(null);
            }}
            onEdit={() => {
              setEditing({ template: selectedTemplate, isNew: false });
              setSelectedCode(null);
            }}
            onDuplicate={() => handleDuplicate(selectedTemplate)}
            onDelete={() => handleDelete(selectedTemplate.code)}
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

      {/* Form builder, pre-populated from the chosen template */}
      {using && <DynamicFormIntake template={using} onClose={() => setUsing(null)} />}
    </div>
  );
}

function TemplateCard({
  template: t,
  index,
  showTaxonomy,
  onSelect,
  onQuickUse,
}: {
  template: TicketTemplate;
  index: number;
  showTaxonomy: boolean;
  onSelect: () => void;
  onQuickUse: (e: React.MouseEvent) => void;
}) {
  const dept = DEPT_MAP[t.departmentCode];
  const pc = PRIORITY_CONFIG[t.defaultPriority];
  const nFields = resolveTemplateForm(t).fields.length;
  const sub = normalizeTemplateSubcategory(t.subcategory);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="text-left iris-card p-3.5 hover:border-primary/40 hover:shadow-sm transition-all iris-fade-in-up group cursor-pointer flex flex-col justify-between"
      style={{ animationDelay: `${Math.min(index * 15, 240)}ms` }}
    >
      <div>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", pc.bg, pc.text)}>
            {t.defaultPriority}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
          {showTaxonomy ? (
            <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[180px]">
              {t.category} › {sub}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground ml-auto truncate max-w-[140px]">
              {sub}
            </span>
          )}
        </div>
        <div className="text-[13px] font-semibold leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
          {t.title}
        </div>
        <div className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {t.description || <span className="italic">No description</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border/50">
        {dept && (
          <span className="flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5" />
            {dept.name.split(" ")[0]}
          </span>
        )}
        <span className="flex items-center gap-1 tabular-nums">
          <Clock className="w-2.5 h-2.5" />
          {t.estimatedResolutionHours}h
        </span>
        {nFields > 0 && (
          <span className="flex items-center gap-1 tabular-nums">
            <Filter className="w-2.5 h-2.5" />
            {nFields} {nFields === 1 ? "field" : "fields"}
          </span>
        )}
        <button
          type="button"
          onClick={onQuickUse}
          className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:underline"
        >
          <Sparkles className="w-2.5 h-2.5" />
          Use
        </button>
        <Eye className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function TemplateDetail({
  t,
  canEdit,
  busy,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  t: TicketTemplate;
  canEdit: boolean;
  busy: boolean;
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
            {normalizeTemplateCategory(t.category)} › {normalizeTemplateSubcategory(t.subcategory)}
          </span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{t.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-[13px] text-foreground/90 leading-relaxed">
          {t.description || <span className="italic text-muted-foreground">No description</span>}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoBox label="Category" value={normalizeTemplateCategory(t.category)} />
          <InfoBox label="Sub-category" value={normalizeTemplateSubcategory(t.subcategory)} />
          <InfoBox label="Department" value={DEPT_MAP[t.departmentCode]?.name || t.departmentCode || "—"} />
          <InfoBox label="Default Priority" value={t.defaultPriority} />
          <InfoBox label="Default Severity" value={t.defaultSeverity || "—"} />
          <InfoBox label="Estimated Resolution" value={`${t.estimatedResolutionHours} hours`} />
          <InfoBox label="Form Category" value={form.category || "—"} />
          <InfoBox label="Form Sub-category" value={form.subcategory || "—"} />
          <InfoBox label="Suggested Assignee" value={t.suggestedAssigneeRole || "Auto-routed"} />
          {form.studioOptions && (
            <InfoBox label="Studios" value={form.studioOptions.map((s) => s.split(",")[0]).join(", ")} />
          )}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            Form fields ({form.fields.length})
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
            Recommended Actions
          </div>
          <div className="p-3 rounded-md bg-muted/30 border border-border text-[12px] whitespace-pre-line leading-relaxed">
            {t.recommendedActions || <span className="italic text-muted-foreground">No recommended actions defined</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
          <Button className="h-8 flex-1 min-w-[160px] text-[12px]" onClick={onUse}>
            <Sparkles className="w-3 h-3 mr-1.5" />
            Use This Template
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

  const subSuggestions = React.useMemo(
    () => templateSubcategories(allTemplates, draft.category || "all").filter((s) => s !== GENERAL_SUBCATEGORY),
    [allTemplates, draft.category],
  );

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
              {[...new Set([...categories, draft.category])].filter(Boolean).map((c) => (
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
              placeholder="e.g. Freeze Issue"
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
            Form builder pre-fill
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={row}>
              <label className={lbl}>Form category</label>
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
              <label className={lbl}>Form subcategory</label>
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
          <div className={row}>
            <label className={lbl}>Requested outcome (pre-selected)</label>
            <Select value={requestedOutcome || "none"} onValueChange={(v) => setRequestedOutcome(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {["Fix the issue", "Refund / credit", "Information only", "Process change", "Escalate to management"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Field editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={lbl}>Template fields ({fields.length})</label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={addField}>
              <Plus className="w-3 h-3 mr-1" />
              Add field
            </Button>
          </div>
          {fields.length === 0 && (
            <div className="text-[11px] italic text-muted-foreground">
              No custom fields — the form will only ask the standard questions.
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
