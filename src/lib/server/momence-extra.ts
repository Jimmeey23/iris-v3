import "server-only";
import {
  momenceCall, momenceGet, splitId, toSession, toMember, configuredRegions, REGIONS, REGION_LABEL, MomenceError,
  type Region, type SessionSummary,
} from "./momence";
import { asSystem } from "./db";

/**
 * Extra Momence host endpoints: notes, bookings, memberships (incl. frozen),
 * tags, catalogue, sales/payments, leads, semesters, rosters, appointments,
 * plus audited write actions. All ids are region-prefixed ("mum:123").
 */

// ── Small TTL cache (per server process) ─────────────────────────────────────
const gx = globalThis as unknown as { momenceCache?: Map<string, { at: number; v: unknown }> };
const cache = (gx.momenceCache ??= new Map());
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as T;
  const v = await fn();
  cache.set(key, { at: Date.now(), v });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return v;
}

const MIN = 60_000;
const rid = (region: Region, id: unknown) => `${region}:${id}`;
const fullName = (p: any) => (p ? [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || null : null);

/** Fetch up to `maxPages` pages of a paginated endpoint. */
async function paged(region: Region, path: string, params: Record<string, string | number | boolean | undefined>, opts: { pageSize?: number; maxPages?: number } = {}) {
  const pageSize = opts.pageSize ?? 100;
  const maxPages = opts.maxPages ?? 5;
  const out: any[] = [];
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const j = await momenceGet(region, path, { ...params, page, pageSize });
    out.push(...(j.payload ?? []));
    total = j.pagination?.totalCount ?? out.length;
    if ((page + 1) * pageSize >= total) break;
  }
  return { items: out, total };
}

/** Wrap a section so a 403/404 becomes `{ unavailable }` instead of failing the whole panel. */
export async function section<T>(fn: () => Promise<T>): Promise<{ data?: T; unavailable?: boolean; error?: string }> {
  try {
    return { data: await fn() };
  } catch (e) {
    if (e instanceof MomenceError && (e.status === 403 || e.status === 404)) return { unavailable: true, error: `Not available (${e.status})` };
    return { error: (e as Error).message };
  }
}

// ── Member: memberships (active + frozen) ────────────────────────────────────
export type MembershipRow = {
  id: string;
  name: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  isFrozen: boolean;
  freeze: Record<string, unknown> | null;
  creditsLeft: number | null;
  creditsTotal: number | null;
  moneyLeft: number | null;
  moneyTotal: number | null;
  usedSessions: number | null;
  usageLimitSessions: number | null;
  autoRenewing: boolean | null;
  declinedRenewal: boolean;
};

/** Momence only exposes active (optionally incl. frozen) bought memberships per member. */
export async function getMemberMemberships(memberId: string): Promise<MembershipRow[]> {
  const { region, raw } = splitId(memberId);
  const { items } = await paged(region, `/host/members/${raw}/bought-memberships/active`, { includeFrozen: true }, { pageSize: 50, maxPages: 2 });
  return items.map((m) => ({
    id: rid(region, m.id),
    name: m.membership?.name ?? m.type,
    type: m.type,
    startDate: m.startDate ?? null,
    endDate: m.endDate ?? null,
    isFrozen: Boolean(m.isFrozen),
    freeze: m.freeze && typeof m.freeze === "object" ? m.freeze : null,
    creditsLeft: m.eventCreditsLeft ?? null,
    creditsTotal: m.eventCreditsTotal ?? null,
    moneyLeft: m.moneyCreditsLeft ?? null,
    moneyTotal: m.moneyCreditsTotal ?? null,
    usedSessions: m.usedSessions ?? null,
    usageLimitSessions: m.usageLimitForSessions ?? null,
    autoRenewing: m.membership?.autoRenewing ?? null,
    declinedRenewal: Boolean(m.declinedRenewal),
  }));
}

// ── Member: bookings & attendance ────────────────────────────────────────────
export type BookingRow = {
  bookingId: string;
  checkedIn: boolean;
  cancelledAt: string | null;
  bookedAt: string | null;
  session: SessionSummary | null;
};

