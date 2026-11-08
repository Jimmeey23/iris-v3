import { describe, expect, it, mock } from "bun:test";

// The vault is server-only; stub the guard so its pure helpers can be tested here.
mock.module("server-only", () => ({}));
process.env.INTEGRATION_ENCRYPTION_KEY = "a".repeat(64);
const vault = await import("../../src/lib/server/integration-vault");
const probes = await import("../../src/lib/server/integration-probes");

describe("integration vault", () => {
  it("round-trips secrets and never stores them in plain text", () => {
    const enc = vault.encryptSecrets({ api_key: "sk_live_123" });
    expect(enc).not.toContain("sk_live_123");
    expect(enc.split(".")).toHaveLength(3);
    expect(vault.decryptSecrets(enc)).toEqual({ api_key: "sk_live_123" });
  });

  it("rejects tampered ciphertext", () => {
    const [iv, tag, data] = vault.encryptSecrets({ a: "b" }).split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() => vault.decryptSecrets([iv, tag, flipped.toString("base64")].join("."))).toThrow();
  });

  it("reads env credentials by prefix, ignoring blanks; ChatGPT reads OPENAI_*", () => {
    const env = { STRIPE_API_KEY: "sk", STRIPE_EMPTY: "  ", GOOGLE_SHEETS_REFRESH_TOKEN: "rt", OPENAI_API_KEY: "oa" };
    expect(vault.envCredentials("stripe", env)).toEqual({ api_key: "sk" });
    expect(vault.envCredentials("google-sheets", env)).toEqual({ refresh_token: "rt" });
    expect(vault.envCredentials("chatgpt", env)).toEqual({ api_key: "oa" });
  });

  it("maps v2 catalogue ids onto v3 rows", () => {
    expect(vault.dbIdFor("chatgpt")).toBe("openai");
    expect(vault.catalogueIdFor("responseio")).toBe("respond");
    expect(vault.definitionFor("openai")?.name).toContain("OpenAI");
  });
});

describe("integration probes", () => {
  it("reports missing fields without calling out", async () => {
    const r = await probes.probe("stripe", {});
    expect(r).toEqual({ ok: false, status: "disconnected", detail: "Missing: api_key" });
  });

  it("refuses non-HTTPS or credentialed webhooks and never posts", async () => {
    expect((await probes.probe("slack", { webhook_url: "http://hooks.example.com/x" })).ok).toBe(false);
    expect((await probes.probe("slack", { webhook_url: "https://u:p@hooks.example.com/x" })).ok).toBe(false);
  });

  it("validates Jira and Zendesk hosts before calling them", async () => {
    expect((await probes.probe("jira", { site: "evil.example.com", email: "a@b.c", api_token: "t" })).detail).toContain("atlassian.net");
    expect((await probes.probe("zendesk", { subdomain: "a.b/c", email: "a@b.c", api_token: "t" })).detail).toContain("Subdomain");
  });
});
