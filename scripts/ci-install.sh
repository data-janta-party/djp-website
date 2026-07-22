#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INSTALL_MARKER="node_modules/.ci-install-complete"
# Bind the skip marker to the lockfile so a restored node_modules cache from an
# older lock cannot skip install when dependencies changed.
LOCK_FINGERPRINT="$(
  {
    cat package.json
    cat pnpm-lock.yaml
  } | sha256sum | awk '{ print $1 }'
)"

if [[ -f "${INSTALL_MARKER}" ]] && [[ -d node_modules ]]; then
  if [[ "$(cat "${INSTALL_MARKER}" 2>/dev/null || true)" == "${LOCK_FINGERPRINT}" ]]; then
    echo "CI install: restored cache matches lockfile — skipping install"
    exit 0
  fi
  echo "CI install: cache marker is stale (lockfile changed) — reinstalling"
fi

echo "CI install: installing dependencies"
pnpm install --frozen-lockfile
printf '%s\n' "${LOCK_FINGERPRINT}" > "${INSTALL_MARKER}"
echo "CI install: complete"