export async function getMemberBookings(memberId: string, opts: { limit?: number; includeCancelled?: boolean } = {}) {
  const { region, raw } = splitId(memberId);
  const limit = Math.min(opts.limit ?? 25, 100);
  const j = await momenceGet(region, `/host/members/${raw}/sessions`, {
    page: 0, pageSize: limit, sortOrder: "DESC", includeCancelled: opts.includeCancelled ?? true,
  });
  const rows: BookingRow[] = (j.payload ?? []).map((b: any) => ({
    bookingId: rid(region, b.id),
    checkedIn: Boolean(b.checkedIn),
    cancelledAt: b.cancelledAt ?? null,
    bookedAt: b.createdAt ?? null,
    session: b.session ? toSession(region, b.session) : null,
  }));
  const live = rows.filter((r) => !r.cancelledAt);
  return {
    total: j.pagination?.totalCount ?? rows.length,
    rows,
    stats: {
      shown: rows.length,
      attended: live.filter((r) => r.checkedIn).length,
      cancelled: rows.length - live.length,
      noShows: live.filter((r) => !r.checkedIn && r.session && new Date(r.session.startsAt) < new Date()).length,
    },
  };
}

export async function getMemberAppointments(memberId: string, limit = 20) {
  const { region, raw } = splitId(memberId);
  const j = await momenceGet(region, `/host/members/${raw}/appointments`, { page: 0, pageSize: limit, sortOrder: "DESC", includeCancelled: true });
  return (j.payload ?? []).map((a: any) => ({
    id: rid(region, a.id),
    startsAt: a.startsAt,
    durationMins: a.durationInMinutes ?? null,
    service: a.service?.name ?? null,
    teacher: fullName(a.teacher),
    location: a.inPersonLocation?.name ?? null,
    price: a.priceInCurrency ?? null,
    currency: a.currency ?? null,
    isPaid: Boolean(a.isPaid),
    cancelledAt: a.cancelledAt ?? null,
  }));
}

// ── Member: notes ────────────────────────────────────────────────────────────
export async function getMemberNotes(memberId: string, limit = 30) {
  const { region, raw } = splitId(memberId);
  const j = await momenceGet(region, `/host/members/${raw}/notes`, { page: 0, pageSize: limit, sortOrder: "DESC" });
  return (j.payload ?? []).map((n: any) => ({
    id: rid(region, n.id),
    createdAt: n.createdAt,
    type: n.type,
    note: String(n.note ?? ""),
    locked: Boolean(n.lockedAt),
    boughtMembershipId: n.boughtMembershipId ? rid(region, n.boughtMembershipId) : null,
    sessionBookingId: n.sessionBookingId ? rid(region, n.sessionBookingId) : null,
    paymentTransactionId: n.paymentTransactionId ? rid(region, n.paymentTransactionId) : null,
  }));
}

// ── Tags ─────────────────────────────────────────────────────────────────────
export async function listHostTags(region: Region) {
  return cached(`tags:${region}`, 30 * MIN, async () => {
    const { items } = await paged(region, "/host/tags", {}, { maxPages: 3 });
    return items.map((t) => ({ id: rid(region, t.id), name: String(t.name), badge: Boolean(t.isCustomerBadge) }));
  });
}

export async function getMemberTags(memberId: string) {
  const { region, raw } = splitId(memberId);
  const [member, available] = await Promise.all([momenceGet(region, `/host/members/${raw}`), listHostTags(region).catch(() => [])]);
  return {
    assigned: (member.customerTags ?? []).map((t: any) => ({ id: rid(region, t.id), name: String(t.name), badge: Boolean(t.isCustomerBadge) })),
    available,
  };
}

// ── Catalogue ────────────────────────────────────────────────────────────────
export async function getMembershipCatalogue(region?: Region) {
  const regions = region ? [region] : configuredRegions();
  const lists = await Promise.all(
    regions.map((r) =>
      cached(`catalogue:${r}`, 60 * MIN, async () => {
        const { items } = await paged(r, "/host/memberships", {}, { maxPages: 3 });
        return items.map((m) => ({
          id: rid(r, m.id),
          region: r,
          name: String(m.name),
          type: m.type,
          price: m.price ?? null,
          credits: m.eventCredits ?? null,
          duration: m.duration ? `${m.duration} ${m.durationUnit}` : null,
          autoRenewing: Boolean(m.autoRenewing),
          disabled: Boolean(m.disabled),
          intro: Boolean(m.isIntroOffer),
        }));
      }),
    ),
  );
  return lists.flat();
}

