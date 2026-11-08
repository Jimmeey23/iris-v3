import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { asSystem } from "@/lib/server/db";
import { loadCredentials } from "@/lib/server/integration-vault";
import { FilloutError, parseFilloutAssessment } from "@/lib/iris/fillout-assessment";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000;

/** Constant-time compare; hashing first keeps lengths equal so nothing leaks. */
function secretMatches(supplied: string, expected: string) {
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Fillout → trainer assessment. Configure in Fillout: Integrations → Webhook →
 *   URL:    <app>/api/webhooks/fillout
 *   Header: X-Fillout-Webhook-Secret: <the secret saved under Integrations → Fillout>
 *
 * Every delivery is logged in iris.webhook_events. A repeat delivery of the same
 * submission is acknowledged and ignored. A submission that can't be scored is
 * answered 422 with the reason, so it shows in Fillout's webhook log.
 */
export async function POST(req: Request) {
  const { values, enabled } = await asSystem(async (c) => ({
    ...(await loadCredentials(c, "fillout")),
    enabled: Boolean((await c.query("select is_enabled from iris.integrations where id = 'fillout'")).rows[0]?.is_enabled),
  }));
  const expected = values.webhook_secret;
  if (!expected) return NextResponse.json({ error: "Fillout webhook is not configured." }, { status: 503 });
  if (!enabled) return NextResponse.json({ error: "Fillout is switched off in Integrations." }, { status: 503 });

  const url = new URL(req.url);
  // Header preferred; ?token= for tools (Zite flows) that can't set custom headers.
  const supplied =
    req.headers.get("x-fillout-webhook-secret") ??
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token") ??
    "";
  if (!supplied || !secretMatches(supplied, expected)) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
  }

  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BYTES) return NextResponse.json({ error: "Payload exceeds 2 MB." }, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  return asSystem(async (c) => {
    const event = (
      await c.query(
        `insert into iris.webhook_events (provider, event_type, payload, headers, status)
         values ('fillout', 'submission', $1::jsonb, $2::jsonb, 'processing') returning id`,
        [JSON.stringify(payload), JSON.stringify({ "user-agent": req.headers.get("user-agent"), source: url.searchParams.get("source") })],
      )
    ).rows[0].id as string;
    const finish = (status: string, error: string | null) =>
      c.query("update iris.webhook_events set status = $2, processing_error = $3, processed_at = now() where id = $1", [event, status, error]);

    try {
      const studios = (await c.query("select name from iris.studios where is_active")).rows.map((r) => r.name as string);
      let fieldMap: Record<string, string> | undefined;
      if (values.field_map) {
        try {
          fieldMap = JSON.parse(values.field_map);
        } catch {
          throw new FilloutError("The Fillout field map in Integrations isn't valid JSON.");
        }
      }
      const a = parseFilloutAssessment(payload, {
        fieldMap,
        scoreScale: values.score_scale,
        studios,
        sourceId: url.searchParams.get("source")?.slice(0, 80) || undefined,
      });

      const dupe = (await c.query("select id from iris.trainer_assessments where source_ref = $1", [a.sourceRef])).rows[0];
      if (dupe) {
        await finish("ignored", "Duplicate delivery of an imported submission.");
        return NextResponse.json({ ok: true, duplicate: true, assessmentId: dupe.id });
      }

      const trainer = (
        await c.query(
          `select id, name from iris.trainers
            where lower(name) = lower($1) or lower(coalesce(display_name, '')) = lower($1) or aliases ? $1
            limit 1`,
          [a.trainer],
        )
      ).rows[0];
      const summary = `${trainer?.name ?? a.trainer}'s ${a.sessionName.toLowerCase()} on ${new Date(a.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Scored ${a.score}% (${a.band}).`;
      const row = (
        await c.query(
          `insert into iris.trainer_assessments (source_ref, trainer_id, trainer_name, studio, submitted_at, score, band, band_tone, payload)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
           on conflict (source_ref) do nothing returning id`,
          [
            a.sourceRef, trainer?.id ?? null, trainer?.name ?? a.trainer, a.studio || null, a.submittedAt, a.score, a.band, a.bandTone,
            JSON.stringify({
              id: a.sourceRef, title: `${a.sessionName} — assessment`, score: a.score, band: a.band, bandTone: a.bandTone,
              studio: a.studio, rubric: a.rubric, answers: a.answers, summary, evaluator: a.evaluator,
              strengths: a.strengths, improvements: a.improvements, coachingPlan: a.coachingPlan,
              sessionName: a.sessionName, sourceLabel: `Fillout — ${a.format} assessment`,
              submittedAt: a.submittedAt, createdAt: a.submittedAt, format: a.format,
            }),
          ],
        )
      ).rows[0];
      if (trainer) {
        await c.query(
          `update iris.trainers t set assessment_count = s.n, avg_score = s.avg, updated_at = now()
             from (select count(*)::int n, round(avg(score))::int avg from iris.trainer_assessments where trainer_id = $1) s
            where t.id = $1`,
          [trainer.id],
        );
      }
      await finish("processed", trainer ? null : `Trainer "${a.trainer}" isn't in the directory; saved by name.`);
      return NextResponse.json({ ok: true, assessmentId: row?.id ?? null, score: a.score, band: a.band, trainerMatched: Boolean(trainer) });
    } catch (err) {
      const message = err instanceof FilloutError ? err.message : "Import failed.";
      if (!(err instanceof FilloutError)) console.error("[webhook/fillout]", err);
      await finish("failed", message);
      return NextResponse.json({ error: message }, { status: err instanceof FilloutError ? 422 : 500 });
    }
  });
}
