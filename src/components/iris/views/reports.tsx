"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { REPORTS, REPORT_CATEGORIES, ReportItem } from "@/lib/iris/reports";
import { cn } from "@/lib/utils";
import {
  Search,
  FileBarChart,
  Download,
  Copy,
  Eye,
  Calendar,
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
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
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
        if (!r.name.toLowerCase().includes(q) &&
            !r.description.toLowerCase().includes(q) &&
            !r.code.toLowerCase().includes(q)) return false;
      }
      if (category !== "all" && r.category !== category) return false;
      if (type !== "all" && r.type !== type) return false;
      if (format !== "all" && !r.outputFormats.includes(format)) return false;
      return true;
    });
  }, [search, category, type, format]);

  const handleCopy = (report: ReportItem) => {
    navigator.clipboard.writeText(`${report.name}\n${report.code}\n${report.description}\nFormats: ${report.outputFormats.join(", ")}`);
    toast({
      title: "Report details copied",
      description: `${report.name} details are in your clipboard`,
    });
  };

  const handleDownload = (report: ReportItem, format: string) => {
    toast({
      title: `Downloading ${report.name}`,
      description: `Generating ${format.toUpperCase()} export...`,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <FileBarChart className="w-3 h-3 text-violet-500" />
            {REPORTS.length} Reports Available
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Reports Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive reporting across tickets, SLA, departments, AI usage, and more.
          </p>
        </div>
        <Button className="h-8 text-[12px]">
          <Plus className="w-3 h-3 mr-1.5" />
          Custom Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Reports" value={REPORTS.length} icon={FileBarChart} color="violet" />
        <StatCard label="Categories" value={REPORT_CATEGORIES.length} icon={PieChartIcon} color="sky" />
        <StatCard label="Output Formats" value="4" icon={Download} color="emerald" />
        <StatCard label="Scheduled" value="12" icon={Clock} color="amber" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search reports..."
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

      {/* Reports Grid */}
      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {REPORTS.length} reports
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r, i) => (
          <button
            key={r.code}
            onClick={() => setSelectedReport(r)}
            className="text-left iris-card p-3.5 hover:scale-[1.01] transition-transform iris-fade-in-up group"
            style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
          >
            <div className="flex items-start gap-2 mb-2">
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                r.type === "tabular" ? "bg-sky-500/10 text-sky-500" :
                r.type === "chart" ? "bg-violet-500/10 text-violet-500" :
                r.type === "summary" ? "bg-emerald-500/10 text-emerald-500" :
                "bg-amber-500/10 text-amber-500"
              )}>
                {r.type === "tabular" ? <Table className="w-3.5 h-3.5" /> :
                 r.type === "chart" ? <BarChart3 className="w-3.5 h-3.5" /> :
                 r.type === "summary" ? <FileText className="w-3.5 h-3.5" /> :
                 <Grid3x3 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-muted-foreground">{r.code}</div>
                <div className="text-[13px] font-semibold leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                  {r.name}
                </div>
              </div>
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
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto iris-scrollbar">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{selectedReport.code}</span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{selectedReport.category}</Badge>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">{selectedReport.type}</Badge>
              </div>
              <DialogTitle className="text-[16px] leading-tight">{selectedReport.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                <p className="text-[13px] text-foreground/90 leading-relaxed">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <InfoBox label="Data Source" value={selectedReport.dataSource} icon={Database} />
                <InfoBox label="Type" value={selectedReport.type} icon={BarChart3} />
                <InfoBox label="Visualizations" value={selectedReport.visualizations?.length || 0} icon={PieChartIcon} />
              </div>

              {selectedReport.visualizations && selectedReport.visualizations.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Available Visualizations</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReport.visualizations.map((v) => (
                      <span key={v} className="px-2 py-0.5 text-[11px] rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium capitalize">{v}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
                <div className="iris-card p-3 h-[200px]">
                  <ReportPreview report={selectedReport} />
                </div>
              </div>

              {/* Output Formats */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Download as</div>
                <div className="grid grid-cols-4 gap-2">
                  {selectedReport.outputFormats.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleDownload(selectedReport, f)}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                    >
                      <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-[11px] font-medium uppercase">{f}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button className="h-8 flex-1 text-[12px]">
                  <Play className="w-3 h-3 mr-1.5" />
                  Run Report
                </Button>
                <Button variant="outline" className="h-8 text-[12px]" onClick={() => handleCopy(selectedReport)}>
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy Data
                </Button>
                <Button variant="outline" className="h-8 text-[12px]">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ReportPreview({ report }: { report: ReportItem }) {
  // Generate synthetic preview data based on report type
  const data = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      name: `D${i + 1}`,
      value: Math.floor(Math.random() * 50) + 10,
      value2: Math.floor(Math.random() * 40) + 5,
    }));
  }, [report.code]);

  if (report.type === "tabular") {
    return (
      <div className="overflow-hidden h-full">
        <div className="text-[10px] text-muted-foreground mb-2">Sample rows</div>
        <div className="space-y-1">
          {data.slice(0, 6).map((d) => (
            <div key={d.name} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50">
              <span>{d.name}</span>
              <span className="font-mono tabular-nums">{d.value}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{d.value2}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (report.type === "chart") {
    if (report.visualizations?.includes("pie") || report.visualizations?.includes("donut")) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.slice(0, 5)} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
              {data.slice(0, 5).map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i]} stroke="none" />
              ))}
            </Pie>
            <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (report.visualizations?.includes("line")) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
            <defs>
              <linearGradient id="grad-prev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#grad-prev)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
          <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (report.type === "summary") {
    return (
      <div className="grid grid-cols-3 gap-2 h-full">
        {data.slice(0, 3).map((d, i) => (
          <div key={i} className="flex flex-col justify-center p-2 rounded-md bg-muted/30">
            <div className="text-[9px] text-muted-foreground">Metric {i + 1}</div>
            <div className="text-lg font-bold tabular-nums">{d.value}</div>
            <div className="text-[9px] text-muted-foreground">+{d.value2}%</div>
          </div>
        ))}
      </div>
    );
  }

  // Matrix
  return (
    <div className="grid grid-cols-4 gap-1 h-full">
      {Array.from({ length: 16 }).map((_, i) => {
        const intensity = Math.random();
        return (
          <div
            key={i}
            className="rounded"
            style={{
              background: `rgba(139, 92, 246, ${intensity})`,
              opacity: 0.3 + intensity * 0.7,
            }}
          />
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: "violet" | "sky" | "emerald" | "amber" }) {
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

function InfoBox({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </div>
      <div className="text-[12px] font-semibold capitalize">{value}</div>
    </div>
  );
}
