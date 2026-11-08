"use client";

import * as React from "react";
import { REPORTS, REPORT_CATEGORIES, ReportItem } from "@/lib/iris/reports";
import { PRIORITY_CONFIG, STUDIOS, DEPARTMENTS } from "@/lib/iris/types";
import { MultiSelect } from "@/components/iris/multi-select";
import { api } from "@/lib/iris/live-data";
import { cn } from "@/lib/utils";
import {
  Search,
  FileBarChart,
  Download,
  Copy,
  X,
  BarChart3,
  PieChart as PieChartIcon,
  Table,
  Grid3x3,
  FileText,
  Database,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Ban,
  Printer,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell as PieCell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const CHART_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

type CellValue = string | number;
type Chart = { title: string; subtitle: string; type: "pie" | "bar" | "line"; data: { name: string; value: number }[]; color?: string; seriesName?: string };
type Summary = { metric: string; detail: string; value: string; icon: string; color: string };
type Result =
  | { available: true; headers: string[]; rows: CellValue[][]; charts: Chart[]; summary: Summary[]; note?: string; generatedAt: string }
  | { available: false; reason: string };
type Availability = Record<string, { available: boolean; reason?: string }>;

const RANGES = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 12 months" },
  { value: "all", label: "All time" },
] as const;

/** What a download button produces. Excel opens the CSV; PDF is the print view saved as PDF. */
const EXPORTS = [
  { id: "csv", label: "CSV", format: "csv" },
  { id: "xlsx", label: "Excel", format: "csv" },
  { id: "pdf", label: "PDF", format: "html" },
  { id: "json", label: "JSON", format: "json" },
  { id: "md", label: "Markdown", format: "md" },
] as const;

function exportUrl(code: string, range: string, format: string) {
  return `/api/reports/${code}?range=${range}&format=${format}`;
}

