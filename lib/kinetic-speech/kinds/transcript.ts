/**
 * Per-kind transcript line handlers (kind registry — data side).
 */

import { kineticSpeechCopy } from '@/lib/kinetic-speech/constants';
import type { KineticBeat } from '@/lib/kinetic-speech/types';
import { stickyPrefixHoldBeats } from '@/lib/kinetic-speech/sticky';

type AnyBeat = KineticBeat;
type Kind = AnyBeat['kind'];
type TranscriptHandler = (beat: AnyBeat) => string[];

export const transcriptHandlers: Record<Kind, TranscriptHandler> = {
  line: (beat) => {
    if (beat.kind !== 'line') return [];
    return [beat.text];
  },
  pair: (beat) => {
    if (beat.kind !== 'pair') return [];
    return [beat.lead, beat.hit];
  },
  'slide-pair': (beat) => {
    if (beat.kind !== 'slide-pair') return [];
    return [beat.left, beat.right];
  },
  sticky: (beat) => {
    if (beat.kind !== 'sticky') return [];
    const hasVisibleSuffix = beat.steps.some((s) => s.suffix.length > 0);
    const lines: string[] = [];
    // Staggered stickies (prefixHold > 0): include solo prefix line first
    if (hasVisibleSuffix && stickyPrefixHoldBeats(beat) > 0) {
      lines.push(beat.prefix);
    }
    for (const s of beat.steps) {
      const base = `${beat.prefix} ${s.suffix}`.trim();
      lines.push((s.dots ?? 0) > 0 ? `${base}...` : base);
    }
    return lines;
  },
  'sticky-pair': (beat) => {
    if (beat.kind !== 'sticky-pair') return [];
    return beat.mode === 'swap-lead'
      ? beat.steps.map((s) => `${s.text} ${beat.fixed}`)
      : beat.steps.map((s) => `${beat.fixed} ${s.text}`);
  },
  flood: (beat) => {
    if (beat.kind !== 'flood') return [];
    return [...beat.words];
  },
  cloud: (beat) => {
    if (beat.kind !== 'cloud') return [];
    return [beat.words.join(' · ')];
  },
  rapid: (beat) => {
    if (beat.kind !== 'rapid') return [];
    return [...beat.words];
  },
  quote: (beat) => {
    if (beat.kind !== 'quote') return [];
    return [beat.text, beat.attribution];
  },
  'project-delays': (beat) => {
    if (beat.kind !== 'project-delays') return [];
    // Project cards only — source labels live on the endcard Sources transcript line
    const lines = beat.projects.map(
      (p) => `${p.project}\nDelayed.\n${p.years}`,
    );
    lines.push(beat.moreLabel);
    return lines;
  },
  endcard: () => {
    const e = kineticSpeechCopy.endcard;
    return [e.url, e.join, e.sources];
  },
  silence: () => [],
};

export function beatToTranscriptLines(beat: KineticBeat): string[] {
  const handler = transcriptHandlers[beat.kind];
  return handler ? handler(beat) : [];
}
