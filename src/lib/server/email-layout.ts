/**
 * The frame every IRIS email is drawn in: ticket lifecycle notifications, intelligence
 * digests, and test verifications.
 *
 * Email HTML is its own medium. No CSS Grid, no Flexbox, no external stylesheet, and
 * Outlook on Windows renders with Word. So: tables for layout, every style inline, and
 * a small <style> block that progressively enhances clients which read it (Apple Mail,
 * iOS, Gmail apps) — chiefly stacking two-column rows and widening buttons below 620px.
 *
 * Kept completely free of database and server-only imports so both server mailers and
 * browser template previews render identical HTML.
 */

export const BRAND = {
  obsidian: "#09090b",
  obsidianSoft: "#18181b",
  ink: "#16161c",
  body: "#3b3946",
  muted: "#5f5c6d",
  faint: "#8b8898",
  line: "#e6e4ee",
  soft: "#f7f6fb",
  page: "#f1f0f6",
  indigo: "#4f46e5",
  indigoSoft: "#eef2ff",
  violet: "#7c3aed",
  violetSoft: "#f5f3ff",
  gold: "#b45309",
  goldSoft: "#fffbeb",
  goldBorder: "#fde68a",
  red: "#dc2626",
  redDark: "#991b1b",
  redSoft: "#fef2f2",
  redBorder: "#fecaca",
  green: "#059669",
  greenDark: "#065f46",
  greenSoft: "#ecfdf5",
  greenBorder: "#a7f3d0",
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  blueBorder: "#bfdbfe",
};

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

export const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

const HONORIFIC = /^(mr|mrs|ms|miss|mx|dr|prof)\.?$/i;

export function firstName(name?: string | null): string | null {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !HONORIFIC.test(w));
  const first = words[0];
  if (!first || first.includes("@")) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export const greeting = (name?: string | null) => {
  const first = firstName(name);
  return first ? `Hi ${first},` : "Hello,";
};

export const label = (text: string, color: string = BRAND.faint) =>
  `<p style="margin:0 0 5px;font-family:${FONT};font-size:10.5px;line-height:1.3;letter-spacing:.11em;text-transform:uppercase;color:${color};font-weight:700;">${esc(text)}</p>`;

export const pill = (text: string, fg: string, bg: string, border?: string) =>
  `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${bg};color:${fg};${border ? `border:1px solid ${border};` : ""}font-family:${FONT};font-size:10.5px;line-height:1.2;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;">${esc(text)}</span>`;

