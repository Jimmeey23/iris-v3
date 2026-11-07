"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";

/**
 * PremiumMetricCard
 *
 * A polished, glassmorphic metric card inspired by the BudgetCard design.
 * Features:
 *   - Soft gradient outer card with subtle inner highlight (top-half glow)
 *   - Inner rounded card with bg-card
 *   - Large bold value number (tracking-tight, tabular-nums)
 *   - Trend chip (rounded-full) with arrow icon for + / - trends
 *   - Smooth bezier-curved SVG sparkline with area gradient fill
 *   - Interactive hover: floating tooltip showing the hovered data point,
 *     a glowing dot ring on the curve, vertical dashed guide line
 *   - Scattered decorative dots in the background for depth
 *   - Floating metric icon in the top-right corner
 *
 * All colors use CSS variables (var(--primary), var(--iris-hero-to)) so the
 * card automatically re-themes when the accent color changes.
 *
 * Adapted from the BudgetCard reference design but trimmed for the compact
 * metric-card grid (no large money illustration; uses the metric's lucide
 * icon instead).
 */

export interface PremiumMetricCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  sparkData: number[];
  trend?: string;
  trendUp?: boolean;
  tooltip?: string;
  /** Optional caption shown under the value (e.g. "vs last week") */
  caption?: string;
  className?: string;
}

