import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { PoolClient } from "pg";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { put } from "@vercel/blob";
import { asSystem, pool } from "./db";
import { recordAiUsage } from "./ai-usage";
import { aiClassify, INTAKE_MODEL, type ClassifyContext } from "./ai-classify";
import { loadEffectiveAiConfig } from "./ai-config";
import { classify, extractFields, taxonomy } from "./intake";
import { fetchTicket } from "./tickets";
import { searchMembers, REGION_LABEL, configuredRegions } from "./momence-core";
import { getMemberBookings } from "./momence-extra";
import { matchStudio } from "@/lib/iris/aliases";
import { notifyTicketEvent } from "./notify";
import { enrichTicket } from "./ai-enrich";
import { evaluateRoutingRules, selectBestAssignee, type AssignableEmployee, type RoutingRuleRow } from "@/lib/iris/routing-engine";
import { decideOwnership, policyCollectedInfo, type AiRouting } from "@/lib/iris/ownership-policy";
import { computeSlaTargets, type BusinessHoursMap } from "@/lib/iris/sla-calculator";
import {
  emailPromptText, htmlToText, isStaffEmail, junkReason, parseAddress, safeFileName, staffDomains, type Address,
} from "@/lib/iris/email-intake";

/**
 * Email → ticket.
 *
 * Mailtrap Inbound posts `inbound.message_received` to /api/webhooks/mailtrap-inbound. The
 * webhook carries only references, so the message (body, headers, attachments) is read from the
 * Mailtrap API here. Then:
 *   1. junk filter (headers/sender) → logged as ignored, no ticket
 *   2. Claude reads the email: actionable?, forwarded-member details, title, clean description
 *   3. the same classifier + routing + ownership + SLA pipeline as chat intake files the ticket
 *   4. attachments are copied to private Vercel Blob storage (Mailtrap links expire in 1h)
 * Staff senders (company domains) become the reporter; members are recorded as the affected
 * client. Members are never emailed.
 */

const PROVIDER = "mailtrap-inbound";
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENTS = 15;

// ── Signature ────────────────────────────────────────────────────────────────

