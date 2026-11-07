"use client";

import * as React from "react";

export function IrisLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="iris-bg" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#007bff" />
          <stop offset="1" stopColor="#0056d2" />
        </linearGradient>
        <radialGradient id="iris-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#5ac8fa" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#007bff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="40" height="40" rx="10" fill="url(#iris-bg)" />

      {/* Concentric iris rings — the eye */}
      <g style={{ transformOrigin: "20px 20px", animation: "iris-breathe 4s ease-in-out infinite" }}>
        {/* Outer glow */}
        <circle cx="20" cy="20" r="14" fill="url(#iris-glow)" />

        {/* Outer ring */}
        <circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />

        {/* Second ring */}
        <circle cx="20" cy="20" r="8.5" fill="none" stroke="white" strokeWidth="1.2" opacity="0.35"
          style={{ animation: "iris-ring-pulse 3s ease-in-out infinite" }} />

        {/* Third ring */}
        <circle cx="20" cy="20" r="6" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5"
          style={{ animation: "iris-ring-pulse 3s ease-in-out infinite 0.3s" }} />

        {/* Core — solid white circle */}
        <circle cx="20" cy="20" r="3.5" fill="white" opacity="0.9"
          style={{ animation: "iris-core-pulse 2s ease-in-out infinite" }} />

        {/* Inner accent — blue dot in center */}
        <circle cx="20" cy="20" r="1.5" fill="#007bff" />

        {/* Radiating spokes — 4 dots at cardinal positions */}
        <circle cx="20" cy="7" r="1" fill="white" opacity="0.4"
          style={{ animation: "iris-spoke 2.5s ease-in-out infinite" }} />
        <circle cx="33" cy="20" r="1" fill="white" opacity="0.4"
          style={{ animation: "iris-spoke 2.5s ease-in-out infinite 0.6s" }} />
        <circle cx="20" cy="33" r="1" fill="white" opacity="0.4"
          style={{ animation: "iris-spoke 2.5s ease-in-out infinite 1.2s" }} />
        <circle cx="7" cy="20" r="1" fill="white" opacity="0.4"
          style={{ animation: "iris-spoke 2.5s ease-in-out infinite 1.8s" }} />
      </g>

      <style>{`
        @keyframes iris-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes iris-ring-pulse {
          0%, 100% { opacity: 0.35; stroke-width: 1.2; }
          50% { opacity: 0.6; stroke-width: 1.5; }
        }
        @keyframes iris-core-pulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes iris-spoke {
          0%, 100% { opacity: 0.2; r: 0.8; }
          50% { opacity: 0.5; r: 1.2; }
        }
      `}</style>
    </svg>
  );
}

export function IrisLogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="iris-mark-bg" x1="0" y1="0" x2="20" y2="20">
          <stop stopColor="#007bff" />
          <stop offset="1" stopColor="#0056d2" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="5" fill="url(#iris-mark-bg)" />
      <g style={{ transformOrigin: "10px 10px", animation: "iris-mark-breathe 4s ease-in-out infinite" }}>
        <circle cx="10" cy="10" r="6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
        <circle cx="10" cy="10" r="4" fill="none" stroke="white" strokeWidth="0.7" opacity="0.5"
          style={{ animation: "iris-mark-ring 3s ease-in-out infinite" }} />
        <circle cx="10" cy="10" r="2" fill="white" opacity="0.9"
          style={{ animation: "iris-mark-core 2s ease-in-out infinite" }} />
        <circle cx="10" cy="10" r="0.8" fill="#007bff" />
      </g>
      <style>{`
        @keyframes iris-mark-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes iris-mark-ring {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.7; }
        }
        @keyframes iris-mark-core {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </svg>
  );
}
