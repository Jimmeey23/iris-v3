"""Build the client manifest from the same timed chapters used in the film edits."""

import json, re
from pathlib import Path

A = Path("build/academy")
book = json.loads((A / "book.json").read_text())
catalog = []
for n, b in enumerate(book, 1):
    i = {26: 1, 1: 26}.get(n, n)
    slug = f"{i:02}-" + re.sub("[^a-z0-9]+", "-", b["title"].lower()).strip("-")
    film = dict(
        id=i,
        title=b["title"],
        collection=b["section"],
        path="academy/" + slug,
        duration=b["duration"],
        chapters=[
            dict(label=s, text=c, time=next(t for t, k, _ in b["cues"] if k == j))
            for j, (s, c) in enumerate(b["chap"])
        ],
    )
    verified = A / "capture" / f"{n:02}" / "verified.json"
    if verified.exists():
        film["verified"] = json.loads(verified.read_text())["ref"]
    catalog.append(film)
Path("public/field-guide/academy-catalog.js").write_text(
    "export default "
    + json.dumps(sorted(catalog, key=lambda f: f["id"]), ensure_ascii=False, indent=2)
    + ";\n"
)
