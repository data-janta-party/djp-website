/**
 * DEV-only slide scrub helpers for the kinetic speech film.
 * Hash `#1`…`#N` (1-based) or `#beat-id` maps to layoutKineticSpeech items.
 */

import { atBeat } from '@/lib/data/kinetic-speech-beatmap';

import type { LaidOutBeat } from '@/lib/data/kinetic-speech';

/** Absolute time (seconds) where a laid-out slide starts on the beat grid. */
export function kineticSlideTimeSec(item: LaidOutBeat): number {
  return atBeat(item.startBeat);
}

/**
 * Parse URL hash into a 1-based slide index.
 * Accepts `#12`, `12`, `#a2-flood`, `a2-flood`. Returns null if invalid.
 */
export function parseKineticSlideHash(
  hash: string,
  items: readonly LaidOutBeat[],
): number | null {
  if (!hash || items.length === 0) {
    return null;
  }
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const token = raw.trim();
  if (!token) {
    return null;
  }

  // Numeric: #1 … #N
  if (/^\d+$/.test(token)) {
    const n = Number(token);
    if (!Number.isInteger(n) || n < 1 || n > items.length) {
      return null;
    }
    return n;
  }

  // Beat id: #a2-flood
  const idx = items.findIndex((item) => item.beat.id === token);
  if (idx < 0) {
    return null;
  }
  return idx + 1;
}

/**
 * 1-based index of the slide active at `timeSec` (last item whose start ≤ time).
 * Before the first slide: returns 1. Empty list: returns 0.
 */
export function slideIndexAtTime(
  items: readonly LaidOutBeat[],
  timeSec: number,
): number {
  if (items.length === 0) {
    return 0;
  }
  let index = 1;
  for (let i = 0; i < items.length; i += 1) {
    if (kineticSlideTimeSec(items[i]!) <= timeSec + 1e-6) {
      index = i + 1;
    } else {
      break;
    }
  }
  return index;
}

/** Write `#n` without pushing history. No-ops when hash already matches. */
export function replaceKineticSlideHash(index1: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  const next = `#${index1}`;
  if (window.location.hash === next) {
    return;
  }
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
}
