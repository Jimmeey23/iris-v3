import { describe, expect, it } from "bun:test";
import http from "node:http";
import net from "node:net";
import {
  NOTIFICATION_EMAIL_CATALOG,
  renderDigestEmail,
  renderNotificationEmail,
  type DigestRenderPayload,
} from "../../src/lib/iris/email-renderer";
import { mailConfigured, mailTransportMode, sendMail } from "../../src/lib/server/mail-core";

const BASE_TICKET = {
  id: "tkt_test_99",
  ticketId: "P57-00999",
  title: "Reformer Carriage Strap Worn <Studio A>",
  description: "Visible fraying on strap #4 at Kemps Corner.",
  priority: "P0",
  status: "open",
  slaStatus: "at_risk",
  category: "Equipment & Props",
  subcategory: "Reformer Maintenance",
  studioCode: "KH",
  studioName: "Kwality House, Kemps Corner",
  studioCity: "Mumbai",
  departmentCode: "FAC",
  departmentName: "Facilities & Maintenance",
  assigneeName: "Arjun Pillai",
  ownerNames: ["Arjun Pillai", "Sanaya Wadia"],
  reporterName: "Aarav Mehta",
  affectedClient: "Ananya Verma",
  slaResponseTarget: "2026-11-08T10:30:00.000Z",
  slaResolutionTarget: "2026-11-08T12:00:00.000Z",
  resolutionSummary: "Replaced strap assembly and torque-tested carriage.",
  escalationLevel: 2,
  escalationReason: "Critical safety item approaching target.",
};

describe("Email Renderer & Styled Templates", () => {
  it("renders accurate, table-based, XSS-safe HTML and plain text for all 13 lifecycle events", () => {
    expect(NOTIFICATION_EMAIL_CATALOG).toHaveLength(13);

    for (const entry of NOTIFICATION_EMAIL_CATALOG) {
      const out = renderNotificationEmail({
        event: entry.event,
        ticket: BASE_TICKET,
        recipient: { name: "Arjun Pillai", email: "arjun@physique57india.com", role: "owner" },
        actorName: "Priya <Admin>",
        previousStatus: "in_progress",
        previousOwnerName: "Ishita Nair",
        addedDepartmentNames: ["IT & Systems"],
        comment: {
          author: "Sanaya Wadia",
          content: "Vendor dispatched <urgent> & arriving in 15 mins.",
          isInternal: false,
        },
        appUrl: "https://iris.physique57india.com",
      });

      expect(out.subject).toContain("P57-00999");
      expect(out.html).toContain("<!doctype html>");
      expect(out.html).toContain('role="presentation"');
      // Must escape raw angle brackets in user content
      expect(out.html).not.toContain("<Studio A>");
      expect(out.html).toContain("&lt;Studio A&gt;");
      // Must include deep-link to exact ticket
      expect(out.html).toContain("https://iris.physique57india.com/?ticket=tkt_test_99");
      // Must render critical red tone for P0 (#b91c1c)
      expect(out.html).toContain("#b91c1c");
      // Email client compatibility: no CSS grid or flex layouts
      expect(out.html).not.toMatch(/display:\s*(grid|flex)/i);
      expect(out.text.length).toBeGreaterThan(80);
      expect(out.inAppTitle.length).toBeGreaterThan(3);
    }
  });

  it("applies custom template overrides and test badge cleanly", () => {
    const out = renderNotificationEmail({
      event: "ticket_created",
      ticket: { ...BASE_TICKET, priority: "P2" },
      recipient: { name: "Arjun Pillai", email: "arjun@physique57india.com", role: "owner" },
      override: {
        subjectPrefix: "[Ops Alert]",
        customHeading: "Custom Studio Alert Headline",
        customIntro: "Custom intro paragraph for studio leads.",
        ctaLabel: "Inspect Issue Now",
        footerNote: "24/7 Ops Desk: +91-22-5555-0199",
      },
      testBadge: true,
    });

    expect(out.subject.startsWith("[TEST] [Ops Alert]")).toBe(true);
    expect(out.html).toContain("Custom Studio Alert Headline");
    expect(out.html).toContain("Custom intro paragraph for studio leads.");
    expect(out.html).toContain("Inspect Issue Now");
    expect(out.html).toContain("24/7 Ops Desk: +91-22-5555-0199");
  });

  it("renders Daily and Weekly Intelligence Digests with table-safe HTML and escaped fields", () => {
    const sampleDigest: DigestRenderPayload = {
      period: "weekly",
      date: "01 Nov – 08 Nov 2026",
      studio: "Kwality House <Mumbai>",
      recipientName: "Aarav Mehta",
      summary: {
        totalTickets: 30,
        newTickets: 24,
        resolvedTickets: 21,
        escalatedTickets: 2,
        slaCompliance: 94,
        avgResolutionTime: "3.2h",
        criticalOpen: 1,
      },
      topIssues: [
        { category: "Repair & Maintenance", count: 9, trend: "+18%" },
        { category: "Booking & Billing", count: 7, trend: "-5%" },
      ],
      myTickets: [
        {
          id: "P57-00999",
          title: "AC Fault <Floor 1>",
          priority: "P0",
          status: "escalated",
          dueIn: "2h",
        },
      ],
      insights: [
        { type: "pattern", text: "AC Compressor Trip recurring at KH", confidence: 91 },
      ],
      recommendations: ["Schedule preventive HVAC coil inspection at Kemps Corner."],
    };

    const rendered = renderDigestEmail(sampleDigest, { appUrl: "https://iris.physique57india.com" });
    expect(rendered.subject).toContain("IRIS Weekly Operations Digest");
    expect(rendered.html).toContain("94%");
    expect(rendered.html).not.toContain("<Mumbai>");
    expect(rendered.html).toContain("&lt;Mumbai&gt;");
    expect(rendered.html).not.toMatch(/display:\s*(grid|flex)/i);
    expect(rendered.text).toContain("P57-00999");
  });
});

