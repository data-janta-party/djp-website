/**
 * Kinetic speech motion verbs — visual in/out durations (not beat clock).
 */

import type { MotionVerb, TypeRole } from '@/lib/kinetic-speech/types';

/** Visual-only in/out — never advances the beat clock. */
export const IN_SNAP = 0.06;
export const OUT_SNAP = 0.05;

export function roleClass(role: TypeRole): string {
  switch (role) {
    case 'whisper':
      return 'kinetic-type-whisper';
    case 'body':
      return 'kinetic-type-body';
    case 'slam':
      return 'kinetic-type-slam';
    case 'slam-xl':
      return 'kinetic-type-slam-xl';
    case 'brand':
      return 'kinetic-type-brand';
    case 'micro-grid':
      return 'kinetic-type-micro-grid';
    case 'close':
      return 'kinetic-type-close';
    default:
      return 'kinetic-type-body';
  }
}

export function defaultIn(motion: MotionVerb): number {
  switch (motion) {
    case 'hardcut':
      return 0.04;
    case 'pop':
    case 'pulse':
      return IN_SNAP;
    case 'replace':
      return 0.1;
    case 'slide-l':
    case 'slide-r':
      return 0.12;
    case 'dim':
      return 0.14;
    case 'rise':
    default:
      return 0.12;
  }
}

export function defaultOut(motion: MotionVerb): number {
  switch (motion) {
    case 'hardcut':
    case 'pop':
      return OUT_SNAP;
    case 'replace':
      return 0.08;
    default:
      return OUT_SNAP;
  }
}
