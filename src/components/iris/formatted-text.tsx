import * as React from "react";
import { cn } from "@/lib/utils";
import { descriptionBlocks, tidy } from "@/lib/iris/description-format";

/**
 * Free ticket text (resolution summary, investigation notes, recommended resolution) as
 * paragraphs of full, capitalised sentences - never a bullet list. Same rendering as the
 * description, so "- line" / "• line" text written by people or older automations reads
 * as prose.
 */
export function FormattedText({ text, className }: { text: string | null | undefined; className?: string; itemClassName?: string }) {
  return <TicketDescription text={text} className={className} />;
}

/** A ticket description: summary paragraphs, then each section as a labelled field grid. */
export function TicketDescription({ text, className }: { text: string | null | undefined; className?: string }) {
  const blocks = descriptionBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((b, i) => {
        if (b.kind === "text") {
          return (
            <div key={i} className="space-y-2">
              {b.paragraphs.map((p, j) => (
                <p key={j} className={cn("leading-relaxed", i === 0 && j === 0 && "text-[1.08em] font-medium text-foreground")}>{p}</p>
              ))}
            </div>
          );
        }
        return (
          <section key={i}>
            <h4 className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground mb-1.5">{b.heading}</h4>
            {b.kind === "chips" ? (
              <div className="flex flex-wrap gap-1.5">
                {b.items.map((x) => (
                  <span key={x} className="text-[11px] rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5">{x}</span>
                ))}
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-1">
                {b.fields.map((f, j) => (
                  <div
                    key={j}
                    className={cn(
                      "py-1.5 border-b border-border/50 last:border-b-0 min-w-0",
                      // Long answers (notes, quotes) take the full row.
                      (!f.label || f.value.length > 60) && "sm:col-span-2",
                    )}
                  >
                    {f.label && <dt className="text-[10.5px] text-muted-foreground">{f.label.replace(/\?$/, "")}</dt>}
                    <dd className="leading-snug break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Keys already shown elsewhere on the ticket (title, description, classification, studio).
const FORM_SKIP = new Set(["title", "summary", "issue", "description", "category", "subcategory", "studio", "priority"]);
const FORM_LABELS: Record<string, string> = {
  occurred: "When it happened",
  reportedBy: "Reported by",
  affectedClient: "Affected client",
  memberContact: "Member contact",
  clientContact: "Client contact",
  membershipType: "Membership",
  requestedOutcome: "Requested outcome",
  additionalContext: "Additional context",
  paymentReference: "Payment reference",
  sessionTime: "Class time",
  classFormat: "Class format",
};
const fieldLabel = (key: string) =>
  FORM_LABELS[key] ?? key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function fieldValue(v: unknown): string {
  if (v == null || typeof v === "boolean") return typeof v === "boolean" ? (v ? "Yes" : "No") : "";
  if (Array.isArray(v)) return v.map(fieldValue).filter(Boolean).join(", ");
  if (typeof v === "object") return "";
  return String(v).trim();
}

/** The answers captured by the intake form (iris.tickets.collected_info), as a labelled grid. */
export function TicketFormFields({ info, className }: { info: Record<string, unknown> | null | undefined; className?: string }) {
  const rows = Object.entries(info ?? {})
    .filter(([k]) => !k.startsWith("_") && !FORM_SKIP.has(k))
    .map(([k, v]) => ({ label: fieldLabel(k), value: tidy(fieldValue(v)) }))
    .filter((r) => r.value);
  if (!rows.length) return null;
  return (
    <dl className={cn("grid grid-cols-1 sm:grid-cols-2 gap-x-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-1", className)}>
      {rows.map((r) => (
        <div key={r.label} className={cn("py-1.5 border-b border-border/50 last:border-b-0 min-w-0", r.value.length > 60 && "sm:col-span-2")}>
          <dt className="text-[10.5px] text-muted-foreground">{r.label}</dt>
          <dd className="leading-snug break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
