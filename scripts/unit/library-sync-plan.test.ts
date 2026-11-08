import { describe, expect, it } from "bun:test";
import {
  LEGACY_DOC_SEED,
  LEGACY_TEMPLATE_SEED,
  builtinDocItems,
  builtinTemplateItems,
  contentHash,
  finalizeRecords,
  libraryVersion,
  planCollectionSync,
  sortOrderFor,
  stableStringify,
  type ExistingRow,
  type SyncRecord,
} from "../../src/lib/iris/library-sync-plan";

const seed = new Set(["TPL-001", "TPL-002"]);
const row = (key: string, over: Partial<ExistingRow> = {}): ExistingRow => ({
  key,
  userCreated: false,
  pristine: true,
  atUs: "1000",
  ...over,
});

describe("library sync planner", () => {
  it("hashes content independently of key order", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe('{"a":[2,{"c":4,"d":3}],"b":1}');
    expect(contentHash({ x: 1, y: "z" })).toBe(contentHash({ y: "z", x: 1 }));
    expect(contentHash({ x: 1 })).not.toBe(contentHash({ x: 2 }));
  });

  it("first run: upgrades pristine seed rows, inserts new built-ins, leaves edited or foreign rows alone", () => {
    const builtins = [
      { key: "TPL-001", hash: "a" },
      { key: "TPL-002", hash: "b" },
      { key: "TPL-150", hash: "c" },
      { key: "TPL-151", hash: "d" },
    ];
    const rows = [
      row("TPL-001"), // pristine seed row
      row("TPL-002", { pristine: false }), // seed row someone edited
      row("TPL-150", { userCreated: true }), // a manager's own template that took this code
    ];
    const plan = planCollectionSync(builtins, rows, undefined, seed);
    expect(plan.update).toEqual(["TPL-001"]);
    expect(plan.insert).toEqual(["TPL-151"]);
    expect(plan.records["TPL-002"]).toEqual({ h: "b", at: null });
    expect(plan.records["TPL-150"]).toEqual({ h: "c", at: null });

    const next = finalizeRecords(plan.records, { "TPL-001": "2000", "TPL-151": "2000" }, undefined);
    expect(next["TPL-001"]).toEqual({ h: "a", at: "2000" });
    expect(next["TPL-151"]).toEqual({ h: "d", at: "2000" });
  });

  it("never re-creates seed rows deleted before the sync existed, but bootstraps an empty table", () => {
    const builtins = [
      { key: "TPL-001", hash: "a" },
      { key: "TPL-002", hash: "b" },
    ];
    const plan = planCollectionSync(builtins, [row("TPL-001")], undefined, seed);
    expect(plan.insert).toEqual([]);
    expect(plan.records["TPL-002"]).toEqual({ h: "b", at: null });
    const fresh = planCollectionSync(builtins, [], undefined, seed);
    expect(fresh.insert).toEqual(["TPL-001", "TPL-002"]);
  });

  it("a pristine row outside the legacy seed is never treated as a seed row", () => {
    const plan = planCollectionSync([{ key: "TPL-200", hash: "x" }], [row("TPL-200")], undefined, seed);
    expect(plan.update).toEqual([]);
    expect(plan.records["TPL-200"].at).toBeNull();
  });

  it("later runs: upgrade only untouched rows, never resurrect deletions, keep owned rows owned", () => {
    const prev: Record<string, SyncRecord> = {
      "TPL-001": { h: "a", at: "2000" }, // untouched since our write
      "TPL-003": { h: "c", at: "2000" }, // edited in the app since our write
      "TPL-004": { h: "d", at: "2000" }, // deleted in the app
      "TPL-005": { h: "e", at: null }, // owned by a person
      "TPL-006": { h: "f", at: "2000" }, // unchanged built-in
      "TPL-099": { h: "z", at: "2000" }, // no longer shipped
    };
    const builtins = [
      { key: "TPL-001", hash: "a2" },
      { key: "TPL-003", hash: "c2" },
      { key: "TPL-004", hash: "d2" },
      { key: "TPL-005", hash: "e2" },
      { key: "TPL-006", hash: "f" },
    ];
    const rows = [row("TPL-001", { atUs: "2000" }), row("TPL-003", { atUs: "3000" }), row("TPL-005"), row("TPL-006", { atUs: "2000" })];
    const plan = planCollectionSync(builtins, rows, prev, seed);
    expect(plan.insert).toEqual([]);
    expect(plan.update).toEqual(["TPL-001"]);
    expect(plan.records["TPL-003"]).toEqual({ h: "c", at: null });
    expect(plan.records["TPL-004"]).toEqual(prev["TPL-004"]);
    expect(plan.records["TPL-005"]).toEqual(prev["TPL-005"]);
    expect(plan.records["TPL-006"]).toEqual(prev["TPL-006"]);
    expect(plan.records["TPL-099"]).toEqual(prev["TPL-099"]);
  });

  it("keeps the previous record when a planned write did not happen", () => {
    const prev = { "TPL-001": { h: "a", at: "2000" } };
    const plan = planCollectionSync([{ key: "TPL-001", hash: "a2" }, { key: "TPL-300", hash: "n" }], [row("TPL-001", { atUs: "2000" })], prev, seed);
    expect(plan.update).toEqual(["TPL-001"]);
    expect(plan.insert).toEqual(["TPL-300"]);
    const next = finalizeRecords(plan.records, {}, prev);
    expect(next["TPL-001"]).toEqual(prev["TPL-001"]);
    expect(next["TPL-300"]).toBeUndefined();
  });

  it("describes the shipped library", () => {
    const t = builtinTemplateItems();
    const d = builtinDocItems();
    expect(t.length).toBeGreaterThanOrEqual(211);
    expect(new Set(t.map((i) => i.key)).size).toBe(t.length);
    expect(new Set(d.map((i) => i.key)).size).toBe(d.length);
    for (const k of LEGACY_TEMPLATE_SEED) expect(t.some((i) => i.key === k)).toBe(true);
    for (const k of LEGACY_DOC_SEED) expect(d.some((i) => i.key === k)).toBe(true);
    expect(libraryVersion(t, d)).toBe(libraryVersion(builtinTemplateItems(), builtinDocItems()));
    expect(libraryVersion(t, d)).not.toBe(libraryVersion(t.slice(1), d));
    expect(sortOrderFor("TPL-042")).toBe(42);
    expect(sortOrderFor("KB-7")).toBe(7);
  });
});