// ── Sales / payments ─────────────────────────────────────────────────────────
export type SaleRow = {
  id: string;
  date: string;
  items: Array<{ name: string; type: string; qty: number; unitPrice: number; payer: string | null; for: string | null }>;
  methods: Array<{ method: string; amount: number }>;
  total: number;
};

/**
 * Momence has no per-member sales filter, so we scan the most recent sales
 * (newest first, cached 5 minutes per region) and pick out this member's.
 */
async function recentSales(region: Region, pages = 6) {
  return cached(`sales:${region}:${pages}`, 5 * MIN, async () => {
    const out: any[] = [];
    for (let start = 0; start < pages; start += 3) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(3, pages - start) }, (_, i) =>
          momenceGet(region, "/host/sales", { page: start + i, pageSize: 100, sortOrder: "DESC" }).then((j) => j.payload ?? []),
        ),
      );
      out.push(...batch.flat());
    }
    return out;
  });
}

export async function getMemberPayments(memberId: string, pages = 6) {
  const { region, raw } = splitId(memberId);
  const sales = await recentSales(region, pages);
  const mine = sales.filter((s) => (s.items ?? []).some((i: any) => String(i.payingMember?.id) === raw || String(i.targetMember?.id) === raw));
  const rows: SaleRow[] = mine.map((s) => ({
    id: rid(region, s.id),
    date: s.saleDate,
    items: (s.items ?? []).map((i: any) => ({
      name: i.descriptiveItemName ?? i.itemName ?? "Item",
      type: i.itemType,
      qty: i.quantity ?? 1,
      unitPrice: Number(i.unitPriceExcludingTaxInCurrency ?? 0) + Number(i.unitTaxAmountInCurrency ?? 0),
      payer: fullName(i.payingMember),
      for: fullName(i.targetMember),
    })),
    methods: (s.paymentTransaction?.items ?? []).map((p: any) => ({
      method: p.paymentMethodName ?? p.paymentMethodType,
      amount: Number(p.amountInCurrencyWithoutTax ?? 0) + Number(p.taxAmountInCurrency ?? 0),
    })),
    total: (s.paymentTransaction?.items ?? []).reduce(
      (n: number, p: any) => n + Number(p.amountInCurrencyWithoutTax ?? 0) + Number(p.taxAmountInCurrency ?? 0), 0),
  }));
  return { rows, scanned: sales.length, note: `Searched the ${sales.length} most recent sales in ${REGION_LABEL[region]}` };
}

export async function getPaymentTransaction(id: string) {
  const { region, raw } = splitId(id);
  const p = await momenceGet(region, `/host/payment-transactions/${raw}`);
  return {
    id: rid(region, p.id),
    status: p.paymentStatus,
    currency: p.currency,
    paid: p.paidInCurrency,
    tax: p.vatAmountInCurrency,
    paidInEventCredits: p.paidInEventCredits,
    source: p.paymentSource,
    payer: fullName(p.payingMember),
  };
}

// ── Leads ────────────────────────────────────────────────────────────────────
export async function listLeadMeta(region: Region) {
  return cached(`leadmeta:${region}`, 60 * MIN, async () => {
    const [src, stg] = await Promise.all([
      paged(region, "/host/customer-lead-sources", {}, { maxPages: 2 }),
      paged(region, "/host/customer-lead-stages", {}, { maxPages: 2 }),
    ]);
    return {
      sources: src.items.map((s) => ({ id: rid(region, s.id), name: String(s.name) })),
      stages: stg.items.map((s) => ({ id: rid(region, s.id), name: String(s.name) })),
    };
  });
}

