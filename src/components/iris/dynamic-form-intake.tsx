"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ticketsApi } from "@/lib/iris/live-data";
import { STUDIOS, DEPARTMENTS, EMPLOYEES } from "@/lib/iris/types";
import { MultiSelect } from "@/components/iris/multi-select";
import { toast } from "sonner";
import {
  IRIS_STUDIOS,
  IRIS_DEPARTMENTS,
  CATEGORY_MAP,
  CATEGORIES,
  CLASS_FORMATS,
  STUDIO_AREAS,
  SYSTEMS,
  OCCURRED_OPTIONS,
  REPORTED_BY_OPTIONS,
  TRAINERS,
  MEMBERSHIPS,
  STUDIO_LAYOUTS,
  inferPriority,
  inferDepartment,
  PRIORITY_SLA_HOURS,
} from "@/lib/iris/iris-constants";
import { cn } from "@/lib/utils";
import { MomenceSearchField, MomenceEntity } from "@/components/iris/momence-search-field";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Sparkles,
  User,
  Building2,
  Tag,
  Calendar,
  AlertTriangle,
  Zap,
  Send,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FormData {
  title: string;
  summary: string;
  category: string;
  subcategory: string;
  studio: string;
  area: string;
  priority: string;
  severity: string;
  affectedClient: string;
  membershipType: string;
  trainer: string;
  classFormat: string;
  system: string;
  occurred: string;
  reportedBy: string;
  memberContact: string;
  paymentAmount: string;
  paymentMethod: string;
  paymentReference: string;
  sessionTime: string;
  additionalContext: string;
  requestedOutcome: string;
  attachments: string[];
}

const DEPT_CODE: Record<string, string> = {
  training: "TRN", operations: "OPS", "sales-client-servicing": "SCS", marketing: "MKT", management: "MGT", accounts: "PAY",
};
const STEPS = [
  { id: "issue", title: "Describe Issue", icon: FileText, desc: "What happened?" },
  { id: "category", title: "Classify", icon: Tag, desc: "Category & subcategory" },
  { id: "location", title: "Location", icon: Building2, desc: "Where is it?" },
  { id: "people", title: "People", icon: User, desc: "Who's involved?" },
  { id: "details", title: "Details", icon: Zap, desc: "Additional context" },
  { id: "review", title: "Review", icon: Check, desc: "Confirm & submit" },
];

