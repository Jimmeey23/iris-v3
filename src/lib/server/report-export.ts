import "server-only";
import type { Cell } from "./report-engine";

export const EXPORT_FORMATS = ["csv", "json", "md", "html"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

type Exportable = { code: string; name: string; headers: string[]; rows: Cell[][]; generatedAt: string; rangeLabel: string };

const csvCell = (v: Cell) => {
  const s = String(v ?? "");
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v !== "number" ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const esc = (v: Cell) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mdCell = (v: Cell) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function exportReport(r: Exportable, format: ExportFormat): { body: string; contentType: string; ext: string } {
  switch (format) {
    case "csv":
      // BOM so Excel opens UTF-8 (₹, names) correctly.
      return {
        body: "﻿" + [r.headers, ...r.rows].map((row) => row.map(csvCell).join(",")).join("\r\n"),
        contentType: "text/csv; charset=utf-8",
        ext: "csv",
      };
    case "json":
      return {
        body: JSON.stringify({
          report: r.code, name: r.name, period: r.rangeLabel, generatedAt: r.generatedAt,
          rows: r.rows.map((row) => Object.fromEntries(r.headers.map((h, i) => [h, row[i]]))),
        }, null, 2),
        contentType: "application/json; charset=utf-8",
        ext: "json",
      };
    case "md":
      return {
        body: [
          `# ${r.name}`, "", `${r.code} · ${r.rangeLabel} · generated ${new Date(r.generatedAt).toLocaleString("en-IN")}`, "",
          `| ${r.headers.map(mdCell).join(" | ")} |`, `| ${r.headers.map(() => "---").join(" | ")} |`,
          ...r.rows.map((row) => `| ${row.map(mdCell).join(" | ")} |`), "",
        ].join("\n"),
        contentType: "text/markdown; charset=utf-8",
        ext: "md",
      };
    case "html":
      // Print-ready: the browser's "Save as PDF" turns this into the PDF export.
      return {
        body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.name)}</title>
<style>
  :root { color-scheme: light; }
  body { font: 12px/1.45 -apple-system, "Inter", "Segoe UI", sans-serif; color: #111827; background: #fff; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -.01em; }
  .meta { color: #6b7280; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; border-bottom: 2px solid #e5e7eb; padding: 6px 8px; }
  td { border-bottom: 1px solid #f3f4f6; padding: 6px 8px; vertical-align: top; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  .bar { margin-bottom: 16px; } button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: #f9fafb; cursor: pointer; }
  @media print { .bar { display: none; } body { margin: 12mm; } thead { display: table-header-group; } tr { break-inside: avoid; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Save as PDF / Print</button></div>
<h1>${esc(r.name)}</h1>
<div class="meta">${esc(r.code)} · ${esc(r.rangeLabel)} · ${r.rows.length} rows · generated ${esc(new Date(r.generatedAt).toLocaleString("en-IN"))}</div>
<table><thead><tr>${r.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${r.rows.map((row) => `<tr>${row.map((v) => `<td${typeof v === "number" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
</body></html>`,
        contentType: "text/html; charset=utf-8",
        ext: "html",
      };
  }
}
