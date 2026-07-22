#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found — install from https://pnpm.io/installation"
  exit 1
fi

if [ ! -d .git ]; then
  echo "Not a git repository — skipping hook installation."
  exit 0
fi

pnpm exec husky
echo "Git hooks installed. Run 'pnpm run verify:pre-commit' to validate."