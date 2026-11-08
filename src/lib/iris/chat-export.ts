/**
 * Chat export utilities - convert an AI conversation into multiple formats.
 *
 * Supported formats:
 *   - TXT   plain text (current default, kept for backward compat)
 *   - MD    GitHub-flavored markdown
 *   - JSON  structured (one object per message)
 *   - HTML  self-contained printable HTML (open in new window → Ctrl+P → PDF)
 *   - CSV   one row per message (timestamp, role, content, tools, ticket_id)
 *
 * Each format function returns a string. Use `downloadBlob` to trigger a
 * browser download, or `copyToClipboard` to copy to the system clipboard.
 */

import type { AIMessage } from "@/lib/iris/store";

export type ExportFormat = "txt" | "md" | "json" | "html" | "csv";

export interface ExportMeta {
  user: string;
  exportedAt: string; // ISO timestamp
  messageCount: number;
}

/* ------------------------------------------------------------------ helpers */

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour12: true,
  });
}

function fmtTimeShort(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDateOnly(ts: string): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function messageBody(msg: AIMessage): string {
  let content = msg.content || "";
  if (msg.buttons?.length) {
    content += "\n[Options: " + msg.buttons.map((b) => b.label).join(", ") + "]";
  }
  if (msg.ticketPreview) {
    content += "\n[Ticket Preview: " + msg.ticketPreview.title + "]";
    if (msg.ticketPreview.ticketId) content += " (" + msg.ticketPreview.ticketId + ")";
  }
  if (msg.tools?.length) {
    content += "\n[Tools: " + msg.tools.map((t) => `${t.name} (${t.status})`).join(", ") + "]";
  }
  return content.trim();
}

function roleLabel(msg: AIMessage): string {
  if (msg.role === "user") return "You";
  if (msg.role === "assistant") return "IRIS";
  return "System";
}

/* ------------------------------------------------------------------ TXT */

export function toTXT(messages: AIMessage[], meta: ExportMeta): string {
  const lines = messages.map((msg) => {
    const time = fmtTime(msg.timestamp);
    const role = roleLabel(msg);
    return `[${time}] ${role}: ${messageBody(msg)}`;
  });
  return (
    `IRIS Chat Export\n` +
    `Date: ${fmtTime(meta.exportedAt)}\n` +
    `User: ${meta.user}\n` +
    `Messages: ${meta.messageCount}\n` +
    `\n` +
    `${lines.join("\n\n")}`
  );
}

/* ------------------------------------------------------------------ MD */

export function toMarkdown(messages: AIMessage[], meta: ExportMeta): string {
  const lines: string[] = [];
  lines.push(`# IRIS Chat Export`);
  lines.push(``);
  lines.push(`- **User:** ${meta.user}`);
  lines.push(`- **Exported:** ${fmtTime(meta.exportedAt)}`);
  lines.push(`- **Messages:** ${meta.messageCount}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Group messages by date for nicer readability
  let currentDate = "";
  for (const msg of messages) {
    const d = fmtDateOnly(msg.timestamp);
    if (d !== currentDate) {
      currentDate = d;
      lines.push(`## ${d}`);
      lines.push(``);
    }
    const role = roleLabel(msg);
    const time = fmtTimeShort(msg.timestamp);
    const body = messageBody(msg);
    // Use markdown blockquote for the message body to preserve newlines
    const quoted = body
      .split("\n")
      .map((l) => (l.trim() ? `> ${l}` : `>`))
      .join("\n");
    lines.push(`### ${role} - ${time}`);
    lines.push(``);
    lines.push(quoted);
    lines.push(``);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ JSON */

export function toJSON(messages: AIMessage[], meta: ExportMeta): string {
  const payload = {
    app: "IRIS",
    version: 1,
    exportedAt: meta.exportedAt,
    exportedAtHuman: fmtTime(meta.exportedAt),
    user: meta.user,
    messageCount: meta.messageCount,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      variant: msg.variant || "default",
      isQuestion: msg.isQuestion || false,
      isAcknowledgment: msg.isAcknowledgment || false,
      isTransition: msg.isTransition || false,
      buttons: msg.buttons?.map((b) => ({ label: b.label, value: b.value, captures: b.captures })) || null,
      inputType: msg.inputType || null,
      inputPlaceholder: msg.inputPlaceholder || null,
      ticketPreview: msg.ticketPreview
        ? {
            ticketId: msg.ticketPreview.ticketId,
            title: msg.ticketPreview.title,
            description: msg.ticketPreview.description,
            priority: msg.ticketPreview.priority,
            department: msg.ticketPreview.department,
            assigneeName: msg.ticketPreview.assigneeName,
            studio: msg.ticketPreview.studio,
            slaResponse: msg.ticketPreview.slaResponse,
            estimatedResolution: msg.ticketPreview.estimatedResolution,
          }
        : null,
      tools:
        msg.tools?.map((t) => ({
          name: t.name,
          status: t.status,
          duration: t.duration || null,
          result: t.result || null,
        })) || null,
      agentActivity: msg.agentActivity || null,
      metadata: msg.metadata || null,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/* ------------------------------------------------------------------ CSV */

function csvEscape(value: string): string {
  // RFC 4180: wrap in double quotes; escape embedded quotes by doubling.
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(messages: AIMessage[], meta: ExportMeta): string {
  const header = [
    "row",
    "timestamp_iso",
    "timestamp_human",
    "role",
    "variant",
    "content",
    "buttons",
    "ticket_id",
    "ticket_title",
    "tools",
  ];
  const rows: string[] = [header.join(",")];
  messages.forEach((msg, idx) => {
    const row = [
      String(idx + 1),
      msg.timestamp,
      fmtTime(msg.timestamp),
      roleLabel(msg),
      msg.variant || "default",
      messageBody(msg),
      msg.buttons?.map((b) => b.label).join(" | ") || "",
      msg.ticketPreview?.ticketId || "",
      msg.ticketPreview?.title || "",
      msg.tools?.map((t) => `${t.name}(${t.status})`).join(" | ") || "",
    ];
    rows.push(row.map(csvEscape).join(","));
  });
  // Prepend a meta header comment line
  return (
    `# IRIS Chat Export - User: ${meta.user} - Exported: ${fmtTime(meta.exportedAt)} - Messages: ${meta.messageCount}\n` +
    rows.join("\n")
  );
}

/* ------------------------------------------------------------------ HTML */

export function toHTML(messages: AIMessage[], meta: ExportMeta): string {
  const bodyRows = messages
    .map((msg) => {
      const role = roleLabel(msg);
      const time = fmtTime(msg.timestamp);
      const isUser = msg.role === "user";
      const body = messageBody(msg)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      const bubbleBg = isUser ? "#007bff" : "#f5f5f7";
      const bubbleColor = isUser ? "#ffffff" : "#1d1d1f";
      const align = isUser ? "right" : "left";
      return `
        <div class="msg" style="text-align:${align}; margin: 12px 0;">
          <div class="meta" style="font-size:11px; color:#86868b; margin-bottom:2px;">
            <strong>${role}</strong> · ${time}
          </div>
          <div class="bubble" style="display:inline-block; max-width:80%; padding:10px 14px; border-radius:12px; background:${bubbleBg}; color:${bubbleColor}; text-align:left; line-height:1.5; font-size:13px;">
            ${body}
          </div>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>IRIS Chat Export - ${meta.user} - ${fmtDateOnly(meta.exportedAt)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 0 auto; padding: 24px; color: #1d1d1f; background: #ffffff; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta-bar { font-size: 12px; color: #86868b; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e7; }
    .meta-bar span { margin-right: 16px; }
    .msg { page-break-inside: avoid; }
    @media print {
      body { padding: 12px; }
      .msg { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>IRIS Chat Export</h1>
  <div class="meta-bar">
    <span><strong>User:</strong> ${meta.user}</span>
    <span><strong>Exported:</strong> ${fmtTime(meta.exportedAt)}</span>
    <span><strong>Messages:</strong> ${meta.messageCount}</span>
  </div>
  ${bodyRows}
</body>
</html>`;
}

/* ------------------------------------------------------------------ main API */

export function exportChat(
  messages: AIMessage[],
  meta: ExportMeta,
  format: ExportFormat,
): { content: string; mime: string; extension: string } {
  switch (format) {
    case "txt":
      return { content: toTXT(messages, meta), mime: "text/plain", extension: "txt" };
    case "md":
      return { content: toMarkdown(messages, meta), mime: "text/markdown", extension: "md" };
    case "json":
      return { content: toJSON(messages, meta), mime: "application/json", extension: "json" };
    case "csv":
      return { content: toCSV(messages, meta), mime: "text/csv", extension: "csv" };
    case "html":
      return { content: toHTML(messages, meta), mime: "text/html", extension: "html" };
  }
}

export function downloadString(content: string, mime: string, filename: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the click has time to register
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * For HTML format we open a new tab and let the user print/save-as-PDF.
 * For everything else we trigger a download.
 */
export function exportAndSave(
  messages: AIMessage[],
  meta: ExportMeta,
  format: ExportFormat,
): void {
  const { content, mime, extension } = exportChat(messages, meta, format);
  if (format === "html") {
    // Open in a new tab; user can Ctrl+P to save as PDF
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(content);
      w.document.close();
      // Focus and trigger print dialog after a short delay
      setTimeout(() => {
        w.focus();
        try {
          w.print();
        } catch {
          /* user can manually print */
        }
      }, 400);
    } else {
      // Popup blocked - fall back to download
      downloadString(content, mime, `iris-chat-${meta.exportedAt.slice(0, 10)}.${extension}`);
    }
    return;
  }
  const filename = `iris-chat-${meta.exportedAt.slice(0, 10)}.${extension}`;
  downloadString(content, mime, filename);
}

export async function copyChatToClipboard(
  messages: AIMessage[],
  meta: ExportMeta,
  format: ExportFormat,
): Promise<boolean> {
  const { content } = exportChat(messages, meta, format);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    // Legacy fallback
    const ta = document.createElement("textarea");
    ta.value = content;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copySingleMessage(
  msg: AIMessage,
  format: ExportFormat = "txt",
): Promise<boolean> {
  // Reuse the single-message export by wrapping in a 1-element array
  const meta: ExportMeta = {
    user: "",
    exportedAt: new Date().toISOString(),
    messageCount: 1,
  };
  try {
    if (format === "html") {
      // For per-message copy, fall back to TXT (HTML per-message is silly)
      format = "txt";
    }
    const { content } = exportChat([msg], meta, format);
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = content;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const EXPORT_FORMATS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
}> = [
  { value: "txt", label: "Plain Text", description: "Simple .txt file, one message per block" },
  { value: "md", label: "Markdown", description: "GitHub-flavored .md with headings & quotes" },
  { value: "json", label: "JSON", description: "Structured .json - full message metadata" },
  { value: "html", label: "HTML / PDF", description: "Printable HTML - opens in new tab, Ctrl+P to save as PDF" },
  { value: "csv", label: "CSV", description: "Spreadsheet-ready .csv - one row per message" },
];
