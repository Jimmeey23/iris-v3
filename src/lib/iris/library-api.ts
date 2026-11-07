"use client";

// Client side of the editable library (ticket templates + knowledge docs).
// Persisted in Neon via /api/templates and /api/knowledge. The in-code arrays
// (TICKET_TEMPLATES, KNOWLEDGE_ARTICLES) are mutated in place — same approach as
// live-data.ts — so the AI assistant / intelligence code sees edits too.

import { api } from "./live-data";
import { useAppStore } from "./store";
import { TICKET_TEMPLATES, TEMPLATE_MAP, type TicketTemplate } from "./templates";
import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "./knowledge-base-data";

function replaceArray<T>(target: T[], items: T[]) {
  target.length = 0;
  target.push(...items);
}

export function hydrateTemplates(items: TicketTemplate[]) {
  replaceArray(TICKET_TEMPLATES, items);
  for (const k of Object.keys(TEMPLATE_MAP)) delete TEMPLATE_MAP[k];
  for (const t of items) TEMPLATE_MAP[t.code] = t;
  useAppStore.getState().bumpData();
}

export function hydrateDocs(items: KnowledgeArticle[]) {
  replaceArray(KNOWLEDGE_ARTICLES, items);
  useAppStore.getState().bumpData();
}

/** Load both collections; called right after login. Failures keep the in-code defaults. */
export async function loadLibrary() {
  const [t, k] = await Promise.allSettled([
    api<{ templates: TicketTemplate[] }>("/api/templates"),
    api<{ docs: KnowledgeArticle[] }>("/api/knowledge"),
  ]);
  if (t.status === "fulfilled" && t.value.templates.length) hydrateTemplates(t.value.templates);
  if (k.status === "fulfilled" && k.value.docs.length) hydrateDocs(k.value.docs);
}

export const templatesApi = {
  create: async (body: Partial<TicketTemplate>) => {
    const { template } = await api<{ template: TicketTemplate }>("/api/templates", { method: "POST", json: body });
    hydrateTemplates([template, ...TICKET_TEMPLATES]);
    return template;
  },
  update: async (code: string, body: Partial<TicketTemplate>) => {
    const { template } = await api<{ template: TicketTemplate }>(`/api/templates/${encodeURIComponent(code)}`, { method: "PATCH", json: body });
    hydrateTemplates(TICKET_TEMPLATES.map((t) => (t.code === code ? template : t)));
    return template;
  },
  remove: async (code: string) => {
    await api(`/api/templates/${encodeURIComponent(code)}`, { method: "DELETE" });
    hydrateTemplates(TICKET_TEMPLATES.filter((t) => t.code !== code));
  },
  duplicate: async (t: TicketTemplate) => {
    const { code: _code, ...rest } = t;
    return templatesApi.create({ ...rest, title: `${t.title} (copy)` });
  },
};

export const knowledgeApi = {
  create: async (body: Partial<KnowledgeArticle>) => {
    const { doc } = await api<{ doc: KnowledgeArticle }>("/api/knowledge", { method: "POST", json: body });
    hydrateDocs([doc, ...KNOWLEDGE_ARTICLES]);
    return doc;
  },
  update: async (id: string, body: Partial<KnowledgeArticle>) => {
    const { doc } = await api<{ doc: KnowledgeArticle }>(`/api/knowledge/${encodeURIComponent(id)}`, { method: "PATCH", json: body });
    hydrateDocs(KNOWLEDGE_ARTICLES.map((a) => (a.id === id ? doc : a)));
    return doc;
  },
  remove: async (id: string) => {
    await api(`/api/knowledge/${encodeURIComponent(id)}`, { method: "DELETE" });
    hydrateDocs(KNOWLEDGE_ARTICLES.filter((a) => a.id !== id));
  },
  duplicate: async (a: KnowledgeArticle) => {
    const { id: _id, ...rest } = a;
    return knowledgeApi.create({ ...rest, title: `${a.title} (copy)` });
  },
};
