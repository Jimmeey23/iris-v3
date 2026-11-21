"""Align the selected narrator's nine continuous takes to sentence-level captions."""

from pathlib import Path
import re, json, wave, subprocess as sp
from pocketsphinx import Decoder
import imageio_ffmpeg
import numpy as np

A = Path("build/academy")
ff = imageio_ffmpeg.get_ffmpeg_exe()
books = []
for block in Path("scripts/field-guide/syllabus.txt").read_text().split("\n\n"):
    rows = [s.split(" | ") for s in block.splitlines() if s and not s.startswith("#")]
    (title, section), *chap = rows
    books.append(dict(title=title, section=section, chap=chap))
pos = 0
for letter, count in zip("abcdefghij", [2, 3, 3, 3, 3, 3, 3, 3, 2, 1]):
    d = Decoder(loglevel="ERROR")
    path = A / "audio" / f"{letter}.wav"
    data = sp.check_output(
        [
            ff,
            "-loglevel",
            "error",
            "-i",
            str(path),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-f",
            "s16le",
            "-",
        ]
    )
    sent = []
    words = []
    for n in range(pos, pos + count):
        for j, (label, chapter) in enumerate(books[n]["chap"]):
            for line in re.split(r"(?<=[.!?])\s+", chapter):
                tokens = re.findall("[a-z']+", line.lower().replace("-", " "))
                sent.append((n, j, len(words), line))
                words += tokens
    for w in set(words):
        if not d.lookup_word(w):
            pron = {
                "subcategory": "S AH B K AE T AH G AO R IY",
                "searchable": "S ER CH AH B AH L",
                "timestamps": "T AY M S T AE M P S",
                "escalations": "EH S K AH L EY SH AH N Z",
                "de": "D IY",
                "escalate": "EH S K AH L EY T",
                "sla": "EH S EH L EY",
                "unassigned": "AH N AH S AY N D",
                "handoff": "HH AE N D AO F",
                "reloading": "R IY L OW D IH NG",
                "workspace": "W ER K S P EY S",
                "dropdown": "D R AA P D AW N",
                "microphone": "M AY K R AH F OW N",
                "ai": "EY AY",
            }.get(w)
            if not pron:
                raise ValueError("missing pronunciation: " + w)
            d.add_word(w, pron, True)
    d.set_align_text(" ".join(words))
    d.start_utt()
    d.process_raw(data, False, True)
    d.end_utt()
    seg = [
        s
        for s in d.seg()
        if s.word not in ("<sil>", "<s>", "</s>", "[NOISE]", "[SPEECH]")
    ]
    assert len(seg) == len(words), (len(seg), len(words))
    for n in range(pos, pos + count):
        rows = [r for r in sent if r[0] == n]
        idx = rows[0][2]
        start = 0 if idx == 0 else (seg[idx - 1].end_frame + seg[idx].start_frame) / 200
        nextidx = next((r[2] for r in sent if r[0] == n + 1), len(words))
        end = (
            len(data) / 32000
            if nextidx == len(words)
            else (seg[nextidx - 1].end_frame + seg[nextidx].start_frame) / 200
        )
        books[n]["cues"] = [
            [round(max(0, seg[k].start_frame / 100 - start), 3), j, line]
            for _, j, k, line in rows
        ]
        books[n]["cues"][0][0] = 0
        books[n]["duration"] = round(end - start, 3)
        sp.run(
            [
                ff,
                "-loglevel",
                "error",
                "-y",
                "-ss",
                str(start),
                "-i",
                str(path),
                "-t",
                str(end - start),
                "-c:a",
                "aac",
                "-b:a",
                "96k",
                str(A / "audio" / f"{n+1:02}.m4a"),
            ],
            check=True,
        )
    pos += count
    print(letter, "OK", flush=True)
(A / "book.json").write_text(json.dumps(books, indent=2))
