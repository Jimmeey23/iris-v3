"use client";

// Preset Ticket Builder - a template rendered as a real, submittable ticket form.
//
// Everything the template knows is pre-filled (title, summary, ticket category,
// priority, department, requested outcome, typed scenario fields with defaults);
// the person raising the ticket answers the scenario questions, sees the exact
// ticket that will be filed in the live preview, and submits it to /api/tickets.

import * as React from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  Info,
  ListChecks,
  Loader2,
  RotateCcw,
  Route,
  Send,
  Tag,
  Ticket as TicketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/iris/store";
import { ticketsApi } from "@/lib/iris/live-data";
import { DEPARTMENTS, DEPT_MAP, PRIORITY_CONFIG, STUDIOS, type Priority } from "@/lib/iris/types";
import { IRIS_STUDIOS, OCCURRED_OPTIONS, REPORTED_BY_OPTIONS, SYSTEMS, studioAreasFor } from "@/lib/iris/iris-constants";
import { KNOWLEDGE_ARTICLES } from "@/lib/iris/knowledge-base-data";
import { REQUESTED_OUTCOMES, type TemplateField, type TicketTemplate } from "@/lib/iris/template-types";
import { initialFieldValues, isFieldFilled, resolveTemplateForm } from "@/lib/iris/template-form";
import { templateCategoryLabel } from "@/lib/iris/template-taxonomy";
import {
  NOT_STUDIO_SPECIFIC,
  assembleTicketDescription,
  buildTicketPayload,
  completion,
  defaultTicketTitle,
  missingRequired,
  resolveTemplateDepartment,
  type FieldValue,
  type FieldValues,
  type TemplateTicketContext,
  type TemplateTicketDraft,
} from "@/lib/iris/template-ticket";

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
const AUTO_DEPARTMENT = "__auto__";
const NO_VALUE = "__none__";

export interface TemplateTicketBuilderProps {
  template: TicketTemplate;
  /** Back to the template list for this sub-category. */
  onBack: () => void;
  /** Open the read-only template details (and manager actions). */
  onShowDetails?: () => void;
}

/** Re-keys the form after a successful submit so "Raise another" starts fresh. */
export function TemplateTicketBuilder(props: TemplateTicketBuilderProps) {
  const [round, setRound] = React.useState(0);
  return <BuilderForm key={`${props.template.code}:${round}`} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

function hoursLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return h >= 48 && h % 24 === 0 ? `${h / 24} days` : `${Math.round(h * 10) / 10} h`;
}

function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `tpl-${c.randomUUID()}`;
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function playbookSteps(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^(\d+[.)]|[-•*])\s*/, ""))
    .filter(Boolean);
}

