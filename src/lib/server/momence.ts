import "server-only";

/**
 * Momence Host API (v2) client for both Physique 57 accounts.
 * Credentials stay on the server; tokens are cached per region and refreshed
 * on expiry. Ids returned to the client are prefixed with the region
 * ("mum:123", "blr:456") so follow-up calls hit the right account.
 */

const BASE = "https://api.momence.com/api/v2";

export type Region = "mum" | "blr";
export const REGIONS: Region[] = ["mum", "blr"];
const SUFFIX: Record<Region, string> = { mum: "", blr: "_BLR" };
export const REGION_LABEL: Record<Region, string> = { mum: "Mumbai", blr: "Bengaluru" };

type Token = { access: string; refresh?: string; expiresAt: number };
const g = globalThis as unknown as { momenceTokens?: Partial<Record<Region, Token>> };
const tokens = (g.momenceTokens ??= {});

function creds(region: Region) {
  const s = SUFFIX[region];
  const c = {
    clientId: process.env[`MOMENCE_CLIENT_ID${s}`],
    clientSecret: process.env[`MOMENCE_CLIENT_SECRET${s}`],
    username: process.env[`MOMENCE_USERNAME${s}`],
    password: process.env[`MOMENCE_PASSWORD${s}`],
  };
  if (!c.clientId || !c.clientSecret || !c.username || !c.password) return null;
  return c as Required<typeof c>;
}

export function configuredRegions() {
  return REGIONS.filter((r) => creds(r));
}

async function requestToken(region: Region, body: Record<string, string>) {
  const c = creds(region);
  if (!c) throw new Error(`Momence ${REGION_LABEL[region]} isn't configured`);
  const res = await fetch(`${BASE}/auth/token`, {
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
  const c = creds(region)!;
  return requestToken(region, { grant_type: "password", username: c.username!, password: c.password! });
}

async function get(region: Region, path: string, params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const url = `${BASE}${path}${qs.size ? `?${qs}` : ""}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${await token(region, attempt > 0)}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 401 && attempt === 0) continue;
    if (!res.ok) throw new Error(`Momence ${REGION_LABEL[region]} request failed (${res.status})`);
    return res.json();
  }
}

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

export async function searchMembers(query: string, limit = 10): Promise<MemberSummary[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = await Promise.allSettled(
    configuredRegions().map(async (r) => {
      const j = await get(r, "/host/members", { page: 0, pageSize: limit, query: q });
      return (j.payload ?? []).map((m: any) => toMember(r, m));
    }),
  );
  const ok = results.flatMap((x) => (x.status === "fulfilled" ? x.value : []));
  if (!ok.length && results.every((x) => x.status === "rejected")) throw (results[0] as PromiseRejectedResult).reason;
  return ok.sort((a, b) => b.totalVisits - a.totalVisits).slice(0, limit * 2);
}

export async function getMemberDetails(id: string) {
  const { region, raw } = splitId(id);
  const [member, memberships, bookings] = await Promise.all([
    get(region, `/host/members/${raw}`).catch(() => null),
    get(region, `/host/members/${raw}/bought-memberships/active`, { page: 0, pageSize: 20 }).catch(() => ({ payload: [] })),
    get(region, `/host/members/${raw}/sessions`, { page: 0, pageSize: 10, sortOrder: "DESC" }).catch(() => ({ payload: [] })),
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

/** Sessions between two dates, optionally filtered by text (class, trainer or studio). */
export async function searchSessions(opts: { from?: string; to?: string; query?: string; limit?: number }) {
  const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 24 * 3600_000);
  const to = opts.to ? new Date(opts.to) : new Date(from.getTime() + 3 * 24 * 3600_000);
  if (isNaN(+from) || isNaN(+to)) throw new Error("Invalid date range");
  const q = (opts.query ?? "").toLowerCase().trim();
  const results = await Promise.allSettled(
    configuredRegions().map(async (r) => {
      const out: SessionSummary[] = [];
      for (let page = 0; page < 15; page++) {
        const j = await get(r, "/host/sessions", {
          page, pageSize: 100, startAfter: from.toISOString(), startBefore: to.toISOString(), sortBy: "startsAt", sortOrder: "ASC",
        });
        out.push(...(j.payload ?? []).map((s: any) => toSession(r, s)));
        if ((page + 1) * 100 >= (j.pagination?.totalCount ?? 0)) break;
      }
      return out;
    }),
  );
  const all = results.flatMap((x) => (x.status === "fulfilled" ? x.value : []));
  const terms = q.split(/\s+/).filter(Boolean);
  return all
    .filter((s) => !terms.length || terms.every((t) => `${s.name} ${s.teacher ?? ""} ${s.location ?? ""}`.toLowerCase().includes(t)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, opts.limit ?? 30);
}

/** Trainers seen on sessions in the last 30 days (Momence has no teacher listing endpoint). */
const trainerCache = g as unknown as { momenceTrainers?: { at: number; list: Array<{ id: string; name: string; region: Region; locations: string[]; classes: number }> } };
export async function listTrainers(query = "") {
  if (!trainerCache.momenceTrainers || Date.now() - trainerCache.momenceTrainers.at > 6 * 3600_000) {
    const sessions = await searchSessions({
      from: new Date(Date.now() - 30 * 24 * 3600_000).toISOString(),
      to: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      limit: 100_000,
    });
    const map = new Map<string, { id: string; name: string; region: Region; locations: Set<string>; classes: number }>();
    for (const s of sessions) {
      if (!s.teacher) continue;
      const key = `${s.region}:${s.teacher.toLowerCase()}`;
      const e = map.get(key) ?? { id: key, name: s.teacher, region: s.region, locations: new Set<string>(), classes: 0 };
      if (s.location) e.locations.add(s.location);
      e.classes++;
      map.set(key, e);
    }
    trainerCache.momenceTrainers = {
      at: Date.now(),
      list: [...map.values()].map((e) => ({ ...e, locations: [...e.locations] })).sort((a, b) => b.classes - a.classes),
    };
  }
  const q = query.toLowerCase().trim();
  return trainerCache.momenceTrainers.list.filter((t) => !q || t.name.toLowerCase().includes(q)).slice(0, 25);
}
