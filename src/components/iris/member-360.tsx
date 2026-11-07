"use client";

import * as React from "react";
import { buildMember360, MEMBER_DIRECTORY, type Member360 } from "@/lib/iris/intelligence";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import {
  Search, User, Phone, Mail, CreditCard, Calendar, MapPin,
  AlertTriangle, TrendingUp, Heart, Activity, Ticket as TicketIcon,
  X, ChevronRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PriorityBadge, StatusBadge } from "./badges";
import { RelativeTime } from "./relative-time";

/**
 * Member 360 Lookup — opens a modal where you can search any member by
 * name, phone, email, or Momence ID. Shows a complete profile:
 *   - Membership details (from Momence directory)
 *   - All past tickets (with priority, status, date)
 *   - Sentiment breakdown (positive / neutral / negative)
 *   - Issue type breakdown (membership / payment / class)
 *   - Risk level (high / medium / low) based on volume + sentiment
 *
 * Click a ticket to navigate to it in the All Tickets view.
 */
export function Member360Lookup({
  open, onOpenChange, initialQuery = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}) {
  const { setCurrentView, selectTicket } = useAppStore();
  const [query, setQuery] = React.useState(initialQuery);
  const [member, setMember] = React.useState<Member360 | null>(null);
  const [searched, setSearched] = React.useState(false);

  const handleSearch = React.useCallback((q: string) => {
    setQuery(q);
    setSearched(true);
    if (!q.trim()) {
      setMember(null);
      return;
    }
    // Try to find in the member directory first (exact matches)
    const dir = MEMBER_DIRECTORY.find(
      (m) => m.name.toLowerCase().includes(q.toLowerCase()) ||
            m.email.toLowerCase().includes(q.toLowerCase()) ||
            m.phone.includes(q) ||
            m.id.toLowerCase().includes(q.toLowerCase()),
    );
    if (dir) {
      setMember(buildMember360(dir.name));
    } else {
      // Try the name directly (might match an affectedClient in tickets)
      setMember(buildMember360(q.trim()));
    }
  }, []);

  React.useEffect(() => {
    if (open && initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    } else if (!open) {
      setQuery("");
      setMember(null);
      setSearched(false);
    }
  }, [open, initialQuery, handleSearch]);

  const handleSelectTicket = (ticketId: string) => {
    selectTicket(ticketId);
    setCurrentView("all_tickets");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto iris-scrollbar">
        <DialogTitle className="sr-only">Member 360 Lookup</DialogTitle>
        <div className="p-2">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 px-2 pt-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Member 360 Lookup</div>
              <div className="text-[11px] text-muted-foreground">
                Search any member to see their complete profile, ticket history, and risk signals.
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, phone, email, or Momence ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(query); }}
                className="h-9 pl-9 text-[13px]"
                autoFocus
              />
            </div>
            {/* Suggested members */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-muted-foreground">Try:</span>
              {MEMBER_DIRECTORY.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSearch(m.name)}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="px-2">
            {searched && !member && (
              <div className="text-center py-12">
                <User className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <div className="text-[13px] text-muted-foreground">
                  No member found for &ldquo;{query}&rdquo;
                </div>
                <div className="text-[11px] text-muted-foreground/70 mt-1">
                  Try a different name or check the suggested members above.
                </div>
              </div>
            )}

            {member && <MemberProfile member={member} onSelectTicket={handleSelectTicket} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberProfile({
  member, onSelectTicket,
}: {
  member: Member360;
  onSelectTicket: (ticketId: string) => void;
}) {
  // Look up member in directory for contact details
  const dirEntry = MEMBER_DIRECTORY.find((m) => m.name.toLowerCase().includes(member.name.toLowerCase()));

  const riskTone =
    member.riskLevel === "high"
      ? { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-600 dark:text-rose-400", icon: AlertTriangle }
      : member.riskLevel === "medium"
      ? { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600 dark:text-amber-400", icon: AlertTriangle }
      : { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", icon: Heart };
  const RiskIcon = riskTone.icon;

  return (
    <div className="space-y-3">
      {/* Profile card */}
      <div className={cn("p-3 rounded-lg border", riskTone.bg)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-[16px] shrink-0">
            {member.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold leading-tight">{member.name}</div>
            {dirEntry && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                <span className="font-mono">{dirEntry.id}</span> · {dirEntry.membership}
              </div>
            )}
            <div className={cn("inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", riskTone.text)}>
              <RiskIcon className="w-2.5 h-2.5" />
              {member.riskLevel} risk
            </div>
          </div>
        </div>
        <p className={cn("text-[11px] mt-2 italic", riskTone.text)}>
          {member.riskReason}
        </p>
      </div>

      {/* Contact details from directory */}
      {dirEntry && (
        <div className="grid grid-cols-2 gap-2">
          <DetailRow icon={Phone} label="Phone" value={dirEntry.phone} />
          <DetailRow icon={Mail} label="Email" value={dirEntry.email} />
          <DetailRow icon={CreditCard} label="Credits" value={String(dirEntry.credits)} />
          <DetailRow icon={Calendar} label="Joined" value={new Date(dirEntry.joinDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Total Tickets" value={member.totalTickets} tone="primary" />
        <Stat label="Open" value={member.openTickets} tone={member.openTickets > 0 ? "amber" : "muted"} />
        <Stat label="Resolved" value={member.resolvedTickets} tone="emerald" />
        {member.primaryStudio && (
          <Stat label="Studio" value={member.primaryStudio.split(",")[0]} tone="muted" small />
        )}
      </div>

      {/* Sentiment + issue breakdown */}
      {member.totalTickets > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-md border border-border">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Sentiment
            </div>
            <div className="space-y-1">
              <SentimentBar label="Positive" count={member.sentiment.positive} total={member.totalTickets} color="bg-emerald-500" />
              <SentimentBar label="Neutral" count={member.sentiment.neutral} total={member.totalTickets} color="bg-muted-foreground" />
              <SentimentBar label="Negative" count={member.sentiment.negative} total={member.totalTickets} color="bg-rose-500" />
            </div>
          </div>
          <div className="p-2.5 rounded-md border border-border">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Issue Types
            </div>
            <div className="space-y-1">
              <SentimentBar label="Membership" count={member.membershipIssues} total={member.totalTickets} color="bg-sky-500" />
              <SentimentBar label="Payment" count={member.paymentIssues} total={member.totalTickets} color="bg-amber-500" />
              <SentimentBar label="Class / Scheduling" count={member.classIssues} total={member.totalTickets} color="bg-violet-500" />
            </div>
          </div>
        </div>
      )}

      {/* Ticket history */}
      {member.tickets.length > 0 ? (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <TicketIcon className="w-3 h-3" />
            Ticket History ({member.tickets.length})
          </div>
          <div className="space-y-1 max-h-[260px] overflow-y-auto">
            {member.tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="w-full text-left p-2 rounded-md border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={t.priority} size="xs" />
                  <StatusBadge status={t.status} size="xs" />
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
                </div>
                <div className="text-[11px] font-medium leading-tight line-clamp-1">{t.title}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  <RelativeTime date={t.createdAt} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <TicketIcon className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1.5" />
          <div className="text-[12px] text-muted-foreground">No tickets on file for this member</div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="p-2 rounded-md border border-border bg-muted/20">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </div>
      <div className="text-[11px] font-medium truncate mt-0.5">{value}</div>
    </div>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string | number; tone: "primary" | "emerald" | "amber" | "muted"; small?: boolean }) {
  const colorMap = {
    primary: "text-primary",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    muted: "text-foreground",
  };
  return (
    <div className="p-2 rounded-md border border-border bg-muted/20">
      <div className={cn("font-bold tabular-nums leading-none", small ? "text-[10px]" : "text-[14px]", colorMap[tone])}>
        {value}
      </div>
      <div className="text-[8px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums w-6 text-right">{count}</span>
    </div>
  );
}
