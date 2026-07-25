import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  panelFreeScrollRange,
  resolveSpringTarget,
  resolveTallPanelSpring,
  SPRING_DISTANCE_RATIO,
  SPRING_VELOCITY_THRESHOLD,
  TALL_PANEL_MIN_RANGE,
  useStorySnapWheel,
} from './useStorySnapWheel';

describe('resolveSpringTarget', () => {
  const base = {
    fromIndex: 1,
    panelCount: 4,
    viewportHeight: 800,
    velocityPxPerMs: 0,
  };

  it('springs back when distance and velocity are below threshold', () => {
    const delta = 800 * SPRING_DISTANCE_RATIO * 0.5; // 12.5% of vh
    expect(
      resolveSpringTarget({
        ...base,
        deltaFromPanelTop: delta,
      }),
    ).toBe(1);
    expect(
      resolveSpringTarget({
        ...base,
        deltaFromPanelTop: -delta,
      }),
    ).toBe(1);
  });

  it('commits to next when distance exceeds threshold', () => {
    const delta = 800 * SPRING_DISTANCE_RATIO + 1;
    expect(
      resolveSpringTarget({
        ...base,
        deltaFromPanelTop: delta,
      }),
    ).toBe(2);
  });

  it('commits to previous when distance exceeds threshold upward', () => {
    const delta = -(800 * SPRING_DISTANCE_RATIO + 1);
    expect(
      resolveSpringTarget({
        ...base,
        deltaFromPanelTop: delta,
      }),
    ).toBe(0);
  });

  it('commits on strong velocity even with small residual distance', () => {
    expect(
      resolveSpringTarget({
        ...base,
        deltaFromPanelTop: 20,
        velocityPxPerMs: SPRING_VELOCITY_THRESHOLD + 0.1,
      }),
    ).toBe(2);
    expect(
      resolveSpringTarget({
        ...base,
        deltaFromPanelTop: -20,
        velocityPxPerMs: -(SPRING_VELOCITY_THRESHOLD + 0.1),
      }),
    ).toBe(0);
  });

  it('does not advance past last panel; allows free-scroll past last', () => {
    expect(
      resolveSpringTarget({
        ...base,
        fromIndex: 3,
        deltaFromPanelTop: 800 * SPRING_DISTANCE_RATIO + 10,
      }),
    ).toBe(3);

    // Deep into footer zone — stay on last index (caller leaves free scroll).
    expect(
      resolveSpringTarget({
        ...base,
        fromIndex: 3,
        deltaFromPanelTop: 200,
        allowFreeScrollPastLast: true,
      }),
    ).toBe(3);
  });

  it('does not go before first panel', () => {
    expect(
      resolveSpringTarget({
        ...base,
        fromIndex: 0,
        deltaFromPanelTop: -(800 * SPRING_DISTANCE_RATIO + 10),
      }),
    ).toBe(0);
  });
});

describe('panelFreeScrollRange', () => {
  it('marks short panels (≈ viewport) as not tall', () => {
    const panel = document.createElement('div');
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 800,
      left: 0,
      right: 0,
      width: 0,
      height: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(panel, 'offsetHeight', { value: 800, configurable: true });

    const range = panelFreeScrollRange(panel, 800, 0);
    expect(range.minY).toBe(0);
    expect(range.maxY).toBe(0);
    expect(range.isTall).toBe(false);
  });

  it('gives tall panels a free range including end-slack runway', () => {
    const panel = document.createElement('div');
    // 1600px panel in 800vh → 800px free travel
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 1700,
      left: 0,
      right: 0,
      width: 0,
      height: 1600,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    Object.defineProperty(panel, 'offsetHeight', { value: 1600, configurable: true });

    const range = panelFreeScrollRange(panel, 800, 200);
    expect(range.minY).toBe(300); // 100 + 200
    expect(range.maxY).toBe(1100); // 300 + 1600 - 800
    expect(range.isTall).toBe(true);
    expect(range.maxY - range.minY).toBeGreaterThan(TALL_PANEL_MIN_RANGE);
  });
});

