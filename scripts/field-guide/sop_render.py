"""Assemble SOPs from original Chromium frames (not from exported Academy movies)."""

from bisect import bisect_left, bisect_right
from functools import lru_cache
from pathlib import Path
import json, math, subprocess as sp, sys
import imageio_ffmpeg, cv2
from PIL import Image, ImageDraw, ImageFont
from sop_script import ROOT, PUBLIC
from camera import compose, bounds

FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 20
W, H = 1360, 900
X, Y, SW, SH = 28, 48, 1304, 767
INK = "#111d26"
TEAL = "#98efcb"
WHITE = "#f6faf7"
AMBER = "#ffdc93"
cv2.setNumThreads(1)


@lru_cache(None)
def font(size, bold=False, mono=False):
    return ImageFont.truetype(
        "DejaVuSans" + ("Mono" if mono else "") + ("-Bold" if bold else "") + ".ttf",
        size,
    )


def label(d, xy, s, size, fill, bold=False, mono=False, anchor="lm"):
    d.text(xy, s, fill=fill, font=font(size, bold, mono), anchor=anchor)


@lru_cache(None)
def source(n):
    p = Path("build/academy/capture") / f"{n:02}"
    m = json.loads((p / "edit.json").read_text())
    sh = m["shots"]
    frames = m["frames"]
    hi = [i for i, f in enumerate(frames) if f["name"].startswith("hi-")]
    assert len(hi) == 2 * len(sh)
    setups = compose(n, sh)
    crops = [next(k.crop for k in reversed(setups) if k.time <= s["t"]) for s in sh]
    return p, sh, frames, [f["time"] for f in frames], hi, crops


