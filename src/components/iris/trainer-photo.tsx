"use client";

import * as React from "react";
import { getTrainerImage } from "@/lib/iris/constants";

/**
 * A trainer's portrait, falling back to `fallback` when there is no photo on file
 * or it fails to load (mirrors v2's TrainerImg in ticket-art.tsx).
 */
export function TrainerPhoto({
  name, className, fallback,
}: {
  name: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const src = getTrainerImage(name);
  const [failed, setFailed] = React.useState<string | null>(null);
  if (!src || failed === src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={name}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}

const AVATAR_TONES = [
  "from-violet-500 to-indigo-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

/**
 * Round trainer thumbnail that always renders: the portrait when there is one,
 * otherwise initials on a stable gradient. Use it anywhere a trainer is listed.
 */
export function TrainerAvatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${tone} text-white font-semibold ring-2 ring-background ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}
      aria-hidden
    >
      <TrainerPhoto
        name={name}
        className="absolute inset-0 h-full w-full object-cover object-top"
        fallback={<span>{initials}</span>}
      />
    </span>
  );
}
