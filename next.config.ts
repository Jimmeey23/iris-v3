import type { NextConfig } from "next";
import { ROUTE_SEGMENTS } from "./src/lib/iris/routes";

/**
 * Content-Security-Policy, ported from iris-ai-v2.
 *
 * Origins the browser actually talks to (audited from src/components + src/lib):
 *   - 'self'          pages, API routes, next/font and @fontsource (self-hosted fonts)
 *   - data:/blob:     exported files (createObjectURL), chart canvases, image previews
 *   - https: img-src  Momence/trainer images and equipment photos are arbitrary URLs
 * OpenAI/Anthropic, Mailtrap, Neon and Momence are called server-side only, so none of
 * them belong in the browser policy.
 *
 * script-src needs 'unsafe-inline' for Next's inline bootstrap and the pre-paint theme
 * script. A per-request nonce would be stricter but forces every page dynamic; revisit
 * if that trade-off changes. 'unsafe-eval' is only needed by React's dev tooling.
 *
 * Unlike v2 there are no third-party embeds, so the policy ships enforced straight
 * away. (A Report-Only duplicate of the same policy was removed: with no report-uri
 * it only added header bytes. Re-add one when trialling a stricter policy.)
 */
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://server.fillout.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  `connect-src 'self' https://server.fillout.com https://*.fillout.com${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self' https://*.fillout.com https://*.zite.so",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["frame-ancestors 'none'"]),
];

const csp = cspDirectives.join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(isDev ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), autoplay=(self), camera=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["pg"],
  // Every view has its own URL (src/lib/iris/routes.ts). They all serve the one static
  // app page, so deep links cost no serverless invocation; the client picks the view.
  async rewrites() {
    const views = ROUTE_SEGMENTS.join("|");
    return [{ source: `/:view(${views})/:rest*`, destination: "/" }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
