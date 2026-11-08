import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IRIS assistant thumbnail: a friendly AI agent (visor head, glowing eyes, antenna
 * spark) on an accent-coloured orb. Pure SVG so it is crisp at any size and follows
 * the workspace accent colour.
 */
export function IrisAvatar({ size = 28, className, thinking = false }: { size?: number; className?: string; thinking?: boolean }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="IRIS assistant"
      className={cn("shrink-0 rounded-full", className)}
    >
      <defs>
        <radialGradient id={`bg-${id}`} cx="30%" cy="25%" r="85%">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--primary) 55%, white)" />
          <stop offset="60%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="color-mix(in srgb, var(--primary) 70%, black)" />
        </radialGradient>
        <linearGradient id={`head-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6e9f5" />
        </linearGradient>
        <linearGradient id={`visor-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="32" fill={`url(#bg-${id})`} />
      {/* soft orbit ring */}
      <ellipse cx="32" cy="36" rx="25" ry="8" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1.2" />

      {/* antenna + spark */}
      <line x1="32" y1="17" x2="32" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 4.5 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z" fill="#fde68a">
        {thinking && <animateTransform attributeName="transform" type="rotate" from="0 32 9.5" to="360 32 9.5" dur="2.4s" repeatCount="indefinite" />}
      </path>

      {/* ears */}
      <rect x="12" y="29" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.85" />
      <rect x="47" y="29" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.85" />

      {/* head */}
      <rect x="16" y="17" width="32" height="30" rx="11" fill={`url(#head-${id})`} />
      {/* visor */}
      <rect x="20" y="24" width="24" height="13" rx="6.5" fill={`url(#visor-${id})`} />
      {/* eyes */}
      <g fill="#67e8f9">
        <ellipse cx="27" cy="30.5" rx="2.6" ry="3">
          <animate attributeName="ry" values="3;3;0.4;3;3" keyTimes="0;0.9;0.94;0.98;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="37" cy="30.5" rx="2.6" ry="3">
          <animate attributeName="ry" values="3;3;0.4;3;3" keyTimes="0;0.9;0.94;0.98;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* smile */}
      <path d="M27.5 41.5 q4.5 3 9 0" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      {/* body hint */}
      <path d="M22 54 q10 -6 20 0 v10 h-20z" fill="white" fillOpacity="0.9" />
      <circle cx="32" cy="57" r="2" fill="var(--primary)" />
    </svg>
  );
}