export async function listLeads(opts: { region: Region; query?: string; sourceId?: string; stageId?: string; limit?: number }) {
  const meta = await listLeadMeta(opts.region);
  const name = (list: Array<{ id: string; name: string }>, id: unknown) => list.find((x) => x.id === rid(opts.region, id))?.name ?? null;
  const j = await momenceGet(opts.region, "/host/customer-leads", {
    page: 0, pageSize: Math.min(opts.limit ?? 25, 100), sortOrder: "DESC", query: opts.query,
    sourceId: opts.sourceId ? splitId(opts.sourceId).raw : undefined,
    stageId: opts.stageId ? splitId(opts.stageId).raw : undefined,
  });
  return {
    total: j.pagination?.totalCount ?? 0,
    leads: (j.payload ?? []).map((l: any) => ({
      id: rid(opts.region, l.id),
      name: fullName(l),
      email: l.email ?? null,
      phone: l.phoneNumber ?? null,
      source: name(meta.sources, l.sourceId),
      stage: name(meta.stages, l.stageId),
      memberId: l.memberId ? rid(opts.region, l.memberId) : null,
      createdAt: l.createdAt,
    })),
    ...meta,
  };
}

// ── Semesters, appointments, locations ───────────────────────────────────────
export async function listSemesters(region: Region) {
  return cached(`semesters:${region}`, 30 * MIN, async () => {
    const { items } = await paged(region, "/host/semesters", { includeDrafts: false }, { maxPages: 2 });
    return items.map((s) => ({ id: rid(region, s.id), name: String(s.name), startsAt: s.startsAt, endsAt: s.endsAt, cancelled: Boolean(s.isCancelled) }));
  });
}

export async function listAppointmentReservations(opts: { region: Region; from?: string; to?: string; limit?: number }) {
  const from = opts.from ?? new Date(Date.now() - 24 * 3600_000).toISOString();
  const to = opts.to ?? new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
  const j = await momenceGet(opts.region, "/host/appointments/reservations", {
    page: 0, pageSize: Math.min(opts.limit ?? 50, 100), sortOrder: "ASC", startAfter: from, startBefore: to, includeCancelled: false,
  });
  return (j.payload ?? []).map((a: any) => ({
    id: rid(opts.region, a.id),
    startsAt: a.startsAt,
    service: a.service?.name ?? null,
    teacher: fullName(a.teacher),
    location: a.inPersonLocation?.name ?? null,
    isPaid: Boolean(a.isPaid),
    attendees: (a.appointmentAttendees ?? []).length,
  }));
}

/** Momence's host API has no locations endpoint (404), so derive studios from recent sessions. */
export async function listLocations() {
  return cached("locations", 6 * 60 * MIN, async () => {
    const out = new Map<string, { id: string; name: string; region: Region }>();
    await Promise.all(
      REGIONS.filter((r) => configuredRegions().includes(r)).map(async (r) => {
        const { items } = await paged(r, "/host/sessions", {
          startAfter: new Date(Date.now() - 14 * 24 * 3600_000).toISOString(),
          startBefore: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
        }, { maxPages: 4 });
        for (const s of items) if (s.inPersonLocation) out.set(rid(r, s.inPersonLocation.id), { id: rid(r, s.inPersonLocation.id), name: s.inPersonLocation.name, region: r });
      }),
    );
    return [...out.values()];
  });
}

// ── Sessions: detail + roster ────────────────────────────────────────────────
export async function getSessionRoster(sessionId: string, includeNames = true) {
  const { region, raw } = splitId(sessionId);
  const [detail, bookings] = await Promise.all([
    momenceGet(region, `/host/sessions/${raw}`),
    paged(region, `/host/sessions/${raw}/bookings`, { includeCancelled: true }, { pageSize: 100, maxPages: 3 }),
  ]);
  const live = bookings.items.filter((b) => !b.cancelledAt);
  return {
    session: toSession(region, detail),
    waitlist: detail.waitlistBookingCount ?? 0,
    waitlistCapacity: detail.waitlistCapacity ?? null,
    tags: (detail.tags ?? []).map((t: any) => t.name),
    counts: {
      booked: live.length,
      checkedIn: live.filter((b) => b.checkedIn).length,
      cancelled: bookings.items.length - live.length,
    },
    roster: live.map((b) => ({
      bookingId: rid(region, b.id),
      memberId: b.member?.id ? rid(region, b.member.id) : null,
      name: includeNames ? fullName(b.member) : null,
      checkedIn: Boolean(b.checkedIn),
      tickets: b.ticketsBought ?? 1,
      recurring: Boolean(b.isRecurring),
    })),
  };
}

