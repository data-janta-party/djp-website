/**
 * Schedule handler: sticky beats (Deadline morph, Still waiting, cough, Demand).
 */

import {
  atBeat,
  isKickBeat,
  wholeBeatsInRange,
} from '@/lib/data/kinetic-speech-beatmap';
import { stickyPrefixHoldBeats } from '@/lib/kinetic-speech/sticky';
import {
  IN_SNAP,
  OUT_SNAP,
} from '@/lib/kinetic-speech/motion';
import type { ScheduleKindHandler } from '@/lib/kinetic-speech/schedule/context';
import { sel } from '@/lib/kinetic-speech/schedule/context';
import {
  scheduleHeartbeat,
  softClearLastReplace,
} from '@/lib/kinetic-speech/schedule/helpers';

export const scheduleSticky: ScheduleKindHandler = (ctx, item, _next, startT, _endT) => {
  const beat = item.beat;
  if (beat.kind !== 'sticky') return;
  const { tl, q } = ctx;
  softClearLastReplace(ctx, startT);
  const root = sel(beat.id);
  const prefixId = `${beat.id}-prefix`;
  const dotsRoot = `${beat.id}-dots`;
  // Text morph (Deadline) OR empty-suffix + dots (Still waiting) use step-local ellipsis
  // inside the suffix slot — same body-size "..." as Deadline extended...
  const hasVisibleSuffix =
  beat.steps.some((s) => s.suffix.length > 0) ||
  beat.steps.some((s) => (s.dots ?? 0) > 0);
  // All morph stickies: opacity stack + longest sizer (no relative/absolute width dance).
  // Wide Demand keeps a punchier scale; cough keeps heave/shake intentionally.
  const wideStack = Boolean(beat.wide);
  const isCough = Boolean(beat.cough);

  /**
   * Cough jolt: body heave (y up) + scale punch + micro-rotate, then settle.
   * Second hit is stronger; optional root shake sells the double-cough spasm.
   */
  const scheduleCoughJolt = (
  nodeSel: string,
  at: number,
  intensity: number,
  options?: { shakeRoot?: boolean },
  ) => {
  const yUp = -16 * intensity;
  const scalePeak = 1 + 0.2 * intensity;
  const rot = -3 * intensity;
  tl.fromTo(
    q(nodeSel),
    {
      autoAlpha: 0,
      y: 10 * intensity,
      scale: 0.88,
      rotation: rot * 0.4,
    },
    {
      autoAlpha: 1,
      y: yUp,
      scale: scalePeak,
      rotation: rot,
      duration: 0.055,
      ease: 'power4.out',
    },
    at,
  );
  // Settle through a second micro-heave (double-cough rattle)
  tl.to(
    q(nodeSel),
    {
      y: yUp * 0.35,
      scale: 1 + 0.06 * intensity,
      rotation: rot * -0.35,
      duration: 0.05,
      ease: 'power2.in',
    },
    at + 0.055,
  );
  tl.to(
    q(nodeSel),
    {
      y: 0,
      scale: 1,
      rotation: 0,
      duration: 0.1,
      ease: 'power3.out',
    },
    at + 0.105,
  );
  if (options?.shakeRoot) {
    tl.fromTo(
      q(root),
      { x: 0 },
      {
        x: 5 * intensity,
        duration: 0.03,
        yoyo: true,
        repeat: 5,
        ease: 'power1.inOut',
      },
      at,
    );
    tl.set(q(root), { x: 0 }, at + 0.2);
  }
  };

  // Beat 0: plant prefix. Default co-plants first visible suffix (Deadline / We want).
  // `prefixHold` delays the first suffix (Cough → Cough Cough); empty-suffix defaults to 1.
  let bi = item.startBeat;
  const prefixHold = stickyPrefixHoldBeats(beat);
  tl.set(q(root), { autoAlpha: 1 }, atBeat(bi));
  // Cough: first bark. Wide Demand: firmer plant. Else soft sticky plant.
  if (isCough) {
  scheduleCoughJolt(sel(prefixId), atBeat(bi), 1, { shakeRoot: true });
  } else if (wideStack) {
  tl.fromTo(
    q(sel(prefixId)),
    { autoAlpha: 0, y: 12, scale: 1.06 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.05, ease: 'expo.out' },
    atBeat(bi),
  );
  } else {
  tl.fromTo(
    q(sel(prefixId)),
    { autoAlpha: 0, y: 10 },
    { autoAlpha: 1, y: 0, duration: IN_SNAP, ease: 'power4.out' },
    atBeat(bi),
  );
}
bi += prefixHold;

beat.steps.forEach((step, i) => {
  const sufId = `${beat.id}-s${i}`;
  const stepT = atBeat(bi);
  if (i > 0) {
    const prevId = `${beat.id}-s${i - 1}`;
    // Opacity + light scale only (no y); origin left-bottom keeps painted baseline stable
    if (wideStack) {
      tl.to(
        q(sel(prevId)),
        {
          autoAlpha: 0,
          scale: 0.94,
          transformOrigin: 'left bottom',
          duration: 0.04,
          ease: 'power3.in',
        },
        stepT,
      );
      tl.set(q(sel(prevId)), { scale: 1 }, stepT + 0.04);
    } else {
      tl.to(
        q(sel(prevId)),
        {
          autoAlpha: 0,
          scale: 0.96,
          transformOrigin: 'left bottom',
          duration: OUT_SNAP,
          ease: 'power3.in',
        },
        stepT,
      );
      tl.set(q(sel(prevId)), { scale: 1 }, stepT + OUT_SNAP);
    }
  }
  // Cough second bark (stronger + root shake). Else opacity + scale morph (no y drift).
  if (isCough) {
    scheduleCoughJolt(sel(sufId), stepT, 1.25, { shakeRoot: true });
    // First cough re-spasm when the second hits — double-cough feel
    tl.to(
      q(sel(prefixId)),
      {
        y: -10,
        scale: 1.08,
        rotation: -2,
        duration: 0.045,
        ease: 'power3.out',
      },
      stepT,
    );
    tl.to(
      q(sel(prefixId)),
      {
        y: 0,
        scale: 1,
        rotation: 0,
        duration: 0.12,
        ease: 'power3.out',
      },
      stepT + 0.045,
    );
  } else if (wideStack) {
    tl.fromTo(
      q(sel(sufId)),
      { autoAlpha: 0, scale: 1.12, transformOrigin: 'left bottom' },
      {
        autoAlpha: 1,
        scale: 1,
        duration: 0.055,
        ease: 'expo.out',
      },
      stepT,
    );
  } else {
    tl.fromTo(
      q(sel(sufId)),
      { autoAlpha: 0, scale: 1.06, transformOrigin: 'left bottom' },
      {
        autoAlpha: 1,
        scale: 1,
        duration: IN_SNAP,
        ease: 'expo.out',
      },
      stepT,
    );
  }
  bi += step.hold;

  // Loading dots trail the active suffix (Deadline morph + Still waiting).
  // Step-local inside the suffix slot so "..." matches body type size.
  // Every whole beat hops a dot; kicks hop harder so the ellipsis reads
  // as percussion, not a free-running loader.
  if (step.dots && step.dots > 0) {
    const dotsScope = hasVisibleSuffix
      ? `${sel(sufId)} [data-k-dot]`
      : `${sel(dotsRoot)} [data-k-dot]`;
    const dots = q(dotsScope);
    const dotsStart = bi;
    const dotsEnd = bi + step.dots;
    tl.set(dots, { autoAlpha: 0, y: 0 }, atBeat(dotsStart));
    let beatIdx = 0;
    for (const dBeat of wholeBeatsInRange(dotsStart, dotsEnd)) {
      const dt = atBeat(dBeat);
      const which = beatIdx % 3;
      const onKick = isKickBeat(dBeat);
      const hopY = onKick ? -12 : -7;
      // Progressive reveal for the first three beats, then cycle jumps
      if (beatIdx < 3) {
        for (let d = 0; d <= which; d += 1) {
          tl.set(
            q(`${dotsScope}:nth-child(${d + 1})`),
            { autoAlpha: 1 },
            dt,
          );
        }
      } else {
        tl.set(dots, { autoAlpha: 1, y: 0 }, dt);
      }
      tl.fromTo(
        q(`${dotsScope}:nth-child(${which + 1})`),
        { y: 0, scale: 1 },
        {
          y: hopY,
          scale: onKick ? 1.35 : 1.12,
          duration: onKick ? 0.07 : 0.08,
          ease: 'power2.out',
        },
        dt,
      );
      tl.to(
        q(`${dotsScope}:nth-child(${which + 1})`),
        {
          y: 0,
          scale: 1,
          duration: onKick ? 0.11 : 0.12,
          ease: 'power2.in',
        },
        dt + (onKick ? 0.07 : 0.08),
      );
      beatIdx += 1;
    }
    tl.to(dots, { autoAlpha: 0, y: 0, scale: 1, duration: 0.08 }, atBeat(dotsEnd));
    bi = dotsEnd;
  }
});

// Deadline / Still waiting: whole phrase thumps on kicks (dots hop separately)
if (beat.heartbeat) {
  scheduleHeartbeat(ctx, root, item.startBeat, item.endBeat);
}

bi += beat.exitHold ?? 0;
const outT = atBeat(Math.min(bi, item.endBeat));
tl.to(q(root), { autoAlpha: 0, duration: OUT_SNAP, ease: 'power3.in' }, outT);
tl.set(
  q(`${root} [data-k-node]`),
  { autoAlpha: 0, y: 0, scale: 1, x: 0, rotation: 0 },
  outT + OUT_SNAP,
);
tl.set(q(root), { x: 0 }, outT + OUT_SNAP);
// Reset morph suffixes to absolute baseline-locked stack for the next play-through
if (hasVisibleSuffix) {
  tl.set(
    q(`${root} [data-k-sticky-suffix]`),
    {
      position: 'absolute',
      left: 0,
      bottom: 0,
      top: 'auto',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      transformOrigin: 'left bottom',
    },
    outT + OUT_SNAP,
  );
}
// Reset both shared post-prefix dots and step-local trailing dots
tl.set(q(`${root} [data-k-dot]`), { autoAlpha: 0, y: 0 }, outT + OUT_SNAP);

}
