"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { toast } from "sonner";
import { useAppStore } from "@/lib/iris/store";
import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "@/lib/iris/knowledge-base-data";
import { KB_SECTIONS, readingMinutes, splitArticleBody, type ArticleSection } from "@/lib/iris/knowledge-base/compose";
import {
  articleGlance,
  articlePriority,
  codeFromHref,
  linkifyCodes,
  parseBulletList,
  parseDiagnose,
  parseScripts,
  relatedArticles,
  searchArticles,
  splitCodes,
  stepsAsText,
  type ScoredArticle,
} from "@/lib/iris/knowledge-base/reader";
import {
  KB_GENERAL_SUBCATEGORY,
  groupKnowledgeArticles,
  withResolvedTaxonomy,
  type KnowledgeCategoryGroup,
  type KnowledgeSubcategoryGroup,
} from "@/lib/iris/knowledge-base/groups";
import {
  KB_CATEGORY_ORDER,
  KB_TAXONOMY,
  kbCategoryLabel,
  kbCategoryMeta,
  kbSubcategoryDescription,
  kbSubcategoryNames,
} from "@/lib/iris/knowledge-base/taxonomy";
import { TEMPLATE_MAP } from "@/lib/iris/templates";
import { PRIORITY_CONFIG, type Priority } from "@/lib/iris/types";
import { knowledgeApi } from "@/lib/iris/library-api";
import { cn } from "@/lib/utils";
import { ACCENT_STYLES, PriorityMix, StepHeading, Stepper, type AccentStyle } from "@/components/iris/drilldown";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Edit2,
  Eye,
  FileText,
  FolderTree,
  Gauge,
  Layers,
  ListChecks,
  Megaphone,
  MessageSquare,
  MessageSquareQuote,
  Monitor,
  PackageSearch,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Tag,
  ThumbsUp,
  Ticket,
  Timer,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type IconType = React.ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<string, IconType> = {
  "Brand Feedback": Megaphone,
  "Class Experience": Users,
  "Customer Service and Communication": MessageSquare,
  "Internal Operations & Admin": ClipboardList,
  "Operating Systems": Monitor,
  "Pricing and Memberships": CreditCard,
  "Repair and Maintenance": Wrench,
  "Safety and Security": Shield,
  Scheduling: Calendar,
  "Studio Amenities and Facilities": Building2,
  "Tech Issues": Wifi,
  "Theft and Lost Items": PackageSearch,
  "Trainer Feedback": UserCheck,
};
const categoryIcon = (category: string): IconType => CATEGORY_ICONS[category] ?? BookOpen;

/** Renders an icon chosen at runtime (keeps the component identity static for React). */
function IconOf({ icon: Icon, className }: { icon: IconType; className?: string }) {
  return <Icon className={className} />;
}

const MD_CLASS =
  "text-[13px] leading-relaxed space-y-2 [&_h1]:text-[16px] [&_h1]:font-semibold [&_h2]:text-[14px] [&_h2]:font-semibold [&_h3]:text-[13px] [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground";

/** Outline managers can start a new article from (the reader styles these sections). */
const ARTICLE_OUTLINE = [
  `## ${KB_SECTIONS.glance}`,
  "- **Typical priority:** P2",
  "- **Owner:** ",
  "- **First response:** ",
  "- **Target resolution:** ",
  "",
  `## ${KB_SECTIONS.firstFive}`,
  "- ",
  "",
  `## ${KB_SECTIONS.diagnose}`,
  "- **What you see** - what to do",
  "",
  `## ${KB_SECTIONS.say}`,
  "> **Moment** - “Words to use”",
  "",
  `## ${KB_SECTIONS.dos}`,
  "- ",
  "",
  `## ${KB_SECTIONS.donts}`,
  "- ",
  "",
  `## ${KB_SECTIONS.closeOut}`,
  "- ",
].join("\n");

/* ------------------------------------------------------------------ */
/* Cross-references: TPL-… opens the preset ticket form, KB-… an article */
/* ------------------------------------------------------------------ */

interface CodeLinks {
  isKnown: (code: string) => boolean;
  describe: (code: string) => string | undefined;
  open: (code: string) => void;
}

const CodeLinkContext = React.createContext<CodeLinks>({
  isKnown: () => false,
  describe: () => undefined,
  open: () => {},
});

function CodeChip({ code, children }: { code: string; children?: React.ReactNode }) {
  const links = React.useContext(CodeLinkContext);
  const isTemplate = code.startsWith("TPL-");
  const label = links.describe(code);
  return (
    <button
      type="button"
      onClick={(e) => {
        // Inside a checklist <label>: don't toggle the step.
        e.preventDefault();
        e.stopPropagation();
        links.open(code);
      }}
      title={isTemplate ? `Raise a ticket with ${code}${label ? ` - ${label}` : ""}` : `Open ${code}${label ? ` - ${label}` : ""}`}
      className={cn(
        "inline-flex items-center px-1 rounded font-mono text-[0.92em] font-medium no-underline align-baseline transition-colors",
        isTemplate
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
      )}
    >
      {children ?? code}
    </button>
  );
}

/** Plain text with known TPL-/KB- codes turned into links. */
function LinkedText({ text }: { text: string }) {
  const links = React.useContext(CodeLinkContext);
  return (
    <>
      {splitCodes(text, links.isKnown).map((piece, i) =>
        "code" in piece ? <CodeChip key={i} code={piece.code} /> : <React.Fragment key={i}>{piece.text}</React.Fragment>,
      )}
    </>
  );
}

