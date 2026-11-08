"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, isMine, getAssignee, getStudio, getDepartment, Ticket } from "@/lib/iris/sample-tickets";
import { STUDIOS, DEPARTMENTS, EMPLOYEES, EMPLOYEE_MAP, Priority } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge, StudioBadge } from "../badges";
import { formatRelativeTime, getInitials, getAvatarColor } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Search, SlidersHorizontal, ArrowUpDown, X, CheckSquare, Square, ChevronRight, Layers, Rows3, Rows4, LayoutGrid,
  Columns3, Users, CalendarDays, PanelRight, User, UserX, Flame, AlertTriangle, Siren, Sun, Hourglass, TrendingUp,
} from "lucide-react";
import { TicketWorkspace } from "./ticket-workspace";
import { SmartBadges } from "../smart-badges";
import { SmartBulkActions } from "../smart-bulk-actions";

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

const VIEWS = [
  { id: "table", label: "Table", icon: Rows3 },
  { id: "compact", label: "Compact", icon: Rows4 },
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "board", label: "Board", icon: Columns3 },
  { id: "owners", label: "Owners", icon: Users },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "split", label: "Split", icon: PanelRight },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const GROUPS = {
  none: "No grouping",
  status: "Status",
  priority: "Priority",
  studio: "Studio",
  department: "Department",
  owner: "Owner",
  category: "Category",
  sla: "SLA",
  age: "Age",
} as const;
type GroupKey = keyof typeof GROUPS;

const SORTS = { created: "Newest", updated: "Last updated", priority: "Priority", sla: "SLA risk", age: "Oldest first", title: "Title A–Z" } as const;
type SortKey = keyof typeof SORTS;

type Scope = "open" | "all" | "done";
const DONE = new Set(["resolved", "closed"]);
const isOpen = (t: Ticket) => !DONE.has(t.status);

const QUICK = [
  { id: "mine", label: "Mine", icon: User, test: (t: Ticket, me: string) => isMine(t, me) },
  { id: "unassigned", label: "Unassigned", icon: UserX, test: (t: Ticket) => !t.assigneeId },
  { id: "breached", label: "Breached", icon: Siren, test: (t: Ticket) => t.slaStatus === "breached" },
  { id: "at_risk", label: "At risk", icon: AlertTriangle, test: (t: Ticket) => t.slaStatus === "at_risk" },
  { id: "urgent", label: "P0–P1", icon: Flame, test: (t: Ticket) => t.priority === "P0" || t.priority === "P1" },
  { id: "today", label: "Today", icon: Sun, test: (t: Ticket) => new Date(t.createdAt).toDateString() === new Date().toDateString() },
  { id: "stale", label: "Stale 3d+", icon: Hourglass, test: (t: Ticket) => isOpen(t) && Date.now() - new Date(t.updatedAt).getTime() > 3 * 86400_000 },
  { id: "escalated", label: "Escalated", icon: TrendingUp, test: (t: Ticket) => t.status === "escalated" || (t.escalationLevel ?? 0) > 0 },
] as const;
type QuickId = (typeof QUICK)[number]["id"];

const STATUS_ORDER = ["open", "in_progress", "awaiting_response", "escalated", "resolved", "closed"];
const STATUS_LABEL: Record<string, string> = {
  open: "Open", in_progress: "In progress", awaiting_response: "Awaiting response", escalated: "Escalated", resolved: "Resolved", closed: "Closed",
};
const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const SLA_RANK: Record<string, number> = { breached: 0, at_risk: 1, on_track: 2, paused: 3 };
const SLA_LABEL: Record<string, string> = { breached: "Breached", at_risk: "At risk", on_track: "On track", paused: "Paused" };

function ageBucket(t: Ticket) {
  const d = (Date.now() - new Date(t.createdAt).getTime()) / 86400_000;
  return d < 1 ? "0 · Today" : d < 3 ? "1 · 1–3 days" : d < 7 ? "2 · 3–7 days" : d < 30 ? "3 · 1–4 weeks" : "4 · Over a month";
}

