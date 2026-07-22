#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .open-next/worker.js ]]; then
  CLOUDFLARE_WORKER_BUILD=true pnpm run build:cloudflare
fi

pnpm exec wrangler dev