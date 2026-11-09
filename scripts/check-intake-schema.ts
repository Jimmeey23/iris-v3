// Verifies every taxonomy subcategory has an explicit intake spec with >= 6 required fields
// and that every spec key exists in the field library.
import { CATEGORY_MAP } from "../src/lib/iris/constants";
import { FIELDS, SPECS, fieldsFor } from "../src/lib/iris/intake-schema";

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
process.exit(bad ? 1 : 0);
