// IRIS — Momence API v2 Integration Service
// Based on https://api.docs.momence.com/reference
// OAuth 2.0 flow + all host endpoints

export interface MomenceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  hostId: string;
  apiBaseUrl: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export interface MomenceMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tags?: string[];
  notes?: string[];
  createdAt?: string;
}

export interface MomenceMembership {
  id: string;
  name: string;
  status: "active" | "frozen" | "expired" | "cancelled";
  classCredits?: number;
  memberId: string;
  freezeScheduledAt?: string;
  unfreezeScheduledAt?: string;
}

export interface MomenceSession {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  instructor?: string;
  hostLocationId?: number;
  status: "scheduled" | "cancelled" | "completed";
}

export interface MomenceBooking {
  id: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  status: "confirmed" | "waitlisted" | "cancelled" | "checked_in";
  createdAt: string;
}

export interface MomenceTransaction {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: "succeeded" | "failed" | "pending" | "refunded";
  memberId?: string;
  createdAt: string;
  reference?: string;
}

export interface MomenceSale {
  id: string;
  memberId: string;
  memberName: string;
  itemName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface MomenceLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  stage: string;
  createdAt: string;
}

const MOMENCE_API_BASE = "https://api.momence.com/api/v2";

/**
 * Momence OAuth 2.0 Authorization
 * GET /authorize?client_id=...&redirect_uri=...&response_type=code&scope=...&state=...
 */
export function getAuthorizationUrl(config: MomenceConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "host",
    state,
  });
  return `${MOMENCE_API_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * POST /token
 */
export async function exchangeCodeForToken(
  config: MomenceConfig,
  code: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch(`${MOMENCE_API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Momence token exchange failed: ${res.status}`);
  return res.json();
}

/**
 * Refresh access token
 * POST /token
 */
export async function refreshToken(
  config: MomenceConfig
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  if (!config.refreshToken) throw new Error("No refresh token available");
  const res = await fetch(`${MOMENCE_API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Momence token refresh failed: ${res.status}`);
  return res.json();
}

// === HOST API — All endpoints require Authorization: Bearer {token} ===

async function momenceRequest(
  config: MomenceConfig,
  path: string,
  options: RequestInit = {}
): Promise<any> {
  if (!config.accessToken) throw new Error("No access token. Run OAuth flow first.");
  
  // Check token expiry
  if (config.tokenExpiry && Date.now() > config.tokenExpiry) {
    const refreshed = await refreshToken(config);
    config.accessToken = refreshed.access_token;
    config.tokenExpiry = Date.now() + (refreshed.expires_in || 3600) * 1000;
  }

  const url = path.startsWith("http") ? path : `${MOMENCE_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) throw new Error("Momence token expired or invalid");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Momence API error ${res.status}: ${text}`);
  }

  return res.json();
}

// === MEMBERS ===

export async function searchMembers(
  config: MomenceConfig,
  query: { name?: string; email?: string; phone?: string; limit?: number; offset?: number }
): Promise<{ members: MomenceMember[]; total: number }> {
  const params = new URLSearchParams();
  if (query.name) params.set("name", query.name);
  if (query.email) params.set("email", query.email);
  if (query.phone) params.set("phone", query.phone);
  params.set("limit", String(query.limit || 50));
  params.set("offset", String(query.offset || 0));
  
  const data = await momenceRequest(config, `/host/${config.hostId}/members?${params}`);
  return {
    members: (data.items || data.members || []).map((m: any) => ({
      id: String(m.id),
      name: m.name || "",
      email: m.email || "",
      phone: m.phone,
      tags: m.tags,
      notes: m.notes,
      createdAt: m.createdAt,
    })),
    total: data.total || data.count || 0,
  };
}

export async function getMember(config: MomenceConfig, memberId: string): Promise<MomenceMember> {
  const m = await momenceRequest(config, `/host/${config.hostId}/members/${memberId}`);
  return {
    id: String(m.id),
    name: m.name || "",
    email: m.email || "",
    phone: m.phone,
    tags: m.tags,
    notes: m.notes,
    createdAt: m.createdAt,
  };
}

export async function getMemberNotes(config: MomenceConfig, memberId: string): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/members/${memberId}/notes`);
}

export async function getMemberVisits(config: MomenceConfig, memberId: string): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/members/${memberId}/visits`);
}

export async function updateMemberName(config: MomenceConfig, memberId: string, name: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/${memberId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function updateMemberEmail(config: MomenceConfig, memberId: string, email: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/${memberId}/email`, {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

// === MEMBERSHIPS ===

export async function getMemberMemberships(config: MomenceConfig, memberId: string): Promise<MomenceMembership[]> {
  const data = await momenceRequest(config, `/host/${config.hostId}/members/${memberId}/bought-memberships`);
  return (data.items || data || []).map((m: any) => ({
    id: String(m.id),
    name: m.membership?.name || m.name || "",
    status: m.status || "active",
    classCredits: m.classCredits,
    memberId: String(memberId),
    freezeScheduledAt: m.freezeScheduledAt,
    unfreezeScheduledAt: m.unfreezeScheduledAt,
  }));
}

export async function getHostMemberships(config: MomenceConfig): Promise<any[]> {
  const data = await momenceRequest(config, `/host/${config.hostId}/memberships`);
  return data.items || data || [];
}

export async function freezeMembership(config: MomenceConfig, membershipId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/freeze`, {
    method: "POST",
  });
}

export async function unfreezeMembership(config: MomenceConfig, membershipId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/unfreeze`, {
    method: "POST",
  });
}

