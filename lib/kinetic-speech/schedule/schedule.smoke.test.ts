import { describe, expect, it, vi } from 'vitest';

import { scheduleKineticSpeechItems } from '@/lib/kinetic-speech/schedule';
import type { StageBg } from '@/lib/kinetic-speech/types';

function makeFakeTimeline() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const api = {
    to: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'to', args });
      return api;
    }),
    fromTo: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'fromTo', args });
      return api;
    }),
    set: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'set', args });
      return api;
    }),
    call: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'call', args });
      return api;
    }),
  };
  return { api, calls };
}

describe('scheduleKineticSpeechItems smoke', () => {
  it('schedules laid-out beats without throwing and registers joinReady call', () => {
    const { api, calls } = makeFakeTimeline();

    // selector is used as q(sel) returning elements — stub to empty list
    const qStub = ((sel: string) => {
      void sel;
      return [] as unknown as HTMLElement[];
    }) as unknown as ReturnType<typeof import('gsap').default.utils.selector>;

    const setStageBg = vi.fn(() => undefined);
    const onJoinReady = vi.fn();

    expect(() => {
      scheduleKineticSpeechItems(
        api as never,
        qStub,
        setStageBg,
        { onJoinReady },
      );
    }).not.toThrow();

    // Line/pair/etc. use fromTo/to/set; endcard uses call for join unlock.
    expect(calls.some((c) => c.method === 'fromTo' || c.method === 'to' || c.method === 'set')).toBe(
      true,
    );
    expect(api.call.mock.calls.length).toBeGreaterThan(0);
    // Invoke joinReady callbacks scheduled via tl.call(fn, ...)
    for (const callArgs of api.call.mock.calls) {
      const fn = callArgs[0];
      if (typeof fn === 'function') {
        fn();
      }
    }
    expect(onJoinReady).toHaveBeenCalled();
    // endcard sets charcoal stage bg
    expect(setStageBg).toHaveBeenCalled();
  });
});
