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

const REGION: Record<string, string> = { mum: "Mumbai", blr: "Bengaluru" };
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Live search against Momence via the IRIS server (credentials never reach the browser). */
async function searchMomence(type: "momence_member" | "momence_session" | "momence_trainer", q: string, signal: AbortSignal): Promise<MomenceEntity[]> {
  const path = type === "momence_member" ? "members" : type === "momence_session" ? "sessions" : "trainers";
  const res = await fetch(new URL(`/api/momence/${path}?q=${encodeURIComponent(q)}`, window.location.origin), { signal, cache: "no-store" });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Momence search failed (${res.status})`);
  if (type === "momence_member") {
    return (j.members ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      subtitle: `${REGION[m.region] ?? m.region} · ${m.totalVisits} visit${m.totalVisits === 1 ? "" : "s"}${m.lastSeen ? ` · last ${new Date(m.lastSeen).toLocaleDateString("en-IN")}` : ""}`,
      meta: [m.phone, m.email].filter(Boolean).join(" · "),
      tags: (m.tags ?? []).slice(0, 3),
      avatarColor: m.region === "blr" ? "sky" : "violet",
    }));
  }
  if (type === "momence_session") {
    return (j.sessions ?? []).map((x: any) => ({
      id: x.id,
      name: x.name,
      subtitle: `${fmtDate(x.startsAt)}${x.durationMins ? ` · ${x.durationMins} min` : ""}${x.teacher ? ` · ${x.teacher}` : ""}`,
      meta: `${x.location ?? REGION[x.region]} · ${x.booked}${x.capacity ? `/${x.capacity}` : ""} booked${x.cancelled ? " · cancelled" : ""}`,
      tags: x.cancelled ? ["Cancelled"] : x.capacity && x.booked >= x.capacity ? ["Full"] : [],
      avatarColor: x.cancelled ? "rose" : "emerald",
    }));
  }
  return (j.trainers ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    subtitle: `${REGION[t.region] ?? t.region} · ${t.classes} classes (30 days)`,
    meta: (t.locations ?? []).join(" · "),
    tags: [],
    avatarColor: "amber",
  }));
}

const COLOR_MAP: Record<string, string> = {
  violet: "from-violet-500 to-violet-600",
  sky: "from-sky-500 to-sky-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  rose: "from-rose-500 to-rose-600",
  indigo: "from-indigo-500 to-indigo-600",
};

/** Live roster numbers for a picked class: booked, checked in, cancelled, waitlist. */
function SessionRosterLine({ id }: { id: string }) {
  const [r, setR] = React.useState<{ counts: { booked: number; checkedIn: number; cancelled: number }; waitlist: number } | null | "na">(null);
  React.useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/momence/sessions/${encodeURIComponent(id)}/roster`, { signal: ac.signal, cache: "no-store" })
      .then((x) => x.json())
      .then((j) => setR(j.data ?? "na"))
      .catch(() => {});
    return () => ac.abort();
  }, [id]);
  if (r === "na") return null;
  if (!r) return <div className="mt-1.5 text-[10px] text-muted-foreground">Loading roster…</div>;
  return (
    <div className="mt-1.5 text-[10px] text-muted-foreground">
      Roster: <b className="text-foreground">{r.counts.booked}</b> booked · <b className="text-foreground">{r.counts.checkedIn}</b> checked in
      {r.counts.cancelled ? ` · ${r.counts.cancelled} cancelled` : ""}{r.waitlist ? ` · ${r.waitlist} waitlisted` : ""}
    </div>
  );
}

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

  const [error, setError] = React.useState<string | null>(null);

  const iconName = type === "momence_member" ? "Member" : type === "momence_session" ? "Session" : "Trainer";
  const Icon = type === "momence_member" ? User : type === "momence_session" ? Calendar : Users;

  React.useEffect(() => {
    const q = query.trim();
    // Sessions can be listed with no text (today's classes); members/trainers need 2+ chars.
    if (type !== "momence_session" && q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    if (type === "momence_session" && !q && !showResults) return;
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      searchMomence(type, q, ctrl.signal)
        .then((r) => { setResults(r); setError(null); setShowResults(true); })
        .catch((e) => { if (e.name !== "AbortError") { setError(e.message); setResults([]); setShowResults(true); } })
        .finally(() => setSearching(false));
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, type, showResults]);

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
        {type === "momence_session" && /^(mum|blr):\d+$/.test(selected.id) && <SessionRosterLine id={selected.id} />}
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
          onFocus={() => (query || type === "momence_session") && setShowResults(true)}
          placeholder={placeholder || (type === "momence_member" ? "Search members by name, email or phone" : type === "momence_session" ? "Search classes by name, trainer or studio" : "Search trainers")}
          className="w-full h-11 pl-10 pr-20 text-[13px] rounded-xl border border-violet-500/30 bg-card focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-muted-foreground"
        />
      </div>

      {/* Results dropdown */}
      {showResults && (query.trim() || results.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 iris-card-elevated max-h-[280px] overflow-y-auto iris-scrollbar iris-scale-in">
          {searching && results.length === 0 && (
            <div className="p-4 text-center text-[12px] text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
              Querying Momence API...
            </div>
          )}
          {error && !searching && (
            <div role="alert" className="px-4 pt-3 text-[11px] text-rose-600 dark:text-rose-400">{error}</div>
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
