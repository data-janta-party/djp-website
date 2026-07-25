/**
 * Scrub a paused GSAP timeline to the audio master clock (never free-run).
 */

import type gsap from 'gsap';

import type { FilmPhase } from '@/hooks/kinetic-film/types';

export type ScrubVisualToAudioArgs = {
  audio: HTMLAudioElement | null;
  timeline: gsap.core.Timeline | null;
  phase: FilmPhase;
  onTime?: (timeSec: number) => void;
};

/**
 * Drive visual playhead from `audio.currentTime` while phase is playing and audio is playing.
 * Returns false when scrub is skipped (paused / no media / wrong phase).
 */
export function scrubVisualToAudio({
  audio,
  timeline,
  phase,
  onTime,
}: ScrubVisualToAudioArgs): boolean {
  if (!audio || !timeline || phase !== 'playing') {
    return false;
  }
  // Frozen until soundtrack is unlocked / actually playing.
  if (audio.paused || audio.ended) {
    return false;
  }
  // Keep timeline paused; only drive playhead from media time.
  if (typeof timeline.paused === 'function' && !timeline.paused()) {
    timeline.pause();
  }
  const t = audio.currentTime;
  // seek() renders the full state at t more reliably than time() alone for paused TLs.
  if (typeof timeline.seek === 'function') {
    timeline.seek(t);
  } else {
    timeline.time(t);
  }
  if (typeof timeline.pause === 'function') {
    timeline.pause();
  }
  onTime?.(t);
  return true;
}
