"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, Sparkles, User, Calendar, Users, X, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MomenceSearchField } from "@/components/iris/momence-search-field";
import { useAppStore, type AgentTicketDraft, type IntakeState } from "@/lib/iris/store";
import { STUDIOS, STUDIO_MAP, DEPT_MAP, PRIORITY_CONFIG } from "@/lib/iris/types";

/** Which extra details each category needs before a ticket can be drafted. */
type Need = "required" | "optional";
const NEEDS: Record<string, { member?: Need; session?: Need; trainer?: Need; studio?: Need }> = {
  "Trainer Feedback": { trainer: "required", studio: "required", session: "optional", member: "optional" },
  "Class Experience": { studio: "required", session: "optional", member: "optional" },
  "Pricing and Memberships": { member: "required" },
  "Customer Service and Communication": { member: "optional", studio: "optional" },
  "Operating Systems": { member: "optional", studio: "optional" },
  Scheduling: { studio: "required", session: "optional" },
  "Repair and Maintenance": { studio: "required" },
  "Studio Amenities and Facilities": { studio: "required" },
  "Safety and Security": { studio: "required", member: "optional" },
  "Theft and Lost Items": { studio: "required", member: "optional" },
};
/** Subcategories that need more than their category default. */
const SUB_NEEDS: Record<string, { member?: Need; session?: Need; trainer?: Need; studio?: Need }> = {
  "Attendance Record Discrepancies": { member: "required", session: "optional" },
  "Stripe and Razorpay": { member: "required" },
  "Difficulty Tracking Sessions": { member: "required" },
  "Handling of Complaints": { member: "required", studio: "optional" },
  "Follow-up Post Inquiry": { member: "required" },
  "Front Desk Attitude": { member: "optional", studio: "required" },
  "Trainer Punctuality Issues": { trainer: "required", studio: "required", session: "required" },
  "Class Substitutions": { studio: "required", session: "required" },
  "Waitlist Concerns": { member: "required", session: "required" },
  "Handling of Medical Emergencies": { studio: "required", member: "required", session: "optional" },
  "Stolen Personal Items": { studio: "required", member: "optional" },
};
export const needsFor = (category: string | null, subcategory?: string | null) => ({
  ...(category ? NEEDS[category] ?? {} : {}),
  ...(subcategory ? SUB_NEEDS[subcategory] ?? {} : {}),
});

export function missingRequired(s: IntakeState) {
  const n = needsFor(s.category, s.subcategory);
  const out: string[] = [];
  if (!s.category) out.push("category");
  if (n.studio === "required" && !s.studioCode) out.push("studio");
  if (n.member === "required" && !s.member) out.push("member");
  if (n.trainer === "required" && !s.trainer) out.push("trainer");
  if (n.session === "required" && !s.session) out.push("class");
  return out;
}

/** Build the ticket draft from the form — deterministic, no AI. */
export function draftFromIntake(s: IntakeState): AgentTicketDraft {
  const studio = s.studioCode ? STUDIO_MAP[s.studioCode] : undefined;
  const who = s.member?.name ?? s.clientNameHint ?? undefined;
  const title =
    s.title ??
    [s.subcategory ?? s.category, s.trainer ? s.trainer.name : who, studio ? studio.name.split(",")[0] : null].filter(Boolean).join(" — ");
  const facts = [
    s.member && `Member: ${s.member.name} (${s.member.id})`,
    s.session && `Class: ${s.session.name}${s.session.subtitle ? ` · ${s.session.subtitle}` : ""} (${s.session.id})`,
    s.trainer && `Trainer: ${s.trainer.name}`,
    s.classFormat && !s.session && `Format: ${s.classFormat}`,
    s.when && `When: ${s.when}`,
    studio && `Studio: ${studio.name}`,
  ].filter(Boolean);
  return {
    title: title.slice(0, 200),
    description: [s.text.trim(), facts.length ? `\nDetails:\n${facts.map((f) => `• ${f}`).join("\n")}` : ""].join(""),
    category: s.category ?? "Miscellaneous",
    subcategory: s.subcategory ?? undefined,
    priority: s.priority,
    studioCode: s.studioCode ?? undefined,
    departmentCode: s.department ?? undefined,
    affectedClient: who,
    clientMomenceId: s.member?.id,
    bookingId: s.session?.id,
    tags: [s.category, s.subcategory, s.classFormat].filter(Boolean) as string[],
  };
}