/** Mailtrap signs the raw body: lowercase hex HMAC-SHA256 in `Mailtrap-Signature`. */
export function verifyMailtrapSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const supplied = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(supplied, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Mailtrap API ─────────────────────────────────────────────────────────────

type MailtrapAttachment = {
  attachment_id?: string | number;
  filename?: string | null;
  size?: number | null;
  content_type?: string | null;
  content_disposition?: string | null;
  download_url?: string | null;
};

type MailtrapMessage = {
  id: string | number;
  inbox_id?: string | number;
  from?: unknown;
  to?: unknown;
  subject?: string | null;
  rfc_message_id?: string | null;
  headers?: Record<string, string | string[]> | null;
  text_body?: string | null;
  html_body?: string | null;
  received_at?: string | null;
  attachments?: MailtrapAttachment[] | null;
};

async function fetchMessage(inboxId: string, messageId: string): Promise<MailtrapMessage> {
  const token = process.env.MAILTRAP_API_TOKEN;
  if (!token) throw new Error("MAILTRAP_API_TOKEN is not set");
  const res = await fetch(
    `https://mailtrap.io/api/inbound/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
    { headers: { "Api-Token": token, Accept: "application/json" }, cache: "no-store" },
  );
  if (res.status === 404) throw new Error("Message not found in Mailtrap (webhook test event, or deleted).");
  if (!res.ok) throw new Error(`Mailtrap message fetch failed (${res.status})`);
  return (await res.json()) as MailtrapMessage;
}

// ── AI reading of the email ──────────────────────────────────────────────────

const EmailRead = z.object({
  is_actionable: z.boolean().describe("true if this email reports an issue, complaint, request or feedback the studio team must act on"),
  not_actionable_reason: z.string().nullable().describe("If not actionable: why (spam, newsletter, thank-you only, auto-reply...)"),
  is_forward: z.boolean().describe("true if the sender is forwarding someone else's email"),
  member_name: z.string().nullable().describe("The member/client the issue is about (the original writer of a forwarded email). Null if none."),
  member_email: z.string().nullable(),
  member_phone: z.string().nullable(),
  studio_hint: z.string().nullable().describe("Studio or location mentioned, as written"),
  title: z.string().describe("Specific one-line ticket title, max 90 chars, no 'Fwd:'/'Re:'"),
  description: z
    .string()
    .describe("Clear ticket description for staff: what happened, when, where, who is affected, what is asked. Plain sentences, keep every concrete fact (dates, class, trainer, amounts). No signatures or quoted boilerplate."),
  issue_text: z.string().describe("The core complaint/request alone, in the writer's words, max 1500 chars - used for categorisation"),
});
type EmailReadT = z.infer<typeof EmailRead>;

let anthropic: Anthropic | null = null;

const READ_SYSTEM = `You read emails sent to the Physique 57 India support inbox (barre fitness studios in Mumbai and Bengaluru) and turn them into ticket drafts.
- Emails are either written by a member/client directly, or forwarded by a staff member (the original member email is quoted below the forward).
- For forwards, the member is the ORIGINAL writer, never the staff forwarder. Read "From:" lines inside the forwarded block.
- Do not invent facts. Leave fields null when the email does not say them.
- Not actionable: newsletters, promotions, spam, delivery/auto replies, pure thank-you notes with nothing to do, calendar notices.`;

const PASTE_SYSTEM = `You read raw text a Physique 57 India staff member pasted into the IRIS support assistant (barre fitness studios in Mumbai and Bengaluru) and turn it into a ticket draft.
- The text can be a copied email or email thread, a WhatsApp/Instagram chat, a review, call notes, or the staff member's own rough notes.
- The member/client is the person the issue is about (the original writer of a copied message), never the staff member who pasted it.
- Strip greetings, signatures, disclaimers, quoted headers and chat timestamps; keep every concrete fact (dates, class, trainer, studio, amounts, booking/membership ids).
- Do not invent facts. Leave fields null when the text does not say them.
- Not actionable only if there is clearly nothing for the team to do.`;

/** Reads raw pasted text (email, chat, notes) the same way inbound emails are read. */
export async function readPastedReport(text: string, userId: string | null = null): Promise<EmailReadT | null> {
  return readEmail(text.slice(0, 12000), PASTE_SYSTEM, { feature: "pasted_report", userId, detail: `Pasted text: ${text.slice(0, 140)}` });
}

async function readEmail(
  prompt: string,
  system = READ_SYSTEM,
  log: { feature: "email_intake" | "pasted_report"; userId: string | null; detail: string } = { feature: "email_intake", userId: null, detail: "Inbound email" },
): Promise<EmailReadT | null> {
  // Training sandbox: mock read, no API call, no usage recorded.
  const { isSandboxRequest } = await import("./db");
  if (await isSandboxRequest()) {
    const { mockReadReport, mockLatency } = await import("./sandbox-ai");
    await mockLatency();
    return mockReadReport(prompt) as EmailReadT;
  }
  anthropic ??= new Anthropic();
  const model = INTAKE_MODEL;
  const response = await anthropic.messages.parse({
    model,
    max_tokens: 2000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "low", format: zodOutputFormat(EmailRead) },
  } as Parameters<Anthropic["messages"]["parse"]>[0]);
  const u = response.usage;
  await recordAiUsage({ userId: log.userId, model: response.model ?? model, usage: u, feature: log.feature, detail: log.detail });
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return response.parsed_output as EmailReadT;
}

// ── Event log (iris.webhook_events) ──────────────────────────────────────────

/** Claims a message once. Returns the log row id, or null if it was already handled. */
export async function claimMessage(ref: { eventId: string; messageId: string; inboxId: string | null }, headers: Record<string, unknown>) {
  return asSystem(async (c) => {
    const dupe = (
      await c.query(
        `select id from iris.webhook_events
          where provider = $1 and payload->>'message_id' = $2 and status in ('processing', 'processed', 'ignored')
          limit 1`,
        [PROVIDER, ref.messageId],
      )
    ).rows[0];
    if (dupe) return null;
    return (
      await c.query(
        `insert into iris.webhook_events (provider, event_type, payload, headers, status)
         values ($1, 'inbound.message_received', $2::jsonb, $3::jsonb, 'processing') returning id`,
        [PROVIDER, JSON.stringify({ message_id: ref.messageId, inbox_id: ref.inboxId, event_id: ref.eventId }), JSON.stringify(headers)],
      )
    ).rows[0].id as string;
  });
}

async function finish(logId: string, status: "processed" | "ignored" | "failed", error: string | null, ticketId: string | null = null, extra: Record<string, unknown> = {}) {
  await asSystem((c) =>
    c.query(
      `update iris.webhook_events
          set status = $2, processing_error = $3, ticket_id = $4, processed_at = now(), payload = payload || $5::jsonb
        where id = $1`,
      [logId, status, error, ticketId, JSON.stringify(extra)],
    ),
  ).catch((e) => console.error("[email-intake] log update failed", e));
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function processInboundMessage(logId: string, ref: { messageId: string; inboxId: string | null }) {
  try {
    const inboxId = ref.inboxId ?? process.env.MAILTRAP_INBOUND_INBOX_ID ?? "";
    if (!inboxId) throw new Error("No inbox id on the event and MAILTRAP_INBOUND_INBOX_ID is not set");
    const expectedInbox = process.env.MAILTRAP_INBOUND_INBOX_ID;
    if (expectedInbox && ref.inboxId && ref.inboxId !== expectedInbox) {
      await finish(logId, "ignored", `Event for inbox ${ref.inboxId}, not the IRIS inbox.`);
      return;
    }

    const msg = await fetchMessage(inboxId, ref.messageId);
    // Google Groups rewrites From to the group ("Name via IRIS Tickets <tickets@…>") for senders
    // with strict DMARC; the real sender is kept in X-Original-Sender (else Reply-To).
    const hdr = Object.fromEntries(Object.entries(msg.headers ?? {}).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]));
    const from = parseAddress(hdr["x-original-sender"]) ?? (/\bvia\b/i.test(String(msg.from ?? "")) ? parseAddress(hdr["reply-to"]) : null) ?? parseAddress(msg.from);
    if (!from) {
      await finish(logId, "ignored", "No sender address.");
      return;
    }
    const subject = (msg.subject ?? "").trim() || null;
    const text = (msg.text_body?.trim() || (msg.html_body ? htmlToText(msg.html_body) : "")).slice(0, 20000);
    const files = (msg.attachments ?? []).filter((a) => a.content_disposition !== "inline" || !a.content_type?.startsWith("image/") || (a.size ?? 0) > 20_000);
    const meta = { from: from.email, from_name: from.name, subject, rfc_message_id: msg.rfc_message_id ?? null };

    const junk = junkReason({ from: from.email, subject, headers: msg.headers ?? null, text });
    if (junk) {
      await finish(logId, "ignored", `Junk: ${junk}`, null, meta);
      return;
    }

    // Same email delivered twice (e.g. sent to both the Google group and Mailtrap directly).
    if (msg.rfc_message_id) {
      const seen = await asSystem(async (c) =>
        (await c.query(
          `select ticket_id from iris.webhook_events
            where provider = $1 and id <> $2 and payload->>'rfc_message_id' = $3 and status = 'processed' limit 1`,
          [PROVIDER, logId, msg.rfc_message_id],
        )).rows[0],
      );
      if (seen) {
        await finish(logId, "ignored", "Duplicate of an email already ticketed.", seen.ticket_id ?? null, meta);
        return;
      }
    }

    // Headers like X-Original-Sender / Reply-To / From are trivially forged, so only treat the
    // sender as staff (reporter = that employee) when the receiving server recorded a DKIM or
    // DMARC pass for a staff domain. Otherwise the email is filed as a member email.
    const staff = isStaffEmail(from.email, staffDomains()) && senderAuthenticated(msg.headers ?? null, staffDomains());
    if (isStaffEmail(from.email, staffDomains()) && !staff) {
      console.warn("[email-intake] staff-looking sender without DKIM/DMARC pass; filing as non-staff", from.email);
    }
    const prompt = emailPromptText({ from: from.name ? `${from.name} <${from.email}>` : from.email, subject, text, attachments: files.map((f) => f.filename ?? "file") });

    const aiCfg = await loadEffectiveAiConfig();
    const aiOn = Boolean(process.env.ANTHROPIC_API_KEY) && aiCfg.enabled;
    let read: EmailReadT | null = null;
    if (aiOn) {
      try {
        read = await readEmail(prompt, READ_SYSTEM, { feature: "email_intake", userId: null, detail: `Inbound email from ${from.email}: ${subject ?? ""}` });
      } catch (e) {
        console.error("[email-intake] AI read failed", (e as Error).message);
      }
    }
    if (read && !read.is_actionable) {
      await finish(logId, "ignored", `Junk (AI): ${read.not_actionable_reason ?? "not actionable"}`, null, meta);
      return;
    }

    const member = {
      name: read?.member_name ?? (staff ? null : from.name),
      email: read?.member_email ?? (staff ? null : from.email),
      phone: read?.member_phone ?? null,
    };
    const momence = await lookupMemberStudio(member).catch((e) => {
      console.error("[email-intake] momence lookup failed", (e as Error).message);
      return null;
    });
    const ticketId = await fileTicket({ from, staff, subject, text, read, aiOn: aiOn && aiCfg.autoTriage, received: msg.received_at ?? null, momence });
    const stored = await storeAttachments(ticketId, files);

    await asSystem(async (c) => {
      const lines = [
        `Email received from ${from.name ? `${from.name} <${from.email}>` : from.email}${staff ? " (staff)" : ""}`,
        `Subject: ${subject ?? "(no subject)"}`,
        stored.saved.length ? `Attachments saved: ${stored.saved.join(", ")}` : null,
        stored.skipped.length ? `Attachments not saved: ${stored.skipped.join(", ")}` : null,
        "",
        text.slice(0, 4000),
      ].filter((l) => l !== null);
      await c.query(
        `insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name, metadata)
         values ($1, 'email_received', $2, $3, $4::jsonb)`,
        [ticketId, lines.join("\n"), from.name ?? from.email, JSON.stringify({ ...meta, staff, mailtrap_message_id: ref.messageId })],
      );
    });

    await finish(logId, "processed", stored.skipped.length ? `Some attachments not saved: ${stored.skipped.join(", ")}` : null, ticketId, meta);

    const ticket = await asSystem((c) => fetchTicket(c, ticketId));
    if (ticket) {
      notifyTicketEvent("ticket_created", ticket, null);
      await enrichTicket(ticket.id, {}).catch(() => undefined);
    }
  } catch (err) {
    console.error("[email-intake]", err);
    await finish(logId, "failed", err instanceof Error ? err.message.slice(0, 500) : "Processing failed.");
  }
}

// ── Ticket ───────────────────────────────────────────────────────────────────

type Employee = AssignableEmployee & {
  name: string;
  email: string | null;
  role: string | null;
  title: string | null;
  skills: string[] | null;
};

async function fileTicket(i: {
  from: Address;
  staff: boolean;
  subject: string | null;
  text: string;
  read: EmailReadT | null;
  aiOn: boolean;
  received: string | null;
  momence: MemberStudio | null;
}): Promise<string> {
  return asSystem(async (c) => {
    const [employeesRes, studiosRes, deptRes, rulesRes, settingsRes] = await Promise.all([
      c.query<Employee>(
        `select id, name, email::text as email, role, title, skills, department_code, studio_codes, availability, workload,
                max_workload, escalation_order, is_active
           from employees where is_active`,
      ),
      c.query<{ code: string; name: string; city: string }>("select code, name, city from studios where is_active"),
      c.query<{ code: string; name: string; description: string | null; head_employee_id: string | null }>(
        "select code, name, description, head_employee_id from departments where is_active is not false",
      ),
      c.query<RoutingRuleRow>(
        "select id, name, condition, department_code, priority, sort_order, is_active from routing_rules where is_active = true order by sort_order, name",
      ),
      c.query<{ key: string; value: unknown }>(
        `select key, value from app_settings
          where key in ('routing.auto_assign', 'routing.load_balance', 'routing.studio_affinity',
                        'routing.round_robin_fallback', 'routing.require_acknowledgment', 'sla.business_hours')`,
      ),
    ]);
    const employees = employeesRes.rows;
    const studios = studiosRes.rows;
    const departments = deptRes.rows;
    const settings = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));

    const reporter = i.staff ? employees.find((e) => e.email?.toLowerCase() === i.from.email) ?? null : null;
    const read = i.read;
    const issueText = read?.issue_text?.trim() || `${i.subject ?? ""}\n${i.text}`.slice(0, 4000);
    const classifyText = [read?.studio_hint ? `Studio: ${read.studio_hint}` : null, issueText].filter(Boolean).join("\n");
    const fields = extractFields(`${i.subject ?? ""}\n${classifyText}`, employees.filter((e) => e.department_code === "TRN").map((e) => e.name));

    // Category / department / priority / owner: Claude classifier, falling back to keyword rules.
    let category = "General";
    let subcategory: string | null = null;
    let department: string | null = null;
    let priority: "P0" | "P1" | "P2" | "P3" = "P2";
    let aiOwner: string | null = null;
    let aiRouting: AiRouting | null = null;
    let studioCode: string | null = fields.studioCode ?? null;
    let aiTitle: string | null = null;
    let classifiedBy = "rules";

    const tax = await taxonomy(c);
    if (i.aiOn) {
      const ctx: ClassifyContext = {
        taxonomy: tax.categories,
        studios,
        departments,
        employees: employees.map((e) => ({ id: e.id, name: e.name, department_code: e.department_code, role: e.role, title: e.title, skills: e.skills, studio_codes: e.studio_codes })),
      };
      try {
        const ai = await aiClassify(classifyText, ctx, null, undefined, "email_intake");
        const known = tax.categories.find((x) => x.category === ai.category);
        if (ai.understood && known) {
          category = known.category;
          subcategory = known.subcategories.find((s) => s.name === ai.subcategory)?.name ?? null;
          const m = tax.meta(category, subcategory);
          department = departments.some((d) => d.code === ai.department_code) ? ai.department_code : m.department ?? known.department;
          priority = ai.priority ?? m.priority;
          aiOwner = ai.owner_employee_id;
          aiRouting = { rule: ai.routing_rule, also: ai.also_routing_rules };
          aiTitle = ai.title;
          if (!studioCode && studios.some((s) => s.code === ai.studio_code)) studioCode = ai.studio_code;
          classifiedBy = "ai";
        }
      } catch (e) {
        console.error("[email-intake] classify failed", (e as Error).message);
      }
    }
    if (classifiedBy === "rules") {
      const det = await classify(c, classifyText, Boolean(fields.trainerName));
      const top = det.candidates[0];
      if (top) {
        category = top.category;
        subcategory = top.subcategory;
        department = top.department;
        priority = top.priority;
      }
    }
    if (fields.urgent && ["P0", "P1"].includes(fields.urgent) && fields.urgent < priority) priority = fields.urgent;

    // Email didn't name a studio: use the member's usual studio from Momence bookings.
    let studioVia: string | null = studioCode ? "email" : null;
    if (!studioCode && i.momence?.studioCode && studios.some((s) => s.code === i.momence!.studioCode)) {
      studioCode = i.momence.studioCode;
      studioVia = "momence";
    }
    const studioCity = studioCode ? studios.find((s) => s.code === studioCode)?.city ?? null : i.momence?.city ?? null;
    const title = (read?.title?.trim() || aiTitle || i.subject || "Email request").replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "").slice(0, 300);

    const memberName = read?.member_name ?? (i.staff ? null : i.from.name);
    const memberEmail = read?.member_email ?? (i.staff ? null : i.from.email);
    const memberPhone = read?.member_phone ?? null;
    const header = [
      i.staff
        ? `Forwarded by ${reporter?.name ?? i.from.name ?? i.from.email} (${i.from.email}).`
        : `Emailed in by ${i.from.name ? `${i.from.name} <${i.from.email}>` : i.from.email}.`,
      memberName || memberEmail || memberPhone
        ? `Member: ${[memberName, memberEmail, memberPhone].filter(Boolean).join(" · ")}`
        : null,
      studioVia === "momence" && i.momence?.location
        ? `Studio: ${i.momence.location} (member's most-booked studio in Momence; the email didn't say)`
        : null,
    ].filter(Boolean);
    const body = read?.description?.trim() || i.text.slice(0, 4000);
    const description = `${header.join("\n")}\n\n${body}`.slice(0, 10000);

    // Routing rules → ownership policy → AI owner (same dept) → workload → dept head.
    const routed = evaluateRoutingRules(rulesRes.rows, {
      category, subcategory, priority, studioCode, studioCity, departmentCode: department, source: "email", tags: [], title, description,
    });
    if (routed.matchedRule?.department_code && routed.matchedRule.department_code !== "Any") department = routed.matchedRule.department_code;
    else if (!department) department = routed.departmentCode;
    if (routed.matchedRule && routed.priority) priority = routed.priority as typeof priority;

    let assigneeId: string | null = null;
    let ownerIds: string[] = [];
    let departmentCodes: string[] = [];
    const collected: Record<string, unknown> = {
      _email: { from: i.from.email, from_name: i.from.name, subject: i.subject, staff: i.staff, received_at: i.received, classified_by: classifiedBy },
      ...(memberEmail ? { memberEmail } : {}),
      ...(memberPhone ? { memberPhone } : {}),
      ...(i.momence ? { _momence_lookup: { ...i.momence, studioVia } } : {}),
    };
    if (routed.matchedRule) collected._routed_by_rule = routed.matchedRule.name;

    const policyInput = { category, subcategory, title, description, studioCode, studioCity, reporterEmployeeId: reporter?.id ?? null, departmentCode: department };
    const policy = decideOwnership(policyInput, undefined, aiRouting);
    if (policy) {
      assigneeId = policy.assigneeId;
      ownerIds = policy.ownerIds;
      if (policy.departmentCodes.length) {
        departmentCodes = [...policy.departmentCodes];
        department = policy.departmentCodes[0];
      }
      Object.assign(collected, policyCollectedInfo(policy));
    } else {
      const aiPick = aiOwner ? employees.find((e) => e.id === aiOwner && e.department_code === department) : undefined;
      if (aiPick) assigneeId = aiPick.id;
      else if (department && settings["routing.auto_assign"] !== false) {
        assigneeId =
          selectBestAssignee(employees, {
            departmentCode: department,
            studioCode: studioCode ?? undefined,
            flags: {
              autoAssign: true,
              loadBalance: settings["routing.load_balance"] !== false,
              studioAffinity: settings["routing.studio_affinity"] !== false,
              roundRobinFallback: settings["routing.round_robin_fallback"] !== false,
              requireAcknowledgment: Boolean(settings["routing.require_acknowledgment"]),
            },
          }) ?? departments.find((d) => d.code === department)?.head_employee_id ?? null;
      }
    }
    if (settings["routing.require_acknowledgment"] === true && (assigneeId || ownerIds.length)) collected._requires_acknowledgment = true;

    const tags = ["via-email", i.staff ? "staff-forward" : "member-email"];
    const { rows } = await c.query(
      `insert into tickets (title, description, category, subcategory, priority, studio_code, department_code,
         assignee_id, reporter_id, affected_client, tags, source, collected_info, department_codes, assignee_ids, client_momence_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'email',$12::jsonb,$13,$14,$15)
       returning id, created_at`,
      [
        title, description, category, subcategory, priority, studioCode, department, assigneeId, reporter?.id ?? null,
        i.momence?.memberName ?? memberName ?? memberEmail ?? null, tags, JSON.stringify(collected), departmentCodes, ownerIds,
        i.momence?.memberId ?? null,
      ],
    );
    const id = rows[0].id as string;

    const slaDef = (
      await c.query<{ response_target_mins: number; resolution_target_mins: number; business_hours_only: boolean }>(
        "select response_target_mins, resolution_target_mins, business_hours_only from sla_definitions where priority = $1 limit 1",
        [priority],
      )
    ).rows[0];
    if (slaDef?.business_hours_only) {
      const t = computeSlaTargets({
        createdAt: rows[0].created_at ? new Date(rows[0].created_at) : new Date(),
        responseTargetMins: Number(slaDef.response_target_mins),
        resolutionTargetMins: Number(slaDef.resolution_target_mins),
        businessHoursOnly: true,
        businessHours: (settings["sla.business_hours"] ?? null) as BusinessHoursMap | null,
      });
      await c.query("update tickets set sla_response_target = $2, sla_resolution_target = $3 where id = $1", [id, t.slaResponseTarget, t.slaResolutionTarget]);
    }
    return id;
  });
}

// ── Momence: the member's usual studio ───────────────────────────────────────

export type MemberStudio = {
  memberId: string;
  memberName: string;
  studioCode: string | null;
  location: string | null;
  city: string | null;
  bookingsCounted: number;
};

const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/[^a-z0-9@.+]/g, "");

/**
 * Finds the member in Momence (email → phone → name) and picks the studio they book most
 * often from their recent sessions. Bounded to ~10s so a slow Momence never blocks intake.
 */
export async function lookupMemberStudio(m: { name: string | null; email: string | null; phone: string | null }): Promise<MemberStudio | null> {
  if (!configuredRegions().length || (!m.email && !m.phone && !m.name)) return null;
  const work = (async () => {
    let found = null as Awaited<ReturnType<typeof searchMembers>>[number] | null;
    if (m.email) found = (await searchMembers(m.email, 5)).find((x) => norm(x.email) === norm(m.email)) ?? null;
    if (!found && m.phone) {
      const digits = m.phone.replace(/\D/g, "").slice(-10);
      if (digits.length >= 8) found = (await searchMembers(digits, 5)).find((x) => (x.phone ?? "").replace(/\D/g, "").endsWith(digits)) ?? null;
    }
    if (!found && m.name && m.name.trim().split(/\s+/).length >= 2) {
      const hits = (await searchMembers(m.name, 5)).filter((x) => norm(x.name) === norm(m.name));
      if (hits.length === 1) found = hits[0]; // only trust an unambiguous full-name match
    }
    if (!found) return null;
    const { rows } = await getMemberBookings(found.id, { limit: 40, includeCancelled: false });
    const counts = new Map<string, number>();
    for (const b of rows) {
      const loc = b.session?.location?.trim();
      if (loc) counts.set(loc, (counts.get(loc) ?? 0) + (b.checkedIn ? 2 : 1));
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      memberId: found.id,
      memberName: found.name,
      studioCode: top ? matchStudio(top) : null,
      location: top,
      city: REGION_LABEL[found.region] ?? null,
      bookingsCounted: rows.length,
    } satisfies MemberStudio;
  })();
  const timeout = new Promise<null>((res) => setTimeout(() => res(null), 10_000));
  return Promise.race([work, timeout]);
}

// ── Attachments ──────────────────────────────────────────────────────────────

async function storeAttachments(ticketId: string, files: MailtrapAttachment[]) {
  const saved: string[] = [];
  const skipped: string[] = [];
  if (!files.length) return { saved, skipped };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { saved, skipped: files.map((f) => `${f.filename ?? "file"} (storage not configured)`) };
  }
  const links: string[] = [];
  for (const [n, f] of files.entries()) {
    const name = safeFileName(f.filename ?? `attachment-${n + 1}`);
    if (n >= MAX_ATTACHMENTS) { skipped.push(`${name} (limit ${MAX_ATTACHMENTS})`); continue; }
    if ((f.size ?? 0) > MAX_ATTACHMENT_BYTES) { skipped.push(`${name} (over 15 MB)`); continue; }
    if (!f.download_url) { skipped.push(`${name} (no download link)`); continue; }
    try {
      const res = await fetch(f.download_url, { cache: "no-store" });
      if (!res.ok) throw new Error(`download ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_ATTACHMENT_BYTES) { skipped.push(`${name} (over 15 MB)`); continue; }
      const contentType = f.content_type || res.headers.get("content-type") || "application/octet-stream";
      const blob = await put(`tickets/${ticketId}/${name}`, buf, { access: "private", contentType, addRandomSuffix: true });
      const attId = await asSystem(async (c: PoolClient) =>
        (await c.query(
          `insert into iris.ticket_attachments (ticket_id, storage_path, file_name, file_size, mime_type, uploaded_by_name)
           values ($1, $2, $3, $4, $5, 'Email intake') returning id`,
          [ticketId, blob.pathname, name, buf.byteLength, contentType],
        )).rows[0].id as string,
      );
      links.push(`/api/attachments/${attId}/${encodeURIComponent(name)}`);
      saved.push(name);
    } catch (e) {
      console.error("[email-intake] attachment failed", name, (e as Error).message);
      skipped.push(`${name} (upload failed)`);
    }
  }
  if (links.length) {
    await asSystem((c) => c.query("update iris.tickets set attachments = attachments || $2::text[] where id = $1", [ticketId, links]));
  }
  return { saved, skipped };
}

/**
 * True when an Authentication-Results header shows `dmarc=pass` or `dkim=pass` for one of
 * `domains` (header.from / header.d / header.i). Google Groups re-sign relayed mail with
 * the group's domain, so group forwards from staff still pass.
 */
function senderAuthenticated(headers: Record<string, unknown> | null, domains: string[]): boolean {
  if (!headers) return false;
  const values: string[] = [];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== "authentication-results" && k.toLowerCase() !== "arc-authentication-results") continue;
    for (const x of Array.isArray(v) ? v : [v]) if (x != null) values.push(String(x).toLowerCase());
  }
  const doms = domains.map((d) => d.toLowerCase().replace(/^@/, "")).filter(Boolean);
  const inDomain = (d: string) => doms.some((s) => d === s || d.endsWith(`.${s}`));
  for (const v of values) {
    for (const m of v.matchAll(/\b(dkim|dmarc)=pass\b[^;]*?\bheader\.(?:d|i|from)=@?([a-z0-9.-]+)/g)) {
      if (inDomain(m[2])) return true;
    }
  }
  return false;
}
