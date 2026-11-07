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
