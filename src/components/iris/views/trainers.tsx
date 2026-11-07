"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { EMPLOYEES } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import {
  Search, Star, Heart, AlertTriangle, ChevronRight, GraduationCap,
  TrendingUp, Clock, Calendar, X, Download, Radio, Award,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TrainerData {
  id: string;
  name: string;
  city: string;
  primaryStudio: string;
  studios: string[];
  rating: number;
  totalClasses: number;
  punctualityScore: number;
  lateInstances: number;
  classesThisMonth: number;
  assessmentCount: number;
  complimentCount: number;
  issueCount: number;
  avgScore: number | null;
  band: string;
  bandTone: "green" | "amber" | "red" | "";
  totalTickets: number;
  status: "active" | "on_leave";
  reportingManager: string;
}

const TRAINER_DATA: TrainerData[] = EMPLOYEES
  .filter(e => e.departmentCode === "TRN")
  .map((e, i) => {
    const score = 65 + Math.floor(Math.random() * 30);
    return {
      id: e.id,
      name: e.name,
      city: e.location === "Bengaluru" ? "Bengaluru" : "Mumbai",
      primaryStudio: e.studioCodes.includes("KHB") ? "Kenkere House" : "Kwality House",
      studios: e.studioCodes.includes("KHB") ? ["Kenkere House"] : ["Kwality House", "Supreme HQ"],
      rating: 3.8 + Math.random() * 1.2,
      totalClasses: 50 + Math.floor(Math.random() * 200),
      punctualityScore: 80 + Math.floor(Math.random() * 20),
      lateInstances: Math.floor(Math.random() * 5),
      classesThisMonth: 20 + Math.floor(Math.random() * 30),
      assessmentCount: Math.floor(Math.random() * 8) + 1,
      complimentCount: Math.floor(Math.random() * 15),
      issueCount: Math.floor(Math.random() * 3),
      avgScore: Math.random() > 0.2 ? score : null,
      band: score >= 80 ? "Excelling" : score >= 65 ? "Developing" : "Needs focus",
      bandTone: score >= 80 ? "green" : score >= 65 ? "amber" : "red",
      totalTickets: Math.floor(Math.random() * 10),
      status: i % 15 === 0 ? "on_leave" : "active",
      reportingManager: e.reportingManager || "",
    };
  });

