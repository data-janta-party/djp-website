import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveSpringTarget,
  SPRING_DISTANCE_RATIO,
  SPRING_VELOCITY_THRESHOLD,
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
});
