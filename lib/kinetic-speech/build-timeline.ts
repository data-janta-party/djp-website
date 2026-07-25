/**
 * GSAP timeline builder for the kinetic speech film.
 * Pure-ish: given a stage element + callbacks, returns a paused timeline scrubbed by audio.
 */

import gsap from 'gsap';

import { getKineticSpeechFilmDurationSec } from '@/lib/kinetic-speech/film-duration';
import { scheduleKineticSpeechItems } from '@/lib/kinetic-speech/schedule';
import type { StageBg } from '@/lib/kinetic-speech/types';

const BG = {
  /** Pure black stage — not charcoal grey. */
  charcoal: '#000000',
} as const;

export type BuildKineticSpeechTimelineOptions = {
  /** Timeline scrub reached film end (visual complete). */
  onTimelineComplete?: () => void;
  /** Join CTA becomes interactive after roller settles. */
  onJoinReady?: () => void;
};

/**
 * Build the full paused GSAP timeline for the kinetic stage.
 * Playback is audio-driven via scrub — never call tl.play().
 */
export function buildKineticSpeechTimeline(
  stage: HTMLElement,
  options?: BuildKineticSpeechTimelineOptions,
): gsap.core.Timeline {
  const q = gsap.utils.selector(stage);

  // Always paused: playback is audio-driven via scrub loop (never tl.play()).
  const tl = gsap.timeline({
    paused: true,
    // Don’t Blink: snappy deceleration into rest (avoid soft power2 defaults)
    defaults: { ease: 'power4.out' },
    onComplete: () => {
      // Scrub reached film end — transport owns phase/audio finish.
      options?.onTimelineComplete?.();
    },
  });

  /** Keep background color + data-k-bg attribute in lockstep. */
  const setStageBg = (bg: StageBg, at?: number) => {
    const vars = { backgroundColor: BG[bg] };
    const attrVars = { attr: { 'data-k-bg': bg } };
    if (at === undefined) {
      gsap.set(q('#kinetic-bg'), vars);
      gsap.set(stage, attrVars);
    } else {
      tl.set(q('#kinetic-bg'), vars, at);
      tl.set(stage, attrVars, at);
    }
  };

  // Initial state: hide everything animated; full transform/filter reset for replay safety
  setStageBg('charcoal');
  gsap.set(q('#kinetic-bg'), { backgroundColor: BG.charcoal, filter: 'none' });
  // Primary type: bottom-center origin so scale pops grow up from the shared rail
  gsap.set(q('[data-k-node]'), {
    autoAlpha: 0,
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    filter: 'none',
    transformOrigin: '50% 100%',
  });
  // Sticky roots may shake (cough x yoyo) — clear mid-play kill residue on rebuild
  gsap.set(q('[data-k-sticky]'), { autoAlpha: 0, x: 0, transformOrigin: '50% 100%' });
  gsap.set(q('[data-k-sticky-pair]'), { autoAlpha: 0, transformOrigin: '50% 100%' });
  // Drop AQI ramp inline colors so rebuild/replay stays monochrome
  gsap.set(q('[data-k-sticky-pair] [data-k-node]'), { clearProps: 'color' });
  // Morph suffixes stay absolute (longest sizer owns width); baseline-lock via bottom
  gsap.set(q('[data-k-sticky-suffix]'), {
    position: 'absolute',
    left: 0,
    bottom: 0,
    top: 'auto',
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    transformOrigin: 'left bottom',
  });
  gsap.set(q('[data-k-dot]'), { autoAlpha: 0, y: 0 });
  gsap.set(q('[data-k-flood-tile]'), { autoAlpha: 0, scale: 0.9, x: 0, y: 0 });
  gsap.set(q('[data-k-cloud-word]'), { autoAlpha: 0, scale: 1, x: 0, y: 0 });
  gsap.set(q('[data-k-rapid-word]'), {
    autoAlpha: 0,
    scale: 1,
    y: 0,
    transformOrigin: '50% 100%',
  });
  gsap.set(q('[data-k-project-delays]'), { autoAlpha: 0 });
  gsap.set(q('[data-k-delay-card]'), {
    autoAlpha: 0,
    scale: 1,
    y: 0,
    transformOrigin: '50% 100%',
  });
  gsap.set(q('[data-k-delay-more]'), {
    autoAlpha: 0,
    scale: 1,
    y: 0,
    transformOrigin: '50% 100%',
  });
  gsap.set(q('#kinetic-endcard'), { autoAlpha: 0, scale: 1 });
  gsap.set(q('#kinetic-roller'), { autoAlpha: 1, scale: 1 });
  gsap.set(q('[data-k-reel]'), { scale: 1 });
  gsap.set(q('[data-k-reel-strip]'), { y: 0 });
  gsap.set(q('#kinetic-fin-join'), { autoAlpha: 0, y: 12 });
  gsap.set(q('[data-k-flood]'), { autoAlpha: 0, scale: 1 });
  gsap.set(q('[data-k-cloud]'), { autoAlpha: 0 });
  gsap.set(q('[data-k-rapid]'), { autoAlpha: 0 });
  gsap.set(q('[data-k-quote]'), {
    autoAlpha: 0,
    y: 0,
    scale: 1,
    transformOrigin: '50% 100%',
  });

  scheduleKineticSpeechItems(tl, q, setStageBg, {
    onJoinReady: options?.onJoinReady,
  });

  // Span to max(visual end, audio duration) so onComplete waits for music.
  const filmEndSec = getKineticSpeechFilmDurationSec();
  tl.to({}, { duration: 0.01 }, filmEndSec);

  return tl;
}