export async function scheduleMembershipFreeze(config: MomenceConfig, membershipId: string, date: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/schedule-freeze`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export async function scheduleMembershipUnfreeze(config: MomenceConfig, membershipId: string, date: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/schedule-unfreeze`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export async function removeMembershipFreeze(config: MomenceConfig, membershipId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/remove-freeze`, {
    method: "POST",
  });
}

export async function removeMembershipUnfreeze(config: MomenceConfig, membershipId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/remove-unfreeze`, {
    method: "POST",
  });
}

export async function updateClassCredits(config: MomenceConfig, membershipId: string, credits: number): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/bought-memberships/${membershipId}/class-credits`, {
    method: "PATCH",
    body: JSON.stringify({ classCredits: credits }),
  });
}

// === SESSIONS ===

export async function getSessions(
  config: MomenceConfig,
  query: { from?: string; to?: string; limit?: number; offset?: number }
): Promise<MomenceSession[]> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit || 50));
  params.set("offset", String(query.offset || 0));
  
  const data = await momenceRequest(config, `/host/${config.hostId}/sessions?${params}`);
  return (data.items || data || []).map((s: any) => ({
    id: String(s.id),
    name: s.name || s.session?.name || "",
    startTime: s.startTime || s.startsAt,
    endTime: s.endTime || s.endsAt,
    capacity: s.capacity || 0,
    bookedCount: s.bookedCount || s.bookings?.length || 0,
    waitlistCount: s.waitlistCount || 0,
    instructor: s.instructor?.name,
    hostLocationId: s.hostLocationId,
    status: s.status || "scheduled",
  }));
}

export async function getSession(config: MomenceConfig, sessionId: string): Promise<MomenceSession> {
  const s = await momenceRequest(config, `/host/${config.hostId}/sessions/${sessionId}`);
  return {
    id: String(s.id),
    name: s.name || "",
    startTime: s.startTime,
    endTime: s.endTime,
    capacity: s.capacity || 0,
    bookedCount: s.bookedCount || 0,
    waitlistCount: s.waitlistCount || 0,
    instructor: s.instructor?.name,
    hostLocationId: s.hostLocationId,
    status: s.status || "scheduled",
  };
}

export async function getSessionBookings(config: MomenceConfig, sessionId: string): Promise<MomenceBooking[]> {
  const data = await momenceRequest(config, `/host/${config.hostId}/sessions/${sessionId}/bookings`);
  return (data.items || data || []).map((b: any) => ({
    id: String(b.id),
    sessionId,
    memberId: String(b.memberId || b.member?.id),
    memberName: b.member?.name || "",
    status: b.status || "confirmed",
    createdAt: b.createdAt,
  }));
}

export async function getMemberBookings(config: MomenceConfig, memberId: string): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/members/${memberId}/session-bookings`);
}

export async function cancelSessionBooking(config: MomenceConfig, bookingId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/session-bookings/${bookingId}/cancel`, {
    method: "POST",
  });
}

export async function cancelRecurringBooking(config: MomenceConfig, recurringBookingId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/session-recurring-bookings/${recurringBookingId}/cancel`, {
    method: "POST",
  });
}

export async function addToSession(config: MomenceConfig, sessionId: string, memberId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/sessions/${sessionId}/add-for-free`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

export async function addToWaitlist(config: MomenceConfig, sessionId: string, memberId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/sessions/${sessionId}/add-to-waitlist`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

export async function checkInToSession(config: MomenceConfig, sessionId: string, memberId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/sessions/${sessionId}/check-in`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

export async function removeCheckIn(config: MomenceConfig, sessionId: string, bookingId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/sessions/${sessionId}/check-in/${bookingId}`, {
    method: "DELETE",
  });
}

// === APPOINTMENTS ===

export async function getAppointmentReservations(config: MomenceConfig): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/appointment-reservations`);
}

export async function getMemberAppointmentReservations(config: MomenceConfig, memberId: string): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/members/${memberId}/appointment-reservations`);
}

// === PAYMENTS & SALES ===

export async function getPaymentTransactions(
  config: MomenceConfig,
  query: { from?: string; to?: string; limit?: number; offset?: number }
): Promise<MomenceTransaction[]> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit || 50));
  params.set("offset", String(query.offset || 0));
  
  const data = await momenceRequest(config, `/host/${config.hostId}/payment-transactions?${params}`);
  return (data.items || data || []).map((t: any) => ({
    id: String(t.id),
    amount: t.amount || 0,
    currency: t.currency || "INR",
    method: t.method || "",
    status: t.status || "pending",
    memberId: t.memberId ? String(t.memberId) : undefined,
    createdAt: t.createdAt,
    reference: t.reference || t.id,
  }));
}

