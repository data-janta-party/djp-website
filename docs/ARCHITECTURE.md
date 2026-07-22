# Architecture

See **[RFC 001: File Layout & Conventions](rfc/001-file-layout-and-conventions.md)** for the authoritative project structure.

## System Overview

`nextjs-shadcn-cloudflare-template` is a minimal Next.js 16 App Router starter deployed to Cloudflare Workers via OpenNext.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york)
- **Deploy**: `@opennextjs/cloudflare` + Wrangler
- **Testing**: Vitest (unit) + Storybook + Playwright (e2e)

## Directory Layout

| Directory | Purpose |
|-----------|---------|
| `app/` | Routes (pages + API handlers) |
| `components/<feature>/pages/` | Feature page shells only |
| `components/ui/atoms/`, `elements/`, `compositions/` | UI tiers |
| `lib/` | Shared logic, API client, schemas, logging, database |
| `lib/logging/` | Structured JSON logging helpers for API routes |
| `lib/db/` | Drizzle schema + D1 `getDb()` factory |
| `actions/` | Server Actions |
| `hooks/` | Cross-feature client hooks |
| `e2e/` | Playwright `*.spec.ts` tests |
| `config/` | Tooling (Vitest, Playwright, ESLint plugin) |

## Data Flow

1. **RSC pages** compose feature page views from `components/<feature>/pages/`.
2. **Client components** use typed helpers in `lib/api/*` — never raw `fetch('/api/...')`.
3. **Mutations**: Server Actions in `actions/` with Zod-validated input.

## Observability

API routes emit structured JSON logs via helpers in `lib/logging/` (see [OBSERVABILITY.md](./OBSERVABILITY.md)). Request correlation uses `x-request-id` or `cf-ray`. Logs are designed for Cloudflare Workers observability → Logpush → Loki → Grafana.

## Data access

D1 access goes through `getDb()` / `getDbAsync()` in `lib/db/` (see [DATABASE.md](./DATABASE.md)). Bindings are per-request — never instantiate a global Drizzle client.

## Enforcement

- `pnpm lint:structure` — custom ESLint layout rules
- `pnpm test:eslint-rules` — rule unit tests
- `pnpm test:fast` — Vitest unit tests
- `pnpm knip` — unused exports/deps