// ── Capability probe (which endpoints this account may read) ─────────────────
export async function probeCapabilities() {
  return cached("capabilities", 30 * MIN, async () => {
    const result: Record<string, Record<string, number>> = {};
    for (const r of configuredRegions()) {
      const q = { page: 0, pageSize: 1 };
      const m = await momenceGet(r, "/host/members", q).catch(() => null);
      const mid = m?.payload?.[0]?.id;
      const checks: Array<[string, string, Record<string, string | number | boolean | undefined>]> = [
        ["members", "/host/members", q],
        ["notes", `/host/members/${mid}/notes`, q],
        ["memberSessions", `/host/members/${mid}/sessions`, q],
        ["boughtMemberships", `/host/members/${mid}/bought-memberships/active`, { ...q, includeFrozen: true }],
        ["appointments", `/host/members/${mid}/appointments`, q],
        ["tags", "/host/tags", q],
        ["memberships", "/host/memberships", q],
        ["sales", "/host/sales", { ...q, sortOrder: "DESC" }],
        ["leads", "/host/customer-leads", q],
        ["leadSources", "/host/customer-lead-sources", q],
        ["leadStages", "/host/customer-lead-stages", q],
        ["semesters", "/host/semesters", q],
        ["reservations", "/host/appointments/reservations", q],
        ["sessions", "/host/sessions", q],
        ["locations", "/host/locations", q],
      ];
      result[r] = {};
      await Promise.all(
        checks.map(async ([k, path, params]) => {
          try {
            await momenceGet(r, path, params);
            result[r][k] = 200;
          } catch (e) {
            result[r][k] = e instanceof MomenceError ? e.status : 0;
          }
        }),
      );
    }
    return result;
  });
}

// ── Everything for a ticket / Member 360, in one go ──────────────────────────
export async function getMemberOverview(memberId: string) {
  const { region, raw } = splitId(memberId);
  const [member, memberships, bookings, notes] = await Promise.all([
    section(async () => toMember(region, await momenceGet(region, `/host/members/${raw}`))),
    section(() => getMemberMemberships(memberId)),
    section(() => getMemberBookings(memberId, { limit: 10 })),
    section(() => getMemberNotes(memberId, 5)),
  ]);
  return { member, memberships, bookings, notes };
}

// ── WRITE actions (manager/admin only; callers must have confirmed) ──────────
export type ActionInput =
  | { action: "freeze_membership"; memberId: string; boughtMembershipId: string; freezeType: "now" | "scheduled" | "before_renewal"; freezeAt?: string; unfreezeAt?: string; reason?: string }
  | { action: "unfreeze_membership"; memberId: string; boughtMembershipId: string }
  | { action: "update_credits"; memberId: string; boughtMembershipId: string; eventCreditsLeft?: number; moneyCreditsLeft?: number }
  | { action: "check_in" | "remove_check_in"; bookingId: string }
  | { action: "cancel_booking"; bookingId: string; refund?: boolean; disableNotifications?: boolean; isLateCancellation?: boolean }
  | { action: "add_to_session"; sessionId: string; memberId: string; waitlist?: boolean }
  | { action: "assign_tag" | "unassign_tag"; memberId: string; tagId: string };

export const ACTION_LABELS: Record<ActionInput["action"], string> = {
  freeze_membership: "Freeze membership",
  unfreeze_membership: "Unfreeze membership",
  update_credits: "Update class credits",
  check_in: "Check in",
  remove_check_in: "Remove check-in",
  cancel_booking: "Cancel booking",
  add_to_session: "Add to session",
  assign_tag: "Assign tag",
  unassign_tag: "Remove tag",
};

function sameRegion(...ids: string[]) {
  const parts = ids.map(splitId);
  if (parts.some((p) => p.region !== parts[0].region)) throw new Error("Ids belong to different Momence accounts");
  return { region: parts[0].region, raws: parts.map((p) => p.raw) };
}

