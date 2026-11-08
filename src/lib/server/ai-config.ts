import "server-only";
import type { PoolClient } from "pg";
import { pool } from "./db";

export interface EffectiveAiConfig {
  enabled: boolean;
  disabledReason?: string;
  primaryModel: string;
  fallbackModel: string | null;
  activeModels: string[];
  autoTriage: boolean;
  autoInvestigate: boolean;
  confidenceThreshold: number;
  dailyTokenLimit: number | null;
  monthlyBudgetUsd: number | null;
  todayTokens: number;
  monthCostUsd: number;
  budgetExceeded: boolean;
  budgetExceededReason?: string;
}

const ENV_MODEL = (process.env.ANTHROPIC_MODEL ?? "").trim() || "claude-opus-5-5";

const MODEL_ALIASES: Record<string, string> = {
  "claude opus": "claude-opus-5-5",
  "claude sonnet 4": "claude-sonnet-4-5",
  "claude sonnet": "claude-sonnet-4-5",
  "claude haiku": "claude-haiku-4-5",
};

function resolveAnthropicModelId(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const aliased = MODEL_ALIASES[trimmed.toLowerCase()];
  if (aliased) return aliased;
  if (/^claude-[a-z0-9._-]+$/i.test(trimmed)) return trimmed;
  return null;
}

export async function loadEffectiveAiConfig(client?: PoolClient): Promise<EffectiveAiConfig> {
  const run = async (c: PoolClient): Promise<EffectiveAiConfig> => {
    const [settingsRes, modelsRes, integRes, usageRes] = await Promise.all([
      c
        .query("select key, value from iris.app_settings where key like 'ai.%'")
        .catch(() => ({ rows: [] as Array<{ key: string; value: unknown }> })),
      c
        .query<{ model: string; is_active: boolean; is_primary: boolean }>(
          "select model, is_active, is_primary from iris.ai_models order by is_primary desc, model",
        )
        .catch(() => ({ rows: [] as Array<{ model: string; is_active: boolean; is_primary: boolean }> })),
      c
        .query<{ id: string; is_enabled: boolean }>(
          "select id, is_enabled from iris.integrations where id in ('anthropic', 'ai', 'claude') limit 1",
        )
        .catch(() => ({ rows: [] as Array<{ id: string; is_enabled: boolean }> })),
      c
        .query<{ today_tokens: string; month_cost: number }>(
          `with bounds as (
             select date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as day_start,
                    date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as month_start
           )
           select
             coalesce(sum(input_tokens + cache_read_tokens + cache_write_tokens + output_tokens) filter (where created_at >= day_start), 0)::bigint as today_tokens,
             coalesce(sum(cost_usd), 0)::float8 as month_cost
           from iris.ai_usage, bounds
           where created_at >= month_start`,
        )
        .catch(() => ({ rows: [{ today_tokens: "0", month_cost: 0 }] })),
    ]);

    const settings = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));
    const activeRows = modelsRes.rows.filter((m) => m.is_active !== false);
    const activeClaudeModels = activeRows
      .map((m) => resolveAnthropicModelId(m.model))
      .filter((x): x is string => Boolean(x));
    const activeModels = activeRows.map((m) => m.model);
    const primaryRow = activeRows.find((m) => m.is_primary);
    const tableDefault = primaryRow ? resolveAnthropicModelId(primaryRow.model) : null;
    const settingDefault = resolveAnthropicModelId(
      typeof settings["ai.default_model"] === "string" ? settings["ai.default_model"] : null,
    );
    const settingFallback = resolveAnthropicModelId(
      typeof settings["ai.fallback_model"] === "string" ? settings["ai.fallback_model"] : null,
    );

    let primaryModel = ENV_MODEL;
    if (settingDefault && (activeClaudeModels.length === 0 || activeClaudeModels.includes(settingDefault))) {
      primaryModel = settingDefault;
    } else if (tableDefault) {
      primaryModel = tableDefault;
    } else if (activeClaudeModels[0]) {
      primaryModel = activeClaudeModels[0];
    }

    const fallbackModel =
      settingFallback && settingFallback !== primaryModel
        ? settingFallback
        : activeClaudeModels.find((m) => m !== primaryModel) ?? null;

    const integrationEnabled = integRes.rows[0] ? integRes.rows[0].is_enabled !== false : true;
    const allModelsDisabled = modelsRes.rows.length > 0 && activeRows.length === 0;

    const rawThreshold = Number(settings["ai.confidence_threshold"]);
    const confidenceThreshold = Number.isFinite(rawThreshold)
      ? rawThreshold > 1
        ? Math.min(1, Math.max(0, rawThreshold / 100))
        : Math.min(1, Math.max(0, rawThreshold))
      : 0.72;

    const dailyTokenLimit =
      settings["ai.daily_token_limit"] != null && Number(settings["ai.daily_token_limit"]) > 0
        ? Number(settings["ai.daily_token_limit"])
        : null;
    const monthlyBudgetUsd =
      settings["ai.monthly_budget_usd"] != null && Number(settings["ai.monthly_budget_usd"]) > 0
        ? Number(settings["ai.monthly_budget_usd"])
        : null;

    const todayTokens = Number(usageRes.rows[0]?.today_tokens ?? 0);
    const monthCostUsd = Number(usageRes.rows[0]?.month_cost ?? 0);

    let budgetExceeded = false;
    let budgetExceededReason: string | undefined;
    if (dailyTokenLimit !== null && todayTokens >= dailyTokenLimit) {
      budgetExceeded = true;
      budgetExceededReason = `Daily AI token limit reached (${todayTokens.toLocaleString()} / ${dailyTokenLimit.toLocaleString()} tokens). Adjust in Settings → AI & Models.`;
    } else if (monthlyBudgetUsd !== null && monthCostUsd >= monthlyBudgetUsd) {
      budgetExceeded = true;
      budgetExceededReason = `Monthly AI budget reached ($${monthCostUsd.toFixed(2)} / $${monthlyBudgetUsd.toFixed(2)}). Adjust in Settings → AI & Models.`;
    }

    let enabled = integrationEnabled && !allModelsDisabled;
    let disabledReason: string | undefined;
    if (!integrationEnabled) {
      disabledReason = "AI integration is disabled in Settings → Integrations.";
    } else if (allModelsDisabled) {
      disabledReason = "All AI models are disabled in Settings → AI & Models.";
    } else if (budgetExceeded) {
      enabled = false;
      disabledReason = budgetExceededReason;
    }

    return {
      enabled,
      disabledReason,
      primaryModel,
      fallbackModel,
      activeModels,
      autoTriage: settings["ai.auto_triage"] !== false,
      autoInvestigate: Boolean(settings["ai.auto_investigate"]),
      confidenceThreshold,
      dailyTokenLimit,
      monthlyBudgetUsd,
      todayTokens,
      monthCostUsd,
      budgetExceeded,
      budgetExceededReason,
    };
  };

  if (client) return run(client);
  const c = await pool.connect();
  try {
    return await run(c);
  } finally {
    c.release();
  }
}
