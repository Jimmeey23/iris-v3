"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AirVent, AlertTriangle, ArrowDownUp, Bike, CheckCircle2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Clock,
  Download, Grid3x3, HelpCircle, LayoutGrid, Layers, List, Loader2, Mic, RefreshCw, Search, ShieldCheck, Speaker, Wrench, X, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/iris/live-data";
import { useAppStore } from "@/lib/iris/store";

type Fault = { id: string; ticket_id: string; title: string; status: string; priority: string; created_at: string; resolved_at: string | null };
type Item = {
  id: string;
  studio_code: string;
  studio_name: string;
  city: string;
  kind: "bike" | "mic" | "audio" | "ac";
  number: number | null;
  location: string | null;
  label: string;
  model: string | null;
  serial: string | null;
  status: "in_service" | "out_of_service" | "retired";
  notes: string | null;
  faults_total: number;
  faults_90d: number;
  open_faults: number;
  last_fault_at: string | null;
  avg_repair_h: number | null;
  rechecks_failed: number;
  rechecks_passed: number;
  replace_candidate: boolean;
  faults: Fault[];
};

type Health = "replace" | "open" | "healthy";
type GroupBy = "studio" | "kind" | "health" | "city" | "none";
type SortBy = "risk" | "faults" | "recent" | "repair" | "label";

const KIND = {
  bike: { label: "Bikes", icon: Bike },
  mic: { label: "Microphones", icon: Mic },
  audio: { label: "Speakers & music", icon: Speaker },
  ac: { label: "AC", icon: AirVent },
} as const;

const STATUS = {
  in_service: "In service",
  out_of_service: "Out of service",
  retired: "Retired",
} as const;