function MdLink({ href, children }: React.ComponentProps<"a"> & { node?: unknown }) {
  const code = codeFromHref(href);
  if (code) return <CodeChip code={code}>{children}</CodeChip>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function InlineParagraph({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

const BLOCK_COMPONENTS: Components = { a: MdLink };
const INLINE_COMPONENTS: Components = { a: MdLink, p: InlineParagraph };

/** Markdown with code links. `inline` renders a single paragraph without the <p>. */
function Md({ text, inline = false }: { text: string; inline?: boolean }) {
  const links = React.useContext(CodeLinkContext);
  const source = React.useMemo(() => linkifyCodes(text, links.isKnown), [text, links]);
  if (inline) return <ReactMarkdown components={INLINE_COMPONENTS}>{source}</ReactMarkdown>;
  return (
    <div className={MD_CLASS}>
      <ReactMarkdown components={BLOCK_COMPONENTS}>{source}</ReactMarkdown>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

/**
 * Knowledge Base - a three-step drill-down: Category → Sub-category → Guide.
 *
 * Nothing is listed until a category and sub-category are chosen (search covers
 * every guide at any step). Opening a guide shows the reader: a working
 * checklist, what to say, when to escalate and the ticket forms to raise.
 */
export function KnowledgeBaseView() {
  const dataVersion = useAppStore((st) => st.dataVersion);
  const tier = useAppStore((st) => st.currentUser?.tier);
  const kbArticleId = useAppStore((st) => st.kbArticleId);
  const setKbArticleId = useAppStore((st) => st.setKbArticleId);
  const nav = useAppStore((st) => st.kbNav);
  const setKbNav = useAppStore((st) => st.setKbNav);
  const openTemplate = useAppStore((st) => st.openTemplate);
  const canEdit = tier === "admin" || tier === "manager";

  // KNOWLEDGE_ARTICLES / TEMPLATE_MAP are hydrated in place from Neon; dataVersion re-reads them.
  const articles = React.useMemo(() => {
    void dataVersion;
    return KNOWLEDGE_ARTICLES.map(withResolvedTaxonomy);
  }, [dataVersion]);
  const groups = React.useMemo(() => groupKnowledgeArticles(articles), [articles]);
  const subcategoryTotal = groups.reduce((n, g) => n + g.subcategoryCount, 0);

  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<{ article: KnowledgeArticle; isNew: boolean } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const topRef = React.useRef<HTMLDivElement>(null);

  // Where we are in the drill-down. An open guide always sits in its own category / sub-category,
  // however it was reached (drill-down, search, a link in another guide, or a deep link).
  const activeArticle = kbArticleId ? (articles.find((a) => a.id === kbArticleId) ?? null) : null;
  const category = activeArticle ? activeArticle.category : nav.category;
  const subcategory = activeArticle ? (activeArticle.subcategory ?? null) : nav.subcategory;
  const catGroup = category ? (groups.find((g) => g.category === category) ?? null) : null;
  const subGroup = catGroup && subcategory ? (catGroup.subcategories.find((s) => s.subcategory === subcategory) ?? null) : null;
  const step: 1 | 2 | 3 | 4 = activeArticle ? 4 : subGroup ? 3 : catGroup ? 2 : 1;

  const q = search.trim();
  const results = React.useMemo(() => (q ? searchArticles(articles, q) : []), [articles, q]);

  // A newly opened guide starts at the top of the page.
  React.useEffect(() => {
    if (kbArticleId) topRef.current?.scrollIntoView({ block: "start" });
  }, [kbArticleId]);
  const scrollTop = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));

  const go = (next: { category?: string | null; subcategory?: string | null }) => {
    setKbNav({ category: next.category ?? null, subcategory: next.subcategory ?? null });
    setKbArticleId(null);
    setSearch("");
    scrollTop();
  };
  const goHome = () => go({});
  const goCategory = (c: string) => go({ category: c });
  const goSubcategory = (c: string, s: string) => go({ category: c, subcategory: s });

  const openArticle = React.useCallback(
    (id: string) => {
      const a = articles.find((x) => x.id === id);
      if (a) setKbNav({ category: a.category, subcategory: a.subcategory ?? null });
      setKbArticleId(id);
    },
    [articles, setKbNav, setKbArticleId],
  );
  // Back goes to the search results when there is a query, otherwise to the guide's sub-category.
  const closeArticle = () => {
    if (activeArticle) setKbNav({ category: activeArticle.category, subcategory: activeArticle.subcategory ?? null });
    setKbArticleId(null);
    scrollTop();
  };

  const codeLinks = React.useMemo<CodeLinks>(() => {
    void dataVersion;
    const titles = new Map(articles.map((a) => [a.id, a.title]));
    return {
      isKnown: (code) => (code.startsWith("TPL-") ? Boolean(TEMPLATE_MAP[code]) : titles.has(code)),
      describe: (code) => (code.startsWith("TPL-") ? TEMPLATE_MAP[code]?.title : titles.get(code)),
      open: (code) => (code.startsWith("TPL-") ? openTemplate(code) : openArticle(code)),
    };
  }, [articles, dataVersion, openTemplate, openArticle]);

  const categoryOptions = React.useMemo(
    () => [...KB_CATEGORY_ORDER, ...groups.map((g) => g.category).filter((c) => !KB_CATEGORY_ORDER.includes(c))],
    [groups],
  );
  const subcategoriesFor = React.useCallback(
    (c: string) => {
      const inUse = groups.find((g) => g.category === c)?.subcategories.map((s) => s.subcategory) ?? [];
      return Array.from(new Set([...kbSubcategoryNames(c), ...inUse]));
    },
    [groups],
  );

  const run = async <T,>(fn: () => Promise<T>, okMsg: string): Promise<{ ok: true; value: T } | { ok: false }> => {
    setBusy(true);
    try {
      const value = await fn();
      toast.success(okMsg);
      return { ok: true, value };
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return { ok: false };
    } finally {
      setBusy(false);
    }
  };

  const handleSaveArticle = async (draft: KnowledgeArticle, isNew: boolean) => {
    const { id, ...body } = draft;
    const res = await run(
      () => (isNew ? knowledgeApi.create({ ...body, ...(id ? { id } : {}) }) : knowledgeApi.update(id, body)),
      isNew ? "Document created" : "Document saved",
    );
    if (!res.ok) return;
    setEditing(null);
    if (isNew) openArticle(res.value.id);
  };

  const handleNewArticle = (cat?: string, sub?: string) => {
    const categoryKey = cat ?? catGroup?.category ?? KB_TAXONOMY[0].key;
    const subcategoryName =
      sub ??
      (categoryKey === catGroup?.category ? subGroup?.subcategory : undefined) ??
      kbSubcategoryNames(categoryKey)[0] ??
      KB_GENERAL_SUBCATEGORY;
    setEditing({
      isNew: true,
      article: {
        id: "",
        title: "",
        category: categoryKey,
        subcategory: subcategoryName,
        summary: "",
        steps: [""],
        prevention: "",
        escalation: "",
        relatedTemplates: [],
        body: "",
        tags: [],
      },
    });
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm(`Delete document ${id}? This cannot be undone.`)) return;
    const doc = articles.find((a) => a.id === id);
    const res = await run(() => knowledgeApi.remove(id), "Document deleted");
    if (!res.ok) return;
    setEditing(null);
    if (useAppStore.getState().kbArticleId === id) {
      // Land on the sub-category the deleted guide lived in.
      if (doc) setKbNav({ category: doc.category, subcategory: doc.subcategory ?? null });
      setKbArticleId(null);
    }
  };

  const handleDuplicate = async (a: KnowledgeArticle) => {
    const res = await run(() => knowledgeApi.duplicate(a), "Document duplicated");
    if (res.ok) openArticle(res.value.id);
  };

  const showTag = (tag: string) => {
    setSearch(tag);
    setKbArticleId(null);
    scrollTop();
  };

  return (
    <CodeLinkContext.Provider value={codeLinks}>
      <div ref={topRef} className="p-8 max-w-[1400px] mx-auto space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
              <BookOpen className="w-3 h-3" />
              {articles.length} guides · {groups.length} categories · {subcategoryTotal} sub-categories
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight">Knowledge Base</h1>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-3xl">
              Pick a category, then a sub-category, then the guide that matches the situation. Every guide is a step-by-step checklist with
              what to say, when to escalate and the ticket form to raise.{canEdit ? " Managers can create, edit, duplicate and delete guides." : ""}
            </p>
          </div>
          {canEdit && (
            <Button className="h-8 text-[12px]" onClick={() => handleNewArticle()}>
              <Plus className="w-3 h-3 mr-1.5" />
              New Article
            </Button>
          )}
        </div>

        <Stepper
          ariaLabel="Knowledge base steps"
          step={q && step < 4 ? 0 : step}
          labels={[
            catGroup ? kbCategoryLabel(catGroup.category) : "Category",
            subGroup ? subGroup.subcategory : "Sub-category",
            activeArticle ? activeArticle.id : "Guide",
            "Work through it",
          ]}
          onStep={(n) => {
            if (n === 1) goHome();
            else if (n === 2 && catGroup) goCategory(catGroup.category);
            else if (n === 3 && catGroup && subGroup) goSubcategory(catGroup.category, subGroup.subcategory);
          }}
        />

        {step < 4 && (
          <div className="relative max-w-xl">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search every guide - a symptom, situation or code, e.g. “AC red light”, “refund”, “TPL-034”"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 pr-8 text-[12px]"
              aria-label="Search the knowledge base"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {q && step < 4 ? (
          <SearchResults results={results} query={q} onOpen={openArticle} onClear={() => setSearch("")} />
        ) : kbArticleId && !activeArticle ? (
          <MissingArticle id={kbArticleId} onBack={goHome} />
        ) : step === 1 ? (
          <CategoryStep groups={groups} articles={articles} onSelect={goCategory} />
        ) : step === 2 && catGroup ? (
          <SubcategoryStep
            group={catGroup}
            canEdit={canEdit}
            onBack={goHome}
            onSelect={(s) => goSubcategory(catGroup.category, s)}
            onNew={(s) => handleNewArticle(catGroup.category, s ?? undefined)}
          />
        ) : step === 3 && catGroup && subGroup ? (
          <GuideStep
            category={catGroup}
            group={subGroup}
            canEdit={canEdit}
            onBack={() => goCategory(catGroup.category)}
            onOpen={openArticle}
            onNew={() => handleNewArticle(catGroup.category, subGroup.subcategory)}
          />
        ) : activeArticle ? (
          <ArticleReader
            key={activeArticle.id}
            article={activeArticle}
            articles={articles}
            canEdit={canEdit}
            busy={busy}
            backLabel={q ? "Back to search results" : `Back to ${activeArticle.subcategory ?? kbCategoryLabel(activeArticle.category)}`}
            onBack={closeArticle}
            onOpenArticle={openArticle}
            onTag={showTag}
            onEdit={() => setEditing({ article: activeArticle, isNew: false })}
            onDuplicate={() => handleDuplicate(activeArticle)}
            onDelete={() => handleDeleteArticle(activeArticle.id)}
          />
        ) : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <EditArticleModal
            key={editing.article.id || "new"}
            article={editing.article}
            isNew={editing.isNew}
            categories={categoryOptions}
            subcategoriesFor={subcategoriesFor}
            busy={busy}
            onSave={(d) => handleSaveArticle(d, editing.isNew)}
            onCancel={() => setEditing(null)}
            onDelete={() => handleDeleteArticle(editing.article.id)}
          />
        )}
      </Dialog>
    </CodeLinkContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Drill-down steps                                                    */
/* ------------------------------------------------------------------ */

const categoryAccent = (category: string): AccentStyle => ACCENT_STYLES[kbCategoryMeta(category)?.accent ?? "slate"];

function CategoryStep({
  groups,
  articles,
  onSelect,
}: {
  groups: KnowledgeCategoryGroup[];
  articles: KnowledgeArticle[];
  onSelect: (category: string) => void;
}) {
  const stats = React.useMemo(
    () => ({
      subcategories: groups.reduce((n, g) => n + g.subcategoryCount, 0),
      urgent: groups.reduce((n, g) => n + g.priorityCounts.P0 + g.priorityCounts.P1, 0),
      linked: new Set(articles.flatMap((a) => a.relatedTemplates ?? [])).size,
    }),
    [groups, articles],
  );
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Guides" value={articles.length} icon={BookOpen} />
        <StatCard label="Sub-categories" value={stats.subcategories} icon={FolderTree} />
        <StatCard label="Urgent (P0/P1) guides" value={stats.urgent} icon={ShieldAlert} />
        <StatCard label="Linked ticket forms" value={stats.linked} icon={Ticket} />
      </div>
      <StepHeading n={1} title="Choose a category" subtitle="What is the situation about?" />
      {groups.length === 0 ? (
        <div className="text-center py-20 iris-card">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] font-medium">No guides yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
          {groups.map((g, i) => (
            <CategoryCard key={g.category} group={g} index={i} onSelect={() => onSelect(g.category)} />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryCard({ group: g, index, onSelect }: { group: KnowledgeCategoryGroup; index: number; onSelect: () => void }) {
  const meta = kbCategoryMeta(g.category);
  const accent = categoryAccent(g.category);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("text-left iris-card p-4 transition-all hover:shadow-md group iris-fade-in-up relative overflow-hidden flex flex-col", accent.hover)}
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms` }}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", accent.bar)} />
      <div className="flex items-start gap-3">
        <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
          <IconOf icon={categoryIcon(g.category)} className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-snug group-hover:text-primary transition-colors">{meta?.label ?? g.category}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{meta?.tagline ?? "Custom category"}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{g.count}</span> {g.count === 1 ? "guide" : "guides"}
        </span>
        <span>·</span>
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{g.subcategoryCount}</span> sub-categories
        </span>
        <span className="ml-auto">
          <PriorityMix counts={{ P0: g.priorityCounts.P0, P1: g.priorityCounts.P1, P2: 0, P3: 0 }} />
        </span>
      </div>
    </button>
  );
}

function SubcategoryStep({
  group,
  canEdit,
  onBack,
  onSelect,
  onNew,
}: {
  group: KnowledgeCategoryGroup;
  canEdit: boolean;
  onBack: () => void;
  onSelect: (subcategory: string) => void;
  onNew: (subcategory: string | null) => void;
}) {
  const meta = kbCategoryMeta(group.category);
  const accent = categoryAccent(group.category);
  const label = meta?.label ?? group.category;
  const present = new Set(group.subcategories.map((s) => s.subcategory));
  const emptyTaxonomySubs = canEdit ? (meta?.subcategories ?? []).filter((s) => !present.has(s.name)) : [];

  return (
    <div className="space-y-4">
      <div className="iris-card p-4 flex items-start gap-3 flex-wrap">
        <span className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
          <IconOf icon={categoryIcon(group.category)} className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">{label}</div>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-3xl leading-relaxed">{meta?.description ?? "Guides in a custom category."}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{group.count}</span> guides
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{group.subcategoryCount}</span> sub-categories
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{group.steps}</span> action steps
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          All categories
        </Button>
      </div>

      <StepHeading n={2} title="Choose a sub-category" subtitle={`Narrow down the ${label} situation.`}>
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={() => onNew(null)}>
            <Plus className="w-3 h-3 mr-1" />
            New guide in {label}
          </Button>
        )}
      </StepHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {group.subcategories.map((s, i) => (
          <SubcategoryCard key={s.key} group={s} index={i} accent={accent} onSelect={() => onSelect(s.subcategory)} />
        ))}
        {emptyTaxonomySubs.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onNew(s.name)}
            className="text-left rounded-xl border border-dashed border-border p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="text-[13px] font-semibold text-muted-foreground">{s.name}</div>
            <div className="text-[11px] text-muted-foreground mt-1">No guides yet - add the first one.</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubcategoryCard({
  group: s,
  index,
  accent,
  onSelect,
}: {
  group: KnowledgeSubcategoryGroup;
  index: number;
  accent: AccentStyle;
  onSelect: () => void;
}) {
  const description = kbSubcategoryDescription(s.category, s.subcategory);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("text-left iris-card p-4 transition-all hover:shadow-md group iris-fade-in-up flex flex-col", accent.hover)}
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms` }}
    >
      <div className="flex items-start gap-2">
        <FolderTree className={cn("w-4 h-4 mt-0.5 shrink-0", accent.text)} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug group-hover:text-primary transition-colors">{s.subcategory}</div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">
            {description ?? (s.subcategory === KB_GENERAL_SUBCATEGORY ? "Guides without a sub-category." : "Custom sub-category.")}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-auto pt-3 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{s.count}</span> {s.count === 1 ? "guide" : "guides"}
        </span>
        <span className="ml-auto">
          <PriorityMix counts={s.priorityCounts} />
        </span>
      </div>
    </button>
  );
}

function GuideStep({
  category,
  group,
  canEdit,
  onBack,
  onOpen,
  onNew,
}: {
  category: KnowledgeCategoryGroup;
  group: KnowledgeSubcategoryGroup;
  canEdit: boolean;
  onBack: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const accent = categoryAccent(category.category);
  const description = kbSubcategoryDescription(group.category, group.subcategory);
  const label = kbCategoryLabel(category.category);
  return (
    <div className="space-y-4">
      <div className="iris-card p-4 flex items-start gap-3 flex-wrap">
        <span className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
          <IconOf icon={categoryIcon(category.category)} className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-[16px] font-semibold">{group.subcategory}</div>
          {description && <p className="text-[12px] text-muted-foreground mt-0.5 max-w-3xl leading-relaxed">{description}</p>}
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {label} sub-categories
        </Button>
      </div>

      <StepHeading
        n={3}
        title="Choose the guide"
        subtitle={`${group.count} ${group.count === 1 ? "guide" : "guides"}, most urgent first - open one to work through it.`}
      >
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={onNew}>
            <Plus className="w-3 h-3 mr-1" />
            New guide here
          </Button>
        )}
      </StepHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {group.articles.map((a) => (
          <ArticleCard key={a.id} article={a} onOpen={onOpen} showTaxonomy={false} />
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  results,
  query,
  onOpen,
  onClear,
}: {
  results: ScoredArticle[];
  query: string;
  onOpen: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">{results.length}</span> guide{results.length === 1 ? "" : "s"} match “{query}” across all
        categories, best match first
      </div>
      {results.length === 0 ? (
        <div className="text-center py-16 iris-card">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] text-muted-foreground">No guides match your search</div>
          <div className="text-[11px] text-muted-foreground mt-1">Try a symptom (“no hot water”), a template code (“TPL-034”) or browse the categories.</div>
          <Button variant="outline" className="h-8 text-[12px] mt-3" onClick={onClear}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r) => (
            <ArticleCard key={r.article.id} article={r.article} onOpen={onOpen} showTaxonomy />
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityPill({ priority, title }: { priority: Priority; title?: string }) {
  const pc = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("text-[9px] font-semibold px-1 py-px rounded tabular-nums", pc.bg, pc.text)} title={title ?? pc.label}>
      {priority}
    </span>
  );
}

function ArticleCard({ article: a, onOpen, showTaxonomy }: { article: KnowledgeArticle; onOpen: (id: string) => void; showTaxonomy: boolean }) {
  const priority = articlePriority(a);
  const linked = (a.relatedTemplates ?? []).length;
  return (
    <button
      type="button"
      onClick={() => onOpen(a.id)}
      className="text-left iris-card p-4 hover:border-primary/30 transition-colors group flex flex-col"
    >
      <div className="flex items-start gap-2.5 mb-2 w-full">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <IconOf icon={categoryIcon(a.category)} className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground">{a.id}</span>
            {priority && <PriorityPill priority={priority} title={`Typical priority: ${priority}`} />}
          </div>
          <div className="text-[13px] font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">{a.title}</div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <div className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
        {a.summary || <span className="italic">No summary</span>}
      </div>
      <div className="mt-auto flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px] text-muted-foreground">
        {showTaxonomy && (
          <Badge variant="outline" className="text-[10px] h-auto min-h-4 px-1 py-0 font-normal whitespace-normal text-left">
            {kbCategoryLabel(a.category)} › {a.subcategory ?? KB_GENERAL_SUBCATEGORY}
          </Badge>
        )}
        <span className="flex items-center gap-0.5">
          <ListChecks className="w-2.5 h-2.5" />
          {a.steps.length} steps
        </span>
        {linked > 0 && (
          <span className="flex items-center gap-0.5">
            <Ticket className="w-2.5 h-2.5" />
            {linked} ticket form{linked === 1 ? "" : "s"}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {readingMinutes(a)} min
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Reader                                                              */
/* ------------------------------------------------------------------ */

/** Checklist progress per article for this session (survives leaving and reopening the guide). */
const CHECKLIST_PROGRESS = new Map<string, number[]>();

const GLANCE_ICONS: Array<[RegExp, IconType]> = [
  [/priority/i, Gauge],
  [/owner/i, UserRound],
  [/response|respond/i, Timer],
  [/resol/i, CheckCircle2],
];

function ArticleReader({
  article,
  articles,
  canEdit,
  busy,
  backLabel,
  onBack,
  onOpenArticle,
  onTag,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  article: KnowledgeArticle;
  articles: KnowledgeArticle[];
  canEdit: boolean;
  busy: boolean;
  backLabel: string;
  onBack: () => void;
  onOpenArticle: (id: string) => void;
  onTag: (tag: string) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const sections = React.useMemo(() => splitArticleBody(article.body), [article.body]);
  const glance = React.useMemo(() => articleGlance(article), [article]);
  const priority = React.useMemo(() => articlePriority(article), [article]);
  const related = React.useMemo(() => relatedArticles(article, articles), [article, articles]);

  const intro = sections.filter((s) => !s.heading && s.markdown);
  const firstFive = sections.find((s) => s.kind === "firstFive");
  const rest = sections.filter((s) => s.heading && s.kind !== "glance" && s.kind !== "firstFive");
  const dos = rest.find((s) => s.kind === "dos");
  const donts = rest.find((s) => s.kind === "donts");
  // Do / Don't sit side by side, at the position of whichever comes first.
  const pairAnchor = dos && donts ? (rest.indexOf(dos) < rest.indexOf(donts) ? dos : donts) : (dos ?? donts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 text-[12px]" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {backLabel}
        </Button>
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" className="h-8 text-[12px]" onClick={onEdit}>
              <Edit2 className="w-3 h-3 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" className="h-8 text-[12px]" disabled={busy} onClick={onDuplicate}>
              <Copy className="w-3 h-3 mr-1.5" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <header className="space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
          <span className="font-mono">{article.id}</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
            <IconOf icon={categoryIcon(article.category)} className="w-2.5 h-2.5" />
            {kbCategoryLabel(article.category)}
            <ChevronRight className="w-2.5 h-2.5 opacity-60" />
            {article.subcategory ?? KB_GENERAL_SUBCATEGORY}
          </Badge>
          {priority && <PriorityPill priority={priority} title={`Typical priority: ${priority}`} />}
          <span className="flex items-center gap-1">
            <ListChecks className="w-3 h-3" />
            {article.steps.length} steps
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {readingMinutes(article)} min read
          </span>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">{article.title}</h1>
        {article.summary && <p className="text-[13px] text-muted-foreground leading-relaxed max-w-3xl">{article.summary}</p>}
      </header>

      {glance.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2" aria-label="At a glance">
          {glance.map(([label, value]) => {
            return (
              <div key={label} className="iris-card p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <IconOf icon={GLANCE_ICONS.find(([re]) => re.test(label))?.[1] ?? Layers} className="w-3 h-3" />
                  {label}
                </div>
                <div className="text-[12px] leading-snug text-foreground/90">
                  <Md inline text={value} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {intro.map((s, i) => (
            <div key={`intro-${i}`} className="iris-card p-4 sm:p-5">
              <Md text={s.markdown} />
            </div>
          ))}

          {firstFive && <FirstFiveCard section={firstFive} />}

          {article.steps.length > 0 && <StepChecklist article={article} />}

          {rest.map((s, i) => {
            if (s === pairAnchor) {
              return (
                <div key={`dd-${i}`} className={cn("grid gap-3", dos && donts && "sm:grid-cols-2")}>
                  {dos && <DoDontCard section={dos} positive />}
                  {donts && <DoDontCard section={donts} positive={false} />}
                </div>
              );
            }
            if (s === dos || s === donts) return null; // rendered with its pair
            return <SectionCard key={`${s.heading}-${i}`} section={s} />;
          })}
        </div>

        <aside className="space-y-4 min-w-0" aria-label="Related actions">
          <RaiseTicketCard codes={article.relatedTemplates ?? []} />

          {article.escalation && (
            <Callout tone="amber" icon={ShieldAlert} title="When to escalate">
              <LinkedText text={article.escalation} />
            </Callout>
          )}
          {article.prevention && (
            <Callout tone="emerald" icon={ShieldCheck} title="Prevent it next time">
              <LinkedText text={article.prevention} />
            </Callout>
          )}

          {related.length > 0 && (
            <section className="iris-card p-4">
              <h2 className="text-[12px] font-semibold flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                Related guides
              </h2>
              <div className="space-y-1">
                {related.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpenArticle(r.id)}
                    className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted transition-colors group"
                  >
                    <div className="text-[10px] font-mono text-muted-foreground">{r.id}</div>
                    <div className="text-[12px] leading-snug group-hover:text-primary transition-colors">{r.title}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {article.tags && article.tags.length > 0 && (
            <section className="iris-card p-4">
              <h2 className="text-[12px] font-semibold flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-1">
                {article.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTag(t)}
                    title={`Find guides tagged “${t}”`}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function MissingArticle({ id, onBack }: { id: string; onBack: () => void }) {
  return (
    <div className="iris-card max-w-[720px] mx-auto text-center py-16 px-6">
      <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
      <h2 className="text-[16px] font-semibold">Guide {id} isn’t available</h2>
      <p className="text-[13px] text-muted-foreground mt-1">It may have been deleted or renamed by a manager.</p>
      <Button variant="outline" className="h-8 text-[12px] mt-4" onClick={onBack}>
        <ArrowLeft className="w-3 h-3 mr-1.5" />
        Browse all categories
      </Button>
    </div>
  );
}

function StepChecklist({ article }: { article: KnowledgeArticle }) {
  const progressKey = `${article.id}|${article.steps.join("\u0001")}`;
  const [done, setDone] = React.useState<ReadonlySet<number>>(() => new Set(CHECKLIST_PROGRESS.get(progressKey) ?? []));
  const steps = article.steps;
  const doneCount = steps.filter((_, i) => done.has(i)).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  const save = (next: Set<number>) => {
    CHECKLIST_PROGRESS.set(progressKey, [...next]);
    setDone(next);
  };
  const toggle = (i: number) => {
    const next = new Set(done);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    save(next);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stepsAsText(article));
      toast.success("Steps copied");
    } catch {
      toast.error("Couldn't copy - select the steps and copy them manually");
    }
  };

  return (
    <section className="iris-card p-4 sm:p-5" aria-label="Step-by-step">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 className="text-[13px] font-semibold flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-primary" />
            Step-by-step
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tick each step as you go - your progress is kept while IRIS is open.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={copy}>
            <Copy className="w-3 h-3 mr-1" />
            Copy steps
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => save(new Set())} disabled={doneCount === 0}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={doneCount}
          aria-label="Steps completed"
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
          {doneCount}/{steps.length} done
        </span>
      </div>

      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const isDone = done.has(i);
          return (
            <li key={i}>
              <label
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  isDone ? "bg-muted/40 border-border" : "border-border hover:border-primary/30",
                )}
              >
                <input type="checkbox" className="sr-only" checked={isDone} onChange={() => toggle(i)} />
                <span
                  aria-hidden
                  className={cn(
                    "mt-px w-5 h-5 rounded-md border flex items-center justify-center shrink-0 text-[10px] font-bold tabular-nums transition-colors",
                    isDone ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[12.5px] leading-relaxed flex-1",
                    isDone ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground/90",
                  )}
                >
                  <LinkedText text={step} />
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      {steps.length > 0 && doneCount === steps.length && (
        <div className="mt-3 text-[12px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          All steps done - run through “{KB_SECTIONS.closeOut}” before resolving the ticket.
        </div>
      )}
    </section>
  );
}

function FirstFiveCard({ section }: { section: ArticleSection }) {
  const items = parseBulletList(section.markdown);
  return (
    <section className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 sm:p-5" aria-label={section.heading}>
      <h2 className="text-[13px] font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-300 mb-2.5">
        <Zap className="w-4 h-4" />
        {section.heading}
        <span className="text-[11px] font-normal text-rose-700/70 dark:text-rose-300/70">- do these before anything else</span>
      </h2>
      {items ? (
        <ol className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 text-[10px] font-bold tabular-nums mt-px">
                {i + 1}
              </span>
              <span className="flex-1">
                <Md inline text={item} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <Md text={section.markdown} />
      )}
    </section>
  );
}

const SECTION_STYLE: Partial<Record<NonNullable<ArticleSection["kind"]>, { icon: IconType; color: string }>> = {
  diagnose: { icon: Stethoscope, color: "text-sky-500" },
  say: { icon: MessageSquareQuote, color: "text-violet-500" },
  closeOut: { icon: ClipboardCheck, color: "text-primary" },
};

function SectionCard({ section }: { section: ArticleSection }) {
  const style = (section.kind && SECTION_STYLE[section.kind]) || { icon: FileText, color: "text-muted-foreground" };
  const Icon = style.icon;
  let content: React.ReactNode = null;

  if (section.kind === "diagnose") {
    const pairs = parseDiagnose(section.markdown);
    if (pairs) {
      content = (
        <div className="rounded-lg border border-border divide-y divide-border">
          <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 rounded-t-lg">
            <span>If you see</span>
            <span>Do this</span>
          </div>
          {pairs.map(([see, act], i) => (
            <div key={i} className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1 sm:gap-4 px-3 py-2.5">
              <div className="text-[12px] font-semibold leading-snug flex items-start gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                <span>
                  <Md inline text={see} />
                </span>
              </div>
              <div className="text-[12px] leading-snug text-foreground/90 flex items-start gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  <Md inline text={act} />
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }
  } else if (section.kind === "say") {
    const scripts = parseScripts(section.markdown);
    if (scripts) {
      content = (
        <div className="space-y-2">
          {scripts.map(([moment, words], i) => (
            <ScriptCard key={i} moment={moment} words={words} />
          ))}
        </div>
      );
    }
  } else if (section.kind === "closeOut") {
    const items = parseBulletList(section.markdown);
    if (items) {
      content = (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
              <ClipboardCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />
              <span className="flex-1">
                <Md inline text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    }
  }

  return (
    <section className="iris-card p-4 sm:p-5" aria-label={section.heading}>
      <h2 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
        <Icon className={cn("w-4 h-4", style.color)} />
        {section.heading}
      </h2>
      {content ?? <Md text={section.markdown} />}
    </section>
  );
}

function ScriptCard({ moment, words }: { moment: string; words: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(words);
      toast.success("Script copied");
    } catch {
      toast.error("Couldn't copy the script");
    }
  };
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          <Md inline text={moment} />
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          aria-label={`Copy script: ${moment}`}
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>
      <p className="text-[12.5px] leading-relaxed text-foreground/90">“{words}”</p>
    </div>
  );
}

function DoDontCard({ section, positive }: { section: ArticleSection; positive: boolean }) {
  const items = parseBulletList(section.markdown);
  const Icon = positive ? ThumbsUp : Ban;
  const ItemIcon = positive ? Check : X;
  return (
    <section
      className={cn("rounded-xl border p-4", positive ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5")}
      aria-label={section.heading}
    >
      <h2
        className={cn(
          "text-[13px] font-semibold flex items-center gap-1.5 mb-2.5",
          positive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
        )}
      >
        <Icon className="w-4 h-4" />
        {section.heading}
      </h2>
      {items ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
              <ItemIcon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", positive ? "text-emerald-600" : "text-rose-600")} />
              <span className="flex-1">
                <Md inline text={item} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Md text={section.markdown} />
      )}
    </section>
  );
}

function RaiseTicketCard({ codes }: { codes: string[] }) {
  const openTemplate = useAppStore((st) => st.openTemplate);
  const setCurrentView = useAppStore((st) => st.setCurrentView);
  return (
    <section className="iris-card p-4">
      <h2 className="text-[12px] font-semibold flex items-center gap-1.5">
        <Ticket className="w-3.5 h-3.5 text-primary" />
        Raise a ticket
      </h2>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Opens the preset ticket form for this situation, ready to fill in and submit.</p>
      {codes.length === 0 ? (
        <Button variant="outline" className="h-8 text-[12px] w-full" onClick={() => setCurrentView("templates")}>
          Browse ticket templates
        </Button>
      ) : (
        <div className="space-y-1.5">
          {codes.map((code) => {
            const t = TEMPLATE_MAP[code];
            if (!t) {
              return (
                <div key={code} className="rounded-lg border border-dashed border-border p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-mono">{code}</span> - template no longer available
                </div>
              );
            }
            return (
              <button
                key={code}
                type="button"
                onClick={() => openTemplate(code)}
                className="w-full text-left rounded-lg border border-border p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">{code}</span>
                  <PriorityPill priority={t.defaultPriority} title={`Default priority: ${t.defaultPriority}`} />
                  <ArrowRight className="ml-auto w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[12px] font-medium leading-snug group-hover:text-primary transition-colors">{t.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {t.category}
                  {t.subcategory ? ` › ${t.subcategory}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Callout({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "amber" | "emerald";
  icon: IconType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("p-4 rounded-xl border", tone === "amber" ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
      <h2
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1",
          tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
        )}
      >
        <Icon className="w-3 h-3" />
        {title}
      </h2>
      <div className="text-[12px] text-foreground/90 leading-relaxed">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Edit modal - full editable form                                     */
/* ------------------------------------------------------------------ */

function EditArticleModal({
  article,
  isNew,
  categories,
  subcategoriesFor,
  busy,
  onSave,
  onCancel,
  onDelete,
}: {
  article: KnowledgeArticle;
  isNew: boolean;
  categories: string[];
  /** Suggested sub-categories for a category (taxonomy + ones already in use). */
  subcategoriesFor: (category: string) => string[];
  busy: boolean;
  onSave: (updated: KnowledgeArticle) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = React.useState<KnowledgeArticle>({
    ...article,
    steps: [...article.steps],
    relatedTemplates: article.relatedTemplates ? [...article.relatedTemplates] : [],
  });
  const [newTemplate, setNewTemplate] = React.useState("");
  const [tagText, setTagText] = React.useState((article.tags ?? []).join(", "));
  const [preview, setPreview] = React.useState(false);

  const update = <K extends keyof KnowledgeArticle>(key: K, value: KnowledgeArticle[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  // Moving a guide to another category picks that category's first sub-category,
  // unless the current one also exists there.
  const changeCategory = (category: string) => {
    setDraft((d) => {
      const options = subcategoriesFor(category);
      const keep = d.subcategory && options.includes(d.subcategory);
      return { ...d, category, subcategory: keep ? d.subcategory : (options[0] ?? KB_GENERAL_SUBCATEGORY) };
    });
  };
  const subcategoryOptions = subcategoriesFor(draft.category);

  const updateStep = (index: number, value: string) => {
    const next = [...draft.steps];
    next[index] = value;
    update("steps", next);
  };

  const addStep = () => {
    update("steps", [...draft.steps, ""]);
  };

  const removeStep = (index: number) => {
    update(
      "steps",
      draft.steps.filter((_, i) => i !== index),
    );
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draft.steps.length) return;
    const next = [...draft.steps];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    update("steps", next);
  };

  const addRelatedTemplate = () => {
    const v = newTemplate.trim().toUpperCase();
    if (!v) return;
    if (!TEMPLATE_MAP[v]) {
      toast.error(`${v} isn't a template code - use a code like TPL-034`);
      return;
    }
    if (!draft.relatedTemplates?.includes(v)) update("relatedTemplates", [...(draft.relatedTemplates || []), v]);
    setNewTemplate("");
  };

  const removeRelatedTemplate = (t: string) => {
    update(
      "relatedTemplates",
      (draft.relatedTemplates || []).filter((x) => x !== t),
    );
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const cleanedSteps = draft.steps.map((s) => s.trim()).filter((s) => s.length > 0);
    if (cleanedSteps.length === 0 && !(draft.body ?? "").trim()) {
      toast.error("Add at least one step or a markdown body");
      return;
    }
    onSave({
      ...draft,
      id: draft.id.trim().toUpperCase(),
      title: draft.title.trim(),
      subcategory: draft.subcategory?.trim() || KB_GENERAL_SUBCATEGORY,
      body: draft.body ?? "",
      tags: tagText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      summary: draft.summary.trim(),
      steps: cleanedSteps,
      prevention: draft.prevention?.trim() || undefined,
      escalation: draft.escalation?.trim() || undefined,
      relatedTemplates: draft.relatedTemplates && draft.relatedTemplates.length > 0 ? draft.relatedTemplates : undefined,
    });
  };

  return (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto iris-scrollbar">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Edit2 className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{isNew ? "New Article" : "Edit Article"}</span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">{draft.title || "Untitled Article"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Title */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Title</label>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            className="text-[13px] h-9"
            placeholder="e.g. Sound System Failure - Studio Audio Troubleshooting"
          />
        </div>

        {/* ID + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Article ID {isNew && <span className="font-normal">(auto if blank)</span>}</label>
            <Input
              disabled={!isNew}
              value={draft.id}
              onChange={(e) => update("id", e.target.value.toUpperCase())}
              className="text-[12px] font-mono h-9"
              placeholder="KB-XXX"
            />
          </div>
          <div className="iris-edit-form-row">
            <label className="iris-edit-form-label">Category</label>
            <select
              value={draft.category}
              onChange={(e) => changeCategory(e.target.value)}
              className="h-9 text-[12px] rounded-md border border-border bg-background px-2 w-full"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {kbCategoryLabel(c)}
                </option>
              ))}
              {/* Allow custom categories the user might add via a brand-new article */}
              {!categories.includes(draft.category) && <option value={draft.category}>{draft.category}</option>}
            </select>
          </div>
        </div>

        {/* Sub-category - the second step of the Knowledge Base drill-down */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label" htmlFor="iris-kb-subcategory">
            Sub-category <span className="font-normal">(pick one or type a new one)</span>
          </label>
          <Input
            id="iris-kb-subcategory"
            list="iris-kb-subcategories"
            value={draft.subcategory ?? ""}
            onChange={(e) => update("subcategory", e.target.value)}
            className="text-[12px] h-9"
            placeholder={subcategoryOptions[0] ?? KB_GENERAL_SUBCATEGORY}
          />
          <datalist id="iris-kb-subcategories">
            {subcategoryOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {subcategoryOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {subcategoryOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update("subcategory", s)}
                  aria-pressed={draft.subcategory === s}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded-full border transition-colors",
                    draft.subcategory === s
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Summary</label>
          <Textarea
            value={draft.summary}
            onChange={(e) => update("summary", e.target.value)}
            className="text-[13px] min-h-[60px] resize-y"
            placeholder="One or two sentences describing what this article covers and when to use it."
          />
        </div>

        {/* Steps editor - the heart of the knowledge doc */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Troubleshooting Steps ({draft.steps.length})</label>
          <div className="iris-edit-field-list">
            {draft.steps.length === 0 && <div className="text-[11px] text-muted-foreground italic">No steps yet - add the first one below.</div>}
            {draft.steps.map((step, i) => (
              <div key={i} className="iris-edit-step-row">
                <div className="iris-edit-step-num">{i + 1}</div>
                <Textarea
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="text-[12px] min-h-[38px] resize-y"
                  placeholder={`Step ${i + 1} - what to do...`}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => moveStep(i, "up")}
                    disabled={i === 0}
                    title="Move up"
                  >
                    <ChevronRight className="w-3 h-3 -rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => moveStep(i, "down")}
                    disabled={i === draft.steps.length - 1}
                    title="Move down"
                  >
                    <ChevronRight className="w-3 h-3 rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-rose-500"
                    onClick={() => removeStep(i)}
                    title="Remove step"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] w-full" onClick={addStep}>
              <Plus className="w-3 h-3 mr-1.5" />
              Add Step
            </Button>
          </div>
        </div>

        {/* Markdown body */}
        <div className="iris-edit-form-row">
          <div className="flex items-center justify-between gap-2">
            <label className="iris-edit-form-label">Guide sections (markdown)</label>
            <div className="flex items-center gap-3">
              {!(draft.body ?? "").trim() && !preview && (
                <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => update("body", ARTICLE_OUTLINE)}>
                  Insert outline
                </button>
              )}
              <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-0.5">
            Sections titled {Object.values(KB_SECTIONS).map((h) => `“${h}”`).join(", ")} get special layouts in the reader. Mention TPL-… or KB-…
            codes to link them.
          </p>
          {preview ? (
            <div className="rounded-md border border-border p-3 min-h-[160px]">
              {(draft.body ?? "").trim() ? <Md text={draft.body ?? ""} /> : <span className="text-[13px] italic text-muted-foreground">Nothing to preview</span>}
            </div>
          ) : (
            <Textarea
              value={draft.body ?? ""}
              onChange={(e) => update("body", e.target.value)}
              className="text-[12px] min-h-[200px] resize-y font-mono"
              placeholder={"## First 5 minutes\n- What to check first\n\n## If you see… do this\n- **Symptom** - what to do"}
            />
          )}
        </div>

        {/* Tags */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Tags (comma separated)</label>
          <Input value={tagText} onChange={(e) => setTagText(e.target.value)} className="text-[12px] h-9" placeholder="ac, hvac, urgent" />
        </div>

        {/* Prevention */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Prevention (optional)</label>
          <Textarea
            value={draft.prevention || ""}
            onChange={(e) => update("prevention", e.target.value)}
            className="text-[12px] min-h-[50px] resize-y"
            placeholder="How to prevent this issue from recurring."
          />
        </div>

        {/* Escalation */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Escalation Criteria (optional)</label>
          <Textarea
            value={draft.escalation || ""}
            onChange={(e) => update("escalation", e.target.value)}
            className="text-[12px] min-h-[50px] resize-y"
            placeholder="When to escalate this issue and to whom."
          />
        </div>

        {/* Related templates */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">Related Templates ({draft.relatedTemplates?.length || 0})</label>
          <div className="iris-edit-field-list">
            {draft.relatedTemplates && draft.relatedTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.relatedTemplates.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-primary/10 text-primary font-medium"
                    title={TEMPLATE_MAP[t]?.title ?? "Unknown template"}
                  >
                    {t}
                    {TEMPLATE_MAP[t] && <span className="font-normal text-primary/80 max-w-[180px] truncate">· {TEMPLATE_MAP[t].title}</span>}
                    <button type="button" onClick={() => removeRelatedTemplate(t)} className="hover:text-rose-500" title="Remove">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="iris-edit-field-row">
              <Input
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRelatedTemplate();
                  }
                }}
                placeholder="Add a related template code (e.g. TPL-034)"
                className="text-[12px] h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px] shrink-0"
                onClick={addRelatedTemplate}
                disabled={!newTemplate.trim()}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {!isNew && (
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className="h-8 text-[12px]" onClick={handleSave} disabled={busy}>
            <Save className="w-3 h-3 mr-1.5" />
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: IconType }) {
  return (
    <div className="iris-card p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-[16px] font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
