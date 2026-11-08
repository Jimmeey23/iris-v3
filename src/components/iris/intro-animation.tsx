"use client";

import * as React from "react";
import { IrisLogo } from "./iris-logo";

/** Shared brand scene for both the introduction and real application loading. */
export function IrisLoadingScreen({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <div className="iris-loading-screen" role="status" aria-live="polite">
      <div className="iris-loading-grid" aria-hidden="true" />
      <div className="iris-loading-top"><span className="iris-loading-top-mark"><IrisLogo size={26} /> IRIS</span><span>PHYSIQUE 57 INDIA</span></div>
      <div className="iris-loading-center">
        <div className="iris-loading-orbit" aria-hidden="true">
          <div className="iris-loading-ring iris-loading-ring-one" />
          <div className="iris-loading-ring iris-loading-ring-two" />
          <div className="iris-loading-logo"><IrisLogo size={88} /></div>
          <span className="iris-loading-satellite" />
        </div>
        <div className="iris-loading-kicker">ISSUE RESOLUTION &amp; INTELLIGENT SYSTEMS</div>
        <h1>Everything in its place.</h1>
        <p>Your workspace for thoughtful, connected resolution.</p>
        <div className="iris-loading-progress"><span /></div>
        <div className="iris-loading-status"><span className="iris-loading-dot" />{label}</div>
      </div>
      <div className="iris-loading-bottom"><span>A PRODUCT OF PHYSIQUE 57, INDIA</span><span>MADE FOR BETTER OPERATIONS</span></div>
    </div>
  );
}

export function IntroAnimation() {
  const [visible, setVisible] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);
  React.useEffect(() => {
    if (sessionStorage.getItem("iris-intro-seen")) return;
    setVisible(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => setExiting(true), reduced ? 300 : 1800);
    const t2 = setTimeout(() => { setVisible(false); sessionStorage.setItem("iris-intro-seen", "1"); }, reduced ? 400 : 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!visible) return null;
  return <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${exiting ? "opacity-0 pointer-events-none" : "opacity-100"}`}><IrisLoadingScreen label="Welcome to IRIS" /></div>;
}