describe("Email Notifications Transport Service (HTTP API, SMTP & Dry-Run)", () => {
  it("delivers multipart HTML + text email over Mailtrap HTTP API with custom sender & reply-to", async () => {
    let capturedHeaders: http.IncomingHttpHeaders = {};
    let capturedBody: any = null;

    const server = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        capturedBody = JSON.parse(raw);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message_ids: ["mt_msg_12345"] }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as net.AddressInfo).port;

    const prevEnv = { ...process.env };
    try {
      process.env.NOTIFY_DRY_RUN = "0";
      process.env.MAILTRAP_FROM_EMAIL = "iris@physique57india.com";
      process.env.MAILTRAP_API_KEY = "test_secret_token_abc";
      process.env.MAILTRAP_API_URL = `http://127.0.0.1:${port}/api/send`;

      expect(mailConfigured()).toBe(true);
      expect(mailTransportMode()).toBe("mailtrap_api");

      const result = await sendMail({
        to: "member.ops@physique57india.com",
        subject: "[P57-00999] Ticket Assigned",
        html: "<p>Hello World</p>",
        text: "Hello World",
        fromName: "P57 Studio Desk",
        replyTo: "desk@physique57india.com",
        category: "iris-test",
      });

      expect(result.provider).toBe("mailtrap_api");
      expect(result.id).toBe("mt_msg_12345");
      expect(capturedHeaders.authorization).toBe("Bearer test_secret_token_abc");
      expect(capturedBody.from).toEqual({ email: "iris@physique57india.com", name: "P57 Studio Desk" });
      expect(capturedBody.reply_to).toEqual({ email: "desk@physique57india.com" });
      expect(capturedBody.to).toEqual([{ email: "member.ops@physique57india.com" }]);
      expect(capturedBody.category).toBe("iris-test");
    } finally {
      process.env = prevEnv;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("delivers multipart MIME email over raw SMTP protocol when SMTP credentials are active", async () => {
    const receivedCommands: string[] = [];
    let receivedData = "";

    const smtpServer = net.createServer((socket) => {
      socket.write("220 localhost ESMTP MockMailtrap\r\n");
      let inData = false;
      let buf = "";
      socket.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        if (inData) {
          if (buf.includes("\r\n.\r\n")) {
            receivedData = buf;
            buf = "";
            inData = false;
            socket.write("250 2.0.0 OK queued\r\n");
          }
          return;
        }
        const lines = buf.split("\r\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          receivedCommands.push(line);
          const upper = line.toUpperCase();
          if (upper.startsWith("EHLO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
          else if (upper.startsWith("AUTH PLAIN")) socket.write("235 2.7.0 Authenticated\r\n");
          else if (upper.startsWith("MAIL FROM")) socket.write("250 2.1.0 OK\r\n");
          else if (upper.startsWith("RCPT TO")) socket.write("250 2.1.5 OK\r\n");
          else if (upper === "DATA") {
            inData = true;
            socket.write("354 Start mail input\r\n");
          } else if (upper === "QUIT") {
            socket.write("221 Bye\r\n");
            socket.end();
          }
        }
      });
    });

    await new Promise<void>((resolve) => smtpServer.listen(0, "127.0.0.1", () => resolve()));
    const port = (smtpServer.address() as net.AddressInfo).port;

    const prevEnv = { ...process.env };
    try {
      delete process.env.MAILTRAP_API_KEY;
      process.env.NOTIFY_DRY_RUN = "0";
      process.env.MAILTRAP_FROM_EMAIL = "iris@physique57india.com";
      process.env.MAILTRAP_SMTP_HOST = "127.0.0.1";
      process.env.MAILTRAP_SMTP_PORT = String(port);
      process.env.MAILTRAP_SMTP_USERNAME = "smtp_user";
      process.env.MAILTRAP_SMTP_PASSWORD = "smtp_pass";

      expect(mailTransportMode()).toBe("mailtrap_smtp");
      const res = await sendMail({
        to: "recipient@physique57india.com",
        subject: "SMTP Verification",
        html: "<b>Rich HTML Body</b>",
        text: "Plain Text Body",
        replyTo: "support@physique57india.com",
      });

      expect(res.provider).toBe("mailtrap_smtp");
      expect(receivedCommands.some((c) => c.startsWith("AUTH PLAIN"))).toBe(true);
      expect(receivedData).toContain("Reply-To: support@physique57india.com");
      expect(receivedData).toContain("multipart/alternative");
    } finally {
      process.env = prevEnv;
      await new Promise<void>((resolve) => smtpServer.close(() => resolve()));
    }
  });
});
