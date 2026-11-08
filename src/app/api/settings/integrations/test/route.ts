import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { configuredRegions, searchSessions } from "@/lib/server/momence";
import { fromAddress, mailConfigured, mailTransportMode } from "@/lib/server/mailer";
import { loadEffectiveAiConfig } from "@/lib/server/ai-config";
import { catalogueIdFor, loadCredentials } from "@/lib/server/integration-vault";
import { probe } from "@/lib/server/integration-probes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim().toLowerCase();
  if (!id) return NextResponse.json({ error: "Integration id required" }, { status: 400 });

  const started = Date.now();
  let ok = false;
  let status = "disconnected";
  let detail = "";

  try {
    if (id === "momence") {
      const regions = configuredRegions();
      if (regions.length === 0) {
        ok = false;
        status = "disconnected";
        detail = "MOMENCE_MUMBAI_* / MOMENCE_BENGALURU_* credentials are not set in environment.";
      } else {
        try {
          const probe = await searchSessions({ limit: 5 });
          ok = true;
          status = "connected";
          detail = `Verified Momence Host API v2 (${regions.join(", ")}) — ${probe.length} upcoming/recent sessions reachable.`;
        } catch (err) {
          ok = false;
          status = "error";
          detail = err instanceof Error ? err.message : "Momence API probe failed";
        }
      }
    } else if (id === "mailtrap" || id === "email") {
      const mode = mailTransportMode();
      const configured = mailConfigured();
      const from = fromAddress();
      if (configured) {
        ok = true;
        status = "connected";
        detail = `Active (${mode}) · Sender ${from.email || from.name}`;
      } else {
        ok = false;
        status = "disconnected";
        detail = "MAILTRAP_FROM_EMAIL + MAILTRAP_API_KEY (or SMTP credentials) not set.";
      }
    } else if (id === "anthropic" || id === "claude" || id === "ai") {
      const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
      const cfg = await loadEffectiveAiConfig();
      if (hasKey && cfg.enabled) {
        ok = true;
        status = "connected";
        detail = `Active · Primary model ${cfg.primaryModel}${cfg.fallbackModel ? ` (fallback: ${cfg.fallbackModel})` : ""}`;
      } else if (!hasKey) {
        ok = false;
        status = "disconnected";
        detail = "ANTHROPIC_API_KEY is not configured in environment.";
      } else {
        ok = false;
        status = "paused";
        detail = cfg.disabledReason || "AI disabled in workspace settings.";
      }
    } else {
      // Every other service: a real read-only call with the resolved credentials.
      const exists = await withUser(auth.session.user_id, async (c) =>
        (await c.query("select 1 from integrations where id = $1", [id])).rowCount,
      );
      if (!exists) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
      const { values, decryptError } = await withUser(auth.session.user_id, (c) => loadCredentials(c, id));
      const r = await probe(catalogueIdFor(id), values);
      ok = r.ok;
      status = r.status;
      detail = decryptError && !r.ok ? `${decryptError} ${r.detail}` : r.detail;
    }

    const latencyMs = Date.now() - started;

    const updated = await withUser(auth.session.user_id, async (c) => {
      const res = await c.query(
        `update integrations
            set status = $2,
                last_synced_at = now(),
                last_sync_status = $3,
                updated_at = now()
          where id = $1
          returning id, name, category, description, type, config, is_enabled, status, last_synced_at, last_sync_status, sync_interval_mins, (credentials_enc is not null) as has_credentials`,
        [id, status, detail.slice(0, 240)],
      );
      return res.rows[0] ?? null;
    });

    return NextResponse.json({ ok, status, latencyMs, detail, row: updated });
  } catch (err) {
    return dbError(err);
  }
}
