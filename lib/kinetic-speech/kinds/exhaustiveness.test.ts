import { describe, expect, it } from 'vitest';

import { BEAT_NODE_KINDS } from '@/components/ui/compositions/civic-pulse/KineticSpeechBeatNodes';
import { durationHandlers } from '@/lib/kinetic-speech/kinds/duration';
import { transcriptHandlers } from '@/lib/kinetic-speech/kinds/transcript';
import { SCHEDULE_KIND_HANDLERS } from '@/lib/kinetic-speech/schedule';
import type { KineticBeat } from '@/lib/kinetic-speech/types';

/**
 * Canonical kind list — when adding a KineticBeat kind, extend this union first
 * then satisfy every registry below (typecheck + this test).
 */
const ALL_KINDS = [
  'line',
  'pair',
  'slide-pair',
  'sticky',
  'sticky-pair',
  'flood',
  'silence',
  'cloud',
  'rapid',
  'quote',
  'project-delays',
  'endcard',
] as const satisfies readonly KineticBeat['kind'][];

function keysOf<T extends string>(record: Record<T, unknown>): T[] {
  return Object.keys(record) as T[];
}

describe('kinetic kind registry exhaustiveness', () => {
  it('duration handlers cover every KineticBeat kind', () => {
    expect(keysOf(durationHandlers).sort()).toEqual([...ALL_KINDS].sort());
  });

  it('transcript handlers cover every KineticBeat kind', () => {
    expect(keysOf(transcriptHandlers).sort()).toEqual([...ALL_KINDS].sort());
  });

  it('schedule handlers cover every KineticBeat kind', () => {
    expect(keysOf(SCHEDULE_KIND_HANDLERS).sort()).toEqual([...ALL_KINDS].sort());
  });

  it('BeatNodes render kinds cover every KineticBeat kind', () => {
    expect([...BEAT_NODE_KINDS].sort()).toEqual([...ALL_KINDS].sort());
  });
});
