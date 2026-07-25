import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  DELAYED_PROJECT_SOURCES,
  KINETIC_ENDCARD_SOURCES,
  KINETIC_SPEECH_MUSIC_SOURCE,
  kineticSpeechCopy,
  kineticSpeechRollerSlots,
  kineticSpeechRollerSpinDepth,
} from '@/lib/data/kinetic-speech';

import { KineticSpeechFilm } from './KineticSpeechFilm';

type TimelineApi = {
  to: ReturnType<typeof vi.fn>;
  fromTo: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  call: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  paused: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  time: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  progress: ReturnType<typeof vi.fn>;
};

const { gsapCallFns, timelineApis } = vi.hoisted(() => ({
  gsapCallFns: [] as Array<() => void>,
  timelineApis: [] as TimelineApi[],
}));

vi.mock('gsap', () => {
  const timeline = () => {
    let currentTime = 0;
    let isPaused = true; // audio-master transport: timeline never free-runs
    const api: TimelineApi = {
      to: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      call: vi.fn((fn?: unknown) => {
        if (typeof fn === 'function') {
          gsapCallFns.push(fn as () => void);
        }
        return api;
      }),
      play: vi.fn(() => {
        isPaused = false;
        return api;
      }),
      pause: vi.fn((t?: number) => {
        isPaused = true;
        if (typeof t === 'number') {
          currentTime = t;
        }
        return api;
      }),
      paused: vi.fn((value?: boolean) => {
        if (typeof value === 'boolean') {
          isPaused = value;
          return api;
        }
        return isPaused;
      }),
      kill: vi.fn(),
      time: vi.fn((t?: number) => {
        if (typeof t === 'number') {
          currentTime = t;
          return api;
        }
        return currentTime;
      }),
      seek: vi.fn((t: number) => {
        currentTime = t;
        return api;
      }),
      progress: vi.fn().mockReturnValue(0),
    };
    timelineApis.push(api);
    return api;
  };
  return {
    default: {
      timeline,
      set: vi.fn(),
      utils: {
        // Query-tagged stubs so timeline.set targets can be inspected by selector.
        // Include dataset/style so endcard reel scheduling does not throw in tests.
        selector: () => (query: string) => [
          {
            __query: String(query),
            dataset: {} as Record<string, string>,
            style: {} as Record<string, string>,
          },
        ],
        toArray: <T,>(value: T | T[]): T[] =>
          Array.isArray(value) ? value : value != null ? [value as T] : [],
        random: (min: number, max: number) => (min + max) / 2,
      },
    },
  };
});

function targetQuery(target: unknown): string {
  if (Array.isArray(target)) {
    return target.map((t) => targetQuery(t)).join(' ');
  }
  if (target && typeof target === 'object' && '__query' in target) {
    return String((target as { __query: string }).__query);
  }
  return '';
}

function timelinePositionSets(position: 'relative' | 'absolute') {
  return timelineApis.flatMap((api) =>
    api.set.mock.calls.filter((call) => {
      const vars = call[1] as { position?: string } | undefined;
      return vars?.position === position;
    }),
  );
}

/** Hit the big play gate (if present), then wait for transport chrome. */
async function waitForFilmControls() {
  const playGate = document.getElementById('kinetic-play-button');
  if (playGate) {
    await act(async () => {
      playGate.click();
      await Promise.resolve();
      await Promise.resolve();
    });
  }
  await vi.waitFor(() => {
    expect(
      screen.getByRole('button', { name: kineticSpeechCopy.controls.pause }),
    ).toBeInTheDocument();
  });
}

