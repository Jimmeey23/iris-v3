"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { KNOWLEDGE_ARTICLES, KNOWLEDGE_CATEGORIES, type KnowledgeArticle } from "@/lib/iris/knowledge-base-data";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Search,
  Plus,
  Clock,
  TrendingUp,
  HelpCircle,
  Wrench,
  Users,
  CreditCard,
  Calendar,
  Shield,
  ChevronRight,
  Star,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Edit2,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Class Experience": Users,
  "Trainer Feedback": Users,
  "Repair and Maintenance": Wrench,
  "Pricing and Memberships": CreditCard,
  "Scheduling": Calendar,
  "Safety and Security": Shield,
  "Customer Service and Communication": Users,
  "Theft and Lost Items": AlertTriangle,
};

export function KnowledgeBaseView() {
  const { setCurrentView } = useAppStore();

  // Lift articles into state so edits persist for the session.
  const [articles, setArticles] = React.useState<KnowledgeArticle[]>(() =>
    KNOWLEDGE_ARTICLES.map((a) => ({ ...a, steps: [...a.steps] })),
  );

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const selectedArticle = React.useMemo(
    () => articles.find((a) => a.id === selectedId) ?? null,
    [articles, selectedId],
  );
  const editingArticle = React.useMemo(
    () => articles.find((a) => a.id === editingId) ?? null,
    [articles, editingId],
  );

  const filtered = React.useMemo(() => {
    return articles.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) &&
            !a.summary.toLowerCase().includes(q) &&
            !a.steps.some((s) => s.toLowerCase().includes(q))) return false;
      }
      if (category !== "all" && a.category !== category) return false;
      return true;
    });
  }, [articles, search, category]);

  const handleSaveArticle = (updated: KnowledgeArticle) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    setEditingId(null);
    if (selectedId === updated.id) setSelectedId(updated.id);
  };

  const handleNewArticle = () => {
    // Generate a fresh id that doesn't collide with existing articles
    const maxNum = articles.reduce((max, a) => {
      const m = a.id.match(/^KB-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const id = `KB-${String(maxNum + 1).padStart(3, "0")}`;
    const fresh: KnowledgeArticle = {
      id,
      title: "Untitled Article",
      category: KNOWLEDGE_CATEGORIES[0] || "Repair and Maintenance",
      summary: "",
      steps: [""],
      prevention: "",
      escalation: "",
      relatedTemplates: [],
    };
    setArticles((prev) => [fresh, ...prev]);
    setEditingId(id);
    setSelectedId(null);
  };

  const handleDeleteArticle = (id: string) => {
    if (!window.confirm(`Delete article ${id}? This cannot be undone.`)) return;
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setEditingId(null);
    setSelectedId(null);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
            <BookOpen className="w-3 h-3" />
            {articles.length} Articles · Curated
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Operational guides, troubleshooting steps, and protocols - curated from the P57 Brand Book and member issue data. Click any article to view, then "Edit Article" to revise steps or add new sections.
          </p>
        </div>
        <Button className="h-8 text-[12px]" onClick={handleNewArticle}>
          <Plus className="w-3 h-3 mr-1.5" />
          New Article
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total Articles" value={articles.length} icon={BookOpen} />
        <StatCard label="Categories" value={KNOWLEDGE_CATEGORIES.length} icon={HelpCircle} />
        <StatCard label="Troubleshooting" value={articles.filter((a) => a.category === "Repair and Maintenance").length} icon={Wrench} />
        <StatCard label="Safety Protocols" value={articles.filter((a) => a.category === "Safety and Security").length} icon={Shield} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
              category === "all" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {KNOWLEDGE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c] || BookOpen;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                  category === c ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {articles.length} articles
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a, i) => {
          const Icon = CATEGORY_ICONS[a.category] || BookOpen;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className="text-left iris-card p-4 hover:border-primary/30 transition-colors iris-fade-in-up group"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-muted-foreground">{a.id}</div>
                  <div className="text-[13px] font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {a.title}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                {a.summary || <span className="italic">No summary</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px] h-4 px-1">{a.category}</Badge>
                <span className="flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {a.steps.length} steps
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-[13px] text-muted-foreground">No articles match your search</div>
        </div>
      )}

      {/* Article Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selectedArticle && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{selectedArticle.id}</span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{selectedArticle.category}</Badge>
              </div>
              <DialogTitle className="text-[16px] leading-tight">{selectedArticle.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
                <p className="text-[13px] text-foreground/90 leading-relaxed">{selectedArticle.summary || <span className="italic text-muted-foreground">No summary</span>}</p>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  Troubleshooting Steps
                </div>
                <div className="space-y-2">
                  {selectedArticle.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md border border-border">
                      <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[11px] font-bold tabular-nums">
                        {i + 1}
                      </div>
                      <div className="text-[12px] text-foreground/90 leading-relaxed flex-1">{step}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedArticle.prevention && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Prevention
                  </div>
                  <div className="text-[12px] text-foreground/90 leading-relaxed">{selectedArticle.prevention}</div>
                </div>
              )}

              {selectedArticle.escalation && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Escalation Criteria
                  </div>
                  <div className="text-[12px] text-foreground/90 leading-relaxed">{selectedArticle.escalation}</div>
                </div>
              )}

              {selectedArticle.relatedTemplates && selectedArticle.relatedTemplates.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Related Templates</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedArticle.relatedTemplates.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedId(null); setCurrentView("templates"); }}
                        className="px-2 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={() => {
                    setEditingId(selectedArticle.id);
                    setSelectedId(null);
                  }}
                >
                  <Edit2 className="w-3 h-3 mr-1.5" />
                  Edit Article
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  onClick={() => handleDeleteArticle(selectedArticle.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* === EDIT ARTICLE DIALOG === */}
      <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingId(null)}>
        {editingArticle && (
          <EditArticleModal
            article={editingArticle}
            categories={KNOWLEDGE_CATEGORIES}
            onSave={handleSaveArticle}
            onCancel={() => setEditingId(null)}
            onDelete={() => handleDeleteArticle(editingArticle.id)}
          />
        )}
      </Dialog>
    </div>
  );
}

