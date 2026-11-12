import * as React from "react";
import { cn } from "@/lib/utils";
import { descriptionBlocks, tidy } from "@/lib/iris/description-format";

/**
 * Split long free text into bullet points. Short text (one sentence or under
 * ~140 chars) stays a paragraph. Existing line breaks and list markers win;
 * otherwise we split on sentence boundaries.
 */
export function toBulletPoints(text: string | null | undefined): string[] {
  const raw = (text ?? "").trim();
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(?:[-*•–-]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  if (raw.length < 140) return [raw];
  const sentences = raw
    .split(/(?<=[.!?;])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : [raw];
}

export function FormattedText({ text, className, itemClassName }: { text: string | null | undefined; className?: string; itemClassName?: string }) {
  const points = toBulletPoints(text);
  if (points.length === 0) return null;
  if (points.length === 1) return <p className={cn("leading-relaxed", className)}>{points[0]}</p>;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {points.map((p, i) => (
        <li key={i} className={cn("flex gap-2 leading-relaxed", itemClassName)}>
          <span className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
          <span className="min-w-0">{p}</span>
        </li>
      ))}
    </ul>
  );
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
