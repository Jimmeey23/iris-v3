"use client";

import * as React from "react";
import { Loader2, Lock, Eye, AlertTriangle, RefreshCw } from "lucide-react";
import { IrisLogo } from "./iris-logo";
import { IrisLoadingScreen } from "./intro-animation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, loadAll } from "@/lib/iris/live-data";
import { loadLibrary } from "@/lib/iris/library-api";
import { useAppStore, type CurrentUser } from "@/lib/iris/store";

type Me = {
  userId: string;
  email: string;
  tier: CurrentUser["tier"];
  mustChangePassword: boolean;
  employeeId: string | null;
  name: string;
  role: string;
  departmentCode: string | null;
};

type Phase = "checking" | "login" | "change_password" | "loading" | "ready" | "error";

const AuthContext = React.createContext<{ signOut: () => Promise<void>; refresh: () => Promise<void> }>({
  signOut: async () => {},
  refresh: async () => {},
});
export const useAuth = () => React.useContext(AuthContext);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [error, setError] = React.useState<string | null>(null);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const boot = React.useCallback(async () => {
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_IRIS_PREVIEW_MODE === "true") {
      setCurrentUser({ id: "preview", userId: "preview", email: "", name: "Preview User", role: "Preview", tier: "executive", departmentCode: null });
      setPhase("ready");
      return;
    }
    setError(null);
    let me: Me;
    try {
      me = (await api<{ user: Me }>("/api/auth/me", { signal: AbortSignal.timeout(12000) })).user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase("login");
      else {
        setError("We couldn't connect to the workspace. Check the server and database configuration, then try again.");
        setPhase("error");
      }
      return;
    }
    setCurrentUser({
      id: me.employeeId ?? me.userId,
      userId: me.userId,
      email: me.email,
      name: me.name,
      role: me.role,
      tier: me.tier,
      departmentCode: me.departmentCode,
    });
    if (me.mustChangePassword) {
      setPhase("change_password");
      return;
    }
    setPhase("loading");
    try {
      await Promise.race([
        loadAll(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("The workspace took too long to respond. Please try again.")), 15000)),
      ]);
      void loadLibrary(); // templates + knowledge docs; non-blocking, falls back to built-in defaults
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load data");
      setPhase("error");
    }
  }, [setCurrentUser]);

  React.useEffect(() => {
    boot();
    const onSignedOut = () => {
      if (!(process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_IRIS_PREVIEW_MODE === "true")) setPhase("login");
    };
    window.addEventListener("iris:signed-out", onSignedOut);
    return () => window.removeEventListener("iris:signed-out", onSignedOut);
  }, [boot]);

  const signOut = React.useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setPhase("login");
  }, []);

  if (phase === "ready") {
    return <AuthContext.Provider value={{ signOut, refresh: boot }}>{children}</AuthContext.Provider>;
  }

  if (phase === "checking" || phase === "loading") return <IrisLoadingScreen label={phase === "loading" ? "Loading your workspace" : "Checking your session"} />;

  return (
    <div className="iris-auth-screen min-h-screen flex items-center justify-center p-5">
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3 shadow-lg rounded-2xl"><IrisLogo size={48} /></div>
          <div className="text-lg font-semibold tracking-tight">IRIS</div>
          <div className="text-[12px] text-muted-foreground">Physique 57 India · Issue Resolution</div>
        </div>

        <div className="iris-card p-6 sm:p-8 shadow-2xl">
          {phase === "login" && <LoginForm onDone={boot} />}
          {phase === "change_password" && <ChangePasswordForm onDone={boot} onCancel={signOut} />}
          {phase === "error" && (
            <div className="space-y-3 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
              <div className="text-[13px]">{error}</div>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={boot}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
                <Button size="sm" variant="outline" onClick={signOut}>Sign out</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="text-[12px] rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-2">
      {message}
    </div>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="mb-5"><div className="text-[10px] font-bold tracking-[.18em] uppercase text-primary mb-2">Your workspace awaits</div><div className="text-xl font-semibold tracking-tight">Welcome back</div><p className="text-xs text-muted-foreground mt-2">Sign in to continue to your workspace.</p></div>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Work email</span>
        <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Password</span>
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">No account? Ask an IRIS admin to add you.</p>
    </form>
  );
}

function ChangePasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [oldPassword, setOld] = React.useState("");
  const [newPassword, setNew] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) return setError("Use at least 10 characters.");
    if (newPassword !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/change-password", { method: "POST", json: { oldPassword, newPassword } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-2 text-[14px] font-semibold"><Lock className="w-4 h-4" />Set a new password</div>
      <p className="text-[12px] text-muted-foreground">You need to replace your temporary password before continuing.</p>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Current password</span>
        <Input type="password" autoComplete="current-password" required value={oldPassword} onChange={(e) => setOld(e.target.value)} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">New password (10+ characters)</span>
        <Input type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNew(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Confirm new password</span>
        <Input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save password"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Sign out</Button>
      </div>
    </form>
  );
}
