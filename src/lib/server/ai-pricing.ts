import "server-only";

/**
 * Claude list prices in USD per million tokens (Claude API, first-party).
 * cacheRead / cacheWrite are multipliers on the input rate (5-minute cache).
 * `longPrompt` applies when the whole prompt exceeds 100K tokens.
 */
type Rate = { input: number; output: number; cacheRead: number; cacheWrite: number; longPrompt?: { input: number; output: number } };

const RATES: Record<string, Rate> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.1, cacheWrite: 1.25, longPrompt: { input: 0.5, output: 2.5 } },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.05, cacheWrite: 1.25 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.025, cacheWrite: 1.25 },
};

export type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

/** Cost of one API response in USD, or null when the model's price isn't known. */
export function costUsd(model: string, u: Usage): number | null {
  const r = RATES[model];
  if (!r) return null;
  const read = u.cache_read_input_tokens ?? 0;
  const write = u.cache_creation_input_tokens ?? 0;
  const promptTokens = u.input_tokens + read + write;
  const rate = r.longPrompt && promptTokens > 100_000 ? { ...r, ...r.longPrompt } : r;
  return (
    (u.input_tokens * rate.input + write * rate.input * r.cacheWrite + read * rate.input * r.cacheRead + u.output_tokens * rate.output) /
    1_000_000
  );
}

export const isPriced = (model: string) => model in RATES;
