import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { definitionFor, envPrefix, catalogueIdFor, loadCredentials, saveCredentials } from "@/lib/server/integration-vault";

export const dynamic = "force-dynamic";

/** Admin: which credential fields an integration has, and where each value comes from. Never the secrets. */
export async function GET(request: NextRequest) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const id = (request.nextUrl.searchParams.get("id") ?? "").trim().toLowerCase();
  const def = definitionFor(id);
  if (!def) return NextResponse.json({ fields: [], docs: null, help: null, envPrefix: null, vaultReady: vaultReady() });
  try {
    const { fields, decryptError } = await withUser(auth.session.user_id, (c) => loadCredentials(c, id));
    return NextResponse.json({
      fields,
      docs: def.docs,
      help: def.help ?? null,
      envPrefix: envPrefix(catalogueIdFor(id)),
      decryptError,
      vaultReady: vaultReady(),
    });
  } catch (err) {
    return dbError(err);
  }
}

/** Admin: save credentials. Body { id, values: { field: "new value" | null } }. Blank keeps, null removes. */
export async function PUT(request: Request) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const b = (await request.json().catch(() => ({}))) as { id?: unknown; values?: unknown };
  const id = String(b.id ?? "").trim().toLowerCase();
  if (!id || !b.values || typeof b.values !== "object" || Array.isArray(b.values)) {
    return NextResponse.json({ error: "id and values are required" }, { status: 400 });
  }
  const values = Object.fromEntries(
    Object.entries(b.values as Record<string, unknown>)
      .filter(([, v]) => v === null || typeof v === "string")
      .map(([k, v]) => [k, v as string | null]),
  );
  try {
    const fields = await withUser(auth.session.user_id, async (c) => {
      await saveCredentials(c, id, values);
      await c.query(
        `insert into audit_log (actor_user_id, action, entity_type, entity_id, after_state)
         values (iris.current_user_id(), 'integration.credentials_saved', 'integrations', $1, $2::jsonb)`,
        [id, JSON.stringify({ fields: Object.keys(values) })], // field names only, never values
      );
      return (await loadCredentials(c, id)).fields;
    });
    return NextResponse.json({ fields });
  } catch (err) {
    return dbError(err);
  }
}

function vaultReady() {
  return /^[a-fA-F0-9]{64}$/.test(process.env.INTEGRATION_ENCRYPTION_KEY ?? "");
}
