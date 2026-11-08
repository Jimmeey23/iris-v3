"use client";

// Bridges Neon data into the module-level arrays the views read
// (ALL_TICKETS, EMPLOYEES, DEPARTMENTS, STUDIOS and their lookup maps).
// Arrays/maps are mutated in place so existing imports stay valid.

import { ALL_TICKETS, type Ticket } from "./sample-tickets";
import {
  EMPLOYEES, DEPARTMENTS, STUDIOS, EMPLOYEE_MAP, DEPT_MAP, STUDIO_MAP, PRIORITY_CONFIG,
  type Employee, type Department, type Studio, type Priority,
} from "./types";
import { useAppStore } from "./store";
import { useSettingsStore } from "./settings-store";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  // Absolute URL: some browser extensions wrap fetch and call `new URL(input)`
  // without a base, which throws "Failed to construct 'URL'" on relative paths.
  const absolute = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
  const res = await fetch(absolute, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("iris:signed-out"));
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/** 22-char url-safe id for the ticket-creation idempotency key. */
function cryptoIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 22);
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

function replaceArray<T>(target: T[], items: T[]) {
  target.length = 0;
  target.push(...items);
}
function replaceMap<T>(target: Record<string, T>, entries: [string, T][]) {
  for (const k of Object.keys(target)) delete target[k];
  for (const [k, v] of entries) target[k] = v;
}

type Row = Record<string, any>;

export function hydrateReference(data: {
  employees: Row[];
  departments: Row[];
  studios: Row[];
  sla: Row[];
  roles?: Row[];
  publicSettings?: Record<string, unknown>;
  preferences?: Record<string, unknown> | null;
}) {
  const mapDept = (d: Row): Department => ({
    id: d.id,
    code: d.code,
    name: d.name,
    description: d.description ?? undefined,
    headId: d.head_employee_id ?? undefined,
  });
  const allDepartments = data.departments.map(mapDept);
  const activeDepartments = data.departments.filter((d) => d.is_active !== false).map(mapDept);
  replaceArray(DEPARTMENTS, activeDepartments);
  replaceMap(DEPT_MAP, allDepartments.map((d) => [d.code, d]));

  const mapStudio = (s: Row): Studio => ({
    id: s.id,
    code: s.code,
    name: s.name,
    city: s.city,
    address: s.address ?? undefined,
  });
  const allStudios = data.studios.map(mapStudio);
  const activeStudios = data.studios.filter((s) => s.is_active !== false).map(mapStudio);
  replaceArray(STUDIOS, activeStudios);
  replaceMap(STUDIO_MAP, allStudios.map((s) => [s.code, s]));

  const mapEmp = (e: Row): Employee => ({
    id: e.id,
    employeeCode: e.employee_code,
    name: e.name,
    email: e.email,
    phone: e.phone ?? undefined,
    role: e.role,
    title: e.title ?? undefined,
    departmentCode: e.department_code,
    departmentName: DEPT_MAP[e.department_code]?.name ?? e.department_code,
    location: e.location,
    reportingManager: e.reporting_manager ?? undefined,
    birthday: e.birthday ?? undefined,
    studioCodes: e.studio_codes ?? [],
    skills: e.skills ?? [],
    availability: e.availability,
    workload: e.workload,
    maxWorkload: e.max_workload,
    escalationOrder: e.escalation_order,
  });
  const allEmployees = data.employees.map(mapEmp);
  const activeEmployees = data.employees.filter((e) => e.is_active !== false).map(mapEmp);
  replaceArray(EMPLOYEES, activeEmployees);
  replaceMap(EMPLOYEE_MAP, allEmployees.map((e) => [e.id, e]));

  for (const s of data.sla) {
    const cfg = PRIORITY_CONFIG[s.priority as Priority];
    if (cfg) {
      cfg.responseMins = s.response_target_mins;
      cfg.resolutionMins = s.resolution_target_mins;
    }
  }

  const appState = useAppStore.getState();
  if (data.publicSettings && typeof data.publicSettings === "object") {
    appState.setWorkspaceSettings(data.publicSettings);
  }

  // Keep currentUser synced with live employee record & role permissions
  if (appState.currentUser?.userId) {
    const cur = appState.currentUser;
    const empRow = data.employees.find((e) => e.id === cur.id);
    const effectiveRoleName = empRow?.role ?? cur.role;
    const roleRow =
      data.roles?.find((r) => r.name === effectiveRoleName) ??
      data.roles?.find((r) => r.access_tier === cur.tier);
    const permissions = Array.isArray(roleRow?.permissions) ? (roleRow.permissions as string[]) : cur.permissions;
    appState.setCurrentUser({
      ...cur,
      name: empRow?.name ?? cur.name,
      email: empRow?.email ?? cur.email,
      role: empRow?.role ?? cur.role,
      departmentCode: empRow?.department_code ?? cur.departmentCode,
      studioCodes: empRow?.studio_codes ?? cur.studioCodes,
      permissions,
    });
  }

  if (data.preferences !== undefined) {
    useSettingsStore.getState().hydrateFromServer(data.preferences);
  }

  useAppStore.getState().bumpData();
}

