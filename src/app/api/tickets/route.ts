import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { notifyTicketEvent } from "@/lib/server/notify";
import { TICKET_SELECT, fetchTicket, toClientTicket } from "@/lib/server/tickets";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const rows = await withUser(auth.session.user_id, async (c) =>
      (await c.query(`${TICKET_SELECT} order by t.created_at desc`)).rows,
    );
    return NextResponse.json({ tickets: rows.map(toClientTicket) });
  } catch (err) {
    return dbError(err);
  }
}

const PRIORITIES = ["P0", "P1", "P2", "P3"];
const SOURCES = ["manual", "ai_assistant", "email", "webhook", "form_intake", "voice"];
const strList = (v: unknown, max = 10) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 64)))].slice(0, max) : [];
const str = (v: unknown, max = 5000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const b = await request.json().catch(() => ({}));
  const title = str(b.title, 300);
  const category = str(b.category, 120);
  if (!title || !category) return NextResponse.json({ error: "Title and category are required" }, { status: 400 });
  const priority = PRIORITIES.includes(b.priority) ? b.priority : "P2";
  const source = SOURCES.includes(b.source) ? b.source : "manual";
  const tags = Array.isArray(b.tags) ? b.tags.filter((t: unknown) => typeof t === "string").slice(0, 20) : [];

  try {
    const ticket = await withUser(session.user_id, async (c) => {
      const { rows } = await c.query(
        `insert into tickets (title, description, category, subcategory, priority, studio_code, department_code,
           assignee_id, reporter_id, affected_client, client_momence_id, membership_id, booking_id,
           business_impact, operational_impact, severity, recommended_resolution, tags, source,
           collected_info, created_by_user_id, department_codes, assignee_ids)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$22,$23)
         returning id, assignee_id`,
        [
          title, str(b.description) ?? "", category, str(b.subcategory, 120), priority,
          str(b.studioCode, 10), str(b.departmentCode, 10), str(b.assigneeId, 64),
          session.employee_id, str(b.affectedClient, 200), str(b.clientMomenceId, 64),
          str(b.membershipId, 64), str(b.bookingId, 64), str(b.businessImpact), str(b.operationalImpact),
          str(b.severity, 40), str(b.recommendedResolution), tags, source,
          JSON.stringify(b.collectedInfo && typeof b.collectedInfo === "object" ? b.collectedInfo : {}),
          session.user_id, strList(b.departmentCodes), strList(b.assigneeIds),
        ],
      );
      const id = rows[0].id as string;
      if (!rows[0].assignee_id) {
        const auto = (await c.query("select value from app_settings where key = 'routing.auto_assign'")).rows[0];
        if (auto?.value !== false) await c.query("select auto_assign_ticket($1)", [id]);
      }
      return fetchTicket(c, id);
    });
    if (ticket) notifyTicketEvent("ticket_created", ticket, session);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}
