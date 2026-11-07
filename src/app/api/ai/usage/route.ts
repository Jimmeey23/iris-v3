import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { MODEL } from "@/lib/server/agent";
import { isPriced } from "@/lib/server/ai-pricing";

/** Real AI spend (org-wide and yours) for today and this month, in IST, plus the limits from Settings. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const data = await withUser(auth.session.user_id, async (c) => {
      const { rows } = await c.query(
        `with bounds as (
           select date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as day_start,
                  date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as month_start)
         select
           coalesce(sum(input_tokens + cache_read_tokens + cache_write_tokens + output_tokens) filter (where created_at >= day_start), 0)::bigint as today_tokens,
           coalesce(sum(input_tokens + cache_read_tokens + cache_write_tokens) filter (where created_at >= day_start), 0)::bigint as today_input,
           coalesce(sum(output_tokens) filter (where created_at >= day_start), 0)::bigint as today_output,
           coalesce(sum(cache_read_tokens) filter (where created_at >= day_start), 0)::bigint as today_cached,
           coalesce(sum(cost_usd) filter (where created_at >= day_start), 0)::float8 as today_cost,
           count(*) filter (where created_at >= day_start)::int as today_calls,
           coalesce(sum(cost_usd) filter (where created_at >= day_start and user_id = $1), 0)::float8 as today_cost_mine,
           coalesce(sum(cost_usd), 0)::float8 as month_cost,
           coalesce(sum(input_tokens + cache_read_tokens + cache_write_tokens + output_tokens), 0)::bigint as month_tokens
         from ai_usage, bounds where created_at >= month_start`,
        [auth.session.user_id],
      );
      const settings = Object.fromEntries(
        (await c.query("select key, value from app_settings where key in ('ai.daily_token_limit','ai.monthly_budget_usd','ai.alert_threshold_pct')")).rows.map(
          (r) => [r.key, r.value],
        ),
      );
      return { ...rows[0], settings };
    });
    return NextResponse.json({
      model: MODEL,
      priced: isPriced(MODEL),
      today: {
        tokens: Number(data.today_tokens),
        inputTokens: Number(data.today_input),
        outputTokens: Number(data.today_output),
        cachedTokens: Number(data.today_cached),
        costUsd: data.today_cost,
        calls: data.today_calls,
        myCostUsd: data.today_cost_mine,
      },
      month: { tokens: Number(data.month_tokens), costUsd: data.month_cost },
      limits: {
        dailyTokens: Number(data.settings["ai.daily_token_limit"]) || null,
        monthlyBudgetUsd: Number(data.settings["ai.monthly_budget_usd"]) || null,
        alertPct: Number(data.settings["ai.alert_threshold_pct"]) || 80,
      },
    });
  } catch (err) {
    return dbError(err);
  }
}
