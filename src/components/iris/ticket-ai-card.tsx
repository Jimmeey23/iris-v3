"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { api, upsertTicket } from "@/lib/iris/live-data";
import { cn } from "@/lib/utils";

type TicketAi = {
  v: number;
  at: string;
  title: string;
  summary: string;
  request: string | null;
  decisionNeeded: string | null;
  facts: Array<{ label: string; value: string }>;
  unknowns: string[];
  originalTitle?: string;
  suggestion?: { category: string; subcategory: string; confidence: number; status: "pending" | "accepted" | "dismissed" } | null;
};

/** Read the enrichment stored in collected_info._ai, or null when there is none (or it's malformed). */
export function ticketAi(info: Record<string, unknown> | null | undefined): TicketAi | null {
  const ai = info?._ai as TicketAi | undefined;
  return ai && typeof ai === "object" && typeof ai.summary === "string" ? ai : null;
}

/**
 * The AI's tidy-up of a ticket: summary, the ask, key facts, what's still unknown, and a
 * category suggestion staff can accept or dismiss. Always labelled as AI; the reporter's
 * own description stays below it untouched.
 */
export function TicketAiCard({
  ticketId,
  info,
  currentCategory,
  readOnly,
}: {
  ticketId: string;
  info: Record<string, unknown> | null | undefined;
  currentCategory: string;
  readOnly?: boolean;
}) {
  const ai = ticketAi(info);
  const [busy, setBusy] = React.useState<null | "accept" | "dismiss" | "refresh">(null);

  const act = async (action: "accept" | "dismiss" | "refresh") => {
    setBusy(action);
    try {
      const res = await api<{ ticket: unknown }>(`/api/tickets/${encodeURIComponent(ticketId)}/ai`, { method: "POST", json: { action } });
      upsertTicket(res.ticket);
      toast.success(action === "accept" ? "Category updated" : action === "dismiss" ? "Suggestion dismissed" : "AI summary refreshed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  if (!ai) {
    if (readOnly) return null;
    return (
      <div className="iris-card p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Sparkles className="w-4 h-4 text-violet-500" />
          No AI summary yet.
        </div>
        <button type="button" onClick={() => act("refresh")} disabled={busy !== null} className="text-[12px] font-medium text-primary hover:underline disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Summarise with AI"}
        </button>
      </div>
    );
  }

  const s = ai.suggestion;
  return (
    <div className="iris-card p-4 border-violet-500/25 bg-violet-500/[0.03]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <div className="text-[13px] font-semibold">AI summary</div>
          <span className="text-[9.5px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-300">AI · check before acting</span>
        </div>
        {!readOnly && (
          <button
            type="button"
            title="Re-run the AI summary"
            onClick={() => act("refresh")}
            disabled={busy !== null}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", busy === "refresh" && "animate-spin")} />
          </button>
        )}
      </div>

      {s?.status === "pending" && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px]">
          <div>
            Filed as <strong>{currentCategory}</strong>. AI thinks this fits better under{" "}
            <strong>
              {s.category} › {s.subcategory}
            </strong>{" "}
            <span className="text-muted-foreground">({Math.round(s.confidence * 100)}% sure)</span>
          </div>
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => act("accept")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-2.5 py-1 text-[11.5px] font-medium disabled:opacity-50"
              >
                {busy === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Move it
              </button>
              <button
                type="button"
                onClick={() => act("dismiss")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11.5px] font-medium disabled:opacity-50"
              >
                {busy === "dismiss" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Keep current
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-[12.5px] leading-relaxed text-foreground/90">{ai.summary}</p>

      {(ai.request || ai.decisionNeeded) && (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {ai.request && (
            <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
              <dt className="text-[10.5px] text-muted-foreground">What's being asked</dt>
              <dd className="text-[12px] leading-snug">{ai.request}</dd>
            </div>
          )}
          {ai.decisionNeeded && (
            <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
              <dt className="text-[10.5px] text-muted-foreground">Decision needed</dt>
              <dd className="text-[12px] leading-snug">{ai.decisionNeeded}</dd>
            </div>
          )}
        </dl>
      )}

      {ai.facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-1 text-[12px]">
          {ai.facts.map((f, i) => (
            <div key={i} className={cn("py-1.5 border-b border-border/50 last:border-b-0 min-w-0", f.value.length > 60 && "sm:col-span-2")}>
              <dt className="text-[10.5px] text-muted-foreground">{f.label}</dt>
              <dd className="leading-snug break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {ai.unknowns.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground mb-1.5">Still unknown</div>
          <div className="flex flex-wrap gap-1.5">
            {ai.unknowns.map((u) => (
              <span key={u} className="text-[11px] rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {(ai.originalTitle || s?.status === "accepted") && (
        <p className="mt-3 text-[10.5px] text-muted-foreground">
          {ai.originalTitle && <>Title rewritten by AI; original: “{ai.originalTitle}”. </>}
          {s?.status === "accepted" && <>Category moved on AI suggestion.</>}
        </p>
      )}
    </div>
  );
}
