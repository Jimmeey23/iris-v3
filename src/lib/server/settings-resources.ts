import "server-only";

/**
 * Tables editable from the Settings screen. Only the listed columns can be
 * written; RLS decides who may write (admins, or managers for some tables).
 */
export type Resource = {
  table: string;
  pk: string;
  columns: Record<string, "text" | "int" | "num" | "bool" | "text[]" | "json">;
  create?: boolean;
  remove?: "hard" | "soft" | false;
  required?: string[];
  order: string;
  makeId?: (b: Record<string, unknown>) => string;
};

export const RESOURCES: Record<string, Resource> = {
  departments: {
    table: "departments", pk: "code", order: "name",
    columns: { code: "text", name: "text", description: "text", head_employee_id: "text", is_active: "bool" },
    create: true, remove: "hard", required: ["code", "name"],
    makeId: (b) => `dept_${String(b.code).toLowerCase()}`,
  },
  studios: {
    table: "studios", pk: "code", order: "name",
    columns: { code: "text", name: "text", city: "text", address: "text", momence_location_id: "int", is_active: "bool" },
    create: true, remove: "hard", required: ["code", "name", "city"],
    makeId: (b) => `studio_${String(b.code).toLowerCase()}`,
  },
  employees: {
    table: "employees", pk: "id", order: "name",
    columns: {
      name: "text", email: "text", phone: "text", role: "text", title: "text", department_code: "text",
      location: "text", reporting_manager: "text", birthday: "text", studio_codes: "text[]", skills: "text[]",
      availability: "text", max_workload: "int", escalation_order: "int", is_active: "bool",
    },
    create: true, remove: "soft", required: ["name", "email", "role", "department_code"],
  },
  sla_definitions: {
    table: "sla_definitions", pk: "priority", order: "priority",
    columns: {
      name: "text", description: "text", response_target_mins: "int", resolution_target_mins: "int",
      escalation_threshold_mins: "int", business_hours_only: "bool",
    },
    create: false, remove: false,
  },
  routing_rules: {
    table: "routing_rules", pk: "id", order: "sort_order, name",
    columns: { name: "text", condition: "text", department_code: "text", priority: "text", sort_order: "int", is_active: "bool" },
    create: true, remove: "hard", required: ["name", "condition"],
  },
  ai_models: {
    table: "ai_models", pk: "id", order: "is_primary desc, provider, model",
    columns: { provider: "text", model: "text", purpose: "text", temperature: "num", max_tokens: "int", is_primary: "bool", is_active: "bool" },
    create: true, remove: "hard", required: ["provider", "model", "purpose"],
  },
  notification_rules: {
    table: "notification_rules", pk: "event", order: "event",
    columns: { event: "text", in_app: "bool", email: "bool", whatsapp: "bool" },
    create: true, remove: "hard", required: ["event"],
  },
  roles: {
    table: "roles", pk: "name", order: "name",
    columns: { name: "text", access_tier: "text", permissions: "text[]", color: "text" },
    create: true, remove: "hard", required: ["name"],
  },
  integrations: {
    table: "integrations", pk: "id", order: "name",
    columns: { is_enabled: "bool", config: "json", sync_interval_mins: "int", status: "text" },
    create: false, remove: false,
  },
};

export function coerce(type: Resource["columns"][string], v: unknown) {
  if (v === null || v === undefined || v === "") return type === "text[]" ? [] : type === "bool" ? false : null;
  switch (type) {
    case "int": { const n = Number(v); if (!Number.isFinite(n)) throw bad(); return Math.round(n); }
    case "num": { const n = Number(v); if (!Number.isFinite(n)) throw bad(); return n; }
    case "bool": return v === true || v === "true";
    case "text[]":
      if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
      return String(v).split(",").map((s) => s.trim()).filter(Boolean);
    case "json": return JSON.stringify(v);
    default: return String(v).trim().slice(0, 5000);
  }
}

function bad() {
  return Object.assign(new Error("Invalid value"), { code: "22P02" });
}
