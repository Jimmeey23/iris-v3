/**
 * Studio radar: each studio's floor plan, its rooms (as % boxes on the plan,
 * from IRIS v2's floorplans) and the words that place a ticket in a room.
 *
 * Tickets don't record a room, so placement reads the ticket text. A ticket that
 * names no room stays "studio-wide" rather than being guessed into one.
 */

export type Spot = { x: number; y: number; w: number; h: number };
export type Room = { name: string; spot: Spot; match: RegExp };
export type Plan = { code: string; label: string; src: string; width: number; height: number; rooms: Room[] };

const r = (name: string, spot: Spot, match: RegExp): Room => ({ name, spot, match });

// Shared vocabulary.
const POWERCYCLE = /\b(power\s*cycle|cycle studio|bikes?|spin)\b/i;
const STRENGTH = /\b(strength (lab|studio)|\bsl\b|weights?|dumbbells?|kettlebells?|fit studio|studio fit)\b/i;
const BARRE = /\bbarre\b/i;
const RECEPTION = /\b(reception|front desk|lobby|check.?in|ipad|pos|counter)\b/i;
const PANTRY = /\b(pantry|kitchen|water (dispenser|cooler|purifier)|coffee|fridge|microwave)\b/i;
const MEN = /\b(his space|men'?s|gents?|male (washroom|changing|locker))\b/i;
const WOMEN = /\b(her space|women'?s|ladies|female (washroom|changing|locker))\b/i;
const WASHROOM = /\b(washroom|toilet|restroom|shower|changing (room|area)|locker room)\b/i;
const BRAIN = /\b(brain cell|office|back office|admin room)\b/i;

export const PLANS: Plan[] = [
  {
    code: "KH", label: "Kwality House", src: "/radar/kwality-floorplan.webp", width: 1774, height: 887,
    rooms: [
      r("PowerCycle Studio", { x: 78, y: 15, w: 20, h: 47 }, POWERCYCLE),
      r("Strength Studio", { x: 60, y: 10, w: 14, h: 49 }, STRENGTH),
      r("Studio 1", { x: 2, y: 8, w: 25, h: 35 }, /\bstudio\s*(1|one)\b/i),
      r("Studio 2", { x: 2, y: 58, w: 30, h: 31 }, /\bstudio\s*(2|two)\b/i),
      r("His Space", { x: 49, y: 20, w: 13, h: 31 }, MEN),
      r("Her Space", { x: 27, y: 2, w: 14, h: 18 }, WOMEN),
      r("Guest Washroom", { x: 31, y: 20, w: 11, h: 14 }, WASHROOM),
      r("Brain Cell", { x: 21, y: 59, w: 13, h: 24 }, BRAIN),
      r("Pantry", { x: 31, y: 39, w: 12, h: 13 }, PANTRY),
      r("Lobby / Reception", { x: 2, y: 43, w: 30, h: 17 }, RECEPTION),
    ],
  },
  {
    code: "SHQ", label: "Supreme HQ", src: "/radar/supreme-floorplan.webp", width: 1969, height: 799,
    rooms: [
      r("PowerCycle Studio", { x: 33, y: 7, w: 17, h: 33 }, POWERCYCLE),
      r("Strength Lab", { x: 9, y: 7, w: 24, h: 33 }, STRENGTH),
      r("Barre Studio", { x: 50, y: 7, w: 21, h: 33 }, BARRE),
      r("Brain Cell", { x: 71, y: 22, w: 7, h: 30 }, BRAIN),
      r("Her Space", { x: 83, y: 7, w: 14, h: 30 }, WOMEN),
      r("His Space", { x: 83, y: 52, w: 14, h: 28 }, MEN),
      r("Front Desk", { x: 8, y: 41, w: 23, h: 23 }, RECEPTION),
      r("Pantry", { x: 35, y: 64, w: 36, h: 20 }, PANTRY),
      r("Boutique", { x: 8, y: 64, w: 23, h: 22 }, /\b(boutique|merch|retail|apparel)\b/i),
    ],
  },
  {
    code: "KHB", label: "Kenkere House", src: "/radar/kenkere-floorplan.webp", width: 1672, height: 941,
    rooms: [
      r("Studio 1", { x: 4, y: 7, w: 39, h: 45 }, /\bstudio\s*(1|one)\b|\bpower\s*cycle|\bbikes?\b/i),
      r("Studio 2", { x: 50, y: 7, w: 39, h: 45 }, /\bstudio\s*(2|two)\b|\bbarre\b/i),
      r("Lobby / Reception", { x: 8, y: 59, w: 53, h: 27 }, RECEPTION),
      r("Washroom & Changing", { x: 68, y: 57, w: 23, h: 30 }, new RegExp(`${WASHROOM.source}|${MEN.source}|${WOMEN.source}`, "i")),
    ],
  },
  {
    code: "CTS", label: "Courtside", src: "/radar/courtside-floorplan.webp", width: 1672, height: 941,
    rooms: [
      r("Main Studio Floor", { x: 4, y: 7, w: 58, h: 47 }, /\b(studio|floor|class|mats?|bikes?|barre)\b/i),
      r("Reception / Lobby", { x: 6, y: 61, w: 33, h: 24 }, RECEPTION),
      r("Member Lounge", { x: 48, y: 60, w: 43, h: 26 }, /\b(lounge|seating|waiting area)\b/i),
    ],
  },
  {
    code: "CCB", label: "Copper & Cloves", src: "/radar/copper-floorplan.webp", width: 1672, height: 941,
    rooms: [
      r("Main Studio Floor", { x: 4, y: 7, w: 61, h: 48 }, /\b(studio|floor|class|mats?|bikes?|barre)\b/i),
      r("Reception", { x: 7, y: 61, w: 38, h: 25 }, RECEPTION),
      r("Changing Area", { x: 68, y: 55, w: 24, h: 32 }, new RegExp(`${WASHROOM.source}|${MEN.source}|${WOMEN.source}`, "i")),
    ],
  },
];

/**
 * The room a ticket is about, or null for studio-wide. Specific rooms are tried in
 * plan order (PowerCycle before "Studio 1" etc.), and the title counts before the
 * description so "Bike 3 at reception" lands in PowerCycle only if the title says so.
 */
export function roomFor(plan: Plan, t: { title: string; description?: string | null; subcategory?: string | null }): string | null {
  for (const text of [`${t.title} ${t.subcategory ?? ""}`, t.description ?? ""]) {
    const hit = plan.rooms.find((room) => room.match.test(text));
    if (hit) return hit.name;
  }
  return null;
}

export type RoomState = "breached" | "urgent" | "open" | "clear";

export function roomState(tickets: { priority: string; slaStatus: string; status: string }[]): RoomState {
  const open = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  if (open.some((t) => t.slaStatus === "breached")) return "breached";
  if (open.some((t) => t.priority === "P0" || t.priority === "P1")) return "urgent";
  if (open.length) return "open";
  return "clear";
}
