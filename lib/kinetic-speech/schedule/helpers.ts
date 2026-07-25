/**
 * Shared GSAP motion helpers for kinetic schedule kinds.
 */

import { atBeat, kickBeatsInRange } from '@/lib/data/kinetic-speech-beatmap';
import type { ScheduleContext } from '@/lib/kinetic-speech/schedule/context';
import { sel } from '@/lib/kinetic-speech/schedule/context';
import type { MotionVerb } from '@/lib/kinetic-speech/types';

/** Heartbeat: scale thump on each kick beat while a node is held. */
export function scheduleHeartbeat(
  ctx: ScheduleContext,
  nodeSel: string,
  startBeat: number,
  endBeat: number,
) {
  const { tl, q } = ctx;
  for (const bi of kickBeatsInRange(startBeat, endBeat)) {
    // Skip the first beat (already has enter pop)
    if (bi <= startBeat) {
      continue;
    }
    const t = atBeat(bi);
    tl.to(q(nodeSel), { scale: 1.08, duration: 0.05, ease: 'power2.out' }, t);
    tl.to(q(nodeSel), { scale: 1, duration: 0.12, ease: 'power3.out' }, t + 0.05);
  }
}

export function animateLineIn(
  ctx: ScheduleContext,
  id: string,
  motion: MotionVerb,
  inn: number,
  at: number,
  options?: { pulse?: boolean },
) {
  const { tl, q, getLastLineSel } = ctx;
  const s = sel(id);
  switch (motion) {
    case 'hardcut':
      tl.fromTo(
        q(s),
        { autoAlpha: 0, scale: 1.22 },
        { autoAlpha: 1, scale: 1, duration: Math.max(inn, 0.04), ease: 'none' },
        at,
      );
      break;
    case 'pop':
      tl.fromTo(
        q(s),
        { autoAlpha: 0, scale: 1.16 },
        { autoAlpha: 1, scale: 1, duration: inn, ease: 'expo.out' },
        at,
      );
      if (options?.pulse) {
        tl.to(
          q(s),
          { scale: 1.06, duration: 0.05, yoyo: true, repeat: 1, ease: 'power1.inOut' },
          at + inn,
        );
      }
      break;
    case 'replace': {
      const last = getLastLineSel();
      if (last) {
        tl.to(
          q(last),
          { autoAlpha: 0, y: -10, duration: inn * 0.75, ease: 'power3.in' },
          at,
        );
      }
      tl.fromTo(
        q(s),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: inn, ease: 'power4.out' },
        at,
      );
      break;
    }
    case 'slide-l':
      tl.fromTo(
        q(s),
        { autoAlpha: 0, x: -80 },
        { autoAlpha: 1, x: 0, duration: inn, ease: 'expo.out' },
        at,
      );
      break;
    case 'slide-r':
      tl.fromTo(
        q(s),
        { autoAlpha: 0, x: 80 },
        { autoAlpha: 1, x: 0, duration: inn, ease: 'expo.out' },
        at,
      );
      break;
    case 'dim':
      tl.fromTo(
        q(s),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 0.72, y: 0, duration: inn, ease: 'power3.out' },
        at,
      );
      break;
    case 'pulse':
      tl.fromTo(
        q(s),
        { autoAlpha: 0, scale: 1.12 },
        { autoAlpha: 1, scale: 1, duration: inn, ease: 'expo.out' },
        at,
      );
      break;
    case 'rise':
    default:
      tl.fromTo(
        q(s),
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: inn, ease: 'power4.out' },
        at,
      );
      break;
  }
}

export function animateLineOut(
  ctx: ScheduleContext,
  id: string,
  motion: MotionVerb,
  out: number,
  at: number,
) {
  const { tl, q } = ctx;
  const s = sel(id);
  if (motion === 'slide-l') {
    tl.to(q(s), { autoAlpha: 0, x: 72, duration: out, ease: 'power3.in' }, at);
  } else if (motion === 'slide-r') {
    tl.to(q(s), { autoAlpha: 0, x: -72, duration: out, ease: 'power3.in' }, at);
  } else if (motion === 'hardcut' || motion === 'pop') {
    tl.to(q(s), { autoAlpha: 0, duration: out, ease: 'none' }, at);
  } else if (motion === 'replace') {
    tl.to(q(s), { autoAlpha: 0, y: -10, duration: out, ease: 'power3.in' }, at);
  } else {
    tl.to(q(s), { autoAlpha: 0, duration: out, ease: 'power3.in' }, at);
  }
}

export function softClearLastReplace(ctx: ScheduleContext, at: number) {
  const last = ctx.getLastLineSel();
  if (last) {
    ctx.tl.to(ctx.q(last), { autoAlpha: 0, y: -10, duration: 0.08, ease: 'power3.in' }, at);
    ctx.setLastLineSel(null);
  }
}
