"use client";

/**
 * Deterministic first pass for the IRIS assistant.
 *
 * Predictable messages (greetings, help, ticket lookups by number, queue
 * counts, Momence member/class lookups, confirming a pending draft) are
 * answered here instantly with no AI tokens. Anything open-ended - reporting
 * or investigating an issue, judgment calls, follow-ups the rules can't fully
 * answer - returns null and goes to Claude.
 */

import { ALL_TICKETS, getAssignee } from "./sample-tickets";
import { STATUS_CONFIG, STUDIOS, type Priority } from "./types";
import type { AgentTicketDraft, CurrentUser } from "./store";
import { matchStudio, normalizeText } from "./aliases";

export type RuleReply = {
  content: string;
  /** Short name of the rule that answered, shown in the badge tooltip. */
  rule: string;
  /** Set when the reply should create the pending draft. */
  action?: "create_draft";
};

type Ctx = {
  user: CurrentUser;
  pendingDraft: AgentTicketDraft | null;
  /** Server lookups (Momence). */
  fetchJson: <T>(url: string) => Promise<T>;
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
const OPEN = (s: string) => s !== "resolved" && s !== "closed";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Words that signal a real issue report; if present, a "simple" pattern
// shouldn't swallow the message (e.g. "hi, the AC is broken").
const ISSUE_WORDS =
  /\b(broken|not working|isn'?t working|stopped|leak|complain|complaint|refund|charged|deducted|missing|wrong|late|no[- ]show|injur|hurt|unsafe|fire|smell|dirty|rude|cancel(l)?ed|issue|problem|error|fail|crash|stuck|down|urgent)\b/i;

function studioFrom(text: string) {
  const code = matchStudio(text);
  return code ? STUDIOS.find((s) => s.code === code) : undefined;
}

export async function routeDeterministic(raw: string, ctx: Ctx): Promise<RuleReply | null> {
  const text = raw.trim();
  const t = norm(text);
  if (!t) return null;
  const hasIssue = ISSUE_WORDS.test(text) || ISSUE_WORDS.test(normalizeText(text));
  const first = ctx.user.name ? ctx.user.name.split(" ")[0] : "";

  // ── Confirm a pending draft ──────────────────────────────────────────────
  if (ctx.pendingDraft && /^(yes|yep|yeah|ok|okay|sure|go ahead|confirm|create( it| the ticket)?|looks good|lgtm|do it|raise it|submit)( please| it| now)?[.! ]*$/i.test(text)) {
    return { content: "Creating the ticket now…", rule: "Confirm draft", action: "create_draft" };
  }

  // ── Greetings / thanks / acknowledgements ───────────────────────────────
  if (!hasIssue && /^(hi|hello|hey|hiya|good (morning|afternoon|evening)|namaste)( iris| there| team)?[.!? ]*$/i.test(text)) {
    return {
      content: `Hi${first ? ` ${first}` : ""}! Tell me what happened - who, where and when - and I'll look it up and draft a ticket. You can also ask things like "P57-02079", "my open tickets" or "find member Priya Shah".`,
      rule: "Greeting",
    };
  }
  if (!hasIssue && /^(thanks|thank you|thx|ty|cheers|great|perfect|awesome|cool|got it|noted|ok|okay|done|👍|🙏)( so much| iris| a lot)?[.!? ]*$/i.test(text)) {
    return { content: "You're welcome. Anything else I can help with?", rule: "Acknowledgement" };
  }

  // ── Help ─────────────────────────────────────────────────────────────────
  if (/^(help|what can you do|how does this work|commands|\?)[.!? ]*$/i.test(text)) {
    return {
      content: [
        "Here's what I can do:",
        "• **Report an issue** - describe it in your own words; I check Momence and past tickets, then draft a ticket for you to confirm.",
        "• **Look up a ticket** - type its number, e.g. P57-02079.",
        "• **Your queue** - \"my open tickets\", \"open tickets at Kwality House\", \"how many P0 tickets\".",
        "• **Momence** - \"find member <name/email/phone>\", \"classes today at Supreme HQ\".",
        "",
        "Instant answers (⚡) cost nothing; I only use AI (✨) when a message needs judgment.",
      ].join("\n"),
      rule: "Help",
    };
  }

  // ── Ticket lookup by number ──────────────────────────────────────────────
  const ids = [...text.matchAll(/\b(?:p57|iris)-?\s?(\d{1,5})\b/gi)].map((m) => `P57-${m[1].padStart(5, "0")}`);
  if (ids.length && !hasIssue && t.split(" ").length <= 8) {
    const lines = ids.slice(0, 5).map((id) => {
      const tk = ALL_TICKETS.find((x) => x.ticketId.toUpperCase() === id);
      if (!tk) return `**${id}** - not found (or you don't have access).`;
      const who = getAssignee(tk)?.name ?? "Unassigned";
      const status = STATUS_CONFIG[tk.status]?.label ?? tk.status;
      const res = tk.resolutionSummary ? `\n  Resolution: ${tk.resolutionSummary.slice(0, 220)}${tk.resolutionSummary.length > 220 ? "…" : ""}` : "";
      return `**${tk.ticketId}** - ${tk.title}\n  ${status} · ${tk.priority} · ${who} · opened ${fmtDate(tk.createdAt)}${tk.legacy ? " · imported" : ""}${res}`;
    });
    return { content: lines.join("\n\n"), rule: "Ticket lookup" };
  }

  // ── Queue counts / lists ─────────────────────────────────────────────────
  const queueAsk = /\b(my|open|pending|unassigned|breached|escalated|critical|p[0-3])\b.*\btickets?\b|\btickets?\b.*\b(open|pending|assigned to me|unassigned|breached)\b|^how many\b.*\btickets?\b/i;
  if (queueAsk.test(text) && !hasIssue) {
    let list = ALL_TICKETS.slice();
    const parts: string[] = [];
    if (/\b(my|mine|assigned to me)\b/i.test(text)) {
      list = list.filter((x) => x.assigneeId === ctx.user.id);
      parts.push("assigned to you");
    }
    const pr = text.match(/\bp([0-3])\b/i);
    if (pr) {
      list = list.filter((x) => x.priority === (`P${pr[1]}` as Priority));
      parts.push(`P${pr[1]}`);
    } else if (/\bcritical\b/i.test(text)) {
      list = list.filter((x) => x.priority === "P0");
      parts.push("P0");
    }
    if (/\bunassigned\b/i.test(text)) { list = list.filter((x) => !x.assigneeId); parts.push("unassigned"); }
    if (/\bbreach/i.test(text)) { list = list.filter((x) => x.slaStatus === "breached"); parts.push("SLA breached"); }
    if (/\bescalat/i.test(text)) { list = list.filter((x) => x.status === "escalated" || x.escalationLevel > 0); parts.push("escalated"); }
    const studio = studioFrom(text);
    if (studio) { list = list.filter((x) => x.studioCode === studio.code); parts.push(`at ${studio.name}`); }
    const wantAll = /\b(all|closed|resolved)\b/i.test(text);
    if (!wantAll) list = list.filter((x) => OPEN(x.status));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const label = `${wantAll ? "" : "open "}tickets${parts.length ? ` ${parts.join(", ")}` : ""}`;
    if (!list.length) return { content: `No ${label}.`, rule: "Ticket queue" };
    const top = list.slice(0, 8).map((x) => `• **${x.ticketId}** ${x.priority} - ${x.title} (${STATUS_CONFIG[x.status]?.label ?? x.status})`);
    return {
      content: `${list.length} ${label}${list.length > 8 ? " - newest 8:" : ":"}\n${top.join("\n")}`,
      rule: "Ticket queue",
    };
  }

  // ── Momence member lookup ────────────────────────────────────────────────
  const member = text.match(/^(?:find|look ?up|search|who is|check)\s+(?:the\s+)?(?:member|client|customer)?\s*:?\s*(.{2,60})$/i);
  if (member && !hasIssue) {
    const q = member[1].trim().replace(/[?.!]+$/, "");
    try {
      const { members } = await ctx.fetchJson<{ members: Array<{ id: string; name: string; email: string | null; phone: string | null; region: string; totalVisits: number; lastSeen: string | null }> }>(
        `/api/momence/members?q=${encodeURIComponent(q)}`,
      );
      if (!members.length) return { content: `No Momence members match "${q}". Try an email or phone number.`, rule: "Momence lookup" };
      const rows = members.slice(0, 6).map(
        (m) =>
          `• **${m.name}** (${m.region === "blr" ? "Bengaluru" : "Mumbai"}) - ${m.totalVisits} visits${m.lastSeen ? `, last ${fmtDate(m.lastSeen)}` : ""}${m.email ? ` · ${m.email}` : ""}${m.phone ? ` · ${m.phone}` : ""}`,
      );
      return {
        content: `${members.length} match${members.length === 1 ? "" : "es"} in Momence${members.length > 6 ? " (top 6)" : ""}:\n${rows.join("\n")}\n\nTell me what happened with them and I'll take it from there.`,
        rule: "Momence lookup",
      };
    } catch (e) {
      return { content: `Couldn't reach Momence: ${(e as Error).message}`, rule: "Momence lookup" };
    }
  }

  // ── Classes today / tomorrow ─────────────────────────────────────────────
  const cls = text.match(/^(?:what |which |show |list )?(?:classes|sessions|schedule)\b(.*)$/i);
  if (cls && !hasIssue && t.split(" ").length <= 10) {
    const rest = cls[1] ?? "";
    const day = new Date();
    if (/\btomorrow\b/i.test(rest)) day.setDate(day.getDate() + 1);
    const from = new Date(day); from.setHours(0, 0, 0, 0);
    const to = new Date(day); to.setHours(23, 59, 59, 999);
    const studio = studioFrom(rest);
    const q = studio ? norm(studio.name.split(",")[0]) : "";
    try {
      const { sessions } = await ctx.fetchJson<{ sessions: Array<{ name: string; startsAt: string; teacher: string | null; location: string | null; booked: number; capacity: number | null; cancelled: boolean }> }>(
        `/api/momence/sessions?q=${encodeURIComponent(q)}&from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      const when = /\btomorrow\b/i.test(rest) ? "tomorrow" : "today";
      if (!sessions.length) return { content: `No classes ${when}${studio ? ` at ${studio.name}` : ""}.`, rule: "Class schedule" };
      const rows = sessions.slice(0, 15).map(
        (s) =>
          `• ${new Date(s.startsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} **${s.name}**${s.teacher ? ` - ${s.teacher}` : ""}${studio ? "" : s.location ? ` · ${s.location}` : ""} · ${s.booked}${s.capacity ? `/${s.capacity}` : ""}${s.cancelled ? " · cancelled" : ""}`,
      );
      return {
        content: `${sessions.length} class${sessions.length === 1 ? "" : "es"} ${when}${studio ? ` at ${studio.name}` : ""}${sessions.length > 15 ? " (first 15)" : ""}:\n${rows.join("\n")}`,
        rule: "Class schedule",
      };
    } catch (e) {
      return { content: `Couldn't reach Momence: ${(e as Error).message}`, rule: "Class schedule" };
    }
  }

  return null;
}

export { fmtTime };
