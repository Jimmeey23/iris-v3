/**
 * Values for the template "session" and "roster" field types. Both are stored as
 * plain strings so they flow through the existing form/ticket plumbing.
 */

export const ATTENDANCE = ["Attended", "Late cancelled", "No show", "Cancelled"] as const;
export const INTEREST = ["Interested", "Undecided", "Not interested", "Lives far", "Already a member", "Price concern"] as const;

export type RosterRow = {
  bookingId: string;
  memberId: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  attendance: string;
  interest: string;
  followUp: boolean;
  followUpDate: string;
  notes: string;
};

/** "Name · Sat 15 Nov, 4:00 pm [mum:123]" - readable on the ticket, id recoverable. */
export const encodeSession = (s: { id: string; name: string; subtitle?: string }) =>
  `${s.name}${s.subtitle ? ` · ${s.subtitle}` : ""} [${s.id}]`;
export const sessionIdOf = (v: unknown) => (typeof v === "string" ? /\[([^\]]+)\]\s*$/.exec(v)?.[1] ?? null : null);
export const sessionLabelOf = (v: unknown) => (typeof v === "string" ? v.replace(/\s*\[[^\]]+\]\s*$/, "") : "");

export function parseRoster(v: unknown): RosterRow[] {
  if (typeof v !== "string" || !v.trim().startsWith("[")) return [];
  try {
    const rows = JSON.parse(v);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Plain-text table for the ticket description. */
export function rosterText(v: unknown): string {
  const rows = parseRoster(v);
  if (!rows.length) return "";
  const count = (k: keyof RosterRow, val: string) => rows.filter((r) => r[k] === val).length;
  const head = `${rows.length} booked · ${count("attendance", "Attended")} attended · ${count("attendance", "Late cancelled")} late cancelled · ${count("attendance", "No show")} no show · ${count("interest", "Interested")} interested · ${rows.filter((r) => r.followUp).length} to follow up`;
  const lines = rows.map((r) =>
    [
      `- ${r.name}${r.phone ? ` (${r.phone})` : ""}`,
      r.attendance,
      r.interest,
      r.followUp ? `follow up${r.followUpDate ? ` by ${r.followUpDate}` : ""}` : null,
      r.notes ? `"${r.notes}"` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  return [head, ...lines].join("\n");
}
