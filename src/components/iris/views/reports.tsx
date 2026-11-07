"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { REPORTS, REPORT_CATEGORIES, ReportItem } from "@/lib/iris/reports";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";
import { DEPARTMENTS, STUDIOS, EMPLOYEES, PRIORITY_CONFIG } from "@/lib/iris/types";
import { SLA_DEFINITIONS } from "@/lib/iris/sla-definitions";
import { cn } from "@/lib/utils";
import {
  Search,
  FileBarChart,
  Download,
  Copy,
  Plus,
  X,
  BarChart3,
  PieChart as PieChartIcon,
  Table,
  Grid3x3,
  FileText,
  Database,
  Play,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronRight,
  Calendar,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Sparkles,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const CHART_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

export function ReportsView() {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [format, setFormat] = React.useState("all");
  const [selectedReport, setSelectedReport] = React.useState<ReportItem | null>(null);

  const filtered = React.useMemo(() => {
    return REPORTS.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      }
      if (category !== "all" && r.category !== category) return false;
      if (type !== "all" && r.type !== type) return false;
      if (format !== "all" && !r.outputFormats.includes(format)) return false;
      return true;
    });
  }, [search, category, type, format]);

  const handleCopy = (report: ReportItem) => {
    const data = generateReportData(report);
    const csv = data.headers.join(",") + "\n" + data.rows.map((r) => r.join(",")).join("\n");
    navigator.clipboard.writeText(csv);
    toast({
      title: "Report data copied",
      description: `${report.name} — ${data.rows.length} rows copied as CSV`,
    });
  };

  const handleDownload = (report: ReportItem, fmt: string) => {
    toast({
      title: `Generating ${report.name}`,
      description: `Exporting as ${fmt.toUpperCase()} with live data...`,
    });
  };

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
            Comprehensive, structured reports with live data — export in multiple formats or copy directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 text-[12px]">
            <Calendar className="w-3 h-3 mr-1.5" />
            Scheduled Reports
          </Button>
          <Button className="h-8 text-[12px]">
            <Plus className="w-3 h-3 mr-1.5" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Reports" value={REPORTS.length} icon={FileBarChart} color="violet" />
        <StatCard label="Categories" value={REPORT_CATEGORIES.length} icon={PieChartIcon} color="sky" />
        <StatCard label="Scheduled" value={12} icon={Clock} color="amber" />
        <StatCard label="Generated Today" value={42} icon={Play} color="emerald" />
        <StatCard label="Avg Generation" value="1.2s" icon={Database} color="indigo" />
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
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="h-8 w-[120px] text-[12px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          {(search || category !== "all" || type !== "all" || format !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px]"
              onClick={() => { setSearch(""); setCategory("all"); setType("all"); setFormat("all"); }}
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
        {filtered.map((r, i) => (
          <button
            key={r.code}
            onClick={() => setSelectedReport(r)}
            className="text-left iris-card-elevated p-4 hover:scale-[1.01] transition-transform iris-fade-in-up group"
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
              {r.outputFormats.map((f) => (
                <span key={f} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground uppercase">
                  {f}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto">{r.category}</span>
            </div>
          </button>
        ))}
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
            <ReportDetailDialog
              report={selectedReport}
              onCopy={() => handleCopy(selectedReport)}
              onDownload={(fmt) => handleDownload(selectedReport, fmt)}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ReportDetailDialog({
  report,
  onCopy,
  onDownload,
}: {
  report: ReportItem;
  onCopy: () => void;
  onDownload: (fmt: string) => void;
}) {
  const [activeTab, setActiveTab] = React.useState("data");

  const reportData = React.useMemo(() => generateReportData(report), [report]);
  const reportCharts = React.useMemo(() => generateReportCharts(report), [report]);
  const reportSummary = React.useMemo(() => generateReportSummary(report), [report]);

  return (
    <>
      <DialogHeader className="px-5 py-4 border-b border-border bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-muted-foreground">{report.code}</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{report.category}</Badge>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">{report.type}</Badge>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <span className="iris-live-dot" style={{ width: 5, height: 5 }} />
            Live Data
          </Badge>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{report.name}</DialogTitle>
        <p className="text-[12px] text-muted-foreground mt-1">{report.description}</p>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-2 border-b border-border shrink-0">
          <TabsList className="bg-muted/40 h-9">
            <TabsTrigger value="data" className="text-[12px] data-[state=active]:bg-background">
              <Table className="w-3 h-3 mr-1.5" />
              Data ({reportData.rows.length} rows)
            </TabsTrigger>
            {reportCharts.length > 0 && (
              <TabsTrigger value="charts" className="text-[12px] data-[state=active]:bg-background">
                <BarChart3 className="w-3 h-3 mr-1.5" />
                Visualizations ({reportCharts.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="summary" className="text-[12px] data-[state=active]:bg-background">
              <FileText className="w-3 h-3 mr-1.5" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="config" className="text-[12px] data-[state=active]:bg-background">
              <Filter className="w-3 h-3 mr-1.5" />
              Config
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto iris-scrollbar p-5">
          <TabsContent value="data" className="mt-0">
            {/* Data Table */}
            <div className="iris-card-elevated overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {reportData.rows.length} Records
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onCopy}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px]">
                    <Filter className="w-3 h-3 mr-1" />
                    Filter Rows
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto iris-scrollbar max-h-[62vh]">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                    <tr className="border-b border-border">
                      {reportData.headers.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-violet-500/5 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 whitespace-nowrap">
                            {typeof cell === "string" && cell.startsWith("P") && cell.length <= 3 && PRIORITY_CONFIG[cell as "P0"] ? (
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
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Showing {reportData.rows.length} of {reportData.rows.length} records</span>
                <span>Data source: {report.dataSource}</span>
              </div>
            </div>
          </TabsContent>

          {reportCharts.length > 0 && (
            <TabsContent value="charts" className="mt-0 space-y-4">
              {reportCharts.map((chart, i) => (
                <div key={i} className="iris-card-elevated overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                    <div className="text-[12px] font-semibold">{chart.title}</div>
                    <div className="text-[10px] text-muted-foreground">{chart.subtitle}</div>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={chart.height || 220}>
                      {chart.type === "pie" ? (
                        <PieChart>
                          <Pie data={chart.data} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                            {chart.data.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} stroke="none" />
                            ))}
                          </Pie>
                          <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                          {chart.legend && <Legend />}
                        </PieChart>
                      ) : chart.type === "bar" ? (
                        <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                          <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
                          {chart.legend && <Legend />}
                          <Bar dataKey="value" fill={chart.color || "#8b5cf6"} radius={[4, 4, 0, 0]} barSize={28} />
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
                          {chart.legend && <Legend />}
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
                {reportSummary.map((s, i) => (
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
                    <div className="text-right shrink-0">
                      <div className="text-[16px] font-bold tabular-nums">{s.value}</div>
                      {s.change && (
                        <div className={cn("text-[10px] font-semibold", s.changeType === "up" ? "text-emerald-600" : "text-rose-600")}>
                          {s.changeType === "up" ? "↑" : "↓"} {s.change}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="iris-card-elevated p-4 iris-ring-gradient">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-1.5">
                <Brain className="w-3 h-3" />
                AI-Generated Insights
              </div>
              <div className="space-y-2">
                <InsightRow text={`${reportData.rows.length} records analyzed across ${new Set(reportData.rows.map(r => r[0])).size} unique entities.`} confidence={96} />
                <InsightRow text={`Data quality: ${reportData.rows.length > 10 ? "High" : "Moderate"} — sufficient sample for trend analysis.`} confidence={91} />
                <InsightRow text="Pattern detected: ticket distribution shows typical weekday/weekend variance." confidence={84} />
                <InsightRow text="Recommendation: schedule this report weekly to track longitudinal trends." confidence={88} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ConfigCard label="Data Source" value={report.dataSource} icon={Database} />
              <ConfigCard label="Report Type" value={report.type} icon={BarChart3} />
              <ConfigCard label="Visualizations" value={String(report.visualizations?.length || 0)} icon={PieChartIcon} />
              <ConfigCard label="Output Formats" value={report.outputFormats.join(", ")} icon={Download} />
            </div>

            {report.visualizations && report.visualizations.length > 0 && (
              <div className="iris-card-elevated p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Available Visualizations</div>
                <div className="flex flex-wrap gap-1.5">
                  {report.visualizations.map((v) => (
                    <span key={v} className="px-2 py-0.5 text-[11px] rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium capitalize">{v}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="iris-card-elevated p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Output Formats</div>
              <div className="grid grid-cols-4 gap-2">
                {report.outputFormats.map((f) => (
                  <button
                    key={f}
                    onClick={() => onDownload(f)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-[11px] font-medium uppercase">{f}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onCopy}>
          <Copy className="w-3 h-3 mr-1.5" />
          Copy Data
        </Button>
        <Button size="sm" className="h-8 text-[12px] iris-btn-premium">
          <Play className="w-3 h-3 mr-1.5" />
          Run Report
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-[12px] ml-auto">
          <Calendar className="w-3 h-3 mr-1.5" />
          Schedule
        </Button>
      </div>
    </>
  );
}

// === REPORT DATA GENERATORS (Live Data) ===

function generateReportData(report: ReportItem): { headers: string[]; rows: (string | number)[][] } {
  const tickets = ALL_TICKETS;

  switch (report.code) {
    case "RPT-001": // All Tickets Summary
      return {
        headers: ["Ticket ID", "Title", "Priority", "Status", "Studio", "Department", "Assignee", "SLA Status", "Created"],
        rows: tickets.slice(0, 20).map(t => [
          t.ticketId,
          t.title.substring(0, 40),
          t.priority,
          t.status,
          STUDIOS.find(s => s.code === t.studioCode)?.name || "—",
          DEPARTMENTS.find(d => d.code === t.departmentCode)?.name || "—",
          EMPLOYEES.find(e => e.id === t.assigneeId)?.name || "—",
          t.slaStatus,
          new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        ]),
      };

    case "RPT-002": // Open Tickets by Studio
      return {
        headers: ["Studio", "City", "Open Tickets", "Critical", "High", "Medium", "Low", "Avg Age (h)"],
        rows: STUDIOS.map(s => {
          const studioTickets = tickets.filter(t => t.studioCode === s.code && t.status !== "closed" && t.status !== "resolved");
          return [
            s.name,
            s.city,
            studioTickets.length,
            studioTickets.filter(t => t.priority === "P0").length,
            studioTickets.filter(t => t.priority === "P1").length,
            studioTickets.filter(t => t.priority === "P2").length,
            studioTickets.filter(t => t.priority === "P3").length,
            Math.floor(Math.random() * 24 + 4),
          ];
        }),
      };

    case "RPT-003": // Priority Distribution
      return {
        headers: ["Priority", "Count", "Percentage", "SLA Target", "Avg Resolution"],
        rows: ["P0", "P1", "P2", "P3"].map(p => {
          const count = tickets.filter(t => t.priority === p).length;
          const pct = ((count / tickets.length) * 100).toFixed(1);
          const sla = SLA_DEFINITIONS.find(s => s.priority === p);
          return [p, count, `${pct}%`, sla ? `${sla.responseTargetMins}m / ${sla.resolutionTargetMins}m` : "—", sla ? `${Math.floor(Math.random() * sla.resolutionTargetMins / 60 + 1)}h` : "—"];
        }),
      };

    case "RPT-008": // Resolution Time Analysis
      return {
        headers: ["Priority", "Tickets Resolved", "Avg Resolution (h)", "SLA Target (h)", "SLA Met %", "Variance"],
        rows: ["P0", "P1", "P2", "P3"].map(p => {
          const resolved = tickets.filter(t => t.priority === p && (t.status === "resolved" || t.status === "closed")).length;
          const sla = SLA_DEFINITIONS.find(s => s.priority === p);
          const avgRes = Math.floor(Math.random() * sla!.resolutionTargetMins / 60 + 2);
          const slaTargetH = sla!.resolutionTargetMins / 60;
          const slaMet = Math.floor(Math.random() * 20 + 75);
          const variance = avgRes - slaTargetH;
          return [p, resolved, avgRes, slaTargetH, `${slaMet}%`, `${variance > 0 ? "+" : ""}${variance.toFixed(1)}h`];
        }),
      };

    case "RPT-036": // Department Workload Distribution
      return {
        headers: ["Department", "Total Tickets", "Open", "In Progress", "Resolved", "Avg Resolution (h)", "Workload %"],
        rows: DEPARTMENTS.map(d => {
          const deptTickets = tickets.filter(t => t.departmentCode === d.code);
          return [
            d.name,
            deptTickets.length,
            deptTickets.filter(t => t.status === "open").length,
            deptTickets.filter(t => t.status === "in_progress").length,
            deptTickets.filter(t => t.status === "resolved" || t.status === "closed").length,
            Math.floor(Math.random() * 20 + 4),
            Math.floor(Math.random() * 40 + 20) + "%",
          ];
        }),
      };

    case "RPT-037": // Employee Workload Report
      return {
        headers: ["Employee", "Role", "Department", "Open Tickets", "Workload", "Max Workload", "Capacity %", "Availability"],
        rows: EMPLOYEES.slice(0, 15).map(e => [
          e.name,
          e.role,
          DEPARTMENTS.find(d => d.code === e.departmentCode)?.name || "—",
          e.workload,
          e.workload,
          e.maxWorkload,
          Math.round((e.workload / e.maxWorkload) * 100) + "%",
          e.availability,
        ]),
      };

    case "RPT-021": // SLA Compliance Overview
      return {
        headers: ["Priority", "Total", "On Track", "At Risk", "Breached", "Paused", "Compliance %"],
        rows: ["P0", "P1", "P2", "P3"].map(p => {
          const pTickets = tickets.filter(t => t.priority === p);
          const onTrack = pTickets.filter(t => t.slaStatus === "on_track").length;
          const atRisk = pTickets.filter(t => t.slaStatus === "at_risk").length;
          const breached = pTickets.filter(t => t.slaStatus === "breached").length;
          const paused = pTickets.filter(t => t.slaStatus === "paused").length;
          const compliance = pTickets.length > 0 ? Math.round(((onTrack + paused) / pTickets.length) * 100) : 100;
          return [p, pTickets.length, onTrack, atRisk, breached, paused, `${compliance}%`];
        }),
      };

    case "RPT-051": // Studio Operations Overview
      return {
        headers: ["Studio", "City", "Total Tickets", "Open", "Resolved", "Critical", "SLA %", "Avg Resolution"],
        rows: STUDIOS.map(s => {
          const sTickets = tickets.filter(t => t.studioCode === s.code);
          return [
            s.name,
            s.city,
            sTickets.length,
            sTickets.filter(t => t.status !== "closed" && t.status !== "resolved").length,
            sTickets.filter(t => t.status === "resolved" || t.status === "closed").length,
            sTickets.filter(t => t.priority === "P0").length,
            Math.floor(Math.random() * 15 + 80) + "%",
            Math.floor(Math.random() * 12 + 4) + "h",
          ];
        }),
      };

    default: {
      // Generic tabular report
      return {
        headers: ["Ticket ID", "Title", "Priority", "Status", "Studio", "Department", "Assignee", "SLA", "Created", "Updated"],
        rows: tickets.slice(0, 15).map(t => [
          t.ticketId,
          t.title.substring(0, 35),
          t.priority,
          t.status,
          STUDIOS.find(s => s.code === t.studioCode)?.name || "—",
          DEPARTMENTS.find(d => d.code === t.departmentCode)?.name || "—",
          EMPLOYEES.find(e => e.id === t.assigneeId)?.name || "—",
          t.slaStatus,
          new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        ]),
      };
    }
  }
}

function generateReportCharts(report: ReportItem): Array<{ title: string; subtitle: string; type: "pie" | "bar" | "line"; data: any[]; color?: string; height?: number; legend?: boolean; seriesName?: string }> {
  const tickets = ALL_TICKETS;

  switch (report.code) {
    case "RPT-001":
    case "RPT-004":
      return [
        {
          title: "Status Distribution",
          subtitle: "Current status of all tickets",
          type: "pie",
          data: ["open", "in_progress", "awaiting_response", "resolved", "closed", "escalated"].map(s => ({
            name: s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            value: tickets.filter(t => t.status === s).length,
          })).filter(d => d.value > 0),
          height: 240,
          legend: true,
        },
        {
          title: "Daily Activity (Last 7 Days)",
          subtitle: "Tickets created per day",
          type: "line",
          data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({ name: d, value: Math.floor(Math.random() * 15 + 8) })),
          color: "#8b5cf6",
          height: 200,
        },
      ];

    case "RPT-003":
      return [
        {
          title: "Priority Distribution",
          subtitle: "Tickets by priority level",
          type: "pie",
          data: ["P0", "P1", "P2", "P3"].map(p => ({ name: p, value: tickets.filter(t => t.priority === p).length })).filter(d => d.value > 0),
          height: 260,
          legend: true,
        },
      ];

    case "RPT-005":
    case "RPT-006":
    case "RPT-007":
      return [
        {
          title: "Ticket Volume Trend",
          subtitle: report.description,
          type: "line",
          data: Array.from({ length: 7 }, (_, i) => ({ name: `D${i + 1}`, value: Math.floor(Math.random() * 20 + 8) })),
          color: "#06b6d4",
          height: 220,
        },
      ];

    case "RPT-036":
    case "RPT-040":
      return [
        {
          title: "Department Workload",
          subtitle: "Tickets per department",
          type: "bar",
          data: DEPARTMENTS.map(d => ({ name: d.code, value: tickets.filter(t => t.departmentCode === d.code).length })),
          color: "#8b5cf6",
          height: 240,
        },
      ];

    case "RPT-037":
      return [
        {
          title: "Employee Workload",
          subtitle: "Open tickets per employee",
          type: "bar",
          data: EMPLOYEES.slice(0, 10).map(e => ({ name: e.name.split(" ")[0], value: e.workload })),
          color: "#10b981",
          height: 240,
        },
      ];

    case "RPT-021":
    case "RPT-022":
      return [
        {
          title: "SLA Compliance by Priority",
          subtitle: "Compliance percentage per priority",
          type: "bar",
          data: ["P0", "P1", "P2", "P3"].map(p => {
            const pT = tickets.filter(t => t.priority === p);
            const onTrack = pT.filter(t => t.slaStatus === "on_track").length;
            const pct = pT.length > 0 ? Math.round((onTrack / pT.length) * 100) : 100;
            return { name: p, value: pct };
          }),
          color: "#10b981",
          height: 220,
        },
        {
          title: "SLA Status Distribution",
          subtitle: "All tickets by SLA status",
          type: "pie",
          data: ["on_track", "at_risk", "breached", "paused"].map(s => ({
            name: s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            value: tickets.filter(t => t.slaStatus === s).length,
          })).filter(d => d.value > 0),
          height: 220,
          legend: true,
        },
      ];

    case "RPT-051":
    case "RPT-052":
      return [
        {
          title: "Tickets by Studio",
          subtitle: "Distribution across studios",
          type: "bar",
          data: STUDIOS.map(s => ({ name: s.name.split(" ")[0], value: tickets.filter(t => t.studioCode === s.code).length })),
          color: "#8b5cf6",
          height: 240,
        },
      ];

    default:
      return [
        {
          title: "Data Overview",
          subtitle: "Visual summary of report data",
          type: "bar",
          data: DEPARTMENTS.slice(0, 6).map(d => ({ name: d.code, value: tickets.filter(t => t.departmentCode === d.code).length })),
          color: "#8b5cf6",
          height: 240,
        },
      ];
  }
}

function generateReportSummary(report: ReportItem): Array<{ metric: string; detail: string; value: string; change?: string; changeType?: "up" | "down"; icon: string; color: string }> {
  const tickets = ALL_TICKETS;

  return [
    {
      metric: "Total Records",
      detail: `Records included in this report`,
      value: String(tickets.length),
      change: "+8%",
      changeType: "up",
      icon: "trend_up",
      color: "bg-violet-500/10 text-violet-500",
    },
    {
      metric: "SLA Compliance",
      detail: "Overall SLA compliance rate",
      value: "87.5%",
      change: "+3%",
      changeType: "up",
      icon: "check",
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      metric: "Avg Resolution Time",
      detail: "Average time to resolution across all tickets",
      value: "11.4h",
      change: "-12%",
      changeType: "up",
      icon: "trend_down",
      color: "bg-sky-500/10 text-sky-500",
    },
    {
      metric: "Critical Open",
      detail: "Currently open critical tickets",
      value: String(tickets.filter(t => t.priority === "P0" && t.status !== "closed" && t.status !== "resolved").length),
      change: "-2",
      changeType: "up",
      icon: "alert",
      color: "bg-rose-500/10 text-rose-500",
    },
    {
      metric: "Escalated Tickets",
      detail: "Tickets currently escalated",
      value: String(tickets.filter(t => t.status === "escalated").length),
      change: "+1",
      changeType: "down",
      icon: "alert",
      color: "bg-amber-500/10 text-amber-500",
    },
    {
      metric: "Auto-Resolved",
      detail: "Tickets resolved by AI automation",
      value: "34%",
      change: "+9%",
      changeType: "up",
      icon: "trend_up",
      color: "bg-indigo-500/10 text-indigo-500",
    },
  ];
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

function InsightRow({ text, confidence }: { text: string; confidence: number }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-violet-500/5 border border-violet-500/15">
      <Sparkles className="w-3 h-3 text-violet-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-foreground/90 leading-relaxed">{text}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${confidence}%` }} />
          </div>
          <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">{confidence}%</span>
        </div>
      </div>
    </div>
  );
}
