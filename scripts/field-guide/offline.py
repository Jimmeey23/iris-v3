"""Package the Academy for file:// playback without a server, CORS flags or network access."""
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

site = Path('public/field-guide')
out = Path('build/downloads/IRIS-Operations-Academy.zip')
out.parent.mkdir(parents=True, exist_ok=True)
player = (site / 'academy.js').read_text()
# Local ES module imports and external WebVTT are restricted by file-origin CORS.
# Bundle the manifests as classic JS, and expose captions as local Blob URLs.
player = re.sub(r'^import (\w+) from "\./([\w-]+\.js)";', lambda m: f'const {m[1]} = ' + (site / m[2]).read_text().removeprefix('export default '), player, flags=re.M)
captions = {p.relative_to(site).with_suffix('').as_posix(): p.read_text() for p in site.rglob('*.vtt')}
player = 'const captions = ' + json.dumps(captions) + ';\nlet captionURL;\n' + player
player = player.replace('track.src = f.path + ".vtt";', '''if (captionURL) URL.revokeObjectURL(captionURL);
  captionURL = URL.createObjectURL(new Blob([captions[f.path]], {type: 'text/vtt'}));
  track.src = captionURL;''').replace('?edit=section-focus', '')
html = (site / 'index.html').read_text()
html = re.sub(r'<script type="module" src="academy.js[^"\n]*"></script>', '<script src="offline.js"></script>', html)
html = re.sub(r'\?(?:edition=sops|edit=section-focus)', '', html)
html = re.sub(r'<track\s+kind="captions".*?/>', '', html, flags=re.S)
with ZipFile(out, 'w', compression=ZIP_DEFLATED, compresslevel=3) as z:
    z.writestr('index.html', html)
    z.writestr('offline.js', player)
    for p in sorted(site.rglob('*')):
        if p.is_file() and p.suffix in {'.mp4', '.jpg', '.vtt', '.css', '.md'}:
            z.write(p, p.relative_to(site))
print(out, f'({out.stat().st_size / 1e6:.1f} MB)')