describe('resolveTallPanelSpring', () => {
  const base = {
    fromIndex: 2,
    panelCount: 4,
    minY: 1000,
    maxY: 1800,
    viewportHeight: 800,
    velocityPxPerMs: 0,
  };

  it('leaves scroll alone mid free range (readable cards)', () => {
    expect(
      resolveTallPanelSpring({
        ...base,
        scrollY: 1400,
      }),
    ).toEqual({ kind: 'leave' });
  });

  it('does not jump next on modest drag still inside free range', () => {
    // Mid-range must stay leave even with 200px travel from top.
    expect(
      resolveTallPanelSpring({
        ...base,
        scrollY: 1000 + 200,
      }),
    ).toEqual({ kind: 'leave' });
  });

  it('commits to next when past maxY by distance threshold', () => {
    const overshoot = 800 * SPRING_DISTANCE_RATIO + 1;
    expect(
      resolveTallPanelSpring({
        ...base,
        scrollY: 1800 + overshoot,
      }),
    ).toEqual({ kind: 'goto', index: 3 });
  });

  it('reseats to maxY when overshoot is below commit threshold', () => {
    const overshoot = 800 * SPRING_DISTANCE_RATIO * 0.4;
    expect(
      resolveTallPanelSpring({
        ...base,
        scrollY: 1800 + overshoot,
      }),
    ).toEqual({ kind: 'reseat', y: 1800 });
  });

  it('commits to previous when past minY upward by distance', () => {
    const overshoot = 800 * SPRING_DISTANCE_RATIO + 1;
    expect(
      resolveTallPanelSpring({
        ...base,
        scrollY: 1000 - overshoot,
      }),
    ).toEqual({ kind: 'goto', index: 1 });
  });

  it('leaves free past last panel free range (footer)', () => {
    expect(
      resolveTallPanelSpring({
        ...base,
        fromIndex: 3,
        scrollY: 1800 + 200,
      }),
    ).toEqual({ kind: 'leave' });
  });

  it('commits next on strong flick near free-range bottom', () => {
    expect(
      resolveTallPanelSpring({
        ...base,
        scrollY: 1800 - 20,
        velocityPxPerMs: SPRING_VELOCITY_THRESHOLD + 0.1,
      }),
    ).toEqual({ kind: 'goto', index: 3 });
  });
});

