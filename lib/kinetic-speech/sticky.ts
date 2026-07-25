/**
 * Sticky beat prefix-hold defaults (shared by duration, transcript, schedule).
 */

import type { KineticBeat } from '@/lib/kinetic-speech/types';

/**
 * Solo-prefix beats before the first sticky suffix (see `prefixHold` on sticky).
 */
export function stickyPrefixHoldBeats(
  beat: Extract<KineticBeat, { kind: 'sticky' }>,
): number {
  if (beat.prefixHold != null) return beat.prefixHold;
  const hasVisibleSuffix = beat.steps.some((s) => s.suffix.length > 0);
  // Visible suffix: co-plant (0). Empty-suffix + dots: plant prefix 1 beat first.
  return hasVisibleSuffix ? 0 : 1;
}
