import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { atBeat } from '@/lib/data/kinetic-speech-beatmap';
import { layoutKineticSpeech } from '@/lib/data/kinetic-speech';

import {
  kineticSlideTimeSec,
  parseKineticSlideHash,
  replaceKineticSlideHash,
  slideIndexAtTime,
} from './kinetic-speech-dev-nav';

describe('kinetic-speech-dev-nav', () => {
  const { items } = layoutKineticSpeech();

  it('exposes a non-empty slide chain', () => {
    expect(items.length).toBeGreaterThan(10);
    expect(items[0]?.beat.id).toBe('a1-p1');
    expect(items[items.length - 1]?.beat.id).toBe('a6-endcard');
  });

  describe('parseKineticSlideHash', () => {
    it('parses 1-based numeric hashes', () => {
      expect(parseKineticSlideHash('#1', items)).toBe(1);
      expect(parseKineticSlideHash('1', items)).toBe(1);
      expect(parseKineticSlideHash(`#${items.length}`, items)).toBe(items.length);
      expect(parseKineticSlideHash(String(items.length), items)).toBe(items.length);
    });

    it('rejects out-of-range and empty hashes', () => {
      expect(parseKineticSlideHash('', items)).toBeNull();
      expect(parseKineticSlideHash('#', items)).toBeNull();
      expect(parseKineticSlideHash('#0', items)).toBeNull();
      expect(parseKineticSlideHash('#-1', items)).toBeNull();
      expect(parseKineticSlideHash(`#${items.length + 1}`, items)).toBeNull();
      expect(parseKineticSlideHash('#99', items)).toBeNull();
      expect(parseKineticSlideHash('#1.5', items)).toBeNull();
    });

    it('resolves beat ids', () => {
      expect(parseKineticSlideHash('#a1-p1', items)).toBe(1);
      expect(parseKineticSlideHash('a1-p1', items)).toBe(1);
      expect(parseKineticSlideHash('#a6-endcard', items)).toBe(items.length);
      const mid = items.findIndex((i) => i.beat.id === 'a2-project-delays');
      expect(mid).toBeGreaterThan(0);
      expect(parseKineticSlideHash('#a2-project-delays', items)).toBe(mid + 1);
      expect(parseKineticSlideHash('#a4b-want', items)).toBe(
        items.findIndex((i) => i.beat.id === 'a4b-want') + 1,
      );
    });

    it('rejects unknown beat ids', () => {
      expect(parseKineticSlideHash('#not-a-real-beat', items)).toBeNull();
      expect(parseKineticSlideHash('#a1', items)).toBeNull();
    });

    it('returns null for empty items', () => {
      expect(parseKineticSlideHash('#1', [])).toBeNull();
    });
  });

  describe('kineticSlideTimeSec', () => {
    it('matches atBeat(startBeat)', () => {
      const first = items[0]!;
      expect(kineticSlideTimeSec(first)).toBeCloseTo(atBeat(first.startBeat), 5);
    });
  });

  describe('slideIndexAtTime', () => {
    it('returns 0 for empty list', () => {
      expect(slideIndexAtTime([], 10)).toBe(0);
    });

    it('returns 1 before and at first slide', () => {
      const t0 = kineticSlideTimeSec(items[0]!);
      expect(slideIndexAtTime(items, 0)).toBe(1);
      expect(slideIndexAtTime(items, t0 - 0.5)).toBe(1);
      expect(slideIndexAtTime(items, t0)).toBe(1);
    });

    it('advances at each subsequent start', () => {
      const second = items[1]!;
      const t2 = kineticSlideTimeSec(second);
      expect(slideIndexAtTime(items, t2 - 0.01)).toBe(1);
      expect(slideIndexAtTime(items, t2)).toBe(2);
      expect(slideIndexAtTime(items, t2 + 0.1)).toBe(2);
    });

    it('returns last index near film end', () => {
      const last = items[items.length - 1]!;
      const tLast = kineticSlideTimeSec(last);
      expect(slideIndexAtTime(items, tLast)).toBe(items.length);
      expect(slideIndexAtTime(items, tLast + 30)).toBe(items.length);
    });
  });

  describe('replaceKineticSlideHash', () => {
    const original = window.location.href;

    beforeEach(() => {
      window.history.replaceState(null, '', '/speech');
    });

    afterEach(() => {
      window.history.replaceState(null, '', original);
    });

    it('sets #n via replaceState', () => {
      const spy = vi.spyOn(window.history, 'replaceState');
      replaceKineticSlideHash(12);
      expect(window.location.hash).toBe('#12');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('no-ops when hash already matches', () => {
      window.history.replaceState(null, '', '/speech#7');
      const spy = vi.spyOn(window.history, 'replaceState');
      replaceKineticSlideHash(7);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
