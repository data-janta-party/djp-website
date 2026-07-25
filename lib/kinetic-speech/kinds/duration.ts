/**
 * Per-kind beat duration handlers (kind registry — data side).
 */

import type { KineticBeat } from '@/lib/kinetic-speech/types';
import { stickyPrefixHoldBeats } from '@/lib/kinetic-speech/sticky';

type AnyBeat = KineticBeat;
type Kind = AnyBeat['kind'];

type DurationHandler = (beat: AnyBeat) => number;

export const durationHandlers: Record<Kind, DurationHandler> = {
  line: (beat) => {
    if (beat.kind !== 'line') return 0;
    return beat.hold;
  },
  pair: (beat) => {
    if (beat.kind !== 'pair') return 0;
    return beat.holdLead + beat.holdHit;
  },
  'slide-pair': (beat) => {
    if (beat.kind !== 'slide-pair') return 0;
    return beat.hold;
  },
  sticky: (beat) => {
    if (beat.kind !== 'sticky') return 0;
    let n = stickyPrefixHoldBeats(beat);
    for (const step of beat.steps) {
      n += step.hold + (step.dots ?? 0);
    }
    n += beat.exitHold ?? 0;
    return n;
  },
  'sticky-pair': (beat) => {
    if (beat.kind !== 'sticky-pair') return 0;
    let n = 1; // plant fixed
    for (const step of beat.steps) {
      n += step.hold;
    }
    return n;
  },
  flood: (beat) => {
    if (beat.kind !== 'flood') return 0;
    return beat.duration;
  },
  silence: (beat) => {
    if (beat.kind !== 'silence') return 0;
    return beat.duration;
  },
  cloud: (beat) => {
    if (beat.kind !== 'cloud') return 0;
    return beat.duration;
  },
  rapid: (beat) => {
    if (beat.kind !== 'rapid') return 0;
    return beat.words.length * (beat.holdEach ?? 1);
  },
  quote: (beat) => {
    if (beat.kind !== 'quote') return 0;
    return beat.hold;
  },
  'project-delays': (beat) => {
    if (beat.kind !== 'project-delays') return 0;
    const holdEach = beat.holdEach ?? 3;
    return beat.projects.length * holdEach + beat.moreHold;
  },
  endcard: () => 0,
};

/**
 * Beat cost of one director event (integer/half beats).
 */
export function beatDurationBeats(beat: KineticBeat): number {
  const handler = durationHandlers[beat.kind];
  return handler ? handler(beat) : 0;
}