const HEALTH: Record<Health, { label: string; dot: string; chip: string; tile: string; bar: string }> = {
  replace: { label: "Replace candidate", dot: "bg-rose-500", chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", tile: "bg-rose-500/10 text-rose-500 ring-rose-500/20", bar: "bg-rose-500" },
  open: { label: "Open fault", dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", tile: "bg-amber-500/10 text-amber-500 ring-amber-500/20", bar: "bg-amber-500" },
  healthy: { label: "Healthy", dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", tile: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20", bar: "bg-emerald-500" },
};

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  urgent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

const health = (i: Item): Health => (i.replace_candidate ? "replace" : i.open_faults ? "open" : "healthy");
const isClosed = (s: string) => ["resolved", "closed"].includes(s);
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
const hours = (h: number | null) => (h === null ? "-" : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 60 ? `${d}d ago` : `${Math.round(d / 30)}mo ago`;
};

const SORTERS: Record<SortBy, (a: Item, b: Item) => number> = {
  risk: (a, b) => Number(b.replace_candidate) - Number(a.replace_candidate) || b.open_faults - a.open_faults || b.faults_90d - a.faults_90d || b.faults_total - a.faults_total,
  faults: (a, b) => b.faults_total - a.faults_total || b.faults_90d - a.faults_90d,
  recent: (a, b) => (b.last_fault_at ?? "").localeCompare(a.last_fault_at ?? ""),
  repair: (a, b) => (b.avg_repair_h ?? -1) - (a.avg_repair_h ?? -1),
  label: (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }),
};

const HEALTH_ORDER: Health[] = ["replace", "open", "healthy"];
const KIND_ORDER: Item["kind"][] = ["bike", "mic", "audio", "ac"];
/** Couldn't tell which unit: no number and no location. */
const unidentified = (i: Item) => i.kind !== "ac" && i.number === null && !i.location;

function groupKey(i: Item, by: GroupBy): { key: string; label: string; order: number } {
  switch (by) {
    case "studio": return { key: i.studio_code, label: i.studio_name, order: 0 };
    case "city": return { key: i.city || "-", label: i.city || "Unknown city", order: 0 };
    case "kind": return { key: i.kind, label: KIND[i.kind].label, order: KIND_ORDER.indexOf(i.kind) };
    case "health": { const h = health(i); return { key: h, label: HEALTH[h].label, order: HEALTH_ORDER.indexOf(h) }; }
    default: return { key: "all", label: "All equipment", order: 0 };
  }
}

export function EquipmentView() {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<"all" | Item["kind"]>("all");
  const [studio, setStudio] = React.useState("all");
  const [statusF, setStatusF] = React.useState<"all" | Item["status"]>("all");
  const [healthF, setHealthF] = React.useState<Set<Health>>(new Set());
  const [hideRetired, setHideRetired] = React.useState(false);
  const [groupBy, setGroupBy] = React.useState<GroupBy>("studio");
  const [sortBy, setSortBy] = React.useState<SortBy>("risk");
  const [layout, setLayout] = React.useState<"fleet" | "list" | "grid">("fleet");
  const [focus, setFocus] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ items: Item[]; canEdit: boolean }>("/api/equipment");
      setItems(r.items);
      setCanEdit(r.canEdit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load equipment");
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const update = async (id: string, changes: Partial<Item>) => {
    const before = items;
    setItems((list) => list?.map((i) => (i.id === id ? { ...i, ...changes } : i)) ?? list);
    try {
      await api("/api/equipment", { method: "PATCH", json: { id, changes } });
    } catch (e) {
      setItems(before);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  };

  const bulkStatus = async (status: Item["status"]) => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) => api("/api/equipment", { method: "PATCH", json: { id, changes: { status } } })));
    const okIds = new Set(ids.filter((_, n) => results[n].status === "fulfilled"));
    setItems((list) => list?.map((i) => (okIds.has(i.id) ? { ...i, status } : i)) ?? list);
    const failed = ids.length - okIds.size;
    if (failed) toast.error(`${failed} of ${ids.length} couldn't be updated`);
    else toast.success(`${okIds.size} item${okIds.size === 1 ? "" : "s"} set to ${STATUS[status].toLowerCase()}`);
    setSelected(new Set());
    setBulkBusy(false);
  };

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    set((s) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; });

  const shown = React.useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => kind === "all" || i.kind === kind)
      .filter((i) => studio === "all" || i.studio_code === studio)
      .filter((i) => statusF === "all" || i.status === statusF)
      .filter((i) => !hideRetired || i.status !== "retired")
      .filter((i) => !healthF.size || healthF.has(health(i)))
      .filter((i) => !q || `${i.label} ${i.studio_name} ${i.city} ${i.model ?? ""} ${i.serial ?? ""} ${i.notes ?? ""} ${i.faults.map((f) => `${f.ticket_id} ${f.title}`).join(" ")}`.toLowerCase().includes(q))
      .sort(SORTERS[sortBy]);
  }, [items, query, kind, studio, statusF, hideRetired, healthF, sortBy]);

  const groups = React.useMemo(() => {
    const m = new Map<string, { key: string; label: string; order: number; items: Item[] }>();
    for (const i of shown) {
      const g = groupKey(i, groupBy);
      const entry = m.get(g.key) ?? { ...g, items: [] };
      entry.items.push(i);
      m.set(g.key, entry);
    }
    return [...m.values()].sort((a, b) => a.order - b.order || riskScore(b.items) - riskScore(a.items) || a.label.localeCompare(b.label));
  }, [shown, groupBy]);

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="iris-card p-6 text-center space-y-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
          <div className="text-[13px]">{error}</div>
          <Button size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
        </div>
      </div>
    );
  }
  if (!items) {
    return <div className="p-6 flex items-center justify-center gap-2 text-[13px] text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading equipment…</div>;
  }

  const studios = [...new Map(items.map((i) => [i.studio_code, i.studio_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const numberedFaults = items.filter((i) => !unidentified(i)).reduce((n, i) => n + i.faults_total, 0);
  const unnumbered = items.filter(unidentified).reduce((n, i) => n + i.faults_total, 0);
  const counts = { replace: 0, open: 0, healthy: 0 } as Record<Health, number>;
  for (const i of items) counts[health(i)]++;
  const stats = [
    { label: "Tracked items", value: items.length, sub: `${items.filter((i) => i.status === "in_service").length} in service`, icon: Wrench, tone: "text-violet-500 bg-violet-500/10" },
    { label: "Open faults", value: items.reduce((n, i) => n + i.open_faults, 0), sub: `${counts.open + counts.replace} units affected`, icon: XCircle, tone: "text-amber-500 bg-amber-500/10", health: "open" as Health },
    { label: "Replace candidates", value: counts.replace, sub: "3+ faults in 90d or 2+ failed re-checks", icon: AlertTriangle, tone: "text-rose-500 bg-rose-500/10", health: "replace" as Health },
    { label: "Faults · 90 days", value: items.reduce((n, i) => n + i.faults_90d, 0), sub: `${items.reduce((n, i) => n + i.faults_total, 0)} all-time`, icon: Clock, tone: "text-sky-500 bg-sky-500/10" },
  ];

  const filtersActive = query || kind !== "all" || studio !== "all" || statusF !== "all" || healthF.size || hideRetired;
  const clearFilters = () => { setQuery(""); setKind("all"); setStudio("all"); setStatusF("all"); setHealthF(new Set()); setHideRetired(false); };
  const allOpen = shown.length > 0 && shown.every((i) => open.has(i.id));
  const allSelected = shown.length > 0 && shown.every((i) => selected.has(i.id));

  const exportCsv = () => {
    const cols = ["label", "kind", "location", "studio_name", "city", "status", "model", "serial", "faults_total", "faults_90d", "open_faults", "avg_repair_h", "rechecks_passed", "rechecks_failed", "replace_candidate", "last_fault_at", "notes"] as const;
    const esc = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(","), ...shown.map((i) => cols.map((c) => esc(i[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `equipment-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Wrench className="w-3 h-3 text-violet-500" /> Studio equipment · Live from repair tickets
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Equipment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Every bike, microphone and AC system, its fault history and re-check results - so repeat failures get replaced, not patched again.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={exportCsv} disabled={!shown.length}>
            <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}Refresh
          </Button>
        </div>
      </div>

      {/* KPI tiles - the health ones double as filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const active = s.health && healthF.has(s.health);
          const Tag = s.health ? "button" : "div";
          return (
            <Tag key={s.label} {...(s.health ? { onClick: () => toggle(setHealthF, s.health!), "aria-pressed": active } : {})}
              className={cn("iris-card-elevated p-3.5 flex items-start gap-3 text-left transition-all", s.health && "hover:ring-1 hover:ring-primary/30", active && "ring-2 ring-primary/50")}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.tone)}><s.icon className="w-4 h-4" /></div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-xl font-bold tabular-nums leading-tight">{s.value}</div>
                <div className="text-[10.5px] text-muted-foreground">{s.sub}</div>
              </div>
            </Tag>
          );
        })}
      </div>

      {/* Fleet health bar */}
      <div className="iris-card-elevated p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold">Fleet health</span>
          <div className="flex gap-3 flex-wrap">
            {HEALTH_ORDER.map((h) => (
              <button key={h} onClick={() => toggle(setHealthF, h)} className={cn("flex items-center gap-1.5 text-muted-foreground hover:text-foreground", healthF.has(h) && "text-foreground font-semibold")}>
                <span className={cn("w-2 h-2 rounded-full", HEALTH[h].dot)} />{HEALTH[h].label} <span className="tabular-nums">{counts[h]}</span>
              </button>
            ))}
          </div>
        </div>
        <HealthBar items={items} className="h-2.5" />
      </div>

      {unnumbered > 0 && (
        <div className="iris-card p-3 flex items-start gap-2.5 border border-sky-500/30">
          <HelpCircle className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
          <div className="text-[12px]">
            <span className="font-semibold">{unnumbered} of {unnumbered + numberedFaults} faults don't say which bike or mic.</span>{" "}
            <span className="text-muted-foreground">IRIS read the title, description and intake answers of each one and found no bike number or mic location, so they sit under “Unidentified” per studio. Ask teams to name the unit (e.g. “Bike 7”, “mic in Studio 2”) - IRIS picks it up automatically.</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="iris-card-elevated p-3 space-y-2.5 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search label, model, serial, notes, ticket…" aria-label="Search equipment" className="h-8 pl-8 text-[12px]" />
          </div>
          <Segmented value={kind} onChange={setKind} label="Equipment type"
            options={[{ v: "all", l: "All" }, ...KIND_ORDER.map((k) => ({ v: k, l: KIND[k].label, icon: KIND[k].icon }))]} />
          <Select value={studio} onChange={setStudio} label="Studio" options={[["all", "All studios"], ...studios]} />
          <Select value={statusF} onChange={(v) => setStatusF(v as typeof statusF)} label="Status" options={[["all", "Any status"], ...Object.entries(STATUS)]} />
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[12px]">
          <span className="flex items-center gap-1 text-muted-foreground"><Layers className="w-3.5 h-3.5" />Group</span>
          <Select value={groupBy} onChange={(v) => { setGroupBy(v as GroupBy); setCollapsed(new Set()); }} label="Group by"
            options={[["studio", "Studio"], ["city", "City"], ["kind", "Type"], ["health", "Health"], ["none", "No grouping"]]} />
          <span className="flex items-center gap-1 text-muted-foreground ml-1"><ArrowDownUp className="w-3.5 h-3.5" />Sort</span>
          <Select value={sortBy} onChange={(v) => setSortBy(v as SortBy)} label="Sort by"
            options={[["risk", "Highest risk"], ["faults", "Most faults"], ["recent", "Latest fault"], ["repair", "Slowest repair"], ["label", "Name"]]} />
          <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer ml-1">
            <input type="checkbox" checked={hideRetired} onChange={(e) => setHideRetired(e.target.checked)} className="accent-[var(--primary)]" />Hide retired
          </label>
          {filtersActive ? (
            <button onClick={clearFilters} className="flex items-center gap-1 text-primary hover:underline"><X className="w-3 h-3" />Clear filters</button>
          ) : null}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-muted-foreground tabular-nums">{shown.length} of {items.length}</span>
            <IconBtn title={allOpen ? "Collapse all items" : "Expand all items"} onClick={() => setOpen(allOpen ? new Set() : new Set(shown.map((i) => i.id)))}>
              {allOpen ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
            </IconBtn>
            <div className="flex rounded-md border border-border overflow-hidden" role="group" aria-label="Layout">
              <IconBtn title="Studio floor" active={layout === "fleet"} onClick={() => setLayout("fleet")} flat><Grid3x3 className="w-3.5 h-3.5" /></IconBtn>
              <IconBtn title="List" active={layout === "list"} onClick={() => setLayout("list")} flat><List className="w-3.5 h-3.5" /></IconBtn>
              <IconBtn title="Grid" active={layout === "grid"} onClick={() => setLayout("grid")} flat><LayoutGrid className="w-3.5 h-3.5" /></IconBtn>
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap text-[12px] pt-2 border-t border-border">
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(shown.map((i) => i.id)))} className="accent-[var(--primary)]" />
              Select all shown
            </label>
            {selected.size > 0 && (
              <>
                <span className="font-semibold text-primary">{selected.size} selected</span>
                <span className="text-muted-foreground">· Set status:</span>
                {(Object.keys(STATUS) as Item["status"][]).map((s) => (
                  <Button key={s} variant="outline" size="sm" className="h-7 text-[11px]" disabled={bulkBusy} onClick={() => bulkStatus(s)}>{STATUS[s]}</Button>
                ))}
                <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground">Clear</button>
                {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </>
            )}
          </div>
        )}
      </div>

      {layout === "fleet" && (
        <div className="space-y-4">
          {studios
            .filter(([code]) => shown.some((i) => i.studio_code === code))
            .map(([code, name]) => (
              <StudioFloor key={code} name={name} items={shown.filter((i) => i.studio_code === code)}
                focus={focus} onFocus={(id) => setFocus((f) => (f === id ? null : id))}
                canEdit={canEdit} onUpdate={update} />
            ))}
          {!shown.length && (
            <div className="iris-card text-center py-16 space-y-2">
              <Search className="w-5 h-5 text-muted-foreground mx-auto" />
              <div className="text-[13px] text-muted-foreground">No equipment matches.</div>
            </div>
          )}
        </div>
      )}

      {/* Groups */}
      {layout !== "fleet" && <div className="space-y-5">
        {groups.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          const gOpen = g.items.reduce((n, i) => n + i.open_faults, 0);
          const gReplace = g.items.filter((i) => i.replace_candidate).length;
          return (
            <section key={g.key} className="space-y-2">
              {groupBy !== "none" && (
                <button onClick={() => toggle(setCollapsed, g.key)} aria-expanded={!isCollapsed}
                  className="w-full flex items-center gap-3 px-1 py-1 group">
                  <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", !isCollapsed && "rotate-90")} />
                  <span className="text-[13px] font-semibold truncate min-w-0">{g.label}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{g.items.length} item{g.items.length === 1 ? "" : "s"}</span>
                  {gReplace > 0 && <Chip tone={HEALTH.replace.chip}>{gReplace} replace</Chip>}
                  {gOpen > 0 && <Chip tone={HEALTH.open.chip}>{gOpen} open</Chip>}
                  <div className="flex-1 h-px bg-border mx-2" />
                  <HealthBar items={g.items} className="hidden sm:flex h-1.5 w-28 shrink-0" />
                </button>
              )}
              {!isCollapsed && (
                <div className={cn(layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start" : "space-y-2")}>
                  {g.items.map((i) => (
                    <EquipmentCard key={i.id} item={i} layout={layout} canEdit={canEdit}
                      expanded={open.has(i.id)} onToggle={() => toggle(setOpen, i.id)}
                      selected={selected.has(i.id)} onSelect={() => toggle(setSelected, i.id)}
                      onUpdate={(c) => update(i.id, c)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {!shown.length && (
          <div className="iris-card text-center py-16 space-y-2">
            <Search className="w-5 h-5 text-muted-foreground mx-auto" />
            <div className="text-[13px] text-muted-foreground">No equipment matches.</div>
            {filtersActive ? <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={clearFilters}>Clear filters</Button> : null}
          </div>
        )}
      </div>}
    </div>
  );
}

/**
 * One studio laid out like the floor: bikes as numbered tiles in order, mics and
 * speakers by location, AC last. Unidentified units sit at the end of each row.
 * Clicking a tile opens its full card underneath.
 */
function StudioFloor({ name, items, focus, onFocus, canEdit, onUpdate }: {
  name: string; items: Item[]; focus: string | null; onFocus: (id: string) => void;
  canEdit: boolean; onUpdate: (id: string, c: Partial<Item>) => void;
}) {
  const city = items[0]?.city;
  const open = items.reduce((n, i) => n + i.open_faults, 0);
  const replace = items.filter((i) => i.replace_candidate).length;
  const focused = items.find((i) => i.id === focus);
  const byKind = KIND_ORDER.map((k) => ({
    k,
    list: items
      .filter((i) => i.kind === k)
      .sort((a, b) => Number(unidentified(a)) - Number(unidentified(b)) || (a.number ?? 999) - (b.number ?? 999) || (a.location ?? "").localeCompare(b.location ?? "")),
  })).filter((g) => g.list.length);
  return (
    <section className="iris-card-elevated overflow-hidden">
      <header className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-border bg-muted/30">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-tight">{name}</div>
          <div className="text-[11px] text-muted-foreground">{city} · {items.length} tracked unit{items.length === 1 ? "" : "s"}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {replace > 0 && <Chip tone={HEALTH.replace.chip}>{replace} replace</Chip>}
          {open > 0 && <Chip tone={HEALTH.open.chip}>{open} open</Chip>}
          {!replace && !open && <Chip tone={HEALTH.healthy.chip}>All healthy</Chip>}
        </div>
        <HealthBar items={items} className="ml-auto h-2 w-40 max-w-full" />
      </header>
      <div className="p-4 space-y-4">
        {byKind.map(({ k, list }) => {
          const K = KIND[k];
          return (
            <div key={k} className="grid gap-2 md:grid-cols-[140px_minmax(0,1fr)] items-start">
              <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground pt-2">
                <K.icon className="w-4 h-4" />{K.label}
                <span className="tabular-nums text-[10.5px]">{list.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {list.map((i) => <Tile key={i.id} item={i} active={focus === i.id} onClick={() => onFocus(i.id)} />)}
              </div>
            </div>
          );
        })}
      </div>
      {focused && (
        <div className="border-t border-border p-3 bg-muted/20">
          <EquipmentCard item={focused} layout="list" canEdit={canEdit} expanded onToggle={() => onFocus(focused.id)}
            selected={false} onSelect={() => {}} onUpdate={(c) => onUpdate(focused.id, c)} />
        </div>
      )}
    </section>
  );
}

function Tile({ item: i, active, onClick }: { item: Item; active: boolean; onClick: () => void }) {
  const h = health(i);
  const unknown = unidentified(i);
  const main = i.number !== null ? `#${i.number}` : i.location ?? (i.kind === "ac" ? "AC" : "?");
  return (
    <button onClick={onClick} aria-pressed={active}
      title={`${i.label} · ${i.faults_total} fault${i.faults_total === 1 ? "" : "s"}${i.open_faults ? ` · ${i.open_faults} open` : ""}`}
      className={cn(
        "relative rounded-xl border px-2.5 py-2 text-left transition-all hover:-translate-y-px hover:shadow-sm",
        i.number !== null ? "w-[68px]" : "min-w-[110px] max-w-[180px]",
        unknown ? "border-dashed bg-muted/40" : "bg-background",
        active ? "ring-2 ring-primary border-primary/50" : "border-border",
        i.status === "retired" && "opacity-50",
      )}>
      <span className={cn("absolute top-1.5 right-1.5 w-2 h-2 rounded-full", HEALTH[h].dot)} aria-hidden />
      <div className={cn("font-semibold leading-tight truncate", i.number !== null ? "text-[16px] tabular-nums" : "text-[12px] pr-3")}>
        {unknown ? "Unidentified" : main}
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
        {i.faults_total} fault{i.faults_total === 1 ? "" : "s"}{i.open_faults ? <span className="text-amber-600 dark:text-amber-400"> · {i.open_faults} open</span> : null}
      </div>
    </button>
  );
}

function riskScore(items: Item[]) {
  return items.reduce((n, i) => n + (i.replace_candidate ? 100 : 0) + i.open_faults * 10 + i.faults_90d, 0);
}

function EquipmentCard({ item: i, layout, canEdit, expanded, onToggle, selected, onSelect, onUpdate }: {
  item: Item; layout: "list" | "grid" | "fleet"; canEdit: boolean; expanded: boolean; onToggle: () => void;
  selected: boolean; onSelect: () => void; onUpdate: (c: Partial<Item>) => void;
}) {
  const Icon = KIND[i.kind].icon;
  const h = health(i);
  const grid = layout === "grid";
  const recheckTotal = i.rechecks_passed + i.rechecks_failed;
  return (
    <div className={cn("iris-card-elevated overflow-hidden relative transition-shadow", i.status === "retired" && "opacity-60", selected && "ring-2 ring-primary/50", expanded && "shadow-md")}>
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", HEALTH[h].bar)} aria-hidden />
      <div className={cn("p-3.5 pl-4 flex gap-3", grid ? "flex-col" : "items-center flex-wrap")}>
        <div className="flex items-center gap-3 flex-1 min-w-0 sm:min-w-[220px] basis-full sm:basis-auto">
          {canEdit && (
            <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${i.label}`} className="accent-[var(--primary)] shrink-0" />
          )}
          <button onClick={onToggle} aria-expanded={expanded} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1", HEALTH[h].tile)}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13.5px] font-semibold">{i.label}</span>
                {h !== "healthy" && <Chip tone={HEALTH[h].chip}>{HEALTH[h].label}</Chip>}
                {i.status !== "in_service" && <Chip tone="bg-muted text-muted-foreground border-border">{STATUS[i.status]}</Chip>}
              </div>
              <div className="text-[11px] text-muted-foreground break-words">
                {i.studio_name}{i.city ? `, ${i.city}` : ""}{i.location ? ` · ${i.location}` : ""}{i.model ? ` · ${i.model}` : ""}{i.serial ? ` · SN ${i.serial}` : ""}
              </div>
              <div className="text-[10.5px] text-muted-foreground mt-0.5">Last fault {ago(i.last_fault_at)}</div>
            </div>
            {!grid && <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 md:hidden", expanded && "rotate-180")} />}
          </button>
        </div>
        <button onClick={onToggle} className={cn("flex items-center gap-1", grid ? "justify-between w-full rounded-lg bg-muted/40 px-2 py-1.5" : "flex-wrap gap-x-4 gap-y-2 max-w-full")}>
          <Metric label="Faults" value={i.faults_total} />
          <Metric label="90 days" value={i.faults_90d} warn={i.faults_90d >= 3} />
          <Metric label="Open" value={i.open_faults} warn={i.open_faults > 0} />
          <Metric label="Avg repair" value={hours(i.avg_repair_h)} />
          <Metric label="Re-checks" value={recheckTotal ? `${i.rechecks_passed}✓ ${i.rechecks_failed}✗` : "-"} warn={i.rechecks_failed > 0} />
          {!grid && <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform hidden md:block", expanded && "rotate-180")} />}
        </button>
      </div>

      {expanded && (
        <div className={cn("border-t border-border p-4 grid gap-5 bg-muted/20", !grid && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fault history</div>
              <div className="text-[10px] text-muted-foreground">{i.faults.filter((f) => !isClosed(f.status)).length} open · {i.faults.length} shown</div>
            </div>
            {i.faults.length === 0 ? (
              <div className="text-[12px] text-muted-foreground px-2 py-3">No faults recorded.</div>
            ) : (
              <ol className="relative space-y-2 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {i.faults.map((f) => {
                  const closed = isClosed(f.status);
                  return (
                    <li key={f.id} className="relative pl-7">
                      <span className={cn("absolute left-1.5 top-2.5 w-3 h-3 rounded-full ring-4 ring-background flex items-center justify-center", closed ? "bg-emerald-500" : "bg-amber-500")} />
                      <button onClick={() => useAppStore.getState().selectTicket(f.id)}
                        className="w-full text-left rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/40 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="font-mono text-[10.5px] text-muted-foreground">{f.ticket_id}</span>
                          <Chip tone={closed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent"}>
                            {closed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}{f.status.replace(/_/g, " ")}
                          </Chip>
                          {f.priority && <Chip tone={cn("border-transparent", PRIORITY_TONE[f.priority.toLowerCase()] ?? "bg-muted text-muted-foreground")}>{f.priority}</Chip>}
                        </div>
                        <div className="text-[12.5px] leading-snug whitespace-pre-wrap break-words">{f.title}</div>
                        <div className="text-[10.5px] text-muted-foreground mt-1">
                          Reported {date(f.created_at)}{f.resolved_at ? ` · Resolved ${date(f.resolved_at)}` : ""}
                        </div>
                      </button>
                    </li>
                  );
                })}
                {i.faults_total > i.faults.length && <li className="text-[11px] text-muted-foreground pl-7">…and {i.faults_total - i.faults.length} earlier</li>}
              </ol>
            )}
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Details</div>
            <EditField label="Label" value={i.label} disabled={!canEdit} required onSave={(v) => onUpdate({ label: v })} />
            <label className="block">
              <div className="text-[10px] text-muted-foreground mb-1">Status</div>
              <select value={i.status} disabled={!canEdit} onChange={(e) => onUpdate({ status: e.target.value as Item["status"] })}
                className="h-8 w-full px-2 text-[12px] rounded-md border border-input bg-background disabled:opacity-60">
                {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <EditField label="Model" value={i.model} disabled={!canEdit} onSave={(v) => onUpdate({ model: v })} />
            <EditField label="Serial number" value={i.serial} disabled={!canEdit} onSave={(v) => onUpdate({ serial: v })} />
            <EditField label="Notes" value={i.notes} disabled={!canEdit} multiline onSave={(v) => onUpdate({ notes: v })} />
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3 h-3" /> Last fault {date(i.last_fault_at)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthBar({ items, className }: { items: Item[]; className?: string }) {
  const total = items.length || 1;
  const c = { replace: 0, open: 0, healthy: 0 } as Record<Health, number>;
  for (const i of items) c[health(i)]++;
  return (
    <div className={cn("flex rounded-full overflow-hidden bg-muted", className)} title={HEALTH_ORDER.map((h) => `${HEALTH[h].label}: ${c[h]}`).join(" · ")}>
      {HEALTH_ORDER.map((h) => c[h] ? <div key={h} className={HEALTH[h].bar} style={{ width: `${(c[h] / total) * 100}%` }} /> : null)}
    </div>
  );
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9.5px] font-semibold uppercase tracking-wide whitespace-nowrap", tone)}>{children}</span>;
}

function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; label: string; options: { v: T; l: string; icon?: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="flex p-0.5 rounded-lg bg-muted/60 border border-border" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} aria-pressed={value === o.v}
          className={cn("h-7 px-2.5 rounded-md text-[12px] flex items-center gap-1.5 transition-colors", value === o.v ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
          {o.icon && <o.icon className="w-3.5 h-3.5" />}{o.l}
        </button>
      ))}
    </div>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className="h-8 px-2 text-[12px] rounded-md border border-input bg-background">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function IconBtn({ title, onClick, active, flat, children }: { title: string; onClick: () => void; active?: boolean; flat?: boolean; children: React.ReactNode }) {
  return (
    <button title={title} aria-label={title} aria-pressed={active} onClick={onClick}
      className={cn("h-8 w-8 flex items-center justify-center transition-colors", flat ? "" : "rounded-md border border-border",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60")}>
      {children}
    </button>
  );
}

function Metric({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="text-right min-w-[52px]">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</div>
      <div className={cn("text-[13px] font-semibold tabular-nums", warn && "text-rose-600 dark:text-rose-400")}>{value}</div>
    </div>
  );
}

function EditField({ label, value, disabled, onSave, multiline, required }: {
  label: string; value: string | null; disabled: boolean; onSave: (v: string) => void; multiline?: boolean; required?: boolean;
}) {
  const [v, setV] = React.useState(value ?? "");
  const commit = () => {
    const t = v.trim();
    if (required && !t) { setV(value ?? ""); return; }
    if (t !== (value ?? "")) onSave(t);
  };
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      {multiline ? (
        <textarea value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} onBlur={commit} rows={3}
          className="w-full px-2.5 py-1.5 text-[12px] rounded-md border border-input bg-background resize-y disabled:opacity-60" />
      ) : (
        <Input value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} onBlur={commit} className="h-8 text-[12px]" />
      )}
    </label>
  );
}
