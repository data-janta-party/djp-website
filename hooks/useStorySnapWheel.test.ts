import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useStorySnapWheel } from './useStorySnapWheel';

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

    expect(hold).toHaveBeenCalled();
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
});
