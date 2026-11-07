"use client";

import * as React from "react";

/**
 * IrisLogo / IrisLogoMark
 *
 * Redesigned logo: an abstract "intelligence node" mark — a hexagonal hub
 * with three orbiting signal arcs, suggesting a central routing brain that
 * connects to multiple agents/studios.
 *
 * Design rationale:
 *   - Hexagon = stability + structure (operations platform)
 *   - Central node = the IRIS core (routing engine)
 *   - Three orbiting arcs = the multi-agent system + Mumbai/Bengaluru studios
 *   - Slow rotation = continuous monitoring / "always-on"
 *
 * The mark uses CSS variables (var(--primary), var(--iris-hero-to)) so it
 * follows the random accent color like the rest of the app.
 *
 * Style attribute on <stop> is used for SVG gradient stops because it's
 * the most reliable cross-browser way to theme inline SVGs with CSS vars.
 */

export function IrisLogo({ size = 32, className }: { size?: number; className?: string }) {
  const primaryStop: React.CSSProperties = { stopColor: "var(--primary)" };
  const secondaryStop: React.CSSProperties = { stopColor: "var(--iris-hero-to)" };
  const primaryFill: React.CSSProperties = { fill: "var(--primary)" };

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-label="IRIS">
      <defs>
        <linearGradient id="iris-bg-grad" x1="0" y1="0" x2="40" y2="40">
          <stop style={primaryStop} />
          <stop offset="1" style={secondaryStop} />
        </linearGradient>
      </defs>

      {/* Rounded-square background with the accent gradient */}
      <rect width="40" height="40" rx="11" fill="url(#iris-bg-grad)" />

      {/* Outer hex ring — slow rotation, low opacity */}
      <g style={{ transformOrigin: "20px 20px", animation: "iris-orbit-slow 18s linear infinite" }}>
        <polygon
          points="20,5 31.5,11.5 31.5,28.5 20,35 8.5,28.5 8.5,11.5"
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
      </g>

      {/* Three orbiting signal arcs — medium rotation, medium opacity */}
      <g style={{ transformOrigin: "20px 20px", animation: "iris-orbit-med 8s linear infinite" }}>
        <path d="M 20 5 A 15 15 0 0 1 33 14" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M 33 26 A 15 15 0 0 1 20 35" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M 7 14 A 15 15 0 0 1 7 26" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55" />
      </g>

      {/* Inner hex — solid white-tint, marks the routing core */}
      <polygon
        points="20,11 27,15 27,25 20,29 13,25 13,15"
        fill="white"
        fillOpacity="0.18"
        stroke="white"
        strokeWidth="0.8"
        strokeOpacity="0.45"
      />

      {/* Pulsing center node — the IRIS core */}
      <circle
        cx="20" cy="20" r="3.2"
        fill="white"
        style={{ animation: "iris-core-pulse 2.4s ease-in-out infinite" }}
      />
      {/* Inner accent dot — picks up the active accent color */}
      <circle cx="20" cy="20" r="1.4" style={primaryFill} />

      <style>{`
        @keyframes iris-orbit-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes iris-orbit-med  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes iris-core-pulse { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
      `}</style>
    </svg>
  );
}

export function IrisLogoMark({ size = 20, className }: { size?: number; className?: string }) {
  const primaryStop: React.CSSProperties = { stopColor: "var(--primary)" };
  const secondaryStop: React.CSSProperties = { stopColor: "var(--iris-hero-to)" };
  const primaryFill: React.CSSProperties = { fill: "var(--primary)" };

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-label="IRIS">
      <defs>
        <linearGradient id="iris-mark-bg-2" x1="0" y1="0" x2="20" y2="20">
          <stop style={primaryStop} />
          <stop offset="1" style={secondaryStop} />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="5.5" fill="url(#iris-mark-bg-2)" />

      {/* Hex outline */}
      <polygon
        points="10,2.5 16,6 16,14 10,17.5 4,14 4,6"
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        strokeOpacity="0.3"
      />
      {/* Three short signal arcs */}
      <g style={{ transformOrigin: "10px 10px", animation: "iris-mark-orbit 6s linear infinite" }}>
        <path d="M 10 2.5 A 7.5 7.5 0 0 1 16.5 7" fill="none" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M 16.5 13 A 7.5 7.5 0 0 1 10 17.5" fill="none" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M 3.5 7 A 7.5 7.5 0 0 1 3.5 13" fill="none" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.55" />
      </g>

      {/* Center node */}
      <circle cx="10" cy="10" r="1.8" fill="white" style={{ animation: "iris-mark-pulse 2.4s ease-in-out infinite" }} />
      <circle cx="10" cy="10" r="0.8" style={primaryFill} />

      <style>{`
        @keyframes iris-mark-orbit { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes iris-mark-pulse { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
      `}</style>
    </svg>
  );
}