function groupValue(t: Ticket, g: GroupKey): string {
  switch (g) {
    case "status": return t.status;
    case "priority": return t.priority;
    case "studio": return getStudio(t)?.name ?? "No studio";
    case "department": return getDepartment(t)?.name ?? "No department";
    case "owner": return getAssignee(t)?.name ?? "Unassigned";
    case "category": return t.category || "Uncategorised";
    case "sla": return t.slaStatus;
    case "age": return ageBucket(t);
    default: return "";
  }
}
function groupLabel(v: string, g: GroupKey) {
  if (g === "status") return STATUS_LABEL[v] ?? v;
  if (g === "sla") return SLA_LABEL[v] ?? v;
  if (g === "age") return v.slice(4);
  return v;
}
function groupOrder(a: string, b: string, g: GroupKey) {
  if (g === "status") return STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b);
  if (g === "priority") return a.localeCompare(b);
  if (g === "sla") return (SLA_RANK[a] ?? 9) - (SLA_RANK[b] ?? 9);
  if (g === "age") return a.localeCompare(b);
  return a.localeCompare(b);
}

function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = React.useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = React.useCallback((next: T) => {
    setV(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
  }, [key]);
  return [v, set];
}

// ─────────────────────────────────────────────────────────────────────────────
// View
// ─────────────────────────────────────────────────────────────────────────────

