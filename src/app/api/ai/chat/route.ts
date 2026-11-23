import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isSandboxRequest, withUser } from "@/lib/server/db";
import { requireSession } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";
import { runTurn } from "@/lib/server/agent";
import { loadEffectiveAiConfig } from "@/lib/server/ai-config";

export const maxDuration = 120;

const MAX_HISTORY_TURNS = 40;
const MAX_MESSAGE_CHARS = 8000;

/**
 * The client stores the transcript and echoes it back, so none of it is trusted: keep
 * only plain text (never client-forged tool_use / tool_result blocks), cap each message
 * and keep the last MAX_HISTORY_TURNS. The conversation must open on a user turn.
 */
function sanitizeHistory(raw: { role: "user" | "assistant"; content?: unknown }[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of raw.slice(-MAX_HISTORY_TURNS)) {
    const text =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content
              .filter((b): b is { type: "text"; text: string } => !!b && b.type === "text" && typeof b.text === "string")
              .map((b) => b.text)
              .join("\n")
          : "";
    const trimmed = text.slice(0, MAX_MESSAGE_CHARS).trim();
    if (!trimmed) continue;
    if (out.length === 0 && m.role !== "user") continue;
    out.push({ role: m.role, content: trimmed });
  }
  return out;
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  // A conversation turn costs a model call: 30/min per user stops a script from
  // spending the workspace's Anthropic budget without slowing a fast typist.
  try {
    await enforceRateLimit("ai-chat", userKey(auth.session.user_id));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429, headers: { "Retry-After": String(e.resetsInSec) } });
    }
    return NextResponse.json({ error: "The AI service is busy. Try again in a moment." }, { status: 503 });
  }
  if (!process.env.ANTHROPIC_API_KEY && !(await isSandboxRequest())) {
    return NextResponse.json({ error: "The AI assistant isn't configured (ANTHROPIC_API_KEY missing)." }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "Conversation is too long. Start a new chat." }, { status: 413 });
  let body: { history?: unknown; message?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 8000) : "";
  if (!message) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  const rawHistory = Array.isArray(body.history) ? (body.history as unknown[]) : [];
  if (rawHistory.some((m) => !m || typeof m !== "object" || ((m as { role?: unknown }).role !== "user" && (m as { role?: unknown }).role !== "assistant"))) {
    return NextResponse.json({ error: "Invalid conversation history" }, { status: 400 });
  }
  const history = sanitizeHistory(rawHistory as { role: "user" | "assistant"; content?: unknown }[]);

  try {
    const aiCfg = await loadEffectiveAiConfig();
    if (!aiCfg.enabled) {
      return NextResponse.json(
        { error: aiCfg.disabledReason || "AI assistant is disabled in workspace settings." },
        { status: aiCfg.budgetExceeded ? 429 : 503 },
      );
    }
    const out = await withUser(auth.session.user_id, async (c) => {
      const name =
        (await c.query("select name from employees where id = $1", [auth.session.employee_id])).rows[0]?.name ?? auth.session.email;
      return runTurn(c, history, message, name, auth.session.user_id, {
        primaryModel: aiCfg.primaryModel,
        fallbackModel: aiCfg.fallbackModel,
      });
    });
    return NextResponse.json(out);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The AI service is busy. Try again in a moment." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The AI service key is invalid. Ask an admin to update ANTHROPIC_API_KEY." }, { status: 503 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error("[ai chat] bad request:", err.message);
      return NextResponse.json({ error: "The conversation couldn't be processed. Start a new chat and try again." }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ai chat] api error:", err.status, err.message);
      return NextResponse.json({ error: "The AI service had a problem. Try again." }, { status: 502 });
    }
    console.error("[ai chat]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
