import "server-only";
import { BRAND, button, emailDocument, esc, greeting, section } from "./email-layout";

/**
 * Where reset links point. Never taken from the request's Host header: a forged Host
 * would make IRIS email a link to someone else's site carrying a live reset token.
 */
export function resetOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}

export function resetEmail(opts: { name: string | null; link: string }) {
  const subject = "Reset your IRIS password";
  const body = [
    section(
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.body};">${esc(greeting(opts.name))} someone asked to reset the password for your IRIS account. Use the button below to choose a new one.</p>
       <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:${BRAND.muted};">The link works once and expires in 30 minutes. Setting a new password signs you out of IRIS everywhere else.</p>`,
    ),
    section(button(opts.link, "Choose a new password")),
    section(
      `<p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.faint};">If you didn't ask for this, ignore this email; your password stays the same. If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all;">${esc(opts.link)}</span></p>`,
    ),
  ].join("");
  const text = [
    `${greeting(opts.name)} someone asked to reset the password for your IRIS account.`,
    `Choose a new password (link works once, expires in 30 minutes):`,
    opts.link,
    `If you didn't ask for this, ignore this email; your password stays the same.`,
  ].join("\n\n");
  return {
    subject,
    text,
    html: emailDocument({
      title: subject,
      preheader: "This link expires in 30 minutes.",
      context: "Account security",
      accent: BRAND.obsidian,
      body,
      footer: "Sent by IRIS because a password reset was requested for this address.",
    }),
  };
}
