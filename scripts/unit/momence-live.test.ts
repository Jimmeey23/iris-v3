import { describe, expect, it } from "bun:test";
import http from "node:http";
import net from "node:net";
import {
  clearMomenceTokenCache,
  configuredRegions,
  listMembers,
  listTrainers,
  searchMembers,
  searchSessions,
} from "../../src/lib/server/momence-core";

describe("Momence Live Host API v2 Client (OAuth, Directory Pagination, Sessions & Trainers)", () => {
  it("authenticates per region and fetches live members, sessions, and trainers without mock fallbacks", async () => {
    let tokenCalls = 0;

    const mockApi = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      res.setHeader("Content-Type", "application/json");

      if (req.method === "POST" && url.pathname === "/api/v2/auth/token") {
        tokenCalls++;
        const auth = req.headers.authorization ?? "";
        const isBlr = auth.includes(Buffer.from("blr_id:blr_secret").toString("base64"));
        res.end(
          JSON.stringify({
            access_token: isBlr ? "tok_blr_live" : "tok_mum_live",
            refresh_token: "ref_live",
          }),
        );
        return;
      }

      const region = req.headers.authorization === "Bearer tok_blr_live" ? "blr" : "mum";

      if (req.method === "GET" && url.pathname === "/api/v2/host/members") {
        const q = (url.searchParams.get("query") ?? "").toLowerCase();
        const mumMembers = [
          {
            id: 501,
            firstName: "Ananya",
            lastName: "Verma",
            email: "ananya@example.com",
            phoneNumber: "+919820000501",
            visits: { totalVisits: 84 },
            firstSeen: "2025-01-10T00:00:00.000Z",
            lastSeen: "2026-11-07T12:00:00.000Z",
            customerTags: [{ name: "VIP" }, { name: "Kemps Corner" }],
          },
        ];
        const blrMembers = [
          {
            id: 902,
            firstName: "Rohan",
            lastName: "Kulkarni",
            email: "rohan@example.com",
            phoneNumber: "+919845000902",
            visits: { totalVisits: 42 },
            firstSeen: "2025-06-01T00:00:00.000Z",
            lastSeen: "2026-11-08T06:30:00.000Z",
            customerTags: [{ name: "Indiranagar" }],
          },
        ];
        const pool = region === "blr" ? blrMembers : mumMembers;
        const filtered = q
          ? pool.filter((m) => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q))
          : pool;
        res.end(
          JSON.stringify({
            payload: filtered,
            pagination: { totalCount: filtered.length },
          }),
        );
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/v2/host/members/501" && region === "mum") {
        res.end(
          JSON.stringify({
            id: 501,
            firstName: "Ananya",
            lastName: "Verma",
            email: "ananya@example.com",
            visits: { totalVisits: 84 },
            customerTags: [{ name: "VIP" }],
          }),
        );
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/v2/host/sessions") {
        const sessions =
          region === "mum"
            ? [
                {
                  id: 7001,
                  name: "Signature Barre 57",
                  startsAt: "2026-11-08T12:30:00.000Z",
                  durationInMinutes: 57,
                  teacher: { firstName: "Anisha", lastName: "Shah" },
                  inPersonLocation: { id: 11, name: "Kwality House, Kemps Corner" },
                  capacity: 22,
                  bookingCount: 20,
                  isCancelled: false,
                },
              ]
            : [
                {
                  id: 8001,
                  name: "Power Cycle",
                  startsAt: "2026-11-08T13:00:00.000Z",
                  durationInMinutes: 45,
                  teacher: { firstName: "Meera", lastName: "Rao" },
                  inPersonLocation: { id: 22, name: "Kenkere House, Bengaluru" },
                  capacity: 18,
                  bookingCount: 16,
                  isCancelled: false,
                },
              ];
        res.end(JSON.stringify({ payload: sessions, pagination: { totalCount: sessions.length } }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    });

    await new Promise<void>((resolve) => mockApi.listen(0, "127.0.0.1", () => resolve()));
    const port = (mockApi.address() as net.AddressInfo).port;

    const prevEnv = { ...process.env };
    try {
      clearMomenceTokenCache();
      process.env.MOMENCE_API_URL = `http://127.0.0.1:${port}/api/v2`;
      process.env.MOMENCE_CLIENT_ID = "mum_id";
      process.env.MOMENCE_CLIENT_SECRET = "mum_secret";
      process.env.MOMENCE_USERNAME = "mum@physique57india.com";
      process.env.MOMENCE_PASSWORD = "secret";
      process.env.MOMENCE_CLIENT_ID_BLR = "blr_id";
      process.env.MOMENCE_CLIENT_SECRET_BLR = "blr_secret";
      process.env.MOMENCE_USERNAME_BLR = "blr@physique57india.com";
      process.env.MOMENCE_PASSWORD_BLR = "secret";

      expect(configuredRegions()).toEqual(["mum", "blr"]);

      // 1. Initial paginated directory load (empty query) across both regions
      const directory = await listMembers({ region: "all", page: 0, pageSize: 25 });
      expect(directory.totalCount).toBe(2);
      expect(directory.members.map((m) => m.id).sort()).toEqual(["blr:902", "mum:501"]);
      expect(tokenCalls).toBe(2); // Cached per region after initial sign-in

      // 2. Direct ID lookup ("501")
      const byId = await searchMembers("501");
      expect(byId).toHaveLength(1);
      expect(byId[0].name).toBe("Ananya Verma");

      // 3. Live sessions across regions
      const sessions = await searchSessions({
        from: "2026-11-08T00:00:00.000Z",
        to: "2026-11-09T00:00:00.000Z",
        region: "all",
      });
      expect(sessions).toHaveLength(2);
      expect(sessions[0].name).toBe("Signature Barre 57");
      expect(sessions[1].name).toBe("Power Cycle");

      // 4. Live trainers aggregated from sessions
      const trainers = await listTrainers("", "mum");
      expect(trainers).toHaveLength(1);
      expect(trainers[0].name).toBe("Anisha Shah");
      expect(trainers[0].locations).toContain("Kwality House, Kemps Corner");
    } finally {
      clearMomenceTokenCache();
      process.env = prevEnv;
      await new Promise<void>((resolve) => mockApi.close(() => resolve()));
    }
  });
});
