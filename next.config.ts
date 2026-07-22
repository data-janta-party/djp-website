import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPostHogHost } from "@/lib/analytics/posthog-config";

const cloudflareWorkerBuild = process.env.CLOUDFLARE_WORKER_BUILD === "true";
const posthogHost = getPostHogHost().replace(/\/$/, "");

// next.config may be evaluated without a reliable __dirname (ESM). Anchor shims to CWD.
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const posthogJsStub = path.join(repoRoot, "lib/shims/posthog-js.worker-stub.ts");
const posthogJsReactStub = path.join(repoRoot, "lib/shims/posthog-js-react.worker-stub.ts");

/** Browser hardening headers applied to all HTML/app responses. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS: browsers only honor this over HTTPS (no local-dev breakage on http://localhost).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // CSP: self-hosted Next fonts/assets; allow inline for bootstrap scripts + React.
  // PostHog browser SDK talks to same-origin /ingest (rewritten below).
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
] as const;

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_E2E === "1" ? ".next-e2e" : ".next",
  ...(cloudflareWorkerBuild
    ? {
        images: { unoptimized: true },
      }
    : {}),
  // Next.js 16 defaults to Turbopack. An empty turbopack config is required when
  // a custom `webpack` function is present (otherwise `next build` / `next dev`
  // fail with "webpack config and no turbopack config").
  // Production / Cloudflare CI uses `next build --webpack` so the isServer
  // PostHog stubs below still apply.
  turbopack: {},
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];
  },
  // Stub posthog only on the server/worker graph (webpack builds). Client assets
  // need the real browser SDK so consent accept captures events on Workers.
  // Use `$` exact-match aliases: a bare `posthog-js` alias is a prefix match and
  // breaks `posthog-js/react` → `…/posthog-js.worker-stub.ts/react`.
  webpack: (config, { isServer }) => {
    if (cloudflareWorkerBuild && isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "posthog-js$": posthogJsStub,
        "posthog-js/react$": posthogJsReactStub,
      };
    }
    return config;
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}
