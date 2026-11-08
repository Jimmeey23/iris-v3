import { describe, expect, it } from "bun:test";
import { PLANS, roomFor, roomState } from "../../src/lib/iris/radar";

const plan = (code: string) => PLANS.find((p) => p.code === code)!;

describe("roomFor", () => {
  it("places tickets by the room their text names", () => {
    expect(roomFor(plan("SHQ"), { title: "Bike 3 RPM dropped to zero", subcategory: "PowerCycle Bike Malfunction & Repairs" })).toBe("PowerCycle Studio");
    expect(roomFor(plan("SHQ"), { title: "Hot water not coming from the water dispenser" })).toBe("Pantry");
    expect(roomFor(plan("KH"), { title: "Studio 2 AC not cooling" })).toBe("Studio 2");
    expect(roomFor(plan("KH"), { title: "Front desk iPad frozen" })).toBe("Lobby / Reception");
    expect(roomFor(plan("SHQ"), { title: "Ladies changing room lock broken" })).toBe("Her Space");
  });

  it("prefers the title over the description and leaves unplaced tickets studio-wide", () => {
    expect(roomFor(plan("KH"), { title: "Studio 1 lights flickering", description: "member waited at reception" })).toBe("Studio 1");
    expect(roomFor(plan("KH"), { title: "Member unhappy with pricing", description: "called after class" })).toBeNull();
  });
});

describe("roomState", () => {
  it("takes the worst state of the room's open tickets", () => {
    expect(roomState([{ priority: "P3", slaStatus: "breached", status: "open" }])).toBe("breached");
    expect(roomState([{ priority: "P1", slaStatus: "on_track", status: "open" }])).toBe("urgent");
    expect(roomState([{ priority: "P2", slaStatus: "on_track", status: "in_progress" }])).toBe("open");
    expect(roomState([{ priority: "P0", slaStatus: "breached", status: "resolved" }])).toBe("clear");
  });
});
