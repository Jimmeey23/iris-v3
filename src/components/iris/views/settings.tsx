"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  MapPin,
  Clock,
  Shield,
  Brain,
  Bell,
  Plug,
  Database,
  GitBranch,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Palette,
  Sliders,
  Send,
  Play,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api, reloadReference } from "@/lib/iris/live-data";
import { PRIORITY_CONFIG, DEPARTMENTS, STUDIOS, type Priority } from "@/lib/iris/types";
import { CATEGORY_MAP } from "@/lib/iris/iris-constants";
import { MultiSelect } from "@/components/iris/multi-select";
import { useAppStore, type ViewName } from "@/lib/iris/store";
import { ACCENT_PALETTE, useSettingsStore, type AccentPreference } from "@/lib/iris/settings-store";

// ─────────────────────────────────────────────────────────────────────────────
// Data + saving
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, any>;
type Bundle = {
  departments: Row[];
  studios: Row[];
  employees: Row[];
  sla_definitions: Row[];
  routing_rules: Row[];
  ai_models: Row[];
  notification_rules: Row[];
  roles: Row[];
  integrations: Row[];
  app_settings: Row[];
  audit_log: Row[];
  users: Row[];
  preferences?: Row | null;
  me: { tier: "admin" | "manager" | "executive"; userId: string; employeeId?: string | null; email?: string };
};
type Resource = Exclude<keyof Bundle, "app_settings" | "audit_log" | "preferences" | "me">;

const PK: Record<Resource, string> = {
  departments: "code",
  studios: "code",
  employees: "id",
  sla_definitions: "priority",
  routing_rules: "id",
  ai_models: "id",
  notification_rules: "event",
  roles: "name",
  integrations: "id",
  users: "id",
};
/** Tables the rest of the app reads as live lookup data. */
const REFERENCE: Resource[] = ["departments", "studios", "employees", "sla_definitions", "roles"];

type SaveState = "idle" | "saving" | "saved" | "error";

type Ctx = {
  data: Bundle;
  setData: React.Dispatch<React.SetStateAction<Bundle | null>>;
  canEdit: boolean;
  isAdmin: boolean;
  myDepartmentCode: string | null;
  patch: (r: Resource, key: string, changes: Row) => Promise<boolean>;
  create: (r: Resource, row: Row) => Promise<boolean>;
  remove: (r: Resource, key: string, label: string) => Promise<void>;
  setting: (key: string) => any;
  saveSetting: (key: string, value: unknown) => Promise<void>;
  reload: () => Promise<void>;
};
const SettingsCtx = React.createContext<Ctx | null>(null);
const useS = () => React.useContext(SettingsCtx)!;