function reviveTicket(t: any): Ticket {
  const d = (v?: string) => (v ? new Date(v) : undefined);
  return {
    ...t,
    slaResponseTarget: d(t.slaResponseTarget),
    slaResolutionTarget: d(t.slaResolutionTarget),
    firstResponseAt: d(t.firstResponseAt),
    resolvedAt: d(t.resolvedAt),
  };
}

export function hydrateTickets(tickets: any[]) {
  replaceArray(ALL_TICKETS, tickets.map(reviveTicket));
}

/** Insert or replace a ticket in ALL_TICKETS and tell the UI to re-read. */
export function upsertTicket(raw: any) {
  const t = reviveTicket(raw);
  const i = ALL_TICKETS.findIndex((x) => x.id === t.id);
  if (i >= 0) Object.assign(ALL_TICKETS[i], t);
  else ALL_TICKETS.unshift(t);
  useAppStore.getState().bumpData();
  return i >= 0 ? ALL_TICKETS[i] : t;
}

export async function loadAll() {
  const [ref, tk] = await Promise.all([api("/api/reference"), api<{ tickets: any[] }>("/api/tickets")]);
  hydrateReference(ref);
  hydrateTickets(tk.tickets);
}

export async function reloadReference() {
  hydrateReference(await api("/api/reference"));
}

export const ticketsApi = {
  create: async (body: Record<string, unknown>) => {
    // One-shot guard: every creation POST carries an Idempotency-Key. A double submit
    // or a flaky-network duplicate returns the first ticket instead of filing two.
    // A view that retries the *same* logical submission should pass its own stable key
    // via body.idempotencyKey so the replay is honoured.
    const keyed = {
      idempotencyKey:
        typeof body.idempotencyKey === "string" && body.idempotencyKey ? body.idempotencyKey : cryptoIdempotencyKey(),
      ...body,
    };
    const saved = (
      await api("/api/tickets", { method: "POST", json: keyed, headers: { "Idempotency-Key": keyed.idempotencyKey } })
    ).ticket;
    return upsertTicket(saved);
  },
  update: async (id: string, body: Record<string, unknown>) =>
    upsertTicket((await api(`/api/tickets/${encodeURIComponent(id)}`, { method: "PATCH", json: body })).ticket),
  /** Admin-only hard delete. */
  remove: async (id: string) => {
    await api(`/api/tickets/${encodeURIComponent(id)}`, { method: "DELETE" });
    const i = ALL_TICKETS.findIndex((x) => x.id === id);
    if (i >= 0) ALL_TICKETS.splice(i, 1);
    useAppStore.getState().bumpData();
  },
  comment: async (id: string, content: string, isInternal = true) => {
    const { comment } = await api(`/api/tickets/${encodeURIComponent(id)}/comments`, { method: "POST", json: { content, isInternal } });
    const t = ALL_TICKETS.find((x) => x.id === id);
    if (t) t.comments = [...t.comments, comment];
    return comment as Ticket["comments"][number];
  },
};

/** Create a ticket from the AI assistant's preview data. */
export async function createTicketFromDetail(d: import("./ticket-detail-builder").TicketDetailData) {
  const assignee = d.routing?.selectedAssignee?.id;
  return ticketsApi.create({
    title: d.title,
    description: d.description,
    category: d.category,
    subcategory: d.subcategory,
    priority: d.priority,
    studioCode: d.studioCode && STUDIO_MAP[d.studioCode] ? d.studioCode : undefined,
    departmentCode: d.routing?.departmentCode && DEPT_MAP[d.routing.departmentCode] ? d.routing.departmentCode : undefined,
    assigneeId: assignee && EMPLOYEE_MAP[assignee] ? assignee : undefined,
    affectedClient: d.affectedClient,
    clientMomenceId: d.clientMomenceId,
    membershipId: d.membershipId,
    bookingId: d.bookingId,
    severity: d.severity,
    businessImpact: d.businessImpact,
    operationalImpact: d.operationalImpact,
    recommendedResolution: d.resolution?.recommendedActions?.map((a) => `${a.step}. ${a.action}`).join("\n"),
    tags: d.tags,
    source: "ai_assistant",
    collectedInfo: { sentiment: d.sentiment, clientContact: d.clientContact, sessionTime: d.sessionTime, instructor: d.instructor },
  });
}
