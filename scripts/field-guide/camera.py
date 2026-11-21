"""Editorial setups keyed by recorder time, NOT by clicks or narration beats.

A setup frames the union of its real, visible locator bounds plus surrounding UI.
The factor is a ceiling. wide=establish context; push=same-page move; cut=new
surface (no flying across an unrelated page). Adjacent actions inherit the setup.
"""

from bisect import bisect_right
from dataclasses import dataclass

WIDTH, HEIGHT = 1360, 800
FULL = (0.0, 0.0, float(WIDTH), float(HEIGHT))
MOVE = 0.55
# capture ID (not publication number): (first beat, max scale, move)
PLANS = {
    1: [
        (0, 1, "wide"),
        (3.4, 1.5, "cut"),
        (14.7, 1.5, "cut"),
        (30.4, 1.4, "cut"),
        (37.4, 1, "cut"),
        (39.1, 1.65, "cut"),
    ],  # intake fields / wizard / review / saved record
    2: [(0, 1, "wide"), (2.7, 1.65, "push"), (8.7, 1.55, "cut"), (14.4, 1.85, "cut")],
    3: [
        (0, 1.55, "wide"),
        (4.9, 1.9, "cut"),
        (14, 1.65, "cut"),
    ],  # start work / assignment menu / note
    4: [(0, 1, "wide"), (7.4, 1.75, "cut"), (15.5, 1.7, "cut")],
    5: [(0, 1, "wide"), (5, 1.65, "cut"), (9, 1.75, "cut"), (15.6, 1.6, "cut")],
    6: [(0, 1.45, "wide"), (4.7, 1.55, "cut"), (20.7, 1.6, "cut")],
    7: [(0, 1, "wide")],  # navigation lesson: keep destinations AND sidebar visible
    8: [(0, 1, "wide"), (14, 1.6, "push")],
    9: [(0, 1, "wide"), (4.6, 1.7, "push"), (12.8, 1.15, "cut")],
    10: [(0, 1.55, "wide"), (8.4, 1.8, "push")],
    11: [(0, 1.6, "wide"), (6.6, 1.15, "cut")],
    12: [(0, 1.65, "wide"), (13.95, 1, "cut")],
    13: [(0, 1, "wide"), (8.2, 1.6, "push"), (10.9, 1.8, "cut")],
    14: [(0, 1, "wide"), (15.1, 1.2, "cut")],  # split comparison needs both panes
    15: [(0, 1, "wide"), (5.1, 1.65, "push"), (10.9, 1.55, "cut")],
    16: [(0, 1, "wide"), (11.6, 1.8, "cut")],
    17: [(0, 1, "wide"), (4, 1.65, "push")],
    18: [(0, 1, "wide"), (4.3, 1.65, "push")],
    19: [(0, 1, "wide"), (3.6, 1.9, "push"), (10.75, 1.65, "cut")],
    20: [(0, 1.55, "wide"), (6.8, 1.8, "cut"), (12, 1.7, "cut"), (17.4, 1.15, "cut")],
    21: [
        (0, 1, "wide"),
        (3.9, 1.95, "push"),
    ],  # both clocks share one stationary close-up
    22: [(0, 1.75, "wide")],  # one ladder setup, even as history expands
    23: [(0, 1.75, "wide")],
    24: [(0, 1.4, "wide"), (4.7, 1.55, "cut")],
    25: [(0, 1, "wide"), (6.3, 1.65, "cut"), (15.5, 1.65, "cut")],
    26: [
        (0, 1, "wide"),
        (2.15, 1.6, "cut"),
        (9.5, 1.6, "cut"),
        (40.65, 1.75, "cut"),
    ],  # report / intake card through approval / ticket header
}


def bounds(box):
    return (
        max(0, box["x"]),
        max(0, box["y"]),
        min(WIDTH, box["x"] + box["width"]),
        min(HEIGHT, box["y"] + box["height"]),
    )


@dataclass(frozen=True)
class Setup:
    time: float
    kind: str
    crop: tuple


def compose(n, shots):
    plan = PLANS[n]
    assert plan[0][0] == 0 and all(t in {s["t"] for s in shots} for t, _, _ in plan)
    result = []
    for i, (t, limit, kind) in enumerate(plan):
        end = plan[i + 1][0] if i + 1 < len(plan) else float("inf")
        boxes = [bounds(s["bbox"]) for s in shots if t <= s["t"] < end]
        l, top, r, b = (
            min(a[0] for a in boxes),
            min(a[1] for a in boxes),
            max(a[2] for a in boxes),
            max(a[3] for a in boxes),
        )
        # Allow room for field labels above and section context around the target.
        zoom = max(1, min(limit, WIDTH / (r - l + 144), HEIGHT / (b - top + 144)))
        w, h = WIDTH / zoom, HEIGHT / zoom
        x = max(0, min(WIDTH - w, (l + r - w) / 2))
        y = max(0, min(HEIGHT - h, (top + b - h) / 2 - 18))
        result.append(Setup(t, kind, (x, y, w, h)))
    return result


def viewport(setups, t):
    i = bisect_right([s.time for s in setups], t) - 1
    s = setups[i]
    if s.kind == "cut":
        return s.crop
    # Start wide once, or move directly between same-page setups. No click reset.
    before = setups[i - 1].crop if i else FULL
    dt = t - s.time - (0.25 if not i else 0)
    if dt >= MOVE:
        return s.crop
    p = max(0, dt / MOVE)
    p = p * p * (3 - 2 * p)
    return tuple(a + (b - a) * p for a, b in zip(before, s.crop))
