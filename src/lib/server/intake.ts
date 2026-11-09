import "server-only";
import type { PoolClient } from "pg";
import { CATEGORY_MAP } from "@/lib/iris/iris-constants";
import { matchArea, matchFormat, matchStudio, matchTrainer, matchWhen, normalizeText } from "@/lib/iris/aliases";

/**
 * Deterministic intake classification (no AI):
 *  1. High-precision keyword rules → category/subcategory.
 *  2. Full-text match against past tickets (796+ labelled examples) → votes.
 *  3. Field extraction: studio, time, class format, severity signals.
 * Department and default priority for each subcategory are learned from
 * ticket history, falling back to category defaults.
 */

export type Candidate = {
  category: string;
  subcategory: string | null;
  score: number;
  department: string | null;
  priority: "P0" | "P1" | "P2" | "P3";
  via: "keywords" | "history" | "ai";
};

export type Extracted = {
  studioCode?: string;
  area?: string;
  when?: string;
  classFormat?: string;
  trainerName?: string;
  urgent?: "P0" | "P1";
  clientMentioned?: boolean;
  clientName?: string;
  wholeClassAffected?: boolean;
};

// ── Keyword rules (checked in order; first matches win) ───────────────────────
const RULES: Array<{ re: RegExp; category: string; subcategory: string; weight?: number }> = [
  { re: /\b(a\/?c|air ?con|aircon|hvac|cooling|too (hot|warm)|warm air|not cool)/i, category: "Repair and Maintenance", subcategory: "AC & Ventilation Repairs" },
  // "PowerCycle" is also a class format ("can't book into PowerCycle"), so the bare word is not
  // enough: need a bike part, or the bike named alongside a fault.
  { re: /\b(pedal|saddle|cleat|sc3|handlebar|flywheel|resistance knob|bike console)|\b(power ?cycle|bikes?|stages)\b.{0,40}\b(broken|break|damaged|not working|isn'?t working|stopped|stuck|loose|wobbl|squeak|nois|creak|jam|repair|fault|malfunction|faulty|dead|no power|won'?t (turn|start|move|work))|\b(broken|damaged|faulty|squeaky|loose|wobbly|jammed)\b.{0,20}\b(power ?cycle|bikes?)\b/i, category: "Repair and Maintenance", subcategory: "PowerCycle Bike Malfunction & Repairs" },
  { re: /\b(leak|plumb|flush|tap|drain|washroom|toilet|shower)\b/i, category: "Repair and Maintenance", subcategory: "Washroom & Plumbing Repairs" },
  { re: /\b(light|bulb|lamp|dim|flicker)/i, category: "Repair and Maintenance", subcategory: "Studio Lighting Malfunction & Repairs" },
  { re: /\b(mic|microphone|speaker|sound system|headphone|audio|music)\b/i, category: "Class Experience", subcategory: "Audio Issues" },
  { re: /\b(power cut|power outage|electric|socket|wiring|mcb|ups)\b/i, category: "Repair and Maintenance", subcategory: "Electrical & Power Issues" },
  { re: /\b(door|lock|handle|hinge|key)\b/i, category: "Repair and Maintenance", subcategory: "Doors, Locks & Fixture Repairs" },
  { re: /\b(towel)/i, category: "Repair and Maintenance", subcategory: "Towel Availability Issues" },
  { re: /\b(dirty|clean(ing|liness)?|housekeep|dust|stain)/i, category: "Repair and Maintenance", subcategory: "Housekeeping & Cleaning Issues" },
  { re: /\b(pest|cockroach|rat|mice|insect|ants)\b/i, category: "Repair and Maintenance", subcategory: "Pest Control Needed" },
  { re: /\b(smell|odou?r|stink)/i, category: "Studio Amenities and Facilities", subcategory: "Studio Odour and Aroma" },
  { re: /\b(wi-?fi|internet|router|network)\b/i, category: "Operating Systems", subcategory: "Router Connectivity" },
  { re: /\b(locker)/i, category: "Studio Amenities and Facilities", subcategory: "Locker Availability" },
  { re: /\b(valet|parking)\b/i, category: "Studio Amenities and Facilities", subcategory: "Valet Issues" },
  { re: /\b(stolen|theft|stole|missing (phone|wallet|bag|watch|earphone|airpod))/i, category: "Theft and Lost Items", subcategory: "Stolen Personal Items" },
  { re: /\b(lost (and|&) found|left (behind|her|his)|forgot (her|his|their))/i, category: "Theft and Lost Items", subcategory: "Reporting Stolen Items" },
  { re: /\b(injur|hurt|sprain|fainted|faint|dizzy|bleed|ambulance|medical|unconscious)/i, category: "Safety and Security", subcategory: "Handling of Medical Emergencies" },
  { re: /\b(unsafe|harass|threat|stalk|security guard)/i, category: "Safety and Security", subcategory: "Personal Safety Concerns" },
  { re: /\b(freeze|pause|frozen|unfreeze)\b.*\b(membership|pack|plan)|\b(membership|pack)\b.*\b(freeze|pause)/i, category: "Pricing and Memberships", subcategory: "Membership Pause and Freeze Policy" },
  { re: /\b(expir(y|ed|es)|validity)\b/i, category: "Pricing and Memberships", subcategory: "Class Pack Expiry Confusion" },
  { re: /\b(auto-?renew)/i, category: "Pricing and Memberships", subcategory: "Auto-Renewal Concerns" },
  { re: /\b(refund|charged twice|double charge|payment (failed|deducted|missing)|deducted|razorpay|stripe|upi)\b/i, category: "Operating Systems", subcategory: "Stripe and Razorpay" },
  { re: /\b(credits?)\b.*\b(wrong|missing|not (showing|reflect)|deducted|incorrect)|\b(wrong|missing|incorrect)\b.*\bcredits?\b/i, category: "Operating Systems", subcategory: "Attendance Record Discrepancies" },
  { re: /\b(check-?in|attendance|marked absent|no-?show fee|late cancel(lation)? fee)\b/i, category: "Operating Systems", subcategory: "Attendance Record Discrepancies" },
  // Booking intent outranks equipment words: "unable to book into PowerCycle" is a booking problem.
  { re: /\b(unable to|not able to|can'?t|cannot|can ?not|couldn'?t|could not|won'?t let (me|her|him|them)|not letting (me|her|him|them)|isn'?t letting (me|her|him|them))\s+(book|reserve|sign ?up|register)|\bbook(ing)?s?\b.{0,30}\b(fail|error|not (going through|working|allowed|possible|showing)|issue|problem|blocked|greyed|disabled)|\b(able to|can) book\b.{0,60}\bbut (not|unable|can'?t|cannot)/i, category: "Tech Issues", subcategory: "Booking System Errors", weight: 5 },
  { re: /\b(momence|app (crash|not working|glitch)|website|booking (failed|error)|couldn'?t book|can'?t book)\b/i, category: "Operating Systems", subcategory: "Error in Class Listings" },
  { re: /\b(notification|reminder|sms|email) (not|never|didn'?t)\b|\bno (notification|reminder)\b/i, category: "Operating Systems", subcategory: "Delayed Notifications" },
  { re: /\b(waitlist|wait-list)\b/i, category: "Scheduling", subcategory: "Waitlist Concerns" },
  { re: /\b(substitut|sub(bed)? (trainer|instructor)|replacement trainer)/i, category: "Scheduling", subcategory: "Class Substitutions" },
  { re: /\b(more classes|add(itional)? (a )?class|new slot|extra class)/i, category: "Scheduling", subcategory: "Additional Classes" },
  { re: /\b(timing|time change|reschedul|moved the class|class time)/i, category: "Scheduling", subcategory: "Time Change" },
  { re: /\b(trainer|instructor|coach)\b.*\b(late|didn'?t (show|turn up)|no-?show|absent)|\b(late|no-?show)\b.*\b(trainer|instructor)/i, category: "Trainer Feedback", subcategory: "Trainer Punctuality Issues" },
  { re: /\b(trainer|instructor|coach)\b.*\b(rude|shout|yell|attitude|behaviou?r|unprofessional)/i, category: "Trainer Feedback", subcategory: "Trainer Behaviour" },
  { re: /\b(hands-?on adjust|adjusted (me|her|him)|touch(ed)? (me|her|him)|physical adjust)/i, category: "Trainer Feedback", subcategory: "Hands-on Adjustments" },
  { re: /\b(too (fast|slow|intense|easy|hard)|intensity|pace|pacing)\b/i, category: "Class Experience", subcategory: "Class Flow and Pacing" },
  { re: /\b(modifications?|modify|injury-?friendly|pregnan|prenatal|knee|back pain)/i, category: "Class Experience", subcategory: "Modifications in Routine" },
  { re: /\b(overcrowd|too many people|packed|crowded)\b/i, category: "Class Experience", subcategory: "Overcrowding in Class" },
  { re: /\b(front desk|receptionist|staff was rude|attitude at (the )?desk)\b/i, category: "Customer Service and Communication", subcategory: "Front Desk Attitude" },
  { re: /\b(no (one )?(called|replied|responded)|no response|didn'?t (hear back|get a reply)|follow-?up)\b/i, category: "Customer Service and Communication", subcategory: "Follow-up Post Inquiry" },
  { re: /\b(complain(t|ed)?|unhappy|upset|angry)\b/i, category: "Customer Service and Communication", subcategory: "Handling of Complaints" },
  { re: /\b(instagram|social media|ad|campaign|poster|brochure|website (copy|content))\b/i, category: "Brand Feedback", subcategory: "Marketing Message Accuracy" },
];

const STOP_NAMES = new Set(["says", "said", "was", "is", "has", "had", "at", "in", "from", "who", "complained", "wants"]);

export function extractFields(raw: string, trainerNames: string[]): Extracted {
  const out: Extracted = {};
  // Match on the original and the slang-expanded text ("ac nt wrkng at kh tmrw").
  const text = `${raw}\n${normalizeText(raw)}`;
  const studio = matchStudio(raw);
  if (studio) out.studioCode = studio;
  const area = matchArea(raw, studio);
  if (area) out.area = area;
  const when = matchWhen(raw);
  if (when) out.when = when;
  const fmt = matchFormat(raw);
  if (fmt) out.classFormat = fmt;
  const trainer = matchTrainer(raw, trainerNames);
  if (trainer) out.trainerName = trainer;

  if (/\b(injur|bleed|faint|unconscious|ambulance|fire|smoke|electric shock|unsafe|harass|stolen|theft)/i.test(text)) out.urgent = "P0";
  else if (/\b(class (cancelled|couldn'?t|could not) (run|start)|whole class|all (the )?(bikes|clients|members)|studio (closed|shut)|no power|power cut|flood)/i.test(text)) out.urgent = "P1";

  const name = text.match(/\b(?:client|member|customer|lady|guy|mrs?\.?|ms\.?)\s+(?:named\s+|called\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (name && !STOP_NAMES.has(name[1].split(" ")[0].toLowerCase())) out.clientName = name[1];
  out.clientMentioned = /\b(client|member|customer|she|he|her|his|mrs?|ms)\b/i.test(text);
  out.wholeClassAffected = /\b(whole|entire|all|every(one)?)\b.*\b(class|clients|members|studio)\b/i.test(text);
  return out;
}

type Stat = { category: string; subcategory: string | null; n: number; dept: string | null; priority: Candidate["priority"] };

export async function taxonomy(db: PoolClient) {
  const { rows } = await db.query<Stat>(
    `select category, subcategory, count(*)::int n,
            mode() within group (order by department_code) dept,
            mode() within group (order by priority) priority
     from tickets group by 1, 2`,
  );
  const byKey = new Map(rows.map((r) => [`${r.category}|${r.subcategory}`, r]));
  const catDept = new Map<string, string | null>();
  for (const r of rows) if (!catDept.has(r.category) || (r.n > 5 && r.dept)) catDept.set(r.category, r.dept);
  const cats = new Map<string, Set<string>>();
  for (const [c, subs] of Object.entries(CATEGORY_MAP)) cats.set(c, new Set(subs));
  for (const r of rows) {
    if (!cats.has(r.category)) cats.set(r.category, new Set());
    if (r.subcategory) cats.get(r.category)!.add(r.subcategory);
  }
  const meta = (category: string, subcategory: string | null) => {
    const s = byKey.get(`${category}|${subcategory}`);
    return { department: s?.dept ?? catDept.get(category) ?? null, priority: (s?.priority ?? "P2") as Candidate["priority"], n: s?.n ?? 0 };
  };
  return {
    categories: [...cats.entries()]
      .map(([category, subs]) => ({
        category,
        department: catDept.get(category) ?? null,
        subcategories: [...subs].map((s) => ({ name: s, ...meta(category, s) })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    meta,
  };
}

const STOP = new Set(
  "the a an and or but is are was were be been it its this that to of in on at for with from by as i we our my me you your they them she he her his has have had not no do does did can could would should will just very so too also there here when what which who into out up down about after before again than then".split(" "),
);

/** Rank categories for a message using rules + similar past tickets. */
export async function classify(db: PoolClient, rawText: string, trainerNamed = false) {
  const text = `${rawText}\n${normalizeText(rawText)}`;
  const tax = await taxonomy(db);
  const scores = new Map<string, Candidate>();
  const add = (category: string, subcategory: string | null, score: number, via: Candidate["via"]) => {
    const key = `${category}|${subcategory}`;
    const m = tax.meta(category, subcategory);
    const cur = scores.get(key);
    if (cur) cur.score += score;
    else scores.set(key, { category, subcategory, score, department: m.department, priority: m.priority, via });
  };

  for (const r of RULES) if (r.re.test(text)) add(r.category, r.subcategory, r.weight ?? 3, "keywords");

  // A named trainer plus lateness/absence is a punctuality issue even without the word "trainer".
  if (trainerNamed && /\b(late|no-?show|didn'?t (show|come|turn up)|absent|missed (the )?class)/i.test(text)) {
    add("Trainer Feedback", "Trainer Punctuality Issues", 4, "keywords");
  } else if (trainerNamed && /\b(rude|shout|yell|attitude|unprofessional)/i.test(text)) {
    add("Trainer Feedback", "Trainer Behaviour", 4, "keywords");
  }

  const words = [...new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter((w) => !STOP.has(w)).slice(0, 20);
  if (words.length) {
    const { rows } = await db.query(
      `select category, subcategory, ts_rank(search_vector, q) as rank
       from tickets, to_tsquery('english', $1) q
       where search_vector @@ q
       order by rank desc limit 25`,
      [words.map((w) => w.replace(/[^a-z]/g, "")).filter(Boolean).join(" | ")],
    );
    rows.forEach((r, i) => add(r.category, r.subcategory, Math.min(1, Number(r.rank) * 10) * (1 - i / 30), "history"));
  }

  // A rule hit outranks any pile of history votes: many old bike-repair tickets mention
  // "PowerCycle", which must not drown out "unable to book into PowerCycle".
  const kw = (c: Candidate) => (c.via === "keywords" ? 1 : 0);
  const candidates = [...scores.values()].sort((a, b) => kw(b) - kw(a) || b.score - a.score).slice(0, 5);
  const top = candidates[0];
  const second = candidates[1];
  // Confident when a keyword rule fired, or history clearly favours one subcategory.
  const confident = Boolean(top && (top.via === "keywords" || (top.score >= 2.5 && (!second || top.score >= second.score * 1.6))));
  return { candidates, confident, taxonomy: tax.categories };
}
