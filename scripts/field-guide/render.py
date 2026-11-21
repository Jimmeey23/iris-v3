"""Edit authenticated screen recordings to forced-aligned narration. All app pixels come from Chromium."""

import bisect, json, math, re, subprocess as sp, sys
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont
import cv2, imageio_ffmpeg
from camera import compose, viewport, MOVE

A = Path("build/academy")
OUT = Path("public/field-guide/academy")
OUT.mkdir(exist_ok=True)
BOOK = json.loads((A / "book.json").read_text())
FF = imageio_ffmpeg.get_ffmpeg_exe()
cv2.setNumThreads(1)
W, H = 1360, 900
TOP = 48
X = 14
SW = 1332
SH = 784
FPS = 24
INK = "#111723"
PAPER = "#fcfaf7"
LILAC = "#b5abff"
LIME = "#d6fd91"
MUTE = "#b4bdce"
FAINT = "#364156"


@lru_cache(None)
def font(size, bold=False, mono=False):
    return ImageFont.truetype(
        "DejaVuSans" + ("Mono" if mono else "") + ("-Bold" if bold else "") + ".ttf",
        size,
    )


def text(d, xy, s, size, fill=PAPER, bold=False, mono=False, anchor="lm"):
    d.text(xy, s, font=font(size, bold, mono), fill=fill, anchor=anchor, stroke_width=0)


def clamp(x, a=0, b=1):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def stamp(t):
    ms = round(1000 * t)
    return f"00:{ms//60000:02}:{ms//1000%60:02}.{ms%1000:03}"


def film_number(n):
    return {1: 26, 26: 1}.get(n, n)


def slug(n, b):
    return f"{film_number(n):02}-" + re.sub(
        r"[^a-z0-9]+", "-", b["title"].lower()
    ).strip("-")


