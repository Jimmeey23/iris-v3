"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";
import { STUDIOS, DEPARTMENTS, EMPLOYEES } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Sparkles,
  Target,
  Clock,
  Users,
  Building2,
  Zap,
  AlertTriangle,
  Lightbulb,
  Activity,
  Gauge,
  Layers,
  Filter,
  Download,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Cpu,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ZAxis,
} from "recharts";
import { Card, CardHeader, CardContent } from "./overview";

const CHART_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

export function AnalyticsView() {
  const { setCurrentView } = useAppStore();
  const [dateRange, setDateRange] = React.useState("30d");

  // Ticket volume by day
  const volumeData = React.useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => i);
    return days.map((i) => ({
      day: `D${i + 1}`,
      created: 8 + Math.floor(Math.random() * 12),
      resolved: 6 + Math.floor(Math.random() * 11),
      escalated: Math.floor(Math.random() * 3),
    }));
  }, []);

  // Resolution time trend
  const resolutionTimeData = React.useMemo(() => {
    const months = ["Jul", "Aug", "Sep", "Oct", "Nov"];
    return months.map((m) => ({
      month: m,
      avg: 8 + Math.random() * 4,
      target: 12,
      p0: 2 + Math.random(),
      p1: 6 + Math.random() * 2,
      p2: 14 + Math.random() * 4,
      p3: 24 + Math.random() * 6,
    }));
  }, []);

  // Department performance matrix
  const deptMatrix = React.useMemo(() => {
    return DEPARTMENTS.map((d) => ({
      name: d.name.split(" ")[0],
      dept: d.name,
      volume: ALL_TICKETS.filter((t) => t.departmentCode === d.code).length,
      resolved: ALL_TICKETS.filter((t) => t.departmentCode === d.code && (t.status === "resolved" || t.status === "closed")).length,
      avgResolution: 4 + Math.random() * 16,
      slaCompliance: 75 + Math.random() * 22,
    }));
  }, []);

  // Employee performance
  const employeeData = React.useMemo(() => {
    return EMPLOYEES.slice(0, 10).map((e) => ({
      name: e.name.split(" ")[0],
      fullName: e.name,
      resolved: Math.floor(Math.random() * 25) + 5,
      avgTime: 4 + Math.random() * 12,
      slaScore: 78 + Math.random() * 20,
    })).sort((a, b) => b.resolved - a.resolved);
  }, []);

  // Recurring issues
  const recurringIssues = [
    { category: "HVAC Issues", count: 12, trend: "+3", severity: "high" },
    { category: "Membership Freezes", count: 8, trend: "+1", severity: "medium" },
    { category: "Payment Sync", count: 7, trend: "+2", severity: "high" },
    { category: "Sound System", count: 5, trend: "-1", severity: "low" },
    { category: "Booking Errors", count: 4, trend: "+1", severity: "medium" },
  ];

  // SLA distribution
  const slaDistribution = [
    { name: "On Track", value: 78, color: "#10b981" },
    { name: "At Risk", value: 14, color: "#f59e0b" },
    { name: "Breached", value: 6, color: "#f43f5e" },
    { name: "Paused", value: 2, color: "#94a3b8" },
  ];

  // Source distribution
  const sourceData = [
    { name: "AI Assistant", value: 68, color: "#8b5cf6" },
    { name: "Manual", value: 18, color: "#06b6d4" },
    { name: "Email", value: 9, color: "#f59e0b" },
    { name: "WhatsApp", value: 5, color: "#10b981" },
  ];

  // Resolution efficiency scatter
  const scatterData = ALL_TICKETS.map((t) => ({
    x: Math.random() * 24,
    y: Math.random() * 100,
    z: Math.random() * 100,
    priority: t.priority,
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <Activity className="w-3 h-3 text-violet-500" />
            Advanced Analytics
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Operations Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deep analytics, insights & AI-driven recommendations across all Physique 57 India studios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 rounded-md p-0.5">
            {["7d", "30d", "90d", "1y"].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded transition-colors",
                  dateRange === r ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[12px] font-medium hover:bg-muted/40 transition-colors">
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard label="Total Volume" value="247" trend="+8%" trendUp icon={Layers} color="violet" />
        <KPICard label="Avg Resolution" value="11.4h" trend="-12%" trendUp icon={Clock} color="emerald" />
        <KPICard label="SLA Compliance" value="87.5%" trend="+3%" trendUp icon={Gauge} color="sky" />
        <KPICard label="AI Auto-Resolve" value="34%" trend="+9%" trendUp icon={Sparkles} color="amber" />
        <KPICard label="Reopened" value="4.2%" trend="-1%" trendUp icon={Activity} color="rose" />
        <KPICard label="Active Users" value="42" trend="+5" trendUp icon={Users} color="indigo" />
      </div>

      {/* Main analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket Volume Trend */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Ticket Volume Trends"
            subtitle="Created vs Resolved vs Escalated (last 30 days)"
            icon={LineChartIcon}
            action={
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500" />Created</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" />Resolved</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" />Escalated</div>
              </div>
            }
          />
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={volumeData}>
                <defs>
                  <linearGradient id="grad-v" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={2} fill="url(#grad-v)" />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="escalated" name="Escalated" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SLA Distribution */}
        <Card>
          <CardHeader title="SLA Distribution" subtitle="Current status across all tickets" icon={Gauge} />
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart innerRadius="35%" outerRadius="100%" data={slaDistribution} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={6}>
                  {slaDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </RadialBar>
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {slaDistribution.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground flex-1">{s.name}</span>
                  <span className="font-semibold tabular-nums">{s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resolution Time by Priority */}
        <Card>
          <CardHeader title="Resolution Time by Priority" subtitle="Average hours per priority level" icon={Clock} />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resolutionTimeData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="month" type="category" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={30} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
                <Bar dataKey="p0" name="P0" stackId="a" fill="#f43f5e" />
                <Bar dataKey="p1" name="P1" stackId="a" fill="#f59e0b" />
                <Bar dataKey="p2" name="P2" stackId="a" fill="#06b6d4" />
                <Bar dataKey="p3" name="P3" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Performance Matrix */}
        <Card className="lg:col-span-2">
          <CardHeader title="Department Performance Matrix" subtitle="Volume, resolution, and SLA compliance" icon={Building2} />
          <CardContent>
            <div className="overflow-x-auto iris-scrollbar">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Department</th>
                    <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Volume</th>
                    <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Resolved</th>
                    <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Avg Hours</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-32">SLA %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deptMatrix.map((d) => {
                    const slaColor = d.slaCompliance > 90 ? "text-emerald-500" : d.slaCompliance > 80 ? "text-amber-500" : "text-rose-500";
                    return (
                      <tr key={d.dept} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2 font-medium">{d.dept}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{d.volume}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{d.resolved}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{d.avgResolution.toFixed(1)}h</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  d.slaCompliance > 90 ? "bg-emerald-500" : d.slaCompliance > 80 ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${d.slaCompliance}%` }}
                              />
                            </div>
                            <span className={cn("text-[10px] font-semibold tabular-nums", slaColor)}>{d.slaCompliance.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader title="Ticket Sources" subtitle="How tickets enter the system" icon={PieChartIcon} />
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sourceData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                  {sourceData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {sourceData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground flex-1">{s.name}</span>
                  <span className="font-semibold tabular-nums">{s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader title="Top Performers" subtitle="By resolution volume" icon={Users} />
          <CardContent>
            <div className="space-y-2">
              {employeeData.slice(0, 6).map((e, i) => (
                <div key={e.fullName} className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold",
                    i === 0 ? "bg-amber-500/15 text-amber-600" :
                    i === 1 ? "bg-slate-400/15 text-slate-500" :
                    i === 2 ? "bg-orange-700/15 text-orange-700" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{e.fullName}</div>
                    <div className="text-[10px] text-muted-foreground">{e.resolved} resolved · {e.avgTime.toFixed(1)}h avg</div>
                  </div>
                  <div className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {e.slaScore.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recurring Issues */}
        <Card className="lg:col-span-2">
          <CardHeader title="Recurring Issue Patterns" subtitle="Issues appearing multiple times" icon={AlertTriangle} />
          <CardContent>
            <div className="space-y-3">
              {recurringIssues.map((issue) => (
                <div key={issue.category} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "w-2 h-10 rounded-full",
                    issue.severity === "high" ? "bg-rose-500" : issue.severity === "medium" ? "bg-amber-500" : "bg-sky-500"
                  )} />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{issue.category}</div>
                    <div className="text-[10px] text-muted-foreground">{issue.count} occurrences in last 30 days</div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md",
                    issue.trend.startsWith("+") ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10"
                  )}>
                    {issue.trend.startsWith("+") ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {issue.trend}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resolution Efficiency Scatter */}
        <Card>
          <CardHeader title="Resolution Efficiency" subtitle="Time vs Volume distribution" icon={BarChart3} />
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="x" name="Hours" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="y" name="Count" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <ZAxis dataKey="z" range={[30, 200]} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="#8b5cf6" fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="iris-ai-border">
        <CardHeader
          title="AI-Powered Insights & Recommendations"
          subtitle="Generated by IRIS Intelligence Agent · 4 insights"
          icon={Brain}
          action={<Sparkles className="w-4 h-4 text-violet-500" />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightCard
              type="pattern"
              title="Kwality House HVAC Pattern"
              description="AC issues at Kwality House have increased 40% month-over-month. Pattern suggests aging equipment. Recommend preventive maintenance contract review."
              confidence={94}
              impact="High"
              action="Schedule maintenance review"
            />
            <InsightCard
              type="bottleneck"
              title="Payment Resolution Bottleneck"
              description="Payment-related tickets average 28% over SLA target. Root cause: manual verification step. Recommend automating bank statement verification."
              confidence={89}
              impact="Medium"
              action="Review automation options"
            />
            <InsightCard
              type="recommendation"
              title="Workload Rebalancing Required"
              description="Facilities team carries 67% higher workload than average. Cross-training Front Desk staff on basic maintenance could reduce load by ~20%."
              confidence={91}
              impact="Medium"
              action="Plan cross-training"
            />
            <InsightCard
              type="pattern"
              title="Bengaluru Check-in Pattern"
              description="Kenkere House has 3x higher Momence check-in errors than other studios. Possible staff training gap. Recommend refresher session."
              confidence={86}
              impact="Medium"
              action="Schedule training"
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Insights Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="iris-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <div className="text-[13px] font-semibold">Process Recommendation</div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
            Implement pre-class AC check protocol during summer months. Could prevent ~60% of critical HVAC tickets.
          </p>
          <div className="text-[10px] text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1 cursor-pointer">
            View full recommendation <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>

        <div className="iris-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-violet-500" />
            <div className="text-[13px] font-semibold">Automation Opportunity</div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
            34% of membership freeze requests could be auto-processed with rule-based approval (saving ~12 hours/week).
          </p>
          <div className="text-[10px] text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1 cursor-pointer">
            Explore automation <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>

        <div className="iris-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-500" />
            <div className="text-[13px] font-semibold">SLA Improvement</div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
            Adjusting P2 SLA target from 48h to 36h is achievable based on current resolution trends. Could improve client satisfaction.
          </p>
          <div className="text-[10px] text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1 cursor-pointer">
            Review SLA settings <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>

      {/* Advanced AI Features */}
      <Card className="iris-ai-border">
        <CardHeader
          title="Advanced AI Pattern Detection & Predictive Analytics"
          subtitle="Smart features powered by IRIS Intelligence Engine"
          icon={Sparkles}
          action={<Brain className="w-4 h-4 text-violet-500" />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Pattern Detection */}
            <AdvancedAICard
              title="Pattern Detection"
              icon={Activity}
              color="violet"
              metrics={[
                { label: "Patterns detected", value: "12", trend: "+3" },
                { label: "Confidence avg", value: "89%", trend: "+2%" },
              ]}
              items={[
                "HVAC failures cluster on Mondays at Kwality House",
                "Payment sync errors spike after weekend batching",
                "Membership freeze requests increase month-end",
                "Sound system issues correlate with high humidity",
              ]}
            />

            {/* Predictive Analytics */}
            <AdvancedAICard
              title="Predictive Analytics"
              icon={TrendingUp}
              color="emerald"
              metrics={[
                { label: "Predictions made", value: "47", trend: "+12" },
                { label: "Accuracy", value: "91%", trend: "+4%" },
              ]}
              items={[
                "Predicted 3 HVAC failures next week — preventive action recommended",
                "Q4 ticket volume forecast: +15% (seasonal pattern)",
                "Bengaluru studio likely to need additional front desk support",
                "Payment issue resolution time trending down — automation working",
              ]}
            />

            {/* Smart Auto-Suggestions */}
            <AdvancedAICard
              title="Smart Auto-Suggestions"
              icon={Lightbulb}
              color="amber"
              metrics={[
                { label: "Suggestions active", value: "8", trend: "+2" },
                { label: "Acceptance rate", value: "73%", trend: "+8%" },
              ]}
              items={[
                "Auto-tag new tickets with 94% accuracy",
                "Suggest assignee based on historical resolution success",
                "Recommend priority based on impact analysis",
                "Pre-fill ticket fields from similar past issues",
              ]}
            />

            {/* Anomaly Detection */}
            <AdvancedAICard
              title="Anomaly Detection"
              icon={AlertTriangle}
              color="rose"
              metrics={[
                { label: "Anomalies flagged", value: "3", trend: "—" },
                { label: "False positive rate", value: "4%", trend: "-1%" },
              ]}
              items={[
                "Unusual spike in P0 tickets at Supreme HQ (last 24h)",
                "Resolution time anomaly detected for IT department",
                "Reopened ticket rate above baseline for membership issues",
              ]}
            />

            {/* Sentiment Analysis */}
            <AdvancedAICard
              title="Client Sentiment Analysis"
              icon={Brain}
              color="sky"
              metrics={[
                { label: "Tickets analyzed", value: "156", trend: "+23" },
                { label: "Negative sentiment", value: "12%", trend: "-3%" },
              ]}
              items={[
                "Client frustration detected in 4 tickets — priority follow-up recommended",
                "Positive feedback trend on resolution speed (+18%)",
                "Complaint language severity decreasing month-over-month",
              ]}
            />

            {/* Smart Routing Optimization */}
            <AdvancedAICard
              title="Smart Routing Optimization"
              icon={Zap}
              color="indigo"
              metrics={[
                { label: "Routing accuracy", value: "96%", trend: "+2%" },
                { label: "Avg assign time", value: "0.3s", trend: "-0.1s" },
              ]}
              items={[
                "ML model retrained on 2,847 historical tickets",
                "Workload balancing active across all departments",
                "Escalation prediction prevents 89% of SLA breaches",
                "Cross-studio routing optimized for Bengaluru/Mumbai split",
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Decision Log */}
      <Card>
        <CardHeader
          title="AI Decision Log"
          subtitle="Recent automated decisions made by IRIS agents"
          icon={Cpu}
        />
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto iris-scrollbar">
            {[
              { time: "2m ago", agent: "Routing Agent", decision: "Auto-assigned IRIS-2026-0143 to Devraj Singh (96% match)", confidence: 96, status: "applied" },
              { time: "8m ago", agent: "Pattern Detection", decision: "Flagged anomalous P0 spike at Supreme HQ", confidence: 87, status: "alert" },
              { time: "15m ago", agent: "SLA Agent", decision: "Auto-escalated IRIS-2026-0138 to Operations Manager (breach risk)", confidence: 100, status: "applied" },
              { time: "23m ago", agent: "Quality Agent", decision: "Verified Momence credit adjustment for MM-88214", confidence: 98, status: "verified" },
              { time: "1h ago", agent: "Predictive", decision: "Forecasted 3 HVAC failures next week — preventive ticket suggested", confidence: 84, status: "suggested" },
              { time: "2h ago", agent: "Sentiment", decision: "Detected negative sentiment in client complaint — priority flagged", confidence: 79, status: "flagged" },
              { time: "3h ago", agent: "Classification", decision: "Reclassified IRIS-2026-0135 from IT to Membership (higher confidence)", confidence: 92, status: "applied" },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-muted/30 transition-colors">
                <div className="text-[9px] text-muted-foreground tabular-nums shrink-0 w-12">{log.time}</div>
                <div className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0",
                  log.agent === "Routing Agent" ? "bg-emerald-500/10 text-emerald-600" :
                  log.agent === "Pattern Detection" ? "bg-rose-500/10 text-rose-600" :
                  log.agent === "SLA Agent" ? "bg-amber-500/10 text-amber-600" :
                  log.agent === "Quality Agent" ? "bg-indigo-500/10 text-indigo-600" :
                  log.agent === "Predictive" ? "bg-violet-500/10 text-violet-600" :
                  log.agent === "Sentiment" ? "bg-sky-500/10 text-sky-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {log.agent}
                </div>
                <div className="flex-1 min-w-0 text-[11px] truncate">{log.decision}</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${log.confidence}%` }} />
                  </div>
                  <span className="text-[9px] font-semibold tabular-nums text-muted-foreground w-6">{log.confidence}%</span>
                </div>
                <span className={cn(
                  "text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 capitalize",
                  log.status === "applied" ? "bg-emerald-500/10 text-emerald-600" :
                  log.status === "alert" ? "bg-rose-500/10 text-rose-600" :
                  log.status === "verified" ? "bg-indigo-500/10 text-indigo-600" :
                  log.status === "suggested" ? "bg-violet-500/10 text-violet-600" :
                  "bg-amber-500/10 text-amber-600"
                )}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  label,
  value,
  trend,
  trendUp,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: "violet" | "emerald" | "sky" | "amber" | "rose" | "indigo";
}) {
  const colors = {
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    sky: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
  };
  return (
    <div className="iris-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", colors[color])}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <div className="text-xl font-bold tabular-nums iris-ticker">{value}</div>
      <div className={cn("text-[10px] font-medium mt-1 flex items-center gap-0.5", trendUp ? "text-emerald-500" : "text-rose-500")}>
        {trendUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        {trend} vs last period
      </div>
    </div>
  );
}

function InsightCard({
  type,
  title,
  description,
  confidence,
  impact,
  action,
}: {
  type: "pattern" | "bottleneck" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  impact: "High" | "Medium" | "Low";
  action: string;
}) {
  const icons = { pattern: TrendingUp, bottleneck: AlertTriangle, recommendation: Sparkles };
  const colors = {
    pattern: "text-violet-500 bg-violet-500/10",
    bottleneck: "text-amber-500 bg-amber-500/10",
    recommendation: "text-emerald-500 bg-emerald-500/10",
  };
  const impactColors = { High: "text-rose-600 bg-rose-500/10", Medium: "text-amber-600 bg-amber-500/10", Low: "text-sky-600 bg-sky-500/10" };
  const Icon = icons[type];
  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:border-violet-500/30 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", colors[type])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight">{title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{type}</div>
            <div className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", impactColors[impact])}>{impact} Impact</div>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{description}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="text-[10px] text-muted-foreground">Confidence</div>
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${confidence}%` }} />
          </div>
          <span className="text-[10px] font-semibold tabular-nums">{confidence}%</span>
        </div>
        <button className="text-[11px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:gap-1.5 transition-all whitespace-nowrap">
          {action} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AdvancedAICard({
  title,
  icon: Icon,
  color,
  metrics,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "violet" | "emerald" | "amber" | "rose" | "sky" | "indigo";
  metrics: Array<{ label: string; value: string; trend: string }>;
  items: string[];
}) {
  const colors = {
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20",
    sky: "from-sky-500/10 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20",
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  };
  const colorClass = colors[color];
  return (
    <div className={cn("iris-card-elevated p-3 bg-gradient-to-br", colorClass)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-card/80 backdrop-blur")}>
          <Icon className={cn("w-4 h-4", colorClass.split(" ").find((c) => c.startsWith("text")))} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-tight">{title}</div>
        </div>
        <Sparkles className={cn("w-3 h-3", colorClass.split(" ").find((c) => c.startsWith("text")))} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((m, i) => (
          <div key={i} className="p-2 rounded-md bg-card/60 backdrop-blur border border-border/50">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold tabular-nums">{m.value}</span>
              {m.trend !== "—" && (
                <span className={cn("text-[9px] font-semibold", m.trend.startsWith("-") ? "text-rose-500" : "text-emerald-500")}>
                  {m.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed p-1.5 rounded-md bg-card/40">
            <div className={cn("w-1 h-1 rounded-full mt-1.5 shrink-0", colorClass.split(" ").find((c) => c.startsWith("text")))} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
