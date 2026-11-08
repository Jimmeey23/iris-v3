"use client";

import * as React from "react";
import { useAppStore, type ViewName } from "@/lib/iris/store";
import { buildCommandIndex, type CommandItem } from "@/lib/iris/intelligence";
import { cn } from "@/lib/utils";
import {
  Search, Ticket as TicketIcon, BookOpen, Wand2, User,
  Sparkles, Home, List, AlertTriangle, GraduationCap, BarChart3,
  CornerDownLeft, ArrowRight,
} from "lucide-react";

/**
 * ⌘K Command Palette — global smart search.
 *
 * Opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux). Lets users:
 *   - Search across tickets, trainers, knowledge articles, templates, members
 *   - Quick-jump to any view
 *   - Trigger quick actions ("New Issue", "View Escalations", etc.)
 *
 * Features:
 *   - Fuzzy match on title + subtitle + keywords
 *   - Grouped results by type
 *   - Keyboard navigation (↑/↓ to move, Enter to select, Esc to close)
 *   - Recent items (kept in sessionStorage so they persist for the tab session)
 *   - Quick actions surfaced at the top when the query is empty
 *
 * The palette is mounted once in the AppShell so it's available globally.
 */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ticket: TicketIcon,
  book: BookOpen,
  wand: Wand2,
  user: User,
  sparkles: Sparkles,
  home: Home,
  list: List,
  alert: AlertTriangle,
  graduation: GraduationCap,
  chart: BarChart3,
};

const TYPE_LABELS: Record<CommandItem["type"], string> = {
  ticket: "Tickets",
  knowledge: "Knowledge Base",
  template: "Templates",
  member: "Members",
  action: "Quick Actions",
  navigation: "Navigation",
  trainer: "Trainers",
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { setCurrentView, selectTicket, openTemplate, openKnowledgeArticle } = useAppStore();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Build the search index once
  const index = React.useMemo(() => buildCommandIndex(), []);

  // Recent selections (persist in sessionStorage for the tab session)
  const [recentIds, setRecentIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem("__irisCmdRecent");
      if (stored) setRecentIds(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Filter + group results
  const results = React.useMemo(() => {
    if (!query.trim()) {
      // Show quick actions + recent items when query is empty
      const recents = recentIds
        .map((id) => index.find((i) => i.id === id))
        .filter(Boolean) as CommandItem[];
      const quickActions = index.filter((i) => i.type === "action");
      return [
        ...(recents.length ? [{ type: "recent" as const, label: "Recent", items: recents }] : []),
        { type: "action" as const, label: "Quick Actions", items: quickActions },
      ];
    }
    const q = query.toLowerCase().trim();
    const scored = index
      .map((item) => {
        const haystack = (item.title + " " + (item.subtitle || "") + " " + item.keywords.join(" ")).toLowerCase();
        // Simple relevance: contains → 100, starts-with → 110, exact → 120
        let score = 0;
        if (item.title.toLowerCase() === q) score = 120;
        else if (item.title.toLowerCase().startsWith(q)) score = 110;
        else if (haystack.includes(q)) score = 100;
        else {
          // Multi-word: check if all query words appear somewhere
          const words = q.split(/\s+/);
          if (words.every((w) => haystack.includes(w))) score = 80;
        }
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.item);

    // Group by type
    const grouped: Array<{ type: string; label: string; items: CommandItem[] }> = [];
    const typeOrder: CommandItem["type"][] = ["action", "ticket", "knowledge", "template", "member"];
    for (const t of typeOrder) {
      const items = scored.filter((i) => i.type === t);
      if (items.length) grouped.push({ type: t, label: TYPE_LABELS[t], items });
    }
    return grouped;
  }, [query, index, recentIds]);

  // Flatten for keyboard nav
  const flatResults = React.useMemo(
    () => results.flatMap((g) => g.items),
    [results],
  );

  // Reset active index when query changes
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Focus input + reset query when opened
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll active item into view
  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-cmd-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Add to recent
  const recordRecent = (item: CommandItem) => {
    setRecentIds((prev) => {
      const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(0, 5);
      try { sessionStorage.setItem("__irisCmdRecent", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleSelect = (item: CommandItem) => {
    if (item.navigate) {
      if (item.navigate.templateCode) {
        openTemplate(item.navigate.templateCode);
      } else if (item.navigate.articleId) {
        openKnowledgeArticle(item.navigate.articleId);
      } else {
        setCurrentView(item.navigate.view as ViewName);
        // setCurrentView clears the selected ticket, so select afterwards.
        if (item.navigate.ticketId) selectTicket(item.navigate.ticketId);
      }
    }
    recordRecent(item);
    onOpenChange(false);
  };

  // Keyboard handler
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatResults[activeIndex];
        if (item) handleSelect(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, activeIndex, flatResults]);

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 iris-cmd-overlay"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden iris-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets, members, knowledge, templates... or jump to a view"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {flatResults.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Search className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2" />
              <div className="text-[13px] text-muted-foreground">
                No matches for &quot;{query}&quot;
              </div>
              <div className="text-[11px] text-muted-foreground/70 mt-1">
                Try a different term, or press Esc to close.
              </div>
            </div>
          ) : (
            results.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  runningIdx++;
                  const idx = runningIdx;
                  const Icon = ICONS[item.icon] || TicketIcon;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-cmd-idx={idx}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted/50",
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-[13px] font-medium leading-tight truncate",
                          isActive && "text-primary",
                        )}>
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <CornerDownLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="bg-background border border-border px-1 rounded">↑</kbd>
              <kbd className="bg-background border border-border px-1 rounded">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-background border border-border px-1 rounded">↵</kbd>
              select
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {flatResults.length} result{flatResults.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );
}
