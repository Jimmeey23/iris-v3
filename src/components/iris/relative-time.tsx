"use client";

import * as React from "react";
import { formatRelativeTime } from "@/lib/iris/utils";

/**
 * RelativeTime
 *
 * Renders a relative-time string (e.g. "5m ago", "2h ago") that is computed
 * only on the client after mount. The server-rendered placeholder is a
 * non-time-dependent fallback ("—" or supplied `fallback`), which guarantees
 * the server HTML always matches the first client render and avoids React
 * hydration warnings like:
 *
 *   "Hydration failed because the server rendered text didn't match the client
 *    ... + 18m ago / - 19m ago"
 *
 * These warnings happen because `formatRelativeTime()` uses `new Date()`,
 * which differs by a few hundred ms between SSR and client hydration - and
 * if that drift crosses a minute boundary, the displayed text changes by 1m.
 *
 * After mount, the component re-renders every `refreshMs` (default 30s) so
 * long-running sessions show fresh relative times without a page reload.
 */
export function RelativeTime({
  date,
  fallback = "—",
  refreshMs = 30_000,
  className,
}: {
  date: string | Date;
  fallback?: string;
  refreshMs?: number;
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  if (!mounted) {
    return <span className={className}>{fallback}</span>;
  }
  return <span className={className}>{formatRelativeTime(date)}</span>;
}
