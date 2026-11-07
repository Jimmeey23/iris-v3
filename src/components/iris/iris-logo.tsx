"use client";

import * as React from "react";

export function IrisLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="iris-bg-grad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#007bff" />
          <stop offset="1" stopColor="#0058b8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#iris-bg-grad)" />
      {/* Eye outline */}
      <g style={{ transformOrigin: "20px 20px" }}>
        {/* Eye shape */}
        <path d="M6 20 Q20 8 34 20 Q20 32 6 20 Z" fill="white" opacity="0.15" />
        <path d="M8 20 Q20 10 32 20 Q20 30 8 20 Z" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
        {/* Iris rings */}
        <circle cx="20" cy="20" r="7" fill="none" stroke="white" strokeWidth="0.6" opacity="0.25" style={{ animation: "iris-ring-1 3s ease-in-out infinite" }} />
        <circle cx="20" cy="20" r="5.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.35" style={{ animation: "iris-ring-2 3s ease-in-out infinite 0.2s" }} />
        <circle cx="20" cy="20" r="4" fill="white" opacity="0.12" style={{ animation: "iris-ring-3 2s ease-in-out infinite" }} />
        {/* Pupil */}
        <circle cx="20" cy="20" r="2.5" fill="white" opacity="0.9" style={{ animation: "iris-pupil 2s ease-in-out infinite" }} />
        <circle cx="20" cy="20" r="1" fill="#007bff" />
        {/* Highlight */}
        <circle cx="19" cy="19" r="0.8" fill="white" style={{ animation: "iris-blink 3.5s ease-in-out infinite" }} />
      </g>
      <style>{`
        @keyframes iris-ring-1 { 0%,100% { opacity: 0.2; r: 7; } 50% { opacity: 0.35; r: 7.5; } }
        @keyframes iris-ring-2 { 0%,100% { opacity: 0.3; r: 5.5; } 50% { opacity: 0.5; r: 6; } }
        @keyframes iris-ring-3 { 0%,100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.2; transform: scale(1.1); } }
        @keyframes iris-pupil { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes iris-blink { 0%,85%,100% { opacity: 0.9; } 90% { opacity: 0; } 93% { opacity: 0.9; } }
      `}</style>
    </svg>
  );
}

export function IrisLogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <defs>
        <linearGradient id="iris-mark-bg-2" x1="0" y1="0" x2="20" y2="20">
          <stop stopColor="#007bff" />
          <stop offset="1" stopColor="#0058b8" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="5" fill="url(#iris-mark-bg-2)" />
      <path d="M3 10 Q10 4 17 10 Q10 16 3 10 Z" fill="white" opacity="0.15" />
      <circle cx="10" cy="10" r="3.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
      <circle cx="10" cy="10" r="2.5" fill="white" opacity="0.12" />
      <circle cx="10" cy="10" r="1.3" fill="white" opacity="0.9" style={{ animation: "iris-mark-pulse 2s ease-in-out infinite" }} />
      <circle cx="10" cy="10" r="0.5" fill="#007bff" />
      <style>{`@keyframes iris-mark-pulse { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }`}</style>
    </svg>
  );
}