export function AllTicketsView({ filterMode = "all" }: { filterMode?: "all" | "my" | "department" | "escalations" }) {
  const { selectedTicketId, selectTicket, ticketFilters, setTicketFilter, resetTicketFilters, currentUser, dataVersion } = useAppStore();
  const [view, setView] = usePersisted<ViewId>("iris.tickets.view", "table");
  const [sortBy, setSortBy] = usePersisted<SortKey>("iris.tickets.sort", "created");
  const [group1, setGroup1] = usePersisted<GroupKey>("iris.tickets.group1", "none");
  const [group2, setGroup2] = usePersisted<GroupKey>("iris.tickets.group2", "none");
  const [scope, setScope] = usePersisted<Scope>("iris.tickets.scope", "open");
  const [quick, setQuick] = React.useState<Set<QuickId>>(new Set());
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [preview, setPreview] = React.useState<string | null>(null);

  const toggleQuick = (id: QuickId) => {
    const next = new Set(quick);
    if (next.has(id)) next.delete(id); else next.add(id);
    setQuick(next);
  };

  const myDepartment = currentUser.departmentCode || EMPLOYEE_MAP[currentUser.id]?.departmentCode || null;
  const base = React.useMemo(() => {
    let r = [...ALL_TICKETS];
    if (filterMode === "my") r = r.filter((t) => isMine(t, currentUser.id));
    else if (filterMode === "escalations") r = r.filter((t) => t.status === "escalated" || t.slaStatus === "breached" || t.slaStatus === "at_risk");
    else if (filterMode === "department") {
      // Every ticket routed to the signed-in user's department, or owned by anyone in it.
      const dept = myDepartment;
      if (!dept) return [];
      const members = new Set(EMPLOYEES.filter((e) => e.departmentCode === dept).map((e) => e.id));
      r = r.filter((t) => {
        const depts = t.departmentCodes?.length ? t.departmentCodes : t.departmentCode ? [t.departmentCode] : [];
        if (depts.includes(dept)) return true;
        const owners = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
        return owners.some((o) => members.has(o));
      });
    }
    return r;
    // dataVersion: ALL_TICKETS changes in place
  }, [filterMode, currentUser.id, myDepartment, dataVersion]);

  const counts = React.useMemo(() => ({
    open: base.filter(isOpen).length,
    all: base.length,
    done: base.filter((t) => !isOpen(t)).length,
  }), [base]);

  const tickets = React.useMemo(() => {
    let r = base;
    // An explicit status filter overrides the Open/All/Resolved scope.
    if (!ticketFilters.status.length) r = scope === "open" ? r.filter(isOpen) : scope === "done" ? r.filter((t) => !isOpen(t)) : r;
    for (const id of quick) {
      const q = QUICK.find((x) => x.id === id)!;
      r = r.filter((t) => q.test(t, currentUser.id));
    }
    if (ticketFilters.search) {
      const q = ticketFilters.search.toLowerCase();
      r = r.filter((t) => [t.title, t.ticketId, t.description, t.affectedClient, t.category, t.subcategory].some((v) => v?.toLowerCase().includes(q)));
    }
    if (ticketFilters.priority.length) r = r.filter((t) => ticketFilters.priority.includes(t.priority));
    if (ticketFilters.status.length) r = r.filter((t) => ticketFilters.status.includes(t.status));
    if (ticketFilters.studio.length) r = r.filter((t) => t.studioCode && ticketFilters.studio.includes(t.studioCode));
    if (ticketFilters.department.length) {
      r = r.filter((t) => (t.departmentCodes?.length ? t.departmentCodes : t.departmentCode ? [t.departmentCode] : []).some((c) => ticketFilters.department.includes(c)));
    }
    if (ticketFilters.slaStatus.length) r = r.filter((t) => ticketFilters.slaStatus.includes(t.slaStatus));
    const s = [...r];
    const time = (d: string | Date) => new Date(d).getTime();
    if (sortBy === "created") s.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    else if (sortBy === "updated") s.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
    else if (sortBy === "priority") s.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || time(b.createdAt) - time(a.createdAt));
    else if (sortBy === "sla") s.sort((a, b) => (SLA_RANK[a.slaStatus] ?? 9) - (SLA_RANK[b.slaStatus] ?? 9) || time(a.slaResolutionTarget ?? a.createdAt) - time(b.slaResolutionTarget ?? b.createdAt));
    else if (sortBy === "age") s.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    else s.sort((a, b) => a.title.localeCompare(b.title));
    return s;
  }, [base, scope, quick, ticketFilters, sortBy, currentUser.id]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleAll = () => setSelectedIds(selectedIds.size === tickets.length ? new Set() : new Set(tickets.map((t) => t.id)));

  const selectedTicket = selectedTicketId ? ALL_TICKETS.find((t) => t.id === selectedTicketId) : null;
  if (selectedTicket) return <TicketWorkspace ticket={selectedTicket} />;

  const titles: Record<string, string> = { all: "All Tickets", my: "My Tickets", department: myDepartment ? `${DEPARTMENTS.find((d) => d.code === myDepartment)?.name ?? myDepartment} Queue` : "Department Queue", escalations: "Escalations & SLA Risks" };
  const filtersActive = quick.size > 0 || ticketFilters.priority.length + ticketFilters.status.length + ticketFilters.studio.length + ticketFilters.department.length + ticketFilters.slaStatus.length > 0 || Boolean(ticketFilters.search);
  const breached = tickets.filter((t) => t.slaStatus === "breached").length;
  const unassigned = tickets.filter((t) => !t.assigneeId).length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{titles[filterMode]}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground">{tickets.length}</span> shown
            {breached > 0 && <> · <span className="text-rose-600 dark:text-rose-400">{breached} breached</span></>}
            {unassigned > 0 && <> · <span className="text-amber-600 dark:text-amber-400">{unassigned} unassigned</span></>}
          </p>
        </div>
        <div className="flex items-center bg-muted/60 rounded-lg p-0.5" role="tablist" aria-label="Ticket scope">
          {(["open", "all", "done"] as Scope[]).map((s) => (
            <button key={s} role="tab" aria-selected={scope === s} onClick={() => setScope(s)}
              className={cn("px-3 h-7 rounded-md text-[12px] font-medium transition-colors", scope === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {s === "open" ? "Open" : s === "all" ? "All" : "Resolved"}
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="iris-card-elevated p-2.5 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search title, ID, member, category…" value={ticketFilters.search}
              onChange={(e) => setTicketFilter("search", e.target.value)} className="h-8 pl-8 text-[12px]" aria-label="Search tickets" />
          </div>
          <FilterPopover label="Priority" options={["P0", "P1", "P2", "P3"]} selected={ticketFilters.priority} onChange={(v) => setTicketFilter("priority", v)} />
          <FilterPopover label="Status" options={STATUS_ORDER} optionLabels={STATUS_LABEL} selected={ticketFilters.status} onChange={(v) => setTicketFilter("status", v)} />
          <FilterPopover label="Studio" options={STUDIOS.map((s) => s.code)} optionLabels={Object.fromEntries(STUDIOS.map((s) => [s.code, s.name]))} selected={ticketFilters.studio} onChange={(v) => setTicketFilter("studio", v)} />
          <FilterPopover label="Department" options={DEPARTMENTS.map((d) => d.code)} optionLabels={Object.fromEntries(DEPARTMENTS.map((d) => [d.code, d.name]))} selected={ticketFilters.department} onChange={(v) => setTicketFilter("department", v)} />
          <FilterPopover label="SLA" options={["on_track", "at_risk", "breached", "paused"]} optionLabels={SLA_LABEL} selected={ticketFilters.slaStatus} onChange={(v) => setTicketFilter("slaStatus", v)} />
          <div className="ml-auto flex items-center gap-1.5">
            <MiniSelect icon={ArrowUpDown} label="Sort" value={sortBy} onChange={(v) => setSortBy(v as SortKey)} options={SORTS} />
            <MiniSelect icon={Layers} label="Group" value={group1} onChange={(v) => { setGroup1(v as GroupKey); if (v === "none") setGroup2("none"); }} options={GROUPS} />
            {group1 !== "none" && (
              <MiniSelect icon={ChevronRight} label="Then by" value={group2} onChange={(v) => setGroup2(v as GroupKey)}
                options={Object.fromEntries(Object.entries(GROUPS).filter(([k]) => k !== group1)) as Record<string, string>} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK.map((q) => {
            const on = quick.has(q.id);
            return (
              <button key={q.id} onClick={() => toggleQuick(q.id)} aria-pressed={on}
                className={cn("inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                  on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
                <q.icon className="w-3 h-3" />{q.label}
              </button>
            );
          })}
          {filtersActive && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { resetTicketFilters(); setQuick(new Set()); }}>
              <X className="w-3 h-3 mr-1" />Clear
            </Button>
          )}
          <div className="ml-auto flex items-center bg-muted/60 rounded-lg p-0.5" role="tablist" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v.id} role="tab" aria-selected={view === v.id} title={v.label} onClick={() => setView(v.id)}
                className={cn("inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11px] transition-colors", view === v.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <v.icon className="w-3.5 h-3.5" /><span className="hidden xl:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <SmartBulkActions selectedTickets={tickets.filter((t) => selectedIds.has(t.id))} onClear={() => setSelectedIds(new Set())} />
      )}

      {tickets.length === 0 ? (
        <div className="iris-card text-center py-20">
          <div className="text-[13px] text-muted-foreground">No tickets match.{scope === "open" ? " Switch to All to include resolved tickets." : ""}</div>
        </div>
      ) : view === "board" ? (
        <Board tickets={tickets} columnOf={(t) => t.status} columns={STATUS_ORDER.filter((s) => scope !== "open" || !DONE.has(s))} label={(k) => STATUS_LABEL[k] ?? k} onSelect={selectTicket} />
      ) : view === "owners" ? (
        <Board tickets={tickets} columnOf={(t) => getAssignee(t)?.name ?? "Unassigned"}
          columns={[...new Set(tickets.map((t) => getAssignee(t)?.name ?? "Unassigned"))].sort((a, b) => (a === "Unassigned" ? -1 : b === "Unassigned" ? 1 : a.localeCompare(b)))}
          label={(k) => k} onSelect={selectTicket} avatars />
      ) : view === "timeline" ? (
        <Timeline tickets={tickets} onSelect={selectTicket} />
      ) : view === "split" ? (
        <Split tickets={tickets} preview={preview ?? tickets[0]?.id ?? null} setPreview={setPreview} onOpen={selectTicket} />
      ) : (
        <Grouped tickets={tickets} g1={group1} g2={group2}
          render={(list, showSelectAll) =>
            view === "cards" ? <Cards tickets={list} onSelect={selectTicket} />
              : <Table tickets={list} compact={view === "compact"} onSelect={selectTicket} selectedIds={selectedIds} onToggle={toggleSelect}
                  onToggleAll={showSelectAll ? toggleAll : undefined} allSelected={selectedIds.size === tickets.length} />}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouping (two levels, collapsible)
// ─────────────────────────────────────────────────────────────────────────────

function groupTickets(list: Ticket[], g: GroupKey) {
  const m = new Map<string, Ticket[]>();
  for (const t of list) {
    const k = groupValue(t, g);
    m.set(k, [...(m.get(k) ?? []), t]);
  }
  return [...m.entries()].sort(([a], [b]) => groupOrder(a, b, g));
}

function Grouped({ tickets, g1, g2, render }: { tickets: Ticket[]; g1: GroupKey; g2: GroupKey; render: (list: Ticket[], showSelectAll: boolean) => React.ReactNode }) {
  const [closed, setClosed] = React.useState<Set<string>>(new Set());
  const toggle = (k: string) => setClosed((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  if (g1 === "none") return <>{render(tickets, true)}</>;
  return (
    <div className="space-y-3">
      {groupTickets(tickets, g1).map(([k1, list1]) => {
        const id1 = `1:${k1}`;
        return (
          <section key={id1} className="iris-card overflow-hidden">
            <GroupHeader label={groupLabel(k1, g1)} kind={GROUPS[g1]} tickets={list1} open={!closed.has(id1)} onToggle={() => toggle(id1)} level={1} />
            {!closed.has(id1) && (
              <div className="p-2.5 pt-0 space-y-2">
                {g2 === "none"
                  ? render(list1, false)
                  : groupTickets(list1, g2).map(([k2, list2]) => {
                      const id2 = `${id1}/${k2}`;
                      return (
                        <div key={id2} className="rounded-lg border border-border/70 overflow-hidden">
                          <GroupHeader label={groupLabel(k2, g2)} kind={GROUPS[g2]} tickets={list2} open={!closed.has(id2)} onToggle={() => toggle(id2)} level={2} />
                          {!closed.has(id2) && <div className="p-2 pt-0">{render(list2, false)}</div>}
                        </div>
                      );
                    })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function GroupHeader({ label, kind, tickets, open, onToggle, level }: { label: string; kind: string; tickets: Ticket[]; open: boolean; onToggle: () => void; level: 1 | 2 }) {
  const breached = tickets.filter((t) => t.slaStatus === "breached").length;
  const urgent = tickets.filter((t) => t.priority === "P0" || t.priority === "P1").length;
  const unassigned = tickets.filter((t) => !t.assigneeId).length;
  return (
    <button onClick={onToggle} aria-expanded={open}
      className={cn("w-full flex items-center gap-2 text-left hover:bg-muted/40 transition-colors", level === 1 ? "px-3.5 py-3" : "px-3 py-2")}>
      <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
      <span className="text-[9px] uppercase tracking-[.14em] text-muted-foreground">{kind}</span>
      <span className={cn("font-semibold", level === 1 ? "text-[13px]" : "text-[12px]")}>{label}</span>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">{tickets.length}</Badge>
      <span className="ml-auto flex items-center gap-2 text-[10px] tabular-nums">
        {urgent > 0 && <span className="text-orange-600 dark:text-orange-400">{urgent} P0–P1</span>}
        {breached > 0 && <span className="text-rose-600 dark:text-rose-400">{breached} breached</span>}
        {unassigned > 0 && <span className="text-amber-600 dark:text-amber-400">{unassigned} unassigned</span>}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table / Compact
// ─────────────────────────────────────────────────────────────────────────────

const PAGE = 100;

function Owner({ t, size = 5 }: { t: Ticket; size?: number }) {
  const a = getAssignee(t);
  if (!a) return <span className="text-[11px] text-muted-foreground italic">Unassigned</span>;
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <Avatar className={size === 5 ? "w-5 h-5" : "w-6 h-6"}>
        <AvatarFallback className={cn("text-white text-[9px] font-semibold", getAvatarColor(a.name))}>{getInitials(a.name)}</AvatarFallback>
      </Avatar>
      <span className="text-[12px] truncate">{a.name}</span>
      {(t.assigneeIds?.length ?? 0) > 1 && <span className="text-[10px] text-muted-foreground shrink-0" title="Co-owners">+{t.assigneeIds!.length - 1}</span>}
    </span>
  );
}

function Table({ tickets, compact, onSelect, selectedIds, onToggle, onToggleAll, allSelected }: {
  tickets: Ticket[]; compact: boolean; onSelect: (id: string) => void; selectedIds: Set<string>; onToggle: (id: string) => void; onToggleAll?: () => void; allSelected: boolean;
}) {
  const [limit, setLimit] = React.useState(PAGE);
  const pad = compact ? "px-2.5 py-1.5" : "px-3 py-3";
  const th = "text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-[.12em] text-muted-foreground whitespace-nowrap";
  return (
    <div className="iris-card overflow-hidden">
      <div className="overflow-x-auto iris-scrollbar">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/40 border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 w-8">
                {onToggleAll && (
                  <button onClick={onToggleAll} aria-label="Select all">
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                )}
              </th>
              <th className={th}>Ticket</th>
              <th className={th}>Priority</th>
              <th className={th}>Status</th>
              {!compact && <th className={th}>Studio</th>}
              <th className={th}>Owner</th>
              <th className={th}>SLA</th>
              <th className={cn(th, "text-right")}>Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.slice(0, limit).map((t) => {
              const sel = selectedIds.has(t.id);
              return (
                <tr key={t.id} onClick={() => onSelect(t.id)}
                  className={cn("cursor-pointer transition-colors group hover:bg-primary/[.04]", sel && "bg-primary/[.06]",
                    t.slaStatus === "breached" && "shadow-[inset_3px_0_0_0_rgb(244_63_94)]", t.slaStatus === "at_risk" && "shadow-[inset_3px_0_0_0_rgb(245_158_11)]")}>
                  <td className={cn(pad, "w-8")} onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}>
                    {sel ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground opacity-40 group-hover:opacity-100" />}
                  </td>
                  <td className={cn(pad, "max-w-[420px]")}>
                    {compact ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{t.ticketId}</span>
                        <span className="truncate font-medium group-hover:text-primary">{t.title}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">{t.ticketId}</span><span>·</span><span className="truncate">{t.category}{t.subcategory ? ` › ${t.subcategory}` : ""}</span>
                        </div>
                        <div className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">{t.title}</div>
                      </>
                    )}
                  </td>
                  <td className={pad}><PriorityBadge priority={t.priority} /></td>
                  <td className={pad}><StatusBadge status={t.status} /></td>
                  {!compact && <td className={cn(pad, "whitespace-nowrap")}>{getStudio(t)?.name ?? <span className="text-muted-foreground">-</span>}</td>}
                  <td className={cn(pad, "max-w-[180px]")}><Owner t={t} /></td>
                  <td className={pad}><SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} /></td>
                  <td className={cn(pad, "text-right text-[11px] text-muted-foreground tabular-nums whitespace-nowrap")}>{formatRelativeTime(t.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ShowMore shown={Math.min(limit, tickets.length)} total={tickets.length} onMore={() => setLimit((l) => l + PAGE)} />
    </div>
  );
}

function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-3 border-t border-border text-[11px] text-muted-foreground">
      Showing {shown} of {total}
      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onMore}>Show {Math.min(PAGE, total - shown)} more</Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards / Board / Timeline / Split
// ─────────────────────────────────────────────────────────────────────────────

function TicketCard({ t, onSelect, dense }: { t: Ticket; onSelect: (id: string) => void; dense?: boolean }) {
  const studio = getStudio(t);
  return (
    <button onClick={() => onSelect(t.id)}
      className={cn("w-full text-left iris-card p-3 hover:border-primary/40 hover:shadow-md transition-all border border-border/70",
        t.slaStatus === "breached" && "border-l-[3px] border-l-rose-500", t.slaStatus === "at_risk" && "border-l-[3px] border-l-amber-500")}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <PriorityBadge priority={t.priority} />
        {!dense && <StatusBadge status={t.status} />}
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
      </div>
      <div className="text-[12.5px] font-medium leading-snug line-clamp-2 mb-2">{t.title}</div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {studio && <StudioBadge studioCode={studio.code} />}
        <span className="ml-auto">{formatRelativeTime(t.updatedAt)}</span>
      </div>
      {!dense && (
        <>
          <div className="mt-2 flex items-center justify-between gap-2"><Owner t={t} /><SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} /></div>
          <div className="mt-1.5"><SmartBadges ticket={t} variant="xs" /></div>
        </>
      )}
    </button>
  );
}

function Cards({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (id: string) => void }) {
  const [limit, setLimit] = React.useState(PAGE);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {tickets.slice(0, limit).map((t) => <TicketCard key={t.id} t={t} onSelect={onSelect} />)}
      </div>
      <ShowMore shown={Math.min(limit, tickets.length)} total={tickets.length} onMore={() => setLimit((l) => l + PAGE)} />
    </>
  );
}

function Board({ tickets, columns, columnOf, label, onSelect, avatars }: {
  tickets: Ticket[]; columns: string[]; columnOf: (t: Ticket) => string; label: (k: string) => string; onSelect: (id: string) => void; avatars?: boolean;
}) {
  const by = new Map<string, Ticket[]>(columns.map((c) => [c, []]));
  for (const t of tickets) by.get(columnOf(t))?.push(t);
  return (
    <div className="flex gap-3 overflow-x-auto iris-scrollbar pb-2">
      {columns.map((c) => {
        const list = by.get(c) ?? [];
        return (
          <div key={c} className="w-[290px] shrink-0 rounded-xl bg-muted/30 border border-border/60 flex flex-col max-h-[72vh]">
            <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/60">
              {avatars && c !== "Unassigned" && (
                <Avatar className="w-5 h-5"><AvatarFallback className={cn("text-white text-[9px] font-semibold", getAvatarColor(c))}>{getInitials(c)}</AvatarFallback></Avatar>
              )}
              <span className="text-[12px] font-semibold truncate">{label(c)}</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] ml-auto tabular-nums">{list.length}</Badge>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto iris-scrollbar">
              {list.slice(0, 60).map((t) => <TicketCard key={t.id} t={t} onSelect={onSelect} dense />)}
              {list.length > 60 && <div className="text-[10px] text-center text-muted-foreground py-1">+{list.length - 60} more</div>}
              {!list.length && <div className="text-[11px] text-center text-muted-foreground py-6">Nothing here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (id: string) => void }) {
  const days = new Map<string, Ticket[]>();
  for (const t of [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 400)) {
    const k = new Date(t.createdAt).toDateString();
    days.set(k, [...(days.get(k) ?? []), t]);
  }
  return (
    <div className="iris-card p-4">
      {[...days.entries()].map(([day, list]) => (
        <div key={day} className="relative pl-6 pb-5 last:pb-0 border-l border-border ml-2">
          <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="text-[11px] font-semibold text-muted-foreground mb-2">
            {new Date(day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            <span className="ml-2 font-normal">{list.length} ticket{list.length === 1 ? "" : "s"}</span>
          </div>
          <div className="space-y-1">
            {list.map((t) => (
              <button key={t.id} onClick={() => onSelect(t.id)} className="w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                <span className="text-[10px] text-muted-foreground tabular-nums w-11 shrink-0">{new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                <PriorityBadge priority={t.priority} />
                <span className="text-[12px] truncate flex-1">{t.title}</span>
                <StatusBadge status={t.status} />
                <span className="hidden md:block w-40 shrink-0"><Owner t={t} /></span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Split({ tickets, preview, setPreview, onOpen }: { tickets: Ticket[]; preview: string | null; setPreview: (id: string) => void; onOpen: (id: string) => void }) {
  const t = tickets.find((x) => x.id === preview) ?? tickets[0];
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="iris-card overflow-hidden max-h-[74vh] overflow-y-auto iris-scrollbar divide-y divide-border">
        {tickets.slice(0, 300).map((x) => (
          <button key={x.id} onClick={() => setPreview(x.id)} onDoubleClick={() => onOpen(x.id)}
            className={cn("w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors", x.id === t?.id && "bg-primary/[.07] shadow-[inset_3px_0_0_0_var(--primary)]")}>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-mono">{x.ticketId}</span><PriorityBadge priority={x.priority} /><span className="ml-auto">{formatRelativeTime(x.updatedAt)}</span>
            </div>
            <div className="text-[12.5px] font-medium truncate mt-0.5">{x.title}</div>
          </button>
        ))}
      </div>
      {t && (
        <div className="iris-card p-5 max-h-[74vh] overflow-y-auto iris-scrollbar">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[11px] font-mono text-muted-foreground">{t.ticketId}</span>
            <PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /><SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} />
            <Button size="sm" className="h-7 text-[11px] ml-auto" onClick={() => onOpen(t.id)}>Open ticket</Button>
          </div>
          <h2 className="text-[17px] font-semibold leading-snug">{t.title}</h2>
          <div className="text-[12px] text-muted-foreground mt-1">{t.category}{t.subcategory ? ` › ${t.subcategory}` : ""}</div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-[12px]">
            <Fact label="Owner"><Owner t={t} size={6} /></Fact>
            <Fact label="Studio">{getStudio(t)?.name ?? "-"}</Fact>
            <Fact label="Department">{getDepartment(t)?.name ?? "-"}</Fact>
            <Fact label="Created">{new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Fact>
          </div>
          <div className="mt-4"><SmartBadges ticket={t} variant="xs" /></div>
          <p className="mt-4 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">{t.description}</p>
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Controls
// ─────────────────────────────────────────────────────────────────────────────

function MiniSelect({ icon: Icon, label, value, onChange, options }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; onChange: (v: string) => void; options: Record<string, string>;
}) {
  return (
    <label className={cn("inline-flex items-center gap-1 h-8 pl-2 pr-1 rounded-md border text-[12px]", value !== "none" && label !== "Sort" ? "border-primary/40 bg-primary/5" : "border-input")}>
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none text-[12px] pr-1 cursor-pointer" aria-label={label}>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{label === "Then by" && k === "none" ? "No sub-group" : v}</option>)}
      </select>
    </label>
  );
}

function FilterPopover({ label, options, optionLabels, selected, onChange }: {
  label: string; options: string[]; optionLabels?: Record<string, string>; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 text-[12px]", selected.length > 0 && "border-primary/40 bg-primary/5 text-primary")}>
          <SlidersHorizontal className="w-3 h-3 mr-1.5" />{label}
          {selected.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{selected.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-72 overflow-y-auto iris-scrollbar">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-[12px]" onClick={(e) => e.preventDefault()}>
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span>{optionLabels?.[opt] || opt}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
