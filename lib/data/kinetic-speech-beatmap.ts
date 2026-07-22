/**
 * Beat grid extracted from public/audio/speech-trailer.mp3
 * (REDproductions tribal stomping).
 *
 * Analysis: band-separated onset detection → best-fit grid.
 *   BPM 140 · offset 0.2357s · kick on bar beats 1+4 · clap on 2+3
 *
 * ALL story timing is in integer (or half) BEATS. Seconds are derived
 * only when scheduling GSAP: atBeat(i).
 */

import beatAnalysis from '@/lib/data/kinetic-speech-beats.json';

/** Detected BPM of speech-trailer.mp3 */
export const KINETIC_BPM = 140 as const;

/** One quarter-note in seconds (~0.4286s). */
export const KINETIC_BEAT = 60 / KINETIC_BPM;

/** First-grid phase — audio kicks land on offset + n·beat. */
export const KINETIC_OFFSET_SEC = (beatAnalysis as BeatAnalysis).offsetSec;

type BeatAnalysis = {
  bpm: number;
  beatSec: number;
  offsetSec: number;
  durationSec: number;
  count: number;
  /** Bitmask per grid beat: 1=kick 2=clap 4=stomp 8=hat */
  roles: number[];
  /** 0–100 relative hit strength */
  strength: number[];
};

const analysis = beatAnalysis as BeatAnalysis;

/** Absolute time (seconds) of grid beat index i. */
export function atBeat(i: number): number {
  return KINETIC_OFFSET_SEC + i * KINETIC_BEAT;
}

/**
 * Duration helper used in director data: returns **beat count** (not seconds).
 * Name kept as `b` so existing scripts stay readable: b(2) = two beats.
 */
export function b(n: number): number {
  // Snap to half-beat so we never drift off the grid
  return Math.max(0.5, Math.round(n * 2) / 2);
}

/** Snap a beat count to whole or half beats. */
function snapBeats(beats: number, unit: 'half' | 'beat' = 'beat'): number {
  if (beats <= 0) {
    return unit === 'half' ? 0.5 : 1;
  }
  if (unit === 'half') {
    return Math.max(0.5, Math.round(beats * 2) / 2);
  }
  return Math.max(1, Math.round(beats));
}

/**
 * Comfortable hold in **beats** for bilingual web reading at 140 BPM.
 * 1 beat ≈ 0.43s · 2 beats ≈ 0.86s · 4 beats ≈ 1.71s
 */
export function holdFor(
  text: string,
  intent: 'filler' | 'body' | 'thesis' | 'slam-word' | 'slam-xl' | 'brand' = 'body',
): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  let beats: number;
  switch (intent) {
    case 'filler':
      beats = Math.max(1, words <= 1 ? 1 : 2);
      break;
    case 'slam-word':
      beats = Math.max(2, words);
      break;
    case 'slam-xl':
      beats = 3;
      break;
    case 'brand':
      beats = 6;
      break;
    case 'thesis':
      beats = Math.max(4, Math.min(8, 2 + words));
      break;
    case 'body':
    default:
      beats = Math.max(2, Math.min(6, 1 + words));
      break;
  }
  return snapBeats(beats, 'beat');
}

export type BeatRole = 'kick' | 'clap' | 'stomp' | 'hat' | 'rest';

/** Bitmask roles for a grid beat (from audio analysis). */
function beatRoles(i: number): BeatRole[] {
  if (i < 0 || i >= analysis.roles.length) {
    // Fall back to the dominant pattern: kick on 0+3, clap on 1+2
    const bib = ((i % 4) + 4) % 4;
    if (bib === 0 || bib === 3) {
      return ['kick'];
    }
    if (bib === 1 || bib === 2) {
      return ['clap'];
    }
    return ['rest'];
  }
  const m = analysis.roles[i]!;
  const out: BeatRole[] = [];
  if (m & 1) {
    out.push('kick');
  }
  if (m & 2) {
    out.push('clap');
  }
  if (m & 4) {
    out.push('stomp');
  }
  if (m & 8) {
    out.push('hat');
  }
  return out.length ? out : ['rest'];
}

export function isKickBeat(i: number): boolean {
  return beatRoles(i).includes('kick');
}

export function isDownbeat(i: number): boolean {
  return i % 4 === 0;
}

/**
 * Kick (heartbeat) beat indices inside [startBeat, endBeat).
 * Used to schedule scale pulses while text is on screen.
 */
export function kickBeatsInRange(startBeat: number, endBeat: number): number[] {
  const out: number[] = [];
  const a = Math.ceil(startBeat);
  const z = Math.floor(endBeat - 1e-9);
  for (let i = a; i <= z; i += 1) {
    if (isKickBeat(i)) {
      out.push(i);
    }
  }
  return out;
}

/**
 * Every whole beat index in [start, end) — for loading-dot step animations.
 */
export function wholeBeatsInRange(startBeat: number, endBeat: number): number[] {
  const out: number[] = [];
  const a = Math.ceil(startBeat);
  const z = Math.floor(endBeat - 1e-9);
  for (let i = a; i <= z; i += 1) {
    out.push(i);
  }
  return out;
}


