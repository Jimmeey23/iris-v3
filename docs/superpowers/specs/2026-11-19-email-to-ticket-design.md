# Email → Ticket (AI intake) — Design

## Intent
Emails sent to a dedicated address become fully populated IRIS tickets with no manual retyping. Senders are either staff forwarding a member's email, or members writing in directly.

## Goals
- Every genuine inbound email → one ticket, AI-populated (title, description, category, subcategory, department, priority, owner, studio, SLA, member details).
- Staff vs member detected by sender domain.
- Attachments preserved on the ticket.
- Junk (newsletters, auto-replies, non-requests) filtered.

## Non-goals (v1)
- Threading replies into existing tickets (a reply creates a new ticket; dedupe only on Message-ID).
- Custom receiving domain on Mailtrap (not yet supported by Mailtrap).

## Anti-goals
- Never auto-reply or otherwise message members (internal-only comms rule).
- Never trust an unsigned webhook payload.
- Never silently drop an email: skipped junk is logged and visible.

## Approaches considered
1. Mailtrap Sandbox + polling — testing product, retention caps, needs frequent cron. Rejected.
2. Gmail API polling of Workspace mailbox — service account + frequent cron (Vercel crons are daily). Rejected.
3. Inbound webhook provider — real-time, no polling. **Chosen, using Mailtrap Inbound Email** (GA June 2026, HMAC-signed webhooks).

## Flow
`tickets@physique57india.com` (Google Workspace) → auto-forward → `<inbox>@inbound-mailtrap.io` → Mailtrap webhook → `POST /api/webhooks/mailtrap-inbound`.

## Design
- **Endpoint** `src/app/api/webhooks/mailtrap-inbound/route.ts`, modelled on `webhooks/fillout`.
  - Verify HMAC-SHA256 signature of raw body with `MAILTRAP_INBOUND_SECRET`; reject otherwise.
  - Idempotent on Message-ID (new `iris.inbound_emails` log table: message_id unique, sender, subject, status `ticketed|junk|failed`, ticket_id, reason, raw payload).
  - Respond 200 quickly; heavy work after response (`after()` from next/server — verify in local Next docs).
- **Sender classification**: staff domains = `physique57india.com`, `physique57mumbai.com`, `physique57bengaluru.com` (env-configurable `STAFF_EMAIL_DOMAINS`).
  - Staff: reporter = matched employee by email (fallback to Email Intake account if no match). AI extracts the original member's name/email/phone from the forwarded body.
  - Non-staff: reporter = "Email Intake" system account; sender = affected member.
- **AI population**: reuse `aiClassify` + routing rules + ownership policy + SLA calculator (same pipeline as `/api/intake/classify` and ticket POST). Additional Claude extraction for title, clean description, member details, studio, and a `is_actionable` junk verdict. Keyword fallback if AI off.
- **Junk**: heuristic pre-filter (auto-submitted / list-unsubscribe / no-reply headers, own-domain loops) + AI verdict. Junk is logged in `inbound_emails` with reason, no ticket.
- **Ticket**: `source = 'email'`; original email (from/subject/body excerpt) recorded as a ticket activity.
- **Attachments**: download each from the webhook payload/Mailtrap API, upload to Vercel Blob (`BLOB_READ_WRITE_TOKEN`), insert `iris.ticket_attachments` rows and populate `tickets.attachments`. Size cap per file (e.g. 15 MB); oversize files listed by name only.
- **Secrets**: `MAILTRAP_INBOUND_SECRET`, `MAILTRAP_API_TOKEN`, `BLOB_READ_WRITE_TOKEN` in `.env`; placeholders in `.env.example`.

## Left to the builder
- Exact Mailtrap payload shape (check docs.mailtrap.io/inbound-email/webhooks).
- Whether to surface `inbound_emails` log in Settings UI (nice-to-have).
- Email Intake system account seeding.
