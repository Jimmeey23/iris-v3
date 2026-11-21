import core from "./academy-catalog.js";
import procedures from "./sop-catalog.js";
const films = [...core, ...procedures];
const el = (id) => document.getElementById(id),
  player = el("player"),
  pad = (n) => String(n).padStart(2, "0");
// Version the re-edited video and poster even when an earlier film was cached.
const picture = (f, ext) => `${f.path}.${ext}?edit=section-focus`;
const clock = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s) % 60)}`;
const make = (tag, str, cls) => {
  const e = document.createElement(tag);
  if (str) e.textContent = str;
  if (cls) e.className = cls;
  return e;
};
let current = null;
const address = (f) => "#film-" + pad(f.id);
for (const c of new Set(films.map((f) => f.collection)))
  el("collection").add(new Option(c, c));
el("runtime").textContent =
  `${Math.round(films.reduce((s, f) => s + f.duration, 0) / 60)} MIN · ENGLISH CC`;
function library() {
  const q = el("search").value.trim().toLowerCase(),
    category = el("collection").value;
  const filtered = films.filter(
    (f) =>
      (!category || category === f.collection) &&
      [f.title, f.collection, ...f.chapters.map((c) => c.label)]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
  el("count").textContent = `${pad(filtered.length)} / ${films.length} FILMS`;
  const cards = filtered.map((f) => {
    const a = make("a", null, "film");
    a.href = address(f);
    a.setAttribute("aria-current", String(f === current));
    const label = make("div");
    label.append(make("b", f.title), make("small", f.collection));
    a.append(
      make("span", pad(f.id), "num"),
      label,
      make("span", clock(Math.round(f.duration)), "length"),
    );
    return a;
  });
  el("films").replaceChildren(...cards);
  if (!cards.length)
    el("films").append(
      make("p", "No films match. Try another term or collection.", "empty"),
    );
}
function updateChapter() {
  if (!current) return;
  let idx = 0;
  current.chapters.forEach((c, i) => {
    if (c.time <= player.currentTime + 0.02) idx = i;
  });
  [...el("chapters").children].forEach((c, i) =>
    c.setAttribute("aria-current", String(i === idx)),
  );
}
function select() {
  const id = Number(location.hash.match(/^#film-(\d{2})$/)?.[1]);
  const f = films.find((x) => x.id === id) || films[0];
  if (f === current) return;
  current = f;
  player.pause();
  const track = make("track");
  track.kind = "captions";
  track.label = "English";
  track.srclang = "en";
  track.src = f.path + ".vtt";
  player.replaceChildren(track);
  player.poster = picture(f, "jpg");
  player.src = picture(f, "mp4");
  player.setAttribute("aria-label", f.title);
  player.load();
  document.title = f.title + " · IRIS Operations Academy";
  el("meta").textContent =
    `${f.collection.toUpperCase()}   /   ${clock(Math.round(f.duration))}   /   ENGLISH CC`;
  el("title").textContent = f.title;
  el("counter").textContent = `FILM ${pad(f.id)} / ${films.length}`;
  el("verify").textContent = f.verified
    ? `Saved record ${f.verified} verified after reload in the local IRIS training database.`
    : f.controls ? "Procedure edited from authenticated IRIS training recordings. Examples may show separate tickets." : "Recorded in the local IRIS training workspace. Actions vary by role.";
  el("download").href = picture(f, "mp4");
  el("download").download = f.path.split("/").pop() + ".mp4";
  el("chapters").replaceChildren(
    ...f.chapters.map((c) => {
      const b = make("button");
      b.type = "button";
      b.append(
        make("span", clock(c.time), "stamp"),
        document.createTextNode(c.label),
      );
      b.onclick = () => {
        player.currentTime = c.time;
        player.play().catch(() => player.focus());
      };
      return b;
    }),
  );
  const sheet = el("procedure");
  sheet.hidden = !f.controls;
  if (f.controls) {
    el("use-when").textContent = f.controls.trigger;
    el("stop-if").textContent = f.controls.stop;
    el("evidence").textContent = f.controls.evidence;
    el("checklist").replaceChildren(...f.chapters.map(c => make("li", c.gate)));
  }
  el("transcript").replaceChildren(
    ...f.chapters.map((c) => {
      const p = make("p");
      p.append(make("strong", c.label), document.createTextNode(c.text));
      return p;
    }),
  );
  el("prev").disabled = f.id === 1;
  el("next").disabled = f.id === films.length;
  updateChapter();
  library();
}
el("prev").onclick = () => (location.hash = address(films[current.id - 2]));
el("next").onclick = () => (location.hash = address(films[current.id]));
el("search").oninput = library;
el("collection").onchange = library;
window.addEventListener("hashchange", select);
player.addEventListener("timeupdate", updateChapter);
el("browse-sops").onclick = () => {
  el("collection").value = "Operations SOPs";
  el("search").value = "";
  library();
};
select();
