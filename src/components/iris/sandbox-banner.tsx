"use client";

import * as React from "react";
import { Briefcase, FlaskConical, LogOut, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/iris/live-data";
import { useAppStore } from "@/lib/iris/store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type SandboxTier = "admin" | "manager" | "executive";

type SandboxState = {
  configured: boolean;
  active: boolean;
  isAdmin: boolean;
  tier: SandboxTier | null;
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

/**
 * Training sandbox state (shared across components). Loaded once the user is known,
 * whatever tier the UI shows: an admin practising as a manager still needs the controls.
 */
export function useSandbox() {
  const userId = useAppStore((s) => s.currentUser.userId);
  const [state, setState] = React.useState<SandboxState | null>(cached);
  React.useEffect(() => {
    listeners.add(setState);
    if (userId && userId !== "preview" && !cached) load().catch(() => {});
    return () => void listeners.delete(setState);
  }, [userId]);
  return state;
}

export const TIER_OPTIONS: { tier: SandboxTier; label: string; icon: typeof ShieldCheck; blurb: string }[] = [
  {
    tier: "admin",
    label: "Admin",
    icon: ShieldCheck,
    blurb: "Everything: every ticket in every studio, Settings, users, routing, SLA and templates.",
  },
  {
    tier: "manager",
    label: "Manager",
    icon: Briefcase,
    blurb: "Their department's and studios' tickets plus their own, digests and equipment updates. No admin Settings or user management.",
  },
  {
    tier: "executive",
    label: "Executive",
    icon: UserRound,
    blurb: "Front-line view: tickets they raised or own, plus their studios (or department). Raise, update and resolve.",
  },
];
export const tierLabel = (t: SandboxTier | null | undefined) => TIER_OPTIONS.find((o) => o.tier === t)?.label ?? "Admin";

/** Opens the "practise as" picker (rendered by SandboxBanner, which is always mounted). */
export function openSandboxTierPicker() {
  window.dispatchEvent(new Event("iris:sandbox-tier-picker"));
}

async function postSandbox(json: Record<string, unknown>) {
  await api("/api/sandbox", { method: "POST", json });
  // The selected ticket and view belong to the other database / access level.
  useAppStore.setState({ selectedTicketId: null, currentView: "overview" } as never);
  window.location.assign("/");
}

/** Enter the sandbox as `tier`, change tier while inside, or leave (tier omitted, enabled false). */
export async function setSandbox(enabled: boolean, tier?: SandboxTier) {
  try {
    if (!enabled) return await postSandbox({ enabled: false });
    if (cached?.active && tier) return await postSandbox({ tier });
    return await postSandbox({ enabled: true, tier: tier ?? "admin" });
  } catch (e) {
    toast.error((e as Error).message);
  }
}

/** Striped banner shown on every screen while an admin is in the training sandbox. */
export function SandboxBanner() {
  const s = useSandbox();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!s?.isAdmin || !s.configured) return null;
  if (!s.active) return <SandboxTierPicker active={false} current={null} />;

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
        <div className="text-[12px] leading-snug flex-1 min-w-[min(100%,20rem)]">
          <span className="font-semibold uppercase tracking-wide">Training sandbox</span>
          <span className="font-semibold"> · Practising as {tierLabel(s.tier)}</span>
          <span className="opacity-80"> · Practice data only. Nothing you do here changes real tickets, and no emails or WhatsApp messages are sent.</span>
          {s.stats && (
            <span className="opacity-70"> {s.stats.total} tickets · {s.stats.open} open · {s.stats.checks} recurrence checks</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-[11px] bg-background/70" onClick={openSandboxTierPicker} disabled={busy}>
            Change access level
          </Button>
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
      <SandboxTierPicker active current={s.tier} />
    </>
  );
}

/** "Practise as" dialog: pick the access level before entering, or switch it inside. */
function SandboxTierPicker({ active, current }: { active: boolean; current: SandboxTier | null }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<SandboxTier | null>(null);
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("iris:sandbox-tier-picker", onOpen);
    return () => window.removeEventListener("iris:sandbox-tier-picker", onOpen);
  }, []);

  const choose = async (tier: SandboxTier) => {
    setBusy(tier);
    await setSandbox(true, tier);
    setBusy(null); // only reached on failure; success reloads the page
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-600" />
            {active ? "Change access level" : "Enter the training sandbox"}
          </DialogTitle>
          <DialogDescription>
            Choose the access level to practise as. Every screen, button and ticket you can see in the sandbox
            follows that level exactly as it would in the real IRIS, using your own department and studios.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2" role="radiogroup" aria-label="Access level">
          {TIER_OPTIONS.map((o) => {
            const selected = o.tier === current;
            return (
              <button
                key={o.tier}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!!busy}
                onClick={() => choose(o.tier)}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/60 disabled:opacity-60 ${
                  selected ? "border-amber-500 bg-amber-500/10" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <o.icon className="w-4 h-4 text-amber-600" />
                  {o.label}
                  {selected && <span className="ml-auto text-[10px] font-normal text-muted-foreground">Current</span>}
                  {busy === o.tier && <span className="ml-auto text-[10px] font-normal text-muted-foreground">Switching…</span>}
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{o.blurb}</p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Practice data only: nothing changes real tickets and no emails or WhatsApp messages are sent.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Account-menu entry: enter/exit the training sandbox (admins only). */
export function SandboxMenuItem() {
  const s = useSandbox();
  if (!s?.isAdmin || !s.configured) return null;
  return (
    <button
      type="button"
      onClick={() => (s.active ? setSandbox(false) : openSandboxTierPicker())}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] hover:bg-muted/60"
    >
      <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
      {s.active ? `Exit training sandbox (${tierLabel(s.tier)})` : "Training sandbox…"}
      {!s.active && <span className="ml-auto text-[9px] text-muted-foreground">Admin</span>}
    </button>
  );
}
