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
        <linearGradient id="iris-grad-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#007bff" />
          <stop offset="1" stopColor="#0051d5" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="40" height="40" rx="9" fill="url(#iris-grad-bg)" />
      {/* Stylized "I" — geometric, minimal */}
      <g style={{ transformOrigin: "20px 20px", animation: "iris-logo-float 4s ease-in-out infinite" }}>
        {/* Top bar of I */}
        <rect x="13" y="10" width="14" height="2.5" rx="1.25" fill="white" opacity="0.95" style={{ animation: "iris-logo-pulse-top 3s ease-in-out infinite" }} />
        {/* Center column of I — with a gradient iris pattern */}
        <rect x="18.75" y="10" width="2.5" height="20" fill="white" opacity="0.9" />
        {/* Iris accent — circular gradient in the center of the I */}
        <circle cx="20" cy="20" r="3" fill="white" opacity="0.3" style={{ animation: "iris-logo-pulse-iris 2s ease-in-out infinite" }} />
        <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.8" />
        {/* Bottom bar of I */}
        <rect x="13" y="27.5" width="14" height="2.5" rx="1.25" fill="white" opacity="0.95" style={{ animation: "iris-logo-pulse-bottom 3s ease-in-out infinite 0.5s" }} />
        {/* Spark dots — radiating from center */}
        <circle cx="10" cy="20" r="0.8" fill="white" opacity="0.4" style={{ animation: "iris-logo-spark 2s ease-in-out infinite" }} />
        <circle cx="30" cy="20" r="0.8" fill="white" opacity="0.4" style={{ animation: "iris-logo-spark 2s ease-in-out infinite 0.5s" }} />
      </g>
      <style>{`
        @keyframes iris-logo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes iris-logo-pulse-iris {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        @keyframes iris-logo-pulse-top {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.7; }
        }
        @keyframes iris-logo-pulse-bottom {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.7; }
        }
        @keyframes iris-logo-spark {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.5; transform: scale(1.2); }
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
          <stop offset="1" stopColor="#0051d5" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="5" fill="url(#iris-mark-bg)" />
      <g style={{ transformOrigin: "10px 10px", animation: "iris-mark-float 4s ease-in-out infinite" }}>
        <rect x="6" y="5" width="8" height="1.5" rx="0.75" fill="white" opacity="0.95" />
        <rect x="9.25" y="5" width="1.5" height="10" fill="white" opacity="0.9" />
        <circle cx="10" cy="10" r="1.5" fill="white" opacity="0.3" style={{ animation: "iris-mark-pulse 2s ease-in-out infinite" }} />
        <circle cx="10" cy="10" r="0.75" fill="white" opacity="0.8" />
        <rect x="6" y="13.5" width="8" height="1.5" rx="0.75" fill="white" opacity="0.95" />
      </g>
      <style>{`
        @keyframes iris-mark-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.5px); }
        }
        @keyframes iris-mark-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </svg>
  );
}