const isoOrThrow = (v: string | undefined, label: string) => {
  if (!v || isNaN(Date.parse(v))) throw new Error(`${label} must be a valid date`);
  return new Date(v).toISOString();
};

export async function runMomenceAction(input: ActionInput) {
  switch (input.action) {
    case "freeze_membership": {
      const { region, raws: [m, b] } = sameRegion(input.memberId, input.boughtMembershipId);
      if (!["now", "scheduled", "before_renewal"].includes(input.freezeType)) throw new Error("Invalid freeze type");
      const body: Record<string, unknown> = {
        freezeType: input.freezeType,
        unfreezeType: input.unfreezeAt ? "scheduled" : "not_set",
        reason: input.reason?.slice(0, 500),
      };
      if (input.freezeType === "scheduled") body.freezeAt = isoOrThrow(input.freezeAt, "Freeze date");
      if (input.unfreezeAt) body.unfreezeAt = isoOrThrow(input.unfreezeAt, "Unfreeze date");
      return momenceCall("PUT", region, `/host/members/${m}/bought-memberships/${b}/membership-freeze`, {}, body);
    }
    case "unfreeze_membership": {
      const { region, raws: [m, b] } = sameRegion(input.memberId, input.boughtMembershipId);
      return momenceCall("DELETE", region, `/host/members/${m}/bought-memberships/${b}/membership-schedule-freeze`);
    }
    case "update_credits": {
      const { region, raws: [m, b] } = sameRegion(input.memberId, input.boughtMembershipId);
      const body: Record<string, number> = {};
      for (const k of ["eventCreditsLeft", "moneyCreditsLeft"] as const) {
        const v = input[k];
        if (v !== undefined) {
          if (typeof v !== "number" || !isFinite(v) || v < 0 || v > 10_000) throw new Error("Credits must be a number between 0 and 10000");
          body[k] = v;
        }
      }
      if (!Object.keys(body).length) throw new Error("No credit value given");
      return momenceCall("PUT", region, `/host/members/${m}/bought-memberships/${b}/credits`, {}, body);
    }
    case "check_in":
    case "remove_check_in": {
      const { region, raw } = splitId(input.bookingId);
      return momenceCall(input.action === "check_in" ? "POST" : "DELETE", region, `/host/session-bookings/${raw}/check-in`);
    }
    case "cancel_booking": {
      const { region, raw } = splitId(input.bookingId);
      return momenceCall("DELETE", region, `/host/session-bookings/${raw}`, {}, {
        refund: Boolean(input.refund),
        disableNotifications: Boolean(input.disableNotifications),
        isLateCancellation: Boolean(input.isLateCancellation),
      });
    }
    case "add_to_session": {
      const { region, raws: [s, m] } = sameRegion(input.sessionId, input.memberId);
      return input.waitlist
        ? momenceCall("POST", region, `/host/sessions/${s}/waitlist/bookings`, {}, { memberId: Number(m) })
        : momenceCall("POST", region, `/host/sessions/${s}/bookings/free`, {}, { memberId: Number(m), createRecurringBooking: false });
    }
    case "assign_tag":
    case "unassign_tag": {
      const { region, raws: [m, t] } = sameRegion(input.memberId, input.tagId);
      return momenceCall(input.action === "assign_tag" ? "POST" : "DELETE", region, `/host/members/${m}/tags/${t}`);
    }
    default:
      throw new Error("Unknown action");
  }
}

/** Record who did what in the IRIS audit log. Never throws. */
export async function auditMomenceAction(actor: { user_id: string; email: string }, input: ActionInput, ok: boolean, detail?: string) {
  const { action, ...params } = input as Record<string, unknown> & { action: string };
  const entity = String(params.bookingId ?? params.boughtMembershipId ?? params.sessionId ?? params.memberId ?? "");
  try {
    await asSystem((c) =>
      c.query(
        `insert into audit_log (actor_user_id, actor_name, action, entity_type, entity_id, after_state)
         values ($1, $2, $3, 'momence', $4, $5)`,
        [actor.user_id, actor.email, `momence.${action}${ok ? "" : ".failed"}`, entity, JSON.stringify({ ...params, ok, detail })],
      ),
    );
  } catch (e) {
    console.error("[momence audit]", (e as Error).message);
  }
}
