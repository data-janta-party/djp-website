/**
 * Plain-text transcript for a11y / reduced motion.
 */

import { getKineticSpeechActs } from '@/lib/kinetic-speech/acts';
import { beatToTranscriptLines } from '@/lib/kinetic-speech/kinds/transcript';

export function getKineticSpeechTranscript(): string {
  const lines: string[] = [];
  for (const act of getKineticSpeechActs()) {
    for (const beat of act.beats) {
      lines.push(...beatToTranscriptLines(beat));
    }
  }
  return lines.join('\n');
}
