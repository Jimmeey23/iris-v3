import type { NextConfig } from "next";

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
 * away; the Report-Only mirror is kept alongside — with no report-uri it costs
 * nothing, and flipping a single header is the fastest rollback if something breaks.
 */
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const csp = cspDirectives.join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), autoplay=(self), camera=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: ["*.e2b.app"],
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["pg"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
