"""Build the player manifest and portable SOP reference from the same annotated lesson cuts."""

import json
from pathlib import Path
from sop_script import ROOT

site = Path("public/field-guide")
films = json.loads((ROOT / "timeline.json").read_text())
rules = [
    s.split(" | ")
    for s in Path("scripts/field-guide/sop-controls.txt").read_text().splitlines()
    if s and not s.startswith("#")
]
assert len(rules) == len(films) == 25
ref = [
    "# IRIS operations SOPs",
    "25 procedures demonstrated in the local IRIS training workspace. Use your site’s approved test and escalation procedures.",
]
for film, (number, trigger, stop, evidence) in zip(films, rules):
    assert film["id"] == int(number)
    film["controls"] = dict(trigger=trigger, stop=stop, evidence=evidence)
    film.pop("cues")
    ref += [
        f"## {number} · {film['title']}",
        f"**Use when:** {trigger}",
        "\n".join(
            f"{i}. **{c['label']}:** {c['text']}"
            for i, c in enumerate(film["chapters"], 1)
        ),
        f"**Stop if:** {stop}",
        f"**Completion evidence:** {evidence}",
    ]
    for c in film["chapters"]:
        c.pop("refs")
(site / "sop-catalog.js").write_text(
    "export default " + json.dumps(films, ensure_ascii=False, indent=2) + ";\n"
)
(site / "IRIS-operations-SOPs.md").write_text("\n\n".join(ref) + "\n")
