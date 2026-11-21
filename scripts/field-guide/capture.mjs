// Capture only local IRIS, with its normal auth, database and request handlers.
// No routing/interception, cloned DOM or replacement UI is used by this recorder.
import fs from "node:fs";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
const load = createRequire(
  process.env.GUIDE_TOOLS
    ? `${process.env.GUIDE_TOOLS}/package.json`
    : import.meta.url,
);
const { chromium } = load("playwright-core");
const origin = "http://localhost:3100";
let session = process.env.GUIDE_SESSION;
if (!session) {
  if (!process.env.GUIDE_PASSWORD) throw Error("Missing local recording login");
  const r = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "lead@example.invalid",
      password: process.env.GUIDE_PASSWORD,
    }),
  });
  if (!r.ok) throw Error(`Training login failed: ${r.status}`);
  session = r.headers
    .getSetCookie()
    .find((s) => s.startsWith("iris_session="))
    ?.split(";")[0]
    .slice("iris_session=".length);
}
const me = await fetch(origin + "/api/auth/me", {
  headers: { cookie: "iris_session=" + session },
});
if (!me.ok || (await me.json()).user?.email !== "lead@example.invalid")
  throw Error("Capture requires the local training operator");
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const book = JSON.parse(fs.readFileSync("build/academy/book.json"));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (n) => `P57-${String(n).padStart(5, "0")}`,
  case1 = "Mic 02 loses sound during class",
  case2 = "Replacement cable for mic 02",
  case3 = "Studio speaker crackles",
  newTitle = "Headset microphone cuts out";
