import "server-only";
import type { PoolClient } from "pg";
import { dbIdFor, loadCredentials } from "@/lib/server/integration-vault";

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
  const { values } = await loadCredentials(c, dbIdFor("respond"));
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

type TemplateDef = {
  name: string;
  languageCode: string;
  status: string;
  components: { type: string; format?: string; text?: string; buttons?: { type: string; text?: string; url?: string }[] }[];
};

const varCount = (text?: string) => new Set((text ?? "").match(/\{\{\d+\}\}/g) ?? []).size;

/** Approved template definition from respond.io, cached for 10 minutes per channel+name. */
const templateCache = new Map<string, { at: number; def: TemplateDef | null }>();
async function getTemplate(cfg: RespondConfig, name: string): Promise<TemplateDef | null> {
  if (!cfg.channelId) return null;
  const key = `${cfg.channelId}:${name}`;
  const hit = templateCache.get(key);
  if (hit && Date.now() - hit.at < 600_000) return hit.def;
  const res = await fetch(`${BASE}/space/channel/${cfg.channelId}/template`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`respond.io templates ${res.status}`);
  const items = ((await res.json()) as { items?: TemplateDef[] }).items ?? [];
  const def = items.find((t) => t.name === name && t.status === "approved") ?? items.find((t) => t.name === name) ?? null;
  templateCache.set(key, { at: Date.now(), def });
  return def;
}

/**
 * Send an approved WhatsApp template. `params` are the variables in order:
 * body variables first, then any URL-button variables (e.g. iris_nudge has
 * 3 body variables and the ticket id on its "Open Ticket" button).
 * The language and layout come from the approved template itself, so a
 * language mismatch in Settings can't break the send.
 * Creates/updates the contact first so a staff member who has never messaged
 * the business can still receive it.
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

  const def = await getTemplate(cfg, template);
  if (cfg.channelId && !def) throw new Error(`Template "${template}" not found on channel ${cfg.channelId}`);
  const p = (t: string) => ({ type: "text", text: t.slice(0, 1000) });
  let components: unknown[];
  if (def) {
    let i = 0;
    components = def.components.map((c) => {
      if (c.type === "body") {
        const n = varCount(c.text);
        const out = { ...c, parameters: params.slice(i, i + n).map(p) };
        i += n;
        return out;
      }
      if (c.type === "buttons") {
        return {
          ...c,
          buttons: (c.buttons ?? []).map((b) => {
            if (b.type !== "url" || !varCount(b.url)) return b;
            return { ...b, parameters: [p(params[i++] ?? "")] };
          }),
        };
      }
      return c;
    });
  } else {
    components = [{ type: "body", parameters: params.map(p) }];
  }

  return call(cfg, `/contact/${identifier}/message`, {
    ...(cfg.channelId ? { channelId: cfg.channelId } : {}),
    message: {
      type: "whatsapp_template",
      template: { name: template, languageCode: def?.languageCode ?? cfg.language, components },
    },
  });
}
