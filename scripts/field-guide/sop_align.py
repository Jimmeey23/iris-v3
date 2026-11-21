"""Force-align each continuous studio take, then split between words, never at a guessed duration."""

import re, json, subprocess as sp
from pocketsphinx import Decoder
import imageio_ffmpeg
from sop_script import ROOT, lessons

ff = imageio_ffmpeg.get_ffmpeg_exe()
films = lessons()
pos = 0
extra = {
    "mic": "M AY K",
    "dropout": "D R AA P AW T",
    "reopened": "R IY OW P AH N D",
    "ai": "EY AY",
    "sla": "EH S EH L EY",
    "handoff": "HH AE N D AO F",
    "workspace": "W ER K S P EY S",
    "unassigned": "AH N AH S AY N D",
    "escalations": "EH S K AH L EY SH AH N Z",
    "de": "D IY",
    "de-escalate": "D IY EH S K AH L EY T",
    "reroute": "R IY R UW T",
    "escalate": "EH S K AH L EY T",
    "barre": "B AA R",
    "headset": "HH EH D S EH T",
    "reopen": "R IY OW P AH N",
    "microphone": "M AY K R AH F OW N",
}
extra.update(
    {
        "assistant's": "AH S IH S T AH N T S",
        "reproducible": "R IY P R AH D UW S AH B AH L",
    }
)
for letter, count in zip("abcdefghij", [1, 1, 1, 3, 3, 3, 3, 3, 4, 3]):
    group = films[pos : pos + count]
    pos += count
    path = ROOT / (letter + ".wav")
    data = sp.check_output(
        [
            ff,
            "-v",
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
    d = Decoder(loglevel="ERROR")
    words = []
    sent = []
    for film in group:
        for ch in film["chapters"]:
            for line in re.split(r"(?<=[.!?])\s+", ch["text"]):
                sent.append((film, ch, line, len(words)))
                words.extend(re.findall("[a-z']+", line.lower()))
    for w in set(words):
        if not d.lookup_word(w):
            d.add_word(w, extra[w], True)
    d.set_align_text(" ".join(words))
    d.start_utt()
    d.process_raw(data, False, True)
    d.end_utt()
    seg = [s for s in d.seg() if s.word[0] not in "<["]
    assert len(seg) == len(words), (letter, len(seg), len(words))
    assert all(re.sub(r"\(\d+\)$", "", s.word) == w for s, w in zip(seg, words))
    for i, f in enumerate(group):
        entries = [e for e in sent if e[0] is f]
        first = entries[0][-1]
        last = next((k for g, c, l, k in sent if g["id"] > f["id"]), len(seg))
        start = (
            0
            if not first
            else (seg[first - 1].end_frame + seg[first].start_frame) / 200
        )
        end = (
            len(data) / 32000
            if last == len(seg)
            else (seg[last - 1].end_frame + seg[last].start_frame) / 200
        )
        f["duration"] = round(end - start, 3)
        f["cues"] = []
        for _, ch, line, k in entries:
            t = round(max(0, seg[k].start_frame / 100 - start), 3) if f["cues"] else 0
            ch.setdefault("time", t)
            f["cues"].append([t, line])
        sp.run(
            [
                ff,
                "-v",
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
                str(ROOT / f"{f['id']}.m4a"),
            ],
            check=True,
        )
    print(letter, "aligned", flush=True)
(ROOT / "timeline.json").write_text(json.dumps(films, indent=2))