export function TrainersView() {
  const [search, setSearch] = React.useState("");
  const [selectedTrainer, setSelectedTrainer] = React.useState<TrainerData | null>(null);
  const [listening, setListening] = React.useState(true);

  const filtered = React.useMemo(() => {
    if (!search) return TRAINER_DATA;
    const q = search.toLowerCase();
    return TRAINER_DATA.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.primaryStudio.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = React.useMemo(() => {
    const cityOrder = (city: string) => city === "Mumbai" ? 0 : 1;
    const byCity = new Map<string, TrainerData[]>();
    for (const t of filtered) {
      if (!byCity.has(t.city)) byCity.set(t.city, []);
      byCity.get(t.city)!.push(t);
    }
    return [...byCity.entries()]
      .sort(([a], [b]) => cityOrder(a) - cityOrder(b))
      .map(([city, people]) => ({
        city,
        people: people.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filtered]);

  const withScores = TRAINER_DATA.filter(t => t.avgScore !== null);
  const orgAvg = withScores.length ? Math.round(withScores.reduce((n, t) => n + (t.avgScore || 0), 0) / withScores.length) : null;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Hero - matching reference repo's ImageStreamHero style */}
      <div className="relative overflow-hidden rounded-2xl border border-border p-8 iris-fade-in-up" style={{ background: "linear-gradient(135deg, rgba(0,131,255,0.06), transparent)" }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #0083ff, transparent 70%)", animation: "iris-orb-1 8s ease-in-out infinite" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Training & Quality</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Trainer Reviews</h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-lg">
            Every assessment and every piece of feedback, in one scorecard. Weighted evaluation scores, member compliments and logged concerns - combined per trainer.
          </p>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setListening(v => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors", listening ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border bg-muted text-muted-foreground")}
            >
              <Radio className="w-2.5 h-2.5" style={{ color: listening ? "#34c759" : undefined }} />
              {listening ? "Listening" : "Paused"}
            </button>
            {orgAvg !== null && (
              <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", orgAvg >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : orgAvg >= 65 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                Org average {orgAvg}%
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
              {TRAINER_DATA.length} trainers tracked
            </Badge>
          </div>
        </div>
        <style>{`@keyframes iris-orb-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,20px) scale(1.1); } }`}</style>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input placeholder="Find a trainer, studio or city..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-[12px]" />
      </div>

      {/* Trainer groups by city */}
      <div className="space-y-6">
        {grouped.map(group => (
          <section key={group.city}>
            <header className="flex items-center gap-2 mb-3">
              <h2 className="text-[14px] font-semibold">{group.city} trainers</h2>
              <span className="text-[11px] text-muted-foreground">{group.people.length} {group.people.length === 1 ? "trainer" : "trainers"}</span>
              <div className="flex-1 h-px bg-border" />
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.people.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrainer(t)}
                  className="text-left iris-card p-4 hover:border-primary/30 transition-all iris-fade-in-up group"
                  style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
                >
                  {/* Head row: avatar + name + score */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-12 h-12 shrink-0 ring-2 ring-border">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold">
                        {t.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold truncate group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {t.band} - {t.studios.length} {t.studios.length === 1 ? "studio" : "studios"}
                      </p>
                    </div>
                    {t.avgScore !== null ? (
                      <Badge className={cn("text-[10px] font-bold", t.bandTone === "green" ? "bg-emerald-500/10 text-emerald-600" : t.bandTone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600")}>
                        {t.avgScore}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">No assessments</Badge>
                    )}
                  </div>
                  {/* Tags row */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-muted-foreground">
                      <Star className="w-2.5 h-2.5" />
                      {t.assessmentCount} assessments
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-muted-foreground">
                      <Heart className="w-2.5 h-2.5" />
                      {t.complimentCount} compliments
                    </span>
                    {t.issueCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/10 text-rose-600">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {t.issueCount} flagged
                      </span>
                    )}
                  </div>
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">{t.totalTickets} linked tickets</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-medium", t.punctualityScore > 90 ? "text-emerald-500" : "text-amber-500")}>
                        {t.punctualityScore}% punctual
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Trainer Report Modal - matching reference repo structure */}
      {selectedTrainer && (
        <TrainerReportModal trainer={selectedTrainer} onClose={() => setSelectedTrainer(null)} />
      )}
    </div>
  );
}

function TrainerReportModal({ trainer, onClose }: { trainer: TrainerData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto iris-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center gap-4 z-10">
          <Avatar className="w-14 h-14 shrink-0 ring-2 ring-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-base font-semibold">
              {trainer.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold tracking-tight">{trainer.name}</h2>
            <p className="text-[11px] text-muted-foreground">{trainer.band} - {trainer.city} - Reports to {trainer.reportingManager}</p>
          </div>
          {trainer.avgScore !== null && (
            <div className="text-right">
              <div className={cn("text-[22px] font-bold tabular-nums", trainer.bandTone === "green" ? "text-emerald-500" : trainer.bandTone === "amber" ? "text-amber-500" : "text-rose-500")}>
                {trainer.avgScore}%
              </div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">avg score</div>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-3">
            <KPITile label="Assessments" value={String(trainer.assessmentCount)} sub="total reviews" tone="var(--primary)" />
            <KPITile label="Compliments" value={String(trainer.complimentCount)} sub="from members" tone="#34c759" />
            <KPITile label="Issues" value={String(trainer.issueCount)} sub="flagged concerns" tone={trainer.issueCount > 0 ? "#ff9500" : "#34c759"} />
            <KPITile label="Punctuality" value={`${trainer.punctualityScore}%`} sub={`${trainer.lateInstances} late instances`} tone={trainer.punctualityScore > 90 ? "#34c759" : "#ff9500"} pct={trainer.punctualityScore} />
          </div>

          {/* Score dial + band */}
          {trainer.avgScore !== null && (
            <div className="flex items-center gap-6 p-4 rounded-xl border border-border bg-muted/20">
              <ScoreDial value={trainer.avgScore} />
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Performance Band</div>
                <div className={cn("text-[20px] font-bold", trainer.bandTone === "green" ? "text-emerald-500" : trainer.bandTone === "amber" ? "text-amber-500" : "text-rose-500")}>
                  {trainer.band}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {trainer.bandTone === "green" ? "Consistently delivering above expectations. Recognise and retain." : trainer.bandTone === "amber" ? "Meeting expectations with room to grow. Schedule a coaching conversation." : "Below expected performance. Immediate coaching plan required."}
                </p>
              </div>
            </div>
          )}

          {/* Studios */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Studios Reviewed At</div>
            <div className="flex flex-wrap gap-1.5">
              {trainer.studios.map(s => (
                <Badge key={s} variant="outline" className="text-[10px] h-5 px-2">{s}</Badge>
              ))}
            </div>
          </div>

          {/* Classes this month */}
          <div className="flex items-center gap-4 p-3 rounded-lg border border-border">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold">{trainer.classesThisMonth} classes this month</div>
              <div className="text-[10px] text-muted-foreground">{trainer.totalClasses} total classes all-time</div>
            </div>
            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", trainer.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
              {trainer.status === "active" ? "Active" : "On Leave"}
            </Badge>
          </div>

          {/* Linked tickets */}
          {trainer.totalTickets > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linked Tickets ({trainer.totalTickets})</div>
              <div className="space-y-1">
                {Array.from({ length: Math.min(trainer.totalTickets, 3) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <span className="text-[10px] font-mono text-muted-foreground">IRIS-2026-{String(1000 + i).padStart(4, "0")}</span>
                    <span className="text-[11px] flex-1 truncate">Trainer-related ticket #{i + 1}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreDial({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? "#34c759" : value >= 65 ? "#ff9500" : "#ff3b30";
  return (
    <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
      <svg viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - Math.min(100, Math.max(0, value)) / 100 * c}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <strong className="text-[18px] font-bold tabular-nums" style={{ color }}>{value}</strong>
        <span className="text-[8px] text-muted-foreground uppercase tracking-wider">score</span>
      </div>
    </div>
  );
}

function KPITile({ label, value, sub, tone, pct }: { label: string; value: string; sub: string; tone?: string; pct?: number }) {
  return (
    <div className="p-3 rounded-lg border border-border">
      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <strong className="block text-[18px] font-bold tabular-nums mt-0.5" style={{ color: tone }}>{value}</strong>
      <span className="text-[9px] text-muted-foreground">{sub}</span>
      {pct !== undefined && (
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: tone }} />
        </div>
      )}
    </div>
  );
}