export async function getSales(
  config: MomenceConfig,
  query: { from?: string; to?: string; limit?: number; offset?: number }
): Promise<MomenceSale[]> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit || 50));
  params.set("offset", String(query.offset || 0));
  
  const data = await momenceRequest(config, `/host/${config.hostId}/sales?${params}`);
  return (data.items || data || []).map((s: any) => ({
    id: String(s.id),
    memberId: String(s.memberId || ""),
    memberName: s.member?.name || "",
    itemName: s.item?.name || s.itemName || "",
    amount: s.amount || 0,
    status: s.status || "",
    createdAt: s.createdAt,
  }));
}

export async function getCheckoutPrices(config: MomenceConfig, body: any): Promise<any> {
  return momenceRequest(config, `/host/${config.hostId}/checkout/prices`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCompatibleMemberships(config: MomenceConfig, body: any): Promise<any> {
  return momenceRequest(config, `/host/${config.hostId}/checkout/compatible-memberships`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function processCheckout(config: MomenceConfig, body: any): Promise<any> {
  return momenceRequest(config, `/host/${config.hostId}/checkout`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// === LEADS ===

export async function getLeads(config: MomenceConfig): Promise<MomenceLead[]> {
  const data = await momenceRequest(config, `/host/${config.hostId}/customer-leads`);
  return (data.items || data || []).map((l: any) => ({
    id: String(l.id),
    name: l.name || "",
    email: l.email || "",
    phone: l.phone,
    source: l.source || "",
    stage: l.stage || "",
    createdAt: l.createdAt,
  }));
}

export async function getLeadSources(config: MomenceConfig): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/customer-lead-sources`);
}

export async function getLeadStages(config: MomenceConfig): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/customer-lead-stages`);
}

// === TAGS ===

export async function getTags(config: MomenceConfig): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/tags`);
}

export async function assignMemberTag(config: MomenceConfig, memberId: string, tagId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/${memberId}/tags/assign`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

export async function unassignMemberTag(config: MomenceConfig, memberId: string, tagId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/${memberId}/tags/unassign`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

// === SEMESTERS ===

export async function getSemesters(config: MomenceConfig): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/semesters`);
}

// === REPORT RUNS ===

export async function createReportRun(config: MomenceConfig, body: any): Promise<any> {
  return momenceRequest(config, `/host/${config.hostId}/report-runs`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getReportRun(config: MomenceConfig, reportRunId: string): Promise<any> {
  return momenceRequest(config, `/host/${config.hostId}/report-runs/${reportRunId}`);
}

// === HOST INFO ===

export async function getHostLocations(config: MomenceConfig): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/locations`);
}

// === SIGNABLE DOCUMENTS ===

export async function getSignableDocuments(config: MomenceConfig, memberId: string): Promise<any[]> {
  return momenceRequest(config, `/host/${config.hostId}/members/${memberId}/signable-documents`);
}

export async function signDocument(config: MomenceConfig, memberId: string, documentId: string): Promise<void> {
  await momenceRequest(config, `/host/${config.hostId}/members/${memberId}/signable-documents/${documentId}/sign`, {
    method: "POST",
  });
}

// === WEBHOOKS ===

export interface MomenceWebhook {
  event: string;
  data: any;
  timestamp: string;
}

export const MOMENCE_WEBHOOK_EVENTS = [
  "member.created",
  "member.updated",
  "membership.created",
  "membership.frozen",
  "membership.unfrozen",
  "session.created",
  "session.updated",
  "session.cancelled",
  "booking.created",
  "booking.cancelled",
  "booking.checked_in",
  "payment.succeeded",
  "payment.failed",
  "payment.refunded",
] as const;

// === PERMISSION LEVELS ===

export type MomencePermission = "read" | "write_sensitive" | "write_financial" | "admin";

export const MOMENCE_PERMISSIONS: Record<MomencePermission, {
  label: string;
  description: string;
  endpoints: string[];
}> = {
  read: {
    label: "Read-Only",
    description: "Search members, retrieve profiles, sessions, bookings, payments, sales, leads",
    endpoints: ["GET /members", "GET /members/:id", "GET /sessions", "GET /sessions/:id/bookings", "GET /payment-transactions", "GET /sales", "GET /customer-leads"],
  },
  write_sensitive: {
    label: "Sensitive Operations",
    description: "Freeze/unfreeze memberships, update credits, cancel bookings, check-in members",
    endpoints: ["POST /memberships/:id/freeze", "POST /memberships/:id/unfreeze", "PATCH /memberships/:id/class-credits", "POST /session-bookings/:id/cancel", "POST /sessions/:id/check-in"],
  },
  write_financial: {
    label: "Financial Operations",
    description: "Process checkouts, refunds, payment adjustments",
    endpoints: ["POST /checkout", "POST /checkout/prices", "POST /checkout/compatible-memberships"],
  },
  admin: {
    label: "Admin",
    description: "All operations including member creation, updates, tag management",
    endpoints: ["POST /members", "PATCH /members/:id/name", "PATCH /members/:id/email", "POST /members/:id/tags/assign", "DELETE /members/:id/tags/:tagId"],
  },
};
