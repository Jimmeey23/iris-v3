/**
 * Momence Host API (v2) pure client for both Physique 57 accounts (Mumbai & Bengaluru).
 * Credentials stay on the server; tokens are cached per region and refreshed on expiry.
 * Supports `MOMENCE_API_URL` override for local wire-level integration tests.
 */

const apiBase = () => (process.env.MOMENCE_API_URL?.trim() || "https://api.momence.com/api/v2").replace(/\/+$/, "");

export type Region = "mum" | "blr";
export const REGIONS: Region[] = ["mum", "blr"];
const SUFFIX: Record<Region, string> = { mum: "", blr: "_BLR" };
export const REGION_LABEL: Record<Region, string> = { mum: "Mumbai", blr: "Bengaluru" };

type Token = { access: string; refresh?: string; expiresAt: number };
const g = globalThis as unknown as {
  momenceTokens?: Partial<Record<Region, Token>>;
  momenceTrainers?: {
    at: number;
    list: Array<{ id: string; name: string; region: Region; locations: string[]; classes: number }>;
  };
};
const tokens = (g.momenceTokens ??= {});

export function clearMomenceTokenCache() {
  for (const r of REGIONS) delete tokens[r];
  delete g.momenceTrainers;
}

function creds(region: Region) {
  const s = SUFFIX[region];
  const c = {
    clientId: process.env[`MOMENCE_CLIENT_ID${s}`],
    clientSecret: process.env[`MOMENCE_CLIENT_SECRET${s}`],
    username: process.env[`MOMENCE_USERNAME${s}`],
    password: process.env[`MOMENCE_PASSWORD${s}`],
  };
  if (!c.clientId || !c.clientSecret || !c.username || !c.password) return null;
  return {
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    username: c.username,
    password: c.password,
  };
}

export function configuredRegions(): Region[] {
  return REGIONS.filter((r) => creds(r));
}

async function requestToken(region: Region, body: Record<string, string>) {
  const c = creds(region);
  if (!c) throw new Error(`Momence ${REGION_LABEL[region]} isn't configured`);
  const res = await fetch(`${apiBase()}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Momence sign-in failed (${res.status})`);
  const j = await res.json();
  const t: Token = {
    access: j.access_token ?? j.accessToken,
    refresh: j.refreshToken ?? j.refresh_token,
    expiresAt: j.accessTokenExpiresAt ? Date.parse(j.accessTokenExpiresAt) : Date.now() + 50 * 60_000,
  };
  tokens[region] = t;
  return t.access;
}

async function token(region: Region, force = false) {
  const t = tokens[region];
  if (!force && t && t.expiresAt - 60_000 > Date.now()) return t.access;
  if (t?.refresh && !force) {
    try {
      return await requestToken(region, { grant_type: "refresh_token", refresh_token: t.refresh });
    } catch {
      /* fall through to password grant */
    }
  }
  const c = creds(region);
  if (!c) throw new Error(`Momence ${REGION_LABEL[region]} isn't configured`);
  return requestToken(region, { grant_type: "password", username: c.username, password: c.password });
}

export class MomenceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined>;

