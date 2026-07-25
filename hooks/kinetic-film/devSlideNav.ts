/**
 * DEV slide scrub helpers — hash + 1-based slide index (pure + small side effects).
 */

import {
  replaceKineticSlideHash,
  slideIndexAtTime,
} from '@/lib/data/kinetic-speech-dev-nav';
import type { LaidOutBeat } from '@/lib/kinetic-speech';

export function syncDevSlideHashFromTime(args: {
  enabled: boolean;
  slideCount: number;
  slideItems: readonly LaidOutBeat[];
  timeSec: number;
  slideIndexRef: { current: number };
  setSlideIndex: (n: number) => void;
}): void {
  const { enabled, slideCount, slideItems, timeSec, slideIndexRef, setSlideIndex } = args;
  if (!enabled || slideCount === 0) {
    return;
  }
  const next = slideIndexAtTime(slideItems, timeSec);
  if (next > 0 && next !== slideIndexRef.current) {
    slideIndexRef.current = next;
    setSlideIndex(next);
    replaceKineticSlideHash(next);
  }
}
