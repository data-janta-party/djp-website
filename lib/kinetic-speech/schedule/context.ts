/**
 * Shared schedule context for kinetic GSAP kind handlers.
 * Handlers take `ctx` instead of closing over tl/q/lastLineSel.
 */

import type gsap from 'gsap';

import type { StageBg } from '@/lib/kinetic-speech/types';

export type GsapQ = ReturnType<typeof gsap.utils.selector>;

export type ScheduleContext = {
  tl: gsap.core.Timeline;
  q: GsapQ;
  getLastLineSel: () => string | null;
  setLastLineSel: (sel: string | null) => void;
  setStageBg: (bg: StageBg, at?: number) => void;
  onJoinReady?: () => void;
};

export type ScheduleKindHandler = (
  ctx: ScheduleContext,
  item: import('@/lib/kinetic-speech/types').LaidOutBeat,
  next: import('@/lib/kinetic-speech/types').LaidOutBeat | undefined,
  startT: number,
  endT: number,
) => void;

export const sel = (id: string) => `#${id}`;
