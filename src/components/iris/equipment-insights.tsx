"use client";

import * as React from "react";
import { AirVent, Bike, Mic, Speaker } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Infographic overview for the Equipment page: fleet health donut, faults by studio
 * (stacked by type), 12-month fault trend and the repeat offenders.
 *
 * Colour jobs: equipment type = categorical (fixed order blue, orange, aqua, yellow);
 * health = status (good / warning / critical, always with a label); fault counts on
 * the floor plan = sequential blue. Text never takes a series colour.
 */

export type InsightItem = {
  id: string;
  studio_code: string;
  studio_name: string;
  kind: "bike" | "mic" | "audio" | "ac";
  number: number | null;
  location: string | null;
  label: string;
  faults_total: number;
  faults_90d: number;
  open_faults: number;
  replace_candidate: boolean;
};
export type MonthlyRow = { month: string; kind: string; n: number };

export const KIND_ORDER = ["bike", "mic", "audio", "ac"] as const;
export const KIND_VIZ: Record<(typeof KIND_ORDER)[number], { label: string; icon: typeof Bike; bg: string; fill: string }> = {
  bike: { label: "Bikes", icon: Bike, bg: "bg-[#2a78d6] dark:bg-[#3987e5]", fill: "fill-[#2a78d6] dark:fill-[#3987e5]" },
  mic: { label: "Mics", icon: Mic, bg: "bg-[#eb6834] dark:bg-[#d95926]", fill: "fill-[#eb6834] dark:fill-[#d95926]" },
  audio: { label: "Speakers", icon: Speaker, bg: "bg-[#1baf7a] dark:bg-[#199e70]", fill: "fill-[#1baf7a] dark:fill-[#199e70]" },
  ac: { label: "AC", icon: AirVent, bg: "bg-[#eda100] dark:bg-[#c98500]", fill: "fill-[#eda100] dark:fill-[#c98500]" },
};

type Health = "replace" | "open" | "healthy";
const STATUS: Record<Health, { label: string; stroke: string; dot: string }> = {
  replace: { label: "Replace candidate", stroke: "stroke-rose-500", dot: "bg-rose-500" },
  open: { label: "Open fault", stroke: "stroke-amber-500", dot: "bg-amber-500" },
  healthy: { label: "Healthy", stroke: "stroke-emerald-500", dot: "bg-emerald-500" },
};
const healthOf = (i: InsightItem): Health => (i.replace_candidate ? "replace" : i.open_faults ? "open" : "healthy");

/** Sequential blue ramp (light → dark) for fault counts on the floor plan. */
const HEAT = [
  "bg-[#cde2fb] text-[#104281]",
  "bg-[#9ec5f4] text-[#0d366b]",
  "bg-[#6da7ec] text-white",
  "bg-[#3987e5] text-white",
  "bg-[#256abf] text-white",
  "bg-[#184f95] text-white",
];
export const heatClass = (faults: number, max: number) =>
  faults === 0 ? "bg-muted text-muted-foreground" : HEAT[Math.min(HEAT.length - 1, Math.floor(((faults - 1) / Math.max(1, max - 1)) * (HEAT.length - 1)))];

function Card({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("iris-card-elevated p-4 flex flex-col min-w-0", className)}>
      <div className="mb-3">
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: Array<{ label: string; swatch: string; value?: number }> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((x) => (
        <span key={x.label} className="inline-flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-sm", x.swatch)} />
          {x.label}
          {x.value !== undefined && <b className="text-foreground tabular-nums font-semibold">{x.value}</b>}
        </span>
      ))}
    </div>
  );
}