const paths = {
  1: "/ai",
  2: "/tickets",
  3: "/tickets/" + num(1),
  4: "/tickets/" + num(2),
  5: "/escalations",
  6: "/tickets",
  7: "/dashboard",
  8: "/dashboard",
  17: "/tickets/" + num(1),
  18: "/tickets/" + num(1),
  19: "/tickets/" + num(1),
  20: "/tickets/" + num(1),
  21: "/tickets/" + num(1),
  22: "/tickets/" + num(3),
  23: "/tickets/" + num(3),
  24: "/tickets",
  25: "/dashboard",
  26: "/tickets",
};
async function capture(n) {
  const dst = `build/academy/capture/${String(n).padStart(2, "0")}`;
  fs.mkdirSync(dst, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1360, height: 800 },
    deviceScaleFactor: 1.5,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  });
  await ctx.addCookies([{ name: "iris_session", value: session, url: origin }]);
  await ctx.addInitScript(() => {
    sessionStorage.setItem("iris-intro-seen", "1");
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal{display:none!important}";
        document.head.append(style);
      },
      { once: true },
    );
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(6500);
  const frames = [],
    shots = [],
    bad = [];
  let last = -1;
  p.on("pageerror", (e) => bad.push(e.message));
  const L = (r, s, exact = true) => p.getByRole(r, { name: s, exact }).first(),
    B = (s) => L("button", s),
    T = (s) => p.getByText(s, { exact: true }).first(),
    H = (s) => p.getByPlaceholder(s).first(),
    V = (s) => L("tab", s),
    Q = (s) => p.locator(`[data-tour="nav-${s}"]`).first(),
    List = p.locator('[data-tour="ticket-list"]'),
    R = (s) => List.getByText(s, { exact: true }).first(),
    C = (s) =>
      T(s).locator(
        'xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," iris-card ")][1]',
      ),
    G = (s) => L("combobox", s),
    Header = p.locator("h1").last(),
    ticketStatus = C("Status & Assignment").getByRole("combobox").first();
  const time = () => performance.now() / 1000;
  async function shot(t, l, op = "", val) {
    if (shots.length && t <= shots.at(-1).t) throw Error(`bad edit ${t}`);
    await l.waitFor({ state: "visible" });
    await l.scrollIntoViewIfNeeded();
    await wait(170);
    const hi = async () => {
      const name = `hi-${frames.length}.jpg`;
      await p.screenshot({
        type: "jpeg",
        path: `${dst}/${name}`,
        quality: 93,
        scale: "device",
      });
      frames.push({ time: time(), name });
    };
    await hi();
    const bbox = await l.boundingBox();
    const shot = { t, op, bbox, start: time() };
    shots.push(shot);
    await wait(350);
    if (op === "click") await l.click();
    else if (op === "type") {
      await l.click();
      await l.fill("");
      for (const chunk of val.match(/.{1,5}/gu)) {
        await p.keyboard.insertText(chunk);
        await wait(42);
      }
    } else if (op === "select") await l.selectOption(val);
    else if (op === "key") await l.press(val);
    else if (op === "reload") {
      await p.reload();
      await Q("all_tickets").waitFor();
      await l.waitFor({ state: "visible" });
    } else if (op === "palette") await p.keyboard.press("Control+k");
    await wait(480);
    await hi();
    shot.end = time();
  }
  const focus = (t, l) => shot(t, l),
    click = (t, l) => shot(t, l, "click"),
    type = (t, l, v) => shot(t, l, "type", v),
    sel = (t, l, v) => shot(t, l, "select", v),
    key = (t, l, v) => shot(t, l, "key", v);
  try {
    await p.goto(origin + (paths[n] || "/tickets"), {
      waitUntil: "domcontentloaded",
    });
    await Q("all_tickets").waitFor({ timeout: 40000 });
    await p.evaluate(() => document.fonts.ready);
    await p.addStyleTag({ content: "nextjs-portal {display:none!important}" });
    await wait(450);
    // A high-resolution establishing shot also covers completely static pages (CDP sends only changed frames).
    const still = async () => {
      const name = `still-${frames.length}.jpg`,
        start = time();
      await p.screenshot({
        path: `${dst}/${name}`,
        type: "jpeg",
        quality: 94,
        scale: "device",
      });
      frames.push({ time: start, name });
    };
    await still();
    await p.screencast.start({
      size: { width: 2040, height: 1200 },
      quality: 94,
      fps: 20,
      onFrame: ({ data }) => {
        const t = time();
        if (t - last < 0.085) return;
        last = t;
        const name = `frame-${frames.length}.jpg`;
        fs.writeFileSync(`${dst}/${name}`, data);
        frames.push({ time: t, name });
      },
    });
    const next = B("Next"),
      urg = B("P0–P1"),
      views = p.locator('[data-tour="saved-views"]'),
      Hist = B(/^History \(/),
      Act = V(/^Activity/),
      FormDesc = H(/The air conditioning/),
      scan = H(/Search title/);
    switch (n) {
      case 1: {
        await focus(0, Q("ai_assistant"));
        await click(1.5, B("Form mode"));
        await type(3.4, H(/AC not working/), newTitle);
        await type(
          7.2,
          FormDesc,
          "Mic 04 cuts out when the instructor turns. The spare headset kept the class running.",
        );
        await click(13, next);
        await click(14.7, B("Repair and Maintenance"));
        await click(17, B("Audio, Mic & Headphone Malfunction"));
        await focus(19.4, T("Auto-detected Priority"));
        await click(21, next);
        await click(22.4, B(/Supreme HQ, Bandra/));
        await click(24.7, next);
        await click(26.7, next);
        await click(29, next);
        await focus(30.4, T("Review & Submit"));
        const response = p.waitForResponse(
          (r) =>
            r.url() === origin + "/api/tickets" &&
            r.request().method() === "POST" &&
            r.ok(),
        );
        await click(34.6, B("Create Ticket"));
        const { ticket } = await (await response).json();
        if (!ticket?.ticketId) throw Error("no created ticket id");
        await click(37.4, R(ticket.ticketId));
        await focus(39.1, T(ticket.ticketId));
        await shot(40.5, Header, "reload");
        await focus(42, T(ticket.ticketId));
        const persisted = await (
          await ctx.request.get(origin + "/api/tickets/" + ticket.id)
        ).json();
        if (persisted.ticket?.title !== newTitle)
          throw Error("could not verify persisted creation");
        fs.writeFileSync(
          `${dst}/verified.json`,
          JSON.stringify({
            ref: ticket.ticketId,
            title: newTitle,
            method: "POST, reload, authenticated GET",
          }),
        );
        break;
      }
      case 2:
        await focus(0, Q("all_tickets"));
        await type(2.7, scan, num(1));
        await click(7.4, R(num(1)));
        await click(8.7, V("Details"));
        await focus(10, T("Description"));
        await focus(14.4, C("Status & Assignment"));
        break;
      case 3:
        await focus(0, V("Resolution Center"));
        await click(2.6, B("Start Work"));
        await focus(4.9, ticketStatus);
        await click(7.7, ticketStatus);
        await click(10.5, L("option", "Awaiting Response"));
        await focus(14, C("Resolution Log").locator("select"));
        await type(
          16.4,
          H("Add a note..."),
          "Spare mic installed. Instructor to confirm sound after class.",
        );
        await key(19.5, H("Add a note..."), "Enter");
        await focus(
          20.8,
          T("Spare mic installed. Instructor to confirm sound after class."),
        );
        break;
      case 4:
        await focus(0, V("Resolution Center"));
        await click(3.5, B("Mark Resolved"));
        await type(
          7.4,
          H(/Describe what was done/),
          "Replaced the cable and tested the headset through a full class. Sound stayed clear.",
        );
        await type(11, H(/What actually caused/), "Loose cable connector");
        await click(13.4, B("Confirm Resolution"));
        await focus(15.5, T("Resolved"));
        break;
      case 5:
        await focus(0, Q("escalations"));
        await click(2, R(case3));
        await click(5, Act);
        await focus(
          7,
          p
            .getByRole("tabpanel")
            .getByText(/escalat/i)
            .first(),
        );
        await focus(9, C("Escalation Ladder"));
        await click(13.2, Hist);
        await focus(
          15.6,
          T("Technician needs approval for a replacement speaker."),
        );
        break;
      case 6:
      case 24: {
        const returned = n === 6,
          id = returned ? 7 : 8,
          parent = returned ? 5 : 6;
        await focus(0, R(num(id)));
        await click(2.2, R(num(id)));
        await focus(4.7, T("Original ticket"));
        if (returned) {
          await click(9.7, B("Fault returned"));
          await type(
            12.4,
            H(/Drops out mid-class/),
            "Mic 05 still cuts out when the headset cable moves.",
          );
          await click(15.5, B("Reopen " + num(parent)));
          await click(18.5, B("Open"));
          await focus(20.7, T(num(parent)));
        } else {
          await focus(9.5, B("No recurrence"));
          await click(13, B("No recurrence"));
          await focus(15.4, T("No recurrence"));
          await click(17.6, B("Open"));
          await focus(19, C("Recurrence checks"));
        }
        break;
      }
      case 7:
        await focus(0, Q("overview"));
        await click(3.1, Q("all_tickets"));
        await click(8.8, Q("ai_assistant"));
        await click(12, Q("templates"));
        await click(16.5, Q("overview"));
        break;
      case 8:
        await click(0, Q("my_tickets"));
        await focus(4.9, R(case1));
        await click(8.4, Q("department_queue"));
        await click(11.6, Q("all_tickets"));
        await type(14, scan, num(1));
        await focus(16.6, R(case1));
        break;
      case 9:
        await focus(0, V(/^Open/));
        await click(4.6, urg);
        await click(8.9, B("Unassigned"));
        await focus(12.8, List);
        await click(18.1, B("Clear"));
        break;
      case 10:
        await focus(0, views);
        await click(4.2, urg);
        await click(8.4, views);
        await type(9.5, H("Name current filters…"), "Morning priorities");
        await key(10.95, H("Name current filters…"), "Enter");
        await key(12, H("Name current filters…"), "Escape");
        await click(12.9, B("Clear"));
        await click(13.8, views);
        await click(15.5, T("Morning priorities"));
        await focus(17.5, urg);
        break;
      case 11:
        await focus(0, G("Group"));
        await sel(4.7, G("Group"), "studio");
        await focus(6.6, List.locator("button[aria-expanded]").first());
        await sel(9.35, G("Then by"), "priority");
        await click(12.6, List.locator("button[aria-expanded]").first());
        await focus(15.2, List);
        break;
      case 12:
        await focus(0, V(/^Open/));
        await click(2.4, V(/^All/));
        await focus(6.3, G("Sort"));
        await sel(10, G("Sort"), "age");
        await focus(13.95, List.locator("tbody tr").first());
        break;
      case 13:
        await focus(0, V("Board"));
        await click(3.2, V("Board"));
        await click(8.2, R(case1));
        await focus(10.9, ticketStatus);
        break;
      case 14:
        await focus(0, V("Split"));
        await click(4, V("Split"));
        await click(6, R(num(1)));
        await focus(8, List.getByRole("heading").last());
        await click(10.9, R(num(3)));
        await click(13, List.getByRole("button", { name: "Open ticket" }));
        await focus(15.1, Header);
        break;
      case 15:
        await click(0, V("Timeline"));
        await focus(5.1, R(case1));
        await click(8.6, R(case1));
        await click(10.9, Act);
        await focus(
          14.8,
          p.getByRole("tabpanel").locator("li, .iris-card").first(),
        );
        break;
      case 16:
        await click(0, V("Owners"));
        await focus(3.7, List.getByText("Unassigned", { exact: true }).first());
        await click(8.8, R(case1));
        await focus(11.6, C("Status & Assignment"));
        break;
      case 17: {
        let s = "Front desk has the spare headset ready for the next class.";
        await click(0, V(/^Comments/));
        await focus(4, H("Add an internal comment..."));
        await type(8.4, H("Add an internal comment..."), s);
        await click(11.3, B("Comment"));
        await focus(13, T(s));
        break;
      }
      case 18: {
        let s = "Evening shift: run a sound check before the first class.";
        await focus(0, V("Resolution Center"));
        await focus(4.3, C("Resolution Log"));
        await sel(7.6, C("Resolution Log").locator("select"), "follow_up");
        await type(10.4, H("Add a follow up..."), s);
        await key(14.3, H("Add a follow up..."), "Enter");
        await focus(16, T(s));
        break;
      }
      case 19:
        await focus(0, V("Resolution Center"));
        await click(3.6, B("Add Tag"));
        await type(5.4, H("Tag, then Enter"), "sound-check");
        await key(9, H("Tag, then Enter"), "Enter");
        await click(10.75, V("Details"));
        await focus(13, T("#sound-check"));
        break;
      case 20:
        await focus(0, B("Link Related Ticket"));
        await click(5.15, B("Link Related Ticket"));
        await type(6.8, H("Ticket number, title, member…"), num(2));
        await click(10.1, B(new RegExp(num(2))));
        await focus(12, B(num(2)));
        await click(15.4, B(num(2)));
        await focus(17.4, Header);
        break;
      case 21:
        await focus(0, Header);
        await focus(3.9, C("SLA Tracking"));
        await focus(
          7.1,
          C("SLA Tracking")
            .getByText("First Response", { exact: true })
            .locator("../.."),
        );
        await focus(
          11.8,
          C("SLA Tracking")
            .getByText("Resolution", { exact: true })
            .locator("../.."),
        );
        await focus(19.45, C("SLA Tracking"));
        break;
      case 22:
      case 23: {
        let up = n === 22,
          reason = up
            ? "Technician needs approval for a replacement speaker."
            : "Part approved. Studio lead can coordinate installation.";
        await focus(0, C("Escalation Ladder"));
        await click(
          up ? 5.6 : 6,
          C("Escalation Ladder").getByRole("button", {
            name: up ? "Escalate" : "De-escalate",
            exact: true,
          }),
        );
        await type(
          up ? 8.4 : 8,
          H(
            up
              ? "Why is this being escalated?"
              : "Why is this being de-escalated?",
          ),
          reason,
        );
        await click(up ? 11 : 11.3, B(/^Confirm L/));
        await click(up ? 12.8 : 14, Hist);
        await focus(up ? 15.4 : 16, T(reason));
        break;
      }
      case 25:
        await shot(0, Q("overview"), "palette");
        await type(6.3, H(/Search tickets, members/), num(1));
        await focus(
          8.8,
          p.locator("[data-cmd-idx]").filter({ hasText: case1 }).first(),
        );
        await click(
          12.1,
          p.locator("[data-cmd-idx]").filter({ hasText: case1 }).first(),
        );
        await focus(15.5, T(num(1)));
        break;
      case 26: {
        const report =
          "Mic 04 is cutting out at Supreme HQ today during class. The headset drops audio when the instructor turns. We switched to the spare.";
        const input = p.locator('[data-tour="ai-input"] textarea'),
          choice = (label) =>
            p
              .locator("select")
              .filter({
                has: p.getByRole("option", { name: label, exact: true }),
              })
              .first();
        await click(0, Q("ai_assistant"));
        await type(2.15, input, report);
        await key(8.1, input, "Enter");
        await focus(9.5, T("Here's what I picked up"));
        await sel(12.6, choice("Choose category…"), "Repair and Maintenance");
        await sel(
          15,
          choice("Audio, Mic & Headphone Malfunction"),
          "Audio, Mic & Headphone Malfunction",
        );
        for (const [t, label] of [
          [18, "Barre Studio"],
          [19.6, "Headset mic"],
          [21.2, "Cutting out"],
          [22.7, "Next class only"],
          [26.4, "Out of use"],
          [28.1, "Yes, slightly"],
        ]) {
          if (t === 26.4) {
            const since = p
              .locator("div.grid")
              .filter({ has: p.getByText(/^Since when/) })
              .getByRole("button", { name: "Today", exact: true })
              .last();
            await click(24.6, since);
          }
          const target = B(label);
          if ((await target.getAttribute("class")).includes(" bg-primary/10"))
            await focus(t, target);
          else await click(t, target);
        }
        await click(30.2, B("Review ticket"));
        await focus(32.2, T("Ticket draft - review before approving"));
        const response = p.waitForResponse(
          (r) =>
            r.url() === origin + "/api/tickets" &&
            r.request().method() === "POST" &&
            r.ok(),
        );
        await click(34.8, B("Approve & create"));
        const { ticket } = await (await response).json();
        if (!ticket?.ticketId) throw Error("missing ticket number");
        await focus(37, B("Open ticket"));
        await click(39.3, B("Open ticket"));
        await focus(40.65, T(ticket.ticketId));
        await shot(41.8, T(ticket.ticketId), "reload");
        await focus(43.3, T(ticket.ticketId));
        const saved = await (
          await ctx.request.get(origin + "/api/tickets/" + ticket.id)
        ).json();
        if (
          saved.ticket?.ticketId !== ticket.ticketId ||
          saved.ticket?.source !== "ai_assistant"
        )
          throw Error("unverified assistant submission");
        fs.writeFileSync(
          `${dst}/verified.json`,
          JSON.stringify({
            ref: ticket.ticketId,
            source: saved.ticket.source,
            title: saved.ticket.title,
            method: "POST, reload, authenticated GET",
          }),
        );
        break;
      }
      default:
        throw Error("Unknown film");
    }
    await still();
    await p.screencast.stop();
    if (bad.length) throw Error(bad.join("; "));
    fs.writeFileSync(
      `${dst}/edit.json`,
      JSON.stringify({ frames: frames.sort((a, b) => a.time - b.time), shots }),
    );
    console.log(n, "OK", shots.length, "actions");
  } catch (e) {
    console.error(
      "FAILED",
      n,
      e.message,
      (await p.locator("body").innerText()).slice(-4500),
    );
    process.exitCode = 1;
  } finally {
    await ctx.close();
  }
}
try {
  for (const id of process.argv.slice(2)) await capture(Number(id));
} finally {
  await browser.close();
}
