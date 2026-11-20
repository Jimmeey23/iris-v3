import "server-only";
import type { PoolClient } from "pg";
import { loadCredentials } from "@/lib/server/integration-vault";

/**
 * respond.io (Developer API v2) WhatsApp template sender. Internal staff only:
 * used for nudges to ticket owners, never to members.
 *
 * Credentials: RESPOND_API_KEY (env) or the respond.io entry in Settings → Integrations.
 * Optional: RESPOND_CHANNEL_ID (WhatsApp channel to send from; respond.io uses the
 * contact's last channel when omitted) and RESPOND_TEMPLATE_LANGUAGE (default "en").
 */
const BASE = "https://api.respond.io/v2";

export type RespondConfig = { apiKey: string; channelId?: number; language: string };

export async function respondConfig(c: PoolClient): Promise<RespondConfig | null> {
  const { values } = await loadCredentials(c, "respond");
  const apiKey = values.api_key?.trim();
  if (!apiKey) return null;
  const ch = Number(values.channel_id);
  return {
    apiKey,
    channelId: Number.isFinite(ch) && ch > 0 ? ch : undefined,
    language: values.template_language?.trim() || "en",
  };
}

/** Normalise an Indian/intl number to E.164 (+91 assumed for bare 10-digit numbers). */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  const d = digits.replace(/\D/g, "");
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  if (d.length >= 11 && d.length <= 15) return `+${d}`;
  return null;
}

async function call(cfg: RespondConfig, path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`respond.io ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * Send an approved WhatsApp template. Creates/updates the contact first so a
 * staff member who has never messaged the business can still receive it.
 */
export async function sendWhatsAppTemplate(
  cfg: RespondConfig,
  to: { phone: string; firstName: string; lastName?: string },
  template: string,
  params: string[],
) {
  const identifier = `phone:${encodeURIComponent(to.phone)}`;
  await call(cfg, `/contact/create_or_update/${identifier}`, {
    firstName: to.firstName,
    lastName: to.lastName ?? "",
    phone: to.phone,
  });
  return call(cfg, `/contact/${identifier}/message`, {
    ...(cfg.channelId ? { channelId: cfg.channelId } : {}),
    message: {
      type: "whatsapp_template",
      template: {
        name: template,
        languageCode: cfg.language,
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) }],
      },
    },
  });
}
