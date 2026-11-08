"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bug, Eye, Gauge, ImagePlus, Lightbulb, Loader2, MessageSquareWarning, PenLine, Send, X, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/iris/live-data";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";

const KINDS = [
  { id: "bug", label: "Something is broken", icon: Bug },
  { id: "visual", label: "Looks wrong", icon: Eye },
  { id: "performance", label: "Too slow", icon: Gauge },
  { id: "idea", label: "Idea / request", icon: Lightbulb },
  { id: "content", label: "Wrong wording or data", icon: PenLine },
  { id: "other", label: "Something else", icon: HelpCircle },
] as const;
const SEVERITIES = [
  { id: "blocker", label: "Blocker", hint: "I can't work" },
  { id: "high", label: "High", hint: "Painful workaround" },
  { id: "normal", label: "Normal", hint: "" },
  { id: "low", label: "Low", hint: "Cosmetic" },
] as const;
const MAX = 3 * 1024 * 1024;

/** Header button + dialog: report a problem or idea about IRIS itself, straight to the developer. */
export function FeedbackButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Send feedback to the developer"
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <MessageSquareWarning className="w-3.5 h-3.5" /><span className="hidden lg:inline">Feedback</span>
      </button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const currentView = useAppStore((s) => s.currentView);
  const [kind, setKind] = React.useState<(typeof KINDS)[number]["id"]>("bug");
  const [severity, setSeverity] = React.useState<(typeof SEVERITIES)[number]["id"]>("normal");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [shot, setShot] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const reset = () => { setKind("bug"); setSeverity("normal"); setTitle(""); setDescription(""); setShot(null); };

  const readImage = (file: File | null | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast.error("Attach a PNG, JPEG or WebP image");
    if (file.size > MAX) return toast.error("Screenshot is over 3 MB");
    const r = new FileReader();
    r.onload = () => setShot(String(r.result));
    r.readAsDataURL(file);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ ref: string; emailed: boolean }>("/api/feedback", {
        method: "POST",
        json: {
          kind, severity, title, description, screenshot: shot,
          context: {
            view: currentView,
            url: window.location.href,
            viewport: `${window.innerWidth}×${window.innerHeight}`,
            userAgent: navigator.userAgent,
            theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
            at: new Date().toISOString(),
          },
        },
      });
      toast.success(`Sent as ${r.ref}. Thank you - the developer has it.`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="block w-[calc(100vw-2rem)] sm:max-w-[620px] p-0 gap-0 overflow-hidden"
        onPaste={(e) => readImage([...e.clipboardData.files].find((f) => f.type.startsWith("image/")))}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-[17px]">Feedback for the developer</DialogTitle>
          <DialogDescription className="text-[12px]">
            Goes straight to the developer, not into the ticket queue. The screen you're on and your browser are added automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto iris-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Type">
            {KINDS.map((k) => (
              <button key={k.id} role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
                className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] text-left transition-colors",
                  kind === k.id ? "border-primary bg-primary/[.07] text-foreground" : "border-border text-muted-foreground hover:bg-muted/50")}>
                <k.icon className={cn("w-4 h-4 shrink-0", kind === k.id && "text-primary")} />{k.label}
              </button>
            ))}
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5">How much is it getting in the way?</div>
            <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Severity">
              {SEVERITIES.map((s) => (
                <button key={s.id} role="radio" aria-checked={severity === s.id} onClick={() => setSeverity(s.id)}
                  className={cn("h-8 px-3 rounded-full border text-[12px] transition-colors",
                    severity === s.id ? (s.id === "blocker" ? "bg-rose-600 border-rose-600 text-white" : "bg-primary border-primary text-primary-foreground") : "border-border text-muted-foreground hover:bg-muted/50")}>
                  {s.label}{s.hint && <span className="opacity-70"> · {s.hint}</span>}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">Short title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reports export button does nothing on Safari" className="mt-1 h-9 text-[13px]" maxLength={160} />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">What happened, and what did you expect?</span>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1 text-[13px]"
              placeholder="Steps to get there, what you saw, what should have happened." />
          </label>
          <div>
            {shot ? (
              <div className="relative rounded-xl border border-border overflow-hidden">
                <img src={shot} alt="Attached screenshot" className="w-full max-h-56 object-contain bg-muted/40" />
                <button onClick={() => setShot(null)} aria-label="Remove screenshot" className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground cursor-pointer hover:bg-muted/40">
                <ImagePlus className="w-4 h-4" /> Attach a screenshot, or paste one (⌘V) anywhere in this window
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => readImage(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={busy || title.trim().length < 4 || description.trim().length < 10}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}Send to developer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