/* ── Fleet health donut ─────────────────────────────────────────────────────── */
function HealthDonut({ items, active, onPick }: { items: InsightItem[]; active: Set<Health>; onPick: (h: Health) => void }) {
  const counts: Record<Health, number> = { replace: 0, open: 0, healthy: 0 };
  for (const i of items) counts[healthOf(i)]++;
  const total = items.length || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  const GAP = 2.5; // surface gap between segments
  let offset = 0;
  const order: Health[] = ["replace", "open", "healthy"];
  const healthyPct = Math.round((counts.healthy / total) * 100);
  return (
    <Card title="Fleet health" sub={`${items.length} tracked units`}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 110 110" className="w-[120px] h-[120px] shrink-0 -rotate-90" role="img" aria-label={`Fleet health: ${order.map((h) => `${STATUS[h].label} ${counts[h]}`).join(", ")}`}>
          <circle cx="55" cy="55" r={R} className="stroke-muted" strokeWidth="12" fill="none" />
          {order.map((h) => {
            const len = (counts[h] / total) * C;
            if (!counts[h]) return null;
            const seg = (
              <circle key={h} cx="55" cy="55" r={R} fill="none" strokeWidth={active.has(h) ? 15 : 12}
                className={cn(STATUS[h].stroke, "cursor-pointer transition-all hover:opacity-80")}
                strokeDasharray={`${Math.max(0, len - GAP)} ${C}`} strokeDashoffset={-offset}
                onClick={() => onPick(h)}>
                <title>{`${STATUS[h].label}: ${counts[h]} (${Math.round((counts[h] / total) * 100)}%)`}</title>
              </circle>
            );
            offset += len;
            return seg;
          })}
          <g className="rotate-90 origin-center">
            <text x="55" y="53" textAnchor="middle" className="fill-foreground text-[20px] font-bold">{healthyPct}%</text>
            <text x="55" y="68" textAnchor="middle" className="fill-muted-foreground text-[9px]">healthy</text>
          </g>
        </svg>
        <div className="space-y-2 min-w-0">
          {order.map((h) => (
            <button key={h} onClick={() => onPick(h)}
              className={cn("w-full flex items-center gap-2 text-left text-[12px] rounded-md px-1.5 py-1 hover:bg-muted/60", active.has(h) && "bg-muted")}>
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", STATUS[h].dot)} />
              <span className="text-muted-foreground flex-1 truncate">{STATUS[h].label}</span>
              <b className="tabular-nums">{counts[h]}</b>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ── Faults by studio, stacked by type ──────────────────────────────────────── */
function StudioBars({ items }: { items: InsightItem[] }) {
  const studios = [...new Map(items.map((i) => [i.studio_code, i.studio_name])).entries()].map(([code, name]) => {
    const by = Object.fromEntries(KIND_ORDER.map((k) => [k, items.filter((i) => i.studio_code === code && i.kind === k).reduce((n, i) => n + i.faults_total, 0)])) as Record<(typeof KIND_ORDER)[number], number>;
    return { code, name: name.split(",")[0], by, total: Object.values(by).reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...studios.map((s) => s.total));
  const present = KIND_ORDER.filter((k) => studios.some((s) => s.by[k]));
  return (
    <Card title="Faults by studio" sub="All-time, split by equipment type">
      <div className="space-y-3 flex-1">
        {studios.map((s) => (
          <div key={s.code}>
            <div className="flex items-baseline justify-between text-[12px] mb-1">
              <span className="font-medium truncate">{s.name}</span>
              <span className="tabular-nums text-muted-foreground"><b className="text-foreground">{s.total}</b> faults</span>
            </div>
            <div className="h-3 flex gap-[2px]" style={{ width: `${(s.total / max) * 100}%` }}>
              {present.map((k) => s.by[k] ? (
                <div key={k} className={cn("h-full first:rounded-l-[4px] last:rounded-r-[4px] hover:opacity-80", KIND_VIZ[k].bg)}
                  style={{ flexGrow: s.by[k] }} title={`${s.name} · ${KIND_VIZ[k].label}: ${s.by[k]}`} />
              ) : null)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3"><Legend items={present.map((k) => ({ label: KIND_VIZ[k].label, swatch: KIND_VIZ[k].bg }))} /></div>
    </Card>
  );
}

/* ── 12-month trend ──────────────────────────────────────────────────────────── */
function Trend({ monthly }: { monthly: MonthlyRow[] }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const months = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, n) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + n, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rows = monthly.filter((r) => r.month === key);
      const by = Object.fromEntries(KIND_ORDER.map((k) => [k, rows.find((r) => r.kind === k)?.n ?? 0])) as Record<(typeof KIND_ORDER)[number], number>;
      return { key, label: d.toLocaleDateString("en-IN", { month: "short" }), by, total: Object.values(by).reduce((a, b) => a + b, 0) };
    });
  }, [monthly]);
  const max = Math.max(1, ...months.map((m) => m.total));
  const last3 = months.slice(-3).reduce((n, m) => n + m.total, 0);
  const prev3 = months.slice(-6, -3).reduce((n, m) => n + m.total, 0);
  const delta = prev3 ? Math.round(((last3 - prev3) / prev3) * 100) : null;
  const present = KIND_ORDER.filter((k) => months.some((m) => m.by[k]));
  const h = hover !== null ? months[hover] : null;
  return (
    <Card title="Faults over 12 months"
      sub={delta === null ? "Monthly fault tickets" : `Last 3 months ${last3} vs ${prev3} before (${delta > 0 ? "+" : ""}${delta}%)`}
      className="lg:col-span-2">
      <div className="relative flex-1 min-h-[150px]">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[max, Math.round(max / 2), 0].map((v, n) => (
            <div key={n} className="flex items-center gap-2">
              <span className="w-5 text-right text-[9.5px] tabular-nums text-muted-foreground">{v}</span>
              <div className="flex-1 border-t border-border/60" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 pl-7 flex items-end gap-1.5" onMouseLeave={() => setHover(null)}>
          {months.map((m, n) => (
            <div key={m.key} className="flex-1 h-full flex flex-col justify-end items-stretch cursor-default" onMouseEnter={() => setHover(n)}>
              <div className={cn("flex flex-col-reverse gap-[2px] transition-opacity", hover !== null && hover !== n && "opacity-50")}
                style={{ height: `${(m.total / max) * 100}%` }}>
                {present.map((k) => m.by[k] ? (
                  <div key={k} className={cn("w-full last:rounded-t-[4px]", KIND_VIZ[k].bg)} style={{ flexGrow: m.by[k] }} />
                ) : null)}
              </div>
            </div>
          ))}
        </div>
        {h && (
          <div className="absolute top-0 right-0 iris-card-elevated px-2.5 py-1.5 text-[11px] space-y-0.5 pointer-events-none z-10">
            <div className="font-semibold">{h.label} · {h.total} faults</div>
            {present.filter((k) => h.by[k]).map((k) => (
              <div key={k} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-sm", KIND_VIZ[k].bg)} />{KIND_VIZ[k].label}<b className="ml-auto pl-3 text-foreground tabular-nums">{h.by[k]}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pl-7 flex gap-1.5 mt-1">
        {months.map((m) => <div key={m.key} className="flex-1 text-center text-[9.5px] text-muted-foreground">{m.label}</div>)}
      </div>
      <div className="mt-2"><Legend items={present.map((k) => ({ label: KIND_VIZ[k].label, swatch: KIND_VIZ[k].bg }))} /></div>
    </Card>
  );
}

/* ── Repeat offenders ────────────────────────────────────────────────────────── */
function Offenders({ items, onOpen }: { items: InsightItem[]; onOpen: (id: string) => void }) {
  const top = items
    .filter((i) => i.number !== null || i.location || i.kind === "ac")
    .sort((a, b) => b.faults_90d - a.faults_90d || b.faults_total - a.faults_total)
    .slice(0, 6);
  const max = Math.max(1, ...top.map((i) => i.faults_total));
  return (
    <Card title="Repeat offenders" sub="Identified units with the most faults">
      <div className="space-y-2.5">
        {top.map((i, n) => {
          const K = KIND_VIZ[i.kind];
          const h = healthOf(i);
          return (
            <button key={i.id} onClick={() => onOpen(i.id)} className="w-full text-left group">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-4 text-[10.5px] tabular-nums text-muted-foreground">{n + 1}</span>
                <K.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate group-hover:text-primary">{i.label}</span>
                <span className="text-[10.5px] text-muted-foreground truncate">{i.studio_name.split(",")[0]}</span>
                {h !== "healthy" && <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS[h].dot)} title={STATUS[h].label} />}
                <b className="ml-auto tabular-nums">{i.faults_total}</b>
              </div>
              <div className="ml-6 mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", K.bg)} style={{ width: `${(i.faults_total / max) * 100}%` }} />
              </div>
            </button>
          );
        })}
        {!top.length && <div className="text-[12px] text-muted-foreground">No identified units yet.</div>}
      </div>
    </Card>
  );
}

export function EquipmentInsights({ items, monthly, healthFilter, onHealth, onOpen }: {
  items: InsightItem[];
  monthly: MonthlyRow[];
  healthFilter: Set<Health>;
  onHealth: (h: Health) => void;
  onOpen: (id: string) => void;
}) {
  const faults = items.reduce((n, i) => n + i.faults_total, 0);
  const f90 = items.reduce((n, i) => n + i.faults_90d, 0);
  const open = items.reduce((n, i) => n + i.open_faults, 0);
  const identified = items.filter((i) => i.number !== null || i.location || i.kind === "ac").reduce((n, i) => n + i.faults_total, 0);
  const pct = faults ? Math.round((identified / faults) * 100) : 0;
  const hero = [
    { label: "Open faults", value: open, note: open ? "need fixing now" : "nothing broken" },
    { label: "Faults · 90 days", value: f90, note: `${faults} all-time` },
    { label: "Replace candidates", value: items.filter((i) => i.replace_candidate).length, note: "3+ faults in 90d or 2 failed re-checks" },
    { label: "Unit identified", value: `${pct}%`, note: `${faults - identified} faults don't name the unit` },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {hero.map((h) => (
          <div key={h.label} className="iris-card-elevated px-4 py-3">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">{h.label}</div>
            <div className="text-[28px] font-bold tabular-nums leading-tight">{h.value}</div>
            <div className="text-[11px] text-muted-foreground">{h.note}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <HealthDonut items={items} active={healthFilter} onPick={onHealth} />
        <Trend monthly={monthly} />
        <StudioBars items={items} />
        <Offenders items={items} onOpen={onOpen} />
        <TypeMix items={items} />
      </div>
    </div>
  );
}

/* ── Type mix: units vs faults per type ──────────────────────────────────────── */
function TypeMix({ items }: { items: InsightItem[] }) {
  const rows = KIND_ORDER.map((k) => ({
    k,
    units: items.filter((i) => i.kind === k).length,
    faults: items.filter((i) => i.kind === k).reduce((n, i) => n + i.faults_total, 0),
  })).filter((r) => r.units);
  const maxF = Math.max(1, ...rows.map((r) => r.faults));
  return (
    <Card title="By equipment type" sub="Tracked units and their faults">
      <div className="grid grid-cols-2 gap-2.5">
        {rows.map((r) => {
          const K = KIND_VIZ[r.k];
          return (
            <div key={r.k} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white", K.bg)}><K.icon className="w-3.5 h-3.5" /></span>
                <span className="text-[12px] font-medium">{K.label}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold tabular-nums leading-none">{r.faults}</span>
                <span className="text-[10.5px] text-muted-foreground">faults · {r.units} unit{r.units === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", K.bg)} style={{ width: `${(r.faults / maxF) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
