/**
 * Deterministic understanding of how the floor team actually writes:
 * slang, shortforms, typos and nicknames for studios, rooms, class formats,
 * trainers and common issue words. Shared by the client intent router and
 * the server intake classifier, so both understand the same vocabulary.
 */

import { CLASS_FORMATS, STUDIO_LAYOUTS, AREA_ALIASES, TRAINERS } from "./constants";

// ── Text normalisation ───────────────────────────────────────────────────────

/** Shortforms / slang → canonical words. Keys are matched as whole words. */
const SLANG: Record<string, string> = {
  pls: "please", plz: "please", plss: "please", pl: "please",
  nt: "not", nott: "not", dnt: "dont", dont: "dont", didnt: "didnt", cant: "cant", wont: "wont",
  isnt: "is not", wasnt: "was not", aint: "is not",
  tmrw: "tomorrow", tmr: "tomorrow", tmrrw: "tomorrow", "2mrw": "tomorrow", "2moro": "tomorrow", tomo: "tomorrow",
  ystrdy: "yesterday", yday: "yesterday", yest: "yesterday", ytd: "yesterday", ysterday: "yesterday", yesturday: "yesterday",
  tdy: "today", tday: "today", "2day": "today", tonite: "tonight", rn: "right now", nw: "now",
  asap: "urgent", urgnt: "urgent", imp: "important",
  bcz: "because", bcoz: "because", coz: "because", cuz: "because", cos: "because", bc: "because",
  u: "you", ur: "your", r: "are", n: "and", w: "with", wo: "without", abt: "about", thru: "through",
  msg: "message", msgd: "messaged", txt: "text", cal: "call", cld: "could", shd: "should", shud: "should", wud: "would",
  mem: "member", memb: "member", mbr: "member", cust: "customer", clnt: "client", cx: "customer",
  cls: "class", clss: "class", clas: "class", sesh: "session", sess: "session",
  trnr: "trainer", trainr: "trainer", instr: "instructor", inst: "instructor", coach: "trainer", teacher: "trainer",
  mgr: "manager", mngr: "manager", fd: "front desk", frontdesk: "front desk", recp: "reception", recep: "reception",
  ac: "air conditioning", aircon: "air conditioning", aircond: "air conditioning", hvac: "air conditioning",
  wifi: "wifi", wify: "wifi", net: "internet",
  refnd: "refund", rfnd: "refund", pymt: "payment", pmt: "payment", paymt: "payment", txn: "transaction", trxn: "transaction",
  mship: "membership", mmbrshp: "membership", membrship: "membership", pkg: "package",
  cancelld: "cancelled", cancled: "cancelled", canceled: "cancelled", cncl: "cancel", cxl: "cancel", cxld: "cancelled",
  resched: "reschedule", rescheduled: "rescheduled",
  brkn: "broken", brokn: "broken", notworking: "not working", nonworking: "not working",
  loo: "washroom", toilet: "washroom", restroom: "washroom", bathroom: "washroom", washrm: "washroom", wc: "washroom",
  gents: "his space", mens: "his space", ladies: "her space", womens: "her space",
  info: "information", approx: "approximately", hrs: "hours", hr: "hour", mins: "minutes", min: "minute",
};

