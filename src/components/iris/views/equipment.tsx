"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AirVent, AlertTriangle, Bike, ChevronDown, Loader2, Mic, RefreshCw, Search, ShieldCheck, Wrench, XCircle, CheckCircle2, HelpCircle,
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
  kind: "bike" | "mic" | "ac";
  number: number | null;
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

const KIND = {
  bike: { label: "Bikes", icon: Bike },
  mic: { label: "Microphones", icon: Mic },
  ac: { label: "AC", icon: AirVent },
} as const;

const STATUS = {
  in_service: "In service",
  out_of_service: "Out of service",
  retired: "Retired",
} as const;

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
const hours = (h: number | null) => (h === null ? "-" : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

export function EquipmentView() {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<"all" | Item["kind"]>("all");
  const [studio, setStudio] = React.useState("all");
  const [onlyRisk, setOnlyRisk] = React.useState(false);
  const [open, setOpen] = React.useState<string | null>(null);

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
  const q = query.trim().toLowerCase();
  const shown = items
    .filter((i) => kind === "all" || i.kind === kind)
    .filter((i) => studio === "all" || i.studio_code === studio)
    .filter((i) => !onlyRisk || i.replace_candidate)
    .filter((i) => !q || `${i.label} ${i.studio_name} ${i.model ?? ""} ${i.serial ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.replace_candidate) - Number(a.replace_candidate) || b.open_faults - a.open_faults || b.faults_90d - a.faults_90d || b.faults_total - a.faults_total);

  const numberedFaults = items.filter((i) => i.number !== null || i.kind === "ac").reduce((n, i) => n + i.faults_total, 0);
  const unnumbered = items.filter((i) => i.number === null && i.kind !== "ac").reduce((n, i) => n + i.faults_total, 0);
  const stats = [
    { label: "Tracked items", value: items.length, tone: "text-foreground" },
    { label: "Open faults", value: items.reduce((n, i) => n + i.open_faults, 0), tone: "text-amber-600 dark:text-amber-400" },
    { label: "Replace candidates", value: items.filter((i) => i.replace_candidate).length, tone: "text-rose-600 dark:text-rose-400" },
    { label: "Faults · 90 days", value: items.reduce((n, i) => n + i.faults_90d, 0), tone: "text-foreground" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Wrench className="w-3 h-3 text-violet-500" /> Studio equipment · Live from repair tickets
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Equipment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Every bike, microphone and AC system, its fault history and re-check results - so repeat failures get replaced, not patched again.</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="iris-card-elevated p-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className={cn("text-lg font-bold tabular-nums", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>

      {unnumbered > 0 && (
        <div className="iris-card p-3 flex items-start gap-2.5 border border-sky-500/30">
          <HelpCircle className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
          <div className="text-[12px]">
            <span className="font-semibold">{unnumbered} of {unnumbered + numberedFaults} faults didn't say which bike or mic.</span>{" "}
            <span className="text-muted-foreground">They're grouped under “unnumbered” per studio, so repeat failures on one unit stay hidden. Ask teams to include the number (e.g. “Bike 7”) - IRIS picks it up automatically.</span>
          </div>
        </div>
      )}

      <div className="iris-card-elevated p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search label, model, serial" aria-label="Search equipment" className="h-8 pl-8 text-[12px]" />
        </div>
        <div className="flex gap-1" role="group" aria-label="Equipment type">
          {(["all", "bike", "mic", "ac"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
              className={cn("h-8 px-3 rounded-md text-[12px] border transition-colors", kind === k ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted/60")}>
              {k === "all" ? "All" : KIND[k].label}
            </button>
          ))}
        </div>
        <select value={studio} onChange={(e) => setStudio(e.target.value)} aria-label="Studio"
          className="h-8 px-2 text-[12px] rounded-md border border-input bg-background">
          <option value="all">All studios</option>
          {studios.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground ml-auto cursor-pointer">
          <input type="checkbox" checked={onlyRisk} onChange={(e) => setOnlyRisk(e.target.checked)} className="accent-[var(--primary)]" />
          Replace candidates only
        </label>
      </div>

      <div className="space-y-2">
        {shown.map((i) => {
          const Icon = KIND[i.kind].icon;
          const expanded = open === i.id;
          return (
            <div key={i.id} className={cn("iris-card-elevated overflow-hidden", i.status === "retired" && "opacity-60")}>
              <button onClick={() => setOpen(expanded ? null : i.id)} aria-expanded={expanded} className="w-full text-left p-3.5 flex items-center gap-3 flex-wrap">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  i.replace_candidate ? "bg-rose-500/10 text-rose-500" : i.open_faults ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{i.label}</span>
                    {i.replace_candidate && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400">Replace candidate</span>}
                    {i.status !== "in_service" && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-muted text-muted-foreground">{STATUS[i.status]}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{i.studio_name}{i.model ? ` · ${i.model}` : ""}</div>
                </div>
                <Metric label="Faults" value={i.faults_total} />
                <Metric label="90 days" value={i.faults_90d} warn={i.faults_90d >= 3} />
                <Metric label="Open" value={i.open_faults} warn={i.open_faults > 0} />
                <Metric label="Avg repair" value={hours(i.avg_repair_h)} />
                <Metric label="Re-checks" value={i.rechecks_passed + i.rechecks_failed ? `${i.rechecks_passed}✓ ${i.rechecks_failed}✗` : "-"} warn={i.rechecks_failed > 0} />
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </button>

              {expanded && (
                <div className="border-t border-border p-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Fault history</div>
                    <ol className="space-y-1.5">
                      {i.faults.map((f) => (
                        <li key={f.id}>
                          <button onClick={() => useAppStore.getState().selectTicket(f.id)} className="w-full text-left flex items-center gap-2 text-[12px] rounded-md px-2 py-1.5 hover:bg-muted/60">
                            {["resolved", "closed"].includes(f.status) ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            <span className="font-mono text-[10px] text-muted-foreground">{f.ticket_id}</span>
                            <span className="truncate flex-1">{f.title}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{date(f.created_at)}</span>
                          </button>
                        </li>
                      ))}
                      {i.faults_total > i.faults.length && <li className="text-[11px] text-muted-foreground px-2">…and {i.faults_total - i.faults.length} earlier</li>}
                    </ol>
                  </div>
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Details</div>
                    <label className="block">
                      <div className="text-[10px] text-muted-foreground mb-1">Status</div>
                      <select value={i.status} disabled={!canEdit} onChange={(e) => update(i.id, { status: e.target.value as Item["status"] })}
                        className="h-8 w-full px-2 text-[12px] rounded-md border border-input bg-background disabled:opacity-60">
                        {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                    <EditField label="Model" value={i.model} disabled={!canEdit} onSave={(v) => update(i.id, { model: v })} />
                    <EditField label="Serial number" value={i.serial} disabled={!canEdit} onSave={(v) => update(i.id, { serial: v })} />
                    <EditField label="Notes" value={i.notes} disabled={!canEdit} onSave={(v) => update(i.id, { notes: v })} />
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="w-3 h-3" /> Last fault {date(i.last_fault_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!shown.length && <div className="text-center py-16 text-[13px] text-muted-foreground">No equipment matches.</div>}
      </div>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="text-right min-w-[56px]">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-[13px] font-semibold tabular-nums", warn && "text-rose-600 dark:text-rose-400")}>{value}</div>
    </div>
  );
}

function EditField({ label, value, disabled, onSave }: { label: string; value: string | null; disabled: boolean; onSave: (v: string) => void }) {
  const [v, setV] = React.useState(value ?? "");
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <Input value={v} disabled={disabled} onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() !== (value ?? "") && onSave(v.trim())} className="h-8 text-[12px]" />
    </label>
  );
}
