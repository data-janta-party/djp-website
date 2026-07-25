import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKineticFilmTransport } from '@/hooks/useKineticFilmTransport';

const timelineApis: Array<{
  pause: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  progress: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  time: ReturnType<typeof vi.fn>;
  paused: ReturnType<typeof vi.fn>;
}> = [];

const buildTimelineMock = vi.fn();

vi.mock('gsap', () => {
  const timeline = vi.fn(() => {
    const api = {
      to: vi.fn(function to() {
        return api;
      }),
      fromTo: vi.fn(function fromTo() {
        return api;
      }),
      set: vi.fn(function set() {
        return api;
      }),
      call: vi.fn(function call() {
        return api;
      }),
      play: vi.fn(),
      pause: vi.fn(),
      kill: vi.fn(),
      progress: vi.fn(() => 0),
      seek: vi.fn(),
      time: vi.fn(() => 0),
      paused: vi.fn(() => true),
    };
    timelineApis.push(api);
    return api;
  });
  return {
    default: {
      timeline,
      set: vi.fn(),
      utils: {
        selector: () => () => [],
        toArray: () => [],
      },
    },
  };
});

vi.mock('@/lib/kinetic-speech', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/kinetic-speech')>();
  return {
    ...actual,
    buildKineticSpeechTimeline: (...args: unknown[]) => buildTimelineMock(...args),
  };
});

function mockAudioElement(): HTMLAudioElement {
  const audio = document.createElement('audio');
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    get: () => HTMLMediaElement.HAVE_ENOUGH_DATA,
  });
  Object.defineProperty(audio, 'duration', {
    configurable: true,
    get: () => 142,
  });
  audio.play = vi.fn(async () => undefined);
  audio.pause = vi.fn();
  return audio;
}

describe('useKineticFilmTransport', () => {
  beforeEach(async () => {
    timelineApis.length = 0;
    buildTimelineMock.mockReset();
    const gsap = (await import('gsap')).default as { timeline: () => unknown };
    buildTimelineMock.mockImplementation(() => gsap.timeline());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('rolls phase back to poster when timeline build fails after optimistic playing', async () => {
    buildTimelineMock.mockReturnValue(null);

    const stageRef = { current: document.createElement('div') };
    const audioRef = { current: mockAudioElement() };

    const { result } = renderHook(() =>
      useKineticFilmTransport({
        stageRef,
        audioRef,
        forceDevSlideNav: false,
      }),
    );

    expect(result.current.phase).toBe('poster');

    await act(async () => {
      const ok = await result.current.startFilm();
      expect(ok).toBe(false);
    });

    expect(result.current.phase).toBe('poster');
    expect(result.current.mediaLoading).toBe(false);
  });

  it('finishFilm from reduced path sets ended without audio', async () => {
    const stageRef = { current: document.createElement('div') };
    const audioRef = { current: mockAudioElement() };

    const { result } = renderHook(() =>
      useKineticFilmTransport({
        stageRef,
        audioRef,
        previewMode: 'reduced',
      }),
    );

    await act(async () => {
      const ok = await result.current.startFilm();
      expect(ok).toBe(true);
    });

    expect(result.current.phase).toBe('ended');
    expect(result.current.endcardInteractive).toBe(true);
  });
});
