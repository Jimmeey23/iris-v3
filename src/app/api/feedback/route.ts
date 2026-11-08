import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { enqueueEmail } from "@/lib/server/outbox";
import { BRAND, FONT, emailDocument, esc, label, section } from "@/lib/server/email-layout";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const KINDS = { bug: "Something is broken", visual: "Looks wrong", performance: "Too slow", idea: "Idea / request", content: "Wrong wording or data", other: "Something else" } as const;
const SEVERITIES = { blocker: "Blocker — can't work", high: "High — painful workaround", normal: "Normal", low: "Low — cosmetic" } as const;
const MAX_SCREENSHOT = 3 * 1024 * 1024;

/** Where reports go. Overridable so staging doesn't mail the production developer. */
const DEVELOPER_EMAIL = () => (process.env.FEEDBACK_DEVELOPER_EMAIL || "jimmeey@physique57india.com").trim();

/** Your own reports; admins see everyone's. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const rows = await withUser(auth.session.user_id, async (c) =>
      (await c.query(
        `select id, ref, reporter_name, kind, severity, title, description, context, status, created_at, (screenshot is not null) as has_screenshot
           from product_feedback order by created_at desc limit 100`,
      )).rows,
    );
    return NextResponse.json({ reports: rows });
  } catch (err) {
    return dbError(err);
  }
}

/** File a report: stored, then emailed to the developer. */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    await enforceRateLimit("feedback", userKey(auth.session.user_id));
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "Too many reports in a short time. Try again shortly." }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > 6_000_000) return NextResponse.json({ error: "Report is too large (screenshot over 3 MB?)" }, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const kind = String(b.kind) as keyof typeof KINDS;
  const severity = String(b.severity) as keyof typeof SEVERITIES;
  const title = String(b.title ?? "").trim().slice(0, 160);
  const description = String(b.description ?? "").trim().slice(0, 8000);
  if (!(kind in KINDS) || !(severity in SEVERITIES)) return NextResponse.json({ error: "Pick a type and severity" }, { status: 400 });
  if (title.length < 4) return NextResponse.json({ error: "Give it a short title" }, { status: 400 });
  if (description.length < 10) return NextResponse.json({ error: "Describe what happened in a sentence or two" }, { status: 400 });
  const context = typeof b.context === "object" && b.context ? JSON.stringify(b.context).slice(0, 4000) : "{}";

  let shot: Buffer | null = null;
  let shotType: string | null = null;
  if (typeof b.screenshot === "string" && b.screenshot) {
    const m = b.screenshot.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return NextResponse.json({ error: "Screenshot must be a PNG, JPEG or WebP image" }, { status: 400 });
    shot = Buffer.from(m[2], "base64");
    shotType = m[1];
    if (shot.length > MAX_SCREENSHOT) return NextResponse.json({ error: "Screenshot is over 3 MB" }, { status: 413 });
  }

  try {
    const row = await withUser(auth.session.user_id, async (c) => {
      const me = (await c.query(
        "select coalesce(e.name, u.name, u.email::text) as name, u.email::text as email from users u left join employees e on e.id = u.employee_id where u.id = $1",
        [auth.session.user_id],
      )).rows[0];
      return (await c.query(
        `insert into product_feedback (ref, user_id, reporter_name, reporter_email, kind, severity, title, description, context, screenshot, screenshot_type)
         values ('FB-' || lpad(nextval('product_feedback_seq')::text, 4, '0'), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
         returning id, ref, created_at, reporter_name, reporter_email`,
        [auth.session.user_id, me?.name ?? null, me?.email ?? auth.session.email, kind, severity, title, description, context, shot, shotType],
      )).rows[0];
    });

    const ctx = JSON.parse(context) as Record<string, string>;
    const html = emailDocument({
      title: `${row.ref}: ${title}`,
      preheader: `${KINDS[kind]} · ${SEVERITIES[severity]} · from ${row.reporter_name}`,
      context: `IRIS product feedback · ${row.ref}`,
      accent: severity === "blocker" ? "#b42318" : BRAND.obsidian,
      body: [
        section(`${label("What")}<p style="font-family:${FONT};font-size:16px;font-weight:600;color:${BRAND.ink};margin:0">${esc(title)}</p>
          <p style="font-family:${FONT};font-size:13px;color:${BRAND.faint};margin:6px 0 0">${esc(KINDS[kind])} · ${esc(SEVERITIES[severity])}</p>`),
        section(`${label("Details")}<p style="font-family:${FONT};font-size:14px;line-height:1.55;color:${BRAND.ink};margin:0;white-space:pre-wrap">${esc(description)}</p>`),
        section(`${label("Context")}<p style="font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.ink};margin:0">
          From <b>${esc(row.reporter_name)}</b> (${esc(row.reporter_email)})<br>
          Screen: ${esc(ctx.view ?? "—")} · ${esc(ctx.viewport ?? "")}<br>
          Browser: ${esc((ctx.userAgent ?? "—").slice(0, 160))}<br>
          ${shot ? "Screenshot attached in IRIS (Settings → Feedback)." : "No screenshot."}</p>`),
      ].join(""),
      footer: "Filed from the Feedback button in IRIS.",
    });
    let emailStatus = "queued";
    try {
      await enqueueEmail({
        to: DEVELOPER_EMAIL(),
        subject: `[IRIS ${row.ref}] ${severity === "blocker" ? "BLOCKER · " : ""}${title}`,
        html,
        text: `${row.ref} — ${title}\n${KINDS[kind]} · ${SEVERITIES[severity]}\nFrom ${row.reporter_name} (${row.reporter_email})\nScreen: ${ctx.view ?? "—"}\n\n${description}`,
        replyTo: row.reporter_email ?? undefined,
        category: "product_feedback",
      });
    } catch {
      emailStatus = "email_failed";
    }
    await withUser(auth.session.user_id, (c) => c.query("update product_feedback set email_status = $2 where id = $1", [row.id, emailStatus]).catch(() => null));
    return NextResponse.json({ ok: true, ref: row.ref, emailed: emailStatus === "queued" }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}
