import { NextResponse, type NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Streams a private ticket attachment. RLS on iris.ticket_attachments (via the ticket)
 * decides access, so only people who can see the ticket can open its files.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/attachments/[id]/[name]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const row = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select storage_path, file_name, mime_type from ticket_attachments where id = $1", [id])).rows[0] as
        | { storage_path: string; file_name: string; mime_type: string }
        | undefined,
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const blob = await get(row.storage_path, { access: "private" });
    if (!blob) return NextResponse.json({ error: "File is no longer available." }, { status: 404 });
    // Email attachments are untrusted: only images (not SVG) and PDFs open in the browser;
    // everything else (HTML, SVG, scripts...) downloads, so it can't run on the IRIS origin.
    const mime = (row.mime_type || "application/octet-stream").toLowerCase();
    const inline = (mime.startsWith("image/") && !mime.includes("svg")) || mime === "application/pdf";
    return new Response(blob.stream, {
      headers: {
        "Content-Type": inline ? mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return dbError(err);
  }
}
