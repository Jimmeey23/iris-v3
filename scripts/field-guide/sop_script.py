from pathlib import Path
import re

ROOT = Path("build/academy/sop")
PUBLIC = Path("public/field-guide/sops")


def lessons():
    result = []
    for block in (
        Path("scripts/field-guide/sop-lessons.txt").read_text().strip().split("\n\n")
    ):
        header, *rows = [
            r.split(" | ") for r in block.splitlines() if r and not r.startswith("#")
        ]
        number, title = header
        chapters = []
        for sequence, label, gate, text in rows:
            refs = []
            for expr in sequence.split(","):
                src, span = expr.split(":")
                ticks = list(map(int, span.split("-")))
                refs.extend((int(src), j) for j in range(ticks[0], ticks[-1] + 1))
            chapters.append(dict(label=label, gate=gate, text=text, refs=refs))
        result.append(
            dict(
                id=int(number),
                title=title,
                collection="Operations SOPs",
                path="sops/"
                + number
                + "-"
                + re.sub("[^a-z0-9]+", "-", title.lower()).strip("-"),
                chapters=chapters,
            )
        )
    return result
