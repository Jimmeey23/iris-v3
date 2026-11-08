import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { INTEGRATION_CATALOGUE, type IntegrationDefinition } from "@/lib/iris/integration-catalogue";

/**
 * Integration credentials, ported from IRIS v2 (lib/config.ts).
 *
 * - Secrets are stored in iris.integrations.credentials_enc as AES-256-GCM
 *   ("iv.tag.data", base64) under INTEGRATION_ENCRYPTION_KEY — the same format
 *   v2 used, so a v2 key decrypts v2-era values.
 * - Environment variables win; values saved in Settings fill whatever the
 *   deployment does not supply. Env names: <ID>_<FIELD>, e.g. STRIPE_API_KEY,
 *   GOOGLE_SHEETS_REFRESH_TOKEN (the ChatGPT entry reads OPENAI_*).
 * - Values never leave the server. The UI only learns which fields are set and
 *   where from.
 */

/** v2 catalogue ids that live under a different row id in v3. */
const DB_ID: Record<string, string> = { chatgpt: "openai", respond: "responseio" };
const CATALOGUE_ID = Object.fromEntries(Object.entries(DB_ID).map(([k, v]) => [v, k]));

export const dbIdFor = (catalogueId: string) => DB_ID[catalogueId] ?? catalogueId;
export const catalogueIdFor = (dbId: string) => CATALOGUE_ID[dbId] ?? dbId;
export const definitionFor = (dbId: string): IntegrationDefinition | undefined =>
  INTEGRATION_CATALOGUE.find((d) => d.id === catalogueIdFor(dbId));

function key() {
  const k = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!k || !/^[a-fA-F0-9]{64}$/.test(k)) {
    throw Object.assign(new Error("Set INTEGRATION_ENCRYPTION_KEY (64 hex characters) before saving credentials."), { code: "P0001" });
  }
  return Buffer.from(k, "hex");
}

export function encryptSecrets(values: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(values)), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecrets(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  const [iv, tag, data] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString());
}

export function envPrefix(catalogueId: string) {
  return catalogueId === "chatgpt" ? "OPENAI" : catalogueId.toUpperCase().replaceAll("-", "_");
}

export function envCredentials(catalogueId: string, source: Record<string, string | undefined> = process.env) {
  const prefix = envPrefix(catalogueId) + "_";
  return Object.fromEntries(
    Object.entries(source)
      .filter(([k, v]) => k.startsWith(prefix) && v && v.trim() !== "")
      .map(([k, v]) => [k.slice(prefix.length).toLowerCase(), v!.trim()]),
  ) as Record<string, string>;
}

export type FieldStatus = { key: string; label: string; secret: boolean; source: "env" | "saved" | null; value?: string };

/**
 * Resolved credentials plus, per catalogue field, where its value comes from.
 * Non-secret saved values are returned for display (e.g. a form id); secrets never are.
 */
export async function loadCredentials(c: PoolClient, dbId: string) {
  const def = definitionFor(dbId);
  const row = (await c.query("select credentials_enc from iris.integrations where id = $1", [dbId])).rows[0];
  let saved: Record<string, string> = {};
  let decryptError: string | null = null;
  try {
    saved = decryptSecrets(row?.credentials_enc);
  } catch {
    decryptError = "Saved credentials can't be decrypted — INTEGRATION_ENCRYPTION_KEY has changed. Re-enter them.";
  }
  const env = envCredentials(catalogueIdFor(dbId));
  const values: Record<string, string> = { ...saved, ...env };
  const fields: FieldStatus[] = (def?.fields ?? []).map((f) => ({
    key: f.key,
    label: f.label,
    secret: Boolean(f.secret),
    source: env[f.key] ? "env" : saved[f.key] ? "saved" : null,
    value: !f.secret && saved[f.key] && !env[f.key] ? saved[f.key] : undefined,
  }));
  return { values, fields, decryptError };
}

/** Merge `changes` into the saved credentials: a blank value keeps the old one, null removes it. */
export async function saveCredentials(c: PoolClient, dbId: string, changes: Record<string, string | null>) {
  const def = definitionFor(dbId);
  if (!def) throw Object.assign(new Error("This integration has no credential fields."), { code: "P0001" });
  const allowed = new Set(def.fields.map((f) => f.key));
  const row = (await c.query("select credentials_enc from iris.integrations where id = $1 for update", [dbId])).rows[0];
  if (!row) throw Object.assign(new Error("Integration not found"), { code: "P0001" });
  let current: Record<string, string> = {};
  try {
    current = decryptSecrets(row.credentials_enc);
  } catch {
    current = {}; // unreadable under the current key: start over with what was entered
  }
  for (const [k, v] of Object.entries(changes)) {
    if (!allowed.has(k)) continue;
    if (v === null) delete current[k];
    else if (typeof v === "string" && v.trim() !== "") current[k] = v.trim().slice(0, 4000);
  }
  const enc = Object.keys(current).length ? encryptSecrets(current) : null;
  await c.query("update iris.integrations set credentials_enc = $2, updated_at = now() where id = $1", [dbId, enc]);
}
