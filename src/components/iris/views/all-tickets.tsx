"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, isMine, getAssignee, getReporter, getStudio, getDepartment, Ticket } from "@/lib/iris/sample-tickets";
import { STUDIOS, DEPARTMENTS, Priority, TicketStatus } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge, StudioBadge } from "../badges";
import { formatRelativeTime, getInitials, getAvatarColor } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  LayoutGrid,
  List,
  Plus,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  Group,
  RotateCcw,
  Tag,
  UserCheck,
  Trash2,
  Layers,
} from "lucide-react";
import { TicketWorkspace } from "./ticket-workspace";
import { SmartBadges } from "../smart-badges";
import { SmartBulkActions } from "../smart-bulk-actions";

export function AllTicketsView({ filterMode = "all" }: { filterMode?: "all" | "my" | "department" | "escalations" }) {
  const { selectedTicketId, selectTicket, ticketFilters, setTicketFilter, resetTicketFilters, currentUser, dataVersion } = useAppStore();
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = React.useState<"created" | "priority" | "sla" | "updated" | "title">("created");
  const [groupBy, setGroupBy] = React.useState<"none" | "priority" | "status" | "studio" | "department">("none");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = React.useState(false);

  const filteredTickets = React.useMemo(() => {
    let result = [...ALL_TICKETS];

    // Apply mode filter
    if (filterMode === "my") {
      result = result.filter((t) => isMine(t, currentUser.id));
    } else if (filterMode === "escalations") {
      result = result.filter((t) => t.status === "escalated" || t.slaStatus === "breached" || t.slaStatus === "at_risk");
    }

    // Apply filters
    if (ticketFilters.search) {
      const q = ticketFilters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.ticketId.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.affectedClient?.toLowerCase().includes(q)
      );
    }
    if (ticketFilters.priority.length > 0) {
      result = result.filter((t) => ticketFilters.priority.includes(t.priority));
    }
    if (ticketFilters.status.length > 0) {
      result = result.filter((t) => ticketFilters.status.includes(t.status));
    }
    if (ticketFilters.studio.length > 0) {
      result = result.filter((t) => t.studioCode && ticketFilters.studio.includes(t.studioCode));
    }
    if (ticketFilters.department.length > 0) {
      result = result.filter((t) => (t.departmentCodes?.length ? t.departmentCodes : t.departmentCode ? [t.departmentCode] : []).some((c) => ticketFilters.department.includes(c)));
    }
    if (ticketFilters.slaStatus.length > 0) {
      result = result.filter((t) => ticketFilters.slaStatus.includes(t.slaStatus));
    }

    // Sort
    if (sortBy === "created") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "priority") {
      const order: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      result.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortBy === "sla") {
      const order: Record<string, number> = { breached: 0, at_risk: 1, on_track: 2, paused: 3 };
      result.sort((a, b) => order[a.slaStatus] - order[b.slaStatus]);
    } else if (sortBy === "updated") {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [filterMode, ticketFilters, sortBy, currentUser.id, dataVersion]);

  // Group tickets
  const groupedTickets = React.useMemo(() => {
    if (groupBy === "none") return null;
    const groups: Record<string, Ticket[]> = {};
    filteredTickets.forEach((t) => {
      let key = "Other";
      if (groupBy === "priority") key = t.priority;
      else if (groupBy === "status") key = t.status;
      else if (groupBy === "studio") key = t.studioCode || "Unassigned";
      else if (groupBy === "department") key = t.departmentCode || "Unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTickets, groupBy]);

  // Bulk operations
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setShowBulkActions(next.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTickets.length) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
      setShowBulkActions(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  const selectedTicket = selectedTicketId ? ALL_TICKETS.find((t) => t.id === selectedTicketId) : null;

  if (selectedTicket) {
    return <TicketWorkspace ticket={selectedTicket} />;
  }

  const titles: Record<string, { title: string; subtitle: string }> = {
    all: { title: "All Tickets", subtitle: `${filteredTickets.length} tickets across all studios` },
    my: { title: "My Tickets", subtitle: `${filteredTickets.length} tickets assigned to or reported by you` },
    department: { title: "Department Queue", subtitle: `${filteredTickets.length} tickets in your department queue` },
    escalations: { title: "Escalations & SLA Risks", subtitle: `${filteredTickets.length} tickets requiring attention` },
  };
  const { title, subtitle } = titles[filterMode];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 rounded-md p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded transition-colors", view === "list" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn("p-1.5 rounded transition-colors", view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-8 w-[140px] text-[12px]">
              <ArrowUpDown className="w-3 h-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Most Recent</SelectItem>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="sla">SLA Status</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="h-8 w-[120px] text-[12px]">
              <Group className="w-3 h-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="studio">By Studio</SelectItem>
              <SelectItem value="department">By Department</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search tickets, members, IDs..."
            value={ticketFilters.search}
            onChange={(e) => setTicketFilter("search", e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <FilterPopover
          label="Priority"
          options={["P0", "P1", "P2", "P3"]}
          selected={ticketFilters.priority}
          onChange={(v) => setTicketFilter("priority", v)}
        />
        <FilterPopover
          label="Status"
          options={["open", "in_progress", "awaiting_response", "resolved", "closed", "escalated"]}
          optionLabels={{ open: "Open", in_progress: "In Progress", awaiting_response: "Awaiting Response", resolved: "Resolved", closed: "Closed", escalated: "Escalated" }}
          selected={ticketFilters.status}
          onChange={(v) => setTicketFilter("status", v)}
        />
        <FilterPopover
          label="Studio"
          options={STUDIOS.map((s) => s.code)}
          optionLabels={Object.fromEntries(STUDIOS.map((s) => [s.code, s.name]))}
          selected={ticketFilters.studio}
          onChange={(v) => setTicketFilter("studio", v)}
        />
        <FilterPopover
          label="Department"
          options={DEPARTMENTS.map((d) => d.code)}
          optionLabels={Object.fromEntries(DEPARTMENTS.map((d) => [d.code, d.name]))}
          selected={ticketFilters.department}
          onChange={(v) => setTicketFilter("department", v)}
        />
        <FilterPopover
          label="SLA"
          options={["on_track", "at_risk", "breached", "paused"]}
          optionLabels={{ on_track: "On Track", at_risk: "At Risk", breached: "Breached", paused: "Paused" }}
          selected={ticketFilters.slaStatus}
          onChange={(v) => setTicketFilter("slaStatus", v)}
        />
        {(ticketFilters.priority.length > 0 || ticketFilters.status.length > 0 || ticketFilters.studio.length > 0 || ticketFilters.department.length > 0 || ticketFilters.slaStatus.length > 0) && (
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={resetTicketFilters}>
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* === Smart Bulk Actions Bar === */}
      {showBulkActions && (
        <SmartBulkActions
          selectedTickets={filteredTickets.filter((t) => selectedIds.has(t.id))}
          onClear={clearSelection}
        />
      )}

      {/* Grouped or Flat ticket list */}
      {view === "list" ? (
        groupedTickets ? (
          <div className="space-y-4">
            {Object.entries(groupedTickets).map(([groupKey, tickets]) => (
              <div key={groupKey}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{groupKey}</div>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">{tickets.length}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <TicketList tickets={tickets} onSelect={selectTicket} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
              </div>
            ))}
          </div>
        ) : (
          <TicketList tickets={filteredTickets} onSelect={selectTicket} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} allSelected={selectedIds.size === filteredTickets.length && filteredTickets.length > 0} />
        )
      ) : (
        <TicketGrid tickets={filteredTickets} onSelect={selectTicket} />
      )}
    </div>
  );
}

function FilterPopover({
  label,
  options,
  optionLabels,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  optionLabels?: Record<string, string>;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-[12px]", selected.length > 0 && "border-violet-500/40 bg-violet-500/5 text-violet-600 dark:text-violet-400")}
        >
          <SlidersHorizontal className="w-3 h-3 mr-1.5" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{selected.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-[12px]"
              onClick={(e) => e.preventDefault()}
            >
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span>{optionLabels?.[opt] || opt}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TicketList({ tickets, onSelect, selectedIds, onToggleSelect, onToggleSelectAll, allSelected }: {
  tickets: Ticket[];
  onSelect: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
}) {
  const [limit, setLimit] = React.useState(PAGE);
  if (tickets.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-[13px] text-muted-foreground">No tickets match your filters</div>
      </div>
    );
  }
  return (
    <div className="iris-card overflow-hidden">
      <div className="overflow-x-auto iris-scrollbar">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              {onToggleSelectAll && (
                <th className="px-3 py-2.5 w-8">
                  <button onClick={onToggleSelectAll} className="flex items-center justify-center">
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </th>
              )}
              <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Ticket</th>
              <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Priority</th>
              <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Studio</th>
              <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Assignee</th>
              <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">SLA</th>
              <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.slice(0, limit).map((t) => {
              const assignee = getAssignee(t);
              const studio = getStudio(t);
              const isSelected = selectedIds?.has(t.id);
              return (
                <tr
                  key={t.id}
                  className={cn(
                    "hover:bg-primary/5 cursor-pointer transition-colors group",
                    isSelected && "bg-primary/5"
                  )}
                >
                  {onToggleSelect && (
                    <td className="px-3 py-3 w-8" onClick={(e) => { e.stopPropagation(); onToggleSelect(t.id); }}>
                      <button className="flex items-center justify-center">
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </td>
                  )}
                  <td className="px-3 py-3 max-w-xs" onClick={() => onSelect(t.id)}>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-mono text-muted-foreground shrink-0">{t.ticketId}</div>
                    </div>
                    <div className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.category}</div>
                  </td>
                  <td className="px-3 py-3" onClick={() => onSelect(t.id)}><PriorityBadge priority={t.priority} /></td>
                  <td className="px-3 py-3" onClick={() => onSelect(t.id)}><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-3" onClick={() => onSelect(t.id)}>{studio && <span className="text-[12px]">{studio.name}</span>}</td>
                  <td className="px-3 py-3" onClick={() => onSelect(t.id)}>
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className={cn("text-white text-[9px] font-semibold", getAvatarColor(assignee.name))}>
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[12px] truncate">{assignee.name}</span>
                        {(t.assigneeIds?.length ?? 0) > 1 && <span className="text-[10px] text-muted-foreground shrink-0" title="Additional owners">+{t.assigneeIds!.length - 1}</span>}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-3"><SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} /></td>
                  <td className="px-3 py-3 text-right text-[11px] text-muted-foreground tabular-nums">{formatRelativeTime(t.updatedAt)}</td>
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

const PAGE = 100;

function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-3 border-t border-border text-[11px] text-muted-foreground">
      Showing {shown} of {total}
      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onMore}>Show {Math.min(PAGE, total - shown)} more</Button>
    </div>
  );
}

function TicketGrid({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (id: string) => void }) {
  const [limit, setLimit] = React.useState(PAGE);
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {tickets.slice(0, limit).map((t) => {
        const assignee = getAssignee(t);
        const studio = getStudio(t);
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="text-left iris-card p-3 hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-2 mb-2">
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
              <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
            </div>
            <div className="text-[13px] font-medium leading-snug line-clamp-2 mb-2">{t.title}</div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
              {studio && <StudioBadge studioCode={studio.code} />}
              {assignee && <span>· {assignee.name}{(t.assigneeIds?.length ?? 0) > 1 ? ` +${t.assigneeIds!.length - 1}` : ""}</span>}
            </div>
            <SmartBadges ticket={t} variant="xs" />
            <div className="mt-2">
              <SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} />
            </div>
          </button>
        );
      })}
    </div>
    <ShowMore shown={Math.min(limit, tickets.length)} total={tickets.length} onMore={() => setLimit((l) => l + PAGE)} />
    </>
  );
}
