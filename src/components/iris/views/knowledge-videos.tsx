"use client";

import { useRef, useState } from "react";
import { Download, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import core from "../../../../public/field-guide/academy-catalog.js";
import sops from "../../../../public/field-guide/sop-catalog.js";

// The in-app and offline players use the same published film metadata.
const films = [...core, ...sops];
const collections = [...new Set(films.map((f) => f.collection))];
const clock = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export default function KnowledgeVideos() {
  const [id, select] = useState(sops[0].id);
  const [query, search] = useState("");
  const [collection, filter] = useState("");
  const player = useRef<HTMLVideoElement>(null);
  const film = films.find((f) => f.id === id)!;
  const path = `/field-guide/${film.path}`;
  const matches = films.filter(
    (f) =>
      (!collection || f.collection === collection) &&
      [f.title, f.collection, ...f.chapters.map((c) => c.label)]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <section aria-label="Video tutorials" className="space-y-4 pt-2">
      <div>
        <h2 className="text-lg font-semibold">Operations Academy</h2>
        <p className="text-sm text-muted-foreground">
          {films.length} narrated tutorials, including {sops.length} operating
          procedures. Pick a film or jump to a chapter.
        </p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,30%)]">
        <article className="iris-card min-w-0 space-y-3 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {film.collection} · {clock(film.duration)} · English captions
          </p>
          <h3 className="text-lg font-semibold">{film.title}</h3>
          <video
            key={id}
            ref={player}
            controls
            playsInline
            preload="metadata"
            poster={`${path}.jpg`}
            src={`${path}.mp4`}
            aria-label={film.title}
            className="aspect-[1360/900] w-full rounded-lg bg-black"
          >
            <track
              kind="captions"
              srcLang="en"
              label="English"
              src={`${path}.vtt`}
            />
          </video>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Chapters</h4>
            <a
              download
              href={`${path}.mp4`}
              className="inline-flex items-center gap-1 text-xs text-primary underline"
            >
              <Download size={13} /> Download MP4
            </a>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {film.chapters.map((c) => (
              <button
                type="button"
                key={c.time}
                className="rounded-md border px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  const v = player.current;
                  if (v) {
                    v.currentTime = c.time;
                    void v.play().catch(() => v.focus());
                  }
                }}
              >
                <span className="mr-1 font-mono text-muted-foreground">
                  {clock(c.time)}
                </span>
                {c.label}
              </button>
            ))}
          </div>
          {"controls" in film && (
            <details
              key={`sop-${id}`}
              className="rounded-md border p-3 text-sm"
            >
              <summary className="cursor-pointer font-medium">
                Operating procedure checklist
              </summary>
              <p className="mt-2">
                <strong>Use when:</strong> {film.controls.trigger}
              </p>
              <ol className="my-2 list-decimal pl-5">
                {film.chapters.map((c) => (
                  <li key={c.time}>{c.gate}</li>
                ))}
              </ol>
              <p>
                <strong>Stop and check:</strong> {film.controls.stop}
              </p>
              <p className="mt-2">
                <strong>Completion evidence:</strong> {film.controls.evidence}
              </p>
            </details>
          )}
          <details key={`text-${id}`} className="rounded-md border p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Read transcript
            </summary>
            {film.chapters.map((c) => (
              <p key={c.time} className="mt-2">
                <strong>{c.label}.</strong> {c.text}
              </p>
            ))}
          </details>
        </article>
        <aside
          aria-label="Tutorial library"
          className="iris-card space-y-3 p-4"
        >
          <h3 className="font-semibold">Tutorial library</h3>
          <Input
            type="search"
            aria-label="Search video tutorials"
            placeholder="Find a film or chapter…"
            value={query}
            onChange={(e) => search(e.target.value)}
          />
          <select
            aria-label="Video collection"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={collection}
            onChange={(e) => filter(e.target.value)}
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {matches.length} of {films.length} films
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            {matches.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-current={f.id === id ? "true" : undefined}
                onClick={() => select(f.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted",
                  f.id === id && "bg-primary/10 text-primary",
                )}
              >
                <Play size={13} className="shrink-0" />
                <span className="flex-1">{f.title}</span>
                <small>{clock(f.duration)}</small>
              </button>
            ))}
            {!matches.length && (
              <p className="text-sm">
                No matching films. Try another search or collection.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
