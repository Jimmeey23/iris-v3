"""Recreate the SOP rendering inputs from published captions, audio, and editable shot selections."""

from pathlib import Path
import json, subprocess as sp
import imageio_ffmpeg
from sop_script import ROOT, lessons

films = lessons()
site = Path("public/field-guide")
ROOT.mkdir(parents=True, exist_ok=True)
manifest = json.loads(
    (site / "sop-catalog.js")
    .read_text()
    .removeprefix("export default ")
    .strip()
    .removesuffix(";")
)
for f, m in zip(films, manifest, strict=True):
    assert f["path"] == m["path"]
    f["duration"] = m["duration"]
    f["cues"] = []
    base = site / f["path"]
    for ch, prev in zip(f["chapters"], m["chapters"], strict=True):
        assert ch["text"] == prev["text"]
        ch["time"] = prev["time"]
    for cue in base.with_suffix(".vtt").read_text().strip().split("\n\n")[1:]:
        interval, line = cue.split("\n", 1)
        h, minute, sec = interval.split(" --> ")[0].split(":")
        f["cues"].append(
            [round(int(h) * 3600 + int(minute) * 60 + float(sec), 3), line]
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
            "0:a",
            "-c",
            "copy",
            str(ROOT / f"{f['id']}.m4a"),
        ],
        check=True,
    )
(ROOT / "timeline.json").write_text(json.dumps(films, indent=2))
