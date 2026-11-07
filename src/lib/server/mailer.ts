import "server-only";
import net from "node:net";
import tls from "node:tls";

export type MailMessage = { to: string; subject: string; html: string; text: string };
export type MailResult = { provider: "mailtrap_api" | "mailtrap_smtp" | "dry_run"; id?: string };

function fromAddress() {
  const raw = process.env.MAILTRAP_FROM_EMAIL?.trim() ?? "";
  const m = raw.match(/^(.*)<([^>]+)>$/);
  return m ? { name: m[1].trim().replace(/^"|"$/g, "") || "IRIS", email: m[2].trim() } : { name: "IRIS", email: raw };
}

export const mailConfigured = () =>
  Boolean(process.env.MAILTRAP_FROM_EMAIL && (process.env.MAILTRAP_API_KEY || process.env.MAILTRAP_SMTP_USERNAME));

async function sendViaApi(msg: MailMessage): Promise<MailResult> {
  const from = fromAddress();
  const res = await fetch("https://send.api.mailtrap.io/api/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [{ email: msg.to }], subject: msg.subject, html: msg.html, text: msg.text, category: "iris-ticket",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`Mailtrap API ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 300)}`);
  }
  return { provider: "mailtrap_api", id: body.message_ids?.[0] };
}

/** Minimal SMTP client (STARTTLS or implicit TLS, AUTH PLAIN) so no mail dependency is needed. */
async function sendViaSmtp(msg: MailMessage): Promise<MailResult> {
  const host = process.env.MAILTRAP_SMTP_HOST!;
  const port = Number(process.env.MAILTRAP_SMTP_PORT || 587);
  const user = process.env.MAILTRAP_SMTP_USERNAME!;
  const pass = process.env.MAILTRAP_SMTP_PASSWORD!;
  const from = fromAddress();

  let sock: net.Socket | tls.TLSSocket = port === 465 ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
  sock.setTimeout(20_000, () => sock.destroy(new Error("SMTP timeout")));
  let buf = "";
  let waiter: ((reply: string) => void) | null = null;
  let failure: Error | null = null;
  const lines: string[] = [];
  const pump = () => {
    // A reply is complete at a line like "250 text" (code + space).
    const parts = buf.split("\r\n");
    buf = parts.pop() ?? "";
    lines.push(...parts);
    const last = lines[lines.length - 1];
    if (waiter && last && /^\d{3} /.test(last)) {
      const w = waiter; waiter = null;
      const reply = lines.splice(0).join("\n");
      w(reply);
    }
  };
  const attach = (s: net.Socket) => {
    s.on("data", (d) => { buf += d.toString("utf8"); pump(); });
    s.on("error", (e) => { failure = e; waiter?.(`ERR ${e.message}`); });
  };
  attach(sock);
  const read = () => new Promise<string>((resolve, reject) => {
    if (failure) return reject(failure);
    waiter = (r) => (r.startsWith("ERR ") ? reject(new Error(r)) : resolve(r));
    pump();
  });
  const cmd = async (line: string, ok: string[]) => {
    sock.write(line + "\r\n");
    const r = await read();
    if (!ok.some((c) => r.startsWith(c))) throw new Error(`SMTP "${line.split(" ")[0]}" -> ${r.slice(0, 200)}`);
    return r;
  };
  try {
    const greet = await read();
    if (!greet.startsWith("220")) throw new Error(`SMTP greeting: ${greet}`);
    let ehlo = await cmd("EHLO iris.local", ["250"]);
    if (port !== 465 && /STARTTLS/i.test(ehlo)) {
      await cmd("STARTTLS", ["220"]);
      sock.removeAllListeners("data");
      sock = tls.connect({ socket: sock, servername: host });
      sock.setTimeout(20_000, () => sock.destroy(new Error("SMTP timeout")));
      buf = ""; lines.length = 0;
      attach(sock);
      ehlo = await cmd("EHLO iris.local", ["250"]);
    }
    await cmd("AUTH PLAIN " + Buffer.from(`\0${user}\0${pass}`).toString("base64"), ["235"]);
    await cmd(`MAIL FROM:<${from.email}>`, ["250"]);
    await cmd(`RCPT TO:<${msg.to}>`, ["250", "251"]);
    await cmd("DATA", ["354"]);
    const boundary = "iris_" + Math.random().toString(36).slice(2);
    const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
    const data = [
      `From: ${from.name} <${from.email}>`,
      `To: ${msg.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(msg.subject).toString("base64")}?=`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(msg.text),
      `--${boundary}`, "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(msg.html),
      `--${boundary}--`,
    ].join("\r\n");
    sock.write(data + "\r\n.\r\n");
    const done = await read();
    if (!done.startsWith("250")) throw new Error(`SMTP DATA -> ${done.slice(0, 200)}`);
    await cmd("QUIT", ["221"]).catch(() => {});
    return { provider: "mailtrap_smtp", id: done.replace(/^250\s*/, "").slice(0, 80) };
  } finally {
    sock.destroy();
  }
}

/** Mailtrap Send API first, SMTP as fallback. Throws when nothing worked. */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  if (process.env.NOTIFY_DRY_RUN === "1") return { provider: "dry_run" };
  const errors: string[] = [];
  if (process.env.MAILTRAP_API_KEY && process.env.MAILTRAP_FROM_EMAIL) {
    try { return await sendViaApi(msg); } catch (e) { errors.push((e as Error).message); }
  }
  if (process.env.MAILTRAP_SMTP_HOST && process.env.MAILTRAP_SMTP_USERNAME && process.env.MAILTRAP_SMTP_PASSWORD && process.env.MAILTRAP_FROM_EMAIL) {
    try { return await sendViaSmtp(msg); } catch (e) { errors.push((e as Error).message); }
  }
  throw new Error(errors.join(" | ") || "No mail provider configured (MAILTRAP_API_KEY / MAILTRAP_SMTP_*, MAILTRAP_FROM_EMAIL)");
}