describe('KineticSpeechFilm', () => {
  beforeEach(() => {
    gsapCallFns.length = 0;
    timelineApis.length = 0;
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    // Default: media already buffered so play gate does not hang on canplay.
    Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 4, // HAVE_ENOUGH_DATA
    });
  });


  it('keeps monochrome stage nodes (no teal/ink; layout variants; inline ellipsis)', () => {
    render(<KineticSpeechFilm />);
    expect(document.querySelectorAll('.kinetic-accent-text')).toHaveLength(0);
    expect(document.querySelectorAll('.kinetic-ink')).toHaveLength(0);
    // Tussle: mobile stacks all; md+ restores horizontal for L/R; N/S stays column
    expect(document.getElementById('a3-lr')).toHaveClass('flex-col');
    expect(document.getElementById('a3-lr')).toHaveClass('md:flex-row');
    expect(document.getElementById('a3-ns')).toHaveClass('flex-col');
    // North/South must stay horizontally centered (not right-flushed by rail-band flex-end)
    expect(document.getElementById('a3-ns')).toHaveClass('items-center');
    expect(document.getElementById('a3-ns')).toHaveClass('kinetic-stage-rail-band');
    // Children self-center so parent cascade cannot right-flush the column stack
    expect(document.getElementById('a3-ns-left')).toHaveClass('self-center');
    expect(document.getElementById('a3-ns-right')).toHaveClass('self-center');
    expect(document.getElementById('a3-rc')).toHaveClass('flex-col');
    expect(document.getElementById('a3-rc')).toHaveClass('md:flex-row');
    // Tiranga only on India.
    expect(document.querySelectorAll('.kinetic-tiranga')).toHaveLength(1);
    expect(document.getElementById('a6-india')).toHaveClass('kinetic-tiranga');
    // Deadline: dots trail each active morph suffix (not a shared post-slot chrome)
    const deadlineSharedDots = document.getElementById('a2-deadline-sticky-dots');
    expect(deadlineSharedDots).toBeInTheDocument();
    expect(deadlineSharedDots).toHaveClass('hidden');
    const deadlineStepDots = document.querySelectorAll(
      '#a2-deadline-sticky [data-k-sticky-suffix] .kinetic-loading-dots',
    );
    expect(deadlineStepDots.length).toBe(3);
    deadlineStepDots.forEach((group) => {
      expect(group).toHaveClass('kinetic-type-body');
      expect(group).toHaveClass('pl-0');
      expect(group).toHaveClass('ml-0');
      expect(group).toHaveClass('gap-0');
      expect(group.querySelectorAll('[data-k-dot]')).toHaveLength(3);
      expect(group.textContent).toBe('...');
      // Dots hang inside the active suffix (flush after the word)
      expect(group.parentElement?.hasAttribute('data-k-sticky-suffix')).toBe(true);
      group.querySelectorAll('[data-k-dot]').forEach((dot) => {
        expect(dot.textContent).toBe('.');
        expect(dot.className).toMatch(/kinetic-loading-dot/);
      });
    });
    // Still waiting: same step-local ellipsis path as Deadline (suffix slot + body-size dots)
    expect(document.getElementById('a2-waiting-prefix')).toHaveClass('kinetic-type-body');
    expect(document.getElementById('a2-deadline-sticky-prefix')).toHaveClass('kinetic-type-body');
    const waitingSharedDots = document.getElementById('a2-waiting-dots');
    expect(waitingSharedDots).toBeInTheDocument();
    expect(waitingSharedDots).toHaveClass('hidden');
    const waitingStepDots = document.querySelectorAll(
      '#a2-waiting [data-k-sticky-suffix] .kinetic-loading-dots',
    );
    expect(waitingStepDots.length).toBe(1);
    waitingStepDots.forEach((group) => {
      expect(group).toHaveClass('kinetic-type-body');
      expect(group.querySelectorAll('[data-k-dot]')).toHaveLength(3);
      expect(group.textContent).toBe('...');
      expect(group.parentElement?.hasAttribute('data-k-sticky-suffix')).toBe(true);
    });
    const waitingSizer = document.querySelector(
      '#a2-waiting .kinetic-sticky-suffix-slot .invisible',
    );
    expect(waitingSizer).toBeInTheDocument();
    expect(waitingSizer).toHaveClass('kinetic-type-body');
    expect(waitingSizer?.textContent).toBe('...');
    expect(document.getElementById('a2-waiting-s0')?.textContent).toBe('...');
    // Short morph stickies: single-line nowrap + stage bottom-rail lock
    for (const id of ['a2-deadline-sticky', 'a5-every'] as const) {
      const sticky = document.getElementById(id);
      expect(sticky).toBeInTheDocument();
      expect(sticky).toHaveClass('flex-nowrap');
      expect(sticky).toHaveClass('whitespace-nowrap');
      expect(sticky).toHaveClass('w-max');
      expect(sticky).toHaveClass('kinetic-type-anchor');
      expect(sticky).toHaveAttribute('data-k-type-anchor', 'bottom');
      expect(sticky).not.toHaveClass('whitespace-normal');
      expect(sticky).not.toHaveClass('flex-wrap');
      expect(sticky?.className).not.toMatch(/md:whitespace-nowrap|md:flex-nowrap/);
      const suffixes = document.querySelectorAll(`#${id} [data-k-sticky-suffix]`);
      expect(suffixes.length).toBeGreaterThan(0);
      suffixes.forEach((node) => {
        expect(node).toHaveClass('absolute');
        expect(node).toHaveClass('bottom-0');
        expect(node).toHaveClass('left-0');
      });
    }
    expect(document.getElementById('a2-deadline-sticky')).toHaveClass('gap-x-0');
    expect(document.getElementById('a2-deadline-sticky')).toHaveClass(
      'max-w-[min(92vw,36ch)]',
    );
    // Prefix carries a normal word space (NBSP) so "Deadline promised" reads as two words
    const deadlinePrefix = document.getElementById('a2-deadline-sticky-prefix');
    const waitingPrefix = document.getElementById('a2-waiting-prefix');
    expect(deadlinePrefix?.textContent?.endsWith('\u00A0')).toBe(true);
    expect(deadlinePrefix?.textContent?.startsWith('Deadline')).toBe(true);
    // Empty-suffix sticky: no NBSP so "Still waiting..." stays flush
    expect(waitingPrefix?.textContent).toBe('Still waiting');
    expect(waitingPrefix?.textContent?.endsWith('\u00A0')).toBe(false);
    // Longest sizer reserves suffix + "..." so step-local dots do not clip past w-max
    const deadlineSizer = document.querySelector(
      '#a2-deadline-sticky .kinetic-sticky-suffix-slot .invisible',
    );
    expect(deadlineSizer).toBeInTheDocument();
    expect(deadlineSizer?.textContent).toBe('extended again...');
    // Step-local dots trail the painted suffix glyphs (flush after the word)
    expect(document.getElementById('a2-deadline-sticky-s0')?.textContent).toBe('promised...');
    expect(document.getElementById('a2-deadline-sticky-s1')?.textContent).toBe('extended...');
    expect(document.getElementById('a2-deadline-sticky-s2')?.textContent).toBe(
      'extended again...',
    );
    // Finale: three word reels always visible (data · janta · party) + join
    expect(document.getElementById('kinetic-roller')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-k-domain-reel]')).toHaveLength(
      kineticSpeechRollerSlots.length,
    );
    expect(document.querySelector('[data-k-roller-mode="virtue-india"]')).toBeNull();
    // Each reel strip: spinDepth decoys + final lock glyph
    const expectedCells = kineticSpeechRollerSpinDepth + 1;
    kineticSpeechRollerSlots.forEach((slot, i) => {
      const strip = document.querySelector(`[data-k-domain-reel="${i}"]`);
      const cells = strip?.querySelectorAll('.kinetic-reel-cell');
      expect(cells).toHaveLength(expectedCells);
      expect(cells?.[cells.length - 1]?.textContent).toBe(slot);
    });
    expect(document.getElementById('kinetic-endcard-tagline')).not.toBeInTheDocument();
    // Gandhi quote: hierarchy quote > attribution; wrap-capable class (no desktop clip)
    const quoteText = document.getElementById('a6-gandhi-text');
    const quoteAttr = document.getElementById('a6-gandhi-attr');
    expect(quoteText).toHaveClass('kinetic-quote-text');
    expect(quoteText).toHaveClass('kinetic-type-body');
    expect(quoteAttr).toHaveClass('kinetic-type-whisper');
    expect(quoteAttr).toHaveClass('kinetic-dim-text');
    // No small type utility on quote; full string present (not truncated in DOM)
    expect(quoteText?.className).not.toMatch(/text-sm|text-xs/);
    expect(quoteText?.textContent).toMatch(/Be the change you wish to see in the world/i);
    // Quote block bottom-locks on the shared type rail
    expect(document.getElementById('a6-gandhi')).toHaveClass('kinetic-type-anchor');
    expect(document.getElementById('a6-gandhi')).toHaveAttribute(
      'data-k-type-anchor',
      'bottom',
    );
  });

  it('bottom-locks primary type nodes on a shared stage rail (not vertical center)', () => {
    render(<KineticSpeechFilm />);
    const nodes = document.getElementById('kinetic-nodes');
    expect(nodes).toBeInTheDocument();
    // Host is a positioning layer — no flex vertical-centering of type boxes
    expect(nodes?.className).not.toMatch(/items-center/);
    expect(nodes?.className).not.toMatch(/justify-center/);

    // Representative primary beats share the bottom-rail contract
    const bottomLockedIds = [
      'a6-india', // slam-xl line
      'a2-deadline-sticky', // sticky
      'a6-gandhi', // quote
    ] as const;
    for (const id of bottomLockedIds) {
      const el = document.getElementById(id);
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass('kinetic-type-anchor');
      expect(el).toHaveAttribute('data-k-type-anchor', 'bottom');
    }

    // Pair lead/hit both sit on the same rail
    expect(document.getElementById('a1-p1-lead')).toHaveClass('kinetic-type-anchor');
    expect(document.getElementById('a1-p1-hit')).toHaveClass('kinetic-type-anchor');
    expect(document.getElementById('a6-abki-lead')).toHaveClass('kinetic-type-anchor');
    expect(document.getElementById('a6-abki-hit')).toHaveClass('kinetic-type-anchor');

    // Slide-pair band sits on the rail (words are in-flow of the band)
    expect(document.getElementById('a3-lr')).toHaveClass('kinetic-stage-rail-band');
    expect(document.getElementById('a3-lr')).toHaveAttribute('data-k-type-anchor', 'bottom');

    // Full-stage flood stays inset-0 packing (not manifesto rail)
    const flood = document.querySelector('[data-k-flood]');
    expect(flood).toBeInTheDocument();
    expect(flood).toHaveClass('inset-0');
    expect(flood).not.toHaveClass('kinetic-type-anchor');
  });


  it('shows big play gate on mount and starts film on play', async () => {
    render(<KineticSpeechFilm />);
    expect(document.getElementById('kinetic-play-button')).toBeInTheDocument();
    expect(document.getElementById('kinetic-play-gate')).toBeInTheDocument();
    expect(document.getElementById('kinetic-media-loading')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: kineticSpeechCopy.controls.pause }),
    ).not.toBeInTheDocument();
    // Top-left Back uses the shared Button atom
    const back = screen.getByRole('button', { name: kineticSpeechCopy.controls.home });
    expect(back).toHaveAttribute('id', 'kinetic-control-home');
    expect(back).toHaveAttribute('data-slot', 'button');
    expect(document.getElementById('kinetic-control-home-icon')).toBeInTheDocument();

    await waitForFilmControls();
    expect(document.getElementById('kinetic-play-button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.mute })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause })).toBeInTheDocument();
    expect(timelineApis.length).toBeGreaterThan(0);
  });

  it('shows a spinner while the trailer is buffering after play', async () => {
    Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 0, // HAVE_NOTHING — force waitForAudioData
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    render(<KineticSpeechFilm />);
    // Poster idle — no spinner until play
    expect(document.getElementById('kinetic-media-loading')).not.toBeInTheDocument();
    expect(document.getElementById('kinetic-play-button')).toBeInTheDocument();

    await act(async () => {
      document.getElementById('kinetic-play-button')!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Spinner while waiting for canplay
    const loading = await vi.waitFor(() => {
      const el = document.getElementById('kinetic-media-loading');
      expect(el).toBeTruthy();
      return el!;
    });
    expect(loading).toHaveAttribute('aria-label', kineticSpeechCopy.a11y.loading);
    expect(document.getElementById('kinetic-media-loading-spinner')).toHaveClass(
      'kinetic-spinner',
    );
    expect(document.getElementById('kinetic-speech-film')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // Controls stay hidden until buffer is ready
    expect(
      screen.queryByRole('button', { name: kineticSpeechCopy.controls.pause }),
    ).not.toBeInTheDocument();

    // Simulate media becoming ready
    const audio = document.getElementById('kinetic-speech-audio') as HTMLAudioElement;
    Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 4,
    });
    await act(async () => {
      audio.dispatchEvent(new Event('canplay'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(document.getElementById('kinetic-media-loading')).not.toBeInTheDocument();
    });
    expect(document.getElementById('kinetic-speech-film')?.getAttribute('aria-busy')).toBeNull();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause })).toBeInTheDocument();
  });

  it('surfaces tap-for-sound when play() is blocked after play gate', async () => {
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: vi.fn().mockRejectedValue(new DOMException('NotAllowedError')),
    });

    render(<KineticSpeechFilm />);
    await waitForFilmControls();

    expect(
      screen.getByRole('button', { name: kineticSpeechCopy.a11y.soundBlocked }),
    ).toBeInTheDocument();
    expect(document.getElementById('kinetic-control-sound-icon')).toBeInTheDocument();
    expect(
      document.querySelector('#kinetic-control-sound-icon path, #kinetic-control-sound-icon line'),
    ).toBeTruthy();
    // Spinner must not stick after play is blocked
    expect(document.getElementById('kinetic-media-loading')).not.toBeInTheDocument();

    // Gesture unlock retries play and clears the control
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.a11y.soundBlocked }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.queryByRole('button', { name: kineticSpeechCopy.a11y.soundBlocked }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.mute })).toBeInTheDocument();
  });

  it('deadline sticky and project-delay cards schedule kick scale heartbeats', async () => {
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    expect(timelineApis.length).toBeGreaterThan(0);
    const scaleToCalls = timelineApis.flatMap((api) =>
      api.to.mock.calls.filter((call) => {
        const vars = call[1] as { scale?: number } | undefined;
        return vars?.scale === 1.08;
      }),
    );
    // Heartbeat targets deadline sticky root and delay cards
    const deadlinePulses = scaleToCalls.filter((call) =>
      targetQuery(call[0]).includes('a2-deadline-sticky'),
    );
    const waitingPulses = scaleToCalls.filter((call) =>
      targetQuery(call[0]).includes('a2-waiting'),
    );
    const delayCardPulses = scaleToCalls.filter((call) =>
      /#a2-project-delays-p\d+/.test(targetQuery(call[0])),
    );
    expect(deadlinePulses.length).toBeGreaterThan(0);
    expect(waitingPulses.length).toBeGreaterThan(0);
    expect(delayCardPulses.length).toBeGreaterThan(0);
  });

  it('all morph stickies GSAP never toggle suffix position (opacity stack only)', async () => {
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    expect(timelineApis.length).toBeGreaterThan(0);

    const relativeSets = timelinePositionSets('relative');
    const absoluteSets = timelinePositionSets('absolute');

    // Wide Demand morph (a4b-want): opacity stack only — never promote to relative
    const wantRelative = relativeSets.filter((call) =>
      targetQuery(call[0]).includes('a4b-want'),
    );
    expect(wantRelative).toHaveLength(0);

    // Wide may park absolute on exit reset of the whole sticky root, but never
    // mid-step relative↔absolute dance on individual morph suffixes.
    const wantAbsoluteStepPark = absoluteSets.filter((call) => {
      const q = targetQuery(call[0]);
      // Individual suffix ids look like #a4b-want-s0; exit reset is
      // "#a4b-want [data-k-sticky-suffix]" (descendant selector, not -sN).
      return /#a4b-want-s\d+/.test(q);
    });
    expect(wantAbsoluteStepPark).toHaveLength(0);

    // Non-wide Deadline / lack / Every: also opacity stack only — never promote to relative
    for (const id of ['a2-deadline-sticky', 'a4-lack', 'a5-every'] as const) {
      const stepIdRe = new RegExp(`#${id}-s\\d+`);
      const relativeStep = relativeSets.filter((call) => stepIdRe.test(targetQuery(call[0])));
      const absoluteStepPark = absoluteSets.filter((call) =>
        stepIdRe.test(targetQuery(call[0])),
      );
      expect(relativeStep).toHaveLength(0);
      expect(absoluteStepPark).toHaveLength(0);
    }
  });

  it('keeps endcard CTA inert and unfocusable until join unlock', () => {
    render(<KineticSpeechFilm />);
    const endcard = document.getElementById('kinetic-endcard');
    const join = document.getElementById('kinetic-fin-join');
    const url = document.getElementById('kinetic-fin-url');
    const sourcesDock = document.getElementById('kinetic-endcard-sources');
    const sourcesTrigger = document.getElementById('kinetic-endcard-sources-trigger');
    expect(endcard).toBeInTheDocument();
    expect(join).toBeInTheDocument();
    expect(url).toBeInTheDocument();
    expect(sourcesDock).toBeInTheDocument();
    expect(sourcesTrigger).toBeInTheDocument();
    expect(endcard).toHaveAttribute('aria-hidden', 'true');
    expect(endcard?.hasAttribute('inert')).toBe(true);
    expect(join).toHaveAttribute('tabindex', '-1');
    expect(url).toHaveAttribute('tabindex', '-1');
    expect(sourcesTrigger).toHaveAttribute('tabindex', '-1');
    expect(sourcesTrigger).toHaveAttribute('aria-label', kineticSpeechCopy.endcard.sources);
    // Dock sits above control safe area
    expect(sourcesDock?.className).toMatch(/bottom-\[calc\(3\.75rem/);
    // Three word reels lock to data / janta / party
    const strips = document.querySelectorAll('[data-k-domain-reel]');
    expect(strips).toHaveLength(kineticSpeechRollerSlots.length);
    const settled = Array.from(strips).map((strip) => {
      const cells = strip.querySelectorAll('.kinetic-reel-cell');
      return cells[cells.length - 1]?.textContent ?? '';
    });
    expect(settled).toEqual([...kineticSpeechRollerSlots]);
    expect(settled.join('.')).toBe(kineticSpeechCopy.endcard.url);
  });

  it('unlocks Join after roller settle while phase stays playing', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();

    // Timeline build schedules setJoinReady via gsap.call — invoke it without ending film.
    expect(gsapCallFns.length).toBeGreaterThan(0);
    await act(async () => {
      for (const fn of gsapCallFns) {
        fn();
      }
    });

    const endcard = document.getElementById('kinetic-endcard');
    const join = document.getElementById('kinetic-fin-join');
    const url = document.getElementById('kinetic-fin-url');
    const sourcesTrigger = document.getElementById('kinetic-endcard-sources-trigger');
    expect(join).toHaveAttribute('tabindex', '0');
    expect(url).toHaveAttribute('tabindex', '0');
    expect(sourcesTrigger).toHaveAttribute('tabindex', '0');
    expect(endcard?.hasAttribute('inert')).toBe(false);
    expect(endcard).toHaveAttribute('aria-hidden', 'false');
    // Still mid-play: pause present, replay absent (no skip control)
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: kineticSpeechCopy.controls.replay })).not.toBeInTheDocument();
    expect(document.getElementById('kinetic-control-skip')).toBeNull();
  });

  it('pauses audio and freezes visual (no free-run timeline after pause)', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();

    const tl = timelineApis[timelineApis.length - 1];
    expect(tl).toBeTruthy();
    const playCallsBeforePause = tl!.play.mock.calls.length;
    const timeCallsBeforePause = tl!.time.mock.calls.length;
    const pauseMock = window.HTMLMediaElement.prototype.pause as ReturnType<typeof vi.fn>;
    pauseMock.mockClear();

    // Audio-master transport: playback never free-runs GSAP via tl.play().
    expect(playCallsBeforePause).toBe(0);

    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause }));

    expect(pauseMock).toHaveBeenCalled();
    // Big centered play gate (not a small bottom-rail resume chip)
    expect(document.getElementById('kinetic-play-button')).toBeInTheDocument();
    expect(document.getElementById('kinetic-control-resume')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.play })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.replay })).toBeInTheDocument();

    // After pause: scrub loop stops — no new free-run play, no scrub time advances.
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    });
    expect(tl!.play.mock.calls.length).toBe(0);
    expect(tl!.time.mock.calls.length).toBe(timeCallsBeforePause);
  });

  it('resume via big play restarts audio + scrub without free-running the timeline', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();

    const tl = timelineApis[timelineApis.length - 1];
    expect(tl).toBeTruthy();
    const playMock = window.HTMLMediaElement.prototype.play as ReturnType<typeof vi.fn>;

    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause }));
    playMock.mockClear();
    tl!.play.mockClear();
    tl!.time.mockClear();

    await user.click(document.getElementById('kinetic-play-button')!);
    await act(async () => {
      await Promise.resolve();
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    });

    expect(playMock).toHaveBeenCalled();
    // Visual still scrubbed, never free-run
    expect(tl!.play).not.toHaveBeenCalled();
    expect(document.getElementById('kinetic-play-button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause })).toBeInTheDocument();
  });

  it('renders icon-only control buttons with lucide SVGs', async () => {
    render(<KineticSpeechFilm />);
    await waitForFilmControls();

    expect(document.getElementById('kinetic-control-pause-icon')).toBeInTheDocument();
    // Default unmuted → Volume2 uses unmute-icon id (mute-icon is VolumeX when muted)
    expect(document.getElementById('kinetic-control-unmute-icon')).toBeInTheDocument();
    expect(document.getElementById('kinetic-control-pause')).toHaveAttribute(
      'aria-label',
      kineticSpeechCopy.controls.pause,
    );
    expect(document.getElementById('kinetic-control-mute')).toHaveAttribute(
      'aria-label',
      kineticSpeechCopy.controls.mute,
    );
    const pauseBtn = screen.getByRole('button', { name: kineticSpeechCopy.controls.pause });
    const pauseIcon = pauseBtn.querySelector('svg.kinetic-control-icon');
    expect(pauseIcon).toBeTruthy();
    expect(pauseIcon).toHaveAttribute('width', '20');
    expect(pauseIcon).toHaveAttribute('height', '20');
    // Lucide stroke paths (not empty chips)
    expect(pauseIcon?.querySelectorAll('path, line, rect, circle, polyline').length).toBeGreaterThan(
      0,
    );
  });

  it('opens endcard Sources hover card with music + project links after unlock', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    await act(async () => {
      for (const fn of gsapCallFns) {
        fn();
      }
    });

    const trigger = document.getElementById('kinetic-endcard-sources-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.tagName).toBe('BUTTON');
    await user.click(trigger!);

    // Base UI PreviewCard popup (id on content); wait for open mount
    const panel = await vi.waitFor(() => {
      const el = document.getElementById('kinetic-endcard-sources-content');
      expect(el).toBeTruthy();
      return el!;
    });

    const links = panel.querySelectorAll('a');
    expect(links.length).toBe(KINETIC_ENDCARD_SOURCES.length);
    const hrefs = Array.from(links).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).toContain(KINETIC_SPEECH_MUSIC_SOURCE.href);
    expect(hrefs.some((h) => h.includes('pixabay.com'))).toBe(true);
    for (const source of DELAYED_PROJECT_SOURCES) {
      expect(hrefs).toContain(source.href);
    }
    // Featured project ref hosts
    expect(hrefs.some((h) => h.includes('timesofindia.indiatimes.com'))).toBe(true);
    expect(hrefs.some((h) => h.includes('idrw.org'))).toBe(true);
    expect(hrefs.some((h) => h.includes('metrorailnews.in'))).toBe(true);
    expect(hrefs.some((h) => h.includes('news18.com'))).toBe(true);
    for (const link of Array.from(links)) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('closes open endcard Sources panel on replay and does not re-open until user opens', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    // Unlock endcard mid-film, then pause so Replay is available (no skip control).
    await act(async () => {
      for (const fn of gsapCallFns) {
        fn();
      }
    });
    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause }));

    const trigger = document.getElementById('kinetic-endcard-sources-trigger');
    expect(trigger).toHaveAttribute('tabindex', '0');
    await user.click(trigger!);

    await vi.waitFor(() => {
      expect(document.getElementById('kinetic-endcard-sources-content')).toBeTruthy();
    });

    // Focus a portaled source link — replay must blur + close without auto-reopen
    const openLink = document
      .getElementById('kinetic-endcard-sources-content')
      ?.querySelector('a') as HTMLAnchorElement | null;
    expect(openLink).toBeTruthy();
    openLink?.focus();
    expect(document.activeElement).toBe(openLink);

    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.controls.replay }));

    expect(document.getElementById('kinetic-endcard-sources-trigger')).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(document.getElementById('kinetic-endcard-sources-content')).toBeNull();
    expect(document.activeElement).not.toBe(openLink);

    // Unlock again via gsap join callback — panel must stay closed until user opens
    await act(async () => {
      for (const fn of gsapCallFns) {
        fn();
      }
    });
    expect(document.getElementById('kinetic-endcard-sources-trigger')).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(document.getElementById('kinetic-endcard-sources-content')).toBeNull();
  });

  it('does not steal Space activation from focused Join link', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    await act(async () => {
      for (const fn of gsapCallFns) {
        fn();
      }
    });

    const join = document.getElementById('kinetic-fin-join');
    expect(join).toBeTruthy();
    join?.focus();
    expect(document.activeElement).toBe(join);

    // Space on focused link must not pause the film (allow default link activation)
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: kineticSpeechCopy.controls.play })).not.toBeInTheDocument();
  });

  it('does not render skip-to-end control', async () => {
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    expect(document.getElementById('kinetic-control-skip')).toBeNull();
    expect(screen.queryByRole('button', { name: /skip to end/i })).not.toBeInTheDocument();
  });

  it('replay drops endcard interactivity before film restarts', async () => {
    const user = userEvent.setup();
    render(<KineticSpeechFilm />);
    await waitForFilmControls();
    await act(async () => {
      for (const fn of gsapCallFns) {
        fn();
      }
    });
    expect(document.getElementById('kinetic-fin-join')).toHaveAttribute('tabindex', '0');
    expect(document.getElementById('kinetic-endcard-sources-trigger')).toHaveAttribute(
      'tabindex',
      '0',
    );

    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.controls.pause }));
    await user.click(screen.getByRole('button', { name: kineticSpeechCopy.controls.replay }));
    // phase flips to playing immediately — CTAs inert again
    expect(document.getElementById('kinetic-fin-join')).toHaveAttribute('tabindex', '-1');
    expect(document.getElementById('kinetic-fin-url')).toHaveAttribute('tabindex', '-1');
    expect(document.getElementById('kinetic-endcard-sources-trigger')).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(document.getElementById('kinetic-endcard')?.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('kinetic-endcard')).toHaveAttribute('aria-hidden', 'true');
  });

  it('mid-film project-delays has no Sources dock', async () => {
    render(<KineticSpeechFilm />);
    await waitForFilmControls();

    expect(document.getElementById('a2-project-delays')).toBeInTheDocument();
    expect(document.querySelector('#a2-project-delays [data-k-delay-sources]')).toBeNull();
    expect(document.querySelector('[data-k-delay-sources]')).toBeNull();
    // Join unlock remains the sole mid-timeline gsap.call for endcard interactivity
    expect(gsapCallFns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders reduced-motion transcript with manifesto beats and CTA end card', () => {
    render(<KineticSpeechFilm previewMode="reduced" />);
    expect(screen.getByRole('heading', { name: kineticSpeechCopy.poster.reducedMotionTitle })).toBeInTheDocument();
    expect(screen.getByText(/Chalta Hai/i)).toBeInTheDocument();
    expect(screen.queryByText(/WHY\?/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Delayed/i)).toBeInTheDocument();
    expect(screen.getByText(/Deadline promised/i)).toBeInTheDocument();
    expect(screen.getByText(/Still waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/Left\./i)).toBeInTheDocument();
    expect(screen.getByText(/North\./i)).toBeInTheDocument();
    expect(screen.getByText(/While China races ahead/i)).toBeInTheDocument();
    expect(screen.getByText(/Our media keeps us busy/i)).toBeInTheDocument();
    expect(screen.getByText(/Abki baar/i)).toBeInTheDocument();
    expect(screen.getByText(/development ki sarkar/i)).toBeInTheDocument();
    expect(screen.queryByText(/And while we're waiting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/We're told to argue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/The pothole doesn't care/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/The pollution doesn't care/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/The delayed ambulance doesn't care/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Bad governance affects everyone/i)).toBeInTheDocument();
    expect(screen.getByText(/Enough is enough/i)).toBeInTheDocument();
    // Demand: solo "We want" + rapid list + now pair (not sticky morph lines)
    expect(screen.getByText(/We want/i)).toBeInTheDocument();
    expect(screen.getByText(/development/i)).toBeInTheDocument();
    expect(screen.getByText(/no corruption/i)).toBeInTheDocument();
    expect(screen.getByText(/accountability/i)).toBeInTheDocument();
    expect(screen.getByText(/Every project/i)).toBeInTheDocument();
    expect(screen.getByText(/Public\./i)).toBeInTheDocument();
    expect(screen.getByText(/We are the change/i)).toBeInTheDocument();
    // Cough stagger: solo prefix then full phrase
    expect(document.getElementById('kinetic-transcript-visible')?.textContent).toMatch(
      /Cough\nCough Cough/,
    );
    expect(screen.getByText(/and we want it…/i)).toBeInTheDocument();
    // Pair hit lands on its own transcript line after the lead
    expect(document.getElementById('kinetic-transcript-visible')?.textContent).toMatch(
      /and we want it…\nnow\./,
    );
    expect(screen.getByText(/Be the change you wish to see in the world/i)).toBeInTheDocument();
    expect(screen.getByText(/Mahatma Gandhi/i)).toBeInTheDocument();
    expect(screen.getByText(/walkable/i)).toBeInTheDocument();
    expect(screen.getByText(/Footpath broken/i)).toBeInTheDocument();
    expect(screen.getByText(/Rich getting richer/i)).toBeInTheDocument();
    expect(screen.getByText(/Poor getting poorer/i)).toBeInTheDocument();
    expect(screen.getByText(/1 lakh dengue cases/i)).toBeInTheDocument();
    expect(screen.getByText(/Food adulteration/i)).toBeInTheDocument();
    expect(screen.getByText(/Same cities flooding every year/i)).toBeInTheDocument();
    expect(screen.getByText(/Government office/i)).toBeInTheDocument();
    expect(screen.getByText(/5 visits/i)).toBeInTheDocument();
    expect(screen.getByText(/Have to bribe/i)).toBeInTheDocument();
    expect(screen.getByText(/Ambulance stuck for VIP/i)).toBeInTheDocument();
    expect(screen.getByText(/15 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/100 AQI/i)).toBeInTheDocument();
    expect(screen.getByText(/500 AQI/i)).toBeInTheDocument();
    // Delayed projects appear on mid-film project-delays (transcript + DOM)
    const reducedTranscript = document.getElementById('kinetic-transcript-visible')?.textContent ?? '';
    expect(reducedTranscript).toMatch(/Bullet Train/);
    expect(reducedTranscript).toMatch(/Bengaluru Metro/);
    expect(reducedTranscript).toMatch(/Delayed\./);
    expect(reducedTranscript).toMatch(/5 years/);
    expect(reducedTranscript).toMatch(/5 years/);
    expect(reducedTranscript).toMatch(/Udhampur-Baramulla Rail/);
    expect(reducedTranscript).toMatch(/21 years/);
    expect(reducedTranscript).toMatch(/1000\+ more\./);
    // Mid-film transcript does not dump source labels (Sources are endcard-only)
    expect(reducedTranscript).not.toMatch(/MoSPI/);
    expect(reducedTranscript).not.toMatch(/USBRL \(Wikipedia\)/);
    expect(reducedTranscript).not.toMatch(/Bullet Train \(TOI\)/);
    // Transcript project names only (Mumbai Metro replaced by Bengaluru Metro)
    expect(reducedTranscript).toMatch(/^Bullet Train$/m);
    expect(reducedTranscript).toMatch(/^Bengaluru Metro$/m);
    expect(reducedTranscript).not.toMatch(/^Mumbai Metro$/m);
    expect(reducedTranscript).toMatch(/^Udhampur-Baramulla Rail$/m);
    expect(screen.getByText(/1000\+ more\./i)).toBeInTheDocument();
    // Project cards use public names; USBRL acronym not a card name
    expect(reducedTranscript).not.toMatch(/^\s*USBRL\s*$/m);
    expect(screen.queryByText(/Taxes paid/i)).not.toBeInTheDocument();
    // a2 flood words also in transcript
    expect(reducedTranscript).toMatch(/CHALTA HAI/);
    expect(reducedTranscript).toMatch(/India\./);
    expect(screen.queryByText(/Let's build the India we deserve/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: kineticSpeechCopy.endcard.url })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: kineticSpeechCopy.endcard.join })).toHaveAttribute(
      'href',
      '/#volunteer',
    );
    // Reduced path lists endcard Sources (music + projects)
    const reducedSources = document.getElementById('kinetic-reduced-sources');
    expect(reducedSources).toBeInTheDocument();
    const reducedLinks = reducedSources?.querySelectorAll('a') ?? [];
    expect(reducedLinks.length).toBe(KINETIC_ENDCARD_SOURCES.length);
    expect(
      Array.from(reducedLinks).some(
        (a) => a.getAttribute('href') === KINETIC_SPEECH_MUSIC_SOURCE.href,
      ),
    ).toBe(true);
    const reducedHrefs = Array.from(reducedLinks).map((a) => a.getAttribute('href') ?? '');
    expect(reducedHrefs.some((h) => h.includes('timesofindia.indiatimes.com'))).toBe(true);
    expect(reducedHrefs.some((h) => h.includes('idrw.org'))).toBe(true);
    expect(reducedHrefs.some((h) => h.includes('metrorailnews.in'))).toBe(true);
    expect(reducedHrefs.some((h) => h.includes('news18.com'))).toBe(true);
  });

  describe('dev slide scrubber', () => {
    const originalHref = window.location.href;

    beforeEach(() => {
      window.history.replaceState(null, '', '/speech');
    });

    afterEach(() => {
      window.history.replaceState(null, '', originalHref);
    });

    it('does not render scrubber without forceDevSlideNav', async () => {
      const user = userEvent.setup();
      render(<KineticSpeechFilm />);
      expect(document.getElementById('kinetic-dev-slide-nav')).not.toBeInTheDocument();
    });

    it('shows scrubber and seeks with next/prev when forced', async () => {
      const user = userEvent.setup();
      render(<KineticSpeechFilm forceDevSlideNav />);
      // Play gate first — scrubber appears once the film is running
      await waitForFilmControls();

      const nav = document.getElementById('kinetic-dev-slide-nav');
      expect(nav).toBeInTheDocument();
      expect(document.getElementById('kinetic-dev-slide-label')?.textContent).toMatch(/1\s*\/\s*\d+/);
      expect(window.location.hash).toBe('#1');

      const tl = timelineApis[timelineApis.length - 1];
      expect(tl).toBeTruthy();

      await user.click(screen.getByRole('button', { name: /Next slide/i }));
      expect(document.getElementById('kinetic-dev-slide-label')?.textContent).toMatch(
        /2\s*\/\s*\d+/,
      );
      expect(window.location.hash).toBe('#2');
      expect(tl?.seek).toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /Previous slide/i }));
      expect(document.getElementById('kinetic-dev-slide-label')?.textContent).toMatch(
        /1\s*\/\s*\d+/,
      );
      expect(window.location.hash).toBe('#1');
    });

    it('seeks from hash on load when forced', async () => {
      window.history.replaceState(null, '', '/speech#3');
      render(<KineticSpeechFilm forceDevSlideNav />);

      await act(async () => {
        // hash effect schedules seekToSlide (async)
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await vi.waitFor(() => {
        expect(document.getElementById('kinetic-dev-slide-nav')).toBeInTheDocument();
      });
      expect(document.getElementById('kinetic-dev-slide-label')?.textContent).toMatch(
        /3\s*\/\s*\d+/,
      );
      expect(timelineApis.length).toBeGreaterThan(0);
      const tl = timelineApis[timelineApis.length - 1];
      expect(tl?.seek).toHaveBeenCalled();
    });
  });
});
