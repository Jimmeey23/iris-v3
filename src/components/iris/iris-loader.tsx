"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IrisLoader — a polished, on-brand loading animation.
 *
 * Three concentric arcs rotate at different speeds around a pulsing center
 * node, echoing the new IrisLogo design. The arcs use var(--primary) so the
 * loader matches the active accent color.
 *
 * Variants:
 *   - "sm" (24px) — inline loaders in buttons / message bubbles
 *   - "md" (40px) — default, for content placeholders
 *   - "lg" (64px) — full-view loaders (page transitions, AI thinking)
 *
 * An optional `label` prop renders a small text label below the spinner
 * (e.g. "IRIS is thinking…").
 */

type Size = "sm" | "md" | "lg";

const SIZE_PX: Record<Size, number> = { sm: 24, md: 40, lg: 64 };

export function IrisLoader({
  size = "md",
  label,
  className,
}: {
  size?: Size;
  label?: string;
  className?: string;
}) {
  const px = SIZE_PX[size];
  const labelSize =
    size === "sm" ? "text-[9px]"
    : size === "lg" ? "text-[12px]"
    : "text-[10px]";

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        className="iris-loader"
        style={{ width: px, height: px }}
        role="status"
        aria-live="polite"
        aria-label={label || "Loading"}
      >
        <svg viewBox="0 0 40 40" width={px} height={px}>
          {/* Outer arc — slow rotation */}
          <g style={{ transformOrigin: "20px 20px", animation: "iris-loader-outer 2s linear infinite" }}>
            <path
              d="M 20 3 A 17 17 0 0 1 37 20"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.85"
            />
          </g>
          {/* Middle arc — medium rotation, opposite direction */}
          <g style={{ transformOrigin: "20px 20px", animation: "iris-loader-middle 1.5s linear infinite reverse" }}>
            <path
              d="M 20 7 A 13 13 0 0 1 33 20"
              fill="none"
              stroke="var(--iris-hero-to)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.65"
            />
          </g>
          {/* Inner arc — fast rotation */}
          <g style={{ transformOrigin: "20px 20px", animation: "iris-loader-inner 1s linear infinite" }}>
            <path
              d="M 20 11 A 9 9 0 0 1 29 20"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.45"
            />
          </g>
          {/* Pulsing center node */}
          <circle
            cx="20" cy="20" r="2.5"
            fill="var(--primary)"
            style={{ animation: "iris-loader-pulse 1.2s ease-in-out infinite" }}
          />
        </svg>
        <style>{`
          @keyframes iris-loader-outer { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes iris-loader-middle { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes iris-loader-inner { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes iris-loader-pulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        `}</style>
      </div>
      {label && (
        <span className={cn("font-medium text-muted-foreground tracking-wide", labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * IrisThinkingIndicator — drop-in replacement for the old 3-dot thinking
 * bubble in the AI assistant. Uses IrisLoader + a small label that cycles
 * through "thinking" messages.
 */
export function IrisThinkingIndicator({ label = "IRIS is thinking" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 iris-fade-in">
      <IrisLoader size="sm" />
      <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
        {label}
        <span className="iris-thinking-ellipsis" aria-hidden>
          <span>.</span><span>.</span><span>.</span>
        </span>
      </span>
      <style>{`
        .iris-thinking-ellipsis span {
          display: inline-block;
          opacity: 0;
          animation: iris-thinking-ellipsis 1.4s infinite;
        }
        .iris-thinking-ellipsis span:nth-child(2) { animation-delay: 0.2s; }
        .iris-thinking-ellipsis span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes iris-thinking-ellipsis {
          0%, 60%, 100% { opacity: 0; }
          20%, 40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
