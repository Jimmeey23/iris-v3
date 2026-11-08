import * as React from "react";
import { cn } from "@/lib/utils";

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
