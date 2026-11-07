"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, User, Calendar, Users, Check, Loader2, X } from "lucide-react";

export interface MomenceEntity {
  id: string;
  name: string;
  subtitle?: string;
  meta?: string;
  tags?: string[];
  avatarColor?: string;
}

// Mock Momence data — exported so the conversation engine can verify whether
// a captured "affected client" value actually matches a real Momence member
// (vs. free-text the user typed into the regular chat input).
export const MOMENCE_MEMBERS: MomenceEntity[] = [
  { id: "MM-89342", name: "Priya Agarwal", subtitle: "Annual Premium · 12 credits", meta: "+91 98765 43210 · priya.a@gmail.com", tags: ["VIP", "Mumbai"], avatarColor: "violet" },
  { id: "MM-88214", name: "Rhea Malhotra", subtitle: "12-Class Package · 4 credits", meta: "+91 99876 54321 · rhea.m@gmail.com", tags: ["Mumbai"], avatarColor: "sky" },
  { id: "MM-91234", name: "Karan Singh", subtitle: "5-Class Package · 5 credits", meta: "+91 80 12345 678 · karan.singh@gmail.com", tags: ["Bengaluru"], avatarColor: "emerald" },
  { id: "MM-85112", name: "Aditi Kapoor", subtitle: "Unlimited Monthly · Frozen", meta: "+91 90123 45678 · aditi.k@gmail.com", tags: ["Frozen", "Mumbai"], avatarColor: "amber" },
  { id: "MM-89333", name: "Meera Reddy", subtitle: "Annual Premium · 18 credits", meta: "+91 80 99887 766 · meera.r@gmail.com", tags: ["VIP", "Bengaluru"], avatarColor: "rose" },
  { id: "MM-88445", name: "Sneha Gupta", subtitle: "10-Class Package · 7 credits", meta: "+91 98111 22233 · sneha.g@gmail.com", tags: ["Mumbai"], avatarColor: "indigo" },
  { id: "MM-89556", name: "Rajiv Khanna", subtitle: "Annual Premium · 24 credits", meta: "+91 98222 33344 · rajiv.k@gmail.com", tags: ["VIP"], avatarColor: "violet" },
  { id: "MM-89678", name: "Anaya Desai", subtitle: "Drop-in · 1 credit", meta: "+91 98333 44455 · anaya.d@gmail.com", tags: ["New"], avatarColor: "sky" },
];

const MOMENCE_SESSIONS: MomenceEntity[] = [
  { id: "S-4451", name: "Barre Class — Beginner", subtitle: "Today 7:00 AM · 60 min · Tara Kapoor", meta: "Kwality House · 18/20 booked", tags: ["Studio 1"], avatarColor: "violet" },
  { id: "S-4452", name: "Cardio Barre — Intermediate", subtitle: "Today 9:00 AM · 60 min · Tara Kapoor", meta: "Kwality House · 20/20 (full)", tags: ["Full", "Studio 1"], avatarColor: "rose" },
  { id: "S-4453", name: "Sculpt & Tone", subtitle: "Today 10:30 AM · 45 min · Maya Sharma", meta: "Supreme HQ · 12/15 booked", tags: ["Studio 2"], avatarColor: "emerald" },
  { id: "S-4454", name: "Advanced Barre", subtitle: "Today 6:00 PM · 60 min · Reyaan Malhotra", meta: "Kenkere House · 14/18 booked", tags: ["Bengaluru"], avatarColor: "sky" },
  { id: "S-4455", name: "Stretch & Restore", subtitle: "Tomorrow 8:00 AM · 45 min · Tara Kapoor", meta: "Kwality House · 8/20 booked", tags: ["Studio 1"], avatarColor: "amber" },
  { id: "S-4456", name: "Barre Express", subtitle: "Tomorrow 12:30 PM · 30 min · Maya Sharma", meta: "Supreme HQ · 5/15 booked", tags: ["Lunch"], avatarColor: "indigo" },
  { id: "S-4457", name: "Power Barre — Advanced", subtitle: "Tomorrow 7:00 PM · 60 min · Reyaan Malhotra", meta: "Kenkere House · 16/18 booked", tags: ["Evening"], avatarColor: "violet" },
];

