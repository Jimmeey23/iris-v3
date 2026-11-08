-- Integration catalogue from IRIS v2, seeded into iris.integrations. Re-runnable.
-- Generated from src/lib/iris/integration-catalogue.ts. Existing rows keep their
-- enabled state, config and credentials; only name/category/description are refreshed.
-- mailtrap is seeded ENABLED: notify.ts treats a disabled mailtrap row as "email off".

insert into iris.integrations (id, name, category, description, type, is_enabled) values
  ('momence', 'Momence', 'Studio operations', 'Members, classes, bookings, memberships and sales. Native, connected studio data.', 'api', false),
  ('openai', 'OpenAI / ChatGPT', 'Intelligence', 'Conversational ticket generation, precise classification and voice transcription.', 'api', false),
  ('anthropic', 'Claude (backup AI)', 'Intelligence', 'Takes over from OpenAI when its credits run out, the key is rejected or the service is down, so classification, drafting, briefings and Iris keep working.', 'api', false),
  ('n8n', 'n8n', 'Automation', 'Trigger your workflows from ticket events. Reliable, logged webhook delivery.', 'webhook', false),
  ('whatsapp', 'WhatsApp Business', 'Communication', 'Send approved templates or service-window messages through Meta’s Cloud API.', 'api', false),
  ('mailtrap', 'Mailtrap', 'Communication', 'SMTP + API email delivery for beautifully styled assignment notifications, sent the moment a ticket is created.', 'api', true),
  ('fillout', 'Fillout', 'Forms & feedback', 'Form submissions, trainer assessments and guided experience feedback.', 'api', false),
  ('gmail', 'Gmail', 'Communication', 'Read your connected mailbox and send reviewed member-care messages.', 'api', false),
  ('google-calendar', 'Google Calendar', 'Google Workspace', 'See upcoming events and schedule studio follow-ups without leaving Iris.', 'api', false),
  ('google-contacts', 'Google Contacts', 'Google Workspace', 'Read connected contacts and create new member-care contacts.', 'api', false),
  ('google-sheets', 'Google Sheets', 'Google Workspace', 'A live, real-time register — every ticket raised and every status change is appended as a new row automatically.', 'api', false),
  ('google-docs', 'Google Docs', 'Google Workspace', 'Open shared documents or create structured studio briefing documents.', 'api', false),
  ('responseio', 'respond.io', 'Communication', 'Connect your messaging workspace and send reviewed conversations.', 'api', false),
  ('slack', 'Slack', 'Communication', 'Post ticket alerts straight into a studio channel via an incoming webhook.', 'webhook', false),
  ('zapier', 'Zapier', 'Automation', 'Fan a ticket event out to thousands of other apps via a Zapier catch hook.', 'webhook', false),
  ('notion', 'Notion', 'Productivity', 'Mirror tickets into a Notion database page for your team wiki.', 'api', false),
  ('airtable', 'Airtable', 'Productivity', 'Log tickets as records in an Airtable base for lightweight ops tracking.', 'api', false),
  ('trello', 'Trello', 'Productivity', 'Turn a ticket into a Trello card on your studio ops board.', 'api', false),
  ('asana', 'Asana', 'Productivity', 'Raise a follow-up task in Asana for ticket owners who use it day to day.', 'api', false),
  ('zendesk', 'Zendesk', 'Communication', 'Mirror a ticket into Zendesk for teams already running support there.', 'api', false),
  ('twilio', 'Twilio', 'Communication', 'Send an SMS alert to the assigned owner for urgent tickets.', 'api', false),
  ('hubspot', 'HubSpot', 'CRM', 'Log a ticket engagement against the matching HubSpot contact.', 'api', false),
  ('calendly', 'Calendly', 'Scheduling', 'Look up a member’s booked event types when scheduling a follow-up call.', 'api', false),
  ('stripe', 'Stripe', 'Payments', 'Look up a payment or customer record referenced in a billing ticket.', 'api', false),
  ('razorpay', 'Razorpay', 'Payments', 'Look up a payment referenced in an India billing dispute ticket.', 'api', false),
  ('jira', 'Jira', 'Productivity', 'Raise a technical bug ticket in Jira for engineering-owned issues.', 'api', false),
  ('discord', 'Discord', 'Communication', 'Post ticket alerts into a Discord channel via webhook.', 'webhook', false),
  ('teams', 'Microsoft Teams', 'Communication', 'Post an adaptive card alert into a Teams channel.', 'webhook', false)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, description = excluded.description, updated_at = now();
