import "server-only";
import type { PoolClient } from "pg";
import { asSystem, pool } from "./db";
import { docColumns, templateColumns } from "./library";
import { BUILTIN_TEMPLATES, type TicketTemplate } from "@/lib/iris/templates";
import { BUILTIN_KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "@/lib/iris/knowledge-base-data";
import {
  LEGACY_DOC_SEED,
  LEGACY_TEMPLATE_SEED,
  LIBRARY_SYNC_SETTING_KEY,
  builtinDocItems,
  builtinTemplateItems,
  finalizeRecords,
  libraryVersion,
  planCollectionSync,
  sortOrderFor,
  type BuiltinItem,
  type ExistingRow,
  type SyncRecord,
  type SyncState,
} from "@/lib/iris/library-sync-plan";

/**
 * Brings the built-in ticket templates and knowledge articles into Neon.
 *
 * The client replaces its in-code library with whatever /api/templates and
 * /api/knowledge return, so templates or articles added to (or improved in) the
 * code only reach people once they exist in Neon. This runs at the start of
 * those two GET routes. The rules (see library-sync-plan.ts) guarantee it never
 * overwrites an edit made in the app, never resurrects a deleted item, and never
 * touches someone's own template that happens to share a code.
 *
 * Cost: one indexed read per server instance per library version on the fast
 * path; the full sync runs once per version, serialised by a row lock on its
 * app_settings state row. It runs as the system role because any signed-in user's
 * request may trigger it, and it only ever touches the two library tables and
 * its own settings row. Failures are logged and never block the request.
 */

const AT_US = (alias: string) => `floor(extract(epoch from ${alias}updated_at) * 1000000)::bigint::text`;
const RETRY_AFTER_MS = 60_000;

let syncedVersion: string | null = null;
let inflight: Promise<void> | null = null;
let lastFailureAt = 0;
let shipped: { version: string; templates: BuiltinItem[]; docs: BuiltinItem[] } | null = null;

function shippedLibrary() {
  if (!shipped) {
    const templates = builtinTemplateItems();
    const docs = builtinDocItems();
    shipped = { version: libraryVersion(templates, docs), templates, docs };
  }
  return shipped;
}

/** Make sure Neon holds the current built-in library. Never throws. */
export function ensureLibrarySynced(): Promise<void> {
  const { version } = shippedLibrary();
  if (syncedVersion === version || Date.now() - lastFailureAt < RETRY_AFTER_MS) return Promise.resolve();
  inflight ??= runSync()
    .then(
      () => {
        syncedVersion = version;
      },
      (err) => {
        lastFailureAt = Date.now();
        console.warn("[library-sync] skipped:", err instanceof Error ? err.message : err);
      },
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function runSync() {
  const { version, templates, docs } = shippedLibrary();
  // Unlocked single round trip: almost every cold start finds the library current.
  const current = await pool.query<{ v: string | null }>(
    "select value->>'version' as v from iris.app_settings where key = $1",
    [LIBRARY_SYNC_SETTING_KEY],
  );
  if (current.rows[0]?.v === version) return;

  await asSystem(async (c) => {
    await c.query(
      `insert into app_settings (key, value, category, description)
       values ($1, '{}'::jsonb, 'ops', 'Built-in template / knowledge library sync state (managed by the app)')
       on conflict (key) do nothing`,
      [LIBRARY_SYNC_SETTING_KEY],
    );
    const locked = await c.query<{ value: SyncState }>("select value from app_settings where key = $1 for update", [
      LIBRARY_SYNC_SETTING_KEY,
    ]);
    const state = locked.rows[0]?.value ?? {};
    if (state.version === version) return; // another instance just finished

    const existing = await c.query<{ kind: "template" | "doc"; key: string; user_created: boolean; pristine: boolean; at_us: string }>(
      `select 'template' as kind, code as key, created_by_user_id is not null as user_created,
              (updated_at - created_at) < interval '2 seconds' as pristine, ${AT_US("")} as at_us
         from ticket_templates
       union all
       select 'doc', id, author_user_id is not null,
              (updated_at - created_at) < interval '2 seconds', ${AT_US("")}
         from knowledge_docs`,
    );
    const rowsOf = (kind: "template" | "doc"): ExistingRow[] =>
      existing.rows
        .filter((r) => r.kind === kind)
        .map((r) => ({ key: r.key, userCreated: r.user_created, pristine: r.pristine, atUs: r.at_us }));

    const tplRows = rowsOf("template");
    const docRows = rowsOf("doc");
    const nextTemplates = await syncTemplates(c, planCollectionSync(templates, tplRows, state.templates, LEGACY_TEMPLATE_SEED), tplRows, state.templates);
    const nextDocs = await syncDocs(c, planCollectionSync(docs, docRows, state.docs, LEGACY_DOC_SEED), docRows, state.docs);

    await c.query("update app_settings set value = $2::jsonb, updated_at = now() where key = $1", [
      LIBRARY_SYNC_SETTING_KEY,
      JSON.stringify({ version, templates: nextTemplates, docs: nextDocs } satisfies SyncState),
    ]);
  });
}

type Plan = ReturnType<typeof planCollectionSync>;

const writtenAt = (rows: Array<{ key: string; at_us: string }>) => Object.fromEntries(rows.map((r) => [r.key, r.at_us]));

/* ---------------- templates ---------------- */

const TEMPLATE_RECORDSET = `code text, expected_at text, title text, description text, category text, subcategory text,
  department_code text, default_priority text, default_severity text, suggested_assignee_role text, required_fields jsonb,
  form jsonb, recommended_actions text, estimated_resolution_hours integer, sort_order integer`;

function templateRecord(t: TicketTemplate, expectedAt?: string) {
  const { cols, error } = templateColumns(t as unknown as Record<string, unknown>, true);
  if (error) {
    console.warn(`[library-sync] ${t.code} skipped: ${error}`);
    return null;
  }
  return {
    code: t.code,
    expected_at: expectedAt ?? null,
    title: cols.title,
    description: cols.description ?? "",
    category: cols.category,
    subcategory: cols.subcategory ?? null,
    department_code: cols.department_code ?? null,
    default_priority: cols.default_priority ?? "P2",
    default_severity: cols.default_severity ?? null,
    suggested_assignee_role: cols.suggested_assignee_role ?? null,
    required_fields: typeof cols.required_fields === "string" ? JSON.parse(cols.required_fields) : [],
    form: typeof cols.form === "string" ? JSON.parse(cols.form) : null,
    recommended_actions: cols.recommended_actions ?? "",
    estimated_resolution_hours: cols.estimated_resolution_hours ?? 24,
    sort_order: sortOrderFor(t.code),
  };
}

async function syncTemplates(
  c: PoolClient,
  plan: Plan,
  rows: ExistingRow[],
  previous: Record<string, SyncRecord> | undefined,
) {
  const byCode = new Map(BUILTIN_TEMPLATES.map((t) => [t.code, t]));
  const atOf = new Map(rows.map((r) => [r.key, r.atUs]));
  const written: Record<string, string> = {};

  const inserts = plan.insert.map((k) => templateRecord(byCode.get(k)!)).filter(Boolean);
  if (inserts.length) {
    const r = await c.query<{ key: string; at_us: string }>(
      `insert into ticket_templates (code, title, description, category, subcategory, department_code, default_priority,
         default_severity, suggested_assignee_role, required_fields, form, recommended_actions, estimated_resolution_hours, sort_order)
       select code, title, description, category, subcategory, department_code, default_priority, default_severity,
              suggested_assignee_role, coalesce(required_fields, '[]'::jsonb), form, recommended_actions,
              estimated_resolution_hours, sort_order
         from jsonb_to_recordset($1::jsonb) as x(${TEMPLATE_RECORDSET})
       on conflict (code) do nothing
       returning code as key, ${AT_US("")} as at_us`,
      [JSON.stringify(inserts)],
    );
    Object.assign(written, writtenAt(r.rows));
  }

  const updates = plan.update.map((k) => templateRecord(byCode.get(k)!, atOf.get(k))).filter(Boolean);
  if (updates.length) {
    // expected_at: only overwrite rows nobody touched between our read and this write.
    const r = await c.query<{ key: string; at_us: string }>(
      `update ticket_templates t set
         title = x.title, description = x.description, category = x.category, subcategory = x.subcategory,
         department_code = x.department_code, default_priority = x.default_priority, default_severity = x.default_severity,
         suggested_assignee_role = x.suggested_assignee_role, required_fields = coalesce(x.required_fields, '[]'::jsonb),
         form = x.form, recommended_actions = x.recommended_actions,
         estimated_resolution_hours = x.estimated_resolution_hours, sort_order = x.sort_order
       from jsonb_to_recordset($1::jsonb) as x(${TEMPLATE_RECORDSET})
       where t.code = x.code and ${AT_US("t.")} = x.expected_at
       returning t.code as key, ${AT_US("t.")} as at_us`,
      [JSON.stringify(updates)],
    );
    Object.assign(written, writtenAt(r.rows));
  }

  return finalizeRecords(plan.records, written, previous);
}

/* ---------------- knowledge docs ---------------- */

const DOC_RECORDSET = `id text, expected_at text, title text, category text, summary text, steps jsonb, body text,
  tags jsonb, prevention text, escalation text, related_templates jsonb, sort_order integer`;
const TEXT_ARRAY = (col: string) => `coalesce((select array_agg(v) from jsonb_array_elements_text(${col}) v), '{}')`;

function docRecord(d: KnowledgeArticle, expectedAt?: string) {
  const { cols, error } = docColumns(d as unknown as Record<string, unknown>, true);
  if (error) {
    console.warn(`[library-sync] ${d.id} skipped: ${error}`);
    return null;
  }
  return {
    id: d.id,
    expected_at: expectedAt ?? null,
    title: cols.title,
    category: cols.category,
    summary: cols.summary ?? "",
    steps: typeof cols.steps === "string" ? JSON.parse(cols.steps) : [],
    body: cols.body ?? "",
    tags: cols.tags ?? [],
    prevention: cols.prevention ?? null,
    escalation: cols.escalation ?? null,
    related_templates: cols.related_templates ?? [],
    sort_order: sortOrderFor(d.id),
  };
}

async function syncDocs(c: PoolClient, plan: Plan, rows: ExistingRow[], previous: Record<string, SyncRecord> | undefined) {
  const byId = new Map(BUILTIN_KNOWLEDGE_ARTICLES.map((d) => [d.id, d]));
  const atOf = new Map(rows.map((r) => [r.key, r.atUs]));
  const written: Record<string, string> = {};

  const inserts = plan.insert.map((k) => docRecord(byId.get(k)!)).filter(Boolean);
  if (inserts.length) {
    const r = await c.query<{ key: string; at_us: string }>(
      `insert into knowledge_docs (id, title, category, summary, steps, body, tags, prevention, escalation, related_templates, sort_order)
       select id, title, category, summary, coalesce(steps, '[]'::jsonb), body, ${TEXT_ARRAY("tags")},
              prevention, escalation, ${TEXT_ARRAY("related_templates")}, sort_order
         from jsonb_to_recordset($1::jsonb) as x(${DOC_RECORDSET})
       on conflict (id) do nothing
       returning id as key, ${AT_US("")} as at_us`,
      [JSON.stringify(inserts)],
    );
    Object.assign(written, writtenAt(r.rows));
  }

  const updates = plan.update.map((k) => docRecord(byId.get(k)!, atOf.get(k))).filter(Boolean);
  if (updates.length) {
    const r = await c.query<{ key: string; at_us: string }>(
      `update knowledge_docs d set
         title = x.title, category = x.category, summary = x.summary, steps = coalesce(x.steps, '[]'::jsonb),
         body = x.body, tags = ${TEXT_ARRAY("x.tags")}, prevention = x.prevention, escalation = x.escalation,
         related_templates = ${TEXT_ARRAY("x.related_templates")}, sort_order = x.sort_order
       from jsonb_to_recordset($1::jsonb) as x(${DOC_RECORDSET})
       where d.id = x.id and ${AT_US("d.")} = x.expected_at
       returning d.id as key, ${AT_US("d.")} as at_us`,
      [JSON.stringify(updates)],
    );
    Object.assign(written, writtenAt(r.rows));
  }

  return finalizeRecords(plan.records, written, previous);
}
