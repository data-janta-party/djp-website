/**
 * Duration helpers for story / visual / film / audio-end beat.
 */

import {
  atBeat,
  KINETIC_BEAT,
  KINETIC_OFFSET_SEC,
} from '@/lib/data/kinetic-speech-beatmap';
import {
  kineticSpeechAudioDurationSec,
  kineticSpeechEndcardHoldSec,
  kineticSpeechVisualTailSec,
} from '@/lib/kinetic-speech/constants';
import { layoutKineticSpeech } from '@/lib/kinetic-speech/layout';

/** Story duration to endcard start (seconds), from beat layout. */
export function getKineticSpeechStoryDurationSec(): number {
  const { items, endBeat } = layoutKineticSpeech();
  const end = items.find((i) => i.beat.kind === 'endcard');
  if (end) {
    return atBeat(end.startBeat);
  }
  return atBeat(endBeat);
}

/**
 * Seconds when the visual story + endcard (roller settle + tail) is complete.
 * Audio may continue past this until `kineticSpeechAudioDurationSec`.
 */
export function getKineticSpeechVisualEndSec(): number {
  return (
    getKineticSpeechStoryDurationSec() +
    kineticSpeechEndcardHoldSec +
    kineticSpeechVisualTailSec
  );
}

/**
 * Full film duration: visual end, then hold until natural track end.
 * Timeline `onComplete` fires with the music (never cuts audio mid-track).
 */
export function getKineticSpeechFilmDurationSec(): number {
  return Math.max(getKineticSpeechVisualEndSec(), kineticSpeechAudioDurationSec);
}

/**
 * Grid beat index at (or just past) natural audio end — exclusive upper bound
 * for kick-range helpers so endcard heartbeat can thump through the music tail.
 *
 * Heartbeat follows the analyzed kick map only: if the beatmap has no kicks in
 * the final ~few seconds before audio end, the roller does not invent residual
 * pulses there (film/timeline still runs to `kineticSpeechAudioDurationSec`).
 */
export function getKineticSpeechAudioEndBeat(): number {
  return (kineticSpeechAudioDurationSec - KINETIC_OFFSET_SEC) / KINETIC_BEAT;
}
