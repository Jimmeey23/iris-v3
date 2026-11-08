"use client";

import * as React from "react";
import { Radar as RadarIcon, MapPin, CheckCircle2 } from "lucide-react";
import { ALL_TICKETS, getAssignee, type Ticket } from "@/lib/iris/sample-tickets";
import { useAppStore } from "@/lib/iris/store";
import { PLANS, roomFor, roomState, type Plan, type RoomState } from "@/lib/iris/radar";
import { PriorityBadge, SLABadge, StatusBadge } from "../badges";
import { RelativeTime } from "../relative-time";
import { cn } from "@/lib/utils";

const PERIODS = [
  { id: "open", label: "Open now" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

const STATE: Record<RoomState, { label: string; box: string; dot: string }> = {
  breached: { label: "Past SLA", box: "border-rose-500/80 bg-rose-500/20", dot: "bg-rose-500" },
  urgent: { label: "P0–P1 open", box: "border-amber-500/80 bg-amber-500/15", dot: "bg-amber-500" },
  open: { label: "Open", box: "border-sky-500/70 bg-sky-500/10", dot: "bg-sky-500" },
  clear: { label: "Clear", box: "border-emerald-500/30 bg-emerald-500/[.04]", dot: "bg-emerald-500" },
};
const STUDIO_WIDE = "Studio-wide";

export function RadarView() {
  const { dataVersion, selectTicket, setCurrentView } = useAppStore();
  const [code, setCode] = React.useState(PLANS[0].code);
  const [period, setPeriod] = React.useState<PeriodId>("open");
  const [room, setRoom] = React.useState<string | null>(null);

  // Tickets per studio for the period — computed once per data change, not per hover.
  const byStudio = React.useMemo(() => {
    void dataVersion;
    const since = period === "open" ? null : Date.now() - Number(period) * 86400_000;
    const m = new Map<string, Ticket[]>();
    for (const t of ALL_TICKETS) {
      if (!t.studioCode || t.title.startsWith("[Recurrence check")) continue;
      const done = t.status === "resolved" || t.status === "closed";
      if (since === null ? done : new Date(t.createdAt).getTime() < since) continue;
      m.set(t.studioCode, [...(m.get(t.studioCode) ?? []), t]);
    }
    return m;
  }, [dataVersion, period]);

  const plan = PLANS.find((p) => p.code === code)!;
  const rooms = React.useMemo(() => {
    const m = new Map<string, Ticket[]>([...plan.rooms.map((r) => [r.name, []] as [string, Ticket[]]), [STUDIO_WIDE, []]]);
    for (const t of byStudio.get(plan.code) ?? []) {
      const k = roomFor(plan, t) ?? STUDIO_WIDE;
      m.get(k)!.push(t);
    }
    return m;
  }, [byStudio, plan]);

  const selected = room && rooms.has(room) ? room : null;
  const list = (selected ? rooms.get(selected)! : [...rooms.values()].flat()).slice().sort((a, b) => {
    const rank = (t: Ticket) => (t.slaStatus === "breached" ? 0 : t.priority === "P0" ? 1 : t.priority === "P1" ? 2 : 3);
    return rank(a) - rank(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const studioTotal = byStudio.get(plan.code)?.length ?? 0;
  const placed = studioTotal - (rooms.get(STUDIO_WIDE)?.length ?? 0);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <RadarIcon className="w-3 h-3 text-primary" /> Studio radar · live from tickets
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Radar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Where in each studio the work is — by room, from what the tickets say.</p>
        </div>
        <div className="flex items-center bg-muted/60 rounded-lg p-0.5" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.id} role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)}
              className={cn("px-3 h-7 rounded-md text-[12px] font-medium", period === p.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Studio">
        {PLANS.map((p) => {
          const n = byStudio.get(p.code)?.length ?? 0;
          const breached = (byStudio.get(p.code) ?? []).filter((t) => t.slaStatus === "breached" && t.status !== "resolved" && t.status !== "closed").length;
          return (
            <button key={p.code} role="tab" aria-selected={code === p.code} onClick={() => { setCode(p.code); setRoom(null); }}
              className={cn("flex items-center gap-2 h-9 px-3.5 rounded-xl border text-[12px] font-medium transition-colors",
                code === p.code ? "border-primary bg-primary/[.07] text-foreground" : "border-border text-muted-foreground hover:bg-muted/50")}>
              <MapPin className="w-3.5 h-3.5" />{p.label}
              <span className="tabular-nums text-[11px] text-muted-foreground">{n}</span>
              {breached > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title={`${breached} past SLA`} />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="iris-card-elevated p-3 sm:p-4">
          <FloorPlan plan={plan} rooms={rooms} selected={selected} onSelect={(r) => setRoom(r === selected ? null : r)} />
          <div className="mt-3 flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
            {(Object.keys(STATE) as RoomState[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", STATE[s].dot)} />{STATE[s].label}</span>
            ))}
            <span className="ml-auto">{placed} of {studioTotal} ticket{studioTotal === 1 ? "" : "s"} placed in a room</span>
          </div>
        </div>

        <aside className="iris-card-elevated overflow-hidden flex flex-col max-h-[78vh]">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">{plan.label}</div>
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-semibold">{selected ?? "All rooms"}</div>
              {selected && <button onClick={() => setRoom(null)} className="ml-auto text-[11px] text-primary hover:underline">Show all</button>}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{list.length} ticket{list.length === 1 ? "" : "s"} · {PERIODS.find((p) => p.id === period)!.label.toLowerCase()}</div>
          </div>
          <div className="px-3 py-2 border-b border-border flex gap-1.5 flex-wrap">
            {[...rooms.entries()].filter(([, l]) => l.length).map(([name, l]) => {
              const st = roomState(l);
              return (
                <button key={name} onClick={() => setRoom(name === selected ? null : name)}
                  className={cn("inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[10px]",
                    name === selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", STATE[st].dot)} />{name}<span className="tabular-nums text-muted-foreground">{l.length}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto iris-scrollbar divide-y divide-border">
            {list.length === 0 ? (
              <div className="py-14 text-center text-[12px] text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-2" />Nothing here for this period.
              </div>
            ) : (
              list.slice(0, 120).map((t) => (
                <button key={t.id} onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); }} className="w-full text-left px-4 py-2.5 hover:bg-muted/40">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="font-mono">{t.ticketId}</span><PriorityBadge priority={t.priority} />
                    {!selected && <span className="truncate">· {roomFor(plan, t) ?? STUDIO_WIDE}</span>}
                    <span className="ml-auto"><RelativeTime date={t.createdAt} /></span>
                  </div>
                  <div className="text-[12.5px] font-medium leading-snug line-clamp-2 mt-0.5">{t.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={t.status} /><SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} />
                    <span className="text-[10px] text-muted-foreground ml-auto truncate">{getAssignee(t)?.name ?? "Unassigned"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const FloorPlan = React.memo(function FloorPlan({ plan, rooms, selected, onSelect }: {
  plan: Plan; rooms: Map<string, Ticket[]>; selected: string | null; onSelect: (room: string) => void;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-muted/30" style={{ aspectRatio: `${plan.width} / ${plan.height}` }}>
      <img src={plan.src} alt={`${plan.label} floor plan`} width={plan.width} height={plan.height} decoding="async"
        className="absolute inset-0 w-full h-full object-contain select-none dark:invert-[.9] dark:hue-rotate-180 dark:opacity-80" draggable={false} />
      {plan.rooms.map((r) => {
        const list = rooms.get(r.name) ?? [];
        const st = roomState(list);
        const open = list.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
        const isSel = selected === r.name;
        return (
          <button key={r.name} onClick={() => onSelect(r.name)} aria-pressed={isSel} aria-label={`${r.name}: ${list.length} tickets, ${STATE[st].label}`}
            className={cn("absolute rounded-lg border-2 transition-[background-color,box-shadow] duration-200 group",
              STATE[st].box, isSel && "ring-4 ring-primary/40 border-primary", st === "breached" && "radar-pulse")}
            style={{ left: `${r.spot.x}%`, top: `${r.spot.y}%`, width: `${r.spot.w}%`, height: `${r.spot.h}%` }}>
            <span className="absolute left-1.5 top-1.5 right-1.5 flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur text-[10px] font-semibold leading-none truncate shadow-sm">{r.name}</span>
            </span>
            {list.length > 0 && (
              <span className={cn("absolute right-1.5 bottom-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold tabular-nums text-white flex items-center justify-center shadow", STATE[st].dot)}>
                {open || list.length}
              </span>
            )}
          </button>
        );
      })}
      <style>{`
        @keyframes radar-pulse-kf { 0%,100% { box-shadow: 0 0 0 0 rgba(244,63,94,.45); } 50% { box-shadow: 0 0 0 8px rgba(244,63,94,0); } }
        .radar-pulse { animation: radar-pulse-kf 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .radar-pulse { animation: none; } }
      `}</style>
    </div>
  );
});