function BuilderForm({ template, onBack, onShowDetails, onAnother }: TemplateTicketBuilderProps & { onAnother: () => void }) {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectTicket = useAppStore((s) => s.selectTicket);
  const openKnowledgeArticle = useAppStore((s) => s.openKnowledgeArticle);

  const form = React.useMemo(() => resolveTemplateForm(template), [template]);
  const ctx = React.useMemo<TemplateTicketContext>(
    () => ({ template, category: form.category, subcategory: form.subcategory, fields: form.fields }),
    [template, form],
  );

  const restrictedStudios = Boolean(form.studioOptions?.length);
  const studioChoices = React.useMemo(() => {
    const names: string[] = IRIS_STUDIOS.filter((s) => !restrictedStudios || form.studioOptions!.includes(s.name)).map(
      (s) => s.name,
    );
    return restrictedStudios ? names : [...names, NOT_STUDIO_SPECIFIC];
  }, [form.studioOptions, restrictedStudios]);

  const [values, setValues] = React.useState<FieldValues>(() => initialFieldValues(form.fields));
  const [titleOverride, setTitleOverride] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState(() => form.summaryPrefill || template.description);
  const [studio, setStudio] = React.useState(() =>
    form.studio && studioChoices.includes(form.studio) ? form.studio : studioChoices.length === 1 ? studioChoices[0] : "",
  );
  const [area, setArea] = React.useState(form.area ?? "");
  const [occurred, setOccurred] = React.useState(form.occurred ?? "");
  const [reportedBy, setReportedBy] = React.useState(form.reportedBy ?? "");
  const [system, setSystem] = React.useState(form.system ?? "");
  const [priority, setPriority] = React.useState<Priority>(template.defaultPriority);
  const [requestedOutcome, setRequestedOutcome] = React.useState(form.requestedOutcome ?? "");
  const [departmentOverride, setDepartmentOverride] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [showErrors, setShowErrors] = React.useState(false);
  const [showDescription, setShowDescription] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [created, setCreated] = React.useState<{ id: string; ticketId: string } | null>(null);
  const idempotencyKey = React.useRef<string | null>(null);

  const autoDepartment = React.useMemo(() => {
    void dataVersion; // DEPT_MAP is hydrated in place from Neon
    return resolveTemplateDepartment(template.departmentCode, form.category, (code) => Boolean(DEPT_MAP[code]));
  }, [template.departmentCode, form.category, dataVersion]);

  const relatedArticles = React.useMemo(() => {
    void dataVersion; // KNOWLEDGE_ARTICLES is hydrated in place from Neon
    return KNOWLEDGE_ARTICLES.filter((a) => a.relatedTemplates?.includes(template.code)).slice(0, 4);
  }, [template.code, dataVersion]);

  const memberName = typeof values.memberName === "string" ? values.memberName : "";
  const titleBase = form.titlePrefill || template.title;
  const title = titleOverride ?? defaultTicketTitle(titleBase, memberName);
  const departmentCode = departmentOverride ?? autoDepartment;

  const draft: TemplateTicketDraft = {
    title,
    summary,
    studio,
    area,
    occurred,
    reportedBy,
    system,
    priority,
    requestedOutcome,
    departmentCode,
    notes,
    values,
  };
  const missing = missingRequired(ctx, draft);
  const progress = completion(ctx, draft);
  const description = assembleTicketDescription(ctx, draft);

  const areaChoices = form.areaOptions?.length
    ? form.areaOptions
    : studio && studio !== NOT_STUDIO_SPECIFIC
      ? studioAreasFor(studio)
      : [];

  const invalid = (label: string) => showErrors && missing.includes(label);
  const setValue = (id: string, v: FieldValue) => setValues((prev) => ({ ...prev, [id]: v }));

  const chooseStudio = (next: string) => {
    setStudio(next);
    const nextAreas = form.areaOptions?.length
      ? form.areaOptions
      : next && next !== NOT_STUDIO_SPECIFIC
        ? studioAreasFor(next)
        : [];
    setArea((cur) => (cur && nextAreas.includes(cur) ? cur : form.area && nextAreas.includes(form.area) ? form.area : ""));
  };

  const handleSubmit = async () => {
    if (missing.length) {
      setShowErrors(true);
      toast.error(`Please complete: ${missing.join(", ")}`);
      requestAnimationFrame(() =>
        document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }
    idempotencyKey.current ??= newIdempotencyKey();
    setSubmitting(true);
    try {
      const studioCode = STUDIOS.find((s) => s.name === studio)?.code;
      const ticket = await ticketsApi.create(
        buildTicketPayload(ctx, draft, { studioCode, idempotencyKey: idempotencyKey.current }),
      );
      setCreated({ id: ticket.id, ticketId: ticket.ticketId });
      toast.success(`Ticket ${ticket.ticketId} created`, { description: title });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="iris-card p-8 text-center max-w-xl mx-auto iris-fade-in-up">
        <CheckCircle2 className="w-11 h-11 text-emerald-500 mx-auto" />
        <div className="text-lg font-semibold mt-3">Ticket {created.ticketId} created</div>
        <div className="text-[13px] text-foreground/80 mt-1">{title}</div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-muted">
            {ctx.category} › {ctx.subcategory}
          </span>
          <span className={cn("px-2 py-0.5 rounded-full font-semibold", PRIORITY_CONFIG[priority].bg, PRIORITY_CONFIG[priority].text)}>
            {PRIORITY_CONFIG[priority].label}
          </span>
          {departmentCode && (
            <span className="px-2 py-0.5 rounded-full bg-muted">{DEPT_MAP[departmentCode]?.name ?? departmentCode}</span>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            className="h-9 text-[12px]"
            onClick={() => {
              setCurrentView("all_tickets");
              selectTicket(created.id);
            }}
          >
            <TicketIcon className="w-3.5 h-3.5 mr-1.5" />
            View ticket
          </Button>
          <Button variant="outline" className="h-9 text-[12px]" onClick={onAnother}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Raise another from this template
          </Button>
          <Button variant="ghost" className="h-9 text-[12px]" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to templates
          </Button>
        </div>
      </div>
    );
  }

  const pc = PRIORITY_CONFIG[priority];
  const wideField = (f: TemplateField) =>
    f.type === "textarea" ||
    f.type === "multiselect" ||
    (f.type === "select" && (f.options?.length ?? 0) <= 6 && (f.options ?? []).join("").length > 48);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        {/* Template header */}
        <div className="iris-card p-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className="text-[10px] font-mono text-muted-foreground">{template.code}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground/80">
              {templateCategoryLabel(template.category)} › {template.subcategory || "General"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Preset ticket form
            </span>
          </div>
          <h2 className="text-[17px] font-semibold leading-snug">{template.title}</h2>
          {template.description && (
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{template.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {DEPT_MAP[template.departmentCode]?.name ?? template.departmentCode}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Target {template.estimatedResolutionHours}h
            </span>
            <span className="flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              {form.fields.length} scenario {form.fields.length === 1 ? "question" : "questions"}
            </span>
            {template.suggestedAssigneeRole && <span>Owner: {template.suggestedAssigneeRole}</span>}
            {onShowDetails && (
              <button type="button" onClick={onShowDetails} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                <Eye className="w-3 h-3" />
                Template details
              </button>
            )}
          </div>
        </div>

        {/* 1. Basics */}
        <Section step={1} icon={FileText} title="Ticket basics" subtitle="Pre-filled from the template - change anything that's different.">
          <Field label="Ticket title" required invalid={invalid("Ticket title")}>
            <Input
              value={title}
              maxLength={200}
              onChange={(e) => setTitleOverride(e.target.value)}
              className="h-9 text-[13px]"
              placeholder={titleBase}
            />
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
              {titleOverride === null ? (
                <span>
                  From the template{form.fields.some((f) => f.id === "memberName") ? " - adds the member's name once entered" : ""}.
                </span>
              ) : (
                <button type="button" className="text-primary hover:underline" onClick={() => setTitleOverride(null)}>
                  Reset to the template title
                </button>
              )}
            </div>
          </Field>
          <Field label="Summary" required invalid={invalid("Summary")} hint="One or two sentences on what happened. It leads the ticket description.">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-[76px] text-[13px]" />
          </Field>
          <Field label="Studio" required invalid={invalid("Studio")}>
            <Pills options={studioChoices} value={studio} onChange={chooseStudio} format={(s) => s.split(",")[0]} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studio !== NOT_STUDIO_SPECIFIC && (
              <Field label="Area" hint={!studio && !form.areaOptions?.length ? "Choose a studio first." : undefined}>
                <Select value={area || NO_VALUE} onValueChange={(v) => setArea(v === NO_VALUE ? "" : v)} disabled={!areaChoices.length}>
                  <SelectTrigger className="h-9 text-[12px] w-full">
                    <SelectValue placeholder="Where in the studio?" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NO_VALUE}>Not specified</SelectItem>
                    {areaChoices.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="System involved">
              <Select value={system || NO_VALUE} onValueChange={(v) => setSystem(v === NO_VALUE ? "" : v)}>
                <SelectTrigger className="h-9 text-[12px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NO_VALUE}>None / not a system issue</SelectItem>
                  {SYSTEMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="When did it happen?">
            <Pills options={OCCURRED_OPTIONS} value={occurred} onChange={setOccurred} />
          </Field>
          <Field label="How did you hear about it?">
            <Pills options={REPORTED_BY_OPTIONS} value={reportedBy} onChange={setReportedBy} />
          </Field>
          <Field label="Priority" hint={pc.description}>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const on = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    aria-pressed={on}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md border text-[12px] transition-colors flex items-center gap-1.5",
                      on ? cn(cfg.bg, cfg.text, "border-current font-semibold") : "border-border hover:bg-muted/60 text-foreground/80",
                    )}
                  >
                    {cfg.label}
                    {p === template.defaultPriority && <span className="text-[10px] opacity-70">(default)</span>}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        {/* 2. Scenario */}
        <Section
          step={2}
          icon={ListChecks}
          title="Scenario details"
          subtitle={
            form.fields.length
              ? `Questions specific to “${template.title}”. Required ones are marked *.`
              : "This template only needs the basics."
          }
        >
          {form.fields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.fields.map((f) => (
                <div key={f.id} className={cn(wideField(f) && "md:col-span-2")}>
                  <TemplateFieldControl
                    field={f}
                    value={values[f.id]}
                    invalid={showErrors && Boolean(f.required) && !isFieldFilled(f, values[f.id])}
                    onChange={(v) => setValue(f.id, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 3. Outcome & routing */}
        <Section step={3} icon={Route} title="Outcome & routing" subtitle="What should happen, and which team picks it up.">
          <Field label="Requested outcome">
            <Pills options={REQUESTED_OUTCOMES} value={requestedOutcome} onChange={setRequestedOutcome} />
          </Field>
          <Field
            label="Department"
            hint={
              departmentOverride === null
                ? autoDepartment
                  ? "Pre-selected from the template."
                  : "Routing rules will choose the team."
                : undefined
            }
          >
            <Select
              value={departmentCode || AUTO_DEPARTMENT}
              onValueChange={(v) => setDepartmentOverride(v === AUTO_DEPARTMENT ? "" : v)}
            >
              <SelectTrigger className="h-9 text-[12px] w-full md:w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={AUTO_DEPARTMENT}>Auto-route (routing rules decide)</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes for the team" hint="Optional - anything else they should know.">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[64px] text-[13px]" />
          </Field>
        </Section>

        {/* Submit bar */}
        <div className="iris-card p-3 flex items-center gap-3 flex-wrap sticky bottom-3 z-10 shadow-lg">
          <div className="flex items-center gap-2 min-w-[180px] flex-1">
            <div className="h-1.5 flex-1 max-w-[180px] rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", missing.length ? "bg-amber-500" : "bg-emerald-500")}
                style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {progress.done}/{progress.total} required
            </span>
          </div>
          <Button variant="ghost" className="h-9 text-[12px]" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
          <Button className="h-9 text-[12px] min-w-[150px]" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            {submitting ? "Creating…" : "Create ticket"}
          </Button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="space-y-3 xl:sticky xl:top-2">
        <div className="iris-card p-4 space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TicketIcon className="w-3 h-3" />
            Ticket preview
          </div>
          <div className="text-[14px] font-semibold leading-snug break-words">
            {title.trim() || <span className="italic text-muted-foreground">Untitled ticket</span>}
          </div>
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-[11px]">
            <dt className="text-muted-foreground">Files under</dt>
            <dd className="font-medium">
              {ctx.category} › {ctx.subcategory}
            </dd>
            <dt className="text-muted-foreground">Priority</dt>
            <dd>
              <span className={cn("px-1.5 py-0.5 rounded font-semibold", pc.bg, pc.text)}>{pc.label}</span>
            </dd>
            <dt className="text-muted-foreground">SLA</dt>
            <dd>
              Respond {hoursLabel(pc.responseMins)} · resolve {hoursLabel(pc.resolutionMins)}
            </dd>
            <dt className="text-muted-foreground">Target</dt>
            <dd>{template.estimatedResolutionHours}h (template estimate)</dd>
            <dt className="text-muted-foreground">Department</dt>
            <dd>{departmentCode ? (DEPT_MAP[departmentCode]?.name ?? departmentCode) : "Auto-routed"}</dd>
            <dt className="text-muted-foreground">Studio</dt>
            <dd>{studio ? studio.split(",")[0] : <span className="text-amber-600 dark:text-amber-400">Not chosen</span>}</dd>
            {memberName.trim() && (
              <>
                <dt className="text-muted-foreground">Member</dt>
                <dd>{memberName.trim()}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-wrap gap-1">
            {[ctx.category, ctx.subcategory, template.code].map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {t}
              </span>
            ))}
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowDescription((s) => !s)}
              className="text-[11px] font-medium text-foreground/80 flex items-center gap-1 hover:text-foreground"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", showDescription && "rotate-90")} />
              Description that will be filed
            </button>
            {showDescription && (
              <pre className="mt-1.5 p-2.5 rounded-md bg-muted/40 border border-border text-[11px] leading-relaxed whitespace-pre-wrap break-words font-sans max-h-72 overflow-y-auto iris-scrollbar">
                {description}
              </pre>
            )}
          </div>
        </div>

        <div className="iris-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            {missing.length ? <AlertCircle className="w-3 h-3 text-amber-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {missing.length ? "Still needed" : "Ready to submit"}
          </div>
          {missing.length ? (
            <ul className="space-y-1 text-[12px]">
              {missing.map((m) => (
                <li key={m} className="flex items-center gap-1.5 text-foreground/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[12px] text-muted-foreground">All required details are filled in.</div>
          )}
        </div>

        {template.recommendedActions && (
          <div className="iris-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <ClipboardList className="w-3 h-3" />
              Handling playbook
            </div>
            <ol className="space-y-1.5 text-[12px] text-foreground/90">
              {playbookSteps(template.recommendedActions).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-4 h-4 rounded-full bg-muted text-[10px] font-semibold flex items-center justify-center shrink-0 mt-px">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Filed with the ticket as the recommended resolution.
            </div>
          </div>
        )}

        {relatedArticles.length > 0 && (
          <div className="iris-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3 h-3" />
              Troubleshooting guides
            </div>
            <div className="space-y-1">
              {relatedArticles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openKnowledgeArticle(a.id)}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors"
                >
                  <div className="text-[12px] font-medium leading-snug">{a.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {a.id} · {a.category}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* === Building blocks === */

function Section({
  step,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="iris-card p-4">
      <div className="flex items-start gap-2.5 mb-4">
        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
          {step}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            {title}
          </div>
          {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  invalid,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-invalid={invalid ? "true" : undefined} className={cn("space-y-1.5", invalid && "rounded-md")}>
      <div className="text-[12px] font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </div>
      <div className={cn(invalid && "rounded-md ring-1 ring-rose-500/70 ring-offset-2 ring-offset-background")}>{children}</div>
      {invalid ? (
        <div className="text-[11px] text-rose-600 dark:text-rose-400">This is required.</div>
      ) : (
        hint && <div className="text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function Pills({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  format?: (o: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            title={o}
            onClick={() => onChange(on ? "" : o)}
            className={cn(
              "px-2.5 py-1 rounded-md border text-[12px] transition-colors text-left",
              on ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted/60 text-foreground/80",
            )}
          >
            {format ? format(o) : o}
          </button>
        );
      })}
    </div>
  );
}

function TemplateFieldControl({
  field: f,
  value,
  invalid,
  onChange,
}: {
  field: TemplateField;
  value: FieldValue | undefined;
  invalid: boolean;
  onChange: (v: FieldValue) => void;
}) {
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  const options = f.options ?? [];

  if (f.type === "checkbox") {
    return (
      <label className="flex items-start gap-2.5 p-2.5 rounded-md border border-border hover:bg-muted/40 cursor-pointer text-[12px]">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 accent-primary w-3.5 h-3.5"
        />
        <span>
          <span className="font-medium">{f.label}</span>
          {f.helper && <span className="block text-[11px] text-muted-foreground mt-0.5">{f.helper}</span>}
        </span>
      </label>
    );
  }

  let control: React.ReactNode;
  switch (f.type) {
    case "textarea":
      control = <Textarea value={text} onChange={(e) => onChange(e.target.value)} className="min-h-[72px] text-[13px]" />;
      break;
    case "number":
      control = (
        <Input type="number" inputMode="decimal" value={text} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px]" />
      );
      break;
    case "date":
      control = <Input type="date" value={text} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px] w-full md:w-[200px]" />;
      break;
    case "select":
      control =
        options.length <= 6 ? (
          <Pills options={options} value={text} onChange={onChange} />
        ) : (
          <Select value={text || NO_VALUE} onValueChange={(v) => onChange(v === NO_VALUE ? "" : v)}>
            <SelectTrigger className="h-9 text-[12px] w-full">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NO_VALUE}>Choose…</SelectItem>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      break;
    case "multiselect":
      control = (
        <div>
          <div className={cn("flex flex-wrap gap-1.5", options.length > 14 && "max-h-44 overflow-y-auto iris-scrollbar p-0.5")}>
            {options.map((o) => {
              const on = list.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}
                  className={cn(
                    "px-2 py-1 rounded-md border text-[11px] transition-colors",
                    on ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted/60 text-foreground/80",
                  )}
                >
                  {on && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-px" />}
                  {o}
                </button>
              );
            })}
          </div>
          {list.length > 0 && <div className="text-[10px] text-muted-foreground mt-1">{list.length} selected</div>}
        </div>
      );
      break;
    default:
      control = <Input value={text} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px]" />;
  }

  return (
    <Field label={f.label} required={f.required} invalid={invalid} hint={f.helper}>
      {control}
    </Field>
  );
}