/** Lowercase, strip punctuation, expand slang. Keeps digits and `&`. */
export function normalizeText(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\bw\/o\b/g, " without ")
    .replace(/\bw\//g, " with ")
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{N}&#\s:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base
    .split(" ")
    .map((w) => (Object.prototype.hasOwnProperty.call(SLANG, w) ? SLANG[w] : w))
    .filter(Boolean)
    .join(" ");
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (phrase: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(phrase)}($|[^\\p{L}\\p{N}])`, "u");
const hasPhrase = (norm: string, phrase: string) => wordRe(phrase).test(norm);

/** Levenshtein distance with an early exit above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** True when some word in `norm` is within a small edit distance of `target`. */
function fuzzyWord(norm: string, target: string): boolean {
  if (target.length < 5) return false;
  const max = target.length >= 8 ? 2 : 1;
  return norm.split(" ").some((w) => w.length >= target.length - max && editDistance(w, target, max) <= max);
}

// ── Studios ──────────────────────────────────────────────────────────────────

export const STUDIO_ALIAS_MAP: Record<string, string[]> = {
  KH: [
    "kwality house kemps corner", "kwality house", "kwality", "qwality", "kwaility", "kemps corner", "kemps", "kemp",
    "kh", "kc", "south mumbai", "sobo", "south bombay", "cumballa hill", "peddar road", "breach candy",
  ],
  SHQ: [
    "supreme hq bandra", "supreme hq", "supreme headquarters", "supreme head quarters", "supreme", "shq", "hq",
    "headquarters", "bandra", "bandra west", "bandra w", "pali hill", "khar",
  ],
  KHB: ["kenkere house", "kenkere", "kenkre", "kenkeri", "khb", "kkh", "indiranagar", "indira nagar"],
  CCB: [
    "the studio by copper & cloves", "copper & cloves", "copper and cloves", "copper n cloves", "copper cloves",
    "copper", "cloves", "c&c", "cnc", "ccb",
  ],
  CTS: ["courtside", "court side", "cts"],
  PU: ["pop up studio", "pop up", "popup", "pop-up"],
};

const STUDIO_ENTRIES = Object.entries(STUDIO_ALIAS_MAP)
  .flatMap(([code, list]) => list.map((alias) => ({ code, alias: normalizeText(alias) })))
  .sort((a, b) => b.alias.length - a.alias.length);

/** Studio code mentioned in free text, or null. Longest alias wins. */
export function matchStudio(raw: string): string | null {
  const t = normalizeText(raw);
  for (const { code, alias } of STUDIO_ENTRIES) if (alias && hasPhrase(t, alias)) return code;
  // Typos of the distinctive names ("kwalty", "supreem", "kenkre").
  const fuzzy: Array<[string, string]> = [["kwality", "KH"], ["supreme", "SHQ"], ["kenkere", "KHB"], ["courtside", "CTS"], ["copper", "CCB"]];
  for (const [w, code] of fuzzy) if (fuzzyWord(t, w)) return code;
  return null;
}

// ── Rooms / areas ────────────────────────────────────────────────────────────

const LAYOUT_KEY: Record<string, string> = { KH: "kwality", SHQ: "supreme", KHB: "kenkere", CTS: "courtside", CCB: "copper" };

const AREA_SYNONYMS: Record<string, string[]> = {
  "PowerCycle Studio": ["powercycle studio", "cycle studio", "cycle room", "spin studio", "spin room", "bike room", "cycling studio", "pc studio", "pc room"],
  "Strength Studio": ["strength studio", "strength room", "weights room", "gym floor"],
  "Strength Lab": ["strength lab", "sl room", "lab"],
  "Barre Studio": ["barre studio", "barre room", "main studio"],
  "Studio 1": ["studio 1", "studio one", "s1", "big studio", "main barre studio"],
  "Studio 2": ["studio 2", "studio two", "s2", "small studio"],
  "His Space": ["his space", "mens washroom", "men washroom", "male washroom", "mens changing", "male locker", "male lockers"],
  "Her Space": ["her space", "womens washroom", "women washroom", "female washroom", "womens changing", "female locker", "female lockers"],
  "GUEST WASHROOM": ["guest washroom", "guest toilet", "common washroom"],
  "Brain Cell": ["brain cell", "braincell", "office", "back office", "admin room"],
  Pantry: ["pantry", "kitchen", "staff kitchen", "water dispenser", "coffee machine"],
  "Lobby / Reception": ["lobby", "reception", "front desk", "entrance", "waiting area", "check in", "checkin"],
  "Reception / Lobby": ["lobby", "reception", "front desk", "entrance", "check in"],
  Reception: ["reception", "front desk", "lobby", "entrance"],
  "Front Desk": ["front desk", "reception", "lobby", "desk"],
  Boutique: ["boutique", "retail", "merch", "shop"],
  "Member Lounge": ["member lounge", "lounge", "sofa area"],
  "Main Studio Floor": ["main studio floor", "studio floor", "main floor", "studio"],
  "Washroom & Changing": ["washroom", "changing", "changing room", "locker", "lockers", "shower", "showers"],
  "Changing Area": ["changing area", "changing", "changing room", "washroom", "locker", "lockers", "shower"],
};

/** Room plan names for a studio (or every known room when unknown). */
export function roomsFor(studioCode?: string | null): string[] {
  const key = studioCode ? LAYOUT_KEY[studioCode] : undefined;
  if (key && STUDIO_LAYOUTS[key]) return STUDIO_LAYOUTS[key].rooms.map((r) => r.name);
  return [...new Set(Object.values(STUDIO_LAYOUTS).flatMap((s) => s.rooms.map((r) => r.name)))];
}

/** Room/area at the studio mentioned in the text, using that studio's own plan. */
export function matchArea(raw: string, studioCode?: string | null): string | null {
  const t = normalizeText(raw);
  const rooms = roomsFor(studioCode);
  let best: { room: string; len: number } | null = null;
  for (const room of rooms) {
    const syns = [room.toLowerCase(), ...(AREA_SYNONYMS[room] ?? [])];
    for (const s of syns) {
      const n = normalizeText(s);
      if (n && hasPhrase(t, n) && (!best || n.length > best.len)) best = { room, len: n.length };
    }
  }
  if (best) return best.room;
  for (const [alias, canonical] of Object.entries(AREA_ALIASES)) {
    if (hasPhrase(t, normalizeText(alias))) {
      const hit = rooms.find((r) => r.toLowerCase() === canonical.toLowerCase());
      if (hit) return hit;
    }
  }
  return null;
}

// ── Class formats ────────────────────────────────────────────────────────────

const FORMAT_SYNONYMS: Array<[string, string[]]> = [
  ["Studio PowerCycle Express", ["powercycle express", "pc express", "cycle express", "spin express"]],
  ["Studio PowerCycle", ["powercycle", "power cycle", "pwr cycle", "pc class", "cycle class", "cycling", "spin class", "spin", "cycle", "pc"]],
  ["Studio Strength Lab (Full Body)", ["strength lab full body", "sl full body", "full body strength"]],
  ["Studio Strength Lab (Pull)", ["strength lab pull", "sl pull", "pull day"]],
  ["Studio Strength Lab (Push)", ["strength lab push", "sl push", "push day"]],
  ["Studio Strength Lab", ["strength lab", "strengthlab", "strength class", "sl class", "sl"]],
  ["Studio Cardio Barre Express", ["cardio barre express", "cb express"]],
  ["Studio Cardio Barre Plus", ["cardio barre plus", "cb plus", "cardio plus"]],
  ["Studio Cardio Barre", ["cardio barre", "cardiobarre", "cb class", "cardio", "cb"]],
  ["Studio Barre 57 Express", ["barre 57 express", "barre express", "b57 express"]],
  ["Studio Barre 57", ["barre 57", "barre57", "b57", "barre"]],
  ["Studio Mat 57 Express", ["mat 57 express", "mat express"]],
  ["Studio Mat 57", ["mat 57", "mat57", "m57", "mat class", "mat"]],
  ["Studio Back Body Blaze Express", ["back body blaze express", "bbb express"]],
  ["Studio Back Body Blaze", ["back body blaze", "backbody blaze", "bbb", "back body"]],
  ["Studio SWEAT In 30", ["sweat in 30", "sweat 30", "sweat30", "sweat"]],
  ["Studio Amped Up!", ["amped up", "amped"]],
  ["Studio HIIT", ["hiit", "hit class"]],
  ["Studio FIT", ["fit class", "studio fit"]],
  ["Studio Foundations", ["foundations", "foundation", "beginners class", "intro class"]],
  ["Studio Recovery", ["recovery", "stretch class", "mobility"]],
  ["Studio Pre/Post Natal", ["pre post natal", "prenatal", "postnatal", "pre natal", "post natal", "pregnancy class"]],
  ["Studio Trainer's Choice", ["trainers choice", "trainer choice", "tc class"]],
  ["Studio Hosted Class", ["hosted class", "private class", "corporate class", "hosted"]],
];

/** Canonical Momence class format mentioned in the text (without the "Studio " prefix). */
export function matchFormat(raw: string): string | null {
  const t = normalizeText(raw);
  for (const [format, syns] of FORMAT_SYNONYMS) {
    if (!(CLASS_FORMATS as readonly string[]).includes(format)) continue;
    if (syns.some((s) => hasPhrase(t, normalizeText(s)))) return format.replace(/^Studio /, "");
  }
  return null;
}

// ── People (trainers / staff / members) ──────────────────────────────────────

const NICKNAMES: Record<string, string[]> = {
  Richard: ["rich", "richie", "rick"],
  Siddhartha: ["sid", "siddharth", "sidharth"],
  Simonelle: ["simo", "simone", "simonel"],
  Karanvir: ["kv", "karanveer"],
  Mrigakshi: ["mrig", "mrigs"],
  Pranjali: ["pranju"],
  Pushyank: ["push", "pushy"],
  Vivaran: ["viv"],
  Chaitanya: ["chaitu", "chai"],
  Raunak: ["ronak"],
  Atulan: ["atul"],
  Cauveri: ["kaveri", "cauvery"],
  Reshma: ["resh"],
  Shruti: ["shru", "shruthi"],
  Anisha: ["ani"],
};

/**
 * Best person match for names in the text. Tries full name, then a unique
 * first name, unique surname, nickname, and finally a one-letter typo.
 * Ambiguous first names (two Karans) resolve only when the surname is present.
 */
export function matchPerson(raw: string, names: readonly string[]): string | null {
  const t = normalizeText(raw);
  const people = names.map((full) => {
    const parts = normalizeText(full).split(" ").filter(Boolean);
    return { full, norm: parts.join(" "), first: parts[0] ?? "", last: parts.length > 1 ? parts[parts.length - 1] : "" };
  });
  const full = people.find((p) => p.norm && hasPhrase(t, p.norm));
  if (full) return full.full;
  const unique = (pick: (p: (typeof people)[number]) => boolean) => {
    const hits = people.filter(pick);
    return hits.length === 1 ? hits[0].full : null;
  };
  const byFirst = unique((p) => p.first.length > 2 && hasPhrase(t, p.first));
  if (byFirst) return byFirst;
  const byLast = unique((p) => p.last.length > 3 && hasPhrase(t, p.last));
  if (byLast) return byLast;
  for (const p of people) {
    const firstCap = p.full.split(" ")[0];
    const nick = NICKNAMES[firstCap];
    if (nick?.some((n) => hasPhrase(t, n))) return p.full;
  }
  return unique((p) => p.first.length >= 5 && fuzzyWord(t, p.first));
}

/** Trainer named in the text, preferring the live list and falling back to the known roster. */
export function matchTrainer(raw: string, liveNames: readonly string[] = []): string | null {
  return matchPerson(raw, liveNames.length ? liveNames : TRAINERS);
}

// ── Relative dates ───────────────────────────────────────────────────────────

/** Human "when" phrase (day + time) found in the text, normalised. */
export function matchWhen(raw: string): string | null {
  const t = normalizeText(raw);
  const day =
    t.match(/\b(today|yesterday|tonight|tomorrow|day before yesterday|this (morning|afternoon|evening)|last (night|week|evening)|(mon|tues|wednes|thurs|fri|satur|sun)day|(mon|tue|wed|thu|fri|sat|sun))\b/)?.[0] ?? null;
  const time =
    raw.match(/\b\d{1,2}(:|\.)?\d{0,2}\s?(am|pm)\b/i)?.[0]?.replace(".", ":") ??
    t.match(/\b(morning|noon|afternoon|evening|night) (class|batch|session)\b/)?.[0] ??
    null;
  const out = [day, time && time !== day ? time : null].filter(Boolean).join(" ");
  return out || null;
}
