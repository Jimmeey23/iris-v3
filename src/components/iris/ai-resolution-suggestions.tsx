"use client";

import * as React from "react";
import { type Ticket, getStudio } from "@/lib/iris/sample-tickets";
import { suggestResolution } from "@/lib/iris/intelligence";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import {
  Brain, BookOpen, Ticket as TicketIcon, Wand2, Lightbulb,
  ChevronRight, Sparkles, ArrowRight, CheckCircle2,
} from "lucide-react";

/**
 * AI Resolution Suggestions panel — shown in the ticket detail view.
 *
 * Surfaces the most useful resolution resources for the current ticket:
 *   - Matching knowledge base articles (click to open)
 *   - Similar past resolved tickets (click to view)
 *   - Matching template (with recommended actions)
 *   - Synthesized suggested next actions
 *
 * All matching is done client-side via the intelligence library, using
 * keyword + category + subcategory heuristics on the static ticket data.
 */
export function AIResolutionSuggestions({ ticket }: { ticket: Ticket }) {
  const { setCurrentView, selectTicket } = useAppStore();
  const suggestion = React.useMemo(() => suggestResolution(ticket), [ticket]);

  const hasAnything =
    suggestion.knowledgeArticles.length > 0 ||
    suggestion.similarResolvedTickets.length > 0 ||
    suggestion.template !== null ||
    suggestion.suggestedActions.length > 0;

  if (!hasAnything) return null;

  return (
    <div className="iris-card iris-ai-border p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold flex items-center gap-1.5">
            IRIS Resolution Suggestions
            <Sparkles className="w-3 h-3 text-violet-500" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            Auto-matched from knowledge base, similar tickets, and templates
          </div>
        </div>
      </div>

      {/* Suggested actions — the synthesized recommendations */}
      {suggestion.suggestedActions.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Suggested Next Actions
          </div>
          <ol className="space-y-1.5">
            {suggestion.suggestedActions.map((action, i) => (
              <li key={i} className="text-[12px] text-foreground/90 flex gap-2 leading-relaxed">
                <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Matching template */}
        {suggestion.template && (
          <SuggestionCard
            icon={Wand2}
            iconColor="text-amber-500"
            title="Matching Template"
            subtitle={`${suggestion.template.code} · ${suggestion.template.matchScore}% match`}
            body={suggestion.template.title}
            action={
              <button
                onClick={() => setCurrentView("templates")}
                className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 mt-2"
              >
                Open template <ChevronRight className="w-3 h-3" />
              </button>
            }
          />
        )}

        {/* Knowledge articles */}
        {suggestion.knowledgeArticles.length > 0 && (
          <SuggestionCard
            icon={BookOpen}
            iconColor="text-emerald-500"
            title="Knowledge Articles"
            subtitle={`${suggestion.knowledgeArticles.length} match${suggestion.knowledgeArticles.length === 1 ? "" : "es"}`}
            body={
              <div className="space-y-1.5">
                {suggestion.knowledgeArticles.slice(0, 2).map(({ article, score, matchReason }) => (
                  <button
                    key={article.id}
                    onClick={() => setCurrentView("knowledge_base")}
                    className="block w-full text-left p-1.5 rounded-md border border-border hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors"
                  >
                    <div className="text-[11px] font-semibold leading-tight truncate">{article.title}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                      {article.id} · {score}% · {matchReason}
                    </div>
                  </button>
                ))}
              </div>
            }
          />
        )}

        {/* Similar resolved tickets */}
        {suggestion.similarResolvedTickets.length > 0 && (
          <SuggestionCard
            icon={TicketIcon}
            iconColor="text-sky-500"
            title="Similar Resolved Tickets"
            subtitle={`${suggestion.similarResolvedTickets.length} match${suggestion.similarResolvedTickets.length === 1 ? "" : "es"}`}
            body={
              <div className="space-y-1.5">
                {suggestion.similarResolvedTickets.slice(0, 2).map(({ ticket: t, score, matchReason }) => (
                  <button
                    key={t.id}
                    onClick={() => { selectTicket(t.id); }}
                    className="block w-full text-left p-1.5 rounded-md border border-border hover:border-sky-500/30 hover:bg-sky-500/5 transition-colors"
                  >
                    <div className="text-[11px] font-semibold leading-tight truncate">
                      {t.ticketId}
                    </div>
                    <div className="text-[10px] text-foreground/80 truncate">{t.title}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                      {score}% · {matchReason}
                    </div>
                    {t.resolution && (
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5 line-clamp-2 italic">
                        &ldquo;{t.resolution.slice(0, 80)}{t.resolution.length > 80 ? "…" : ""}&rdquo;
                      </div>
                    )}
                  </button>
                ))}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  subtitle: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold leading-tight">{title}</div>
          <div className="text-[9px] text-muted-foreground truncate">{subtitle}</div>
        </div>
      </div>
      {typeof body === "string" ? (
        <div className="text-[11px] text-foreground/90 leading-relaxed">{body}</div>
      ) : (
        body
      )}
      {action}
    </div>
  );
}
