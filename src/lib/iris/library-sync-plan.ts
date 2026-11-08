// IRIS - Decide how the built-in template / knowledge library reaches Neon.
//
// The library is editable in the app and persisted in Neon (iris.ticket_templates,
// iris.knowledge_docs), and the client swaps its in-code defaults for whatever
// Neon returns. New or improved built-ins therefore only reach users once they
// are written to Neon. This module is the pure, unit-tested half of that sync
// (src/lib/server/library-sync.ts runs it). Per built-in item it decides:
//
//   • insert  - the row doesn't exist and never did;
//   • update  - the row is exactly as the system last wrote it (or exactly as the
//               original seed left it), so upgrading it can't lose anyone's work;
//   • leave   - someone edited it (it's theirs now), deleted it (never resurrect -
//               including seed rows deleted before this sync existed), or created
//               their own item under the same code.
//
// State lives in app_settings[LIBRARY_SYNC_SETTING_KEY]: per item the hash of the
// content we last wrote and the row's updated_at (µs epoch) right after the write.

import { BUILTIN_TEMPLATES } from "./templates";
import { BUILTIN_KNOWLEDGE_ARTICLES } from "./knowledge-base-data";

export const LIBRARY_SYNC_SETTING_KEY = "library:builtin_sync";
/** Bump when the planner's rules change in a way that should force a re-plan. */
export const LIBRARY_SYNC_SCHEMA = 1;

export interface SyncRecord {
  /** Hash of the built-in content last written by the sync. */
  h: string;
  /** updated_at (µs since epoch, as text) right after our write; null = owned by a person, never touch. */
  at: string | null;
}

export interface SyncState {
  version?: string;
  templates?: Record<string, SyncRecord>;
  docs?: Record<string, SyncRecord>;
}

export interface BuiltinItem {
  key: string;
  hash: string;
}

export interface ExistingRow {
  key: string;
  /** Row was created through the app by a person (created_by / author is set). */
  userCreated: boolean;
  /** Row was never updated after it was inserted (updated_at ≈ created_at). */
  pristine: boolean;
  /** updated_at as µs since epoch (text, so no precision is lost in JS). */
  atUs: string;
}

export interface CollectionPlan {
  insert: string[];
  update: string[];
  /** Next state for every key; keys being written carry `at: ""` until finalizeRecords() fills them in. */
  records: Record<string, SyncRecord>;
}

/** Deterministic JSON (object keys sorted) so equal content always hashes equally. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** cyrb53 - small, fast, well-distributed 53-bit string hash (hex). Not cryptographic; it only detects change. */
export function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

export const contentHash = (value: unknown): string => hashString(stableStringify(value));

/** One version string for the whole built-in library; unchanged version = nothing to do. */
export function libraryVersion(templates: BuiltinItem[], docs: BuiltinItem[]): string {
  const part = (items: BuiltinItem[]) => items.map((i) => `${i.key}=${i.hash}`).join(";");
  return `v${LIBRARY_SYNC_SCHEMA}-${hashString(`${part(templates)}|${part(docs)}`)}`;
}

/** Plan one collection (templates or docs). `legacySeedKeys` = keys the original SQL seed inserted. */
export function planCollectionSync(
  builtins: BuiltinItem[],
  rows: ExistingRow[],
  previous: Record<string, SyncRecord> | undefined,
  legacySeedKeys: ReadonlySet<string>,
): CollectionPlan {
  const prev = previous ?? {};
  const byKey = new Map(rows.map((r) => [r.key, r]));
  // An empty table was never seeded (or was cleared on purpose): bootstrap it with everything.
  const fresh = rows.length === 0;
  // Keep records we no longer ship (tombstones / history) untouched.
  const records: Record<string, SyncRecord> = { ...prev };
  const insert: string[] = [];
  const update: string[] = [];

  for (const { key, hash } of builtins) {
    const record = prev[key];
    const row = byKey.get(key);

    if (!record) {
      if (!row && legacySeedKeys.has(key) && !fresh) {
        // Seeded originally, gone now: someone deleted it before this sync existed.
        records[key] = { h: hash, at: null };
      } else if (!row) {
        insert.push(key);
        records[key] = { h: hash, at: "" };
      } else if (legacySeedKeys.has(key) && !row.userCreated && row.pristine) {
        // Still exactly as the original seed inserted it.
        update.push(key);
        records[key] = { h: hash, at: "" };
      } else {
        // Edited seed row, or someone's own item under this code.
        records[key] = { h: hash, at: null };
      }
      continue;
    }

    if (!row) continue; // deleted after we wrote it - respect the deletion
    if (record.at === null) continue; // owned by a person
    if (record.h === hash) continue; // nothing new to write
    if (row.atUs === record.at) {
      // Untouched since our last write - safe to upgrade.
      update.push(key);
      records[key] = { h: hash, at: "" };
    } else {
      records[key] = { h: record.h, at: null }; // edited in the app since our write
    }
  }

  return { insert, update, records };
}

/**
 * Fill in `at` for the rows that were just written (key -> updated_at µs from RETURNING).
 * A planned write that didn't happen (validation failure, concurrent edit or delete) keeps
 * the previous record, so the item is simply re-evaluated on the next run.
 */
export function finalizeRecords(
  records: Record<string, SyncRecord>,
  written: Record<string, string>,
  previous: Record<string, SyncRecord> | undefined,
): Record<string, SyncRecord> {
  const out: Record<string, SyncRecord> = {};
  for (const [key, rec] of Object.entries(records)) {
    if (rec.at !== "") out[key] = rec;
    else if (written[key] !== undefined) out[key] = { h: rec.h, at: written[key] };
    else if (previous?.[key]) out[key] = previous[key];
  }
  return out;
}

/** Numeric part of TPL-123 / KB-045, used as sort_order so built-ins list in code order. */
export function sortOrderFor(key: string): number {
  const m = /(\d+)$/.exec(key);
  return m ? Number(m[1]) : 0;
}

const range = (prefix: string, n: number) =>
  new Set(Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(3, "0")}`));

/** Keys inserted by the original SQL seed (db/migrations-templates-knowledge.sql). */
export const LEGACY_TEMPLATE_SEED: ReadonlySet<string> = range("TPL", 111);
export const LEGACY_DOC_SEED: ReadonlySet<string> = range("KB", 25);

export function builtinTemplateItems(): BuiltinItem[] {
  return BUILTIN_TEMPLATES.map((t) => ({ key: t.code, hash: contentHash(t) }));
}

export function builtinDocItems(): BuiltinItem[] {
  return BUILTIN_KNOWLEDGE_ARTICLES.map((d) => ({ key: d.id, hash: contentHash(d) }));
}