function download(code: string, range: string, exportId: (typeof EXPORTS)[number]["id"]) {
  const e = EXPORTS.find((x) => x.id === exportId)!;
  if (e.format === "html") {
    window.open(exportUrl(code, range, "html"), "_blank", "noopener");
    return;
  }
  const a = document.createElement("a");
  a.href = exportUrl(code, range, e.format);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ReportsView() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [selectedReport, setSelectedReport] = React.useState<ReportItem | null>(null);
  const [availability, setAvailability] = React.useState<Availability | null>(null);

  React.useEffect(() => {
    api<{ availability: Availability }>("/api/reports")
      .then((r) => setAvailability(r.availability))
      .catch(() => setAvailability({}));
  }, []);

  const isLive = React.useCallback((code: string) => availability?.[code]?.available ?? true, [availability]);
  const liveCount = availability ? REPORTS.filter((r) => availability[r.code]?.available).length : null;

  const filtered = React.useMemo(() => {
    return REPORTS.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      }
      if (category !== "all" && r.category !== category) return false;
      if (type !== "all" && r.type !== type) return false;
      if (status === "live" && !isLive(r.code)) return false;
      if (status === "unavailable" && isLive(r.code)) return false;
      return true;
    });
  }, [search, category, type, status, isLive]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <FileBarChart className="w-3 h-3 text-violet-500" />
            {REPORTS.length} Reports · Live Data
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Reports Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every report runs against live tickets and covers what you have access to - export to CSV, Excel, PDF, JSON or Markdown.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Reports" value={REPORTS.length} icon={FileBarChart} color="violet" />
        <StatCard label="Live Reports" value={liveCount ?? "…"} icon={CheckCircle2} color="emerald" />
        <StatCard label="Categories" value={REPORT_CATEGORIES.length} icon={PieChartIcon} color="sky" />
        <StatCard label="Awaiting Data" value={liveCount === null ? "…" : REPORTS.length - liveCount} icon={Database} color="amber" />
      </div>

      {/* Filters */}
      <div className="iris-card-elevated p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search reports by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-[12px]"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[180px] text-[12px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {REPORT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 w-[120px] text-[12px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="tabular">Tabular</SelectItem>
              <SelectItem value="chart">Chart</SelectItem>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="matrix">Matrix</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[150px] text-[12px]">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="live">Live only</SelectItem>
              <SelectItem value="unavailable">Awaiting data</SelectItem>
            </SelectContent>
          </Select>
          {(search || category !== "all" || type !== "all" || status !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px]"
              onClick={() => { setSearch(""); setCategory("all"); setType("all"); setStatus("all"); }}
            >
              <X className="w-3 h-3 mr-1" />Clear
            </Button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {REPORTS.length} reports
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r, i) => {
          const live = isLive(r.code);
          return (
            <button
              key={r.code}
              onClick={() => setSelectedReport(r)}
              className={cn(
                "text-left iris-card-elevated p-4 hover:scale-[1.01] transition-transform iris-fade-in-up group",
                !live && "opacity-70",
              )}
              style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  r.type === "tabular" ? "bg-sky-500/10 text-sky-500" :
                  r.type === "chart" ? "bg-violet-500/10 text-violet-500" :
                  r.type === "summary" ? "bg-emerald-500/10 text-emerald-500" :
                  "bg-amber-500/10 text-amber-500"
                )}>
                  {r.type === "tabular" ? <Table className="w-4 h-4" /> :
                   r.type === "chart" ? <BarChart3 className="w-4 h-4" /> :
                   r.type === "summary" ? <FileText className="w-4 h-4" /> :
                   <Grid3x3 className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-muted-foreground">{r.code}</div>
                  <div className="text-[13px] font-semibold leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                    {r.name}
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {r.description}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {live ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">Live</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 uppercase">Awaiting data</span>
                )}
                {live && ["csv", "xlsx", "pdf"].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground uppercase">{f}</span>
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">{r.category}</span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <FileBarChart className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] text-muted-foreground">No reports match your filters</div>
        </div>
      )}

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        {selectedReport && (
          <DialogContent className="max-w-[1400px] h-[92vh] max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
            <ReportDetailDialog report={selectedReport} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ReportDetailDialog({ report }: { report: ReportItem }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("data");
  const [range, setRange] = React.useState<string>("365d");
  const [result, setResult] = React.useState<Result | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rowFilter, setRowFilter] = React.useState("");
  const [filters, setFilters] = React.useState<ReportFilterState>(EMPTY_FILTERS);
  // Users pick filters first; nothing runs until they click "Run report".
  const [configuring, setConfiguring] = React.useState(true);
  const filterQs = filterQuery(filters);
  const rangeQ = `${range}${filterQs}`;

  const run = React.useCallback(async () => {
    setConfiguring(false);
    setLoading(true);
    setError(null);
    try {
      setResult(await api<Result>(`/api/reports/${report.code}?range=${rangeQ}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't run this report");
    } finally {
      setLoading(false);
    }
  }, [report.code, rangeQ]);

  const live = result?.available ? result : null;
  const visibleRows = React.useMemo(() => {
    if (!live) return [];
    const q = rowFilter.trim().toLowerCase();
    return q ? live.rows.filter((row) => row.some((c) => String(c).toLowerCase().includes(q))) : live.rows;
  }, [live, rowFilter]);

  const copy = () => {
    if (!live) return;
    const cell = (v: CellValue) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [live.headers, ...visibleRows].map((r) => r.map(cell).join(",")).join("\n");
    void navigator.clipboard.writeText(csv).then(
      () => toast({ title: "Report data copied", description: `${report.name} - ${visibleRows.length} rows copied as CSV` }),
      () => toast({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "destructive" }),
    );
  };

  return (
    <>
      <DialogHeader className="px-5 py-4 border-b border-border bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground">{report.code}</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{report.category}</Badge>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">{report.type}</Badge>
          {live && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <span className="iris-live-dot" style={{ width: 5, height: 5 }} />
              Live Data
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-7 w-[150px] text-[11px]" aria-label="Report period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{report.name}</DialogTitle>
        <p className="text-[12px] text-muted-foreground mt-1">{report.description}</p>
      </DialogHeader>

      {configuring ? (
        <ReportFilterPanel
          range={range}
          onRange={setRange}
          filters={filters}
          onChange={setFilters}
          onRun={run}
          onCancel={result ? () => setConfiguring(false) : undefined}
        />
      ) : loading && !result ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Running report…
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div className="text-[13px]">{error}</div>
          <Button size="sm" onClick={run}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
        </div>
      ) : result && !result.available ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6 max-w-lg mx-auto">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><Ban className="w-5 h-5" /></div>
          <div className="text-[14px] font-semibold">This report is awaiting data</div>
          <div className="text-[12px] text-muted-foreground leading-relaxed">{result.reason}</div>
        </div>
      ) : live ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-2 border-b border-border shrink-0 flex items-center gap-3">
            <TabsList className="bg-muted/40 h-9">
              <TabsTrigger value="data" className="text-[12px] data-[state=active]:bg-background">
                <Table className="w-3 h-3 mr-1.5" />
                Data ({live.rows.length} rows)
              </TabsTrigger>
              {live.charts.length > 0 && (
                <TabsTrigger value="charts" className="text-[12px] data-[state=active]:bg-background">
                  <BarChart3 className="w-3 h-3 mr-1.5" />
                  Visualizations ({live.charts.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="summary" className="text-[12px] data-[state=active]:bg-background">
                <FileText className="w-3 h-3 mr-1.5" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="export" className="text-[12px] data-[state=active]:bg-background">
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </TabsTrigger>
            </TabsList>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>

          <div className="flex-1 overflow-y-auto iris-scrollbar p-5">
            {live.note && (
              <div className="mb-3 text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2">{live.note}</div>
            )}
            <TabsContent value="data" className="mt-0">
              <div className="iris-card-elevated overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {visibleRows.length} Records
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="relative">
                      <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                      <Input value={rowFilter} onChange={(e) => setRowFilter(e.target.value)} placeholder="Filter rows" aria-label="Filter rows" className="h-7 w-44 pl-7 text-[11px]" />
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={copy}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy CSV
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto iris-scrollbar max-h-[62vh]">
                  {live.rows.length === 0 ? (
                    <div className="py-16 text-center text-[12px] text-muted-foreground">No records in this period. Try a longer period.</div>
                  ) : (
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                        <tr className="border-b border-border">
                          {live.headers.map((h, i) => (
                            <th key={i} className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {visibleRows.map((row, i) => (
                          <tr key={i} className="hover:bg-violet-500/5 transition-colors">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[420px] truncate" title={String(cell)}>
                                {typeof cell === "string" && /^P[0-3]$/.test(cell) && PRIORITY_CONFIG[cell as "P0"] ? (
                                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", PRIORITY_CONFIG[cell as "P0"].bg, PRIORITY_CONFIG[cell as "P0"].text)}>
                                    {cell}
                                  </span>
                                ) : typeof cell === "number" ? (
                                  <span className="tabular-nums font-medium">{cell}</span>
                                ) : (
                                  <span>{cell}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Showing {visibleRows.length} of {live.rows.length} records</span>
                  <span>Generated {new Date(live.generatedAt).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </TabsContent>

            {live.charts.length > 0 && (
              <TabsContent value="charts" className="mt-0 space-y-4">
                {live.charts.map((chart, i) => (
                  <div key={i} className="iris-card-elevated overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                      <div className="text-[12px] font-semibold">{chart.title}</div>
                      <div className="text-[10px] text-muted-foreground">{chart.subtitle}</div>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={240}>
                        {chart.type === "pie" ? (
                          <PieChart>
                            <Pie data={chart.data} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                              {chart.data.map((_, idx) => (
                                <PieCell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} stroke="none" />
                              ))}
                            </Pie>
                            <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        ) : chart.type === "bar" ? (
                          <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} interval={0} angle={chart.data.length > 6 ? -25 : 0} textAnchor={chart.data.length > 6 ? "end" : "middle"} height={chart.data.length > 6 ? 60 : 30} />
                            <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
                            <Bar dataKey="value" name="Tickets" fill={chart.color || "#8b5cf6"} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          </BarChart>
                        ) : (
                          <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={chart.color || "#8b5cf6"} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={chart.color || "#8b5cf6"} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                            <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                            <Area type="monotone" dataKey="value" name={chart.seriesName || "Value"} stroke={chart.color || "#8b5cf6"} strokeWidth={2} fill={`url(#grad-${i})`} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </TabsContent>
            )}

            <TabsContent value="summary" className="mt-0 space-y-3">
              <div className="iris-card-elevated p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-violet-500" />
                  Report Summary
                </div>
                <div className="space-y-2">
                  {live.summary.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-md bg-muted/30 border border-border">
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", s.color)}>
                        {s.icon === "trend_up" ? <TrendingUp className="w-3.5 h-3.5" /> :
                         s.icon === "trend_down" ? <TrendingDown className="w-3.5 h-3.5" /> :
                         s.icon === "alert" ? <AlertTriangle className="w-3.5 h-3.5" /> :
                         s.icon === "check" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         <BarChart3 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold">{s.metric}</div>
                        <div className="text-[11px] text-muted-foreground">{s.detail}</div>
                      </div>
                      <div className="text-[16px] font-bold tabular-nums shrink-0">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ConfigCard label="Data Source" value={report.dataSource} icon={Database} />
                <ConfigCard label="Period" value={RANGES.find((r) => r.value === range)!.label} icon={Calendar} />
              </div>
            </TabsContent>

            <TabsContent value="export" className="mt-0">
              <div className="iris-card-elevated p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Download</div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Exports the full report for {RANGES.find((r) => r.value === range)!.label.toLowerCase()}. Excel opens the CSV directly; PDF opens a print view - choose “Save as PDF”.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {EXPORTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => download(report.code, rangeQ, f.id)}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                    >
                      {f.id === "pdf" ? <Printer className="w-4 h-4 text-violet-600 dark:text-violet-400" /> : <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                      <span className="text-[11px] font-medium">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      ) : null}

      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={copy} disabled={!live}>
          <Copy className="w-3 h-3 mr-1.5" />
          Copy Data
        </Button>
        {!configuring && (
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setConfiguring(true)}>
            <Filter className="w-3 h-3 mr-1.5" />
            Filters{activeFilterCount(filters) ? ` (${activeFilterCount(filters)})` : ""}
          </Button>
        )}
        <Button size="sm" className="h-8 text-[12px] iris-btn-premium" onClick={run} disabled={loading || configuring}>
          {loading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1.5" />}
          Refresh
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-[12px] ml-auto" disabled={!live} onClick={() => download(report.code, rangeQ, "xlsx")}>
          <Download className="w-3 h-3 mr-1.5" />
          Excel
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled={!live} onClick={() => download(report.code, rangeQ, "pdf")}>
          <Printer className="w-3 h-3 mr-1.5" />
          PDF
        </Button>
      </div>
    </>
  );
}

type ReportFilterState = { studio: string[]; department: string[]; priority: string[]; status: string[] };
const EMPTY_FILTERS: ReportFilterState = { studio: [], department: [], priority: [], status: [] };
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_response", label: "Awaiting response" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];
const activeFilterCount = (f: ReportFilterState) => f.studio.length + f.department.length + f.priority.length + f.status.length;
function filterQuery(f: ReportFilterState) {
  return (Object.entries(f) as [string, string[]][])
    .filter(([, v]) => v.length)
    .map(([k, v]) => `&${k}=${encodeURIComponent(v.join(","))}`)
    .join("");
}

function ReportFilterPanel({ range, onRange, filters, onChange, onRun, onCancel }: {
  range: string; onRange: (r: string) => void; filters: ReportFilterState; onChange: (f: ReportFilterState) => void; onRun: () => void; onCancel?: () => void;
}) {
  const set = (k: keyof ReportFilterState) => (v: string[]) => onChange({ ...filters, [k]: v });
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <div className="text-[13px] font-semibold">Set up this report</div>
          <p className="text-[12px] text-muted-foreground mt-0.5">Choose a period and narrow it down. Leave a filter empty to include everything.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FilterField label="Period">
            <Select value={range} onValueChange={onRange}>
              <SelectTrigger className="h-9 text-[12px]" aria-label="Report period"><SelectValue /></SelectTrigger>
              <SelectContent>{RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Studio">
            <MultiSelect size="md" value={filters.studio} onChange={set("studio")} placeholder="All studios" options={STUDIOS.map((s) => ({ value: s.code, label: s.name, hint: s.city }))} />
          </FilterField>
          <FilterField label="Department">
            <MultiSelect size="md" value={filters.department} onChange={set("department")} placeholder="All departments" options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.name, hint: d.code }))} />
          </FilterField>
          <FilterField label="Priority">
            <MultiSelect size="md" value={filters.priority} onChange={set("priority")} placeholder="All priorities" options={Object.keys(PRIORITY_CONFIG).map((p) => ({ value: p, label: `${p} ${PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].label ?? ""}`.trim() }))} />
          </FilterField>
          <FilterField label="Status">
            <MultiSelect size="md" value={filters.status} onChange={set("status")} placeholder="All statuses" options={STATUS_OPTIONS} />
          </FilterField>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-9 text-[12px] iris-btn-premium" onClick={onRun}>
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Run report
          </Button>
          {activeFilterCount(filters) > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-[12px]" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</Button>
          )}
          {onCancel && <Button variant="ghost" size="sm" className="h-9 text-[12px] ml-auto" onClick={onCancel}>Back to results</Button>}
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: "violet" | "sky" | "emerald" | "amber" | "indigo" }) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  };
  return (
    <div className="iris-card-elevated p-3 flex items-center gap-3">
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

function ConfigCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="iris-card-elevated p-3">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </div>
      <div className="text-[12px] font-semibold capitalize">{value}</div>
    </div>
  );
}
