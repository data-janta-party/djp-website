import type { NextConfig } from "next";
import path from "node:path";

import { getPostHogHost } from "@/lib/analytics/posthog-config";

const cloudflareWorkerBuild = process.env.CLOUDFLARE_WORKER_BUILD === "true";
const posthogHost = getPostHogHost().replace(/\/$/, "");

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
  // Stub posthog only on the server/worker graph. Client assets need the real
  // browser SDK so consent accept actually captures events on Cloudflare deploys.
  webpack: (config, { isServer }) => {
    if (cloudflareWorkerBuild && isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "posthog-js": path.resolve(__dirname, "lib/shims/posthog-js.worker-stub.ts"),
        "posthog-js/react": path.resolve(
          __dirname,
          "lib/shims/posthog-js-react.worker-stub.ts",
        ),
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
