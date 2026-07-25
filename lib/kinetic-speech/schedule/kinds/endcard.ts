/**
 * Schedule handler: finale endcard (roller settle + Join unlock + heartbeat tail).
 */

import gsap from 'gsap';

import { atBeat } from '@/lib/data/kinetic-speech-beatmap';
import {
  kineticSpeechEndcardHoldSec,
  kineticSpeechReelCellEm,
  kineticSpeechRollerDomainLockGapBeats,
  kineticSpeechRollerSpinDepth,
  kineticSpeechRollerVirtueHoldBeats,
  kineticSpeechRollerVirtueIndiaBeats,
} from '@/lib/kinetic-speech/constants';
import { getKineticSpeechAudioEndBeat } from '@/lib/kinetic-speech/film-duration';
import type { ScheduleKindHandler } from '@/lib/kinetic-speech/schedule/context';
import {
  scheduleHeartbeat,
  softClearLastReplace,
} from '@/lib/kinetic-speech/schedule/helpers';

export const scheduleEndcard: ScheduleKindHandler = (ctx, item, _next, startT, _endT) => {
  const beat = item.beat;
  if (beat.kind !== 'endcard') return;
  const { tl, q } = ctx;
  softClearLastReplace(ctx, startT);
  ctx.setStageBg('charcoal', startT);
  tl.fromTo(
  q('#kinetic-endcard'),
  { autoAlpha: 0, scale: 1.04 },
  { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power4.out' },
  startT,
  );
  // Join hidden until reels settle; music may continue past that.
  tl.set(q('#kinetic-fin-join'), { autoAlpha: 0, y: 12 }, startT);

  // All three slots visible from frame 0 — step adjectives, then lock data · janta · party
  const cellEm = kineticSpeechReelCellEm;
  const spinDepth = kineticSpeechRollerSpinDepth;
  const virtueHoldBeats = kineticSpeechRollerVirtueHoldBeats;
  const virtueIndiaBeats = kineticSpeechRollerVirtueIndiaBeats;
  const domainLockGap = kineticSpeechRollerDomainLockGapBeats;
  const phase1EndBeat = item.startBeat + virtueIndiaBeats;

  const domainStrips = gsap.utils.toArray<HTMLElement>(
  q('[data-k-reel-strip][data-k-domain-reel]'),
  );
  // Phase 1: each of 3 reels steps through adjectives on the beat (offset per reel)
  domainStrips.forEach((strip, i) => {
  const steps = Number(strip.dataset.kReelSteps ?? String(spinDepth));
  tl.set(strip, { y: 0 }, startT);
  for (let s = 1; s <= spinDepth; s += 1) {
    // Stagger reel steps by half a hold so they don't all land on the same word
    const stepBeat = item.startBeat + s * virtueHoldBeats + (i % 2);
    const cell = Math.min(s, steps - 1);
    tl.to(
      strip,
      {
        y: `-${cell * cellEm}em`,
        duration: 0.1,
        ease: 'power2.out',
      },
      atBeat(Math.min(stepBeat, phase1EndBeat)),
    );
  }
  });

  // Phase 2: lock data → janta → party one by one (still same three reels)
  domainStrips.forEach((strip, i) => {
  const steps = Number(strip.dataset.kReelSteps ?? String(spinDepth));
  const finalY = `-${steps * cellEm}em`;
  const lockBeat = phase1EndBeat + (i + 1) * domainLockGap;
  const lockT = atBeat(lockBeat);
  tl.to(strip, { y: finalY, duration: 0.12, ease: 'power2.out' }, lockT);
  tl.fromTo(
    q(`[data-k-domain-slot="${i}"]`),
    { scale: 1 },
    { scale: 1.05, duration: 0.05, yoyo: true, repeat: 1, ease: 'power2.out' },
    lockT,
  );
  });

  // Unlock CTAs when the endcard appears (Sources/URL). Join stays autoAlpha 0
  // until settle — GSAP visibility:hidden keeps it non-clickable until then.
  // Transport also time-syncs unlock from the audio clock (seek suppresses call events).
  tl.call(() => { ctx.onJoinReady?.(); }, undefined, startT);

  // After last reel locks + one hold gap: reveal Join (already interactive)
  const settleBeat = phase1EndBeat + domainStrips.length * domainLockGap + 1;
  const settleT = atBeat(settleBeat);
  tl.to(
  q('#kinetic-fin-join'),
  { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power4.out' },
  settleT,
  );

  // Heartbeat on roller from endcard start through kick map up to audio-end bound.
  // Uses analyzed kicks only (no residual pulse after last kick ~4s before 142s).
  // Timeline still spans getKineticSpeechFilmDurationSec ≈ audio end.
  const audioEndBeat = getKineticSpeechAudioEndBeat();
  scheduleHeartbeat(ctx, '#kinetic-roller', item.startBeat, audioEndBeat);
  // Visual hold only — timeline length is extended to audio end below
  tl.to({}, { duration: kineticSpeechEndcardHoldSec }, startT + 0.28);

}
