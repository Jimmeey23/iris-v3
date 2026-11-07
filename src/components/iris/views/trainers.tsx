"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { TRAINERS } from "@/lib/iris/iris-constants";
import { cn } from "@/lib/utils";
import {
  Search,
  Users,
  Star,
  TrendingUp,
  Clock,
  Calendar,
  Filter,
  Grid3x3,
  List,
  ChevronRight,
  Award,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock trainer performance data
const TRAINER_DATA = TRAINERS.map((name, i) => ({
  name,
  id: `TRN-${String(i + 1).padStart(3, "0")}`,
  city: i % 3 === 0 ? "Bengaluru" : "Mumbai",
  studio: i % 3 === 0 ? "Kenkere House" : i % 2 === 0 ? "Kwality House" : "Supreme HQ",
  rating: 4.0 + Math.random() * 1.0,
  totalClasses: 50 + Math.floor(Math.random() * 200),
  punctualityScore: 80 + Math.floor(Math.random() * 20),
  lateInstances: Math.floor(Math.random() * 5),
  classesThisMonth: 20 + Math.floor(Math.random() * 30),
  avgClassRating: 4.0 + Math.random() * 1.0,
  formats: ["Barre 57", "Cardio Barre", "Mat 57"].slice(0, 1 + (i % 3)),
  status: i % 7 === 0 ? "on_leave" : "active",
  avatarColor: ["from-blue-500 to-blue-600", "from-purple-500 to-purple-600", "from-green-500 to-green-600", "from-orange-500 to-orange-600"][i % 4],
}));

export function TrainersView() {
  const [search, setSearch] = React.useState("");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"rating" | "punctuality" | "classes">("rating");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [selectedTrainer, setSelectedTrainer] = React.useState<typeof TRAINER_DATA[0] | null>(null);

  const filtered = React.useMemo(() => {
    let result = [...TRAINER_DATA];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    if (cityFilter !== "all") {
      result = result.filter(t => t.city === cityFilter);
    }
    if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "punctuality") result.sort((a, b) => b.punctualityScore - a.punctualityScore);
    else if (sortBy === "classes") result.sort((a, b) => b.totalClasses - a.totalClasses);
    return result;
  }, [search, cityFilter, sortBy]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
            <Users className="w-3 h-3" />
            {TRAINER_DATA.length} Trainers
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">Trainers</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Performance, punctuality, and class ratings across all Physique 57 India trainers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 rounded-md p-0.5">
            <button onClick={() => setView("grid")} className={cn("p-1.5 rounded transition-colors", view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground")}>
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView("list")} className={cn("p-1.5 rounded transition-colors", view === "list" ? "bg-background shadow-sm" : "text-muted-foreground")}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-8 w-[130px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="punctuality">Punctuality</SelectItem>
              <SelectItem value="classes">Most Classes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total Trainers" value={TRAINER_DATA.length} icon={Users} />
        <StatCard label="Avg Rating" value={(TRAINER_DATA.reduce((s, t) => s + t.rating, 0) / TRAINER_DATA.length).toFixed(1)} icon={Star} />
        <StatCard label="Active" value={TRAINER_DATA.filter(t => t.status === "active").length} icon={CheckCircle2} />
        <StatCard label="Late Incidents" value={TRAINER_DATA.reduce((s, t) => s + t.lateInstances, 0)} icon={AlertTriangle} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search trainers..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-[12px]" />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="h-8 w-[120px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            <SelectItem value="Mumbai">Mumbai</SelectItem>
            <SelectItem value="Bengaluru">Bengaluru</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trainers Grid/List */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelectedTrainer(t)}
              className="text-left iris-card p-4 hover:border-primary/30 transition-colors iris-fade-in-up group"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarFallback className={cn("bg-gradient-to-br text-white text-sm font-semibold", t.avatarColor)}>
                    {t.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.studio} · {t.city}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {t.status === "active" ? (
                      <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-green-500/10 text-green-600">Active</span>
                    ) : (
                      <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-orange-500/10 text-orange-600">On Leave</span>
                    )}
                    {t.lateInstances > 0 && (
                      <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-amber-500/10 text-amber-600">{t.lateInstances} late</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Rating" value={t.rating.toFixed(1)} icon={Star} color="text-amber-500" />
                <Metric label="Classes" value={String(t.totalClasses)} icon={Calendar} />
                <Metric label="Punctuality" value={`${t.punctualityScore}%`} icon={Clock} color={t.punctualityScore > 90 ? "text-green-500" : "text-amber-500"} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="iris-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Trainer</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Studio</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Rating</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Classes</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Punctuality</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Late</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} onClick={() => setSelectedTrainer(t)} className="hover:bg-primary/5 cursor-pointer transition-colors group">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className={cn("bg-gradient-to-br text-white text-[10px] font-semibold", t.avatarColor)}>
                          {t.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-[12px] font-medium group-hover:text-primary transition-colors">{t.name}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">{t.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px]">{t.studio}</td>
                  <td className="px-3 py-3"><span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-500" />{t.rating.toFixed(1)}</span></td>
                  <td className="px-3 py-3 text-[11px] tabular-nums">{t.totalClasses}</td>
                  <td className="px-3 py-3"><span className={cn("text-[11px] font-medium", t.punctualityScore > 90 ? "text-green-600" : "text-amber-600")}>{t.punctualityScore}%</span></td>
                  <td className="px-3 py-3"><span className={cn("text-[11px]", t.lateInstances > 0 ? "text-amber-600 font-medium" : "text-muted-foreground")}>{t.lateInstances}</span></td>
                  <td className="px-3 py-3">
                    <span className={cn("text-[9px] font-semibold px-1.5 py-px rounded", t.status === "active" ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600")}>
                      {t.status === "active" ? "Active" : "On Leave"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trainer Detail Drawer */}
      {selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-sm" onClick={() => setSelectedTrainer(null)}>
          <div className="bg-card border-l border-border w-full max-w-md h-full overflow-y-auto p-6 iris-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-6">
              <Avatar className="w-16 h-16 shrink-0">
                <AvatarFallback className={cn("bg-gradient-to-br text-white text-lg font-semibold", selectedTrainer.avatarColor)}>
                  {selectedTrainer.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-[18px] font-semibold">{selectedTrainer.name}</div>
                <div className="text-[11px] text-muted-foreground">{selectedTrainer.studio} · {selectedTrainer.city}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{selectedTrainer.id}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTrainer(null)}>
                <X />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <MetricCard label="Rating" value={selectedTrainer.rating.toFixed(1)} icon={Star} color="text-amber-500" />
              <MetricCard label="Total Classes" value={String(selectedTrainer.totalClasses)} icon={Calendar} />
              <MetricCard label="Punctuality" value={`${selectedTrainer.punctualityScore}%`} icon={Clock} color={selectedTrainer.punctualityScore > 90 ? "text-green-500" : "text-amber-500"} />
              <MetricCard label="Late Incidents" value={String(selectedTrainer.lateInstances)} icon={AlertTriangle} color={selectedTrainer.lateInstances > 0 ? "text-amber-500" : "text-green-500"} />
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Class Formats</div>
                <div className="flex flex-wrap gap-1">
                  {selectedTrainer.formats.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">This Month</div>
                <div className="text-[13px] font-semibold">{selectedTrainer.classesThisMonth} classes taught</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</div>
                <div className={cn("text-[12px] font-semibold", selectedTrainer.status === "active" ? "text-green-600" : "text-orange-600")}>
                  {selectedTrainer.status === "active" ? "Active — Available for classes" : "On Leave — Not available"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="iris-card p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-[16px] font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color?: string }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border text-center">
      <Icon className={cn("w-3 h-3 mx-auto mb-1", color || "text-muted-foreground")} />
      <div className="text-[12px] font-bold tabular-nums">{value}</div>
      <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color?: string }) {
  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("w-3.5 h-3.5", color || "text-muted-foreground")} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[18px] font-bold tabular-nums">{value}</div>
    </div>
  );
}

import { X } from "lucide-react";