def render(n):
    b = BOOK[n - 1]
    src = A / "capture" / f"{n:02}"
    meta = json.loads((src / "edit.json").read_text())
    frames = meta["frames"]
    shots = meta["shots"]
    times = [f["time"] for f in frames]
    beats = [v["t"] for v in shots]
    duration = b["duration"]
    cues = b["cues"]
    chapterTimes = [
        next(r[0] for r in cues if r[1] == k) for k in range(len(b["chap"]))
    ]
    name = slug(n, b)
    base = OUT / name
    vtt = base.with_suffix(".vtt")
    vtt.write_text(
        "WEBVTT\n\n"
        + "\n\n".join(
            f"{stamp(t)} --> {stamp(cues[i+1][0] if i+1<len(cues) else duration)}\n{s}"
            for i, (t, j, s) in enumerate(cues)
        )
        + "\n"
    )
    temp = src / "edition.mp4"
    enc = sp.Popen(
        [
            FF,
            "-loglevel",
            "error",
            "-y",
            "-f",
            "rawvideo",
            "-s",
            f"{W}x{H}",
            "-pix_fmt",
            "rgb24",
            "-r",
            str(FPS),
            "-i",
            "-",
            "-i",
            str(A / "audio" / f"{n:02}.m4a"),
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
            "-threads",
            "2",
            "-preset",
            "veryfast",
            "-crf",
            "22",
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
            str(temp),
        ],
        stdin=sp.PIPE,
    )
    chrome = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(chrome)
    for k in range(4):
        d.rounded_rectangle(
            (15 + k * 5, 17, 18 + k * 5, 30),
            radius=1,
            fill=[LIME, "#b1d590", "#90b996", "#65999c"][k],
        )
    text(d, (46, 24), "IRIS", 18, bold=True)
    text(d, (105, 25), "OPERATIONS ACADEMY", 13, LILAC, mono=True)
    text(
        d,
        (W - 16, 25),
        f'{b["section"].upper()}   /   FILM {film_number(n):02} OF {len(BOOK)}',
        13,
        MUTE,
        mono=True,
        anchor="rm",
    )
    text(d, (W - 18, 867), b["title"], 16, MUTE, anchor="rm")
    setups = compose(n, shots)
    setup_at = {setup.time: setup for setup in setups}
    hi = [f for f in frames if f["name"].startswith("hi-")]
    assert len(hi) == 2 * len(shots)
    old = -1
    img = None
    for frame in range(math.ceil(duration * FPS)):
        t = frame / FPS
        j = max(0, bisect.bisect_right(beats, t) - 1)
        sh = shots[j]
        local = t - sh["t"]
        length = (beats[j + 1] if j + 1 < len(beats) else duration) - sh["t"]
        chapter = max(0, bisect.bisect_right(chapterTimes, t) - 1)
        # Show the approach, actual click/typing and resulting page, then hold for the explanation.
        first = sh["start"]
        stop = sh["end"]
        actionLength = min(length * 0.87, max(0.9, min(2.7, (stop - first) * 1.65)))
        # Leave the target visible before committing an action, particularly during a push.
        setup = setup_at.get(sh["t"])
        lead = min(
            length * 0.48, (MOVE + 0.25 if setup and setup.kind != "cut" else 0.42)
        )
        phase = clamp((local - lead) / min(actionLength, length - lead))
        srcTime = first + phase * (stop - first)
        fidx = max(0, bisect.bisect_right(times, srcTime) - 1)
        if phase == 0:
            fidx = bisect.bisect_left(times, hi[j * 2]["time"])
        elif phase == 1:
            fidx = bisect.bisect_left(times, hi[j * 2 + 1]["time"])
        if fidx != old:
            img = cv2.imread(str(src / frames[fidx]["name"]))
            old = fidx
        box = sh["bbox"]
        x = clamp(box["x"], 0, 1358)
        y = clamp(box["y"], 0, 798)
        w = clamp(box["width"], 2, 1360 - x)
        h = clamp(box["height"], 2, 800 - y)
        # Only mark an actionable locator while it is still on this surface.
        active = not sh["op"] or sh["op"] == "type" or srcTime < first + 0.33
        if sh["op"] == "palette":
            active = False  # global shortcut, not a sidebar click
        xx, yy, cw, ch = viewport(setups, t)
        ih, iw = img.shape[:2]
        ax = iw / 1360
        ay = ih / 800
        roi = img[
            round(yy * ay) : max(round(yy * ay) + 1, round((yy + ch) * ay)),
            round(xx * ax) : max(round(xx * ax) + 1, round((xx + cw) * ax)),
        ]
        screen = cv2.resize(roi, (SW, SH), interpolation=cv2.INTER_CUBIC)
        frameimg = chrome.copy()
        frameimg.paste(
            Image.fromarray(cv2.cvtColor(screen, cv2.COLOR_BGR2RGB)), (X, TOP)
        )
        d = ImageDraw.Draw(frameimg)
        # Screen-space tracking brackets and a cursor pulse. No recreated controls or data.
        if active:
            left = X + (x - xx) * SW / cw
            right = left + w * SW / cw
            top = TOP + (y - yy) * SH / ch
            bottom = top + h * SH / ch
            left = clamp(left - 4, X + 1, X + SW - 3)
            right = clamp(right + 4, left + 1, X + SW - 1)
            top = clamp(top - 4, TOP + 1, TOP + SH - 3)
            bottom = clamp(bottom + 4, top + 1, TOP + SH - 1)
            arm = max(2, min(16, (right - left) / 3, (bottom - top) / 3)) * ease(
                (local + 0.1) / 0.32
            )
            for dx in [1, -1]:
                for dy in [1, -1]:
                    px = left if dx == 1 else right
                    py = top if dy == 1 else bottom
                    pts = [(px + dx * arm, py), (px, py), (px, py + dy * arm)]
                    d.line(pts, fill="#292060", width=6)
                    d.line(pts, fill="#9c81ff", width=3)
        progressW = SW / len(chapterTimes)
        for k, start in enumerate(chapterTimes):
            end = chapterTimes[k + 1] if k + 1 < len(chapterTimes) else duration
            l = X + k * progressW
            r = l + progressW - 4
            d.rectangle((l, TOP + SH + 4, r, TOP + SH + 6), fill=FAINT)
            d.rectangle(
                (
                    l,
                    TOP + SH + 4,
                    l + (r - l) * clamp((t - start) / (end - start)),
                    TOP + SH + 6,
                ),
                fill=LIME,
            )
        text(d, (18, 866), f"STEP {chapter+1:02}", 14, LIME, True, True)
        text(
            d,
            (114 + round(9 * (1 - ease((t - chapterTimes[chapter]) / 0.42))), 866),
            b["chap"][chapter][0],
            24,
            bold=True,
        )
        if frame == int(
            (5.8 if n == 1 else 1.8 if n == 26 else min(3.6, duration / 4)) * FPS
        ):
            frameimg.save(base.with_suffix(".jpg"), quality=92)
        enc.stdin.write(frameimg.tobytes())
    enc.stdin.close()
    assert enc.wait() == 0
    temp.replace(base.with_suffix(".mp4"))
    print(f"{n:02} rendered", flush=True)


if __name__ == "__main__":
    for n in list(map(int, sys.argv[1:])) or range(1, len(BOOK) + 1):
        render(n)
