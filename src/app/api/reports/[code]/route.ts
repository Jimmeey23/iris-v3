import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RANGES, runReport, type RangeId } from "@/lib/server/report-engine";
import { EXPORT_FORMATS, exportReport, slug, type ExportFormat } from "@/lib/server/report-export";
import { REPORTS } from "@/lib/iris/reports";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<RangeId, string> = { "30d": "Last 30 days", "90d": "Last 90 days", "365d": "Last 12 months", all: "All time" };

/**
 * GET /api/reports/RPT-001?range=90d            → JSON for the report view
 * GET /api/reports/RPT-001?range=90d&format=csv → file download (csv | json | md | html)
 * Runs under the caller's row-level security, so a report only covers tickets they can see.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/reports/[code]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { code } = await ctx.params;
  const meta = REPORTS.find((r) => r.code === code);
  if (!meta) return NextResponse.json({ error: "Unknown report" }, { status: 404 });

  const rangeParam = request.nextUrl.searchParams.get("range") ?? "365d";
  const range = (rangeParam in RANGES ? rangeParam : "365d") as RangeId;
  const formatParam = request.nextUrl.searchParams.get("format");
  if (formatParam && !(EXPORT_FORMATS as readonly string[]).includes(formatParam)) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  try {
    const result = await withUser(auth.session.user_id, (c) => runReport(c, code, range));
    if (!formatParam) return NextResponse.json(result);
    if (!result.available) return NextResponse.json({ error: result.reason }, { status: 409 });

    const file = exportReport(
      { code, name: meta.name, headers: result.headers, rows: result.rows, generatedAt: result.generatedAt, rangeLabel: RANGE_LABEL[range] },
      formatParam as ExportFormat,
    );
    const filename = `${slug(meta.name)}-${new Date().toISOString().slice(0, 10)}.${file.ext}`;
    // HTML opens in a tab (print → PDF); everything else downloads.
    const disposition = file.ext === "html" ? "inline" : "attachment";
    return new NextResponse(file.body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `${disposition}; filename="${filename}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return dbError(err);
  }
}