export function PremiumMetricCard({
  label,
  value,
  icon: Icon,
  sparkData,
  trend,
  trendUp,
  tooltip,
  caption,
  className,
}: PremiumMetricCardProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const chartRef = React.useRef<SVGSVGElement>(null);

  // Chart dimensions
  const chartHeight = 60;
  const chartWidth = 200;
  const padding = { top: 12, bottom: 8, left: 4, right: 4 };

  const maxValue = Math.max(...sparkData, 1);
  const minValue = Math.min(...sparkData, 0);
  const range = maxValue - minValue || 1;

  const getY = (v: number) => {
    const normalized = (v - minValue) / range;
    return chartHeight - padding.bottom - normalized * (chartHeight - padding.top - padding.bottom);
  };
  const getX = (i: number) =>
    padding.left + (i / Math.max(1, sparkData.length - 1)) * (chartWidth - padding.left - padding.right);

  // Smooth bezier curve path through all data points (Catmull-Rom -> Bezier)
  const generatePath = () => {
    if (sparkData.length === 0) return "";
    const pts = sparkData.map((v, i) => ({ x: getX(i), y: getY(v) }));
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const tension = 0.35;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const generateAreaPath = () => {
    const linePath = generatePath();
    if (sparkData.length === 0) return linePath;
    const last = sparkData.length - 1;
    return `${linePath} L ${getX(last)} ${chartHeight - padding.bottom} L ${getX(0)} ${chartHeight - padding.bottom} Z`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || sparkData.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = (x / rect.width) * chartWidth;
    let closestIndex = 0;
    let closestDist = Number.POSITIVE_INFINITY;
    sparkData.forEach((_, i) => {
      const dist = Math.abs(getX(i) - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    setHoveredIndex(closestIndex);
  };

  // Stable scattered decorative dots — generated via a deterministic PRNG
  // seeded by the label so the dots are identical on server and client (no
  // hydration mismatch). `Math.random()` would produce different values on
  // SSR vs CSR and trigger React hydration warnings.
  const scatteredDots = React.useMemo(() => {
    // xmur3 hash → seed for mulberry32
    const seedStr = label + value;
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const state = { v: h >>> 0 };
    const rng = () => {
      state.v = (state.v + 0x6d2b79f5) | 0;
      let t = state.v;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Round to 2 decimals: server and browser float math can differ in the last
    // digits, which would make the SSR'd SVG attributes mismatch on hydration.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return Array.from({ length: 12 }, (_, i) => ({
      x: r2(10 + (i % 4) * 22 + (rng() - 0.5) * 8),
      y: r2(padding.top + 4 + Math.floor(i / 4) * 10 + (rng() - 0.5) * 4),
      opacity: r2(0.3 + rng() * 0.3),
      size: r2(0.8 + rng() * 1.0),
    }));
  }, [label, value, padding.top]);

  // Use a unique gradient id per card instance to avoid collisions when
  // multiple cards render on the same page.
  const gid = React.useId().replace(/[:]/g, "");
  const areaGradId = `pmc-area-${gid}`;
  const lineGradId = `pmc-line-${gid}`;

  return (
    <div
      className={cn(
        "relative rounded-[20px] bg-gradient-to-b from-muted/60 to-muted/40 p-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)_inset] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)_inset] transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
      title={tooltip}
    >
      {/* Inner highlight - subtle top glow */}
      <div
        className="absolute inset-[1px] rounded-[19px] bg-gradient-to-b from-background/50 to-transparent pointer-events-none dark:from-background/20"
        style={{ height: "45%" }}
      />

      {/* Inner card */}
      <div className="relative overflow-hidden rounded-[14px] bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.03)]">
        {/* Header row: label + icon */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </div>
          <div className="relative -mr-0.5 -mt-0.5">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Value + trend */}
        <div className="flex items-end gap-2 mb-1">
          <div className="text-[26px] font-semibold leading-[1] tracking-[-0.02em] tabular-nums text-card-foreground">
            {value}
          </div>
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 mb-0.5 shadow-sm text-[9px] font-semibold",
                trendUp
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
              )}
            >
              {trendUp ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
              {trend}
            </div>
          )}
        </div>
        {caption && (
          <div className="text-[9px] text-muted-foreground mb-1">{caption}</div>
        )}

        {/* Chart */}
        <div className="relative mt-1">
          <svg
            ref={chartRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-[44px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: "default" }}
          >
            <defs>
              <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.30} />
                <stop offset="60%" stopColor="var(--primary)" stopOpacity={0.10} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--iris-hero-to)" />
              </linearGradient>
              <filter id={`pmc-glow-${gid}`} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Scattered decorative dots */}
            {scatteredDots.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={dot.size}
                className="fill-card"
                opacity={dot.opacity * 0.5}
              />
            ))}

            {/* Vertical guide line for hovered point */}
            {hoveredIndex !== null && (
              <line
                x1={getX(hoveredIndex)}
                y1={padding.top}
                x2={getX(hoveredIndex)}
                y2={chartHeight - padding.bottom}
                className="stroke-border"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity={0.7}
              />
            )}

            {/* Area fill */}
            <path d={generateAreaPath()} fill={`url(#${areaGradId})`} />

            {/* Main curve */}
            <path
              d={generatePath()}
              fill="none"
              stroke={`url(#${lineGradId})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover data point */}
            {hoveredIndex !== null && sparkData.length > 0 && (
              <g>
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(sparkData[hoveredIndex])}
                  r="6"
                  className="fill-card"
                  opacity="0.4"
                />
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(sparkData[hoveredIndex])}
                  r="3.5"
                  className="fill-card"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  filter={`url(#pmc-glow-${gid})`}
                />
              </g>
            )}
          </svg>

          {/* Floating tooltip */}
          {hoveredIndex !== null && sparkData.length > 0 && (
            <div
              className="pointer-events-none absolute transition-all duration-150 ease-out z-10"
              style={{
                left: `${(getX(hoveredIndex) / chartWidth) * 100}%`,
                top: `${(getY(sparkData[hoveredIndex]) / chartHeight) * 100}%`,
                transform: "translate(-50%, -130%)",
              }}
            >
              <div className="relative rounded-md bg-foreground/90 px-1.5 py-0.5 shadow-md dark:bg-background/90 backdrop-blur-sm">
                <span className="text-[10px] font-semibold text-background dark:text-foreground tabular-nums">
                  {sparkData[hoveredIndex]}
                </span>
                <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-foreground/90 dark:border-t-background/90" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
