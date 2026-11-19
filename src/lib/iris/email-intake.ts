/**
 * Pure helpers for email → ticket intake (no I/O, unit-tested).
 * Server-side processing lives in lib/server/email-intake.ts.
 */

export const DEFAULT_STAFF_DOMAINS = ["physique57india.com", "physique57mumbai.com", "physique57bengaluru.com"];

/** STAFF_EMAIL_DOMAINS="a.com,b.com" overrides the defaults. */
export function staffDomains(env: string | undefined = process.env.STAFF_EMAIL_DOMAINS): string[] {
  const list = (env ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return list.length ? list : DEFAULT_STAFF_DOMAINS;
}

export type Address = { name: string | null; email: string };

/** "John Doe <john@x.com>" | "john@x.com" | {name,email} → Address. */
export function parseAddress(v: unknown): Address | null {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const email = typeof o.email === "string" ? o.email : typeof o.address === "string" ? o.address : null;
    if (email) return { name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : null, email: email.trim().toLowerCase() };
    return null;
  }
  if (typeof v !== "string" || !v.trim()) return null;
  const m = v.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  const bare = v.match(/[^\s<>"]+@[^\s<>"]+/);
  return bare ? { name: null, email: bare[0].toLowerCase() } : null;
}

export function domainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function isStaffEmail(email: string, domains = staffDomains()): boolean {
  const d = domainOf(email);
  return domains.some((s) => d === s || d.endsWith(`.${s}`));
}

const JUNK_SENDER = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[s]?|notifications?|newsletter|marketing|news)([+.\-_].*)?@/i;
const JUNK_SUBJECT = /^(auto(matic)?[- ]?reply|out of (the )?office|undeliverable|delivery status notification|mail delivery failed|read:|accepted:|declined:)/i;
const FORWARDING_CONFIRM = /(gmail forwarding confirmation|forwarding-noreply@google\.com|receive mail from .* forwarding)/i;

/**
 * Cheap header/sender junk check, run before any AI call. Returns a reason or null.
 * Anything this misses is caught by the AI's is_actionable verdict.
 */
export function junkReason(input: {
  from: string;
  subject: string | null;
  headers?: Record<string, string | string[] | undefined> | null;
  text?: string | null;
}): string | null {
  const h = Object.fromEntries(Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(" ") : v ?? ""]));
  const subject = (input.subject ?? "").trim();
  if (FORWARDING_CONFIRM.test(`${input.from} ${subject}`)) return "Gmail forwarding confirmation";
  const autoSubmitted = h["auto-submitted"];
  if (autoSubmitted && !/^no$/i.test(autoSubmitted.trim())) return `Auto-submitted (${autoSubmitted.trim()})`;
  if (/^(bulk|junk|list)$/i.test((h["precedence"] ?? "").trim())) return `Bulk mail (precedence: ${h["precedence"].trim()})`;
  if (h["list-unsubscribe"] || h["list-id"]) return "Mailing list / newsletter";
  if (h["x-autoreply"] || h["x-autorespond"]) return "Auto-reply";
  if (JUNK_SENDER.test(input.from)) return "Automated sender address";
  if (JUNK_SUBJECT.test(subject)) return "Auto-reply / delivery notice";
  if (!subject && !(input.text ?? "").trim()) return "Empty email";
  return null;
}

/** Strip quoted reply chains' noise and cap length for the AI prompt. */
export function emailPromptText(m: { from: string; subject: string | null; text: string | null; attachments: string[] }, max = 6000): string {
  const body = (m.text ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return [
    `From: ${m.from}`,
    `Subject: ${m.subject ?? "(no subject)"}`,
    m.attachments.length ? `Attachments: ${m.attachments.join(", ")}` : null,
    "",
    body.slice(0, max),
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/** Very small HTML → text fallback for emails with no text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Safe file name for storage paths and download links. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "attachment").slice(0, 120);
}

/** Pulls the Mailtrap message references out of a webhook body (shape tolerant). */
export function inboundEvents(payload: unknown): { eventId: string; messageId: string; inboxId: string | null }[] {
  const p = (payload ?? {}) as Record<string, unknown>;
  const list = Array.isArray(p.events) ? p.events : Array.isArray(payload) ? (payload as unknown[]) : [p];
  const out: { eventId: string; messageId: string; inboxId: string | null }[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const type = String(e.event ?? e.type ?? e.event_type ?? "inbound.message_received");
    if (!type.includes("inbound")) continue;
    const msg = (e.message ?? {}) as Record<string, unknown>;
    const messageId = e.message_id ?? msg.id ?? e.inbound_message_id;
    if (messageId === undefined || messageId === null || messageId === "") continue;
    const inbox = e.inbox_id ?? msg.inbox_id ?? null;
    out.push({
      eventId: String(e.event_id ?? e.id ?? messageId),
      messageId: String(messageId),
      inboxId: inbox === null || inbox === undefined ? null : String(inbox),
    });
  }
  return out;
}