async function call(
  method: "GET" | "POST" | "PUT" | "DELETE",
  region: Region,
  path: string,
  params: Params = {},
  body?: unknown,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const url = `${apiBase()}${path}${qs.size ? `?${qs}` : ""}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${await token(region, attempt > 0)}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(method === "GET" ? 20_000 : 30_000),
    });
    if (res.status === 401 && attempt === 0) continue;
    if (!res.ok) throw new MomenceError(`Momence ${REGION_LABEL[region]} request failed (${res.status})`, res.status);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }
}

const get = (region: Region, path: string, params: Params = {}) => call("GET", region, path, params);

// ── Ids ──────────────────────────────────────────────────────────────────────
export function splitId(id: string): { region: Region; raw: string } {
  const [r, raw] = id.includes(":") ? id.split(":", 2) : ["mum", id];
  if (!REGIONS.includes(r as Region) || !/^\d+$/.test(raw)) throw new Error("Invalid Momence id");
  return { region: r as Region, raw };
}

// ── Members ──────────────────────────────────────────────────────────────────
export type MemberSummary = {
  id: string;
  region: Region;
  name: string;
  email: string | null;
  phone: string | null;
  totalVisits: number;
  firstSeen: string | null;
  lastSeen: string | null;
  tags: string[];
};

function toMember(region: Region, m: any): MemberSummary {
  return {
    id: `${region}:${m.id}`,
    region,
    name: [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email || `Member ${m.id}`,
    email: m.email ?? null,
    phone: m.phoneNumber ?? null,
    totalVisits: m.visits?.totalVisits ?? m.visits?.total ?? 0,
    firstSeen: m.firstSeen ?? null,
    lastSeen: m.lastSeen ?? null,
    tags: (m.customerTags ?? []).map((t: any) => t.name).filter(Boolean),
  };
}

/**
 * Paginated live member directory listing across one or all configured Momence regions.
 * Supports empty query (initial directory load), text search, or exact Momence ID lookup.
 */
export async function listMembers(opts: {
  region?: Region | "all";
  page?: number;
  pageSize?: number;
  query?: string;
}): Promise<{ members: MemberSummary[]; totalCount: number; configured: Region[] }> {
  const configured = configuredRegions();
  if (configured.length === 0) {
    return { members: [], totalCount: 0, configured: [] };
  }

  const targetRegions =
    opts.region && opts.region !== "all" ? configured.filter((r) => r === opts.region) : configured;
  if (targetRegions.length === 0) {
    return { members: [], totalCount: 0, configured };
  }

  const page = Math.max(0, opts.page ?? 0);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = (opts.query ?? "").trim();

  // Support direct lookup by prefixed or numeric Momence ID (e.g. "mum:12345" or "12345")
  if (/^(mum:|blr:)?\d+$/.test(q)) {
    const idTargets: Array<{ region: Region; raw: string }> = q.includes(":")
      ? [splitId(q)]
      : targetRegions.map((r) => ({ region: r, raw: q }));
    const direct = await Promise.allSettled(
      idTargets.map(async ({ region, raw }) => {
        const m = await get(region, `/host/members/${raw}`);
        return m && m.id != null ? toMember(region, m) : null;
      }),
    );
    const found = direct
      .flatMap((x) => (x.status === "fulfilled" && x.value ? [x.value] : []));
    if (found.length > 0) {
      return { members: found, totalCount: found.length, configured };
    }
  }

  const results = await Promise.allSettled(
    targetRegions.map(async (r) => {
      const j = await get(r, "/host/members", {
        page,
        pageSize,
        query: q || undefined,
        sortBy: q ? undefined : "lastSeen",
        sortOrder: q ? undefined : "DESC",
      });
      const rows = (j.payload ?? []).map((m: any) => toMember(r, m));
      const count = Number(j.pagination?.totalCount ?? rows.length);
      return { rows, count };
    }),
  );

  const fulfilled = results.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []));
  if (fulfilled.length === 0 && results.every((x) => x.status === "rejected")) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  const merged = fulfilled
    .flatMap((f) => f.rows)
    .sort((a, b) => {
      if (q) return b.totalVisits - a.totalVisits;
      return (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "") || b.totalVisits - a.totalVisits;
    });
  const totalCount = fulfilled.reduce((sum, f) => sum + f.count, 0);

  return { members: merged, totalCount, configured };
}

export async function searchMembers(query: string, limit = 10): Promise<MemberSummary[]> {
  const q = query.trim();
  if (!/^(mum:|blr:)?\d+$/.test(q) && q.length < 2) return [];
  const { members } = await listMembers({ query: q, pageSize: limit, page: 0 });
  return members.slice(0, limit * 2);
}

export async function getMemberDetails(id: string) {
  const { region, raw } = splitId(id);
  const [member, memberships, bookings] = await Promise.all([
    get(region, `/host/members/${raw}`).catch(() => null),
    get(region, `/host/members/${raw}/bought-memberships/active`, { page: 0, pageSize: 20 }).catch(() => ({
      payload: [],
    })),
    get(region, `/host/members/${raw}/sessions`, { page: 0, pageSize: 10, sortOrder: "DESC" }).catch(() => ({
      payload: [],
    })),
  ]);
  return {
    member: member ? toMember(region, member) : null,
    activeMemberships: (memberships.payload ?? []).map((m: any) => ({
      id: `${region}:${m.id}`,
      name: m.membership?.name ?? m.type,
      type: m.type,
      startDate: m.startDate,
      endDate: m.endDate,
      isFrozen: m.isFrozen,
      classCreditsLeft: m.eventCreditsLeft,
      classCreditsTotal: m.eventCreditsTotal,
      usedSessions: m.usedSessions,
    })),
    recentBookings: (bookings.payload ?? []).map((b: any) => ({
      bookingId: `${region}:${b.id}`,
      checkedIn: b.checkedIn,
      cancelledAt: b.cancelledAt,
      session: b.session ? toSession(region, b.session) : null,
    })),
  };
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export type SessionSummary = {
  id: string;
  region: Region;
  name: string;
  startsAt: string;
  durationMins: number | null;
  teacher: string | null;
  location: string | null;
  capacity: number | null;
  booked: number;
  cancelled: boolean;
};

function toSession(region: Region, s: any): SessionSummary {
  return {
    id: `${region}:${s.id}`,
    region,
    name: s.name,
    startsAt: s.startsAt,
    durationMins: s.durationInMinutes ?? null,
    teacher: s.teacher ? [s.teacher.firstName, s.teacher.lastName].filter(Boolean).join(" ") : null,
    location: s.inPersonLocation?.name ?? null,
    capacity: s.capacity ?? null,
    booked: s.bookingCount ?? 0,
    cancelled: Boolean(s.isCancelled),
  };
}

export async function searchSessions(opts: {
  from?: string;
  to?: string;
  query?: string;
  limit?: number;
  region?: Region | "all";
}) {
  const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 24 * 3600_000);
  const to = opts.to ? new Date(opts.to) : new Date(from.getTime() + 3 * 24 * 3600_000);
  if (isNaN(+from) || isNaN(+to)) throw new Error("Invalid date range");
  const q = (opts.query ?? "").toLowerCase().trim();
  const configured = configuredRegions();
  const targetRegions =
    opts.region && opts.region !== "all" ? configured.filter((r) => r === opts.region) : configured;
  if (!targetRegions.length) return [];

  const results = await Promise.allSettled(
    targetRegions.map(async (r) => {
      const out: SessionSummary[] = [];
      for (let page = 0; page < 15; page++) {
        const j = await get(r, "/host/sessions", {
          page,
          pageSize: 100,
          startAfter: from.toISOString(),
          startBefore: to.toISOString(),
          sortBy: "startsAt",
          sortOrder: "ASC",
        });
        out.push(...(j.payload ?? []).map((s: any) => toSession(r, s)));
        if ((page + 1) * 100 >= (j.pagination?.totalCount ?? 0)) break;
      }
      return out;
    }),
  );
  const all = results.flatMap((x) => (x.status === "fulfilled" ? x.value : []));
  if (!all.length && results.every((x) => x.status === "rejected")) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  const terms = q.split(/\s+/).filter(Boolean);
  return all
    .filter(
      (s) =>
        !terms.length ||
        terms.every((t) => `${s.name} ${s.teacher ?? ""} ${s.location ?? ""}`.toLowerCase().includes(t)),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, opts.limit ?? 50);
}

export async function listTrainers(query = "", regionFilter?: Region | "all") {
  if (!g.momenceTrainers || Date.now() - g.momenceTrainers.at > 6 * 3600_000) {
    const sessions = await searchSessions({
      from: new Date(Date.now() - 30 * 24 * 3600_000).toISOString(),
      to: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      limit: 100_000,
    });
    const map = new Map<
      string,
      { id: string; name: string; region: Region; locations: Set<string>; classes: number }
    >();
    for (const s of sessions) {
      if (!s.teacher) continue;
      const key = `${s.region}:${s.teacher.toLowerCase()}`;
      const e = map.get(key) ?? {
        id: key,
        name: s.teacher,
        region: s.region,
        locations: new Set<string>(),
        classes: 0,
      };
      if (s.location) e.locations.add(s.location);
      e.classes++;
      map.set(key, e);
    }
    g.momenceTrainers = {
      at: Date.now(),
      list: [...map.values()]
        .map((e) => ({ ...e, locations: [...e.locations] }))
        .sort((a, b) => b.classes - a.classes),
    };
  }
  const q = query.toLowerCase().trim();
  return g.momenceTrainers.list
    .filter((t) => (!regionFilter || regionFilter === "all" || t.region === regionFilter))
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.locations.some((l) => l.toLowerCase().includes(q)))
    .slice(0, 50);
}

export { call as momenceCall, get as momenceGet, toSession, toMember };
