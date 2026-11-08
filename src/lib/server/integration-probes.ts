import "server-only";
import { lookup } from "dns/promises";

/**
 * Connection tests. Each makes one READ-ONLY call that only succeeds with valid
 * credentials (who-am-I, list one record, token refresh). Nothing is sent, posted
 * or changed. Webhook-only services can't be verified without posting a message,
 * so they are checked for a valid public HTTPS URL and reported as "not verified".
 */

export type ProbeResult = { ok: boolean; status: "connected" | "error" | "disconnected" | "configured"; detail: string };

const TIMEOUT = 10_000;
const basic = (u: string, p: string) => "Basic " + Buffer.from(`${u}:${p}`).toString("base64");

async function call(url: string, init: RequestInit = {}): Promise<ProbeResult & { body?: unknown }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT), redirect: "error", cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: "connected", detail: "", body };
    const b = (body ?? {}) as Record<string, any>;
    const msg = b.error?.message ?? b.message ?? b.error_description ?? (typeof b.error === "string" ? b.error : "") ?? "";
    return { ok: false, status: "error", detail: `${res.status} ${res.statusText}${msg ? ` — ${String(msg).slice(0, 160)}` : ""}` };
  } catch (e) {
    return { ok: false, status: "error", detail: e instanceof Error ? e.message : "Request failed" };
  }
}

function missing(c: Record<string, string>, keys: string[]): ProbeResult | null {
  const absent = keys.filter((k) => !c[k]);
  return absent.length ? { ok: false, status: "disconnected", detail: `Missing: ${absent.join(", ")}` } : null;
}

async function webhook(raw: string | undefined): Promise<ProbeResult> {
  if (!raw) return { ok: false, status: "disconnected", detail: "Missing: webhook_url" };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, status: "error", detail: "The webhook URL isn't a valid URL." };
  }
  if (u.protocol !== "https:" || u.username || u.password) {
    return { ok: false, status: "error", detail: "Use a public HTTPS webhook without credentials in the URL." };
  }
  try {
    const records = await lookup(u.hostname, { all: true });
    if (!records.length) return { ok: false, status: "error", detail: `${u.hostname} doesn't resolve.` };
  } catch {
    return { ok: false, status: "error", detail: `${u.hostname} doesn't resolve.` };
  }
  return { ok: true, status: "configured", detail: `Valid HTTPS webhook on ${u.hostname}. Not verified — that would post a message.` };
}

async function google(c: Record<string, string>): Promise<ProbeResult> {
  const m = missing(c, ["client_id", "client_secret", "refresh_token"]);
  if (m) return m;
  const r = await call("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: c.refresh_token, grant_type: "refresh_token" }),
  });
  return r.ok ? { ok: true, status: "connected", detail: "Google accepted the refresh token." } : r;
}

type Probe = (c: Record<string, string>) => Promise<ProbeResult>;

const PROBES: Record<string, Probe> = {
  chatgpt: async (c) => missing(c, ["api_key"]) ?? (await call("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${c.api_key}` } })),
  anthropic: async (c) =>
    missing(c, ["api_key"]) ??
    (await call("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": c.api_key, "anthropic-version": "2023-06-01" } })),
  fillout: async (c) => missing(c, ["api_key"]) ?? (await call("https://api.fillout.com/v1/api/forms", { headers: { authorization: `Bearer ${c.api_key}` } })),
  whatsapp: async (c) =>
    missing(c, ["access_token", "phone_number_id"]) ??
    (await call(`https://graph.facebook.com/${c.api_version || "v21.0"}/${encodeURIComponent(c.phone_number_id)}`, { headers: { authorization: `Bearer ${c.access_token}` } })),
  notion: async (c) =>
    missing(c, ["api_key"]) ?? (await call("https://api.notion.com/v1/users/me", { headers: { authorization: `Bearer ${c.api_key}`, "notion-version": "2022-06-28" } })),
  airtable: async (c) => missing(c, ["api_key"]) ?? (await call("https://api.airtable.com/v0/meta/whoami", { headers: { authorization: `Bearer ${c.api_key}` } })),
  trello: async (c) =>
    missing(c, ["api_key", "token"]) ??
    (await call(`https://api.trello.com/1/members/me?key=${encodeURIComponent(c.api_key)}&token=${encodeURIComponent(c.token)}`)),
  asana: async (c) => missing(c, ["api_key"]) ?? (await call("https://app.asana.com/api/1.0/users/me", { headers: { authorization: `Bearer ${c.api_key}` } })),
  zendesk: async (c) =>
    missing(c, ["subdomain", "email", "api_token"]) ??
    (/^[a-z0-9-]+$/i.test(c.subdomain)
      ? await call(`https://${c.subdomain}.zendesk.com/api/v2/users/me.json`, { headers: { authorization: basic(`${c.email}/token`, c.api_token) } })
      : { ok: false, status: "error", detail: "Subdomain should be just the name, e.g. physique57." }),
  twilio: async (c) =>
    missing(c, ["account_sid", "auth_token"]) ??
    (await call(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.account_sid)}.json`, { headers: { authorization: basic(c.account_sid, c.auth_token) } })),
  hubspot: async (c) => missing(c, ["api_key"]) ?? (await call("https://api.hubapi.com/account-info/v3/details", { headers: { authorization: `Bearer ${c.api_key}` } })),
  calendly: async (c) => missing(c, ["api_key"]) ?? (await call("https://api.calendly.com/users/me", { headers: { authorization: `Bearer ${c.api_key}` } })),
  stripe: async (c) => missing(c, ["api_key"]) ?? (await call("https://api.stripe.com/v1/balance", { headers: { authorization: `Bearer ${c.api_key}` } })),
  razorpay: async (c) =>
    missing(c, ["key_id", "key_secret"]) ?? (await call("https://api.razorpay.com/v1/payments?count=1", { headers: { authorization: basic(c.key_id, c.key_secret) } })),
  jira: async (c) => {
    const m = missing(c, ["site", "email", "api_token"]);
    if (m) return m;
    const host = c.site.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9-]+\.atlassian\.net$/i.test(host)) return { ok: false, status: "error", detail: "Site should look like yourteam.atlassian.net." };
    return call(`https://${host}/rest/api/3/myself`, { headers: { authorization: basic(c.email, c.api_token), accept: "application/json" } });
  },
  gmail: google,
  "google-calendar": google,
  "google-contacts": google,
  "google-sheets": google,
  "google-docs": google,
  slack: (c) => webhook(c.webhook_url),
  zapier: (c) => webhook(c.webhook_url),
  discord: (c) => webhook(c.webhook_url),
  teams: (c) => webhook(c.webhook_url),
  n8n: (c) => webhook(c.webhook_url),
};

/** Catalogue ids with a real probe here. Momence, Mailtrap and the AI config keep their own checks. */
export function hasProbe(catalogueId: string) {
  return catalogueId in PROBES;
}

export async function probe(catalogueId: string, creds: Record<string, string>): Promise<ProbeResult> {
  const fn = PROBES[catalogueId];
  if (!fn) {
    const any = Object.keys(creds).length > 0;
    return any
      ? { ok: true, status: "configured", detail: "Credentials saved. This service has no read-only check, so it isn't verified." }
      : { ok: false, status: "disconnected", detail: "No credentials saved." };
  }
  const r = await fn(creds);
  if (r.ok && r.status === "connected" && !r.detail) return { ...r, detail: "Verified with a read-only call." };
  return r;
}
