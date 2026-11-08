"use client";

import * as React from "react";

/** A geometric iris: four overlapping apertures around a point of clarity. */
export function IrisLogo({ size = 32, className }: { size?: number; className?: string }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label="IRIS">
      <defs>
        <linearGradient id={id} x1="5" y1="2" x2="60" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary, #7357dd)"/><stop offset="1" stopColor="var(--iris-hero-to, #44319e)"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill={`url(#${id})`}/>
      <rect x=".5" y=".5" width="63" height="63" rx="18.5" stroke="white" strokeOpacity=".22"/>
      <g className="iris-logo-aperture" style={{ transformOrigin: "32px 32px" }}>
        <path d="M32 11C38.6 17.2 40.3 24.2 32 32C23.7 24.2 25.4 17.2 32 11Z" fill="white" fillOpacity=".95"/>
        <path d="M53 32C46.8 38.6 39.8 40.3 32 32C39.8 23.7 46.8 25.4 53 32Z" fill="white" fillOpacity=".72"/>
        <path d="M32 53C25.4 46.8 23.7 39.8 32 32C40.3 39.8 38.6 46.8 32 53Z" fill="white" fillOpacity=".9"/>
        <path d="M11 32C17.2 25.4 24.2 23.7 32 32C24.2 40.3 17.2 38.6 11 32Z" fill="white" fillOpacity=".58"/>
      </g>
      <circle className="iris-logo-core" cx="32" cy="32" r="3.2" fill="white" style={{ transformOrigin: "32px 32px" }}/>
    </svg>
  );
}

export function IrisLogoMark(props: { size?: number; className?: string }) {
  return <IrisLogo size={props.size ?? 20} className={props.className} />;
}
