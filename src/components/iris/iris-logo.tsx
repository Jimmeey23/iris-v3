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
        <linearGradient id="iris-grad-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="iris-grad-eye" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bfdbfe" />
          <stop offset="1" stopColor="#eff6ff" />
        </linearGradient>
        <radialGradient id="iris-grad-pupil" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#2563eb" />
        </radialGradient>
      </defs>
      {/* Outer rounded square */}
      <rect width="40" height="40" rx="10" fill="url(#iris-grad-main)" />
      {/* Iris eye shape — continuous gentle rotation */}
      <g style={{ transformOrigin: "20px 20px", animation: "iris-logo-rotate 6s ease-in-out infinite" }}>
        <ellipse cx="20" cy="20" rx="12" ry="8" fill="url(#iris-grad-eye)" opacity="0.95" />
        {/* Iris ring details */}
        <ellipse cx="20" cy="20" rx="10" ry="6.5" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
        <ellipse cx="20" cy="20" rx="8" ry="5" fill="none" stroke="#2563eb" strokeWidth="0.5" opacity="0.5" />
        {/* Pupil — scales subtly like a real iris adjusting to light */}
        <circle cx="20" cy="20" r="4" fill="url(#iris-grad-pupil)" style={{ transformOrigin: "20px 20px", animation: "iris-logo-pupil 5s ease-in-out infinite" }} />
        {/* Eye lid — creates a blink effect by scaling vertically over the eye */}
        <g style={{ transformOrigin: "20px 20px", animation: "iris-logo-blink 3.5s ease-in-out infinite" }}>
          {/* The lid is a matching-background-colored ellipse that covers the eye when scaled to 1 */}
          <ellipse cx="20" cy="20" rx="13" ry="9" fill="#2563eb" style={{ transformOrigin: "20px 20px", transform: "scaleY(0)" }} />
        </g>
        {/* Highlight dot — visible between blinks */}
        <circle cx="18.5" cy="18.5" r="1.2" fill="white" opacity="0.9" style={{ animation: "iris-logo-highlight 3.5s ease-in-out infinite" }} />
        <circle cx="21.5" cy="21" r="0.6" fill="white" opacity="0.5" />
      </g>
      <style>{`
        @keyframes iris-logo-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(4deg); }
          75% { transform: rotate(-4deg); }
        }
        @keyframes iris-logo-blink {
          0%, 85%, 100% { transform: scaleY(0); }
          90% { transform: scaleY(1); }
          93% { transform: scaleY(0); }
        }
        @keyframes iris-logo-highlight {
          0%, 85%, 100% { opacity: 0.9; }
          88% { opacity: 0.9; }
          90% { opacity: 0; }
          93% { opacity: 0; }
          95% { opacity: 0.9; }
        }
        @keyframes iris-logo-pupil {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.92); }
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
        <linearGradient id="iris-mark-grad" x1="0" y1="0" x2="20" y2="20">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="5" fill="url(#iris-mark-grad)" />
      <g style={{ transformOrigin: "10px 10px", animation: "iris-mark-rotate 6s ease-in-out infinite" }}>
        <ellipse cx="10" cy="10" rx="6" ry="4" fill="#bfdbfe" opacity="0.9" />
        <circle cx="10" cy="10" r="2" fill="#1e3a5f" />
        <circle cx="9.2" cy="9.2" r="0.6" fill="white" style={{ animation: "iris-mark-blink 3.5s ease-in-out infinite" }} />
      </g>
      <style>{`
        @keyframes iris-mark-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(4deg); }
          75% { transform: rotate(-4deg); }
        }
        @keyframes iris-mark-blink {
          0%, 85%, 100% { opacity: 1; }
          90% { opacity: 0; }
          93% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
