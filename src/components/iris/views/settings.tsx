"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon, Users, Building2, MapPin, Clock, Shield, Brain, Bell, Plug, Database, GitBranch,
  ChevronRight, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle, Download, KeyRound, Lock, RefreshCw, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api, reloadReference } from "@/lib/iris/live-data";
import { PRIORITY_CONFIG, type Priority } from "@/lib/iris/types";
import { CATEGORY_MAP } from "@/lib/iris/iris-constants";
import { MultiSelect } from "@/components/iris/multi-select";

// ─────────────────────────────────────────────────────────────────────────────
// Data + saving
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, any>;
type Bundle = {
  departments: Row[]; studios: Row[]; employees: Row[]; sla_definitions: Row[]; routing_rules: Row[];
  ai_models: Row[]; notification_rules: Row[]; roles: Row[]; integrations: Row[]; app_settings: Row[];
  audit_log: Row[]; users: Row[]; me: { tier: "admin" | "manager" | "executive"; userId: string };
};
type Resource = Exclude<keyof Bundle, "app_settings" | "audit_log" | "me">;

const PK: Record<Resource, string> = {
  departments: "code", studios: "code", employees: "id", sla_definitions: "priority", routing_rules: "id",
  ai_models: "id", notification_rules: "event", roles: "name", integrations: "id", users: "id",
};
/** Tables the rest of the app reads as lookup data. */
const REFERENCE: Resource[] = ["departments", "studios", "employees", "sla_definitions"];

type SaveState = "idle" | "saving" | "saved" | "error";