const select =
  "h-8 px-2 text-[12px] rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 w-full";

function Row({ label, need, done, children }: { label: string; need?: Need; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2 items-start">
      <div className="text-[11px] text-muted-foreground pt-1.5 flex items-center gap-1">
        {label}
        {need === "required" && !done && <span className="text-rose-500" title="Required">*</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Picked({ icon: Icon, text, sub, onClear }: { icon: React.ComponentType<{ className?: string }>; text: string; sub?: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 text-[12px]">
      <Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="font-medium truncate">{text}</span>
      {sub && <span className="text-[10px] text-muted-foreground truncate">{sub}</span>}
      <button onClick={onClear} aria-label={`Change ${text}`} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function IntakeCard({
  messageId,
  state,
  onSubmit,
  onAskAi,
}: {
  messageId: string;
  state: IntakeState;
  onSubmit: (draft: AgentTicketDraft) => void;
  onAskAi: (state: IntakeState) => void;
}) {
  const update = useAppStore((s) => s.updateAIMessage);
  const set = (patch: Partial<IntakeState>) => update(messageId, { intake: { ...state, ...patch } });
  const cat = state.taxonomy.find((c) => c.category === state.category);
  const needs = needsFor(state.category, state.subcategory);
  const missing = missingRequired(state);
  const locked = state.done;

  const chooseCategory = (category: string, subcategory: string | null = null) => {
    const c = state.taxonomy.find((x) => x.category === category);
    const sub = subcategory ? c?.subcategories.find((s) => s.name === subcategory) : undefined;
    set({
      category,
      subcategory: sub?.name ?? null,
      department: sub?.department ?? c?.department ?? null,
      priority: state.prioritySuggested ? sub?.priority ?? state.priority : state.priority,
    });
  };

  return (
    <div>
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/30">
        <ClipboardList className="w-4 h-4 text-primary" />
        <div className="text-[12px] font-semibold">Here's what I picked up</div>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {state.detectedBy === "ai" ? "classified with AI" : "detected from your message"} · edit anything
        </span>
      </div>

      <div className={cn("p-4 space-y-2.5", locked && "opacity-60 pointer-events-none")}>
        {!state.category && state.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            <span className="text-[11px] text-muted-foreground w-full">Which fits best?</span>
            {state.suggestions.slice(0, 4).map((s) => (
              <button
                key={`${s.category}|${s.subcategory}`}
                onClick={() => chooseCategory(s.category, s.subcategory)}
                className="px-2.5 py-1 rounded-full border border-border text-[11px] hover:border-primary hover:bg-primary/5"
              >
                {s.subcategory ?? s.category}
              </button>
            ))}
          </div>
        )}

        <Row label="Category" need="required" done={!!state.category}>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select className={select} value={state.category ?? ""} onChange={(e) => e.target.value && chooseCategory(e.target.value)}>
                <option value="">Choose category…</option>
                {state.taxonomy.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </div>
            <select
              className={select}
              value={state.subcategory ?? ""}
              disabled={!cat}
              onChange={(e) => chooseCategory(state.category!, e.target.value || null)}
            >
              <option value="">{cat ? "Subcategory…" : "—"}</option>
              {cat?.subcategories.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </Row>

        {(needs.studio || state.studioCode) && (
          <Row label="Studio" need={needs.studio} done={!!state.studioCode}>
            <div className="flex flex-wrap gap-1.5">
              {STUDIOS.map((s) => (
                <button
                  key={s.code}
                  onClick={() => set({ studioCode: state.studioCode === s.code ? null : s.code })}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-[11px]",
                    state.studioCode === s.code ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50",
                  )}
                >
                  {s.name.split(",")[0]}
                </button>
              ))}
            </div>
          </Row>
        )}

        {needs.member && (
          <Row label="Member" need={needs.member} done={!!state.member}>
            {state.member ? (
              <Picked icon={User} text={state.member.name} sub={state.member.id} onClear={() => set({ member: null })} />
            ) : (
              <>
                {state.clientNameHint && <div className="text-[10px] text-muted-foreground mb-1">You mentioned “{state.clientNameHint}” — pick the right person:</div>}
                <MomenceSearchField
                  type="momence_member"
                  placeholder={state.clientNameHint ? `Search “${state.clientNameHint}” in Momence` : undefined}
                  onSelect={(e) => e.id && set({ member: { id: e.id, name: e.name } })}
                />
              </>
            )}
          </Row>
        )}

        {needs.trainer && (
          <Row label="Trainer" need={needs.trainer} done={!!state.trainer}>
            {state.trainer ? (
              <Picked icon={Users} text={state.trainer.name} onClear={() => set({ trainer: null })} />
            ) : (
              <>
                {state.trainerNameHint && (
                  <button
                    onClick={() => set({ trainer: { id: state.trainerNameHint!, name: state.trainerNameHint! } })}
                    className="mb-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/5 text-[11px] text-primary"
                  >
                    Use {state.trainerNameHint}
                  </button>
                )}
                <MomenceSearchField type="momence_trainer" onSelect={(e) => e.id && set({ trainer: { id: e.id, name: e.name } })} />
              </>
            )}
          </Row>
        )}

        {needs.session && (
          <Row label="Class" need={needs.session} done={!!state.session}>
            {state.session ? (
              <Picked icon={Calendar} text={state.session.name} sub={state.session.subtitle} onClear={() => set({ session: null })} />
            ) : (
              <MomenceSearchField
                type="momence_session"
                placeholder={state.classFormat ? `Search “${state.classFormat}” classes` : undefined}
                onSelect={(e) => e.id && set({ session: { id: e.id, name: e.name, subtitle: e.subtitle } })}
              />
            )}
          </Row>
        )}

        <Row label="Priority">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["P0", "P1", "P2", "P3"] as const).map((p) => (
              <button
                key={p}
                onClick={() => set({ priority: p, prioritySuggested: false })}
                title={PRIORITY_CONFIG[p].description}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-[11px]",
                  state.priority === p ? cn(PRIORITY_CONFIG[p].bg, PRIORITY_CONFIG[p].text, "border-current font-semibold") : "border-border",
                )}
              >
                {PRIORITY_CONFIG[p].label}
              </button>
            ))}
            {state.prioritySuggested && <span className="text-[10px] text-muted-foreground">suggested from similar tickets</span>}
          </div>
        </Row>

        {(state.department || state.when) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground pl-[100px]">
            {state.department && <span>Routes to <b className="text-foreground font-medium">{DEPT_MAP[state.department]?.name ?? state.department}</b></span>}
            {state.when && <span>When: <b className="text-foreground font-medium">{state.when}</b></span>}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex flex-wrap items-center gap-2">
        {state.done ? (
          <span className="text-[12px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />Draft prepared below
          </span>
        ) : (
          <>
            {missing.length > 0 ? (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />Still need: {missing.join(", ")}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Looks complete. Type more details in the chat to add them.</span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-8 text-[11px]"
              onClick={() => onAskAi(state)}
              title="Uses AI: checks Momence, past tickets and staff workload, then drafts"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />Investigate with AI
            </Button>
            <Button
              size="sm"
              className="h-8 text-[12px]"
              disabled={missing.length > 0}
              onClick={() => {
                set({ done: true });
                onSubmit(draftFromIntake(state));
              }}
            >
              Review ticket<ChevronDown className="w-3.5 h-3.5 ml-1 -rotate-90" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
