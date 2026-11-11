// Verifies intake specs cover the taxonomy.
//  1. Every spec key exists in the field library.
//  2. Every CATEGORY_MAP subcategory has an explicit spec with >= 6 required fields.
//  3. Every (category, subcategory) pair in live ticket history resolves to a real
//     spec (exact, normalized or keyword match) rather than the broad category
//     default. Needs NEON_DATABASE_URL; skipped otherwise. Run: npm run check:intake
import { Pool } from "pg";
import { CATEGORY_MAP } from "../src/lib/iris/constants";
import { FIELDS, SPECS, fieldsFor, resolveSpec } from "../src/lib/iris/intake-schema";

let bad = 0;
for (const k of Object.keys(SPECS)) for (const raw of SPECS[k]) {
  if (!FIELDS[raw.replace(/^\?/, "")]) { console.log(`unknown field "${raw}" in ${k}`); bad++; }
}
let min = 99, max = 0, n = 0;
for (const [cat, subs] of Object.entries(CATEGORY_MAP)) for (const sub of subs as string[]) {
  n++;
  if (!SPECS[`${cat}|${sub}`] && !SPECS[sub]) { console.log(`no spec: ${cat} | ${sub}`); bad++; continue; }
  const req = fieldsFor({ category: cat, subcategory: sub }).filter((f) => f.required).length;
  min = Math.min(min, req); max = Math.max(max, req);
  if (req < 6) { console.log(`only ${req} required: ${cat} | ${sub}`); bad++; }
}
console.log(`${n} subcategories, required fields per subcategory: min ${min}, max ${max}, problems: ${bad}`);

async function live() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) { console.log("live check skipped: NEON_DATABASE_URL not set"); return; }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });
  try {
    const { rows } = await pool.query<{ category: string; subcategory: string | null; n: number }>(
      `select category, subcategory, count(*)::int n from iris.tickets
       where subcategory is not null group by 1, 2 order by 3 desc`,
    );
    let gaps = 0, fuzzy = 0;
    for (const r of rows) {
      const { source, matched } = resolveSpec(r.category, r.subcategory);
      if (source === "exact") continue;
      if (source === "normalized" || source === "keyword") {
        fuzzy++;
        console.log(`~ ${source}: ${r.category} | ${r.subcategory} -> ${matched} (${r.n} tickets)`);
      } else {
        gaps++;
        console.log(`✗ no spec (${source} fallback): ${r.category} | ${r.subcategory} (${r.n} tickets)`);
      }
    }
    console.log(`live: ${rows.length} pairs, ${fuzzy} matched loosely, ${gaps} with no spec`);
    bad += gaps;
  } finally {
    await pool.end();
  }
}

live()
  .catch((e) => { console.error("live check failed:", (e as Error).message); bad++; })
  .finally(() => process.exit(bad ? 1 : 0));
