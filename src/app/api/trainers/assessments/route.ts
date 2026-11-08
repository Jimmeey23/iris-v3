import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Every scored trainer assessment the caller may see. RLS limits these to
 * managers and admins; anyone else gets an empty list (not an error), so the
 * Trainers page still works from ticket data alone.
 */
export async function GET() {
  // The Trainers module is admin-only.
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  try {
    const rows = await withUser(auth.session.user_id, async (c) =>
      (await c.query(
        `select id, source_ref, trainer_name, ticket_number, studio, submitted_at, score, band, band_tone, payload, created_at
           from trainer_assessments order by submitted_at desc nulls last limit 2000`,
      )).rows,
    );
    const assessments = rows.map((r) => {
      const p = (r.payload ?? {}) as Record<string, any>;
      const at = (r.submitted_at ?? r.created_at) as Date;
      return {
        id: String(r.id),
        trainerName: r.trainer_name as string,
        ticketNumber: r.ticket_number ?? p.ticketNumber ?? "",
        studio: r.studio ?? p.studio ?? null,
        createdAt: new Date(r.created_at).toISOString(),
        submittedAt: new Date(at).toISOString(),
        score: Number(r.score ?? p.score ?? 0),
        evaluator: p.evaluator ?? "Not recorded",
        title: p.title ?? "Trainer assessment",
        band: r.band ?? p.band ?? "",
        bandTone: r.band_tone ?? p.bandTone ?? "",
        sourceLabel: p.sourceLabel ?? (String(r.source_ref).startsWith("fillout:") ? "Fillout" : "Imported"),
        sessionName: p.sessionName ?? "",
        strengths: p.strengths ?? "",
        improvements: p.improvements ?? "",
        coachingPlan: p.coachingPlan ?? "",
        summary: p.summary ?? "",
        rubric: Array.isArray(p.rubric) ? p.rubric : [],
        answers: Array.isArray(p.answers) ? p.answers : [],
      };
    });
    return NextResponse.json({ assessments });
  } catch (err) {
    return dbError(err);
  }
}
