"use client";

import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, KeyRound, Loader2, ServerCog, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/iris/live-data";

type Field = { key: string; label: string; secret: boolean; source: "env" | "saved" | null; value?: string };
type Info = { fields: Field[]; docs: string | null; help: string | null; envPrefix: string | null; decryptError?: string | null; vaultReady: boolean };

/**
 * Credential form for one integration. Secrets are write-only: the server says
 * whether each is set (and whether by the deployment or in Settings) but never
 * returns the value. Environment variables win over saved values.
 */
export function IntegrationCredentials({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [info, setInfo] = React.useState<Info | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setInfo(await api<Info>(`/api/settings/integrations/credentials?id=${encodeURIComponent(id)}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load credentials");
    }
  }, [id]);
  React.useEffect(() => { void Promise.resolve().then(load); }, [load]);

  if (!info) {
    return <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Loading…</div>;
  }
  if (!info.fields.length) {
    return <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground">This connection is configured by the deployment; there's nothing to enter here.</div>;
  }

  const send = async (values: Record<string, string | null>, message: string) => {
    setBusy(true);
    try {
      const r = await api<{ fields: Field[] }>("/api/settings/integrations/credentials", { method: "PUT", json: { id, values } });
      setInfo((i) => (i ? { ...i, fields: r.fields, decryptError: null } : i));
      setDraft({});
      toast.success(message);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const dirty = Object.values(draft).some((v) => v.trim() !== "");

  return (
    <div className="pt-2.5 border-t border-border/60 space-y-2.5">
      {!info.vaultReady && (
        <div className="text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-1.5">
          Saving is off until INTEGRATION_ENCRYPTION_KEY (64 hex characters) is set on the server. Environment variables still work.
        </div>
      )}
      {info.decryptError && <div className="text-[11px] rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1.5">{info.decryptError}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {info.fields.map((f) => (
          <label key={f.key} className="block">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1">
              {f.secret && <KeyRound className="w-2.5 h-2.5" />}
              {f.label}
              {f.source === "env" && <span className="ml-auto flex items-center gap-0.5 text-sky-600 dark:text-sky-400" title={`${info.envPrefix}_${f.key.toUpperCase()}`}><ServerCog className="w-2.5 h-2.5" />from server</span>}
              {f.source === "saved" && <span className="ml-auto text-emerald-600 dark:text-emerald-400">saved</span>}
            </div>
            <Input
              type={f.secret ? "password" : "text"}
              autoComplete="off"
              spellCheck={false}
              disabled={f.source === "env" || !info.vaultReady}
              value={draft[f.key] ?? ""}
              placeholder={f.source === "env" ? "Set by the deployment" : f.source === "saved" ? (f.secret ? "•••••••• (leave blank to keep)" : f.value ?? "") : ""}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              className="h-7 text-[12px] font-mono"
            />
          </label>
        ))}
      </div>
      {info.help && <p className="text-[10.5px] text-muted-foreground leading-relaxed">{info.help}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" className="h-7 text-[11px]" disabled={!dirty || busy || !info.vaultReady} onClick={() => send(draft, "Credentials saved - run Test to verify")}>
          {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}Save credentials
        </Button>
        {info.fields.some((f) => f.source === "saved") && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-rose-600 hover:text-rose-700" disabled={busy}
            onClick={() => window.confirm("Remove the credentials saved in Settings for this integration? Server environment values are not affected.") &&
              send(Object.fromEntries(info.fields.filter((f) => f.source === "saved").map((f) => [f.key, null])), "Saved credentials removed")}>
            <Trash2 className="w-3 h-3 mr-1" />Remove saved
          </Button>
        )}
        {info.docs && (
          <a href={info.docs} target="_blank" rel="noopener noreferrer" className="ml-auto text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            API docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
