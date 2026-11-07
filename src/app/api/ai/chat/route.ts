import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withUser } from "@/lib/server/db";
import { requireSession } from "@/lib/server/auth";
import { runTurn } from "@/lib/server/agent";

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!process.env.ANTHROPIC_API_KEY) {
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
  const history = Array.isArray(body.history) ? (body.history as Anthropic.MessageParam[]) : [];
  if (history.some((m) => !m || (m.role !== "user" && m.role !== "assistant"))) {
    return NextResponse.json({ error: "Invalid conversation history" }, { status: 400 });
  }

  try {
    const out = await withUser(auth.session.user_id, async (c) => {
      const name =
        (await c.query("select name from employees where id = $1", [auth.session.employee_id])).rows[0]?.name ?? auth.session.email;
      return runTurn(c, history, message, name, auth.session.user_id);
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
