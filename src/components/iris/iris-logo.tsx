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
          <stop stopColor="#0d9488" />
          <stop offset="0.5" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="iris-grad-eye" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a7f3d0" />
          <stop offset="1" stopColor="#e0f7fa" />
        </linearGradient>
        <radialGradient id="iris-grad-pupil" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#134e4a" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
      </defs>
      {/* Outer rounded square */}
      <rect width="40" height="40" rx="10" fill="url(#iris-grad-main)" />
      {/* Iris eye shape — animated subtle rotation */}
      <g style={{ transformOrigin: "20px 20px", animation: "iris-logo-rotate 8s ease-in-out infinite" }}>
        <ellipse cx="20" cy="20" rx="12" ry="8" fill="url(#iris-grad-eye)" opacity="0.95" />
        {/* Iris ring details */}
        <ellipse cx="20" cy="20" rx="10" ry="6.5" fill="none" stroke="#14b8a6" strokeWidth="0.5" opacity="0.4" />
        <ellipse cx="20" cy="20" rx="8" ry="5" fill="none" stroke="#0d9488" strokeWidth="0.5" opacity="0.5" />
        {/* Pupil */}
        <circle cx="20" cy="20" r="4" fill="url(#iris-grad-pupil)" />
        {/* Highlight — animated blink */}
        <circle cx="18.5" cy="18.5" r="1.2" fill="white" opacity="0.9" style={{ animation: "iris-logo-blink 4s ease-in-out infinite" }} />
        <circle cx="21.5" cy="21" r="0.6" fill="white" opacity="0.5" />
      </g>
      <style>{`
        @keyframes iris-logo-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(3deg); }
          75% { transform: rotate(-3deg); }
        }
        @keyframes iris-logo-blink {
          0%, 90%, 100% { opacity: 0.9; }
          93% { opacity: 0.1; }
          96% { opacity: 0.9; }
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
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="5" fill="url(#iris-mark-grad)" />
      <g style={{ transformOrigin: "10px 10px", animation: "iris-mark-rotate 8s ease-in-out infinite" }}>
        <ellipse cx="10" cy="10" rx="6" ry="4" fill="#a7f3d0" opacity="0.9" />
        <circle cx="10" cy="10" r="2" fill="#134e4a" />
        <circle cx="9.2" cy="9.2" r="0.6" fill="white" />
      </g>
      <style>{`
        @keyframes iris-mark-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(3deg); }
          75% { transform: rotate(-3deg); }
        }
      `}</style>
    </svg>
  );
}
