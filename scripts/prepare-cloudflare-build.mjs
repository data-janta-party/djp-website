/**
 * OpenNext always runs `pnpm build`, which invokes `next build`.
 *
 * Reusing an existing `.next` directory from a prior build causes two failure modes
 * documented in production:
 * 1. Stale `.next/lock` → "Another next build process is already running"
 * 2. Turbopack incremental rebuild races → ENOENT on *_buildManifest.js.tmp
 *
 * Always start Cloudflare/OpenNext builds from a clean output directory.
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const dir of ['.next', '.open-next']) {
  rmSync(path.join(root, dir), { recursive: true, force: true });
}

console.log('[cloudflare] cleaned .next and .open-next before OpenNext build');