export const PRIORITY_TONE: Record<string, { fg: string; bg: string; border: string; display: string }> = {
  p0: { fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca", display: "P0 · Critical" },
  critical: { fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca", display: "P0 · Critical" },
  p1: { fg: "#b45309", bg: "#fffbeb", border: "#fde68a", display: "P1 · High" },
  high: { fg: "#b45309", bg: "#fffbeb", border: "#fde68a", display: "P1 · High" },
  p2: { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", display: "P2 · Medium" },
  medium: { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", display: "P2 · Medium" },
  p3: { fg: "#52525b", bg: "#f4f4f5", border: "#e4e4e7", display: "P3 · Low" },
  low: { fg: "#52525b", bg: "#f4f4f5", border: "#e4e4e7", display: "P3 · Low" },
};

export const priorityPill = (priority?: string | null) => {
  if (!priority) return "";
  const key = priority.trim().toLowerCase();
  const tone = PRIORITY_TONE[key] ?? {
    fg: "#52525b",
    bg: "#f4f4f5",
    border: "#e4e4e7",
    display: priority.toUpperCase(),
  };
  return pill(tone.display, tone.fg, tone.bg, tone.border);
};

const STATUS_TONE: Record<string, { fg: string; bg: string; border: string; display: string }> = {
  open: { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", display: "Open" },
  in_progress: { fg: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe", display: "In Progress" },
  awaiting_response: { fg: "#b45309", bg: "#fffbeb", border: "#fde68a", display: "Awaiting Response" },
  escalated: { fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca", display: "Escalated" },
  resolved: { fg: "#047857", bg: "#ecfdf5", border: "#a7f3d0", display: "Resolved" },
  closed: { fg: "#52525b", bg: "#f4f4f5", border: "#e4e4e7", display: "Closed" },
};

export const statusPill = (status?: string | null) => {
  if (!status) return "";
  const key = status.trim().toLowerCase().replace(/\s+/g, "_");
  const tone = STATUS_TONE[key] ?? {
    fg: "#3f3f46",
    bg: "#f4f4f5",
    border: "#e4e4e7",
    display: status.replace(/_/g, " "),
  };
  return pill(tone.display, tone.fg, tone.bg, tone.border);
};

const SLA_TONE: Record<string, { fg: string; bg: string; border: string; display: string }> = {
  on_track: { fg: "#047857", bg: "#ecfdf5", border: "#a7f3d0", display: "SLA On Track" },
  at_risk: { fg: "#b45309", bg: "#fffbeb", border: "#fde68a", display: "SLA Approaching" },
  breached: { fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca", display: "SLA Breached" },
  paused: { fg: "#52525b", bg: "#f4f4f5", border: "#e4e4e7", display: "SLA Paused" },
};

export const slaPill = (slaStatus?: string | null) => {
  if (!slaStatus) return "";
  const key = slaStatus.trim().toLowerCase().replace(/\s+/g, "_");
  const tone = SLA_TONE[key];
  if (!tone) return "";
  return pill(tone.display, tone.fg, tone.bg, tone.border);
};

export const section = (inner: string, padding = "0 34px 22px") =>
  `<tr><td class="e-pad" style="padding:${padding};">${inner}</td></tr>`;

export function button(href: string, text: string, color: string = BRAND.obsidian) {
  if (!href) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="e-btn"><tr><td align="center" style="border-radius:10px;background:${color};">
    <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(text)} &rarr;</a>
  </td></tr></table>`;
}

export function grid(items: string[], columns = 2, gap = 10, stack = true) {
  const cells = items.filter(Boolean);
  if (!cells.length) return "";
  const width = Math.floor(100 / columns);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const slice = cells.slice(i, i + columns);
    while (slice.length < columns) slice.push("");
    rows.push(
      `<tr>${slice
        .map(
          (cell, j) =>
            `<td${stack ? ' class="e-stack e-stack-gap"' : ""} width="${width}%" valign="top" style="width:${width}%;vertical-align:top;padding:0 ${j < columns - 1 ? gap / 2 : 0}px ${gap}px ${j > 0 ? gap / 2 : 0}px;">${cell}</td>`,
        )
        .join("")}</tr>`,
    );
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows.join("")}</table>`;
}

export const fact = (name: string, value?: string | null, valueColor: string = BRAND.ink) =>
  value
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:10px;"><tr><td style="padding:11px 14px;">
        ${label(name)}
        <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.45;color:${valueColor};font-weight:600;">${esc(value)}</p>
      </td></tr></table>`
    : "";

export function callout(opts: {
  title: string;
  body: string;
  tone?: "danger" | "warning" | "success" | "info" | "neutral";
}) {
  const palette = {
    danger: { bg: BRAND.redSoft, border: BRAND.redBorder, title: BRAND.redDark, text: "#7f1d1d", bar: BRAND.red },
    warning: { bg: BRAND.goldSoft, border: BRAND.goldBorder, title: "#92400e", text: "#78350f", bar: "#d97706" },
    success: { bg: BRAND.greenSoft, border: BRAND.greenBorder, title: BRAND.greenDark, text: "#064e3b", bar: BRAND.green },
    info: { bg: BRAND.blueSoft, border: BRAND.blueBorder, title: "#1e40af", text: "#1e3a8a", bar: BRAND.blue },
    neutral: { bg: BRAND.soft, border: BRAND.line, title: BRAND.ink, text: BRAND.body, bar: BRAND.indigo },
  }[opts.tone ?? "neutral"];

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${palette.bg};border:1px solid ${palette.border};border-left:4px solid ${palette.bar};border-radius:10px;">
    <tr><td style="padding:14px 16px;">
      <p style="margin:0 0 4px;font-family:${FONT};font-size:12.5px;line-height:1.35;font-weight:700;color:${palette.title};">${esc(opts.title)}</p>
      <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.55;color:${palette.text};white-space:pre-line;">${esc(opts.body)}</p>
    </td></tr>
  </table>`;
}

export function quoteCard(opts: { author: string; badgeText?: string; content: string }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf9fe;border:1px solid #e4e1f5;border-radius:12px;">
    <tr><td style="padding:15px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-family:${FONT};font-size:12.5px;font-weight:700;color:${BRAND.ink};">${esc(opts.author)}</td>
        ${opts.badgeText ? `<td align="right">${pill(opts.badgeText, BRAND.violet, BRAND.violetSoft, "#ddd6fe")}</td>` : ""}
      </tr></table>
      <p style="margin:8px 0 0;font-family:${FONT};font-size:13.5px;line-height:1.6;color:${BRAND.body};white-space:pre-line;">${esc(opts.content)}</p>
    </td></tr>
  </table>`;
}

export function bar(share: number, color: string, track: string = BRAND.line) {
  const pct = Math.max(0, Math.min(100, Math.round(share * 100)));
  if (pct === 0)
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${track};border-radius:3px;">&nbsp;</td></tr></table>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="${pct}%" height="6" style="width:${pct}%;height:6px;line-height:6px;font-size:0;background:${color};border-radius:3px;">&nbsp;</td>
    ${pct < 100 ? `<td height="6" style="height:6px;line-height:6px;font-size:0;background:${track};border-radius:3px;">&nbsp;</td>` : ""}
  </tr></table>`;
}

export type EmailDocument = {
  title: string;
  preheader: string;
  context: string;
  accent: string;
  ticketRef?: string | null;
  body: string;
  footer: string;
  width?: number;
};

export function emailDocument({
  title,
  preheader,
  context,
  accent,
  ticketRef,
  body,
  footer,
  width = 620,
}: EmailDocument) {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body{margin:0!important;padding:0!important;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{border:0;line-height:100%;outline:none;text-decoration:none;}
  a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}
  @media only screen and (max-width:640px){
    .e-outer{padding:12px 8px 24px!important;}
    .e-pad{padding-left:20px!important;padding-right:20px!important;}
    .e-stack{display:block!important;width:100%!important;max-width:100%!important;}
    .e-stack-gap{padding:0 0 10px 0!important;}
    .e-h1{font-size:21px!important;line-height:1.28!important;}
    .e-hide{display:none!important;}
    .e-btn{width:100%!important;}
    .e-btn a{display:block!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.page};">
<tr><td align="center" class="e-outer" style="padding:28px 16px 38px;">
<!--[if mso]><table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:${width}px;">

  <!-- Card -->
  <tr><td style="background:#ffffff;border-radius:16px;border:1px solid ${BRAND.line};overflow:hidden;box-shadow:0 4px 18px rgba(15,15,25,0.06);">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <!-- Accent Top Bar -->
      <tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:${accent};">&nbsp;</td></tr>

      <!-- Executive Dark Masthead -->
      <tr><td class="e-pad" style="background:${BRAND.obsidian};padding:20px 34px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td valign="middle">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width:32px;height:32px;border-radius:8px;background:${accent};text-align:center;font-family:${FONT};font-size:13px;font-weight:800;color:#ffffff;letter-spacing:.04em;">IR</td>
              <td style="padding-left:11px;">
                <div style="font-family:${FONT};font-size:14px;line-height:1.15;font-weight:800;letter-spacing:.14em;color:#ffffff;">IRIS<span style="color:${accent};">.</span></div>
                <div style="font-family:${FONT};font-size:10.5px;line-height:1.3;color:#a1a1aa;letter-spacing:.03em;">Physique 57 India · Operations</div>
              </td>
            </tr></table>
          </td>
          <td align="right" valign="middle">
            <span style="display:inline-block;padding:4px 10px;border-radius:6px;background:${BRAND.obsidianSoft};border:1px solid #27272a;font-family:${MONO};font-size:11px;line-height:1.2;font-weight:600;color:#e4e4e7;">${esc(ticketRef || context)}</span>
          </td>
        </tr></table>
      </td></tr>

      <tr><td height="26" style="height:26px;line-height:26px;font-size:0;">&nbsp;</td></tr>
      ${body}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 14px 0;" align="center">
    <p style="margin:0 0 5px;font-family:${FONT};font-size:11.5px;line-height:1.6;color:${BRAND.faint};">${footer}</p>
    <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.5;color:${BRAND.faint};letter-spacing:.03em;">Physique 57 India · Mumbai &amp; Bengaluru Studios · IRIS Operations Platform</p>
  </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}
