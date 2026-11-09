"use client";

import { create } from "zustand";
import { absUrl } from "./utils";

/**
 * Small per-user collections that live in `user_preferences.preferences` (jsonb).
 *
 * `save_preferences` merges the patch's `preferences` object key-by-key (`||`), so each
 * collection is written under its own key and never clobbers the settings-store keys
 * (compact_mode, animations, …) or the other collection.
 */

export type TicketFilterSnapshot = {
  search: string;
  priority: string[];
  status: string[];
  studio: string[];
  department: string[];
  slaStatus: string[];
};

export type SavedTicketView = {
  id: string;
  name: string;
  scope: "open" | "all" | "done";
  quick: string[];
  filters: TicketFilterSnapshot;
  sortBy?: string;
  group1?: string;
  createdAt: string;
};

export type IntakeDraft = {
  id: string;
  title: string;
  templateId: string | null;
  category: string;
  subcategory: string;
  payload: Record<string, unknown>;
  updatedAt: string;
};

export const MAX_SAVED_VIEWS = 12;
export const MAX_INTAKE_DRAFTS = 3;

const VIEWS_KEY = "saved_ticket_views";
const DRAFTS_KEY = "intake_drafts";
/** Bump the version to show a new tour to everyone again. */
export const TOUR_KEY = "tour_v3_completed_at";

type Store = {
  views: SavedTicketView[];
  drafts: IntakeDraft[];
  /** null until preferences have loaded, so the tour never flashes for people who finished it. */
  tourCompletedAt: string | null | undefined;
  completeTour: () => Promise<void>;
  hydrate: (extra: unknown) => void;
  saveView: (view: Omit<SavedTicketView, "id" | "createdAt">) => Promise<SavedTicketView>;
  deleteView: (id: string) => Promise<void>;
  saveDraft: (draft: Omit<IntakeDraft, "id" | "updatedAt"> & { id?: string }) => Promise<IntakeDraft>;
  deleteDraft: (id: string) => Promise<void>;
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function asArray<T>(v: unknown, ok: (x: any) => boolean): T[] {
  return Array.isArray(v) ? (v.filter(ok) as T[]) : [];
}

async function persist(key: string, value: unknown) {
  const res = await fetch(absUrl("/api/preferences"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { [key]: value } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not save");
  }
}

export const useUserCollections = create<Store>()((set, get) => ({
  views: [],
  drafts: [],
  tourCompletedAt: undefined,

  hydrate: (extra) => {
    const e = extra && typeof extra === "object" ? (extra as Record<string, unknown>) : {};
    set({
      views: asArray<SavedTicketView>(e[VIEWS_KEY], (x) => x && typeof x.id === "string" && typeof x.name === "string" && x.filters),
      drafts: asArray<IntakeDraft>(e[DRAFTS_KEY], (x) => x && typeof x.id === "string" && x.payload && typeof x.payload === "object"),
      tourCompletedAt: typeof e[TOUR_KEY] === "string" ? (e[TOUR_KEY] as string) : null,
    });
  },

  completeTour: async () => {
    const at = new Date().toISOString();
    set({ tourCompletedAt: at });
    // Best effort: if the save fails the tour simply shows again next sign-in.
    await persist(TOUR_KEY, at).catch(() => {});
  },

  saveView: async (view) => {
    const prev = get().views;
    const name = view.name.trim().slice(0, 60);
    if (!name) throw new Error("Give the view a name");
    // Same name replaces — saving "Breached P0s" twice updates it rather than duplicating.
    const existing = prev.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (!existing && prev.length >= MAX_SAVED_VIEWS) throw new Error(`You can keep up to ${MAX_SAVED_VIEWS} saved views. Delete one first.`);
    const saved: SavedTicketView = { ...view, name, id: existing?.id ?? newId("view"), createdAt: existing?.createdAt ?? new Date().toISOString() };
    const next = existing ? prev.map((v) => (v.id === existing.id ? saved : v)) : [...prev, saved];
    set({ views: next });
    try { await persist(VIEWS_KEY, next); } catch (err) { set({ views: prev }); throw err; }
    return saved;
  },

  deleteView: async (id) => {
    const prev = get().views;
    const next = prev.filter((v) => v.id !== id);
    set({ views: next });
    try { await persist(VIEWS_KEY, next); } catch (err) { set({ views: prev }); throw err; }
  },

  saveDraft: async (draft) => {
    const prev = get().drafts;
    const existing = draft.id ? prev.find((d) => d.id === draft.id) : undefined;
    if (!existing && prev.length >= MAX_INTAKE_DRAFTS) {
      throw new Error(`You already have ${MAX_INTAKE_DRAFTS} saved drafts. Resume or delete one before saving another.`);
    }
    const saved: IntakeDraft = {
      id: existing?.id ?? newId("draft"),
      title: (draft.title || "Untitled draft").trim().slice(0, 180),
      templateId: draft.templateId ?? null,
      category: draft.category,
      subcategory: draft.subcategory,
      payload: draft.payload,
      updatedAt: new Date().toISOString(),
    };
    const next = existing ? prev.map((d) => (d.id === existing.id ? saved : d)) : [saved, ...prev];
    set({ drafts: next });
    try { await persist(DRAFTS_KEY, next); } catch (err) { set({ drafts: prev }); throw err; }
    return saved;
  },

  deleteDraft: async (id) => {
    const prev = get().drafts;
    const next = prev.filter((d) => d.id !== id);
    set({ drafts: next });
    try { await persist(DRAFTS_KEY, next); } catch (err) { set({ drafts: prev }); throw err; }
  },
}));
