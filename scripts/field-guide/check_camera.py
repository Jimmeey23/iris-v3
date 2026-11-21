"""Regression check every authored setup on actual recorded target bounds."""

import json
from pathlib import Path
from camera import FULL, HEIGHT, WIDTH, PLANS, compose, viewport, bounds


def verify(root):
    count = 0
    for n in sorted(PLANS):
        shots = json.loads((root / f"{n:02}" / "edit.json").read_text())["shots"]
        setups = compose(n, shots)
        assert viewport(setups, 0) == FULL
        for i, setup in enumerate(setups):
            end = setups[i + 1].time if i + 1 < len(setups) else float("inf")
            assert end - setup.time >= (1.5 if setup.kind == "cut" else 2), (n, setup)
            for s in shots:
                if not setup.time <= s["t"] < end:
                    continue
                x, y, w, h = setup.crop
                l, top, r, b = bounds(s["bbox"])
                assert 0 <= x <= l < r <= x + w + 1e-6 <= WIDTH + 1e-6, (n, s)
                assert 0 <= y <= top < b <= y + h + 1e-6 <= HEIGHT + 1e-6, (n, s)
                # Settled framing must survive approach, action and result, without pumping.
                for offset in (0, 0.35, 0.85, 1.3):
                    t = max(setup.time + 0.81, s["t"] + offset)
                    if t < end:
                        assert viewport(setups, t) == setup.crop, (n, t)
                count += 1
    print(f"{len(PLANS)} films: {count} target placements checked")


if __name__ == "__main__":
    verify(Path("build/academy/capture"))
