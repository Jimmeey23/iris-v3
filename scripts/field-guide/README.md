# IRIS Operations Academy

The toolbar film icon opens the native Knowledge → Video tutorials library. This edition contains **26 core screencasts plus 25 narrated SOPs**. Film 01 is AI Assistant intake; film 26 is Form Mode. Each records an actual `POST /api/tickets`, opens the returned ticket number, reloads the page and checks an authenticated GET for the same record. Other workflows use normal Next.js handlers, PostgreSQL transactions, role checks, event history and recurrence triggers. No browser request is intercepted or fulfilled by the recorder. There is no alternate application UI.

The recordings show a **local training installation**, not production. No production account, customer data, provider credentials, emails or messages are needed. Some labels, visible queues and actions depend on role, workspace configuration or app version. The camera, control brackets, academy header and chapter rail are editorial annotations, not application controls. Videos have H.264 video, AAC voice, an English subtitle stream, external WebVTT, transcript and seekable chapters. The player loads metadata for one film at a time.

## Reproduction

1. Run PostgreSQL (including pgcrypto, citext and pg_trgm) on a **new socket-only private cluster**, and create the empty database `iris_academy`. Do not use an existing workspace. Set `GUIDE_PG_SOCKET`, `GUIDE_PG_PORT` (default `5537`) and a strong temporary `GUIDE_PASSWORD`. Run `node scripts/field-guide/bootstrap.cjs` once. The script refuses a nonempty IRIS schema or TCP-enabled cluster. It installs the repo schema, neutralizes bundled staff contact details, disables the seed login, and provisions a training operator and six artificial repair cases. Two day-five checks are created by the actual scheduler function.
2. Run the normal local Next server on port 3100 with `NEON_DATABASE_URL` pointing at that private database, `NOTIFY_DRY_RUN=1`, and no third-party credentials. Do not enable preview auth. Use the same `GUIDE_PASSWORD` for the recorder. The recorder signs in via `/api/auth/login`; it can alternatively reuse an already authenticated training operator's `GUIDE_SESSION` in process memory. Never save or publish credentials in recordings.
3. Install `playwright-core@1.65.1` in a tools directory and set `GUIDE_TOOLS` to that directory and `CHROME_PATH` to a compatible desktop Chromium executable. Install Python dependencies `Pillow`, `numpy`, `opencv-python-headless`, `imageio-ffmpeg`; install the DejaVu fonts. From the repo root run `python scripts/field-guide/recover.py` to recover all timing and voice tracks from the shipped videos. For a new narration, `align.py` uses PocketSphinx to align the ten takes under `build/academy/audio/a.wav` through `j.wav` to `syllabus.txt`.
4. Capture on a fresh training database in this order (some actions depend on previous outcomes):

   ```sh
   node scripts/field-guide/capture.mjs 26 1 2 3 17 18 19 20 21 22 5 23 4 6 24 7 8 9 10 11 12 13 14 15 16 25
   ```

   Capture IDs are storyboard IDs: **26 → published film 01 (AI Assistant), 1 → published film 26 (Form Mode)**. All others map directly. Records are mutated for real: start from a fresh cluster to repeat a completed lesson that expects an open ticket or due check. Frames, verification receipts and editorial timing live in ignored `build/academy`. Successful capture writes `edit.json` per film; do not render from a failed take.
5. `python scripts/field-guide/render.py` edits the real Chromium frames, uses the hand-authored section setups in `camera.py` and attaches narration/captions. Optional arguments select capture IDs. `python scripts/field-guide/catalog.py` rebuilds the sorted manifest. Serve `public/field-guide` with a static HTTP server or open it from IRIS. Remove the temporary recording cluster and credentials when finished.

### Editing the camera

Key setups by the first recorder beat on a surface. Group controls that belong to the same task. `compose` fits the visible bounds of the entire group with room for labels, up to the specified magnification. `wide` establishes the workspace, `push` eases directly into a same-page section, and `cut` reframes on a surface change. Once settled, the crop is constant until the next setup; clicking, typing and reading never change its scale. Keep comparison views wide. Check plans against captures with `python scripts/field-guide/check_camera.py` and review the rendered edit before publishing.

### SOP edition (films 27–51)

These are new narrated case-based edits of the original authenticated captures, not 25 newly submitted tickets. `sop-lessons.txt` names each source capture and its zero-based action range, the chapter, visible control point and spoken script. A comma joins multiple source sequences. `sop-controls.txt` contains the use case, stop condition and completion evidence for each procedure. Scripts keep the previously approved section framing; adjacent clicks do not trigger automatic zoom resets.

From the repo root, after obtaining the source captures as above:

1. `python scripts/field-guide/sop_recover.py` extracts SOP narration and timings from the shipped media (Python 3.10+). Alternatively, for a new narration, put ten continuous English takes `a.wav`–`j.wav` in `build/academy/sop` in script order (lesson counts 1,1,1,3,3,3,3,3,4,3). Use `sop_align.py` with PocketSphinx to align the spoken sentences and split the audio tracks.
2. `python scripts/field-guide/sop_render.py` renders the raw screen frames, focus brackets, control points, progress rail, narration, subtitles and posters. Optional arguments are **published film numbers** (27–51).
3. `python scripts/field-guide/sop_publish.py` regenerates the dedicated SOP manifest and downloadable Markdown handbook. The player combines both catalogs. The original 26 films need not be re-rendered.
