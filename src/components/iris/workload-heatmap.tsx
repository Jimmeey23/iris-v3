"use client";

import * as React from "react";
import { buildWorkloadHeatmap } from "@/lib/iris/intelligence";
import { EMPLOYEES, DEPARTMENTS } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, Users } from "lucide-react";

/**
 * Workload Heatmap - visualizes per-assignee ticket load over the last 7 days.
 *
 * Color intensity shows utilization:
 *   - Empty (0 tickets): subtle muted background
 *   - Light (1 ticket, <50% util): light primary tint
 *   - Medium (50-99% util): medium primary tint
 *   - Hot (100%+ util - overloaded): red/rose background, bold
 *
 * Below the grid: top overload hotspots with recommendations.
 */
export function WorkloadHeatmap() {
  const heatmap = React.useMemo(() => buildWorkloadHeatmap(), []);
  const [deptFilter, setDeptFilter] = React.useState<string>("all");

  const employees = React.useMemo(() => {
    if (deptFilter === "all") return heatmap.employees;
    return heatmap.employees.filter((e) => e.departmentCode === deptFilter);
  }, [heatmap.employees, deptFilter]);

  // For each cell, look up the cell
  const getCell = (empId: string, dayIso: string) =>
    heatmap.cells.find((c) => c.employeeId === empId && c.day === dayIso);

  return (
    <div className="iris-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
          <Activity className="w-3 h-3 text-sky-500" />
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-semibold">Team Workload Heatmap</div>
          <div className="text-[9px] text-muted-foreground">
            Last 7 days · {heatmap.employees.length} active assignees · {heatmap.hotspots.length} overload hotspots
          </div>
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-7 text-[11px] rounded-md border border-border bg-background px-2"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="p-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pr-3 sticky left-0 bg-card">
                Assignee
              </th>
              {heatmap.days.map((d) => (
                <th key={d.iso} className="text-center text-[9px] font-semibold text-muted-foreground pb-2 px-1 min-w-[40px]">
                  {d.label}
                </th>
              ))}
              <th className="text-right text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pl-3">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const empCells = heatmap.cells.filter((c) => c.employeeId === emp.id);
              const total = empCells.reduce((n, c) => n + c.ticketCount, 0);
              return (
                <tr key={emp.id} className="hover:bg-muted/20">
                  <td className="py-1 pr-3 sticky left-0 bg-card">
                    <div className="text-[11px] font-medium truncate max-w-[160px]">{emp.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate max-w-[160px]">{emp.role}</div>
                  </td>
                  {heatmap.days.map((d) => {
                    const cell = getCell(emp.id, d.iso);
                    const count = cell?.ticketCount ?? 0;
                    const util = cell?.utilization ?? 0;
                    const isToday = d.iso === new Date().toISOString().slice(0, 10);
                    return (
                      <td key={d.iso} className="text-center px-1 py-1">
                        <div
                          className={cn(
                            "w-9 h-9 mx-auto rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums transition-colors",
                            count === 0 && "bg-muted/30 text-muted-foreground/40",
                            count > 0 && util < 0.5 && "bg-primary/10 text-primary",
                            count > 0 && util >= 0.5 && util < 1 && "bg-primary/25 text-primary",
                            util >= 1 && "bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold",
                            isToday && "ring-1 ring-inset ring-primary/40",
                          )}
                          title={`${emp.name} · ${d.label}: ${count} ticket${count === 1 ? "" : "s"} (${Math.round(util * 100)}% util)`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-right pl-3">
                    <span className={cn(
                      "text-[11px] font-bold tabular-nums",
                      total >= 5 ? "text-rose-500" : total >= 3 ? "text-amber-500" : "text-foreground",
                    )}>
                      {total}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hotspots */}
      {heatmap.hotspots.length > 0 && (
        <div className="px-3 pb-3 pt-2 border-t border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Overload Hotspots ({heatmap.hotspots.length})
          </div>
          <div className="space-y-1">
            {heatmap.hotspots.slice(0, 4).map((h, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-md border border-rose-500/20 bg-rose-500/5">
                <Users className="w-3 h-3 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium">{h.employeeName}</span>
                  <span className="text-[10px] text-muted-foreground"> · {h.day}</span>
                </div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                  {h.ticketCount} tickets · {Math.round(h.utilization * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