function useSettingsData() {
  const [data, setData] = React.useState<Bundle | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const pending = React.useRef(0);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_IRIS_PREVIEW_MODE === "true") {
        setData({
          departments: DEPARTMENTS.map((d) => ({ ...d, is_active: true })),
          studios: STUDIOS.map((studio) => ({ ...studio, is_active: true })),
          employees: [],
          sla_definitions: [],
          routing_rules: [],
          ai_models: [],
          notification_rules: [],
          roles: [],
          integrations: [],
          app_settings: [],
          audit_log: [],
          users: [],
          preferences: null,
          me: { tier: "admin", userId: "preview" },
        });
      } else {
        const bundle = await api<Bundle>("/api/settings");
        setData(bundle);
        if (bundle.preferences !== undefined) {
          useSettingsStore.getState().hydrateFromServer(bundle.preferences);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load settings");
    }
  }, []);
  React.useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const track = async <T,>(fn: () => Promise<T>): Promise<T> => {
    pending.current++;
    setSaveState("saving");
    try {
      const out = await fn();
      if (--pending.current === 0) setSaveState("saved");
      return out;
    } catch (e) {
      pending.current--;
      setSaveState("error");
      throw e;
    }
  };

  const afterWrite = (r: Resource) => {
    if (REFERENCE.includes(r)) reloadReference().catch(() => {});
  };

  const patch: Ctx["patch"] = async (r, key, changes) => {
    const before = data;
    setData((d) => d && { ...d, [r]: (d[r] as Row[]).map((x) => (x[PK[r]] === key ? { ...x, ...changes } : x)) });
    try {
      const { row } = await track(() => api(`/api/settings/${r}`, { method: "PATCH", json: { key, changes } }));
      setData((d) => {
        if (!d) return d;
        let list = (d[r] as Row[]).map((x) => (x[PK[r]] === key ? { ...x, ...row } : x));
        if (r === "ai_models" && changes.is_primary === true) {
          list = list.map((x) => (x.id === key ? x : { ...x, is_primary: false }));
        }
        return { ...d, [r]: list };
      });
      afterWrite(r);
      return true;
    } catch (e) {
      setData(before);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
      return false;
    }
  };

  const create: Ctx["create"] = async (r, row) => {
    try {
      const res = await track(() => api(`/api/settings/${r}`, { method: "POST", json: row }));
      if (r === "users") await load();
      else setData((d) => d && { ...d, [r]: [...(d[r] as Row[]), res.row] });
      afterWrite(r);
      toast.success("Added");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add");
      return false;
    }
  };

  const remove: Ctx["remove"] = async (r, key, label) => {
    if (!window.confirm(`Remove ${label}? This can't be undone.`)) return;
    try {
      await track(() => api(`/api/settings/${r}?key=${encodeURIComponent(key)}`, { method: "DELETE" }));
      setData(
        (d) =>
          d && {
            ...d,
            [r]:
              r === "employees"
                ? (d[r] as Row[]).map((x) => (x.id === key ? { ...x, is_active: false } : x))
                : (d[r] as Row[]).filter((x) => x[PK[r]] !== key),
          },
      );
      afterWrite(r);
      toast.success(`${label} removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove");
    }
  };

  const setting = (key: string) => data?.app_settings.find((s) => s.key === key)?.value;

  const saveSetting: Ctx["saveSetting"] = async (key, value) => {
    const before = data;
    setData((d) => {
      if (!d) return d;
      const exists = d.app_settings.some((s) => s.key === key);
      return {
        ...d,
        app_settings: exists
          ? d.app_settings.map((s) => (s.key === key ? { ...s, value } : s))
          : [...d.app_settings, { key, value }],
      };
    });
    // Propagate workspace setting into client app store immediately for zero-latency UI reactivity
    useAppStore.getState().setWorkspaceSettings({ [key]: value });
    try {
      await track(() => api("/api/settings", { method: "PUT", json: { key, value } }));
      if (key === "audit.retention_days") {
        void load();
      } else {
        reloadReference().catch(() => {});
      }
    } catch (e) {
      setData(before);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  };

  return { data, setData, error, saveState, load, patch, create, remove, setting, saveSetting };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small auto-saving inputs
// ─────────────────────────────────────────────────────────────────────────────

function AutoInput({
  value,
  onSave,
  type = "text",
  className,
  placeholder,
  disabled,
  min,
  step,
  suggestions,
}: {
  suggestions?: string[];
  value: string | number | null | undefined;
  onSave: (v: string) => unknown;
  type?: "text" | "number" | "email";
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  step?: number;
}) {
  const initial = value === null || value === undefined ? "" : String(value);
  const [draft, setDraft] = React.useState<string | null>(null);
  const v = draft ?? initial;
  const listId = React.useId();
  const commit = () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    setDraft(null);
    if (trimmed === initial.trim()) return;
    if (type === "number" && trimmed !== "" && !Number.isFinite(Number(trimmed))) {
      return;
    }
    onSave(trimmed);
  };
  return (
    <>
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      )}
      <Input
        list={suggestions ? listId : undefined}
        type={type}
        value={v}
        min={min}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        className={cn("h-7 text-[12px]", className)}
      />
    </>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-7 px-2 text-[12px] rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <div className="text-[10px] font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function SettingsCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="iris-card overflow-hidden mb-5 rounded-2xl border border-border/70 shadow-sm">
      <div className="px-5 sm:px-6 py-5 border-b border-border/70 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="text-[15px] font-semibold tracking-tight">{title}</div>
          {description && <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{description}</div>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function IconButton({
  onClick,
  label,
  danger,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("h-7 w-7 shrink-0", danger && "text-rose-500 hover:text-rose-600")}
    >
      {children}
    </Button>
  );
}

function AddForm({
  open,
  onCancel,
  onSubmit,
  children,
}: {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<boolean>;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = React.useState(false);
  if (!open) return null;
  return (
    <form
      className="mb-3 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSubmit();
        setBusy(false);
        if (ok) onCancel();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{children}</div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-7 text-[11px]" disabled={busy}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
        </Button>
      </div>
    </form>
  );
}

function AddButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <Button size="sm" className="h-7 text-[11px]" onClick={onClick} disabled={disabled}>
      <Plus className="w-3 h-3 mr-1" />
      {label}
    </Button>
  );
}

const deptOptions = (d: Bundle) => d.departments.map((x) => ({ value: x.code, label: `${x.name} (${x.code})` }));
const studioOptions = (d: Bundle) => d.studios.map((x) => ({ value: x.code, label: `${x.name} (${x.code})` }));
const CITIES = ["Mumbai", "Bengaluru"];
const AVAILABILITY = ["available", "busy", "offline", "on_leave"];
const KNOWN_EVENTS = [
  "Ticket created",
  "Ticket assigned",
  "Ticket in progress",
  "Awaiting response",
  "Ticket escalated",
  "SLA approaching",
  "SLA breached",
  "Ticket resolved",
  "Ticket reopened",
  "Ticket closed",
  "New comment",
  "Owner added",
  "Department added",
];
const KNOWN_PERMISSIONS = [
  "all",
  "tickets.all",
  "tickets.department",
  "tickets.create",
  "tickets.view",
  "tickets.view.own",
  "reports.all",
  "reports.department",
  "settings.limited",
  "settings.system",
  "memberships.read",
  "memberships.write",
  "users.manage",
];
const AI_MODELS: Record<string, string[]> = {
  Anthropic: ["claude-opus-5-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  OpenAI: ["gpt-4o", "gpt-4o-mini"],
};
const AI_PURPOSES = [
  "Primary Conversational",
  "Classification & Extraction",
  "Investigation & Reasoning",
  "Summarization",
  "Fallback (auto)",
];
const withCurrent = (opts: string[], cur?: string | null) => {
  const list = cur && !opts.includes(cur) ? [cur, ...opts] : opts;
  return list.map((v) => ({ value: v, label: v }));
};

// ── Routing condition builder ────────────────────────────────────────────────
type Clause = { join: "AND" | "OR"; field: string; op: string; value: string };
const COND_FIELDS: Record<string, { label: string; values: (d: Bundle) => string[] }> = {
  category: { label: "Category", values: () => Object.keys(CATEGORY_MAP) },
  subcategory: { label: "Subcategory", values: () => Object.values(CATEGORY_MAP).flat() },
  source: { label: "Source", values: () => ["manual", "ai_assistant", "email", "webhook", "form_intake", "voice"] },
  studio: { label: "Studio", values: (d) => d.studios.map((x) => x.code) },
  "studio.city": { label: "Studio city", values: () => CITIES },
  department: { label: "Department", values: (d) => d.departments.map((x) => x.code) },
  priority: { label: "Ticket priority", values: () => ["P0", "P1", "P2", "P3"] },
  tags: { label: "Tag", values: () => ["vip", "urgent", "recurring", "equipment", "billing", "hvac"] },
};

const parseCondition = (c: string): Clause[] => {
  const tokens = c.split(/\s+(AND|OR)\s+(?=[a-zA-Z0-9_.]+\s*(?:~=|!=|>=|<=|=))/i);
  const out: Clause[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const join = i === 0 ? "AND" : (tokens[i - 1]?.toUpperCase() === "OR" ? "OR" : "AND");
    const part = (tokens[i] ?? "").trim();
    if (!part) continue;
    const m = part.match(/^([\w.]+)\s*(~=|!=|>=|<=|=)\s*(.*)$/);
    out.push(m ? { join, field: m[1], op: m[2], value: m[3] } : { join, field: "category", op: "=", value: "" });
  }
  return out;
};

const serializeCondition = (cl: Clause[]) =>
  cl
    .filter((c) => c.value)
    .map((c, idx) => `${idx > 0 ? `${c.join} ` : ""}${c.field}${c.op}${c.value}`)
    .join(" ");

function ConditionBuilder({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { data } = useS();
  const clauses = value.trim() ? parseCondition(value) : [];
  const commit = (next: Clause[]) => onChange(serializeCondition(next));
  const fieldOpts = (cur: string) =>
    withCurrent(Object.keys(COND_FIELDS), cur).map((o) => ({
      value: o.value,
      label: COND_FIELDS[o.value]?.label ?? o.value,
    }));

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
      {clauses.map((c, i) => {
        const vals = COND_FIELDS[c.field]?.values(data) ?? [];
        const opOptions =
          c.field === "priority"
            ? ["=", "!=", ">=", "<="]
            : c.field === "tags"
              ? ["=", "!=", "~="]
              : ["=", "!=", "~="];
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 ? (
              <NativeSelect
                className="w-16 px-1 text-[10px] font-semibold"
                value={c.join}
                disabled={disabled}
                options={[
                  { value: "AND", label: "AND" },
                  { value: "OR", label: "OR" },
                ]}
                onChange={(jn) =>
                  commit(clauses.map((x, j) => (j === i ? { ...x, join: jn as "AND" | "OR" } : x)))
                }
              />
            ) : (
              clauses.length > 1 && <span className="w-16 text-[10px] text-muted-foreground pl-1">WHERE</span>
            )}
            <NativeSelect
              value={c.field}
              disabled={disabled}
              options={fieldOpts(c.field)}
              onChange={(f) =>
                commit(
                  clauses.map((x, j) =>
                    j === i ? { ...x, field: f, op: "=", value: COND_FIELDS[f]?.values(data)[0] ?? "" } : x,
                  ),
                )
              }
            />
            <NativeSelect
              value={c.op}
              disabled={disabled}
              options={withCurrent(opOptions, c.op)}
              onChange={(op) => commit(clauses.map((x, j) => (j === i ? { ...x, op } : x)))}
            />
            {vals.length > 0 ? (
              <NativeSelect
                className="flex-1 min-w-[120px]"
                value={c.value}
                disabled={disabled}
                options={withCurrent(vals, c.value || null)}
                onChange={(v) => commit(clauses.map((x, j) => (j === i ? { ...x, value: v } : x)))}
              />
            ) : (
              <AutoInput
                className="flex-1 min-w-[120px]"
                value={c.value}
                disabled={disabled}
                onSave={(v) => commit(clauses.map((x, j) => (j === i ? { ...x, value: v } : x)))}
              />
            )}
            <button
              type="button"
              aria-label="Remove condition"
              disabled={disabled}
              className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-40"
              onClick={() => commit(clauses.filter((_, j) => j !== i))}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        className="self-start text-[11px] text-primary hover:underline disabled:opacity-40"
        onClick={() =>
          onChange(`${value.trim() ? `${value.trim()} AND ` : ""}category=${Object.keys(CATEGORY_MAP)[0]}`)
        }
      >
        + {clauses.length ? "Add condition" : "Add first condition"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_SECTIONS = [
  { id: "preferences", label: "My Preferences", icon: Palette },
  { id: "organization", label: "Organization & Limits", icon: Sliders },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "employees", label: "Employees", icon: Users },
  { id: "studios", label: "Studios", icon: MapPin },
  { id: "sla", label: "SLA Configuration", icon: Clock },
  { id: "routing", label: "Routing Rules", icon: GitBranch },
  { id: "ai", label: "AI Models", icon: Brain },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "permissions", label: "Users & Roles", icon: Shield },
  { id: "audit", label: "Audit Logs", icon: Database },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

const SECTION_DESCRIPTIONS: Record<SectionId, string> = {
  preferences: "Personalize your theme, accent palette, density, notifications, and account password.",
  organization: "Workspace branding, timezone, operational rate limits, and reliability queues.",
  departments: "Organize the teams responsible for resolutions.",
  employees: "Manage your people, assignments, escalations, and availability.",
  studios: "Keep your Mumbai and Bengaluru studio locations and Momence IDs in sync.",
  sla: "Set response, resolution, and business-hours targets per priority.",
  routing: "Direct incoming tickets to the right department and specialist automatically.",
  ai: "Configure Claude/OpenAI models, triage thresholds, and token/spend guardrails.",
  notifications: "Control workspace channels, sender identity, and event-level delivery rules.",
  integrations: "Enable, configure, and test live external service connections.",
  permissions: "Control user sign-in accounts and role-based permissions.",
  audit: "Inspect, export, and manage retention of immutable workspace audit logs.",
};

export function SettingsView() {
  const [activeSection, setActiveSection] = React.useState<SectionId>("preferences");
  const s = useSettingsData();
  const [search, setSearch] = React.useState("");
  const currentUser = useAppStore((st) => st.currentUser);

  if (s.error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="iris-card p-6 text-center space-y-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
          <div className="text-[13px]">{s.error}</div>
          <Button size="sm" onClick={s.load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }
  if (!s.data) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  const tier = s.data.me.tier;
  const myEmp = s.data.employees.find((e) => e.id === (s.data?.me.employeeId ?? currentUser?.id));
  const ctx: Ctx = {
    data: s.data,
    setData: s.setData,
    canEdit: tier === "admin" || tier === "manager",
    isAdmin: tier === "admin",
    myDepartmentCode: myEmp?.department_code ?? currentUser?.departmentCode ?? null,
    patch: s.patch,
    create: s.create,
    remove: s.remove,
    setting: s.setting,
    saveSetting: s.saveSetting,
    reload: s.load,
  };

  return (
    <SettingsCtx.Provider value={ctx}>
      <div className="settings-workspace max-w-[1500px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-wrap items-end gap-4 mb-8">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-primary mb-3">
              <SettingsIcon className="w-3.5 h-3.5" /> Workspace / Configuration
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Real-time personal preferences and workspace configuration.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {ctx.isAdmin ? "Admin access" : `${tier} access`}
            <span className="text-border">|</span>
            <span>Real-time sync on</span>
          </div>
          <SaveIndicator state={s.saveState} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-6 xl:gap-8">
          <aside className="iris-card rounded-2xl overflow-hidden h-fit lg:sticky lg:top-4 border border-border/70">
            <div className="p-4 border-b border-border/70">
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground mb-3">
                Explore settings
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a section..."
                  aria-label="Find a settings section"
                  className="h-9 pl-9 text-xs bg-muted/30"
                />
              </div>
            </div>
            <nav aria-label="Settings sections" className="p-2.5">
              {[
                { label: "Personal", ids: ["preferences"] },
                { label: "Workspace", ids: ["organization", "departments", "employees", "studios"] },
                { label: "Operations", ids: ["sla", "routing", "ai", "notifications"] },
                { label: "Administration", ids: ["integrations", "permissions", "audit"] },
              ].map((group) => {
                const sections = SETTINGS_SECTIONS.filter(
                  (sec) =>
                    group.ids.includes(sec.id) && sec.label.toLowerCase().includes(search.toLowerCase().trim()),
                );
                if (!sections.length) return null;
                return (
                  <div key={group.label} className="mb-2">
                    <div className="px-3 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground/70">
                      {group.label}
                    </div>
                    {sections.map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => setActiveSection(sec.id)}
                        aria-current={activeSection === sec.id ? "page" : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-colors text-left",
                          activeSection === sec.id
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <sec.icon className="w-4 h-4 shrink-0" />
                        {sec.label}
                        <ChevronRight
                          className={cn("w-3.5 h-3.5 ml-auto", activeSection === sec.id ? "opacity-100" : "opacity-0")}
                        />
                      </button>
                    ))}
                  </div>
                );
              })}
              {!SETTINGS_SECTIONS.some((sec) => sec.label.toLowerCase().includes(search.toLowerCase().trim())) && (
                <p className="px-3 py-4 text-xs text-muted-foreground">No sections found.</p>
              )}
            </nav>
            <div className="m-3 mt-1 rounded-xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Changes apply immediately.</span>
              <br />
              Every field persists to Neon and updates open views live.
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex items-start gap-4">
              {(() => {
                const section = SETTINGS_SECTIONS.find((item) => item.id === activeSection)!;
                const Icon = section.icon;
                return (
                  <>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground mb-1">
                        {activeSection === "preferences" ? "Personal settings" : "Workspace settings"}
                      </div>
                      <h2 className="text-xl font-semibold tracking-tight">{section.label}</h2>
                      <p className="text-xs text-muted-foreground mt-1">{SECTION_DESCRIPTIONS[activeSection]}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            {activeSection === "preferences" && <PreferencesSettings />}
            {activeSection === "organization" && <OrganizationSettings />}
            {activeSection === "departments" && <DepartmentsSettings />}
            {activeSection === "employees" && <EmployeesSettings />}
            {activeSection === "studios" && <StudiosSettings />}
            {activeSection === "sla" && <SLASettings />}
            {activeSection === "routing" && <RoutingSettings />}
            {activeSection === "ai" && <AIModelSettings />}
            {activeSection === "notifications" && <NotificationsSettings />}
            {activeSection === "integrations" && <IntegrationsSettings />}
            {activeSection === "permissions" && <PermissionsSettings />}
            {activeSection === "audit" && <AuditLogsSettings />}
          </div>
        </div>
      </div>
    </SettingsCtx.Provider>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md",
        state === "saving" && "text-muted-foreground",
        state === "saved" && "text-emerald-600 dark:text-emerald-400",
        state === "error" && "text-rose-600 dark:text-rose-400",
      )}
    >
      {state === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <CheckCircle2 className="w-3 h-3" />
          All changes saved
        </>
      )}
      {state === "error" && (
        <>
          <AlertTriangle className="w-3 h-3" />
          Last change not saved
        </>
      )}
    </div>
  );
}

function ReadOnlyNote({ show, text = "Only admins can change this section." }: { show: boolean; text?: string }) {
  if (!show) return null;
  return (
    <div className="mb-3 p-2.5 rounded-md bg-muted/40 border border-border flex items-center gap-2 text-[11px] text-muted-foreground">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: My Preferences (Real-time Theme, Accent, Density, Channels, Password)
// ─────────────────────────────────────────────────────────────────────────────

const LANDING_VIEWS: Array<{ value: ViewName; label: string }> = [
  { value: "overview", label: "Overview Dashboard" },
  { value: "ai_assistant", label: "AI Assistant / Intake" },
  { value: "my_tickets", label: "My Tickets" },
  { value: "all_tickets", label: "All Tickets" },
  { value: "department_queue", label: "Department Queue" },
  { value: "escalations", label: "Escalations" },
  { value: "templates", label: "Ticket Templates" },
  { value: "momence", label: "Momence Directory" },
  { value: "analytics", label: "Analytics" },
];

function PreferencesSettings() {
  const { data } = useS();
  const prefs = useSettingsStore();
  const { setTheme } = useTheme();
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPw, setChangingPw] = React.useState(false);

  const applyPref = async (patch: Parameters<typeof prefs.saveToServer>[0], msg?: string) => {
    try {
      if (patch.theme) setTheme(patch.theme);
      await prefs.saveToServer(patch);
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save preference");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) return toast.error("New password must be at least 10 characters");
    if (newPassword !== confirmPassword) return toast.error("New passwords do not match");
    setChangingPw(true);
    try {
      await api("/api/auth/change-password", { method: "POST", json: { oldPassword, newPassword } });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <>
      <SettingsCard
        title="Appearance & Workspace Feel"
        description="Updates your interface immediately and syncs across devices via your account profile."
      >
        <div className="space-y-5">
          {/* Theme mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Color Mode">
              <NativeSelect
                className="w-full h-8"
                value={prefs.theme}
                onChange={(v) => void applyPref({ theme: v as "dark" | "light" | "system" }, `Theme set to ${v}`)}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "system", label: "Match System" },
                ]}
              />
            </Field>
            <Field label="Default Landing View">
              <div className="flex gap-1.5">
                <NativeSelect
                  className="flex-1 h-8"
                  value={prefs.defaultLandingView}
                  onChange={(v) => void applyPref({ defaultLandingView: v as ViewName }, "Default view saved")}
                  options={LANDING_VIEWS}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={() => setCurrentView(prefs.defaultLandingView)}
                >
                  Open
                </Button>
              </div>
            </Field>
            <Field label="Preferred Studio">
              <NativeSelect
                className="w-full h-8"
                value={prefs.preferredStudioCode}
                onChange={(v) =>
                  void applyPref({ preferredStudioCode: v, momenceDefaultStudio: v }, "Preferred studio saved")
                }
                options={[
                  { value: "", label: "All Studios (No default)" },
                  ...data.studios.filter((s) => s.is_active !== false).map((s) => ({
                    value: s.code,
                    label: `${s.name} (${s.code})`,
                  })),
                ]}
              />
            </Field>
          </div>

          {/* 14-color Accent Palette */}
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-2">
              Brand Accent Color ({prefs.accentColor === "random" ? "Fresh color on every page load" : `Pinned: ${prefs.accentColor}`})
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void applyPref({ accentColor: "random" }, "Dynamic accent rotation enabled")}
                className={cn(
                  "h-8 px-3 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all",
                  prefs.accentColor === "random"
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/40 text-muted-foreground",
                )}
              >
                <Sparkles className="w-3 h-3" />
                Auto-Rotate
              </button>
              {ACCENT_PALETTE.map((swatch) => {
                const selected = prefs.accentColor === swatch.id;
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    title={swatch.label}
                    onClick={() =>
                      void applyPref({ accentColor: swatch.id as AccentPreference }, `Accent pinned to ${swatch.label}`)
                    }
                    className={cn(
                      "h-8 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all",
                      selected
                        ? "border-foreground bg-muted/60 text-foreground ring-1 ring-foreground/20"
                        : "border-border/70 hover:bg-muted/30 text-muted-foreground",
                    )}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch.hex }} />
                    <span>{swatch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density & Motion Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 cursor-pointer">
              <div>
                <div className="text-[12px] font-semibold">Compact Density</div>
                <div className="text-[11px] text-muted-foreground">Tighter card radii and vertical spacing</div>
              </div>
              <Switch
                checked={prefs.compactMode}
                onCheckedChange={(v) => void applyPref({ compactMode: v })}
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 cursor-pointer">
              <div>
                <div className="text-[12px] font-semibold">Interface Motion &amp; Transitions</div>
                <div className="text-[11px] text-muted-foreground">Smooth animations across drawers and cards</div>
              </div>
              <Switch
                checked={prefs.animationsEnabled}
                onCheckedChange={(v) => void applyPref({ animationsEnabled: v })}
              />
            </label>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="My Notification Channels"
        description="Controls how IRIS delivers updates addressed to you personally."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 cursor-pointer">
            <span className="text-[12px] font-medium">In-App Alerts</span>
            <Switch
              checked={prefs.notificationChannels.inApp}
              onCheckedChange={(v) =>
                void applyPref({ notificationChannels: { ...prefs.notificationChannels, inApp: v } })
              }
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 cursor-pointer">
            <span className="text-[12px] font-medium">Email Notifications</span>
            <Switch
              checked={prefs.notificationChannels.email}
              onCheckedChange={(v) =>
                void applyPref({ notificationChannels: { ...prefs.notificationChannels, email: v } })
              }
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 cursor-pointer">
            <span className="text-[12px] font-medium">WhatsApp Alerts</span>
            <Switch
              checked={prefs.notificationChannels.whatsapp}
              onCheckedChange={(v) =>
                void applyPref({ notificationChannels: { ...prefs.notificationChannels, whatsapp: v } })
              }
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 cursor-pointer">
            <span className="text-[12px] font-medium">Sound Chimes</span>
            <Switch
              checked={prefs.soundAlerts}
              onCheckedChange={(v) => void applyPref({ soundAlerts: v })}
            />
          </label>
        </div>
        <div className="max-w-xs">
          <Field label="Intelligence Digest Subscription">
            <NativeSelect
              className="w-full h-8"
              value={prefs.digestFrequency}
              onChange={(v) =>
                void applyPref({ digestFrequency: v as "none" | "daily" | "weekly" }, "Digest preference updated")
              }
              options={[
                { value: "daily", label: "Daily Morning Digest (08:00 IST)" },
                { value: "weekly", label: "Weekly Monday Summary Only" },
                { value: "none", label: "Unsubscribed from Digests" },
              ]}
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Account Security" description="Update your IRIS sign-in password (minimum 10 characters).">
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <Field label="Current password">
            <Input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="h-8 text-[12px]"
            />
          </Field>
          <Field label="New password (10+ chars)">
            <Input
              type="password"
              required
              minLength={10}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-8 text-[12px]"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-8 text-[12px]"
            />
          </Field>
          <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={changingPw}>
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            {changingPw ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </SettingsCard>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Organization & Operational Guardrails
// ─────────────────────────────────────────────────────────────────────────────

function OrganizationSettings() {
  const { isAdmin, setting, saveSetting } = useS();
  return (
    <>
      <SettingsCard
        title="Organization Identity"
        description="Displayed in navigation headers, outgoing email footers, and executive reports."
      >
        <ReadOnlyNote show={!isAdmin} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Workspace / Organization Name">
            <AutoInput
              value={setting("org.name") ?? "Physique 57 India"}
              disabled={!isAdmin}
              onSave={(v) => v && saveSetting("org.name", v)}
              className="h-8"
            />
          </Field>
          <Field label="Operational Timezone">
            <NativeSelect
              className="w-full h-8"
              value={setting("org.timezone") ?? "Asia/Kolkata"}
              disabled={!isAdmin}
              onChange={(v) => saveSetting("org.timezone", v)}
              options={[
                { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+05:30)" },
                { value: "UTC", label: "UTC" },
                { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
                { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
              ]}
            />
          </Field>
          <Field label="Date Display Format">
            <NativeSelect
              className="w-full h-8"
              value={setting("org.date_format") ?? "DD MMM YYYY"}
              disabled={!isAdmin}
              onChange={(v) => saveSetting("org.date_format", v)}
              options={[
                { value: "DD MMM YYYY", label: "08 Nov 2026 (DD MMM YYYY)" },
                { value: "DD/MM/YYYY", label: "08/11/2026 (DD/MM/YYYY)" },
                { value: "YYYY-MM-DD", label: "2026-11-08 (ISO)" },
              ]}
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Operational Rate Limits & Reliability"
        description="Live traffic and delivery controls enforced across server routes."
      >
        <ReadOnlyNote show={!isAdmin} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <Field label="Max Ticket Creations per User / Hour">
            <AutoInput
              type="number"
              min={5}
              value={setting("ops.ticket_create_limit") ?? 60}
              disabled={!isAdmin}
              onSave={(v) => {
                const n = Number(v);
                if (n >= 5 && n <= 10000) void saveSetting("ops.ticket_create_limit", Math.round(n));
                else toast.error("Enter a limit between 5 and 10,000");
              }}
              className="h-8 max-w-[180px]"
            />
          </Field>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70">
            <div>
              <div className="text-[12px] font-semibold">Persistent Email Retry Outbox</div>
              <div className="text-[11px] text-muted-foreground">
                Queue outgoing notification emails in <code className="font-mono">iris.outbox</code> with automatic retry backoff
              </div>
            </div>
            <Switch
              checked={setting("ops.email_via_outbox") !== false}
              disabled={!isAdmin}
              onCheckedChange={(v) => saveSetting("ops.email_via_outbox", v)}
            />
          </label>
        </div>
      </SettingsCard>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Departments / Employees / Studios / SLA / Routing / AI / Notifications / Integrations / Users / Audit
// ─────────────────────────────────────────────────────────────────────────────

function DepartmentsSettings() {
  const { data, isAdmin, patch, create, remove } = useS();
  const [adding, setAdding] = React.useState(false);
  const [n, setN] = React.useState({ code: "", name: "", description: "" });
  return (
    <SettingsCard
      title="Departments"
      description="Departments tickets are routed to. Deactivating a department hides it from intake and routing pickers immediately."
      action={<AddButton label="Add Department" onClick={() => setAdding(true)} disabled={!isAdmin} />}
    >
      <ReadOnlyNote show={!isAdmin} />
      <AddForm
        open={adding}
        onCancel={() => {
          setAdding(false);
          setN({ code: "", name: "", description: "" });
        }}
        onSubmit={() => create("departments", { ...n, code: n.code.toUpperCase() })}
      >
        <Field label="Code (e.g. FAC)">
          <Input
            className="h-7 text-[12px]"
            required
            maxLength={6}
            value={n.code}
            onChange={(e) => setN({ ...n, code: e.target.value })}
          />
        </Field>
        <Field label="Name">
          <Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <Input className="h-7 text-[12px]" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
        </Field>
      </AddForm>
      <div className="space-y-2">
        {data.departments.map((d) => {
          const staff = data.employees.filter((e) => e.department_code === d.code && e.is_active).length;
          return (
            <div key={d.code} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                {d.code}
              </Badge>
              <AutoInput
                className="w-48"
                value={d.name}
                disabled={!isAdmin}
                onSave={(v) => v && patch("departments", d.code, { name: v })}
              />
              <AutoInput
                className="flex-1 min-w-[200px]"
                value={d.description}
                placeholder="Description"
                disabled={!isAdmin}
                onSave={(v) => patch("departments", d.code, { description: v })}
              />
              <NativeSelect
                className="w-40"
                value={d.head_employee_id ?? ""}
                disabled={!isAdmin}
                onChange={(v) => patch("departments", d.code, { head_employee_id: v || null })}
                options={[
                  { value: "", label: "No head" },
                  ...data.employees.filter((e) => e.is_active).map((e) => ({ value: e.id, label: e.name })),
                ]}
              />
              <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5", staff === 0 && "text-amber-600")}>
                {staff} staff
              </Badge>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch
                  checked={d.is_active}
                  disabled={!isAdmin}
                  onCheckedChange={(v) => patch("departments", d.code, { is_active: v })}
                />
                Active
              </label>
              <IconButton
                label={`Delete ${d.name}`}
                danger
                disabled={!isAdmin}
                onClick={() => remove("departments", d.code, d.name)}
              >
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}

function EmployeesSettings() {
  const { data, canEdit, isAdmin, myDepartmentCode, patch, create, remove } = useS();
  const [adding, setAdding] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const defaultDept = !isAdmin && myDepartmentCode ? myDepartmentCode : (data.departments[0]?.code ?? "");
  const blank = {
    name: "",
    email: "",
    role: "",
    department_code: defaultDept,
    location: "Mumbai",
    studio_codes: [] as string[],
    reporting_manager: "",
  };
  const [n, setN] = React.useState(blank);
  const roleSuggestions = [
    ...new Set([...data.roles.map((r) => r.name), ...data.employees.map((e) => e.role).filter(Boolean)]),
  ].sort();
  const managerOptions = [
    { value: "", label: "No manager" },
    ...data.employees.filter((e) => e.is_active).map((e) => ({ value: e.name, label: e.name })),
  ];
  const list = data.employees.filter(
    (e) =>
      (showInactive || e.is_active) &&
      (!q || `${e.name} ${e.email} ${e.role} ${e.department_code}`.toLowerCase().includes(q.toLowerCase())),
  );

  // Enforce row-level write scope matching database RLS: admins edit everyone; managers edit their own department.
  const canEditRow = (emp: Row) => isAdmin || (canEdit && Boolean(myDepartmentCode) && emp.department_code === myDepartmentCode);

  return (
    <SettingsCard
      title="Employees"
      description="Staff records used for routing, workload and assignment. Managers can edit staff in their own department; admins can edit all departments."
      action={<AddButton label="Add Employee" onClick={() => setAdding(true)} disabled={!canEdit} />}
    >
      <ReadOnlyNote show={!canEdit} text="Only managers and admins can edit employees." />
      <AddForm
        open={adding}
        onCancel={() => {
          setAdding(false);
          setN(blank);
        }}
        onSubmit={() => create("employees", n)}
      >
        <Field label="Full name">
          <Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        </Field>
        <Field label="Work email">
          <Input
            type="email"
            className="h-7 text-[12px]"
            required
            value={n.email}
            onChange={(e) => setN({ ...n, email: e.target.value })}
          />
        </Field>
        <Field label="Role / title">
          <AutoInput
            className="w-full"
            suggestions={roleSuggestions}
            value={n.role}
            onSave={(v) => setN({ ...n, role: v })}
            placeholder="Pick or type a role"
          />
        </Field>
        <Field label="Department">
          <NativeSelect
            className="w-full"
            value={n.department_code}
            disabled={!isAdmin && Boolean(myDepartmentCode)}
            onChange={(v) => setN({ ...n, department_code: v })}
            options={deptOptions(data)}
          />
        </Field>
        <Field label="Location">
          <NativeSelect
            className="w-full"
            value={n.location}
            onChange={(v) => setN({ ...n, location: v })}
            options={withCurrent(CITIES, n.location)}
          />
        </Field>
        <Field label="Studios">
          <MultiSelect
            size="md"
            value={n.studio_codes}
            onChange={(v) => setN({ ...n, studio_codes: v })}
            options={studioOptions(data)}
            placeholder="All / none"
          />
        </Field>
        <Field label="Reporting manager">
          <NativeSelect
            className="w-full"
            value={n.reporting_manager}
            onChange={(v) => setN({ ...n, reporting_manager: v })}
            options={managerOptions}
          />
        </Field>
      </AddForm>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff" className="h-7 text-[12px] pl-7" />
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          Show inactive
        </label>
        <span className="ml-auto text-[11px] text-muted-foreground">{list.length} shown</span>
      </div>

      <div className="overflow-x-auto iris-scrollbar">
        <table className="w-full text-[12px] min-w-[1200px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-2 px-1.5 font-semibold">Name / email</th>
              <th className="text-left py-2 px-1.5 font-semibold">Role</th>
              <th className="text-left py-2 px-1.5 font-semibold">Department</th>
              <th className="text-left py-2 px-1.5 font-semibold">Studios</th>
              <th className="text-left py-2 px-1.5 font-semibold">Reports to</th>
              <th className="text-left py-2 px-1.5 font-semibold">Availability</th>
              <th className="text-right py-2 px-1.5 font-semibold">Load / max</th>
              <th className="text-center py-2 px-1.5 font-semibold" title="Can receive escalated tickets">
                Escalations
              </th>
              <th className="py-2 px-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((e) => {
              const rowEditable = canEditRow(e);
              return (
                <tr key={e.id} className={cn(!e.is_active && "opacity-50")}>
                  <td className="py-1.5 px-1.5 w-[260px]">
                    <AutoInput
                      value={e.name}
                      disabled={!rowEditable}
                      onSave={(v) => v && patch("employees", e.id, { name: v })}
                    />
                    <AutoInput
                      type="email"
                      className="mt-1 text-[11px] text-muted-foreground"
                      value={e.email}
                      disabled={!rowEditable}
                      onSave={(v) => v && patch("employees", e.id, { email: v })}
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <AutoInput
                      suggestions={roleSuggestions}
                      value={e.role}
                      disabled={!rowEditable}
                      onSave={(v) => v && patch("employees", e.id, { role: v })}
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <NativeSelect
                      value={e.department_code}
                      disabled={!isAdmin}
                      onChange={(v) => patch("employees", e.id, { department_code: v })}
                      options={deptOptions(data)}
                    />
                  </td>
                  <td className="py-1.5 px-1.5 w-[190px]">
                    <MultiSelect
                      value={e.studio_codes ?? []}
                      options={studioOptions(data)}
                      placeholder="None"
                      disabled={!rowEditable}
                      onChange={(v) => patch("employees", e.id, { studio_codes: v })}
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <NativeSelect
                      value={e.reporting_manager ?? ""}
                      disabled={!rowEditable}
                      options={withCurrent(managerOptions.map((o) => o.value), e.reporting_manager).map((o) => ({
                        value: o.value,
                        label: o.value || "No manager",
                      }))}
                      onChange={(v) => patch("employees", e.id, { reporting_manager: v || null })}
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <NativeSelect
                      value={e.availability}
                      disabled={!rowEditable}
                      onChange={(v) => patch("employees", e.id, { availability: v })}
                      options={AVAILABILITY.map((v) => ({ value: v, label: v.replace("_", " ") }))}
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="tabular-nums text-[11px] text-muted-foreground">{e.workload} /</span>
                      <AutoInput
                        type="number"
                        min={1}
                        className="w-14"
                        value={e.max_workload}
                        disabled={!rowEditable}
                        onSave={(v) => patch("employees", e.id, { max_workload: v })}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <Switch
                      checked={!e.exclude_from_escalation}
                      disabled={!rowEditable}
                      aria-label={`${e.name} receives escalations`}
                      onCheckedChange={(v) => patch("employees", e.id, { exclude_from_escalation: !v })}
                    />
                  </td>
                  <td className="py-1.5 px-1.5 text-right">
                    {e.is_active ? (
                      <IconButton
                        label={`Deactivate ${e.name}`}
                        danger
                        disabled={!rowEditable}
                        onClick={() => remove("employees", e.id, e.name)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </IconButton>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        disabled={!rowEditable}
                        onClick={() => patch("employees", e.id, { is_active: true })}
                      >
                        Restore
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  );
}

function StudiosSettings() {
  const { data, isAdmin, patch, create, remove } = useS();
  const [adding, setAdding] = React.useState(false);
  const blank = { code: "", name: "", city: "Mumbai", address: "" };
  const [n, setN] = React.useState(blank);
  return (
    <SettingsCard
      title="Studios"
      description="Physique 57 India studio locations. Changes propagate immediately to intake forms, filters, and digest selectors."
      action={<AddButton label="Add Studio" onClick={() => setAdding(true)} disabled={!isAdmin} />}
    >
      <ReadOnlyNote show={!isAdmin} />
      <AddForm
        open={adding}
        onCancel={() => {
          setAdding(false);
          setN(blank);
        }}
        onSubmit={() => create("studios", { ...n, code: n.code.toUpperCase() })}
      >
        <Field label="Code (e.g. KH)">
          <Input
            className="h-7 text-[12px]"
            required
            maxLength={6}
            value={n.code}
            onChange={(e) => setN({ ...n, code: e.target.value })}
          />
        </Field>
        <Field label="Name">
          <Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        </Field>
        <Field label="City">
          <NativeSelect
            className="w-full"
            value={n.city}
            onChange={(v) => setN({ ...n, city: v })}
            options={[
              { value: "Mumbai", label: "Mumbai" },
              { value: "Bengaluru", label: "Bengaluru" },
            ]}
          />
        </Field>
        <Field label="Address" className="md:col-span-3">
          <Input className="h-7 text-[12px]" value={n.address} onChange={(e) => setN({ ...n, address: e.target.value })} />
        </Field>
      </AddForm>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.studios.map((s) => (
          <div key={s.code} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                {s.code}
              </Badge>
              <AutoInput
                className="flex-1"
                value={s.name}
                disabled={!isAdmin}
                onSave={(v) => v && patch("studios", s.code, { name: v })}
              />
              <IconButton
                label={`Delete ${s.name}`}
                danger
                disabled={!isAdmin}
                onClick={() => remove("studios", s.code, s.name)}
              >
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
            <AutoInput
              value={s.address}
              placeholder="Address"
              disabled={!isAdmin}
              onSave={(v) => patch("studios", s.code, { address: v })}
            />
            <div className="flex items-center gap-2">
              <NativeSelect
                value={s.city}
                disabled={!isAdmin}
                onChange={(v) => patch("studios", s.code, { city: v })}
                options={[
                  { value: "Mumbai", label: "Mumbai" },
                  { value: "Bengaluru", label: "Bengaluru" },
                ]}
              />
              <Field label="" className="flex-1">
                <AutoInput
                  type="number"
                  placeholder="Momence location id"
                  value={s.momence_location_id}
                  disabled={!isAdmin}
                  onSave={(v) => patch("studios", s.code, { momence_location_id: v })}
                />
              </Field>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch
                  checked={s.is_active}
                  disabled={!isAdmin}
                  onCheckedChange={(v) => patch("studios", s.code, { is_active: v })}
                />
                Active
              </label>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SLASettings() {
  const { data, isAdmin, patch, setting, saveSetting } = useS();
  const hours: Record<string, string> = setting("sla.business_hours") ?? {
    Mon: "07:00-21:00",
    Tue: "07:00-21:00",
    Wed: "07:00-21:00",
    Thu: "07:00-21:00",
    Fri: "07:00-21:00",
    Sat: "08:00-20:00",
    Sun: "08:00-18:00",
  };
  const mins = (v: string) => (Number(v) > 0 ? v : null);
  return (
    <>
      <SettingsCard
        title="SLA Targets"
        description="Response and resolution targets per priority, in minutes. When 'Business hours only' is on, SLA timers skip closed studio hours in IST."
      >
        <ReadOnlyNote show={!isAdmin} />
        <div className="space-y-3">
          {data.sla_definitions.map((d) => {
            const cfg = PRIORITY_CONFIG[d.priority as Priority];
            return (
              <div key={d.priority} className={cn("p-3 rounded-lg border ring-1", cfg?.bg, cfg?.ring)}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn("text-[14px] font-bold", cfg?.text)}>{d.priority}</span>
                  <AutoInput
                    className="w-48"
                    value={d.name}
                    disabled={!isAdmin}
                    onSave={(v) => v && patch("sla_definitions", d.priority, { name: v })}
                  />
                  <AutoInput
                    className="flex-1"
                    value={d.description}
                    disabled={!isAdmin}
                    onSave={(v) => v && patch("sla_definitions", d.priority, { description: v })}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label="First response (mins)">
                    <AutoInput
                      type="number"
                      min={1}
                      value={d.response_target_mins}
                      disabled={!isAdmin}
                      onSave={(v) => mins(v) && patch("sla_definitions", d.priority, { response_target_mins: v })}
                    />
                  </Field>
                  <Field label="Resolution (mins)">
                    <AutoInput
                      type="number"
                      min={1}
                      value={d.resolution_target_mins}
                      disabled={!isAdmin}
                      onSave={(v) => mins(v) && patch("sla_definitions", d.priority, { resolution_target_mins: v })}
                    />
                  </Field>
                  <Field label="Escalate after (mins)">
                    <AutoInput
                      type="number"
                      min={1}
                      value={d.escalation_threshold_mins}
                      disabled={!isAdmin}
                      onSave={(v) => mins(v) && patch("sla_definitions", d.priority, { escalation_threshold_mins: v })}
                    />
                  </Field>
                  <label className="flex items-end gap-1.5 text-[11px] pb-1.5">
                    <Switch
                      checked={d.business_hours_only}
                      disabled={!isAdmin}
                      onCheckedChange={(v) => patch("sla_definitions", d.priority, { business_hours_only: v })}
                    />
                    Business hours only
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Business Hours (IST)"
        description="Operating window per day in Asia/Kolkata (UTC+05:30). Used immediately for any priority with 'Business hours only' enabled."
      >
        <ReadOnlyNote show={!isAdmin} />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {DAYS.map((day) => (
            <BusinessHoursRow
              key={day}
              day={day}
              value={hours[day] || "Closed"}
              disabled={!isAdmin}
              onSave={(value) => saveSetting("sla.business_hours", { ...hours, [day]: value })}
            />
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

function BusinessHoursRow({
  day,
  value,
  disabled,
  onSave,
}: {
  day: string;
  value: string;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const closed = value.toLowerCase() === "closed" || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(value);
  const [start, end] = closed ? ["07:00", "21:00"] : value.split("-");
  const update = (nextStart: string, nextEnd: string) => {
    if (!nextStart || !nextEnd || nextStart >= nextEnd) {
      toast.error("Closing time must be after opening time");
      return;
    }
    onSave(`${nextStart}-${nextEnd}`);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-4 py-3">
      <span className="w-10 text-xs font-semibold">{day}</span>
      <Switch
        checked={!closed}
        disabled={disabled}
        aria-label={`${day} open`}
        onCheckedChange={(open) => onSave(open ? "07:00-21:00" : "Closed")}
      />
      {closed ? (
        <span className="text-xs text-muted-foreground">Closed</span>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            aria-label={`${day} opening time`}
            type="time"
            value={start}
            disabled={disabled}
            onChange={(e) => update(e.target.value, end)}
            className="h-8 rounded-md border border-input bg-background px-2 text-foreground disabled:opacity-60"
          />
          <span>to</span>
          <input
            aria-label={`${day} closing time`}
            type="time"
            value={end}
            disabled={disabled}
            onChange={(e) => update(start, e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-foreground disabled:opacity-60"
          />
        </div>
      )}
    </div>
  );
}

const ROUTE_PRIORITIES = ["Auto", "P0", "P1", "P2", "P3", "Critical", "High", "Medium", "Low"].map((v) => ({
  value: v,
  label: v,
}));

function RoutingSettings() {
  const { data, isAdmin, patch, create, remove, setting, saveSetting } = useS();
  const [adding, setAdding] = React.useState(false);
  const blank = {
    name: "",
    condition: "category=" + Object.keys(CATEGORY_MAP)[0],
    department_code: "",
    priority: "Auto",
    sort_order: 10,
  };
  const [n, setN] = React.useState(blank);
  const depts = [{ value: "", label: "Any department" }, ...deptOptions(data)];

  const policySwitches: Array<{ key: string; defaultOn: boolean; title: string; desc: string }> = [
    {
      key: "routing.auto_assign",
      defaultOn: true,
      title: "Automatic Owner Assignment",
      desc: "Automatically assign newly created tickets to the best eligible team member.",
    },
    {
      key: "routing.studio_affinity",
      defaultOn: true,
      title: "Studio Location Affinity",
      desc: "Prioritize staff members whose assigned studios include the ticket's studio.",
    },
    {
      key: "routing.load_balance",
      defaultOn: true,
      title: "Workload Utilization Balancing",
      desc: "Route to the specialist with the lowest active workload / max capacity ratio.",
    },
    {
      key: "routing.round_robin_fallback",
      defaultOn: true,
      title: "Capacity & Operations Fallback",
      desc: "When primary department specialists are full or offline, fall back to busy staff or Operations (MGT).",
    },
    {
      key: "routing.require_acknowledgment",
      defaultOn: false,
      title: "Require Owner Acknowledgment",
      desc: "Prompt assigned owners on the Ticket Workspace to explicitly acknowledge receipt and start first-response tracking.",
    },
  ];

  return (
    <>
      <SettingsCard title="Assignment Engine Policies" description="All 5 switches take effect immediately for new tickets.">
        <ReadOnlyNote show={!isAdmin} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {policySwitches.map((sw) => {
            const raw = setting(sw.key);
            const checked = raw === undefined ? sw.defaultOn : Boolean(raw);
            return (
              <label
                key={sw.key}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/70 cursor-pointer"
              >
                <div>
                  <div className="text-[12px] font-semibold">{sw.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sw.desc}</div>
                </div>
                <Switch checked={checked} disabled={!isAdmin} onCheckedChange={(v) => saveSetting(sw.key, v)} />
              </label>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Conditional Routing Rules"
        description="Evaluated in sort-order sequence on intake classification and ticket creation."
        action={<AddButton label="Add Rule" onClick={() => setAdding(true)} disabled={!isAdmin} />}
      >
        <AddForm
          open={adding}
          onCancel={() => {
            setAdding(false);
            setN(blank);
          }}
          onSubmit={() => create("routing_rules", { ...n, department_code: n.department_code || null })}
        >
          <Field label="Rule name">
            <Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          </Field>
          <Field label="Condition" className="md:col-span-2">
            <ConditionBuilder value={n.condition} onChange={(v) => setN({ ...n, condition: v })} />
          </Field>
          <Field label="Route to">
            <NativeSelect
              className="w-full"
              value={n.department_code}
              onChange={(v) => setN({ ...n, department_code: v })}
              options={depts}
            />
          </Field>
          <Field label="Override Priority">
            <NativeSelect
              className="w-full"
              value={n.priority}
              onChange={(v) => setN({ ...n, priority: v })}
              options={ROUTE_PRIORITIES}
            />
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              className="h-7 text-[12px]"
              value={n.sort_order}
              onChange={(e) => setN({ ...n, sort_order: Number(e.target.value) || 10 })}
            />
          </Field>
        </AddForm>
        <div className="space-y-2">
          {data.routing_rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-md border border-border">
              <Switch
                checked={r.is_active}
                disabled={!isAdmin}
                onCheckedChange={(v) => patch("routing_rules", r.id, { is_active: v })}
                aria-label="Active"
              />
              <AutoInput
                type="number"
                className="w-14"
                value={r.sort_order}
                disabled={!isAdmin}
                onSave={(v) => patch("routing_rules", r.id, { sort_order: v })}
              />
              <AutoInput
                className="w-48"
                value={r.name}
                disabled={!isAdmin}
                onSave={(v) => v && patch("routing_rules", r.id, { name: v })}
              />
              <ConditionBuilder
                value={r.condition}
                disabled={!isAdmin}
                onChange={(v) => v && patch("routing_rules", r.id, { condition: v })}
              />
              <NativeSelect
                value={r.department_code ?? ""}
                disabled={!isAdmin}
                onChange={(v) => patch("routing_rules", r.id, { department_code: v || null })}
                options={depts}
              />
              <NativeSelect
                value={r.priority}
                disabled={!isAdmin}
                onChange={(v) => patch("routing_rules", r.id, { priority: v })}
                options={ROUTE_PRIORITIES}
              />
              <IconButton
                label={`Delete ${r.name}`}
                danger
                disabled={!isAdmin}
                onClick={() => remove("routing_rules", r.id, r.name)}
              >
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
          ))}
          {!data.routing_rules.length && <div className="text-[12px] text-muted-foreground">No rules configured yet.</div>}
        </div>
      </SettingsCard>
    </>
  );
}

function AIModelSettings() {
  const { data, isAdmin, patch, create, remove, setting, saveSetting } = useS();
  const [adding, setAdding] = React.useState(false);
  const blank = {
    provider: "Anthropic",
    model: "claude-sonnet-4-5",
    purpose: "Primary Conversational",
    temperature: "0.5",
    max_tokens: "4096",
  };
  const [n, setN] = React.useState(blank);
  const [usage, setUsage] = React.useState<{
    model: string;
    today: { tokens: number; costUsd: number; calls: number };
    month: { tokens: number; costUsd: number };
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/ai/usage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setUsage(j))
      .catch(() => {});
  }, [data.ai_models, data.app_settings]);

  const num = (key: string, v: string, min = 0) => {
    const x = Number(v);
    if (!Number.isFinite(x) || x < min) return toast.error("Enter a valid number");
    return saveSetting(key, x);
  };

  return (
    <>
      {usage && (
        <div className="iris-card p-4 mb-5 rounded-2xl border border-border/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Runtime Model
            </div>
            <div className="text-[14px] font-mono font-semibold text-primary mt-0.5">{usage.model}</div>
          </div>
          <div className="flex gap-6 text-[12px]">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Today (IST)</div>
              <div className="font-semibold tabular-nums">
                {usage.today.tokens.toLocaleString()} tokens · ${usage.today.costUsd.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Month to Date</div>
              <div className="font-semibold tabular-nums">
                {usage.month.tokens.toLocaleString()} tokens · ${usage.month.costUsd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsCard
        title="AI Models"
        description="Models IRIS uses per task. Setting a Claude model as PRIMARY immediately routes AI Assistant & Intake Classification turns through it."
        action={<AddButton label="Add Model" onClick={() => setAdding(true)} disabled={!isAdmin} />}
      >
        <ReadOnlyNote show={!isAdmin} />
        <AddForm
          open={adding}
          onCancel={() => {
            setAdding(false);
            setN(blank);
          }}
          onSubmit={() => create("ai_models", n)}
        >
          <Field label="Provider">
            <NativeSelect
              className="w-full"
              value={n.provider}
              onChange={(v) => setN({ ...n, provider: v, model: AI_MODELS[v]?.[0] ?? "" })}
              options={["Anthropic", "OpenAI"].map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Model id">
            <AutoInput
              className="w-full font-mono"
              suggestions={AI_MODELS[n.provider] ?? []}
              value={n.model}
              onSave={(v) => setN({ ...n, model: v })}
              placeholder="claude-opus-5-5"
            />
          </Field>
          <Field label="Used for">
            <NativeSelect
              className="w-full"
              value={n.purpose}
              onChange={(v) => setN({ ...n, purpose: v })}
              options={AI_PURPOSES.map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Temperature (0–2)">
            <Input
              type="number"
              step={0.1}
              min={0}
              max={2}
              className="h-7 text-[12px]"
              value={n.temperature}
              onChange={(e) => setN({ ...n, temperature: e.target.value })}
            />
          </Field>
          <Field label="Max tokens">
            <Input
              type="number"
              min={1}
              className="h-7 text-[12px]"
              value={n.max_tokens}
              onChange={(e) => setN({ ...n, max_tokens: e.target.value })}
            />
          </Field>
        </AddForm>
        <div className="space-y-2">
          {data.ai_models.map((m) => (
            <div
              key={m.id}
              className={cn("p-3 rounded-lg border", m.is_primary ? "border-primary/40 bg-primary/5" : "border-border")}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Brain className={cn("w-4 h-4", m.provider === "OpenAI" ? "text-emerald-500" : "text-orange-500")} />
                <NativeSelect
                  value={m.provider}
                  disabled={!isAdmin}
                  onChange={(v) => patch("ai_models", m.id, { provider: v })}
                  options={["Anthropic", "OpenAI"].map((v) => ({ value: v, label: v }))}
                />
                <NativeSelect
                  className="w-52 font-mono"
                  value={m.model}
                  disabled={!isAdmin}
                  options={withCurrent(AI_MODELS[m.provider] ?? [], m.model)}
                  onChange={(v) => patch("ai_models", m.id, { model: v })}
                />
                <NativeSelect
                  className="flex-1 min-w-[160px]"
                  value={m.purpose}
                  disabled={!isAdmin}
                  options={withCurrent(AI_PURPOSES, m.purpose)}
                  onChange={(v) => patch("ai_models", m.id, { purpose: v })}
                />
                {m.is_primary ? (
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5 bg-primary/10 text-primary border-primary/30">
                    PRIMARY
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    disabled={!isAdmin}
                    onClick={() => patch("ai_models", m.id, { is_primary: true })}
                  >
                    Make primary
                  </Button>
                )}
                <Switch
                  checked={m.is_active}
                  disabled={!isAdmin}
                  onCheckedChange={(v) => patch("ai_models", m.id, { is_active: v })}
                  aria-label="Active"
                />
                <IconButton
                  label={`Delete ${m.model}`}
                  danger
                  disabled={!isAdmin || m.is_primary}
                  onClick={() => remove("ai_models", m.id, `${m.provider} ${m.model}`)}
                >
                  <Trash2 className="w-3 h-3" />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm">
                <Field label="Temperature (0–2)">
                  <AutoInput
                    type="number"
                    step={0.1}
                    min={0}
                    value={m.temperature}
                    disabled={!isAdmin}
                    onSave={(v) =>
                      Number(v) >= 0 && Number(v) <= 2
                        ? patch("ai_models", m.id, { temperature: v })
                        : toast.error("Temperature must be 0–2")
                    }
                  />
                </Field>
                <Field label="Max tokens">
                  <AutoInput
                    type="number"
                    min={1}
                    value={m.max_tokens}
                    disabled={!isAdmin}
                    onSave={(v) =>
                      Number(v) > 0 ? patch("ai_models", m.id, { max_tokens: v }) : toast.error("Must be above 0")
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="AI Behaviour & Spending Guardrails"
        description="Hard token and USD limits are enforced live before every model turn."
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Daily token limit (0 = unlimited)">
            <AutoInput
              type="number"
              min={0}
              value={setting("ai.daily_token_limit")}
              disabled={!isAdmin}
              onSave={(v) => num("ai.daily_token_limit", v)}
            />
          </Field>
          <Field label="Monthly budget USD (0 = unlimited)">
            <AutoInput
              type="number"
              min={0}
              value={setting("ai.monthly_budget_usd")}
              disabled={!isAdmin}
              onSave={(v) => num("ai.monthly_budget_usd", v)}
            />
          </Field>
          <Field label="Alert at (% of budget)">
            <AutoInput
              type="number"
              min={1}
              value={setting("ai.alert_threshold_pct")}
              disabled={!isAdmin}
              onSave={(v) => num("ai.alert_threshold_pct", v, 1)}
            />
          </Field>
          <Field label="Min. confidence to skip AI (%)">
            <AutoInput
              type="number"
              min={0}
              value={setting("ai.confidence_threshold")}
              disabled={!isAdmin}
              onSave={(v) => num("ai.confidence_threshold", v)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70">
            <div>
              <div className="text-[12px] font-semibold">AI Intake Auto-Triage</div>
              <div className="text-[11px] text-muted-foreground">
                Invoke Claude fallback classification when deterministic rules score below threshold
              </div>
            </div>
            <Switch
              checked={setting("ai.auto_triage") !== false}
              disabled={!isAdmin}
              onCheckedChange={(v) => saveSetting("ai.auto_triage", v)}
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/70">
            <div>
              <div className="text-[12px] font-semibold">Auto-Investigation Notes</div>
              <div className="text-[11px] text-muted-foreground">
                Pre-populate structured investigation triage notes on newly filed tickets
              </div>
            </div>
            <Switch
              checked={Boolean(setting("ai.auto_investigate"))}
              disabled={!isAdmin}
              onCheckedChange={(v) => saveSetting("ai.auto_investigate", v)}
            />
          </label>
        </div>
      </SettingsCard>
    </>
  );
}

function NotificationsSettings() {
  const { data, isAdmin, patch, create, remove, setting, saveSetting } = useS();
  const [adding, setAdding] = React.useState(false);
  const [event, setEvent] = React.useState("");
  const [testingEmail, setTestingEmail] = React.useState(false);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const channels = [
    { key: "notifications.in_app_enabled", label: "In-app Bell Notifications" },
    { key: "notifications.email_enabled", label: "Transactional Email" },
    { key: "notifications.whatsapp_enabled", label: "WhatsApp Channel" },
  ];

  const handleQuickEmailTest = async () => {
    const to = data.me.email;
    if (!to) return toast.error("No email on current session");
    setTestingEmail(true);
    try {
      const res = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_test", to, event: "ticket_created" }),
      });
      const json = await res.json();
      if (!res.ok) toast.error(json.error || "Email test failed");
      else toast.success(`Test email dispatched (${json.transport}) to ${to}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test dispatch failed");
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <>
      <SettingsCard
        title="Workspace Channels & Sender Identity"
        description="Global master switches and outgoing sender configuration used by the IRIS notification service."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setCurrentView("email_templates")}>
              Preview Templates
            </Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={handleQuickEmailTest} disabled={testingEmail}>
              <Send className="w-3 h-3 mr-1" />
              {testingEmail ? "Sending…" : "Send Test to Me"}
            </Button>
          </div>
        }
      >
        <ReadOnlyNote show={!isAdmin} />
        <div className="flex flex-wrap gap-6 mb-4">
          {channels.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-[12px] font-medium">
              <Switch
                checked={setting(c.key) !== false}
                disabled={!isAdmin}
                onCheckedChange={(v) => saveSetting(c.key, v)}
              />
              {c.label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <Field label="Outgoing Email Sender Name">
            <AutoInput
              value={setting("notifications.sender_name") ?? "Physique 57 India · IRIS"}
              placeholder="Physique 57 India · IRIS"
              disabled={!isAdmin}
              onSave={(v) => saveSetting("notifications.sender_name", v)}
              className="h-8"
            />
          </Field>
          <Field label="Reply-To Email Address (optional)">
            <AutoInput
              type="email"
              value={setting("notifications.reply_to") ?? ""}
              placeholder="ops@physique57india.com"
              disabled={!isAdmin}
              onSave={(v) => saveSetting("notifications.reply_to", v)}
              className="h-8"
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Lifecycle Event Matrix"
        description="Choose which channels fire for each ticket lifecycle event."
        action={<AddButton label="Add Event" onClick={() => setAdding(true)} disabled={!isAdmin} />}
      >
        <AddForm
          open={adding}
          onCancel={() => {
            setAdding(false);
            setEvent("");
          }}
          onSubmit={() => (event ? create("notification_rules", { event, in_app: true, email: true }) : Promise.resolve(false))}
        >
          <Field label="Event" className="md:col-span-3">
            <NativeSelect
              className="w-full"
              value={event}
              onChange={setEvent}
              options={[
                { value: "", label: "Select an event…" },
                ...KNOWN_EVENTS.filter((k) => !data.notification_rules.some((r) => r.event === k)).map((v) => ({
                  value: v,
                  label: v,
                })),
              ]}
            />
          </Field>
        </AddForm>
        <div className="space-y-2">
          {data.notification_rules.map((n) => (
            <div key={n.event} className="flex flex-wrap items-center gap-3 p-2.5 rounded-md border border-border">
              <div className="flex-1 text-[12px] font-medium">{n.event}</div>
              {(["in_app", "email", "whatsapp"] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-1.5 text-[11px]">
                  <Switch
                    checked={n[ch]}
                    disabled={!isAdmin}
                    onCheckedChange={(v) => patch("notification_rules", n.event, { [ch]: v })}
                  />
                  {ch === "in_app" ? "In-app" : ch === "email" ? "Email" : "WhatsApp"}
                </label>
              ))}
              <IconButton
                label={`Delete ${n.event}`}
                danger
                disabled={!isAdmin}
                onClick={() => remove("notification_rules", n.event, n.event)}
              >
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

function IntegrationsSettings() {
  const { data, setData, isAdmin, patch } = useS();
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const testConnection = async (id: string, name: string) => {
    setTestingId(id);
    try {
      const res = await api<{ ok: boolean; status: string; latencyMs: number; detail: string; row: Row | null }>(
        "/api/settings/integrations/test",
        { method: "POST", json: { id } },
      );
      if (res.row) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                integrations: prev.integrations.map((x) => (x.id === id ? { ...x, ...res.row } : x)),
              }
            : prev,
        );
      }
      if (res.ok) toast.success(`${name}: ${res.detail} (${res.latencyMs}ms)`);
      else toast.warning(`${name}: ${res.detail}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <SettingsCard
      title="Integrations"
      description="Enable/disable integrations, configure endpoints, and run live connectivity checks. Disabling Momence, Email, or AI here immediately pauses calls to that provider."
    >
      <ReadOnlyNote show={!isAdmin} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.integrations.map((i) => {
          const cfg = (i.config ?? {}) as Record<string, string>;
          const isExpanded = expandedId === i.id;
          return (
            <div key={i.id} className="p-3.5 rounded-xl border border-border space-y-2.5">
              <div className="flex items-start gap-2">
                <Plug className={cn("w-4 h-4 mt-0.5", i.is_enabled ? "text-emerald-500" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{i.name}</span>
                    {i.category && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {i.category}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] h-4 px-1.5",
                        i.status === "connected" || i.status === "enabled"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : i.status === "error"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "text-muted-foreground",
                      )}
                    >
                      {i.status || (i.is_enabled ? "enabled" : "disabled")}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{i.description}</div>
                  {i.last_sync_status && (
                    <div className="text-[10.5px] text-muted-foreground/85 mt-1 font-mono truncate" title={i.last_sync_status}>
                      {i.last_sync_status}
                    </div>
                  )}
                </div>
                <Switch
                  checked={i.is_enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(v) =>
                    patch("integrations", i.id, { is_enabled: v, status: v ? "enabled" : "disconnected" })
                  }
                  aria-label={`Enable ${i.name}`}
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-1 border-t border-border/50">
                <span>Sync every</span>
                <NativeSelect
                  value={String(i.sync_interval_mins ?? 60)}
                  disabled={!isAdmin}
                  options={withCurrent(
                    ["5", "15", "30", "60", "120", "360", "720", "1440"],
                    String(i.sync_interval_mins ?? 60),
                  ).map((o) => ({ ...o, label: `${o.value} min` }))}
                  onChange={(v) => patch("integrations", i.id, { sync_interval_mins: Number(v) })}
                />
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      disabled={testingId === i.id}
                      onClick={() => void testConnection(i.id, i.name)}
                    >
                      {testingId === i.id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Play className="w-2.5 h-2.5 mr-1" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setExpandedId(isExpanded ? null : i.id)}
                    >
                      {isExpanded ? "Hide Config" : "Configure"}
                    </Button>
                  </>
                )}
                <span className="ml-auto text-[10px]">
                  {i.last_synced_at ? `Checked ${new Date(i.last_synced_at).toLocaleTimeString()}` : "Not checked"}
                </span>
              </div>

              {isExpanded && isAdmin && (
                <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Webhook / Endpoint URL (optional)">
                    <AutoInput
                      placeholder="https://..."
                      value={cfg.webhook_url ?? ""}
                      onSave={(v) => patch("integrations", i.id, { config: { ...cfg, webhook_url: v } })}
                    />
                  </Field>
                  <Field label="Channel / Identifier">
                    <AutoInput
                      placeholder="#ops-alerts or host id"
                      value={cfg.channel ?? ""}
                      onSave={(v) => patch("integrations", i.id, { config: { ...cfg, channel: v } })}
                    />
                  </Field>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}

const TIERS = [
  { value: "executive", label: "Executive — own & department tickets" },
  { value: "manager", label: "Manager — department + staff edits" },
  { value: "admin", label: "Admin — everything" },
];

function PermissionsSettings() {
  const { data, isAdmin, patch, create, remove } = useS();
  const [addingUser, setAddingUser] = React.useState(false);
  const [u, setU] = React.useState({ employee_id: "", email: "", password: "", role: "executive" });
  const [addingRole, setAddingRole] = React.useState(false);
  const [r, setR] = React.useState({ name: "", access_tier: "executive", permissions: [] as string[] });
  const permOptions = [...new Set([...KNOWN_PERMISSIONS, ...data.roles.flatMap((x) => x.permissions ?? [])])]
    .sort()
    .map((v) => ({ value: v, label: v }));
  const withLogin = new Set(data.users.map((x) => x.employee_id).filter(Boolean));
  const empOptions = data.employees.filter((e) => e.is_active && !withLogin.has(e.id));

  const tempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const a = new Uint32Array(14);
    crypto.getRandomValues(a);
    return Array.from(a, (x) => chars[x % chars.length]).join("");
  };

  const resetPassword = async (user: Row) => {
    const pw = tempPassword();
    if (!window.confirm(`Reset the password for ${user.email}? They'll be signed out everywhere.`)) return;
    if (await patch("users", user.id, { password: pw })) {
      window.prompt(
        `Temporary password for ${user.email} (copy it now, it won't be shown again). They must change it on next sign-in.`,
        pw,
      );
    }
  };

  return (
    <>
      <SettingsCard
        title="User Accounts"
        description="Who can sign in to IRIS, and with what access"
        action={
          <AddButton
            label="Add Login"
            onClick={() => {
              setU({ employee_id: "", email: "", password: tempPassword(), role: "executive" });
              setAddingUser(true);
            }}
            disabled={!isAdmin}
          />
        }
      >
        {!isAdmin ? (
          <ReadOnlyNote show text="Only admins can see and manage user accounts." />
        ) : (
          <>
            <AddForm
              open={addingUser}
              onCancel={() => setAddingUser(false)}
              onSubmit={async () => {
                const ok = await create("users", u);
                if (ok) {
                  window.prompt(
                    `Account created. Temporary password for ${u.email} (copy it now). They must change it on first sign-in.`,
                    u.password,
                  );
                }
                return ok;
              }}
            >
              <Field label="Employee">
                <NativeSelect
                  className="w-full"
                  value={u.employee_id}
                  onChange={(v) =>
                    setU({
                      ...u,
                      employee_id: v,
                      email: data.employees.find((e) => e.id === v)?.email ?? u.email,
                    })
                  }
                  options={[{ value: "", label: "Not linked" }, ...empOptions.map((e) => ({ value: e.id, label: e.name }))]}
                />
              </Field>
              <Field label="Sign-in email">
                <Input
                  type="email"
                  required
                  className="h-7 text-[12px]"
                  value={u.email}
                  onChange={(e) => setU({ ...u, email: e.target.value })}
                />
              </Field>
              <Field label="Access">
                <NativeSelect
                  className="w-full"
                  value={u.role}
                  onChange={(v) => setU({ ...u, role: v })}
                  options={TIERS}
                />
              </Field>
              <Field label="Temporary password (10+ chars)" className="md:col-span-3">
                <Input
                  required
                  minLength={10}
                  className="h-7 text-[12px] font-mono"
                  value={u.password}
                  onChange={(e) => setU({ ...u, password: e.target.value })}
                />
              </Field>
            </AddForm>
            <div className="overflow-x-auto iris-scrollbar">
              <table className="w-full text-[12px] min-w-[720px]">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 px-1.5 font-semibold">User</th>
                    <th className="text-left py-2 px-1.5 font-semibold">Access</th>
                    <th className="text-left py-2 px-1.5 font-semibold">Last sign-in</th>
                    <th className="text-left py-2 px-1.5 font-semibold">Active</th>
                    <th className="py-2 px-1.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((x) => {
                    const self = x.id === data.me.userId;
                    return (
                      <tr key={x.id} className={cn(!x.is_active && "opacity-50")}>
                        <td className="py-1.5 px-1.5">
                          <div className="font-medium">
                            {x.name ?? x.email}
                            {self && <span className="text-muted-foreground"> (you)</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {x.email}
                            {x.must_change_password && " · must set password"}
                          </div>
                        </td>
                        <td className="py-1.5 px-1.5">
                          <NativeSelect
                            value={x.role}
                            disabled={self}
                            onChange={(v) => patch("users", x.id, { role: v })}
                            options={TIERS}
                          />
                        </td>
                        <td className="py-1.5 px-1.5 text-[11px] text-muted-foreground">
                          {x.last_login_at ? new Date(x.last_login_at).toLocaleString() : "Never"}
                        </td>
                        <td className="py-1.5 px-1.5">
                          <Switch
                            checked={x.is_active}
                            disabled={self}
                            onCheckedChange={(v) => patch("users", x.id, { is_active: v })}
                            aria-label="Active"
                          />
                        </td>
                        <td className="py-1.5 px-1.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px]"
                            disabled={self}
                            onClick={() => resetPassword(x)}
                          >
                            <KeyRound className="w-3 h-3 mr-1" />
                            Reset password
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SettingsCard>

      <SettingsCard
        title="Role Catalogue"
        description="Job roles and permissions synced to active user sessions in real time."
        action={<AddButton label="Add Role" onClick={() => setAddingRole(true)} disabled={!isAdmin} />}
      >
        <AddForm
          open={addingRole}
          onCancel={() => {
            setAddingRole(false);
            setR({ name: "", access_tier: "executive", permissions: [] });
          }}
          onSubmit={() => create("roles", r)}
        >
          <Field label="Role name">
            <Input required className="h-7 text-[12px]" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
          </Field>
          <Field label="Access tier">
            <NativeSelect
              className="w-full"
              value={r.access_tier}
              onChange={(v) => setR({ ...r, access_tier: v })}
              options={TIERS}
            />
          </Field>
          <Field label="Permissions">
            <MultiSelect
              size="md"
              value={r.permissions}
              onChange={(v) => setR({ ...r, permissions: v })}
              options={permOptions}
              placeholder="None"
            />
          </Field>
        </AddForm>
        <div className="space-y-2">
          {data.roles.map((role) => (
            <div key={role.name} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border">
              <div className="w-44 text-[12px] font-semibold">{role.name}</div>
              <NativeSelect
                value={role.access_tier}
                disabled={!isAdmin}
                onChange={(v) => patch("roles", role.name, { access_tier: v })}
                options={TIERS}
              />
              <div className="flex-1 min-w-[220px]">
                <MultiSelect
                  value={role.permissions ?? []}
                  options={permOptions}
                  placeholder="No permissions"
                  disabled={!isAdmin}
                  onChange={(v) => patch("roles", role.name, { permissions: v })}
                />
              </div>
              <IconButton
                label={`Delete ${role.name}`}
                danger
                disabled={!isAdmin}
                onClick={() => remove("roles", role.name, role.name)}
              >
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

function AuditLogsSettings() {
  const { data, isAdmin, setting, saveSetting, reload } = useS();
  const [q, setQ] = React.useState("");
  const [pruning, setPruning] = React.useState(false);

  const logs = data.audit_log.filter(
    (l) => !q || `${l.action} ${l.actor} ${l.entity_type} ${l.entity_id}`.toLowerCase().includes(q.toLowerCase()),
  );

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["timestamp", "action", "actor", "entity_type", "entity_id", "ip"].join(","),
      ...logs.map((l) => [l.created_at, l.action, l.actor, l.entity_type, l.entity_id, l.ip].map(esc).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `iris-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrune = async () => {
    const days = Number(setting("audit.retention_days") ?? 365);
    if (!window.confirm(`Permanently delete audit log entries older than ${days} days?`)) return;
    setPruning(true);
    try {
      const res = await api<{ pruned: number; retentionDays: number }>(
        `/api/settings?olderThanDays=${encodeURIComponent(String(days))}`,
        { method: "DELETE" },
      );
      toast.success(`Pruned ${res.pruned} expired audit entries (> ${res.retentionDays} days)`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not prune audit logs");
    } finally {
      setPruning(false);
    }
  };

  return (
    <SettingsCard
      title="Audit Log"
      description="Recorded actions across sign-ins, ticket changes, and settings updates (filtered by retention window)."
      action={
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={handlePrune} disabled={pruning}>
              <Trash2 className="w-3 h-3 mr-1" />
              {pruning ? "Pruning…" : "Prune Expired"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={reload}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={exportCsv} disabled={!logs.length}>
            <Download className="w-3 h-3 mr-1" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by action, person or record"
            className="h-7 text-[12px] pl-7"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
          Keep logs for
          <AutoInput
            type="number"
            min={30}
            className="w-16"
            value={setting("audit.retention_days") ?? 365}
            disabled={!isAdmin}
            onSave={(v) =>
              Number(v) >= 30 ? saveSetting("audit.retention_days", Number(v)) : toast.error("Minimum 30 days")
            }
          />
          days
        </div>
      </div>
      <div className="overflow-x-auto iris-scrollbar">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-2 px-2 font-semibold">Action</th>
              <th className="text-left py-2 px-2 font-semibold">By</th>
              <th className="text-left py-2 px-2 font-semibold">Record</th>
              <th className="text-left py-2 px-2 font-semibold">IP</th>
              <th className="text-right py-2 px-2 font-semibold">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30">
                <td className="py-1.5 px-2 font-mono text-[11px]">{l.action}</td>
                <td className="py-1.5 px-2">{l.actor}</td>
                <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground">
                  {l.entity_type}
                  {l.entity_id ? ` · ${l.entity_id}` : ""}
                </td>
                <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground">{l.ip ?? "—"}</td>
                <td className="py-1.5 px-2 text-right text-[11px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[12px] text-muted-foreground">
                  No audit entries{q ? " match that filter" : " yet"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  );
}