type Ctx = {
  data: Bundle;
  canEdit: boolean;
  isAdmin: boolean;
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
      setData(await api<Bundle>("/api/settings"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load settings");
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

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
        if (r === "ai_models" && changes.is_primary === true) list = list.map((x) => (x.id === key ? x : { ...x, is_primary: false }));
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
      setData((d) =>
        d && {
          ...d,
          [r]: r === "employees"
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
        app_settings: exists ? d.app_settings.map((s) => (s.key === key ? { ...s, value } : s)) : [...d.app_settings, { key, value }],
      };
    });
    try {
      await track(() => api("/api/settings", { method: "PUT", json: { key, value } }));
    } catch (e) {
      setData(before);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  };

  return { data, error, saveState, load, patch, create, remove, setting, saveSetting };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small auto-saving inputs
// ─────────────────────────────────────────────────────────────────────────────

/** Text/number input that saves when it loses focus (or on Enter) if the value changed. */
function AutoInput({
  value, onSave, type = "text", className, placeholder, disabled, min, step, suggestions,
}: {
  /** Known values offered as a dropdown; free text is still accepted. */
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
  const [v, setV] = React.useState(initial);
  const listId = React.useId();
  React.useEffect(() => setV(initial), [initial]);
  const commit = () => {
    if (v.trim() === initial.trim()) return;
    if (type === "number" && v.trim() !== "" && !Number.isFinite(Number(v))) {
      setV(initial);
      return;
    }
    onSave(v.trim());
  };
  return (
    <>
    {suggestions && (
      <datalist id={listId}>{suggestions.map((x) => <option key={x} value={x} />)}</datalist>
    )}
    <Input
      list={suggestions ? listId : undefined}
      type={type}
      value={v}
      min={min}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setV(initial);
      }}
      className={cn("h-7 text-[12px]", className)}
    />
    </>
  );
}

function NativeSelect({
  value, onChange, options, disabled, className,
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
        <option key={o.value} value={o.value}>{o.label}</option>
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

function SettingsCard({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="iris-card overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{title}</div>
          {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function IconButton({ onClick, label, danger, disabled, children }: { onClick: () => void; label: string; danger?: boolean; disabled?: boolean; children: React.ReactNode }) {
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

/** Inline "add" form shown under a card's header. */
function AddForm({ open, onCancel, onSubmit, children }: { open: boolean; onCancel: () => void; onSubmit: () => Promise<boolean>; children: React.ReactNode }) {
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
        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={onCancel}>Cancel</Button>
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
      <Plus className="w-3 h-3 mr-1" />{label}
    </Button>
  );
}

const deptOptions = (d: Bundle) => d.departments.map((x) => ({ value: x.code, label: `${x.name} (${x.code})` }));
const studioOptions = (d: Bundle) => d.studios.map((x) => ({ value: x.code, label: `${x.name} (${x.code})` }));
const CITIES = ["Mumbai", "Bengaluru"];
const AVAILABILITY = ["available", "busy", "offline", "on_leave"];
const KNOWN_EVENTS = [
  "Ticket created", "Ticket assigned", "Ticket in progress", "Awaiting response", "Ticket escalated", "SLA approaching",
  "SLA breached", "Ticket resolved", "Ticket reopened", "Ticket closed", "New comment", "Owner added", "Department added",
];
const KNOWN_PERMISSIONS = [
  "all", "tickets.all", "tickets.department", "tickets.create", "tickets.view", "tickets.view.own", "reports.all",
  "reports.department", "settings.limited", "settings.system", "memberships.read", "memberships.write", "users.manage",
];
const AI_MODELS: Record<string, string[]> = {
  Anthropic: ["Claude Sonnet 4", "Claude Haiku", "Claude Opus"],
  OpenAI: ["GPT-4o", "GPT-4o-mini"],
};
const AI_PURPOSES = ["Primary Conversational", "Classification & Extraction", "Investigation & Reasoning", "Summarization", "Fallback (auto)"];
const withCurrent = (opts: string[], cur?: string | null) => {
  const list = cur && !opts.includes(cur) ? [cur, ...opts] : opts;
  return list.map((v) => ({ value: v, label: v }));
};

// ── Routing condition builder ────────────────────────────────────────────────
type Clause = { field: string; op: string; value: string };
const COND_FIELDS: Record<string, { label: string; values: (d: Bundle) => string[] }> = {
  category: { label: "Category", values: () => Object.keys(CATEGORY_MAP) },
  subcategory: { label: "Subcategory", values: () => Object.values(CATEGORY_MAP).flat() },
  source: { label: "Source", values: () => ["manual", "ai_assistant", "email", "webhook", "form_intake", "voice", "Momence"] },
  studio: { label: "Studio", values: (d) => d.studios.map((x) => x.code) },
  "studio.city": { label: "Studio city", values: () => CITIES },
  department: { label: "Department", values: (d) => d.departments.map((x) => x.code) },
  priority: { label: "Ticket priority", values: () => ["P0", "P1", "P2", "P3"] },
  "client.tier": { label: "Client tier", values: () => ["VIP", "Standard"] },
};
const parseCondition = (c: string): Clause[] =>
  c.split(/\s+AND\s+/i).map((part) => {
    const m = part.trim().match(/^([\w.]+)\s*(>=|<=|=)\s*(.*)$/);
    return m ? { field: m[1], op: m[2], value: m[3] } : { field: "category", op: "=", value: "" };
  });
const serializeCondition = (cl: Clause[]) => cl.filter((c) => c.value).map((c) => `${c.field}${c.op}${c.value}`).join(" AND ");

function ConditionBuilder({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { data } = useS();
  const clauses = value.trim() ? parseCondition(value) : [];
  const commit = (next: Clause[]) => onChange(serializeCondition(next));
  const fieldOpts = (cur: string) =>
    withCurrent(Object.keys(COND_FIELDS), cur).map((o) => ({ value: o.value, label: COND_FIELDS[o.value]?.label ?? o.value }));
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
      {clauses.map((c, i) => {
        const vals = COND_FIELDS[c.field]?.values(data) ?? [];
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[9px] font-semibold text-muted-foreground w-7">AND</span>}
            {i === 0 && clauses.length > 1 && <span className="w-7" />}
            <NativeSelect value={c.field} disabled={disabled} options={fieldOpts(c.field)}
              onChange={(f) => commit(clauses.map((x, j) => (j === i ? { field: f, op: "=", value: COND_FIELDS[f]?.values(data)[0] ?? "" } : x)))} />
            <NativeSelect value={c.op} disabled={disabled} options={(c.field === "priority" ? ["=", ">="] : ["="]).map((v) => ({ value: v, label: v }))}
              onChange={(op) => commit(clauses.map((x, j) => (j === i ? { ...x, op } : x)))} />
            <NativeSelect className="flex-1 min-w-[120px]" value={c.value} disabled={disabled}
              options={withCurrent(vals, c.value || null)}
              onChange={(v) => commit(clauses.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
            <button type="button" aria-label="Remove condition" disabled={disabled}
              className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-40"
              onClick={() => commit(clauses.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></button>
          </div>
        );
      })}
      <button type="button" disabled={disabled}
        className="self-start text-[11px] text-primary hover:underline disabled:opacity-40"
        onClick={() => onChange(`${value.trim() ? value.trim() + " AND " : ""}category=${Object.keys(CATEGORY_MAP)[0]}`)}>
        + {clauses.length ? "Add condition" : "Add first condition"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_SECTIONS = [
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

export function SettingsView() {
  const [activeSection, setActiveSection] = React.useState<(typeof SETTINGS_SECTIONS)[number]["id"]>("departments");
  const s = useSettingsData();

  if (s.error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="iris-card p-6 text-center space-y-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
          <div className="text-[13px]">{s.error}</div>
          <Button size="sm" onClick={s.load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
        </div>
      </div>
    );
  }
  if (!s.data) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />Loading settings…
      </div>
    );
  }

  const tier = s.data.me.tier;
  const ctx: Ctx = {
    data: s.data,
    canEdit: tier === "admin" || tier === "manager",
    isAdmin: tier === "admin",
    patch: s.patch,
    create: s.create,
    remove: s.remove,
    setting: s.setting,
    saveSetting: s.saveSetting,
    reload: s.load,
  };

  return (
    <SettingsCtx.Provider value={ctx}>
      <div className="p-6 max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
              <SettingsIcon className="w-3 h-3 text-primary" />
              System Configuration
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Changes save automatically to the IRIS database.
              {!ctx.isAdmin && " Some sections are admin-only, so they're read-only for you."}
            </p>
          </div>
          <SaveIndicator state={s.saveState} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <div className="iris-card overflow-hidden h-fit lg:sticky lg:top-0">
            <div className="p-2 space-y-0.5">
              {SETTINGS_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] font-medium transition-colors",
                    activeSection === sec.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <sec.icon className="w-3.5 h-3.5" />
                  {sec.label}
                  <ChevronRight className={cn("w-3 h-3 ml-auto", activeSection === sec.id ? "opacity-100" : "opacity-0")} />
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
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
      {state === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving…</>}
      {state === "saved" && <><CheckCircle2 className="w-3 h-3" />All changes saved</>}
      {state === "error" && <><AlertTriangle className="w-3 h-3" />Last change not saved</>}
    </div>
  );
}

function ReadOnlyNote({ show, text = "Only admins can change this section." }: { show: boolean; text?: string }) {
  if (!show) return null;
  return (
    <div className="mb-3 p-2.5 rounded-md bg-muted/40 border border-border flex items-center gap-2 text-[11px] text-muted-foreground">
      <Lock className="w-3.5 h-3.5 shrink-0" />{text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────

function DepartmentsSettings() {
  const { data, isAdmin, patch, create, remove } = useS();
  const [adding, setAdding] = React.useState(false);
  const [n, setN] = React.useState({ code: "", name: "", description: "" });
  return (
    <SettingsCard
      title="Departments"
      description="Departments tickets are routed to"
      action={<AddButton label="Add Department" onClick={() => setAdding(true)} disabled={!isAdmin} />}
    >
      <ReadOnlyNote show={!isAdmin} />
      <AddForm open={adding} onCancel={() => { setAdding(false); setN({ code: "", name: "", description: "" }); }} onSubmit={() => create("departments", { ...n, code: n.code.toUpperCase() })}>
        <Field label="Code (e.g. FAC)"><Input className="h-7 text-[12px]" required maxLength={6} value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} /></Field>
        <Field label="Name"><Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field>
        <Field label="Description"><Input className="h-7 text-[12px]" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} /></Field>
      </AddForm>
      <div className="space-y-2">
        {data.departments.map((d) => {
          const staff = data.employees.filter((e) => e.department_code === d.code && e.is_active).length;
          return (
            <div key={d.code} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">{d.code}</Badge>
              <AutoInput className="w-48" value={d.name} disabled={!isAdmin} onSave={(v) => v && patch("departments", d.code, { name: v })} />
              <AutoInput className="flex-1 min-w-[200px]" value={d.description} placeholder="Description" disabled={!isAdmin} onSave={(v) => patch("departments", d.code, { description: v })} />
              <NativeSelect
                className="w-40"
                value={d.head_employee_id ?? ""}
                disabled={!isAdmin}
                onChange={(v) => patch("departments", d.code, { head_employee_id: v || null })}
                options={[{ value: "", label: "No head" }, ...data.employees.filter((e) => e.is_active).map((e) => ({ value: e.id, label: e.name }))]}
              />
              <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5", staff === 0 && "text-amber-600")}>{staff} staff</Badge>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch checked={d.is_active} disabled={!isAdmin} onCheckedChange={(v) => patch("departments", d.code, { is_active: v })} />Active
              </label>
              <IconButton label={`Delete ${d.name}`} danger disabled={!isAdmin} onClick={() => remove("departments", d.code, d.name)}>
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
  const { data, canEdit, patch, create, remove } = useS();
  const [adding, setAdding] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const blank = { name: "", email: "", role: "", department_code: data.departments[0]?.code ?? "", location: "Mumbai", studio_codes: [] as string[], reporting_manager: "" };
  const [n, setN] = React.useState(blank);
  const roleSuggestions = [...new Set([...data.roles.map((r) => r.name), ...data.employees.map((e) => e.role).filter(Boolean)])].sort();
  const managerOptions = [{ value: "", label: "No manager" }, ...data.employees.filter((e) => e.is_active).map((e) => ({ value: e.name, label: e.name }))];
  const list = data.employees.filter(
    (e) => (showInactive || e.is_active) && (!q || `${e.name} ${e.email} ${e.role}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <SettingsCard
      title="Employees"
      description="Staff records used for routing, workload and assignment. Managers can edit their own department."
      action={<AddButton label="Add Employee" onClick={() => setAdding(true)} disabled={!canEdit} />}
    >
      <ReadOnlyNote show={!canEdit} text="Only managers and admins can edit employees." />
      <AddForm open={adding} onCancel={() => { setAdding(false); setN(blank); }} onSubmit={() => create("employees", n)}>
        <Field label="Full name"><Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field>
        <Field label="Work email"><Input type="email" className="h-7 text-[12px]" required value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} /></Field>
        <Field label="Role / title"><AutoInput className="w-full" suggestions={roleSuggestions} value={n.role} onSave={(v) => setN({ ...n, role: v })} placeholder="Pick or type a role" /></Field>
        <Field label="Department">
          <NativeSelect className="w-full" value={n.department_code} onChange={(v) => setN({ ...n, department_code: v })} options={deptOptions(data)} />
        </Field>
        <Field label="Location"><NativeSelect className="w-full" value={n.location} onChange={(v) => setN({ ...n, location: v })} options={withCurrent(CITIES, n.location)} /></Field>
        <Field label="Studios"><MultiSelect size="md" value={n.studio_codes} onChange={(v) => setN({ ...n, studio_codes: v })} options={studioOptions(data)} placeholder="All / none" /></Field>
        <Field label="Reporting manager"><NativeSelect className="w-full" value={n.reporting_manager} onChange={(v) => setN({ ...n, reporting_manager: v })} options={managerOptions} /></Field>
      </AddForm>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff" className="h-7 text-[12px] pl-7" />
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />Show inactive
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
              <th className="py-2 px-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((e) => (
              <tr key={e.id} className={cn(!e.is_active && "opacity-50")}>
                <td className="py-1.5 px-1.5 w-[260px]">
                  <AutoInput value={e.name} disabled={!canEdit} onSave={(v) => v && patch("employees", e.id, { name: v })} />
                  <AutoInput type="email" className="mt-1 text-[11px] text-muted-foreground" value={e.email} disabled={!canEdit} onSave={(v) => v && patch("employees", e.id, { email: v })} />
                </td>
                <td className="py-1.5 px-1.5"><AutoInput suggestions={roleSuggestions} value={e.role} disabled={!canEdit} onSave={(v) => v && patch("employees", e.id, { role: v })} /></td>
                <td className="py-1.5 px-1.5">
                  <NativeSelect value={e.department_code} disabled={!canEdit} onChange={(v) => patch("employees", e.id, { department_code: v })} options={deptOptions(data)} />
                </td>
                <td className="py-1.5 px-1.5 w-[190px]">
                  <MultiSelect value={e.studio_codes ?? []} options={studioOptions(data)} placeholder="None" disabled={!canEdit} onChange={(v) => patch("employees", e.id, { studio_codes: v })} />
                </td>
                <td className="py-1.5 px-1.5">
                  <NativeSelect value={e.reporting_manager ?? ""} disabled={!canEdit} options={withCurrent(managerOptions.map((o) => o.value), e.reporting_manager).map((o) => ({ value: o.value, label: o.value || "No manager" }))} onChange={(v) => patch("employees", e.id, { reporting_manager: v || null })} />
                </td>
                <td className="py-1.5 px-1.5">
                  <NativeSelect
                    value={e.availability}
                    disabled={!canEdit}
                    onChange={(v) => patch("employees", e.id, { availability: v })}
                    options={AVAILABILITY.map((v) => ({ value: v, label: v.replace("_", " ") }))}
                  />
                </td>
                <td className="py-1.5 px-1.5">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="tabular-nums text-[11px] text-muted-foreground">{e.workload} /</span>
                    <AutoInput type="number" min={1} className="w-14" value={e.max_workload} disabled={!canEdit} onSave={(v) => patch("employees", e.id, { max_workload: v })} />
                  </div>
                </td>
                <td className="py-1.5 px-1.5 text-right">
                  {e.is_active ? (
                    <IconButton label={`Deactivate ${e.name}`} danger disabled={!canEdit} onClick={() => remove("employees", e.id, e.name)}>
                      <Trash2 className="w-3 h-3" />
                    </IconButton>
                  ) : (
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" disabled={!canEdit} onClick={() => patch("employees", e.id, { is_active: true })}>Restore</Button>
                  )}
                </td>
              </tr>
            ))}
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
      description="Physique 57 India studio locations"
      action={<AddButton label="Add Studio" onClick={() => setAdding(true)} disabled={!isAdmin} />}
    >
      <ReadOnlyNote show={!isAdmin} />
      <AddForm open={adding} onCancel={() => { setAdding(false); setN(blank); }} onSubmit={() => create("studios", { ...n, code: n.code.toUpperCase() })}>
        <Field label="Code (e.g. KH)"><Input className="h-7 text-[12px]" required maxLength={6} value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} /></Field>
        <Field label="Name"><Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field>
        <Field label="City">
          <NativeSelect className="w-full" value={n.city} onChange={(v) => setN({ ...n, city: v })} options={[{ value: "Mumbai", label: "Mumbai" }, { value: "Bengaluru", label: "Bengaluru" }]} />
        </Field>
        <Field label="Address" className="md:col-span-3"><Input className="h-7 text-[12px]" value={n.address} onChange={(e) => setN({ ...n, address: e.target.value })} /></Field>
      </AddForm>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.studios.map((s) => (
          <div key={s.code} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">{s.code}</Badge>
              <AutoInput className="flex-1" value={s.name} disabled={!isAdmin} onSave={(v) => v && patch("studios", s.code, { name: v })} />
              <IconButton label={`Delete ${s.name}`} danger disabled={!isAdmin} onClick={() => remove("studios", s.code, s.name)}>
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
            <AutoInput value={s.address} placeholder="Address" disabled={!isAdmin} onSave={(v) => patch("studios", s.code, { address: v })} />
            <div className="flex items-center gap-2">
              <NativeSelect value={s.city} disabled={!isAdmin} onChange={(v) => patch("studios", s.code, { city: v })} options={[{ value: "Mumbai", label: "Mumbai" }, { value: "Bengaluru", label: "Bengaluru" }]} />
              <Field label="" className="flex-1">
                <AutoInput type="number" placeholder="Momence location id" value={s.momence_location_id} disabled={!isAdmin} onSave={(v) => patch("studios", s.code, { momence_location_id: v })} />
              </Field>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch checked={s.is_active} disabled={!isAdmin} onCheckedChange={(v) => patch("studios", s.code, { is_active: v })} />Active
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
  const hours: Record<string, string> = setting("sla.business_hours") ?? {};
  const mins = (v: string) => (Number(v) > 0 ? v : null);
  return (
    <>
      <SettingsCard title="SLA Targets" description="Response and resolution targets per priority, in minutes. New and reprioritised tickets use these.">
        <ReadOnlyNote show={!isAdmin} />
        <div className="space-y-3">
          {data.sla_definitions.map((d) => {
            const cfg = PRIORITY_CONFIG[d.priority as Priority];
            return (
              <div key={d.priority} className={cn("p-3 rounded-lg border ring-1", cfg?.bg, cfg?.ring)}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn("text-[14px] font-bold", cfg?.text)}>{d.priority}</span>
                  <AutoInput className="w-48" value={d.name} disabled={!isAdmin} onSave={(v) => v && patch("sla_definitions", d.priority, { name: v })} />
                  <AutoInput className="flex-1" value={d.description} disabled={!isAdmin} onSave={(v) => v && patch("sla_definitions", d.priority, { description: v })} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label="First response (mins)">
                    <AutoInput type="number" min={1} value={d.response_target_mins} disabled={!isAdmin} onSave={(v) => mins(v) && patch("sla_definitions", d.priority, { response_target_mins: v })} />
                  </Field>
                  <Field label="Resolution (mins)">
                    <AutoInput type="number" min={1} value={d.resolution_target_mins} disabled={!isAdmin} onSave={(v) => mins(v) && patch("sla_definitions", d.priority, { resolution_target_mins: v })} />
                  </Field>
                  <Field label="Escalate after (mins)">
                    <AutoInput type="number" min={1} value={d.escalation_threshold_mins} disabled={!isAdmin} onSave={(v) => mins(v) && patch("sla_definitions", d.priority, { escalation_threshold_mins: v })} />
                  </Field>
                  <label className="flex items-end gap-1.5 text-[11px] pb-1.5">
                    <Switch checked={d.business_hours_only} disabled={!isAdmin} onCheckedChange={(v) => patch("sla_definitions", d.priority, { business_hours_only: v })} />
                    Business hours only
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Business Hours" description='Per day, like "09:00-21:00", or "Closed". Timezone: Asia/Kolkata.'>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {DAYS.map((day) => (
            <Field key={day} label={day}>
              <AutoInput
                value={hours[day] ?? ""}
                disabled={!isAdmin}
                placeholder="09:00-21:00"
                onSave={(v) => {
                  if (v && v.toLowerCase() !== "closed" && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(v)) {
                    toast.error(`Use HH:MM-HH:MM or "Closed" for ${day}`);
                    return;
                  }
                  return saveSetting("sla.business_hours", { ...hours, [day]: v.toLowerCase() === "closed" ? "Closed" : v || "Closed" });
                }}
              />
            </Field>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

const ROUTE_PRIORITIES = ["Auto", "Critical", "High", "Medium", "Low"].map((v) => ({ value: v, label: v }));

function RoutingSettings() {
  const { data, isAdmin, patch, create, remove, setting, saveSetting } = useS();
  const [adding, setAdding] = React.useState(false);
  const blank = { name: "", condition: "category=" + Object.keys(CATEGORY_MAP)[0], department_code: "", priority: "Auto" };
  const [n, setN] = React.useState(blank);
  const depts = [{ value: "", label: "Any department" }, ...deptOptions(data)];
  return (
    <>
      <SettingsCard title="Assignment" description="How new tickets get an owner">
        <ReadOnlyNote show={!isAdmin} />
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[12px]">
            <Switch checked={setting("routing.auto_assign") !== false} disabled={!isAdmin} onCheckedChange={(v) => saveSetting("routing.auto_assign", v)} />
            Auto-assign new tickets to the least-loaded available person in the department
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <Switch checked={setting("routing.require_acknowledgment") !== false} disabled={!isAdmin} onCheckedChange={(v) => saveSetting("routing.require_acknowledgment", v)} />
            Require the assignee to acknowledge new tickets
          </label>
        </div>
      </SettingsCard>
      <SettingsCard
        title="Routing Rules"
        description="Applied in order (lowest number first). All conditions in a rule must match"
        action={<AddButton label="Add Rule" onClick={() => setAdding(true)} disabled={!isAdmin} />}
      >
        <AddForm open={adding} onCancel={() => { setAdding(false); setN(blank); }} onSubmit={() => create("routing_rules", { ...n, department_code: n.department_code || null })}>
          <Field label="Rule name"><Input className="h-7 text-[12px]" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field>
          <Field label="Condition (all must match)" className="md:col-span-2"><ConditionBuilder value={n.condition} onChange={(v) => setN({ ...n, condition: v })} /></Field>
          <Field label="Route to"><NativeSelect className="w-full" value={n.department_code} onChange={(v) => setN({ ...n, department_code: v })} options={depts} /></Field>
          <Field label="Priority"><NativeSelect className="w-full" value={n.priority} onChange={(v) => setN({ ...n, priority: v })} options={ROUTE_PRIORITIES} /></Field>
        </AddForm>
        <div className="space-y-2">
          {data.routing_rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-md border border-border">
              <Switch checked={r.is_active} disabled={!isAdmin} onCheckedChange={(v) => patch("routing_rules", r.id, { is_active: v })} aria-label="Active" />
              <AutoInput type="number" className="w-14" value={r.sort_order} disabled={!isAdmin} onSave={(v) => patch("routing_rules", r.id, { sort_order: v })} />
              <AutoInput className="w-56" value={r.name} disabled={!isAdmin} onSave={(v) => v && patch("routing_rules", r.id, { name: v })} />
              <ConditionBuilder value={r.condition} disabled={!isAdmin} onChange={(v) => v && patch("routing_rules", r.id, { condition: v })} />
              <NativeSelect value={r.department_code ?? ""} disabled={!isAdmin} onChange={(v) => patch("routing_rules", r.id, { department_code: v || null })} options={depts} />
              <NativeSelect value={r.priority} disabled={!isAdmin} onChange={(v) => patch("routing_rules", r.id, { priority: v })} options={ROUTE_PRIORITIES} />
              <IconButton label={`Delete ${r.name}`} danger disabled={!isAdmin} onClick={() => remove("routing_rules", r.id, r.name)}>
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
          ))}
          {!data.routing_rules.length && <div className="text-[12px] text-muted-foreground">No rules yet.</div>}
        </div>
      </SettingsCard>
    </>
  );
}

function AIModelSettings() {
  const { data, isAdmin, patch, create, remove, setting, saveSetting } = useS();
  const [adding, setAdding] = React.useState(false);
  const blank = { provider: "Anthropic", model: "", purpose: "", temperature: "0.5", max_tokens: "4096" };
  const [n, setN] = React.useState(blank);
  const num = (key: string, v: string, min = 0) => {
    const x = Number(v);
    if (!Number.isFinite(x) || x < min) return toast.error("Enter a valid number");
    return saveSetting(key, x);
  };
  return (
    <>
      <SettingsCard
        title="AI Models"
        description="Models IRIS uses per task. Exactly one can be primary."
        action={<AddButton label="Add Model" onClick={() => setAdding(true)} disabled={!isAdmin} />}
      >
        <ReadOnlyNote show={!isAdmin} />
        <AddForm open={adding} onCancel={() => { setAdding(false); setN(blank); }} onSubmit={() => create("ai_models", n)}>
          <Field label="Provider"><NativeSelect className="w-full" value={n.provider} onChange={(v) => setN({ ...n, provider: v })} options={["Anthropic", "OpenAI"].map((v) => ({ value: v, label: v }))} /></Field>
          <Field label="Model id"><Input className="h-7 text-[12px] font-mono" required placeholder="claude-sonnet-5-5" value={n.model} onChange={(e) => setN({ ...n, model: e.target.value })} /></Field>
          <Field label="Used for"><Input className="h-7 text-[12px]" required placeholder="Summarization" value={n.purpose} onChange={(e) => setN({ ...n, purpose: e.target.value })} /></Field>
          <Field label="Temperature (0–2)"><Input type="number" step={0.1} min={0} max={2} className="h-7 text-[12px]" value={n.temperature} onChange={(e) => setN({ ...n, temperature: e.target.value })} /></Field>
          <Field label="Max tokens"><Input type="number" min={1} className="h-7 text-[12px]" value={n.max_tokens} onChange={(e) => setN({ ...n, max_tokens: e.target.value })} /></Field>
        </AddForm>
        <div className="space-y-2">
          {data.ai_models.map((m) => (
            <div key={m.id} className={cn("p-3 rounded-lg border", m.is_primary ? "border-primary/40 bg-primary/5" : "border-border")}>
              <div className="flex flex-wrap items-center gap-2">
                <Brain className={cn("w-4 h-4", m.provider === "OpenAI" ? "text-emerald-500" : "text-orange-500")} />
                <NativeSelect value={m.provider} disabled={!isAdmin} onChange={(v) => patch("ai_models", m.id, { provider: v })} options={["Anthropic", "OpenAI"].map((v) => ({ value: v, label: v }))} />
                <NativeSelect className="w-52" value={m.model} disabled={!isAdmin} options={withCurrent(AI_MODELS[m.provider] ?? [], m.model)} onChange={(v) => patch("ai_models", m.id, { model: v })} />
                <NativeSelect className="flex-1 min-w-[160px]" value={m.purpose} disabled={!isAdmin} options={withCurrent(AI_PURPOSES, m.purpose)} onChange={(v) => patch("ai_models", m.id, { purpose: v })} />
                {m.is_primary ? (
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5 bg-primary/10 text-primary border-primary/30">PRIMARY</Badge>
                ) : (
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" disabled={!isAdmin} onClick={() => patch("ai_models", m.id, { is_primary: true })}>Make primary</Button>
                )}
                <Switch checked={m.is_active} disabled={!isAdmin} onCheckedChange={(v) => patch("ai_models", m.id, { is_active: v })} aria-label="Active" />
                <IconButton label={`Delete ${m.model}`} danger disabled={!isAdmin || m.is_primary} onClick={() => remove("ai_models", m.id, `${m.provider} ${m.model}`)}>
                  <Trash2 className="w-3 h-3" />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm">
                <Field label="Temperature (0–2)">
                  <AutoInput type="number" step={0.1} min={0} value={m.temperature} disabled={!isAdmin} onSave={(v) => (Number(v) >= 0 && Number(v) <= 2 ? patch("ai_models", m.id, { temperature: v }) : toast.error("Temperature must be 0–2"))} />
                </Field>
                <Field label="Max tokens">
                  <AutoInput type="number" min={1} value={m.max_tokens} disabled={!isAdmin} onSave={(v) => (Number(v) > 0 ? patch("ai_models", m.id, { max_tokens: v }) : toast.error("Must be above 0"))} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="AI Behaviour & Spending" description="Limits and defaults for the AI assistant">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Daily token limit"><AutoInput type="number" min={0} value={setting("ai.daily_token_limit")} disabled={!isAdmin} onSave={(v) => num("ai.daily_token_limit", v)} /></Field>
          <Field label="Monthly budget (USD)"><AutoInput type="number" min={0} value={setting("ai.monthly_budget_usd")} disabled={!isAdmin} onSave={(v) => num("ai.monthly_budget_usd", v)} /></Field>
          <Field label="Alert at (% of budget)"><AutoInput type="number" min={1} value={setting("ai.alert_threshold_pct")} disabled={!isAdmin} onSave={(v) => num("ai.alert_threshold_pct", v, 1)} /></Field>
          <Field label="Min. confidence to auto-route (%)"><AutoInput type="number" min={0} value={setting("ai.confidence_threshold")} disabled={!isAdmin} onSave={(v) => num("ai.confidence_threshold", v)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-[12px] mt-3">
          <Switch checked={setting("ai.auto_investigate") !== false} disabled={!isAdmin} onCheckedChange={(v) => saveSetting("ai.auto_investigate", v)} />
          Let the assistant investigate automatically (Momence lookups, similar tickets)
        </label>
      </SettingsCard>
    </>
  );
}

function NotificationsSettings() {
  const { data, isAdmin, patch, create, remove, setting, saveSetting } = useS();
  const [adding, setAdding] = React.useState(false);
  const [event, setEvent] = React.useState("");
  const channels = [
    { key: "notifications.in_app_enabled", label: "In-app" },
    { key: "notifications.email_enabled", label: "Email" },
    { key: "notifications.whatsapp_enabled", label: "WhatsApp" },
  ];
  return (
    <>
      <SettingsCard title="Channels" description="Switch a channel off to stop every notification on it">
        <ReadOnlyNote show={!isAdmin} />
        <div className="flex flex-wrap gap-6">
          {channels.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-[12px]">
              <Switch checked={setting(c.key) !== false} disabled={!isAdmin} onCheckedChange={(v) => saveSetting(c.key, v)} />{c.label}
            </label>
          ))}
        </div>
      </SettingsCard>
      <SettingsCard
        title="Events"
        description="Which events notify on which channel"
        action={<AddButton label="Add Event" onClick={() => setAdding(true)} disabled={!isAdmin} />}
      >
        <AddForm open={adding} onCancel={() => { setAdding(false); setEvent(""); }} onSubmit={() => (event ? create("notification_rules", { event, in_app: true }) : Promise.resolve(false))}>
          <Field label="Event" className="md:col-span-3">
            <NativeSelect className="w-full" value={event} onChange={setEvent}
              options={[{ value: "", label: "Select an event…" }, ...KNOWN_EVENTS.filter((k) => !data.notification_rules.some((r) => r.event === k)).map((v) => ({ value: v, label: v }))]} />
          </Field>
        </AddForm>
        <div className="space-y-2">
          {data.notification_rules.map((n) => (
            <div key={n.event} className="flex flex-wrap items-center gap-3 p-2.5 rounded-md border border-border">
              <div className="flex-1 text-[12px] font-medium">{n.event}</div>
              {(["in_app", "email", "whatsapp"] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-1.5 text-[11px]">
                  <Switch checked={n[ch]} disabled={!isAdmin} onCheckedChange={(v) => patch("notification_rules", n.event, { [ch]: v })} />
                  {ch === "in_app" ? "In-app" : ch === "email" ? "Email" : "WhatsApp"}
                </label>
              ))}
              <IconButton label={`Delete ${n.event}`} danger disabled={!isAdmin} onClick={() => remove("notification_rules", n.event, n.event)}>
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
  const { data, isAdmin, patch } = useS();
  return (
    <SettingsCard title="Integrations" description="Turn integrations on or off and set how often they sync. API keys live in the server environment, never in the database or the browser.">
      <ReadOnlyNote show={!isAdmin} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.integrations.map((i) => (
          <div key={i.id} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-start gap-2">
              <Plug className={cn("w-4 h-4 mt-0.5", i.is_enabled ? "text-emerald-500" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold">{i.name}</span>
                  {i.category && <Badge variant="outline" className="text-[9px] h-4 px-1">{i.category}</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground">{i.description}</div>
              </div>
              <Switch checked={i.is_enabled} disabled={!isAdmin} onCheckedChange={(v) => patch("integrations", i.id, { is_enabled: v, status: v ? "enabled" : "disconnected" })} aria-label={`Enable ${i.name}`} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Sync every</span>
              <AutoInput type="number" min={5} className="w-16" value={i.sync_interval_mins} disabled={!isAdmin} onSave={(v) => (Number(v) >= 5 ? patch("integrations", i.id, { sync_interval_mins: v }) : toast.error("Minimum 5 minutes"))} />
              <span>mins</span>
              <span className="ml-auto">
                {i.last_synced_at ? `Last sync ${new Date(i.last_synced_at).toLocaleString()}` : "Never synced"}
              </span>
            </div>
          </div>
        ))}
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
  const permOptions = [...new Set([...KNOWN_PERMISSIONS, ...data.roles.flatMap((x) => x.permissions ?? [])])].sort().map((v) => ({ value: v, label: v }));
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
      window.prompt(`Temporary password for ${user.email} (copy it now, it won't be shown again). They must change it on next sign-in.`, pw);
    }
  };

  return (
    <>
      <SettingsCard
        title="User Accounts"
        description="Who can sign in to IRIS, and with what access"
        action={<AddButton label="Add Login" onClick={() => { setU({ employee_id: "", email: "", password: tempPassword(), role: "executive" }); setAddingUser(true); }} disabled={!isAdmin} />}
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
                if (ok) window.prompt(`Account created. Temporary password for ${u.email} (copy it now). They must change it on first sign-in.`, u.password);
                return ok;
              }}
            >
              <Field label="Employee">
                <NativeSelect
                  className="w-full"
                  value={u.employee_id}
                  onChange={(v) => setU({ ...u, employee_id: v, email: data.employees.find((e) => e.id === v)?.email ?? u.email })}
                  options={[{ value: "", label: "Not linked" }, ...empOptions.map((e) => ({ value: e.id, label: e.name }))]}
                />
              </Field>
              <Field label="Sign-in email"><Input type="email" required className="h-7 text-[12px]" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} /></Field>
              <Field label="Access"><NativeSelect className="w-full" value={u.role} onChange={(v) => setU({ ...u, role: v })} options={TIERS} /></Field>
              <Field label="Temporary password (10+ chars)" className="md:col-span-3">
                <Input required minLength={10} className="h-7 text-[12px] font-mono" value={u.password} onChange={(e) => setU({ ...u, password: e.target.value })} />
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
                          <div className="font-medium">{x.name ?? x.email}{self && <span className="text-muted-foreground"> (you)</span>}</div>
                          <div className="text-[10px] text-muted-foreground">{x.email}{x.must_change_password && " · must set password"}</div>
                        </td>
                        <td className="py-1.5 px-1.5">
                          <NativeSelect value={x.role} disabled={self} onChange={(v) => patch("users", x.id, { role: v })} options={TIERS} />
                        </td>
                        <td className="py-1.5 px-1.5 text-[11px] text-muted-foreground">{x.last_login_at ? new Date(x.last_login_at).toLocaleString() : "Never"}</td>
                        <td className="py-1.5 px-1.5">
                          <Switch checked={x.is_active} disabled={self} onCheckedChange={(v) => patch("users", x.id, { is_active: v })} aria-label="Active" />
                        </td>
                        <td className="py-1.5 px-1.5 text-right">
                          <Button variant="outline" size="sm" className="h-6 text-[10px]" disabled={self} onClick={() => resetPassword(x)}>
                            <KeyRound className="w-3 h-3 mr-1" />Reset password
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
        description="Job roles and the access tier each one maps to"
        action={<AddButton label="Add Role" onClick={() => setAddingRole(true)} disabled={!isAdmin} />}
      >
        <AddForm open={addingRole} onCancel={() => { setAddingRole(false); setR({ name: "", access_tier: "executive", permissions: [] }); }} onSubmit={() => create("roles", r)}>
          <Field label="Role name"><Input required className="h-7 text-[12px]" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
          <Field label="Access tier"><NativeSelect className="w-full" value={r.access_tier} onChange={(v) => setR({ ...r, access_tier: v })} options={TIERS} /></Field>
          <Field label="Permissions"><MultiSelect size="md" value={r.permissions} onChange={(v) => setR({ ...r, permissions: v })} options={permOptions} placeholder="None" /></Field>
        </AddForm>
        <div className="space-y-2">
          {data.roles.map((role) => (
            <div key={role.name} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border">
              <div className="w-44 text-[12px] font-semibold">{role.name}</div>
              <NativeSelect value={role.access_tier} disabled={!isAdmin} onChange={(v) => patch("roles", role.name, { access_tier: v })} options={TIERS} />
              <div className="flex-1 min-w-[220px]"><MultiSelect value={role.permissions ?? []} options={permOptions} placeholder="No permissions" disabled={!isAdmin} onChange={(v) => patch("roles", role.name, { permissions: v })} /></div>
              <IconButton label={`Delete ${role.name}`} danger disabled={!isAdmin} onClick={() => remove("roles", role.name, role.name)}>
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
    const a = Object.assign(document.createElement("a"), { href: url, download: `iris-audit-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <SettingsCard
      title="Audit Log"
      description="Latest 300 recorded actions (sign-ins, edits to tickets and settings)"
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={reload}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={exportCsv} disabled={!logs.length}><Download className="w-3 h-3 mr-1" />Export CSV</Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action, person or record" className="h-7 text-[12px] pl-7" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
          Keep logs for
          <AutoInput type="number" min={30} className="w-16" value={setting("audit.retention_days")} disabled={!isAdmin} onSave={(v) => (Number(v) >= 30 ? saveSetting("audit.retention_days", Number(v)) : toast.error("Minimum 30 days"))} />
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
                <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground">{l.entity_type}{l.entity_id ? ` · ${l.entity_id}` : ""}</td>
                <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground">{l.ip ?? "—"}</td>
                <td className="py-1.5 px-2 text-right text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr><td colSpan={5} className="py-6 text-center text-[12px] text-muted-foreground">No audit entries{q ? " match that filter" : " yet"}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  );
}
