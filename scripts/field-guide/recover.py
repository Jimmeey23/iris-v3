"""Recover narration and timing from published assets; no need to synthesize the voice again."""

import json, re, subprocess as sp
from pathlib import Path
import imageio_ffmpeg

out = Path("build/academy")
(out / "audio").mkdir(parents=True, exist_ok=True)
pub = Path("public/field-guide")
catalog = json.loads(
    (pub / "academy-catalog.js")
    .read_text()
    .removeprefix("export default ")
    .strip()
    .removesuffix(";")
)
book = [None] * len(catalog)
for f in catalog:
    n = {1: 26, 26: 1}.get(f["id"], f["id"])
    base = pub / f["path"]
    cue = []
    for block in base.with_suffix(".vtt").read_text().strip().split("\n\n")[1:]:
        times, line = block.split("\n", 1)
        h, m, s = times.split(" --> ")[0].split(":")
        t = round(int(h) * 3600 + int(m) * 60 + float(s), 3)
        j = max(i for i, c in enumerate(f["chapters"]) if c["time"] <= t + 0.002)
        cue.append([t, j, line])
    book[n - 1] = dict(
        title=f["title"],
        section=f["collection"],
        duration=f["duration"],
        chap=[[c["label"], c["text"]] for c in f["chapters"]],
        cues=cue,
    )
    sp.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-v",
            "error",
            "-y",
            "-i",
            str(base.with_suffix(".mp4")),
            "-map",
            "0:a:0",
            "-c:a",
            "copy",
            str(out / "audio" / f"{n:02}.m4a"),
        ],
        check=True,
    )
(out / "book.json").write_text(json.dumps(book, indent=2))
