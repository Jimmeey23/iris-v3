import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { REGIONS, REGION_LABEL, configuredRegions } from "@/lib/server/momence";
import { listLocations } from "@/lib/server/momence-extra";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const probe = req.nextUrl.searchParams.get("probe") === "1";

  try {
    const configured = configuredRegions();
    const isAdminOrMgr = auth.session.role === "admin" || auth.session.role === "manager";

    const [integRes, whStatsRes, whRecentRes, locations] = await Promise.all([
      pool
        .query<{ is_enabled: boolean; status: string; last_synced_at: string | null; last_sync_status: string | null }>(
          "select is_enabled, status, last_synced_at, last_sync_status from iris.integrations where id = 'momence' limit 1",
        )
        .catch(() => ({ rows: [] })),
      pool
        .query<{ received_24h: number; received_7d: number; failed_7d: number }>(
          `select
             count(*) filter (where received_at >= now() - interval '24 hours')::int as received_24h,
             count(*) filter (where received_at >= now() - interval '7 days')::int as received_7d,
             count(*) filter (where status = 'failed' and received_at >= now() - interval '7 days')::int as failed_7d
           from iris.webhook_events
          where provider = 'momence'`,
        )
        .catch(() => ({ rows: [{ received_24h: 0, received_7d: 0, failed_7d: 0 }] })),
      isAdminOrMgr
        ? pool
            .query(
              `select id, event_type, status, ticket_id, processing_error, received_at, processed_at
                 from iris.webhook_events
                where provider = 'momence'
                order by received_at desc
                limit 25`,
            )
            .catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),
      probe && configured.length > 0 ? listLocations().catch(() => null) : Promise.resolve(null),
    ]);

    const integ = integRes.rows[0];
    const integrationEnabled = integ ? integ.is_enabled !== false : true;
    const wh = whStatsRes.rows[0] ?? { received_24h: 0, received_7d: 0, failed_7d: 0 };

    return NextResponse.json({
      active: configured.length > 0 && integrationEnabled,
      integrationEnabled,
      integrationStatus: integ?.status ?? (configured.length > 0 ? "connected" : "unconfigured"),
      lastSyncedAt: integ?.last_synced_at ?? null,
      lastSyncStatus: integ?.last_sync_status ?? null,
      regions: REGIONS.map((code) => ({
        code,
        label: REGION_LABEL[code],
        configured: configured.includes(code),
      })),
      configuredRegions: configured,
      webhook: {
        secretConfigured: Boolean(process.env.MOMENCE_WEBHOOK_SECRET),
        endpointPath: "/api/momence/webhook",
        received24h: Number(wh.received_24h),
        received7d: Number(wh.received_7d),
        failed7d: Number(wh.failed_7d),
        recentEvents: whRecentRes.rows,
      },
      locations: locations ?? undefined,
    });
  } catch (err) {
    return dbError(err);
  }
}