describe('useStorySnapWheel', () => {
  afterEach(() => {
    document.documentElement.classList.remove('story-snap');
    document.documentElement.style.scrollSnapType = '';
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('advances one panel per wheel gesture when story-snap is active', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `
      <div class="story-snap-panel" id="p0" style="height: 100px"></div>
      <div class="story-snap-panel" id="p1" style="height: 100px"></div>
    `;

    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    renderHook(() => useStorySnapWheel(true));

    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }),
    );

    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ behavior: 'smooth' });
  });

  it('holds the current panel when hold handler returns true (same-slide merge)', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `
      <div class="story-snap-panel" data-story-hold="visions" id="p0" style="height: 100px"></div>
      <div class="story-snap-panel" id="p1" style="height: 100px"></div>
    `;

    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    const hold = vi.fn(() => true);
    const holdRef = { current: hold };

    renderHook(() => useStorySnapWheel(true, holdRef));

    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }),
    );

    expect(hold).toHaveBeenCalledWith(expect.objectContaining({ direction: 1 }));
    // Wheel hold path consumes the gesture without advancing panels.
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not handle wheel when inactive', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `<div class="story-snap-panel" id="p0"></div>`;
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    renderHook(() => useStorySnapWheel(false));

    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }),
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('releases free scroll on last panel when wheeling down without snap re-arm', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `
      <div class="story-snap-panel" id="p0" style="height: 800px"></div>
      <div class="story-snap-volunteer" id="p1" style="height: 800px"></div>
      <footer id="civic-pulse-footer" style="height: 400px"></footer>
    `;

    const last = document.getElementById('p1');
    vi.spyOn(last!, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 800,
      left: 0,
      right: 0,
      width: 0,
      height: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const first = document.getElementById('p0');
    vi.spyOn(first!, 'getBoundingClientRect').mockReturnValue({
      top: -800,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 800,
      x: 0,
      y: -800,
      toJSON: () => ({}),
    });

    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    renderHook(() => useStorySnapWheel(true));

    const event = new WheelEvent('wheel', {
      deltaY: 80,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    // Hook keeps CSS snap off while owning spring gear.
    expect(document.documentElement.style.scrollSnapType).toBe('none');

    // Simulate tiny scroll still near volunteer top — must NOT re-enable snap.
    vi.spyOn(last!, 'getBoundingClientRect').mockReturnValue({
      top: -8,
      bottom: 792,
      left: 0,
      right: 0,
      width: 0,
      height: 800,
      x: 0,
      y: -8,
      toJSON: () => ({}),
    });
    window.dispatchEvent(new Event('scroll'));
    expect(document.documentElement.style.scrollSnapType).toBe('none');
  });

  it('disables CSS snap while active so spring can rebound', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `
      <div class="story-snap-panel" id="p0" style="height: 100px"></div>
      <div class="story-snap-panel" id="p1" style="height: 100px"></div>
    `;
    renderHook(() => useStorySnapWheel(true));
    expect(document.documentElement.style.scrollSnapType).toBe('none');
  });

  it('allows native wheel mid tall panel without advancing', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `
      <div class="story-snap-panel" id="p0"></div>
      <div class="story-snap-panel" id="p1"></div>
    `;

    const p0 = document.getElementById('p0')!;
    const p1 = document.getElementById('p1')!;
    // Tall first panel: 2000px in 800vh, currently at top of free range
    Object.defineProperty(p0, 'offsetHeight', { value: 2000, configurable: true });
    Object.defineProperty(p1, 'offsetHeight', { value: 800, configurable: true });
    vi.spyOn(p0, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 2000,
      left: 0,
      right: 0,
      width: 0,
      height: 2000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(p1, 'getBoundingClientRect').mockReturnValue({
      top: 2000,
      bottom: 2800,
      left: 0,
      right: 0,
      width: 0,
      height: 800,
      x: 0,
      y: 2000,
      toJSON: () => ({}),
    });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });

    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    renderHook(() => useStorySnapWheel(true));

    const event = new WheelEvent('wheel', {
      deltaY: 80,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    // Mid free range: native scroll, no panel jump.
    expect(scrollTo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('advances from tall panel only when wheeled at free-range bottom', () => {
    document.documentElement.classList.add('story-snap');
    document.body.innerHTML = `
      <div class="story-snap-panel" id="p0"></div>
      <div class="story-snap-panel" id="p1"></div>
    `;

    const p0 = document.getElementById('p0')!;
    const p1 = document.getElementById('p1')!;
    Object.defineProperty(p0, 'offsetHeight', { value: 2000, configurable: true });
    Object.defineProperty(p1, 'offsetHeight', { value: 800, configurable: true });
    // Free range maxY = 0 + 2000 - 800 = 1200; panel top at 0 when scrollY=1200
    vi.spyOn(p0, 'getBoundingClientRect').mockReturnValue({
      top: -1200,
      bottom: 800,
      left: 0,
      right: 0,
      width: 0,
      height: 2000,
      x: 0,
      y: -1200,
      toJSON: () => ({}),
    });
    vi.spyOn(p1, 'getBoundingClientRect').mockReturnValue({
      top: 800,
      bottom: 1600,
      left: 0,
      right: 0,
      width: 0,
      height: 800,
      x: 0,
      y: 800,
      toJSON: () => ({}),
    });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 1200, configurable: true });

    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    renderHook(() => useStorySnapWheel(true));

    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }),
    );

    expect(scrollTo).toHaveBeenCalled();
  });
});
