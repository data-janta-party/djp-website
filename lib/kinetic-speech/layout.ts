/**
 * Beat-grid layout for the kinetic speech film.
 */

import {
  isDownbeat,
  isKickBeat,
} from '@/lib/data/kinetic-speech-beatmap';
import { getAllKineticBeats } from '@/lib/kinetic-speech/acts';
import { beatDurationBeats } from '@/lib/kinetic-speech/kinds/duration';
import type { KineticBeat, LaidOutBeat } from '@/lib/kinetic-speech/types';

export { beatDurationBeats } from '@/lib/kinetic-speech/kinds/duration';

/** Major punches should land on kick (heartbeat) beats, not arbitrary grid slots. */
function wantsKickSnap(beat: KineticBeat): boolean {
  if (beat.kind === 'flood') {
    return true;
  }
  if (beat.kind === 'line' && (beat.role === 'slam-xl' || beat.role === 'brand')) {
    return true;
  }
  if (
    beat.kind === 'line' &&
    (beat.id === 'a6-change' || beat.id === 'a6-action' || beat.id === 'a6-india')
  ) {
    return true;
  }
  return false;
}

/** Advance bi to the next kick beat (or downbeat fallback). */
function snapToKickBeat(bi: number): number {
  const i = Math.ceil(bi - 1e-9);
  // Already on a kick — keep it
  if (isKickBeat(i) || (i === bi && isKickBeat(Math.floor(bi)))) {
    if (isKickBeat(Math.round(bi))) {
      return Math.round(bi);
    }
  }
  for (let n = 0; n < 16; n += 1) {
    if (isKickBeat(i + n)) {
      return i + n;
    }
  }
  // Fallback: next downbeat
  for (let n = 0; n < 8; n += 1) {
    if (isDownbeat(i + n)) {
      return i + n;
    }
  }
  return i;
}

/**
 * Lay out the entire film on the beat grid.
 * Starts at beat 3 — first solid kick of the groove (audio already playing).
 * Floods / slam-xl / brand snap forward to the next kick beat.
 */
export function layoutKineticSpeech(startBeat = 3): {
  items: LaidOutBeat[];
  endBeat: number;
} {
  let bi = startBeat;
  const items: LaidOutBeat[] = [];
  for (const beat of getAllKineticBeats()) {
    if (wantsKickSnap(beat)) {
      bi = snapToKickBeat(bi);
    }
    const dur = beatDurationBeats(beat);
    items.push({ beat, startBeat: bi, endBeat: bi + dur });
    bi += dur;
  }
  return { items, endBeat: bi };
}