export function DynamicFormIntake({ onClose }: { onClose: () => void }) {
  const { setCurrentView, setConversationState } = useAppStore();
  const [step, setStep] = React.useState(0);
  const [extraDepts, setExtraDepts] = React.useState<string[]>([]);
  const [owners, setOwners] = React.useState<string[]>([]);
  const [form, setForm] = React.useState<FormData>({
    title: "",
    summary: "",
    category: "",
    subcategory: "",
    studio: "",
    area: "",
    priority: "",
    severity: "",
    affectedClient: "",
    membershipType: "",
    trainer: "",
    classFormat: "",
    system: "",
    occurred: "",
    reportedBy: "",
    memberContact: "",
    paymentAmount: "",
    paymentMethod: "",
    paymentReference: "",
    sessionTime: "",
    additionalContext: "",
    requestedOutcome: "",
    attachments: [],
  });

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-compute priority from subcategory
  React.useEffect(() => {
    if (form.subcategory) {
      const priority = inferPriority(form.subcategory);
      updateForm("priority", priority);
    }
  }, [form.subcategory]);

  const availableAreas = React.useMemo(() => {
    if (!form.studio) return [...STUDIO_AREAS];
    const studioKey = IRIS_STUDIOS.find((s) => s.name === form.studio)?.id;
    if (studioKey && STUDIO_LAYOUTS[studioKey]) {
      return [...STUDIO_LAYOUTS[studioKey].rooms.map((r) => r.name), "Reception / lobby", "Staircase / corridor", "Parking / valet"];
    }
    return [...STUDIO_AREAS];
  }, [form.studio]);

  const availableSubcategories = React.useMemo(() => {
    return form.category ? CATEGORY_MAP[form.category] || [] : [];
  }, [form.category]);

  const computedDepartment = React.useMemo(() => {
    return form.category ? inferDepartment(form.category) : "";
  }, [form.category]);

  const computedSLA = React.useMemo(() => {
    if (!form.priority) return null;
    const slaMap: Record<string, number> = { critical: PRIORITY_SLA_HOURS.critical, high: PRIORITY_SLA_HOURS.high, medium: PRIORITY_SLA_HOURS.medium, low: PRIORITY_SLA_HOURS.low };
    return slaMap[form.priority] || 48;
  }, [form.priority]);

  const canProceed = React.useMemo(() => {
    switch (STEPS[step].id) {
      case "issue": return form.title.trim().length > 5 && form.summary.trim().length > 12;
      case "category": return form.category && form.subcategory;
      case "location": return form.studio;
      case "people": return true; // Optional
      case "details": return true; // Optional
      case "review": return true;
      default: return false;
    }
  }, [step, form]);

  const [submitting, setSubmitting] = React.useState(false);
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const DEPT = DEPT_CODE;
    const PRIORITY: Record<string, string> = { critical: "P0", high: "P1", medium: "P2", low: "P3" };
    const studio = STUDIOS.find((s) => s.name === form.studio);
    const extras: Array<[string, string]> = [
      ["Area", form.area], ["Trainer", form.trainer], ["Class format", form.classFormat], ["System", form.system],
      ["When", form.occurred], ["Session", form.sessionTime], ["Payment", [form.paymentAmount, form.paymentMethod, form.paymentReference].filter(Boolean).join(" · ")],
      ["Requested outcome", form.requestedOutcome], ["Additional context", form.additionalContext],
    ];
    const details = extras.filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v.trim()}`).join("\n");
    try {
      const t = await ticketsApi.create({
        title: form.title,
        description: [form.summary.trim(), details].filter(Boolean).join("\n\n"),
        category: form.category,
        subcategory: form.subcategory,
        priority: PRIORITY[form.priority] ?? "P2",
        severity: form.severity,
        studioCode: studio?.code,
        departmentCode: DEPT[computedDepartment],
        departmentCodes: [...new Set([DEPT[computedDepartment], ...extraDepts].filter(Boolean))],
        assigneeIds: owners,
        affectedClient: form.affectedClient,
        recommendedResolution: form.requestedOutcome,
        source: "form_intake",
        tags: [form.category, form.subcategory].filter(Boolean),
        collectedInfo: { ...form, attachments: undefined },
      });
      toast.success(`Ticket ${t.ticketId} created`);
      setCurrentView("all_tickets");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col iris-shadow-hero iris-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-violet-500/5 to-indigo-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">Dynamic Form Intake</div>
              <div className="text-[11px] text-muted-foreground">Structured form — alternative to AI chat</div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                    i === step ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" :
                    i < step ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" :
                    "text-muted-foreground/50"
                  )}
                >
                  {i < step ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto iris-scrollbar p-5">
          {/* Step 1: Issue Description */}
          {STEPS[step].id === "issue" && (
            <div className="space-y-4">
              <StepHeader icon={FileText} title="Describe the Issue" desc="Tell us what happened in your own words" />
              <FormField label="Title" required hint="A clear, concise title for this ticket">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="e.g. AC not working in Studio 2"
                  className="w-full h-10 px-3 text-[13px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </FormField>
              <FormField label="Summary" required hint="Describe what happened in detail (min 12 characters)">
                <textarea
                  value={form.summary}
                  onChange={(e) => updateForm("summary", e.target.value)}
                  placeholder="The air conditioning in Studio 2 stopped working during the 9 AM class. Clients were uncomfortable..."
                  rows={4}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
                <div className="mt-1 text-[10px] text-muted-foreground tabular-nums">{form.summary.trim().length} chars · {form.summary.trim().split(/\s+/).filter(Boolean).length} words</div>
              </FormField>
              <FormField label="When did this occur?" hint="Approximate timing">
                <OptionButtons options={[...OCCURRED_OPTIONS]} value={form.occurred} onChange={(v) => updateForm("occurred", v)} />
              </FormField>
              <FormField label="How was this reported?" hint="Source of the report">
                <OptionButtons options={[...REPORTED_BY_OPTIONS]} value={form.reportedBy} onChange={(v) => updateForm("reportedBy", v)} />
              </FormField>
            </div>
          )}

          {/* Step 2: Category */}
          {STEPS[step].id === "category" && (
            <div className="space-y-4">
              <StepHeader icon={Tag} title="Classify the Issue" desc="Select category and subcategory" />
              <FormField label="Category" required hint="Main issue category">
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { updateForm("category", cat); updateForm("subcategory", ""); }}
                      className={cn(
                        "p-2.5 rounded-lg border text-[11px] font-medium text-left transition-all",
                        form.category === cat ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400" : "border-border hover:border-violet-500/30 hover:bg-violet-500/5"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </FormField>
              {form.category && (
                <FormField label="Subcategory" required hint={`Specific issue type under ${form.category}`}>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[280px] overflow-y-auto iris-scrollbar p-1">
                    {availableSubcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => updateForm("subcategory", sub)}
                        className={cn(
                          "p-2 rounded-md border text-[11px] text-left transition-all",
                          form.subcategory === sub ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400" : "border-border hover:border-violet-500/30 hover:bg-violet-500/5"
                        )}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </FormField>
              )}
              {form.subcategory && (
                <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Auto-detected Priority</div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-[10px] font-bold",
                          form.priority === "critical" ? "bg-rose-500/15 text-rose-600" :
                          form.priority === "high" ? "bg-amber-500/15 text-amber-600" :
                          form.priority === "medium" ? "bg-sky-500/15 text-sky-600" :
                          "bg-emerald-500/15 text-emerald-600"
                        )}>
                          {form.priority.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">→ Routed to: <span className="font-semibold text-foreground">{IRIS_DEPARTMENTS.find(d => d.id === computedDepartment)?.name}</span></span>
                      </div>
                    </div>
                    <Sparkles className="w-4 h-4 text-violet-500" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {STEPS[step].id === "location" && (
            <div className="space-y-4">
              <StepHeader icon={Building2} title="Location" desc="Where is the issue occurring?" />
              <FormField label="Studio" required hint="Which studio is affected">
                <div className="grid grid-cols-1 gap-1.5">
                  {IRIS_STUDIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateForm("studio", s.name)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
                        form.studio === s.name ? "border-violet-500 bg-violet-500/10" : "border-border hover:border-violet-500/30 hover:bg-violet-500/5"
                      )}
                    >
                      <Building2 className={cn("w-4 h-4", form.studio === s.name ? "text-violet-500" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.city} · {s.region}</div>
                      </div>
                      {s.momenceLocationId && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Momence
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </FormField>
              {form.studio && (
                <FormField label="Specific Area" hint="Where exactly in the studio?">
                  <OptionButtons options={availableAreas} value={form.area} onChange={(v) => updateForm("area", v)} />
                </FormField>
              )}
              {form.area && STUDIO_LAYOUTS[IRIS_STUDIOS.find((s) => s.name === form.studio)?.id || ""] && (
                <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/20">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">Room Details</div>
                  {STUDIO_LAYOUTS[IRIS_STUDIOS.find((s) => s.name === form.studio)?.id || ""].rooms
                    .filter((r) => r.name === form.area)
                    .map((r) => (
                      <div key={r.name} className="text-[11px] text-muted-foreground">{r.description}</div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: People */}
          {STEPS[step].id === "people" && (
            <div className="space-y-4">
              <StepHeader icon={User} title="People Involved" desc="Who is affected? (Optional but helpful)" />
              <FormField label="Affected Member" hint="Search their Momence profile">
                <MomenceSearchField
                  type="momence_member"
                  placeholder="Search by name, phone, or email..."
                  onSelect={(entity: MomenceEntity) => updateForm("affectedClient", entity.name)}
                />
              </FormField>
              {form.affectedClient && (
                <FormField label="Membership Type" hint="Auto-detected from Momence">
                  <select
                    value={form.membershipType}
                    onChange={(e) => updateForm("membershipType", e.target.value)}
                    className="w-full h-10 px-3 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Select membership...</option>
                    {MEMBERSHIPS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FormField>
              )}
              <FormField label="Trainer (if relevant)" hint="Select from trainer directory">
                <select
                  value={form.trainer}
                  onChange={(e) => updateForm("trainer", e.target.value)}
                  className="w-full h-10 px-3 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500"
                >
                  <option value="">Select trainer...</option>
                  {TRAINERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Class Format (if relevant)" hint="What type of class">
                <select
                  value={form.classFormat}
                  onChange={(e) => updateForm("classFormat", e.target.value)}
                  className="w-full h-10 px-3 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500"
                >
                  <option value="">Select format...</option>
                  {CLASS_FORMATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
          )}

          {/* Step 5: Details */}
          {STEPS[step].id === "details" && (
            <div className="space-y-4">
              <StepHeader icon={Zap} title="Additional Details" desc="Any other context that would help" />
              {form.category === "Tech Issues" || form.category === "Operating Systems" ? (
                <FormField label="Affected System" hint="Which system is involved">
                  <OptionButtons options={[...SYSTEMS]} value={form.system} onChange={(v) => updateForm("system", v)} />
                </FormField>
              ) : null}
              {form.category === "Pricing and Memberships" || form.category === "Tech Issues" ? (
                <>
                  <FormField label="Payment Amount (if relevant)" hint="Amount in question">
                    <input
                      type="text"
                      value={form.paymentAmount}
                      onChange={(e) => updateForm("paymentAmount", e.target.value)}
                      placeholder="e.g. ₹3,500"
                      className="w-full h-10 px-3 text-[13px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500"
                    />
                  </FormField>
                  <FormField label="Payment Method" hint="How was the payment made">
                    <OptionButtons options={["UPI", "Credit Card", "Debit Card", "Net Banking", "Cash"]} value={form.paymentMethod} onChange={(v) => updateForm("paymentMethod", v)} />
                  </FormField>
                  <FormField label="Payment Reference" hint="Transaction ID or bank reference">
                    <input
                      type="text"
                      value={form.paymentReference}
                      onChange={(e) => updateForm("paymentReference", e.target.value)}
                      placeholder="e.g. 884329176543210"
                      className="w-full h-10 px-3 text-[13px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </FormField>
                </>
              ) : null}
              <FormField label="Additional Context" hint="Anything else we should know">
                <textarea
                  value={form.additionalContext}
                  onChange={(e) => updateForm("additionalContext", e.target.value)}
                  placeholder="Any other details that would help with investigation or resolution..."
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-card focus:outline-none focus:border-violet-500 resize-none"
                />
              </FormField>
              <FormField label="Requested Outcome" hint="What resolution would you like?">
                <OptionButtons
                  options={["Fix the issue", "Refund / credit", "Information only", "Process change", "Escalate to management"]}
                  value={form.requestedOutcome}
                  onChange={(v) => updateForm("requestedOutcome", v)}
                />
              </FormField>
            </div>
          )}

          {/* Step 6: Review */}
          {STEPS[step].id === "review" && (
            <div className="space-y-4">
              <StepHeader icon={Check} title="Review & Submit" desc="Confirm the details before creating the ticket" />
              <div className="iris-card-elevated p-4 space-y-3">
                <ReviewRow label="Title" value={form.title} />
                <ReviewRow label="Summary" value={form.summary} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <ReviewRow label="Category" value={form.category} />
                  <ReviewRow label="Subcategory" value={form.subcategory} />
                  <ReviewRow label="Studio" value={form.studio} />
                  <ReviewRow label="Area" value={form.area || "—"} />
                  <ReviewRow label="Priority" value={form.priority.toUpperCase()} highlight={form.priority} />
                  <ReviewRow label="Department" value={IRIS_DEPARTMENTS.find(d => d.id === computedDepartment)?.name || "—"} />
                  {form.affectedClient && <ReviewRow label="Client" value={form.affectedClient} />}
                  {form.membershipType && <ReviewRow label="Membership" value={form.membershipType} />}
                  {form.trainer && <ReviewRow label="Trainer" value={form.trainer} />}
                  {form.classFormat && <ReviewRow label="Class Format" value={form.classFormat} />}
                  {form.occurred && <ReviewRow label="Occurred" value={form.occurred} />}
                  {form.reportedBy && <ReviewRow label="Reported By" value={form.reportedBy} />}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Also involve departments (optional)</div>
                    <MultiSelect size="md" value={extraDepts} onChange={setExtraDepts}
                      options={DEPARTMENTS.filter((d) => d.code !== DEPT_CODE[computedDepartment]).map((d) => ({ value: d.code, label: d.name, hint: d.code }))}
                      placeholder="None" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Owners (optional, otherwise auto-assigned)</div>
                    <MultiSelect size="md" value={owners} onChange={setOwners}
                      options={EMPLOYEES.map((e) => ({ value: e.id, label: e.name, hint: e.departmentCode }))}
                      placeholder="Auto-assign" />
                  </div>
                </div>
                {computedSLA && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SLA Resolution Target</div>
                        <div className="text-[14px] font-bold text-violet-600 dark:text-violet-400">{computedSLA} hours</div>
                      </div>
                      <Sparkles className="w-5 h-5 text-violet-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 shrink-0 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <div className="flex-1" />
          <div className="text-[10px] text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              className="h-8 text-[12px] iris-btn-premium"
              disabled={!canProceed}
              onClick={() => setStep(step + 1)}
            >
              Next
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 text-[12px] iris-btn-premium iris-action-shimmer"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Send className="w-3 h-3 mr-1" />
              Create Ticket
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[12px] font-semibold">{label}{required && <span className="text-rose-500">*</span>}</label>
        {hint && <span className="text-[10px] text-muted-foreground">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function OptionButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all",
            value === opt ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400" : "border-border hover:border-violet-500/30 hover:bg-violet-500/5"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ReviewRow({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className={cn(
        "text-[12px] font-medium",
        multiline && "leading-relaxed",
        highlight === "critical" && "text-rose-600 dark:text-rose-400",
        highlight === "high" && "text-amber-600 dark:text-amber-400",
        highlight === "medium" && "text-sky-600 dark:text-sky-400",
        highlight === "low" && "text-emerald-600 dark:text-emerald-400"
      )}>
        {value || "—"}
      </div>
    </div>
  );
}
