"use client";

import * as React from "react";
import { IrisLogo } from "./iris-logo";
import { useAppStore } from "@/lib/iris/store";

export function IntroAnimation() {
  const [visible, setVisible] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);
  const { setCurrentView } = useAppStore();

  React.useEffect(() => {
    // Only show once per session
    const seen = sessionStorage.getItem("iris-intro-seen");
    if (!seen) {
      setVisible(true);
      const t1 = setTimeout(() => setExiting(true), 1800);
      const t2 = setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem("iris-intro-seen", "1");
      }, 2400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-600 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 iris-aurora opacity-40" />
      <div className="relative flex flex-col items-center gap-5">
        {/* Logo with entrance animation */}
        <div className="relative">
          <div
            className="absolute inset-0 blur-2xl opacity-60"
            style={{
              background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
              animation: "iris-intro-glow 1.8s ease-out",
            }}
          />
          <div
            style={{
              animation: "iris-intro-logo 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
              transformOrigin: "center",
            }}
          >
            <IrisLogo size={80} />
          </div>
        </div>

        {/* Brand text */}
        <div
          className="text-center"
          style={{ animation: "iris-intro-text 1.2s ease-out 0.3s both" }}
        >
          <div className="text-[28px] font-bold tracking-tight iris-text-gradient">
            IRIS
          </div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.3em] font-medium mt-0.5">
            Issue Resolution & Intelligence
          </div>
        </div>

        {/* Loading bar */}
        <div
          className="w-40 h-0.5 bg-muted rounded-full overflow-hidden"
          style={{ animation: "iris-intro-text 1.2s ease-out 0.5s both" }}
        >
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
            style={{ animation: "iris-intro-bar 1.5s ease-out 0.5s" }}
          />
        </div>

        <div
          className="text-[10px] text-muted-foreground"
          style={{ animation: "iris-intro-text 1s ease-out 0.8s both" }}
        >
          Physique 57 India
        </div>
      </div>

      <style>{`
        @keyframes iris-intro-logo {
          0% { transform: scale(0.5) rotate(-20deg); opacity: 0; }
          40% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          60% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes iris-intro-glow {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.5); }
          100% { opacity: 0.3; transform: scale(1); }
        }
        @keyframes iris-intro-text {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes iris-intro-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