/* === Edit modal — full editable form === */

function EditArticleModal({
  article, categories, onSave, onCancel, onDelete,
}: {
  article: KnowledgeArticle;
  categories: string[];
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

  React.useEffect(() => {
    setDraft({
      ...article,
      steps: [...article.steps],
      relatedTemplates: article.relatedTemplates ? [...article.relatedTemplates] : [],
    });
    setNewTemplate("");
  }, [article]);

  const update = <K extends keyof KnowledgeArticle>(key: K, value: KnowledgeArticle[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const updateStep = (index: number, value: string) => {
    const next = [...draft.steps];
    next[index] = value;
    update("steps", next);
  };

  const addStep = () => {
    update("steps", [...draft.steps, ""]);
  };

  const removeStep = (index: number) => {
    update("steps", draft.steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draft.steps.length) return;
    const next = [...draft.steps];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    update("steps", next);
  };

  const addRelatedTemplate = () => {
    const v = newTemplate.trim();
    if (!v) return;
    if (draft.relatedTemplates?.includes(v)) {
      setNewTemplate("");
      return;
    }
    update("relatedTemplates", [...(draft.relatedTemplates || []), v]);
    setNewTemplate("");
  };

  const removeRelatedTemplate = (t: string) => {
    update("relatedTemplates", (draft.relatedTemplates || []).filter((x) => x !== t));
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!draft.id.trim()) {
      alert("ID is required");
      return;
    }
    // Filter out empty steps and trim
    const cleanedSteps = draft.steps.map((s) => s.trim()).filter((s) => s.length > 0);
    if (cleanedSteps.length === 0) {
      alert("At least one step is required");
      return;
    }
    onSave({
      ...draft,
      id: draft.id.trim(),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      steps: cleanedSteps,
      prevention: draft.prevention?.trim() || undefined,
      escalation: draft.escalation?.trim() || undefined,
      relatedTemplates: draft.relatedTemplates && draft.relatedTemplates.length > 0 ? draft.relatedTemplates : undefined,
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto iris-scrollbar">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Edit2 className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Edit Article
          </span>
        </div>
        <DialogTitle className="text-[16px] leading-tight">
          {draft.title || "Untitled Article"}
        </DialogTitle>
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
            <label className="iris-edit-form-label">Article ID</label>
            <Input
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
              onChange={(e) => update("category", e.target.value)}
              className="h-9 text-[12px] rounded-md border border-border bg-background px-2 w-full"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              {/* Allow custom categories the user might add via a brand-new article */}
              {!categories.includes(draft.category) && (
                <option value={draft.category}>{draft.category}</option>
              )}
            </select>
          </div>
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

        {/* Steps editor — the heart of the knowledge doc */}
        <div className="iris-edit-form-row">
          <label className="iris-edit-form-label">
            Troubleshooting Steps ({draft.steps.length})
          </label>
          <div className="iris-edit-field-list">
            {draft.steps.length === 0 && (
              <div className="text-[11px] text-muted-foreground italic">No steps yet - add the first one below.</div>
            )}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[11px] w-full"
              onClick={addStep}
            >
              <Plus className="w-3 h-3 mr-1.5" />Add Step
            </Button>
          </div>
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
          <label className="iris-edit-form-label">
            Related Templates ({draft.relatedTemplates?.length || 0})
          </label>
          <div className="iris-edit-field-list">
            {draft.relatedTemplates && draft.relatedTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.relatedTemplates.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-primary/10 text-primary font-medium"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeRelatedTemplate(t)}
                      className="hover:text-rose-500"
                      title="Remove"
                    >
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
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 mr-1" />Delete
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            className="h-8 text-[12px]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-8 text-[12px]"
            onClick={handleSave}
          >
            <Save className="w-3 h-3 mr-1.5" />Save Changes
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
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
