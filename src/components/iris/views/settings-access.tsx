"use client";


import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Globe2,
  KeyRound,
  Loader2,
  LockOpen,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  UserPlus,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/iris/multi-select";
import { api } from "@/lib/iris/live-data";

type Row = Record<string, any>;

export type AccessProps = {
  data: { users: Row[]; employees: Row[]; studios: Row[]; app_settings: Row[]; me: { userId: string; tier: string } };
  patch: (r: "users", key: string, changes: Row) => Promise<boolean>;
  create: (r: "users", row: Row) => Promise<boolean>;
  setting: (key: string) => any;
  saveSetting: (key: string, value: unknown) => Promise<void>;
};

const TIERS = [
  { value: "executive", label: "Executive" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "admin", label: "Admins" },
  { id: "manager", label: "Managers" },
  { id: "executive", label: "Executives" },
  { id: "never", label: "Never signed in" },
  { id: "locked", label: "Locked" },
  { id: "inactive", label: "Inactive" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function Card({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
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

function Select({ value, onChange, options, disabled, className, label }: {
  value: string | null | undefined; onChange: (v: string) => void; options: { value: string; label: string }[];
  disabled?: boolean; className?: string; label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-7 px-2 text-[12px] rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60", className)}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function initials(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function ago(iso: string | null) {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  const days = Math.round(mins / 1440);
  return days < 60 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(14);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => chars[x % chars.length]).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Users & Access
// ─────────────────────────────────────────────────────────────────────────────

export function UsersAccessSettings({ data, patch, create, setting, saveSetting }: AccessProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterId>("all");
  const [adding, setAdding] = React.useState(false);
  const users = data.users;

  const weekAgo = Date.now() - 7 * 86400000;
  const stats = [
    { label: "Accounts", value: users.length },
    { label: "Active", value: users.filter((u) => u.is_active).length },
    { label: "Signed in · 7d", value: users.filter((u) => u.last_login_at && new Date(u.last_login_at).getTime() > weekAgo).length },
    { label: "Google linked", value: users.filter((u) => u.has_google).length },
    { label: "Locked", value: users.filter((u) => u.is_locked).length, warn: true },
  ];

  const q = query.trim().toLowerCase();
  const visible = users.filter((u) => {
    if (q && ![u.name, u.email, u.username].some((v) => String(v ?? "").toLowerCase().includes(q))) return false;
    switch (filter) {
      case "admin": case "manager": case "executive": return u.role === filter && u.is_active;
      case "never": return !u.last_login_at;
      case "locked": return u.is_locked;
      case "inactive": return !u.is_active;
      default: return true;
    }
  });

  const linked = new Set(users.map((u) => u.employee_id).filter(Boolean));
  const studioOptions = data.studios.filter((s) => s.is_active).map((s) => ({ value: s.code, label: s.name }));

  const resetPassword = async (u: Row) => {
    if (!window.confirm(`Reset the password for ${u.email}? They'll be signed out everywhere.`)) return;
    const pw = tempPassword();
    if (await patch("users", u.id, { password: pw })) {
      window.prompt(`Temporary password for ${u.email} - copy it now, it won't be shown again. They must change it at next sign-in.`, pw);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="iris-card rounded-xl border border-border/70 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{s.label}</div>
            <div className={cn("text-2xl font-semibold tabular-nums mt-1", s.warn && s.value > 0 && "text-amber-600 dark:text-amber-400")}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card
        title="Accounts"
        description="Everyone who can sign in, how they sign in, and what they can reach. Deactivating someone signs them out everywhere at once."
        action={
          <Button size="sm" className="h-8 text-[12px]" onClick={() => setAdding((v) => !v)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />Add login
          </Button>
        }
      >
        {adding && <AddLogin data={data} linked={linked} create={create} onDone={() => setAdding(false)} />}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or username" aria-label="Search accounts" className="h-8 pl-9 text-[12px]" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter accounts">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                  filter === f.id ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted/60",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto iris-scrollbar -mx-1">
          <table className="w-full text-[12px] min-w-[980px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Person</th>
                <th className="text-left py-2 px-2 font-semibold">Sign-in</th>
                <th className="text-left py-2 px-2 font-semibold">Access</th>
                <th className="text-left py-2 px-2 font-semibold">Employee record</th>
                <th className="text-left py-2 px-2 font-semibold">Studios covered</th>
                <th className="text-left py-2 px-2 font-semibold">Last seen</th>
                <th className="text-left py-2 px-2 font-semibold">Active</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((u) => {
                const self = u.id === data.me.userId;
                const name = u.name ?? u.email;
                const empOptions = [
                  { value: "", label: "Not linked" },
                  ...data.employees
                    .filter((e) => e.is_active && (e.id === u.employee_id || !linked.has(e.id)))
                    .map((e) => ({ value: e.id, label: e.name })),
                ];
                return (
                  <tr key={u.id} className={cn("align-top", !u.is_active && "opacity-50")}>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">{initials(name)}</div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{name}{self && <span className="text-muted-foreground font-normal"> (you)</span>}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                          <UsernameField user={u} patch={patch} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {u.auth_provider !== "google" && <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Password</span>}
                        {u.has_google && <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px]">Google</span>}
                        {u.is_locked && <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px]">Locked</span>}
                        {u.must_change_password && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">Must set password</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <Select label={`Access for ${name}`} value={u.role} disabled={self} onChange={(v) => patch("users", u.id, { role: v })} options={TIERS} />
                    </td>
                    <td className="py-2.5 px-2">
                      <Select label={`Employee record for ${name}`} className="max-w-[170px]" value={u.employee_id} onChange={(v) => patch("users", u.id, { employee_id: v || null })} options={empOptions} />
                    </td>
                    <td className="py-2.5 px-2 min-w-[180px]">
                      <MultiSelect value={u.studios ?? []} options={studioOptions} placeholder="None" onChange={(v) => patch("users", u.id, { studios: v })} />
                    </td>
                    <td className="py-2.5 px-2 text-[11px] text-muted-foreground whitespace-nowrap">
                      {ago(u.last_login_at)}
                      {u.active_sessions > 0 && <div className="text-[10px]">{u.active_sessions} live session{u.active_sessions > 1 ? "s" : ""}</div>}
                    </td>
                    <td className="py-2.5 px-2">
                      <Switch checked={u.is_active} disabled={self} onCheckedChange={(v) => patch("users", u.id, { is_active: v })} aria-label={`${name} active`} />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex justify-end gap-1">
                        {u.is_locked && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Unlock" aria-label={`Unlock ${name}`} onClick={() => patch("users", u.id, { unlock: true })}>
                            <LockOpen className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Sign out everywhere" aria-label={`Sign ${name} out everywhere`} disabled={self || !u.active_sessions}
                          onClick={() => window.confirm(`Sign ${name} out on every device?`) && patch("users", u.id, { revoke_sessions: true })}>
                          <LogOut className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset password" aria-label={`Reset password for ${name}`} disabled={self} onClick={() => resetPassword(u)}>
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No accounts match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SignInPolicy setting={setting} saveSetting={saveSetting} />
    </>
  );
}

function UsernameField({ user, patch }: { user: Row; patch: AccessProps["patch"] }) {
  const [value, setValue] = React.useState(user.username ?? "");
  const save = () => {
    const next = value.trim().toLowerCase();
    if (next === (user.username ?? "")) return;
    void patch("users", user.id, { username: next || null }).then((ok) => { if (!ok) setValue(user.username ?? ""); });
  };
  return (
    <div className="flex items-center text-[10px] text-muted-foreground">
      <span>@</span>
      <input
        aria-label={`Username for ${user.email}`}
        value={value}
        placeholder="username"
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="bg-transparent outline-none focus:text-foreground w-28 placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

function AddLogin({ data, linked, create, onDone }: { data: AccessProps["data"]; linked: Set<string>; create: AccessProps["create"]; onDone: () => void }) {
  const [form, setForm] = React.useState({ employee_id: "", email: "", role: "executive", password: tempPassword() });
  const [busy, setBusy] = React.useState(false);
  const options = [{ value: "", label: "Not linked" }, ...data.employees.filter((e) => e.is_active && !linked.has(e.id)).map((e) => ({ value: e.id, label: e.name }))];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await create("users", { ...form, email: form.email.trim().toLowerCase() });
    setBusy(false);
    if (ok) {
      window.prompt(`Account created. Temporary password for ${form.email} - copy it now. They must change it at first sign-in, or they can use Google.`, form.password);
      onDone();
    }
  };
  return (
    <form onSubmit={submit} className="mb-5 grid gap-3 sm:grid-cols-4 items-end rounded-xl border border-dashed border-border p-4 bg-muted/20">
      <label className="block"><div className="text-[10px] font-medium text-muted-foreground mb-1">Employee</div>
        <Select label="Employee" className="w-full" value={form.employee_id} options={options}
          onChange={(v) => setForm({ ...form, employee_id: v, email: data.employees.find((e) => e.id === v)?.email ?? form.email })} />
      </label>
      <label className="block"><div className="text-[10px] font-medium text-muted-foreground mb-1">Sign-in email</div>
        <Input type="email" required className="h-7 text-[12px]" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label className="block"><div className="text-[10px] font-medium text-muted-foreground mb-1">Access</div>
        <Select label="Access" className="w-full" value={form.role} options={TIERS} onChange={(v) => setForm({ ...form, role: v })} />
      </label>
      <label className="block"><div className="text-[10px] font-medium text-muted-foreground mb-1">Temporary password</div>
        <Input required minLength={10} className="h-7 text-[12px] font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      <div className="sm:col-span-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create login"}</Button>
      </div>
    </form>
  );
}

function listToText(v: unknown) {
  return Array.isArray(v) ? v.join(", ") : "";
}

function SignInPolicy({ setting, saveSetting }: Pick<AccessProps, "setting" | "saveSetting">) {
  const [domains, setDomains] = React.useState(() => listToText(setting("auth.allowed_domains")));
  const [emails, setEmails] = React.useState(() => listToText(setting("auth.allowed_emails")));
  const [google, setGoogle] = React.useState<{ configured: boolean; redirectUri: string } | null>(null);

  React.useEffect(() => {
    api<{ configured: boolean; redirectUri: string }>("/api/auth/google/status").then(setGoogle).catch(() => setGoogle(null));
  }, []);

  const save = (key: string, text: string, kind: "domain" | "email") => {
    const items = [...new Set(text.split(/[\s,]+/).map((x) => x.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))];
    const bad = items.find((x) => (kind === "domain" ? !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x) : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)));
    if (bad) return toast.error(`"${bad}" isn't a valid ${kind}`);
    void saveSetting(key, items);
  };

  return (
    <Card title="Sign-in policy" description="Who may create their own account with Google. Everyone else needs an admin to add a login above.">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="text-[11px] font-medium mb-1">Approved email domains</div>
          <Input value={domains} placeholder="physique57india.com, physique57mumbai.com" className="h-8 text-[12px]"
            onChange={(e) => setDomains(e.target.value)} onBlur={() => save("auth.allowed_domains", domains, "domain")} />
          <div className="text-[10px] text-muted-foreground mt-1">Active employees with these domains can join with Google. Empty uses the server default.</div>
        </label>
        <label className="block">
          <div className="text-[11px] font-medium mb-1">Approved individual addresses</div>
          <Input value={emails} placeholder="someone@gmail.com" className="h-8 text-[12px]"
            onChange={(e) => setEmails(e.target.value)} onBlur={() => save("auth.allowed_emails", emails, "email")} />
          <div className="text-[10px] text-muted-foreground mt-1">For people outside the approved domains. Still must be an active employee.</div>
        </label>
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-[11px]">
        <Globe2 className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
        {google === null ? (
          <span className="text-muted-foreground">Checking Google sign-in…</span>
        ) : google.configured ? (
          <span><span className="font-semibold text-emerald-600 dark:text-emerald-400">Google sign-in is on.</span> Redirect URI: <code className="font-mono">{google.redirectUri}</code></span>
        ) : (
          <span><span className="font-semibold text-amber-600 dark:text-amber-400">Google sign-in is off.</span> Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, and add <code className="font-mono">{google.redirectUri}</code> as an authorised redirect URI.</span>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

type Issue = { id: string; severity: "error" | "warning"; area: string; title: string; detail: string; section: string };

export function HealthSettings({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [state, setState] = React.useState<{ issues: Issue[]; checkedAt: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await api<{ issues: Issue[]; checkedAt: string }>("/api/settings/health"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't run the checks");
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { void Promise.resolve().then(run); }, [run]);

  const errors = state?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warnings = (state?.issues.length ?? 0) - errors;

  return (
    <Card
      title="Configuration health"
      description="Checks the rules that keep tickets moving - routing, escalation, SLA, access, delivery - and points to the section that fixes each problem."
      action={
        <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}Re-run checks
        </Button>
      }
    >
      {error && <div role="alert" className="text-[12px] rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-2 mb-3">{error}</div>}
      {state && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-[12px]">
            {state.issues.length === 0 ? (
              <span className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" />Everything checks out.</span>
            ) : (
              <>
                <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400"><ShieldAlert className="w-4 h-4" />{errors} problem{errors === 1 ? "" : "s"}</span>
                <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400"><AlertTriangle className="w-4 h-4" />{warnings} warning{warnings === 1 ? "" : "s"}</span>
              </>
            )}
            <span className="text-muted-foreground ml-auto text-[11px]">Checked {new Date(state.checkedAt).toLocaleTimeString()}</span>
          </div>
          <ul className="space-y-2">
            {state.issues.map((i) => (
              <li key={i.id} className={cn("flex items-start gap-3 rounded-xl border p-3",
                i.severity === "error" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                {i.severity === "error"
                  ? <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                  : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold">{i.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{i.detail}</div>
                  <div className="text-[10px] uppercase tracking-[.12em] text-muted-foreground/70 mt-1">{i.area}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] shrink-0" onClick={() => onNavigate(i.section)}>
                  <Wrench className="w-3 h-3 mr-1" />Fix
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