@lru_cache(12)
def picture(path, crop):
    im = cv2.imread(str(path))
    h, w = im.shape[:2]
    x, y, cw, ch = crop
    roi = im[
        round(y * h / 800) : round((y + ch) * h / 800),
        round(x * w / 1360) : round((x + cw) * w / 1360),
    ]
    return Image.fromarray(
        cv2.cvtColor(
            cv2.resize(roi, (SW, SH), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB
        )
    )


def stamp(t):
    ms = round(t * 1000)
    return f"00:{ms//60000:02}:{ms//1000%60:02}.{ms%1000:03}"


# Cut to the named action on the corresponding sentence in the flagship procedures.
# (film, chapter index): (action index within chapter, spoken sentence index).
ANCHORS = {
    (27, 0): [(2, 1)],
    (27, 2): [(1, 2)],
    (27, 3): [(1, 1)],
    (27, 6): [(2, 1)],
    (28, 5): [(1, 2)],
    (28, 0): [(1, 1)],
    (28, 3): [(1, 1), (3, 2)],
    (29, 6): [(1, 1)],
    (29, 1): [(1, 1)],
    (29, 5): [(1, 1)],
}


def shots_for(f, ch, j, end):
    refs = ch["refs"]
    cues = [t for t, _ in f["cues"] if ch["time"] <= t < end]
    anchors = (
        [(0, ch["time"])]
        + [(i, cues[k]) for i, k in ANCHORS.get((f["id"], j), [])]
        + [(len(refs), end)]
    )
    cuts = []
    for (a, t), (b, et) in zip(anchors, anchors[1:]):
        weights = [
            {"type": 1.7, "reload": 1.15}.get(source(n)[1][s]["op"], 1)
            for n, s in refs[a:b]
        ]
        elapsed = 0
        for (n, s), weight in zip(refs[a:b], weights):
            begin = t + (et - t) * elapsed / sum(weights)
            elapsed += weight
            cuts.append((begin, t + (et - t) * elapsed / sum(weights), n, s, j))
    return cuts


def render(f):
    idx = f["id"]
    duration = f["duration"]
    chs = f["chapters"]
    base = PUBLIC.parent / f["path"]
    base.parent.mkdir(exist_ok=True)
    vtt = base.with_suffix(".vtt")
    vtt.write_text(
        "WEBVTT\n\n"
        + "\n\n".join(
            f'{stamp(t)} --> {stamp(f["cues"][i+1][0] if i+1<len(f["cues"]) else duration)}\n{s}'
            for i, (t, s) in enumerate(f["cues"])
        )
        + "\n"
    )
    cuts = []
    for j, ch in enumerate(chs):
        cuts += shots_for(
            f, ch, j, chs[j + 1]["time"] if j + 1 < len(chs) else duration
        )
    times = [k[0] for k in cuts]
    assert times == sorted(set(times)) and times[0] == 0
    output = ROOT / f"{idx}.mp4"
    args = [
        FF,
        "-v",
        "error",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-i",
        str(ROOT / f"{idx}.m4a"),
        "-i",
        str(vtt),
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-map",
        "2:s",
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-threads",
        "2",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-c:s",
        "mov_text",
        "-metadata:s:s:0",
        "language=eng",
        "-movflags",
        "+faststart",
        str(output),
    ]
    pipe = sp.Popen(args, stdin=sp.PIPE)
    cards = []
    for j, ch in enumerate(chs):
        card = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(card)
        d.rounded_rectangle((X, 10, X + 80, 36), 5, fill=TEAL)
        label(
            d, (X + 40, 23), "SOP " + str(idx - 26).zfill(2), 14, INK, True, True, "mm"
        )
        label(d, (122, 23), f["title"], 20, WHITE, True)
        label(
            d,
            (W - X, 24),
            "IRIS  /  FIELD PROCEDURES",
            13,
            TEAL,
            mono=True,
            anchor="rm",
        )
        label(d, (X, 849), f"{j+1:02} / {len(chs):02}", 16, TEAL, True, True)
        label(d, (128, 848), ch["label"], 23, WHITE, True)
        label(d, (W - X, 841), "CONTROL POINT", 11, AMBER, mono=True, anchor="rm")
        label(d, (W - X, 867), ch["gate"], 19, WHITE, anchor="rm")
        cards.append(card)
    for k in range(math.ceil(FPS * duration)):
        t = k / FPS
        i = bisect_right(times, t) - 1
        start, stop, n, s, j = cuts[i]
        p, shots, frames, ft, hi, crops = source(n)
        shot = shots[s]
        crop = crops[s]
        local = t - start
        length = stop - start
        lead = min(0.75, length * 0.23)
        run = min(length * 0.62, max(0.6, min(2.4, shot["end"] - shot["start"])))
        phase = min(1, max(0, (local - lead) / run))
        at = shot["start"] + phase * (shot["end"] - shot["start"])
        fi = (
            hi[2 * s]
            if phase == 0
            else hi[2 * s + 1] if phase == 1 else max(0, bisect_right(ft, at) - 1)
        )
        out = cards[j].copy()
        out.paste(picture(p / frames[fi]["name"], crop), (X, Y))
        d = ImageDraw.Draw(out)
        if shot["op"] != "palette" and (
            shot["op"] in ("", "type") or at < shot["start"] + 0.33
        ):
            x, y, w, h = crop
            l, u, r, b = bounds(shot["bbox"])
            l = max(X + 2, X + (l - x) * SW / w - 3)
            r = min(X + SW - 2, X + (r - x) * SW / w + 3)
            u = max(Y + 2, Y + (u - y) * SH / h - 3)
            b = min(Y + SH - 2, Y + (b - y) * SH / h + 3)
            arm = min(14, (r - l) / 3, (b - u) / 3) * min(1, (local + 0.12) / 0.28)
            for px, dx in [(l, 1), (r, -1)]:
                for py, dy in [(u, 1), (b, -1)]:
                    pts = [(px + dx * arm, py), (px, py), (px, py + dy * arm)]
                    d.line(pts, fill=INK, width=5)
                    d.line(pts, fill="#22bc99", width=3)
        d.rectangle((X, Y + SH + 4, W - X, Y + SH + 7), fill="#34484e")
        d.rectangle((X, Y + SH + 4, X + SW * t / duration, Y + SH + 7), fill=TEAL)
        if k == round(FPS * (12 if idx == 27 else min(duration * 0.3, 5))):
            out.save(base.with_suffix(".jpg"), quality=89)
        pipe.stdin.write(out.tobytes())
    pipe.stdin.close()
    assert pipe.wait() == 0
    output.replace(base.with_suffix(".mp4"))
    print(f"{idx} · {duration:.1f}s · {len(cuts)} shots", flush=True)


if __name__ == "__main__":
    films = json.loads((ROOT / "timeline.json").read_text())
    wanted = set(map(int, sys.argv[1:]))
    for f in films:
        if not wanted or f["id"] in wanted:
            render(f)
