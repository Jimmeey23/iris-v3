"use client";

import * as React from "react";
import { FlaskConical, LogOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/iris/live-data";
import { useAppStore } from "@/lib/iris/store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SandboxState = {
  configured: boolean;
  active: boolean;
  isAdmin: boolean;
  stats: { total: number; open: number; checks: number } | null;
};

let cached: SandboxState | null = null;
const listeners = new Set<(s: SandboxState) => void>();

async function load(): Promise<SandboxState> {
  const s = await api<SandboxState>("/api/sandbox");
  cached = s;
  listeners.forEach((l) => l(s));
  return s;
}

/** Training sandbox state for admins (shared across components). */
export function useSandbox() {
  const tier = useAppStore((s) => s.currentUser.tier);
  const [state, setState] = React.useState<SandboxState | null>(cached);
  React.useEffect(() => {
    listeners.add(setState);
    if (tier === "admin" && !cached) load().catch(() => {});
    return () => void listeners.delete(setState);
  }, [tier]);
  return state;
}

/** Switches the sandbox on/off, then reloads so every screen reads from the right database. */
export async function setSandbox(enabled: boolean) {
  try {
    await api("/api/sandbox", { method: "POST", json: { enabled } });
    // The selected ticket and view belong to the other database.
    useAppStore.setState({ selectedTicketId: null, currentView: "overview" } as never);
    window.location.assign("/");
  } catch (e) {
    toast.error((e as Error).message);
  }
}

/** Striped banner shown on every screen while an admin is in the training sandbox. */
export function SandboxBanner() {
  const s = useSandbox();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!s?.active) return null;

  const reset = async () => {
    setBusy(true);
    try {
      const r = await api<{ created: string[]; recurrenceChecks: number }>("/api/sandbox", { method: "POST", json: { action: "reset" } });
      toast.success(`Sandbox reset: ${r.created.length} mock tickets, ${r.recurrenceChecks} recurrence checks raised`);
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <div
        role="status"
        className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 sm:px-5 py-2 border-b border-amber-500/40 text-amber-950 dark:text-amber-100"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(245,158,11,.22) 0 14px, rgba(245,158,11,.12) 14px 28px)" }}
      >
        <FlaskConical className="w-4 h-4 shrink-0" />
        <div className="text-[12px] leading-snug min-w-0 flex-1">
          <span className="font-semibold uppercase tracking-wide">Training sandbox</span>
          <span className="opacity-80"> · Practice data only. Nothing you do here changes real tickets, and no emails or WhatsApp messages are sent.</span>
          {s.stats && (
            <span className="opacity-70"> {s.stats.total} tickets · {s.stats.open} open · {s.stats.checks} recurrence checks</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-[11px] bg-background/70" onClick={() => setConfirm(true)} disabled={busy}>
            <RotateCcw className="w-3 h-3 mr-1" />{busy ? "Resetting…" : "Reset mock data"}
          </Button>
          <Button size="sm" className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setSandbox(false)} disabled={busy}>
            <LogOut className="w-3 h-3 mr-1" />Exit sandbox
          </Button>
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the training sandbox?</AlertDialogTitle>
            <AlertDialogDescription>
              Every ticket in the sandbox is deleted and the mock set is created again, including recurrence checks.
              People, templates and settings are refreshed from the real IRIS. The real database is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Reset sandbox</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Account-menu entry: enter/exit the training sandbox (admins only). */
export function SandboxMenuItem() {
  const s = useSandbox();
  if (!s?.isAdmin || !s.configured) return null;
  return (
    <button
      type="button"
      onClick={() => setSandbox(!s.active)}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] hover:bg-muted/60"
    >
      <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
      {s.active ? "Exit training sandbox" : "Training sandbox"}
      {!s.active && <span className="ml-auto text-[9px] text-muted-foreground">Admin</span>}
    </button>
  );
}