const MOMENCE_TRAINERS: MomenceEntity[] = [
  { id: "TRN-060", name: "Tara Kapoor", subtitle: "Head Trainer · Mumbai", meta: "tara.kapoor@physique57.in", tags: ["Barre", "Cardio", "Stretch"], avatarColor: "violet" },
  { id: "TRN-061", name: "Reyaan Malhotra", subtitle: "Senior Trainer · Bengaluru", meta: "reyaan.m@physique57.in", tags: ["Advanced", "Power"], avatarColor: "sky" },
  { id: "TRN-062", name: "Maya Sharma", subtitle: "Trainer · Mumbai", meta: "maya.s@physique57.in", tags: ["Sculpt", "Express"], avatarColor: "emerald" },
  { id: "TRN-063", name: "Diya Patel", subtitle: "Junior Trainer · Mumbai", meta: "diya.p@physique57.in", tags: ["Beginner"], avatarColor: "amber" },
];

const COLOR_MAP: Record<string, string> = {
  violet: "from-violet-500 to-violet-600",
  sky: "from-sky-500 to-sky-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  rose: "from-rose-500 to-rose-600",
  indigo: "from-indigo-500 to-indigo-600",
};

export function MomenceSearchField({
  type,
  placeholder,
  onSelect,
}: {
  type: "momence_member" | "momence_session" | "momence_trainer";
  placeholder?: string;
  onSelect: (entity: MomenceEntity) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<MomenceEntity[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<MomenceEntity | null>(null);
  const [showResults, setShowResults] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const dataSource =
    type === "momence_member" ? MOMENCE_MEMBERS :
    type === "momence_session" ? MOMENCE_SESSIONS :
    MOMENCE_TRAINERS;

  const iconName = type === "momence_member" ? "Member" : type === "momence_session" ? "Session" : "Trainer";
  const Icon = type === "momence_member" ? User : type === "momence_session" ? Calendar : Users;

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      const q = query.toLowerCase();
      const filtered = dataSource.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.subtitle?.toLowerCase().includes(q) ||
          e.meta?.toLowerCase().includes(q)
      );
      setResults(filtered);
      setSearching(false);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query, dataSource]);

  const handleSelect = (entity: MomenceEntity) => {
    setSelected(entity);
    setQuery("");
    setShowResults(false);
    onSelect(entity);
  };

  const handleClear = () => {
    setSelected(null);
    onSelect({ id: "", name: "" });
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selected) {
    return (
      <div className="iris-card-elevated p-3 iris-scale-in">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
            COLOR_MAP[selected.avatarColor || "violet"]
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold truncate">{selected.name}</span>
              <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">{selected.id}</span>
            </div>
            {selected.subtitle && (
              <div className="text-[11px] text-muted-foreground truncate">{selected.subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
              <Check className="w-3 h-3" />
              Verified
            </div>
            <button
              onClick={handleClear}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {selected.meta && (
          <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
            {selected.meta}
          </div>
        )}
        {selected.tags && selected.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {selected.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[9px] rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {searching ? (
            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex items-center gap-1 text-[9px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
            <Icon className="w-2.5 h-2.5" />
            Momence
          </div>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          placeholder={placeholder || `Search ${iconName.toLowerCase()}...`}
          className="w-full h-11 pl-10 pr-20 text-[13px] rounded-xl border border-violet-500/30 bg-card focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-muted-foreground"
        />
      </div>

      {/* Results dropdown */}
      {showResults && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 iris-card-elevated max-h-[280px] overflow-y-auto iris-scrollbar iris-scale-in">
          {searching && results.length === 0 && (
            <div className="p-4 text-center text-[12px] text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
              Querying Momence API...
            </div>
          )}
          {!searching && results.length === 0 && query.trim() && (
            <div className="p-4 text-center">
              <div className="text-[12px] text-muted-foreground mb-1">No {iconName.toLowerCase()}s found</div>
              <button
                onClick={() => {
                  onSelect({ id: "manual", name: query });
                  setSelected({ id: "manual", name: query });
                }}
                className="text-[11px] text-violet-600 dark:text-violet-400 font-medium hover:underline"
              >
                Use "{query}" anyway (manual entry)
              </button>
            </div>
          )}
          {results.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-violet-500" />
                {results.length} {iconName}{results.length > 1 ? "s" : ""} found
              </div>
              {results.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => handleSelect(entity)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-violet-500/5 transition-colors text-left border-b border-border last:border-0 group"
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                    COLOR_MAP[entity.avatarColor || "violet"]
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {entity.name}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0">{entity.id}</span>
                    </div>
                    {entity.subtitle && (
                      <div className="text-[10px] text-muted-foreground truncate">{entity.subtitle}</div>
                    )}
                  </div>
                  {entity.tags && entity.tags.length > 0 && (
                    <div className="flex gap-0.5 shrink-0">
                      {entity.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1 py-0.5 text-[8px] rounded bg-muted text-muted-foreground font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
