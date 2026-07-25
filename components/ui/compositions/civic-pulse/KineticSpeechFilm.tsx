'use client';

import gsap from 'gsap';
import { ChevronLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  getAllKineticBeats,
  getKineticSpeechAudioEndBeat,
  getKineticSpeechFilmDurationSec,
  getKineticSpeechTranscript,
  KINETIC_ENDCARD_SOURCES,
  kineticSpeechAudioSrc,
  kineticSpeechCopy as copy,
  kineticSpeechEndcardHoldSec,
  kineticSpeechJoinHref,
  kineticSpeechReelCellEm,
  kineticSpeechRollerDomainLockGapBeats,
  kineticSpeechRollerSlots,
  kineticSpeechRollerSpinDepth,
  kineticSpeechRollerVirtueHoldBeats,
  kineticSpeechRollerVirtueIndiaBeats,
  kineticSpeechRollerVirtues,
  kineticSpeechUrlHref,
  layoutKineticSpeech,
  stickyPrefixHoldBeats,
  type KineticBeat,
  type MotionVerb,
  type StageBg,
  type TypeRole,
} from '@/lib/data/kinetic-speech';
import {
  kineticSlideTimeSec,
  parseKineticSlideHash,
  replaceKineticSlideHash,
  slideIndexAtTime,
} from '@/lib/data/kinetic-speech-dev-nav';
import {
  atBeat,
  isKickBeat,
  KINETIC_BEAT,
  kickBeatsInRange,
  wholeBeatsInRange,
} from '@/lib/data/kinetic-speech-beatmap';
import { Button } from '@/components/ui/atoms/Button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/shadcn/hover-card';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { cn } from '@/lib/utils/index';

/** Visual-only in/out — never advances the beat clock. */
const IN_SNAP = 0.06;
const OUT_SNAP = 0.05;

export interface KineticSpeechFilmProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  /**
   * Storybook / tests:
   * - `poster` — static play gate (same as default `/speech`)
   * - `reduced` — transcript fallback
   * Default (undefined) shows the big play gate; playback starts on user gesture.
   */
  readonly previewMode?: 'poster' | 'reduced';
  /**
   * Force DEV slide scrubber (hash + prev/next) on even when NODE_ENV is not
   * development — used by unit tests. Production code paths pass nothing.
   */
  readonly forceDevSlideNav?: boolean;
}

type FilmPhase = 'poster' | 'playing' | 'paused' | 'ended';

const BG = {
  /** Pure black stage — not charcoal grey. */
  charcoal: '#000000',
} as const;

/** Control chrome icons — lucide (project icon library) with explicit px size. */
const CONTROL_ICON_PROPS = {
  size: 20,
  strokeWidth: 2,
  'aria-hidden': true as const,
  focusable: false as const,
  className: 'kinetic-control-icon size-5 shrink-0 text-white',
};

/** Large centered play gate (poster + paused). */
const PLAY_GATE_ICON_PROPS = {
  size: 52,
  strokeWidth: 1.75,
  'aria-hidden': true as const,
  focusable: false as const,
  className: 'kinetic-play-gate-icon shrink-0 text-white',
};

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function roleClass(role: TypeRole): string {
  switch (role) {
    case 'whisper':
      return 'kinetic-type-whisper';
    case 'body':
      return 'kinetic-type-body';
    case 'slam':
      return 'kinetic-type-slam';
    case 'slam-xl':
      return 'kinetic-type-slam-xl';
    case 'brand':
      return 'kinetic-type-brand';
    case 'micro-grid':
      return 'kinetic-type-micro-grid';
    case 'close':
      return 'kinetic-type-close';
    default:
      return 'kinetic-type-body';
  }
}

function defaultIn(motion: MotionVerb): number {
  switch (motion) {
    case 'hardcut':
      return 0.04;
    case 'pop':
    case 'pulse':
      return IN_SNAP;
    case 'replace':
      return 0.1;
    case 'slide-l':
    case 'slide-r':
      return 0.12;
    case 'dim':
      return 0.14;
    case 'rise':
    default:
      return 0.12;
  }
}

function defaultOut(motion: MotionVerb): number {
  switch (motion) {
    case 'hardcut':
    case 'pop':
      return OUT_SNAP;
    case 'replace':
      return 0.08;
    default:
      return OUT_SNAP;
  }
}

/**
 * Director-driven kinetic manifesto film — data beats + GSAP motion verbs.
 * Arc: Chalta Hai → Delay → Divide → Lack → Demand → Imagine →
 *      Gandhi / We are the change → Virtues → India → Abki baar → CTA.
 */
export function KineticSpeechFilm({
  className,
  previewMode,
  forceDevSlideNav = false,
}: KineticSpeechFilmProps) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  /** rAF id for the audio→visual scrub loop (visual never free-runs). */
  const scrubRafRef = useRef<number | null>(null);
  /**
   * Play gate: film stays on poster until the user hits the big play control
   * (or Space). First play() is always a user gesture — more reliable than
   * cold-load autoplay.
   */
  const phaseRef = useRef<FilmPhase>('poster');
  /** Last slide index written to hash / HUD (1-based). */
  const slideIndexRef = useRef(0);
  /** Skip re-seeking when hash was updated by scrubber itself. */
  const suppressHashSeekRef = useRef(false);
  /** Latest mute preference for gesture-unlock handlers. */
  const mutedRef = useRef(false);
  /** Cleanup for document-level autoplay unlock listeners. */
  const clearAudioUnlockRef = useRef<(() => void) | null>(null);
  /**
   * Bumped on unmount / kill so in-flight startFilm() after React Strict Mode
   * remount cannot leave audio running against a dead timeline (blank stage).
   */
  const filmSessionRef = useRef(0);
  /**
   * Transport: audio is the only free-running clock. GSAP timeline stays paused
   * and is scrubbed to audio.currentTime while phase is playing.
   * Refs let unlock handlers call the latest scrub/start without declaration order issues.
   */
  const startScrubLoopRef = useRef<() => void>(() => undefined);

  const [phase, setPhase] = useState<FilmPhase>('poster');
  /** Join/URL interactive after roller settles, while music may still be playing. */
  const [joinReady, setJoinReady] = useState(false);
  /** Endcard Sources HoverCard open state (closed when endcard locks). */
  const [endcardSourcesOpen, setEndcardSourcesOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  /**
   * True when `audio.play()` was rejected (autoplay policy) and we are waiting
   * for a user gesture to start the soundtrack.
   */
  const [audioBlocked, setAudioBlocked] = useState(false);
  /**
   * Trailer buffer spinner — only while play/resume waits on media data.
   * Poster starts idle (big play) with no spinner.
   */
  const [mediaLoading, setMediaLoading] = useState(false);
  const [status, setStatus] = useState<string>(copy.a11y.paused);
  /** DEV scrubber: current 1-based slide (0 = not started). */
  const [slideIndex, setSlideIndex] = useState(0);

  // Keep mobile screens awake for the ~2.5 min soundtrack (Screen Wake Lock API).
  useScreenWakeLock(phase === 'playing');

  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const reduced = previewMode === 'reduced' || systemReduced;
  const isDevSlideNav =
    forceDevSlideNav || (process.env.NODE_ENV === 'development' && previewMode == null);
  const transcript = useMemo(() => getKineticSpeechTranscript(), []);
  const beats = useMemo(() => getAllKineticBeats(), []);
  const slideItems = useMemo(() => layoutKineticSpeech().items, []);
  const slideCount = slideItems.length;

  const stopScrubLoop = useCallback(() => {
    if (scrubRafRef.current != null) {
      cancelAnimationFrame(scrubRafRef.current);
      scrubRafRef.current = null;
    }
  }, []);

  const killTimeline = useCallback(() => {
    timelineRef.current?.kill();
    timelineRef.current = null;
    stopScrubLoop();
  }, [stopScrubLoop]);

  const hideChrome = useCallback((hide: boolean) => {
    document.documentElement.classList.toggle('kinetic-speech-active', hide);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // useLayoutEffect: hide site navbar before paint so the brand logo never covers the back control.
  useLayoutEffect(() => {
    // Immersive shell only for the film stage — reduced transcript keeps page scroll + site chrome.
    if (reduced) {
      hideChrome(false);
      return;
    }
    hideChrome(true);
    const audio = audioRef.current;
    return () => {
      // Invalidate in-flight startFilm so it cannot orphan audio against a dead TL.
      filmSessionRef.current += 1;
      hideChrome(false);
      killTimeline();
      try {
        audio?.pause();
      } catch {
        /* ignore */
      }
      clearAudioUnlockRef.current?.();
      clearAudioUnlockRef.current = null;
    };
  }, [hideChrome, killTimeline, reduced]);

  /**
   * Start/resume the trailer track. Browsers often reject unmuted autoplay when
   * `/speech` is opened cold or after navigation loses the click gesture — arm a
   * one-shot document gesture unlock and surface "Tap for sound".
   * Held in a ref so gesture unlock can call the latest implementation without
   * accessing the callback before declaration.
   *
   * Cold CF loads of the multi-MB trailer need more than a few hundred ms of
   * buffer headroom; we wait for HAVE_FUTURE_DATA (or canplay) up to 8s.
   */
  const ensureAudioPlayingRef = useRef<
    (opts?: { seekToTimeline?: boolean }) => Promise<boolean>
  >(async () => false);

  const waitForAudioData = useCallback(async (audio: HTMLAudioElement, maxMs = 8000) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return true;
    }
    // Kick the network if preload has not started.
    try {
      audio.load();
    } catch {
      /* ignore */
    }
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        audio.removeEventListener('canplay', onReady);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('loadeddata', onReady);
        audio.removeEventListener('error', onError);
        window.clearTimeout(timer);
        resolve(ok);
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timer = window.setTimeout(() => {
        // Proceed with whatever we have so a gesture play still attempts.
        finish(audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
      }, maxMs);
      audio.addEventListener('canplay', onReady, { once: true });
      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('loadeddata', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
    });
  }, []);

  const ensureAudioPlaying = useCallback(async (opts?: { seekToTimeline?: boolean }) => {
    const audio = audioRef.current;
    if (!audio) {
      setMediaLoading(false);
      return false;
    }

    // Surface spinner while the trailer buffers (cold CF / first play).
    if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      setMediaLoading(true);
      setStatus(copy.a11y.loading);
    }

    try {
      await waitForAudioData(audio);

      if (opts?.seekToTimeline) {
        const tl = timelineRef.current;
        if (tl && audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
          try {
            audio.currentTime = tl.time();
          } catch {
            /* ignore seek errors */
          }
        }
      }

      audio.muted = mutedRef.current;
      try {
        // Some browsers leave play() pending forever under autoplay policy —
        // race a timeout so we surface "tap for sound" instead of an eternal spinner.
        await Promise.race([
          audio.play(),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => {
              reject(new Error('audio-play-timeout'));
            }, 4000);
          }),
        ]);
        // User may have paused while we waited on buffer / play().
        if (phaseRef.current !== 'playing') {
          audio.pause();
          return false;
        }
        setAudioBlocked(false);
        clearAudioUnlockRef.current?.();
        clearAudioUnlockRef.current = null;
        return true;
      } catch {
        // Do not advance the film without a soundtrack until the user unlocks.
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
        setAudioBlocked(true);
        if (clearAudioUnlockRef.current) {
          return false;
        }
        const unlock = () => {
          void ensureAudioPlayingRef.current({ seekToTimeline: true }).then((ok) => {
            if (ok && phaseRef.current === 'playing') {
              // Audio master: scrub visual to currentTime (never free-run GSAP).
              startScrubLoopRef.current();
            }
          });
        };
        const optsCapture: AddEventListenerOptions = { capture: true };
        document.addEventListener('pointerdown', unlock, optsCapture);
        document.addEventListener('keydown', unlock, optsCapture);
        clearAudioUnlockRef.current = () => {
          document.removeEventListener('pointerdown', unlock, optsCapture);
          document.removeEventListener('keydown', unlock, optsCapture);
        };
        return false;
      }
    } finally {
      // Always clear — cached audio may have started with mediaLoading true.
      setMediaLoading(false);
    }
  }, [waitForAudioData]);
  useEffect(() => {
    ensureAudioPlayingRef.current = ensureAudioPlaying;
  }, [ensureAudioPlaying]);

  const buildTimeline = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return null;
    }

    const q = gsap.utils.selector(stage);

    // Always paused: playback is audio-driven via scrub loop (never tl.play()).
    const tl = gsap.timeline({
      paused: true,
      // Don’t Blink: snappy deceleration into rest (avoid soft power2 defaults)
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        // Scrub reached film end. Prefer audio `ended` for music tail; if music
        // already finished (or is about to), finish the phase here too.
        stopScrubLoop();
        const audio = audioRef.current;
        if (audio) {
          const ended =
            !Number.isFinite(audio.duration) ||
            audio.duration <= 0 ||
            audio.currentTime >= audio.duration - 0.05 ||
            audio.ended;
          if (ended) {
            audio.pause();
          }
          // If audio still playing through its tail, leave it; `ended` handler finishes phase.
        }
        const stageEl = stageRef.current;
        if (stageEl) {
          const qDone = gsap.utils.selector(stageEl);
          gsap.set(qDone('#kinetic-fin-join'), { autoAlpha: 1, y: 0 });
        }
        setJoinReady(true);
        phaseRef.current = 'ended';
        setPhase('ended');
        setStatus(copy.a11y.ended);
      },
    });

    /** Keep background color + data-k-bg attribute in lockstep. */
    const setStageBg = (bg: StageBg, at?: number) => {
      const vars = { backgroundColor: BG[bg] };
      const attrVars = { attr: { 'data-k-bg': bg } };
      if (at === undefined) {
        gsap.set(q('#kinetic-bg'), vars);
        gsap.set(stage, attrVars);
      } else {
        tl.set(q('#kinetic-bg'), vars, at);
        tl.set(stage, attrVars, at);
      }
    };

    // Initial state: hide everything animated; full transform/filter reset for replay safety
    setStageBg('charcoal');
    gsap.set(q('#kinetic-bg'), { backgroundColor: BG.charcoal, filter: 'none' });
    // Primary type: bottom-center origin so scale pops grow up from the shared rail
    gsap.set(q('[data-k-node]'), {
      autoAlpha: 0,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      filter: 'none',
      transformOrigin: '50% 100%',
    });
    // Sticky roots may shake (cough x yoyo) — clear mid-play kill residue on rebuild
    gsap.set(q('[data-k-sticky]'), { autoAlpha: 0, x: 0, transformOrigin: '50% 100%' });
    gsap.set(q('[data-k-sticky-pair]'), { autoAlpha: 0, transformOrigin: '50% 100%' });
    // Drop AQI ramp inline colors so rebuild/replay stays monochrome
    gsap.set(q('[data-k-sticky-pair] [data-k-node]'), { clearProps: 'color' });
    // Morph suffixes stay absolute (longest sizer owns width); baseline-lock via bottom
    gsap.set(q('[data-k-sticky-suffix]'), {
      position: 'absolute',
      left: 0,
      bottom: 0,
      top: 'auto',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      transformOrigin: 'left bottom',
    });
    gsap.set(q('[data-k-dot]'), { autoAlpha: 0, y: 0 });
    gsap.set(q('[data-k-flood-tile]'), { autoAlpha: 0, scale: 0.9, x: 0, y: 0 });
    gsap.set(q('[data-k-cloud-word]'), { autoAlpha: 0, scale: 1, x: 0, y: 0 });
    gsap.set(q('[data-k-rapid-word]'), {
      autoAlpha: 0,
      scale: 1,
      y: 0,
      transformOrigin: '50% 100%',
    });
    gsap.set(q('[data-k-project-delays]'), { autoAlpha: 0 });
    gsap.set(q('[data-k-delay-card]'), {
      autoAlpha: 0,
      scale: 1,
      y: 0,
      transformOrigin: '50% 100%',
    });
    gsap.set(q('[data-k-delay-more]'), {
      autoAlpha: 0,
      scale: 1,
      y: 0,
      transformOrigin: '50% 100%',
    });
    gsap.set(q('#kinetic-endcard'), { autoAlpha: 0, scale: 1 });
    gsap.set(q('#kinetic-roller'), { autoAlpha: 1, scale: 1 });
    gsap.set(q('[data-k-reel]'), { scale: 1 });
    gsap.set(q('[data-k-reel-strip]'), { y: 0 });
    gsap.set(q('#kinetic-fin-join'), { autoAlpha: 0, y: 12 });
    gsap.set(q('[data-k-flood]'), { autoAlpha: 0, scale: 1 });
    gsap.set(q('[data-k-cloud]'), { autoAlpha: 0 });
    gsap.set(q('[data-k-rapid]'), { autoAlpha: 0 });
    gsap.set(q('[data-k-quote]'), {
      autoAlpha: 0,
      y: 0,
      scale: 1,
      transformOrigin: '50% 100%',
    });

    let lastLineSel: string | null = null;
    const { items } = layoutKineticSpeech();

    const sel = (id: string) => `#${id}`;

    /** Heartbeat: scale thump on each kick beat while a node is held. */
    const scheduleHeartbeat = (nodeSel: string, startBeat: number, endBeat: number) => {
      for (const bi of kickBeatsInRange(startBeat, endBeat)) {
        // Skip the first beat (already has enter pop)
        if (bi <= startBeat) {
          continue;
        }
        const t = atBeat(bi);
        tl.to(
          q(nodeSel),
          { scale: 1.08, duration: 0.05, ease: 'power2.out' },
          t,
        );
        tl.to(
          q(nodeSel),
          { scale: 1, duration: 0.12, ease: 'power3.out' },
          t + 0.05,
        );
      }
    };

    const animateLineIn = (
      id: string,
      motion: MotionVerb,
      inn: number,
      at: number,
      options?: { pulse?: boolean },
    ) => {
      const s = sel(id);
      switch (motion) {
        case 'hardcut':
          tl.fromTo(
            q(s),
            { autoAlpha: 0, scale: 1.22 },
            { autoAlpha: 1, scale: 1, duration: Math.max(inn, 0.04), ease: 'none' },
            at,
          );
          break;
        case 'pop':
          tl.fromTo(
            q(s),
            { autoAlpha: 0, scale: 1.16 },
            { autoAlpha: 1, scale: 1, duration: inn, ease: 'expo.out' },
            at,
          );
          if (options?.pulse) {
            tl.to(
              q(s),
              { scale: 1.06, duration: 0.05, yoyo: true, repeat: 1, ease: 'power1.inOut' },
              at + inn,
            );
          }
          break;
        case 'replace': {
          if (lastLineSel) {
            tl.to(
              q(lastLineSel),
              { autoAlpha: 0, y: -10, duration: inn * 0.75, ease: 'power3.in' },
              at,
            );
          }
          tl.fromTo(
            q(s),
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: inn, ease: 'power4.out' },
            at,
          );
          break;
        }
        case 'slide-l':
          tl.fromTo(
            q(s),
            { autoAlpha: 0, x: -80 },
            { autoAlpha: 1, x: 0, duration: inn, ease: 'expo.out' },
            at,
          );
          break;
        case 'slide-r':
          tl.fromTo(
            q(s),
            { autoAlpha: 0, x: 80 },
            { autoAlpha: 1, x: 0, duration: inn, ease: 'expo.out' },
            at,
          );
          break;
        case 'dim':
          tl.fromTo(
            q(s),
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 0.72, y: 0, duration: inn, ease: 'power3.out' },
            at,
          );
          break;
        case 'pulse':
          tl.fromTo(
            q(s),
            { autoAlpha: 0, scale: 1.12 },
            { autoAlpha: 1, scale: 1, duration: inn, ease: 'expo.out' },
            at,
          );
          break;
        case 'rise':
        default:
          tl.fromTo(
            q(s),
            { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, duration: inn, ease: 'power4.out' },
            at,
          );
          break;
      }
    };

    const animateLineOut = (id: string, motion: MotionVerb, out: number, at: number) => {
      const s = sel(id);
      if (motion === 'slide-l') {
        tl.to(q(s), { autoAlpha: 0, x: 72, duration: out, ease: 'power3.in' }, at);
      } else if (motion === 'slide-r') {
        tl.to(q(s), { autoAlpha: 0, x: -72, duration: out, ease: 'power3.in' }, at);
      } else if (motion === 'hardcut' || motion === 'pop') {
        tl.to(q(s), { autoAlpha: 0, duration: out, ease: 'none' }, at);
      } else if (motion === 'replace') {
        tl.to(q(s), { autoAlpha: 0, y: -10, duration: out, ease: 'power3.in' }, at);
      } else {
        tl.to(q(s), { autoAlpha: 0, duration: out, ease: 'power3.in' }, at);
      }
    };

    const softClearLastReplace = (at: number) => {
      if (lastLineSel) {
        tl.to(q(lastLineSel), { autoAlpha: 0, y: -10, duration: 0.08, ease: 'power3.in' }, at);
        lastLineSel = null;
      }
    };

    /**
     * Beat-locked scheduler: every text swap / flood / pulse starts on atBeat(i).
     * Hold lengths are beat counts — never free-running wall-clock.
     */
    const scheduleLaidOut = (
      item: (typeof items)[number],
      next: (typeof items)[number] | undefined,
    ) => {
      const beat = item.beat;
      const startT = atBeat(item.startBeat);
      const endT = atBeat(item.endBeat);

      switch (beat.kind) {
        case 'silence':
          break;

        case 'line': {
          const inn = defaultIn(beat.motion);
          const out = defaultOut(beat.motion);
          const nextIsReplace = next?.beat.kind === 'line' && next.beat.motion === 'replace';

          if (beat.motion === 'replace') {
            animateLineIn(beat.id, beat.motion, inn, startT);
            if (nextIsReplace) {
              lastLineSel = sel(beat.id);
            } else {
              animateLineOut(beat.id, 'replace', out, endT);
              lastLineSel = null;
            }
          } else {
            softClearLastReplace(startT);
            animateLineIn(beat.id, beat.motion, inn, startT);
            animateLineOut(beat.id, beat.motion, out, endT);
            lastLineSel = null;
          }

          if (beat.heartbeat || beat.role === 'slam' || beat.role === 'slam-xl') {
            scheduleHeartbeat(sel(beat.id), item.startBeat, item.endBeat);
          }
          break;
        }

        case 'pair': {
          softClearLastReplace(startT);
          const leadId = `${beat.id}-lead`;
          const hitId = `${beat.id}-hit`;
          const leadMotion = beat.leadMotion ?? (beat.lock ? 'rise' : 'pop');
          const hitMotion = beat.hitMotion ?? 'pop';
          const leadIn = defaultIn(leadMotion);
          const hitIn = defaultIn(hitMotion);

          // Lead on startBeat for holdLead beats; hit lands on the next grid beat after lead
          const hitBeat = item.startBeat + beat.holdLead;
          const hitAt = atBeat(hitBeat);

          animateLineIn(leadId, leadMotion, leadIn, startT);
          tl.to(q(sel(leadId)), { autoAlpha: 0, duration: OUT_SNAP, ease: 'none' }, hitAt);

          animateLineIn(hitId, hitMotion, hitIn, hitAt, { pulse: beat.pulseHit });
          tl.to(q(sel(hitId)), { autoAlpha: 0, duration: OUT_SNAP, ease: 'none' }, endT);

          if (beat.heartbeat) {
            scheduleHeartbeat(sel(leadId), item.startBeat, hitBeat);
            scheduleHeartbeat(sel(hitId), hitBeat, item.endBeat);
          }
          break;
        }

        case 'slide-pair': {
          softClearLastReplace(startT);
          const leftId = `${beat.id}-left`;
          const rightId = `${beat.id}-right`;
          const leftSel = sel(leftId);
          const rightSel = sel(rightId);
          const inn = defaultIn('slide-l');
          const axis = beat.axis ?? 'x';

          if (beat.tussle) {
            // Both words visible — beat-synced tug-of-war (argue motion).
            if (axis === 'y') {
              tl.fromTo(
                q(leftSel),
                { autoAlpha: 0, y: -72, scale: 1 },
                { autoAlpha: 1, y: -18, scale: 1, duration: inn, ease: 'expo.out' },
                startT,
              );
              tl.fromTo(
                q(rightSel),
                { autoAlpha: 0, y: 72, scale: 1 },
                { autoAlpha: 1, y: 18, scale: 1, duration: inn, ease: 'expo.out' },
                startT,
              );
            } else {
              tl.fromTo(
                q(leftSel),
                { autoAlpha: 0, x: -90, scale: 1 },
                { autoAlpha: 1, x: -28, scale: 1, duration: inn, ease: 'expo.out' },
                startT,
              );
              tl.fromTo(
                q(rightSel),
                { autoAlpha: 0, x: 90, scale: 1 },
                { autoAlpha: 1, x: 28, scale: 1, duration: inn, ease: 'expo.out' },
                startT,
              );
            }

            let tug = 0;
            for (const dBeat of wholeBeatsInRange(item.startBeat, item.endBeat)) {
              // First grid beat is the entrance; tug starts on subsequent beats.
              if (dBeat <= item.startBeat) {
                continue;
              }
              const dt = atBeat(dBeat);
              const leftWins = tug % 2 === 0;
              if (axis === 'y') {
                if (leftWins) {
                  tl.to(q(leftSel), { y: -42, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
                  tl.to(q(rightSel), { y: 8, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
                } else {
                  tl.to(q(rightSel), { y: 42, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
                  tl.to(q(leftSel), { y: -8, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
                }
              } else if (leftWins) {
                tl.to(q(leftSel), { x: -56, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
                tl.to(q(rightSel), { x: 12, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
              } else {
                tl.to(q(rightSel), { x: 56, scale: 1.12, duration: 0.08, ease: 'power2.out' }, dt);
                tl.to(q(leftSel), { x: -12, scale: 0.9, duration: 0.08, ease: 'power2.out' }, dt);
              }
              tug += 1;
            }

            tl.to(q(leftSel), { autoAlpha: 0, duration: 0.1, ease: 'power3.in' }, endT);
            tl.to(q(rightSel), { autoAlpha: 0, duration: 0.1, ease: 'power3.in' }, endT);
            tl.set(q(leftSel), { x: 0, y: 0, scale: 1 }, endT + 0.1);
            tl.set(q(rightSel), { x: 0, y: 0, scale: 1 }, endT + 0.1);
          } else {
            animateLineIn(leftId, 'slide-l', inn, startT);
            // Right lands one half-beat later for stereo punch, still on grid
            animateLineIn(rightId, 'slide-r', inn, startT + KINETIC_BEAT / 2);
            animateLineOut(leftId, 'slide-l', 0.1, endT);
            animateLineOut(rightId, 'slide-r', 0.1, endT);
          }
          break;
        }

        case 'sticky': {
          softClearLastReplace(startT);
          const root = sel(beat.id);
          const prefixId = `${beat.id}-prefix`;
          const dotsRoot = `${beat.id}-dots`;
          // Text morph (Deadline) OR empty-suffix + dots (Still waiting) use step-local ellipsis
          // inside the suffix slot — same body-size "..." as Deadline extended...
          const hasVisibleSuffix =
            beat.steps.some((s) => s.suffix.length > 0) ||
            beat.steps.some((s) => (s.dots ?? 0) > 0);
          // All morph stickies: opacity stack + longest sizer (no relative/absolute width dance).
          // Wide Demand keeps a punchier scale; cough keeps heave/shake intentionally.
          const wideStack = Boolean(beat.wide);
          const isCough = Boolean(beat.cough);

          /**
           * Cough jolt: body heave (y up) + scale punch + micro-rotate, then settle.
           * Second hit is stronger; optional root shake sells the double-cough spasm.
           */
          const scheduleCoughJolt = (
            nodeSel: string,
            at: number,
            intensity: number,
            options?: { shakeRoot?: boolean },
          ) => {
            const yUp = -16 * intensity;
            const scalePeak = 1 + 0.2 * intensity;
            const rot = -3 * intensity;
            tl.fromTo(
              q(nodeSel),
              {
                autoAlpha: 0,
                y: 10 * intensity,
                scale: 0.88,
                rotation: rot * 0.4,
              },
              {
                autoAlpha: 1,
                y: yUp,
                scale: scalePeak,
                rotation: rot,
                duration: 0.055,
                ease: 'power4.out',
              },
              at,
            );
            // Settle through a second micro-heave (double-cough rattle)
            tl.to(
              q(nodeSel),
              {
                y: yUp * 0.35,
                scale: 1 + 0.06 * intensity,
                rotation: rot * -0.35,
                duration: 0.05,
                ease: 'power2.in',
              },
              at + 0.055,
            );
            tl.to(
              q(nodeSel),
              {
                y: 0,
                scale: 1,
                rotation: 0,
                duration: 0.1,
                ease: 'power3.out',
              },
              at + 0.105,
            );
            if (options?.shakeRoot) {
              tl.fromTo(
                q(root),
                { x: 0 },
                {
                  x: 5 * intensity,
                  duration: 0.03,
                  yoyo: true,
                  repeat: 5,
                  ease: 'power1.inOut',
                },
                at,
              );
              tl.set(q(root), { x: 0 }, at + 0.2);
            }
          };

          // Beat 0: plant prefix. Default co-plants first visible suffix (Deadline / We want).
          // `prefixHold` delays the first suffix (Cough → Cough Cough); empty-suffix defaults to 1.
          let bi = item.startBeat;
          const prefixHold = stickyPrefixHoldBeats(beat);
          tl.set(q(root), { autoAlpha: 1 }, atBeat(bi));
          // Cough: first bark. Wide Demand: firmer plant. Else soft sticky plant.
          if (isCough) {
            scheduleCoughJolt(sel(prefixId), atBeat(bi), 1, { shakeRoot: true });
          } else if (wideStack) {
            tl.fromTo(
              q(sel(prefixId)),
              { autoAlpha: 0, y: 12, scale: 1.06 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.05, ease: 'expo.out' },
              atBeat(bi),
            );
          } else {
            tl.fromTo(
              q(sel(prefixId)),
              { autoAlpha: 0, y: 10 },
              { autoAlpha: 1, y: 0, duration: IN_SNAP, ease: 'power4.out' },
              atBeat(bi),
            );
          }
          bi += prefixHold;

          beat.steps.forEach((step, i) => {
            const sufId = `${beat.id}-s${i}`;
            const stepT = atBeat(bi);
            if (i > 0) {
              const prevId = `${beat.id}-s${i - 1}`;
              // Opacity + light scale only (no y); origin left-bottom keeps painted baseline stable
              if (wideStack) {
                tl.to(
                  q(sel(prevId)),
                  {
                    autoAlpha: 0,
                    scale: 0.94,
                    transformOrigin: 'left bottom',
                    duration: 0.04,
                    ease: 'power3.in',
                  },
                  stepT,
                );
                tl.set(q(sel(prevId)), { scale: 1 }, stepT + 0.04);
              } else {
                tl.to(
                  q(sel(prevId)),
                  {
                    autoAlpha: 0,
                    scale: 0.96,
                    transformOrigin: 'left bottom',
                    duration: OUT_SNAP,
                    ease: 'power3.in',
                  },
                  stepT,
                );
                tl.set(q(sel(prevId)), { scale: 1 }, stepT + OUT_SNAP);
              }
            }
            // Cough second bark (stronger + root shake). Else opacity + scale morph (no y drift).
            if (isCough) {
              scheduleCoughJolt(sel(sufId), stepT, 1.25, { shakeRoot: true });
              // First cough re-spasm when the second hits — double-cough feel
              tl.to(
                q(sel(prefixId)),
                {
                  y: -10,
                  scale: 1.08,
                  rotation: -2,
                  duration: 0.045,
                  ease: 'power3.out',
                },
                stepT,
              );
              tl.to(
                q(sel(prefixId)),
                {
                  y: 0,
                  scale: 1,
                  rotation: 0,
                  duration: 0.12,
                  ease: 'power3.out',
                },
                stepT + 0.045,
              );
            } else if (wideStack) {
              tl.fromTo(
                q(sel(sufId)),
                { autoAlpha: 0, scale: 1.12, transformOrigin: 'left bottom' },
                {
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.055,
                  ease: 'expo.out',
                },
                stepT,
              );
            } else {
              tl.fromTo(
                q(sel(sufId)),
                { autoAlpha: 0, scale: 1.06, transformOrigin: 'left bottom' },
                {
                  autoAlpha: 1,
                  scale: 1,
                  duration: IN_SNAP,
                  ease: 'expo.out',
                },
                stepT,
              );
            }
            bi += step.hold;

            // Loading dots trail the active suffix (Deadline morph + Still waiting).
            // Step-local inside the suffix slot so "..." matches body type size.
            // Every whole beat hops a dot; kicks hop harder so the ellipsis reads
            // as percussion, not a free-running loader.
            if (step.dots && step.dots > 0) {
              const dotsScope = hasVisibleSuffix
                ? `${sel(sufId)} [data-k-dot]`
                : `${sel(dotsRoot)} [data-k-dot]`;
              const dots = q(dotsScope);
              const dotsStart = bi;
              const dotsEnd = bi + step.dots;
              tl.set(dots, { autoAlpha: 0, y: 0 }, atBeat(dotsStart));
              let beatIdx = 0;
              for (const dBeat of wholeBeatsInRange(dotsStart, dotsEnd)) {
                const dt = atBeat(dBeat);
                const which = beatIdx % 3;
                const onKick = isKickBeat(dBeat);
                const hopY = onKick ? -12 : -7;
                // Progressive reveal for the first three beats, then cycle jumps
                if (beatIdx < 3) {
                  for (let d = 0; d <= which; d += 1) {
                    tl.set(
                      q(`${dotsScope}:nth-child(${d + 1})`),
                      { autoAlpha: 1 },
                      dt,
                    );
                  }
                } else {
                  tl.set(dots, { autoAlpha: 1, y: 0 }, dt);
                }
                tl.fromTo(
                  q(`${dotsScope}:nth-child(${which + 1})`),
                  { y: 0, scale: 1 },
                  {
                    y: hopY,
                    scale: onKick ? 1.35 : 1.12,
                    duration: onKick ? 0.07 : 0.08,
                    ease: 'power2.out',
                  },
                  dt,
                );
                tl.to(
                  q(`${dotsScope}:nth-child(${which + 1})`),
                  {
                    y: 0,
                    scale: 1,
                    duration: onKick ? 0.11 : 0.12,
                    ease: 'power2.in',
                  },
                  dt + (onKick ? 0.07 : 0.08),
                );
                beatIdx += 1;
              }
              tl.to(dots, { autoAlpha: 0, y: 0, scale: 1, duration: 0.08 }, atBeat(dotsEnd));
              bi = dotsEnd;
            }
          });

          // Deadline / Still waiting: whole phrase thumps on kicks (dots hop separately)
          if (beat.heartbeat) {
            scheduleHeartbeat(root, item.startBeat, item.endBeat);
          }

          bi += beat.exitHold ?? 0;
          const outT = atBeat(Math.min(bi, item.endBeat));
          tl.to(q(root), { autoAlpha: 0, duration: OUT_SNAP, ease: 'power3.in' }, outT);
          tl.set(
            q(`${root} [data-k-node]`),
            { autoAlpha: 0, y: 0, scale: 1, x: 0, rotation: 0 },
            outT + OUT_SNAP,
          );
          tl.set(q(root), { x: 0 }, outT + OUT_SNAP);
          // Reset morph suffixes to absolute baseline-locked stack for the next play-through
          if (hasVisibleSuffix) {
            tl.set(
              q(`${root} [data-k-sticky-suffix]`),
              {
                position: 'absolute',
                left: 0,
                bottom: 0,
                top: 'auto',
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                transformOrigin: 'left bottom',
              },
              outT + OUT_SNAP,
            );
          }
          // Reset both shared post-prefix dots and step-local trailing dots
          tl.set(q(`${root} [data-k-dot]`), { autoAlpha: 0, y: 0 }, outT + OUT_SNAP);
          break;
        }

        case 'sticky-pair': {
          softClearLastReplace(startT);
          const root = sel(beat.id);
          const fixedId = `${beat.id}-fixed`;
          const swapBase = `${beat.id}-swap`;
          let bi = item.startBeat;

          tl.set(q(root), { autoAlpha: 1 }, atBeat(bi));
          tl.fromTo(
            q(sel(fixedId)),
            { autoAlpha: 0, scale: 1.14 },
            { autoAlpha: 1, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
            atBeat(bi),
          );
          bi += 1;

          beat.steps.forEach((step, i) => {
            const swapId = `${swapBase}-${i}`;
            const stepT = atBeat(bi);
            if (i > 0) {
              tl.to(
                q(sel(`${swapBase}-${i - 1}`)),
                { autoAlpha: 0, y: -8, duration: OUT_SNAP, ease: 'power3.in' },
                stepT,
              );
            }
            const stepColor = step.color;
            tl.fromTo(
              q(sel(swapId)),
              { autoAlpha: 0, y: 10, ...(stepColor ? { color: stepColor } : {}) },
              {
                autoAlpha: 1,
                y: 0,
                duration: IN_SNAP,
                ease: 'expo.out',
                ...(stepColor ? { color: stepColor } : {}),
              },
              stepT,
            );
            // Intentional AQI ramp: paint fixed label to match the rising number
            if (stepColor) {
              tl.to(
                q(sel(fixedId)),
                { color: stepColor, duration: IN_SNAP, ease: 'none' },
                stepT,
              );
            }
            // Pulse fixed word (e.g. Chalta Hai.) on every kick in the step window,
            // including the entry beat so 1-beat holds still thump.
            if (beat.pulseFixed) {
              for (const kb of kickBeatsInRange(bi, bi + step.hold)) {
                const kt = atBeat(kb);
                // Entry kick: slight offset so it doesn't fight the swap fromTo at bi
                const pulseAt = kb === bi ? kt + 0.02 : kt;
                tl.to(q(sel(fixedId)), { scale: 1.08, duration: 0.05, ease: 'power2.out' }, pulseAt);
                tl.to(
                  q(sel(fixedId)),
                  { scale: 1, duration: 0.12, ease: 'power3.out' },
                  pulseAt + 0.05,
                );
              }
            }
            bi += step.hold;
          });

          tl.to(q(root), { autoAlpha: 0, duration: OUT_SNAP }, endT);
          // clearProps color so AQI ramp never leaks into replay monochrome
          tl.set(
            q(`${root} [data-k-node]`),
            { autoAlpha: 0, y: 0, scale: 1, clearProps: 'color' },
            endT + OUT_SNAP,
          );
          break;
        }

        case 'flood': {
          softClearLastReplace(startT);
          const floodRoot = sel(beat.id);
          const tileEls = gsap.utils.toArray<Element>(q(`${floodRoot} [data-k-flood-tile]`));
          tl.set(q(floodRoot), { autoAlpha: 1, scale: 1 }, startT);
          tl.set(tileEls, { autoAlpha: 0, scale: 0.85, x: 0, y: 0 }, startT);

          // One batch of tiles pops on every whole beat — only tween that slice
          const floodBeats = wholeBeatsInRange(item.startBeat, item.endBeat);
          const tileCount = Math.max(1, tileEls.length || beat.count);
          floodBeats.forEach((bi, idx) => {
            const t = atBeat(bi);
            const from = Math.floor((idx / Math.max(1, floodBeats.length)) * tileCount);
            const to = Math.floor(((idx + 1) / Math.max(1, floodBeats.length)) * tileCount);
            const batch = tileEls.slice(from, Math.max(to, from + 1));
            if (batch.length > 0) {
              tl.to(
                batch,
                {
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.08,
                  ease: 'expo.out',
                  stagger: { each: 0.01 },
                },
                t,
              );
            }
            // Kick beats: brightness flash, then fully rest scale at 1
            if (isKickBeat(bi)) {
              tl.to(
                q('#kinetic-bg'),
                {
                  filter: 'brightness(1.4)',
                  duration: 0.04,
                  yoyo: true,
                  repeat: 1,
                  ease: 'none',
                },
                t,
              );
              tl.to(q(floodRoot), { scale: 1.06, duration: 0.06, ease: 'power2.out' }, t);
              tl.to(q(floodRoot), { scale: 1, duration: 0.1, ease: 'power2.in' }, t + 0.06);
            }
          });

          if (beat.shake) {
            const mid = atBeat(item.startBeat + beat.duration / 2);
            tl.to(
              tileEls,
              {
                x: '+=3',
                duration: 0.035,
                yoyo: true,
                repeat: 8,
                ease: 'power1.inOut',
                stagger: { each: 0.008, from: 'random' },
              },
              mid,
            );
          }

          tl.set(q(floodRoot), { autoAlpha: 0, scale: 1 }, endT);
          tl.set(tileEls, { autoAlpha: 0, scale: 0.85, x: 0, y: 0 }, endT);
          tl.set(q('#kinetic-bg'), { filter: 'none' }, endT);
          break;
        }

        case 'cloud': {
          softClearLastReplace(startT);
          const cloudRoot = sel(beat.id);
          const wordEls = gsap.utils.toArray<HTMLElement>(
            q(`${cloudRoot} [data-k-cloud-word]`),
          );
          tl.set(q(cloudRoot), { autoAlpha: 1 }, startT);
          tl.set(wordEls, { autoAlpha: 0, scale: 1, x: 0, y: 0 }, startT);
          // One word per beat — tween only that element, not the full collection
          wholeBeatsInRange(item.startBeat, item.endBeat).forEach((bi, idx) => {
            const el = wordEls[idx];
            if (!el) {
              return;
            }
            tl.to(el, { autoAlpha: 1, duration: 0.12 }, atBeat(bi));
          });
          tl.to(q(cloudRoot), { autoAlpha: 0, duration: 0.2 }, endT - 0.2);
          tl.set(wordEls, { autoAlpha: 0, scale: 1, x: 0, y: 0 }, endT);
          break;
        }

        case 'rapid': {
          softClearLastReplace(startT);
          const rapidRoot = sel(beat.id);
          const holdEach = beat.holdEach ?? 1;
          tl.set(q(rapidRoot), { autoAlpha: 1 }, startT);
          tl.set(
            q(`${rapidRoot} [data-k-rapid-word]`),
            { autoAlpha: 0, scale: 1, y: 0 },
            startT,
          );

          beat.words.forEach((_, i) => {
            const wordId = `${beat.id}-w${i}`;
            const wordStart = item.startBeat + i * holdEach;
            const wordEnd = wordStart + holdEach;
            const t0 = atBeat(wordStart);
            const t1 = atBeat(wordEnd);
            if (i > 0) {
              tl.to(
                q(sel(`${beat.id}-w${i - 1}`)),
                { autoAlpha: 0, y: -10, scale: 0.96, duration: OUT_SNAP, ease: 'power3.in' },
                t0,
              );
            }
            tl.fromTo(
              q(sel(wordId)),
              { autoAlpha: 0, y: 14, scale: 1.06 },
              { autoAlpha: 1, y: 0, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
              t0,
            );
            if (i === beat.words.length - 1) {
              tl.to(
                q(sel(wordId)),
                { autoAlpha: 0, duration: OUT_SNAP, ease: 'power3.in' },
                t1,
              );
            }
          });

          tl.set(q(rapidRoot), { autoAlpha: 0 }, endT);
          tl.set(
            q(`${rapidRoot} [data-k-rapid-word]`),
            { autoAlpha: 0, scale: 1, y: 0 },
            endT,
          );
          break;
        }

        case 'quote': {
          softClearLastReplace(startT);
          const root = sel(beat.id);
          const inn = defaultIn('rise');
          tl.fromTo(
            q(root),
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: inn, ease: 'power4.out' },
            startT,
          );
          tl.to(q(root), { autoAlpha: 0, duration: OUT_SNAP, ease: 'power3.in' }, endT);
          tl.set(q(root), { y: 0 }, endT + OUT_SNAP);
          break;
        }

        case 'project-delays': {
          softClearLastReplace(startT);
          const root = sel(beat.id);
          const holdEach = beat.holdEach ?? 3;
          const cardCount = beat.projects.length;
          // Root visible for the whole section; cards hardcut on the grid.
          tl.set(q(root), { autoAlpha: 1 }, startT);
          tl.set(
            q(`${root} [data-k-delay-card]`),
            { autoAlpha: 0, scale: 1, y: 0 },
            startT,
          );
          tl.set(q(`${root} [data-k-delay-more]`), { autoAlpha: 0, scale: 1, y: 0 }, startT);

          beat.projects.forEach((_, i) => {
            const cardId = `${beat.id}-p${i}`;
            const cardStart = item.startBeat + i * holdEach;
            const cardEnd = cardStart + holdEach;
            const t0 = atBeat(cardStart);
            const t1 = atBeat(cardEnd);
            if (i > 0) {
              tl.to(
                q(sel(`${beat.id}-p${i - 1}`)),
                { autoAlpha: 0, y: -12, scale: 0.96, duration: OUT_SNAP, ease: 'power3.in' },
                t0,
              );
            }
            tl.fromTo(
              q(sel(cardId)),
              { autoAlpha: 0, y: 16, scale: 1.04 },
              { autoAlpha: 1, y: 0, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
              t0,
            );
            // Each delayed-project card thumps on kicks while held (delay machine pulse)
            scheduleHeartbeat(sel(cardId), cardStart, cardEnd);
            if (i === cardCount - 1) {
              tl.to(
                q(sel(cardId)),
                { autoAlpha: 0, y: -12, scale: 0.96, duration: OUT_SNAP, ease: 'power3.in' },
                t1,
              );
            }
          });

          const moreStart = item.startBeat + cardCount * holdEach;
          const moreT0 = atBeat(moreStart);
          tl.fromTo(
            q(`${root} [data-k-delay-more]`),
            { autoAlpha: 0, y: 18, scale: 1.08 },
            { autoAlpha: 1, y: 0, scale: 1, duration: IN_SNAP, ease: 'expo.out' },
            moreT0,
          );
          // Kick thump on the slam "1000+ more." while held
          scheduleHeartbeat(`${root} [data-k-delay-more]`, moreStart, item.endBeat);

          tl.set(q(root), { autoAlpha: 0 }, endT);
          tl.set(
            q(`${root} [data-k-delay-card]`),
            { autoAlpha: 0, scale: 1, y: 0 },
            endT,
          );
          tl.set(q(`${root} [data-k-delay-more]`), { autoAlpha: 0, scale: 1, y: 0 }, endT);
          break;
        }

        case 'endcard': {
          softClearLastReplace(startT);
          setStageBg('charcoal', startT);
          tl.fromTo(
            q('#kinetic-endcard'),
            { autoAlpha: 0, scale: 1.04 },
            { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power4.out' },
            startT,
          );
          // Join hidden until reels settle; music may continue past that.
          tl.set(q('#kinetic-fin-join'), { autoAlpha: 0, y: 12 }, startT);

          // All three slots visible from frame 0 — step adjectives, then lock data · janta · party
          const cellEm = kineticSpeechReelCellEm;
          const spinDepth = kineticSpeechRollerSpinDepth;
          const virtueHoldBeats = kineticSpeechRollerVirtueHoldBeats;
          const virtueIndiaBeats = kineticSpeechRollerVirtueIndiaBeats;
          const domainLockGap = kineticSpeechRollerDomainLockGapBeats;
          const phase1EndBeat = item.startBeat + virtueIndiaBeats;

          const domainStrips = gsap.utils.toArray<HTMLElement>(
            q('[data-k-reel-strip][data-k-domain-reel]'),
          );
          // Phase 1: each of 3 reels steps through adjectives on the beat (offset per reel)
          domainStrips.forEach((strip, i) => {
            const steps = Number(strip.dataset.kReelSteps ?? String(spinDepth));
            tl.set(strip, { y: 0 }, startT);
            for (let s = 1; s <= spinDepth; s += 1) {
              // Stagger reel steps by half a hold so they don't all land on the same word
              const stepBeat = item.startBeat + s * virtueHoldBeats + (i % 2);
              const cell = Math.min(s, steps - 1);
              tl.to(
                strip,
                {
                  y: `-${cell * cellEm}em`,
                  duration: 0.1,
                  ease: 'power2.out',
                },
                atBeat(Math.min(stepBeat, phase1EndBeat)),
              );
            }
          });

          // Phase 2: lock data → janta → party one by one (still same three reels)
          domainStrips.forEach((strip, i) => {
            const steps = Number(strip.dataset.kReelSteps ?? String(spinDepth));
            const finalY = `-${steps * cellEm}em`;
            const lockBeat = phase1EndBeat + (i + 1) * domainLockGap;
            const lockT = atBeat(lockBeat);
            tl.to(strip, { y: finalY, duration: 0.12, ease: 'power2.out' }, lockT);
            tl.fromTo(
              q(`[data-k-domain-slot="${i}"]`),
              { scale: 1 },
              { scale: 1.05, duration: 0.05, yoyo: true, repeat: 1, ease: 'power2.out' },
              lockT,
            );
          });

          // After last reel locks + one hold gap: show Join (interactive while music tails out)
          const settleBeat = phase1EndBeat + domainStrips.length * domainLockGap + 1;
          const settleT = atBeat(settleBeat);
          tl.to(
            q('#kinetic-fin-join'),
            { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power4.out' },
            settleT,
          );
          tl.call(
            () => {
              setJoinReady(true);
            },
            undefined,
            settleT,
          );

          // Heartbeat on roller from endcard start through kick map up to audio-end bound.
          // Uses analyzed kicks only (no residual pulse after last kick ~4s before 142s).
          // Timeline still spans getKineticSpeechFilmDurationSec ≈ audio end.
          const audioEndBeat = getKineticSpeechAudioEndBeat();
          scheduleHeartbeat('#kinetic-roller', item.startBeat, audioEndBeat);
          // Visual hold only — timeline length is extended to audio end below
          tl.to({}, { duration: kineticSpeechEndcardHoldSec }, startT + 0.28);
          break;
        }

        default:
          break;
      }
    };

    for (let i = 0; i < items.length; i += 1) {
      scheduleLaidOut(items[i]!, items[i + 1]);
    }

    // Span to max(visual end, audio duration) so onComplete waits for music.
    const filmEndSec = getKineticSpeechFilmDurationSec();
    tl.to({}, { duration: 0.01 }, filmEndSec);

    return tl;
  }, [stopScrubLoop]);

  const syncDevSlideHash = useCallback(
    (timeSec: number) => {
      if (!isDevSlideNav || slideCount === 0) {
        return;
      }
      const next = slideIndexAtTime(slideItems, timeSec);
      if (next > 0 && next !== slideIndexRef.current) {
        slideIndexRef.current = next;
        setSlideIndex(next);
        replaceKineticSlideHash(next);
      }
    },
    [isDevSlideNav, slideCount, slideItems],
  );

  /**
   * TRANSPORT — audio is master clock; GSAP is a scrubbed visual track.
   *
   * While phase is playing and audio is actually playing, each rAF sets
   * `tl.time(audio.currentTime)`. Pause = stop audio + stop scrub. Visual freezes
   * on the last scrubbed frame. Never free-run the timeline with tl.play().
   */
  const scrubVisualToAudio = useCallback(() => {
    const audio = audioRef.current;
    const tl = timelineRef.current;
    if (!audio || !tl || phaseRef.current !== 'playing') {
      return;
    }
    // Frozen until soundtrack is unlocked / actually playing.
    if (audio.paused || audio.ended) {
      return;
    }
    // Keep timeline paused; only drive playhead from media time.
    if (typeof tl.paused === 'function' && !tl.paused()) {
      tl.pause();
    }
    const t = audio.currentTime;
    // seek() renders the full state at t more reliably than time() alone for paused TLs.
    if (typeof tl.seek === 'function') {
      tl.seek(t);
    } else {
      tl.time(t);
    }
    if (typeof tl.pause === 'function') {
      tl.pause();
    }
    if (isDevSlideNav) {
      syncDevSlideHash(t);
    }
  }, [isDevSlideNav, syncDevSlideHash]);

  const startScrubLoop = useCallback(() => {
    const tick = () => {
      if (phaseRef.current !== 'playing') {
        scrubRafRef.current = null;
        return;
      }
      scrubVisualToAudio();
      scrubRafRef.current = requestAnimationFrame(tick);
    };
    stopScrubLoop();
    scrubRafRef.current = requestAnimationFrame(tick);
  }, [scrubVisualToAudio, stopScrubLoop]);

  useEffect(() => {
    startScrubLoopRef.current = startScrubLoop;
  }, [startScrubLoop]);

  /**
   * One-pass track: when audio ends naturally, finish film phase.
   * Do not soft-loop — music should play cleanly to the end.
   * Audio end is authoritative for the music tail.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const onEnded = () => {
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'paused') {
        return;
      }
      stopScrubLoop();
      const stageEl = stageRef.current;
      if (stageEl) {
        const qDone = gsap.utils.selector(stageEl);
        gsap.set(qDone('#kinetic-fin-join'), { autoAlpha: 1, y: 0 });
      }
      setJoinReady(true);
      phaseRef.current = 'ended';
      setPhase('ended');
      setStatus(copy.a11y.ended);
      // Snap visual to complete if still mid-tail hold
      const tl = timelineRef.current;
      if (tl && tl.progress() < 1) {
        tl.progress(1);
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [stopScrubLoop]);

  const startFilm = useCallback(async (): Promise<boolean> => {
    if (reduced) {
      setMediaLoading(false);
      phaseRef.current = 'ended';
      setPhase('ended');
      setStatus(copy.a11y.ended);
      return true;
    }

    // New session: supersede any prior in-flight start (Strict Mode / double invoke).
    const session = (filmSessionRef.current += 1);

    // Drop endcard interactivity immediately (before await audio.play)
    // so replay cannot leave hidden Join/URL/Sources focusable.
    setJoinReady(false);
    setEndcardSourcesOpen(false);
    stopScrubLoop();
    phaseRef.current = 'playing';
    setPhase('playing');
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.id === 'kinetic-fin-join' ||
          active.id === 'kinetic-fin-url' ||
          active.closest?.('#kinetic-endcard') ||
          active.closest?.('#kinetic-endcard-sources-content'))
      ) {
        active.blur();
      }
    }

    killTimeline();
    // killTimeline does not bump session — we own the session for this start.
    let tl = buildTimeline();
    if (!tl) {
      setMediaLoading(false);
      return false;
    }
    timelineRef.current = tl;
    // Visual starts frozen at 0; only advances when scrub follows audio.
    tl.pause(0);

    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    // Spinner while trailer buffers; skip flash when audio is already ready (replay).
    if (!audio || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      setMediaLoading(true);
      setStatus(copy.a11y.loading);
    }
    const audioOk = await ensureAudioPlaying();

    // Stale start after unmount / newer startFilm — leave transport to the new session.
    // ensureAudioPlaying's finally already cleared the loading spinner.
    if (session !== filmSessionRef.current) {
      return false;
    }
    if (phaseRef.current !== 'playing') {
      // User paused (or left) while buffering / play() was pending.
      audioRef.current?.pause();
      setMediaLoading(false);
      return false;
    }

    // Timeline may have been killed during the await (remount cleanup). Rebuild.
    tl = timelineRef.current;
    if (!tl) {
      tl = buildTimeline();
      if (!tl) {
        setMediaLoading(false);
        audioRef.current?.pause();
        return false;
      }
      timelineRef.current = tl;
      tl.pause(0);
    }

    if (!audioOk) {
      // Autoplay blocked or media not ready — hold visual at 0 until unlock.
      tl.pause(0);
      setStatus(copy.a11y.soundBlocked);
      return true;
    }

    setStatus(copy.a11y.playing);
    if (isDevSlideNav && slideCount > 0) {
      slideIndexRef.current = 1;
      setSlideIndex(1);
      replaceKineticSlideHash(1);
    }
    // Scrub loop drives GSAP from audio.currentTime — no tl.play().
    startScrubLoop();
    return true;
  }, [
    buildTimeline,
    ensureAudioPlaying,
    isDevSlideNav,
    killTimeline,
    reduced,
    slideCount,
    startScrubLoop,
    stopScrubLoop,
  ]);

  const pauseFilm = useCallback(() => {
    // Single pause path: stop scrub first so no later tick advances visuals,
    // then pause audio. Timeline stays paused (never free-ran).
    phaseRef.current = 'paused';
    stopScrubLoop();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    // Belt-and-suspenders: timeline should already be paused (never free-ran).
    timelineRef.current?.pause();
    setPhase('paused');
    setStatus(copy.a11y.paused);
    // Don't clear unlock while paused — resume still needs gesture if never unlocked
  }, [stopScrubLoop]);

  const resumeFilm = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    // Rebuild visual track if a remount/race left audio alive without a timeline.
    let tl = timelineRef.current;
    if (!tl) {
      tl = buildTimeline();
      if (!tl) {
        return;
      }
      timelineRef.current = tl;
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      if (typeof tl.seek === 'function') {
        tl.seek(t);
      } else {
        tl.time(t);
      }
      tl.pause();
    }
    // Mark playing before async audio work so unlock handlers see the intent.
    phaseRef.current = 'playing';
    setPhase('playing');
    setStatus(copy.a11y.playing);
    // Align audio to last visual frame, then play audio only.
    const audioOk = await ensureAudioPlaying({ seekToTimeline: true });
    if (phaseRef.current !== 'playing') {
      // User paused again while we waited on buffer / play().
      audio.pause();
      return;
    }
    if (!audioOk) {
      // Keep visual frozen until soundtrack unlock (same as cold-start policy).
      setStatus(copy.a11y.soundBlocked);
      return;
    }
    startScrubLoop();
  }, [buildTimeline, ensureAudioPlaying, startScrubLoop]);

  const replayFilm = useCallback(() => {
    void startFilm();
  }, [startFilm]);

  /** Big play gate — poster starts the film; paused resumes in place. */
  const onPlayGate = useCallback(() => {
    if (phaseRef.current === 'paused') {
      void resumeFilm();
      return;
    }
    void startFilm();
  }, [resumeFilm, startFilm]);

  /**
   * Build timeline if missing (for mid-film scrub from poster / after kill).
   * Does not play or reset audio — caller seeks and plays.
   */
  const ensureTimeline = useCallback(() => {
    if (timelineRef.current) {
      return timelineRef.current;
    }
    const tl = buildTimeline();
    if (!tl) {
      return null;
    }
    timelineRef.current = tl;
    return tl;
  }, [buildTimeline]);

  /**
   * DEV: jump to 1-based slide start (timeline + audio + hash).
   * Mirrors pause state: stays paused if already paused; else plays from slide.
   */
  const seekToSlide = useCallback(
    async (index1: number) => {
      if (!isDevSlideNav || reduced || slideCount === 0) {
        return;
      }
      if (!Number.isInteger(index1) || index1 < 1 || index1 > slideCount) {
        return;
      }

      const item = slideItems[index1 - 1];
      if (!item) {
        return;
      }
      const t = kineticSlideTimeSec(item);
      const stayPaused = phaseRef.current === 'paused';

      setJoinReady(false);
      setEndcardSourcesOpen(false);

      // Rebuild if missing (poster / cold seek / after kill).
      let tl = timelineRef.current;
      if (!tl) {
        tl = ensureTimeline();
      }
      if (!tl) {
        return;
      }

      slideIndexRef.current = index1;
      setSlideIndex(index1);
      suppressHashSeekRef.current = true;
      replaceKineticSlideHash(index1);
      // Clear suppress on next microtask so manual hash edits still work
      queueMicrotask(() => {
        suppressHashSeekRef.current = false;
      });

      // GSAP: seek renders all tweens/calls up to t (timeline stays paused).
      if (typeof tl.seek === 'function') {
        tl.seek(t);
      } else {
        tl.time(t);
      }
      tl.pause();

      const audio = audioRef.current;
      if (audio) {
        try {
          audio.currentTime = t;
        } catch {
          /* ignore seek errors */
        }
        audio.muted = muted;
      }

      if (stayPaused) {
        stopScrubLoop();
        audio?.pause();
        setMediaLoading(false);
        phaseRef.current = 'paused';
        setPhase('paused');
        setStatus(copy.a11y.paused);
      } else {
        phaseRef.current = 'playing';
        setPhase('playing');
        setStatus(copy.a11y.playing);
        const audioOk = await ensureAudioPlaying({ seekToTimeline: true });
        if (phaseRef.current !== 'playing') {
          audio?.pause();
          setMediaLoading(false);
          return;
        }
        if (!audioOk) {
          setMediaLoading(false);
          setStatus(copy.a11y.soundBlocked);
          return;
        }
        setMediaLoading(false);
        startScrubLoop();
      }
    },
    [
      ensureAudioPlaying,
      ensureTimeline,
      isDevSlideNav,
      muted,
      reduced,
      slideCount,
      slideItems,
      startScrubLoop,
      stopScrubLoop,
    ],
  );

  const seekPrevSlide = useCallback(() => {
    const cur = slideIndexRef.current > 0 ? slideIndexRef.current : 1;
    void seekToSlide(Math.max(1, cur - 1));
  }, [seekToSlide]);

  const seekNextSlide = useCallback(() => {
    const cur = slideIndexRef.current > 0 ? slideIndexRef.current : 0;
    void seekToSlide(Math.min(slideCount, cur + 1));
  }, [seekToSlide, slideCount]);

  // DEV: hash deep-link + browser hash edits → seek
  useEffect(() => {
    if (!isDevSlideNav || reduced) {
      return;
    }
    const applyHash = () => {
      if (suppressHashSeekRef.current) {
        return;
      }
      const index1 = parseKineticSlideHash(window.location.hash, slideItems);
      if (index1 == null) {
        return;
      }
      if (index1 === slideIndexRef.current && timelineRef.current) {
        return;
      }
      void seekToSlide(index1);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [isDevSlideNav, reduced, seekToSlide, slideItems]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  /** Explicit control for autoplay-blocked soundtrack (user gesture). */
  const unlockSound = useCallback(() => {
    void ensureAudioPlaying({ seekToTimeline: true }).then((ok) => {
      if (!ok || phaseRef.current !== 'playing') {
        return;
      }
      // Sound-blocked cold start keeps a timeline; remount races may not.
      if (!timelineRef.current) {
        const tl = buildTimeline();
        if (!tl) {
          return;
        }
        timelineRef.current = tl;
        const audio = audioRef.current;
        const t = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        if (typeof tl.seek === 'function') {
          tl.seek(t);
        } else {
          tl.time(t);
        }
        tl.pause();
      }
      startScrubLoop();
      setStatus(copy.a11y.playing);
    });
  }, [buildTimeline, ensureAudioPlaying, startScrubLoop]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement) {
        const el = event.target;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
          return;
        }
        // Don't steal Space from focused links/buttons (Join/URL mid-tail, controls).
        if (
          event.code === 'Space' &&
          el.closest('a, button, [href], [role="button"], summary, select, label')
        ) {
          return;
        }
      }
      if (event.code === 'Space') {
        event.preventDefault();
        // Use phaseRef (sync intent) so rapid Space during async resume cannot race.
        const p = phaseRef.current;
        if (p === 'poster' || p === 'ended') {
          void startFilm();
        } else if (p === 'playing') {
          pauseFilm();
        } else if (p === 'paused') {
          void resumeFilm();
        }
      }
      if (event.key === 'm' || event.key === 'M') {
        toggleMute();
      }
      // DEV slide scrub: arrows / brackets
      if (isDevSlideNav && !reduced) {
        if (event.key === 'ArrowLeft' || event.key === '[') {
          event.preventDefault();
          seekPrevSlide();
        } else if (event.key === 'ArrowRight' || event.key === ']') {
          event.preventDefault();
          seekNextSlide();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isDevSlideNav,
    pauseFilm,
    reduced,
    resumeFilm,
    seekNextSlide,
    seekPrevSlide,
    startFilm,
    toggleMute,
  ]);

  // Interactive after roller settles (joinReady) or full film end — music may still play.
  const endcardInteractive = phase === 'ended' || joinReady;

  if (reduced) {
    return (
      <section
        id="kinetic-speech-film-reduced"
        aria-label={copy.a11y.region}
        className={cn(
          'relative flex min-h-svh w-full flex-col bg-black px-margin-mobile py-16 text-white md:px-gutter',
          className,
        )}
      >
        <h1 id="kinetic-reduced-title" className="kinetic-type-body text-white">
          {copy.poster.reducedMotionTitle}
        </h1>
        <p className="mt-3 text-lg text-white/60" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1894-c9">{copy.poster.kicker}</p>
        <pre
          id="kinetic-transcript-visible"
          className="mt-10 max-w-2xl whitespace-pre-wrap font-sans text-xl leading-relaxed text-white/90 md:text-2xl"
        >
          {transcript}
        </pre>
        <div className="mt-12 flex flex-col gap-4" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1901-c9">
          <a
            id="kinetic-reduced-url"
            href={kineticSpeechUrlHref}
            className="kinetic-type-brand tracking-[0.08em] text-white underline-offset-4 hover:underline"
          >
            {copy.endcard.url}
          </a>
          <Link
            id="kinetic-reduced-join"
            href={kineticSpeechJoinHref}
            className="text-xl text-white/80 hover:text-white"
          >
            {copy.endcard.join}
          </Link>
          <nav
            id="kinetic-reduced-sources"
            aria-label={copy.endcard.sources}
            className="mt-4 max-w-md"
          >
            <p className="text-sm font-semibold tracking-[0.08em] text-white/60 uppercase" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1921-c13">
              {copy.endcard.sources}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1924-c13">
              {KINETIC_ENDCARD_SOURCES.map((source) => (
                <li key={source.href} id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1926-c17-${source.href}`}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 underline-offset-2 hover:text-white hover:underline" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1927-c19-${source.href}`}
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    );
  }

  const showControls =
    !mediaLoading && (phase === 'playing' || phase === 'paused' || phase === 'ended');
  const showPlayGate =
    !mediaLoading && (phase === 'poster' || phase === 'paused');
  const showDevSlideNav =
    isDevSlideNav && !reduced && showControls && slideCount > 0 && slideIndex > 0;
  const activeSlideId =
    slideIndex > 0 ? (slideItems[slideIndex - 1]?.beat.id ?? '') : '';

  return (
    <section
      id="kinetic-speech-film"
      aria-label={copy.a11y.region}
      aria-busy={mediaLoading || undefined}
      className={cn(
        // Above site navbar (z-50) so top-left back is never covered by the brand logo.
        'fixed inset-0 z-[100] h-svh min-h-svh w-screen max-w-none overflow-hidden bg-black text-white',
        className,
      )}
    >
      <span id="kinetic-live-status" className="sr-only" aria-live="polite">
        {status}
      </span>

      <audio
        id="kinetic-speech-audio"
        ref={audioRef}
        src={kineticSpeechAudioSrc}
        preload="auto"
        playsInline
      />

      {mediaLoading ? (
        <div
          id="kinetic-media-loading"
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
          role="status"
          aria-live="polite"
          aria-label={copy.a11y.loading}
        >
          <div
            id="kinetic-media-loading-spinner"
            className="kinetic-spinner"
            aria-hidden
          />
          <span id="kinetic-media-loading-label" className="sr-only">
            {copy.a11y.loading}
          </span>
        </div>
      ) : null}

      <div
        id="kinetic-stage"
        ref={stageRef}
        data-k-bg="charcoal"
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div id="kinetic-stage-root" className="absolute inset-0">
          <div id="kinetic-bg" className="absolute inset-0 bg-black" />
        </div>

        {/* Type rail host: primary beats bottom-lock via .kinetic-type-anchor;
            full-stage packs (flood/cloud) keep their own inset-0 layout. */}
        <div
          id="kinetic-nodes"
          className="absolute inset-0 overflow-hidden px-4 pt-6 sm:px-6 md:px-10"
        >
          {beats.map((beat) => (
            <BeatNodes key={beat.id} beat={beat} />
          ))}
        </div>

        {/* Finale — roller URL + Join; inert until roller settles (joinReady) or film ended */}
        <div
          id="kinetic-endcard"
          data-k-node
          className={cn(
            'absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-4 text-center opacity-0 sm:gap-8 sm:px-6 pb-20 md:pb-24',
            !endcardInteractive && 'pointer-events-none',
          )}
          aria-hidden={!endcardInteractive}
          inert={!endcardInteractive ? true : undefined}
        >
          <a
            id="kinetic-fin-url"
            href={kineticSpeechUrlHref}
            tabIndex={endcardInteractive ? 0 : -1}
            className="text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label={copy.endcard.url}
          >
            <RollerUrl />
          </a>
          <Link
            id="kinetic-fin-join"
            href={kineticSpeechJoinHref}
            tabIndex={endcardInteractive ? 0 : -1}
            className="rounded-full border border-white/35 px-8 py-3 text-lg text-white/90 opacity-0 transition-colors hover:bg-white hover:text-black hover:text-opacity-100"
          >
            {copy.endcard.join} →
          </Link>

          {/* Sources — bottom-right above control chrome; interactive only with endcard CTAs */}
          <div
            id="kinetic-endcard-sources"
            className="absolute bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] right-3 z-[2] sm:right-4 md:bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:right-6"
          >
            <HoverCard
              open={endcardInteractive && endcardSourcesOpen}
              onOpenChange={(open) => {
                if (endcardInteractive) {
                  setEndcardSourcesOpen(open);
                } else {
                  setEndcardSourcesOpen(false);
                }
              }}
            >
              <HoverCardTrigger
                render={
                  <button
                    type="button"
                    id="kinetic-endcard-sources-trigger"
                    onClick={() => {
                      if (endcardInteractive) {
                        setEndcardSourcesOpen((open) => !open);
                      }
                    }}
                  />
                }
                delay={200}
                closeDelay={150}
                tabIndex={endcardInteractive ? 0 : -1}
                aria-label={copy.endcard.sources}
                className={cn(
                  'kinetic-endcard-sources-trigger rounded-sm px-1.5 py-1 outline-none',
                  !endcardInteractive && 'pointer-events-none',
                )}
              >
                {copy.endcard.sources}
              </HoverCardTrigger>
              <HoverCardContent
                id="kinetic-endcard-sources-content"
                side="top"
                align="end"
                sideOffset={8}
                className="kinetic-endcard-sources-content w-auto min-w-[12rem] max-w-[min(90vw,18rem)] p-3 text-left"
              >
                <p className="kinetic-endcard-sources-heading" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2058-c17">{copy.endcard.sources}</p>
                <ul className="flex flex-col gap-1.5" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2059-c17">
                  {KINETIC_ENDCARD_SOURCES.map((source) => (
                    <li key={source.href} id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2061-c21-${source.href}`}>
                      <a
                        href={source.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kinetic-endcard-sources-link" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2062-c23-${source.href}`}
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </div>

      {/* Top-left back — shared Button atom (primary chip, like Volunteer) */}
      <Button
        id="kinetic-control-home"
        type="button"
        variant="default"
        size="sm"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-50"
        onClick={() => {
          router.push('/');
        }}
      >
        <ChevronLeft id="kinetic-control-home-icon" data-icon="inline-start" />
        {copy.controls.home}
      </Button>

      {showDevSlideNav ? (
        <div
          id="kinetic-dev-slide-nav"
          className="absolute top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-black/75 px-2 py-1.5 font-mono text-sm text-white/90 shadow-lg backdrop-blur-sm sm:top-4 sm:gap-3 sm:px-3"
          role="group"
          aria-label="Dev slide scrubber"
        >
          <button
            id="kinetic-dev-slide-prev"
            type="button"
            onClick={seekPrevSlide}
            disabled={slideIndex <= 1}
            className="rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous slide"
          >
            ◀
          </button>
          <span
            id="kinetic-dev-slide-label"
            className="min-w-[9rem] text-center tabular-nums sm:min-w-[12rem]"
            title={activeSlideId}
          >
            {slideIndex} / {slideCount}
            <span className="ml-2 hidden text-white/55 sm:inline" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2125-c13">{activeSlideId}</span>
          </span>
          <button
            id="kinetic-dev-slide-next"
            type="button"
            onClick={seekNextSlide}
            disabled={slideIndex >= slideCount}
            className="rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Next slide"
          >
            ▶
          </button>
        </div>
      ) : null}

      {showPlayGate ? (
        <div
          id="kinetic-play-gate"
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
        >
          <button
            id="kinetic-play-button"
            type="button"
            onClick={onPlayGate}
            className="kinetic-play-gate pointer-events-auto"
            aria-label={copy.controls.play}
          >
            <Play id="kinetic-play-button-icon" {...PLAY_GATE_ICON_PROPS} />
          </button>
        </div>
      ) : null}

      {showControls ? (
        <div
          id="kinetic-controls"
          className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-end gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4 md:px-8"
        >
          <div
            className="flex flex-wrap items-center justify-end gap-2"
            id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2148-c11"
          >
            {phase === 'playing' ? (
              <button
                id="kinetic-control-pause"
                type="button"
                onClick={pauseFilm}
                className="kinetic-control-btn"
                aria-label={copy.controls.pause}
              >
                <Pause id="kinetic-control-pause-icon" {...CONTROL_ICON_PROPS} />
              </button>
            ) : null}
            {audioBlocked && phase === 'playing' ? (
              <button
                id="kinetic-control-sound"
                type="button"
                onClick={unlockSound}
                className="kinetic-control-btn"
                aria-label={copy.a11y.soundBlocked}
              >
                <VolumeX id="kinetic-control-sound-icon" {...CONTROL_ICON_PROPS} />
              </button>
            ) : phase === 'playing' || phase === 'paused' || phase === 'ended' ? (
              <button
                id="kinetic-control-mute"
                type="button"
                onClick={toggleMute}
                className="kinetic-control-btn"
                aria-label={muted ? copy.controls.unmute : copy.controls.mute}
              >
                {muted ? (
                  <VolumeX id="kinetic-control-mute-icon" {...CONTROL_ICON_PROPS} />
                ) : (
                  <Volume2 id="kinetic-control-unmute-icon" {...CONTROL_ICON_PROPS} />
                )}
              </button>
            ) : null}
            {phase === 'ended' || phase === 'paused' ? (
              <button
                id="kinetic-control-replay"
                type="button"
                onClick={replayFilm}
                className="kinetic-control-btn"
                aria-label={copy.controls.replay}
              >
                <RotateCcw id="kinetic-control-replay-icon" {...CONTROL_ICON_PROPS} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <details id="kinetic-transcript-details" className="sr-only">
        <summary id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2214-c9">{copy.a11y.transcript}</summary>
        <pre id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2215-c9">{transcript}</pre>
      </details>
    </section>
  );
}

/** Deterministic virtue sequence so SSR/client reel strips match. */
function reelSpinWords(finalWord: string, reelIndex: number, count: number): string[] {
  const words = kineticSpeechRollerVirtues;
  const out: string[] = [];
  let seed = (reelIndex + 1) * 2654435761;
  for (let n = 0; n < count; n += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out.push(words[seed % words.length] ?? 'walkable');
  }
  out.push(finalWord);
  return out;
}

/**
 * Finale roller: three slots always visible.
 * Revolve vision adjectives, then lock data · janta · party one by one.
 */
function RollerUrl() {
  const spinDepth = kineticSpeechRollerSpinDepth;
  const slots = kineticSpeechRollerSlots;
  return (
    <div
      id="kinetic-roller"
      data-k-roller
      className="kinetic-roller kinetic-type-brand inline-flex items-center justify-center"
      aria-hidden
    >
      {slots.map((slot, i) => {
        // Final cell locks to domain part; prior cells cycle vision adjectives
        const spin = reelSpinWords(slot, i + 1, spinDepth);
        return (
          <span key={`slot-${slot}`} className="kinetic-roller-slot inline-flex items-baseline" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2252-c11-${i}`}>
            {i > 0 ? (
              <span data-k-roller-dot className="kinetic-roller-dot" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2254-c15-${i}`}>
                .
              </span>
            ) : null}
            <span
              data-k-domain-slot={i}
              data-k-reel={i}
              className="kinetic-reel kinetic-reel-word" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2258-c13-${i}`}
            >
              <span className="kinetic-reel-window" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2263-c15-${i}`}>
                <span
                  data-k-reel-strip
                  data-k-domain-reel={i}
                  data-k-reel-steps={spinDepth}
                  className="kinetic-reel-strip" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2264-c17-${i}`}
                >
                  {spin.map((word, gi) => (
                    <span key={`d${i}-g${gi}`} className="kinetic-reel-cell" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2271-c21-${gi}`}>
                      {word}
                    </span>
                  ))}
                </span>
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Shared bottom-rail lock for primary manifesto type (see .kinetic-type-anchor). */
const TYPE_ANCHOR_SHORT =
  'kinetic-type-anchor w-max max-w-[min(90vw,14ch)] px-2 text-center opacity-0 sm:max-w-[16ch] md:max-w-[18ch] lg:max-w-[22ch]';
const TYPE_ANCHOR_THESIS =
  'kinetic-type-anchor w-max max-w-[min(92vw,28ch)] px-3 text-center text-balance opacity-0 sm:px-4 md:max-w-[min(92vw,40ch)] md:px-6';

function BeatNodes({ beat }: { beat: KineticBeat }) {
  switch (beat.kind) {
    case 'line': {
      return (
        <p
          id={beat.id}
          data-k-node
          data-k-type-anchor="bottom"
          data-k-motion={beat.motion}
          className={cn(
            roleClass(beat.role),
            // Short-punch vs wide thesis — mobile uses softer caps; md+ restores punch widths
            beat.wide ? TYPE_ANCHOR_THESIS : TYPE_ANCHOR_SHORT,
            beat.dim && 'kinetic-dim-text',
            beat.tiranga && 'kinetic-tiranga',
            beat.role === 'brand' && 'tracking-[0.16em]',
          )}
        >
          {beat.emphasisWord ? (
            <LineWithEmphasis text={beat.text} word={beat.emphasisWord} />
          ) : (
            beat.text
          )}
        </p>
      );
    }
    case 'pair': {
      const leadRole = beat.leadRole ?? 'body';
      const hitRole = beat.hitRole ?? 'slam';
      // Wide lead = thesis clamp (Demand multi-word connective).
      // Multi-word hits on wide pairs (e.g. Abki baar) share the thesis clamp;
      // short slam punches (now.) stay punch-width.
      const leadClamp = beat.wide ? TYPE_ANCHOR_THESIS : TYPE_ANCHOR_SHORT;
      const hitWordCount = beat.hit
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const hitClamp =
        beat.wide && hitWordCount > 1
          ? TYPE_ANCHOR_THESIS
          : 'kinetic-type-anchor w-max max-w-[min(90vw,14ch)] px-2 text-center opacity-0 sm:max-w-[16ch] md:max-w-[18ch]';
      return (
        <>
          <p
            id={`${beat.id}-lead`}
            data-k-node
            data-k-type-anchor="bottom"
            className={cn(roleClass(leadRole), leadClamp)}
          >
            {beat.lead}
          </p>
          <p
            id={`${beat.id}-hit`}
            data-k-node
            data-k-type-anchor="bottom"
            className={cn(roleClass(hitRole), hitClamp)}
          >
            {beat.hit}
          </p>
        </>
      );
    }
    case 'slide-pair': {
      const axis = beat.axis ?? 'x';
      return (
        <div
          id={beat.id}
          data-k-type-anchor="bottom"
          className={cn(
            // Band = position on type rail only. Flex alignment is Tailwind-only
            // (globals .kinetic-stage-rail-band must not set align-items).
            'kinetic-stage-rail-band px-4',
            // Mobile: always stack so Left/Right and Religion/Caste never squeeze.
            // md+: restore horizontal tussle for axis x; y stays column + centered.
            axis === 'y'
              ? 'flex-col items-center justify-center gap-2 sm:gap-3 md:gap-6'
              : 'flex-col items-center justify-center gap-2 sm:gap-3 md:flex-row md:items-end md:justify-center md:gap-16',
          )}
        >
          <p
            id={`${beat.id}-left`}
            data-k-node
            className="kinetic-type-body w-max max-w-[min(90vw,14ch)] self-center text-center opacity-0"
          >
            {beat.left}
          </p>
          <p
            id={`${beat.id}-right`}
            data-k-node
            className="kinetic-type-body w-max max-w-[min(90vw,14ch)] self-center text-center opacity-0"
          >
            {beat.right}
          </p>
        </div>
      );
    }
    case 'sticky': {
      const prefixRole = beat.prefixRole ?? 'body';
      const suffixRole = beat.steps[0]?.role ?? prefixRole;
      const hasTextSuffix = beat.steps.some((s) => s.suffix.length > 0);
      const hasDots = beat.steps.some((s) => (s.dots ?? 0) > 0);
      // Deadline morph + Still waiting (empty suffix + dots): same suffix-slot + step-local "..."
      // so ellipsis inherits body type size. Do not use a separate shared-dots chrome path.
      const useSuffixSlot = hasTextSuffix || hasDots;
      // Ellipsis inherits the phrase type role so dots read as trailing "..." not chrome.
      const dotsRole = suffixRole;
      // Wide: no trailing space char (flex gap handles spacing — trailing space collapses in flex).
      // Non-wide: NBSP after prefix when a word suffix follows; empty-suffix dots stay flush.
      const prefixText =
        hasTextSuffix && !beat.wide ? `${beat.prefix}\u00A0` : beat.prefix;
      // Sizer reserves painted width: dotted steps count suffix + "..." so ellipsis
      // hangs flush after the word (or alone for Still waiting) without clipping.
      const suffixSizeKey = (suffix: string, dots?: number) =>
        (dots ?? 0) > 0 ? `${suffix}...` : suffix;
      const longestSuffix = useSuffixSlot
        ? [...beat.steps].sort(
            (a, b) =>
              suffixSizeKey(b.suffix, b.dots).length - suffixSizeKey(a.suffix, a.dots).length,
          )[0]
        : null;
      const longestSizerText = longestSuffix
        ? suffixSizeKey(longestSuffix.suffix, longestSuffix.dots)
        : '';
      const loadingDots = (stepLocal: boolean) => (
        <span
          id={stepLocal ? undefined : `${beat.id}-dots`}
          data-k-step-dots={stepLocal ? '' : undefined}
          className={cn(roleClass(dotsRole), 'kinetic-loading-dots pl-0 ml-0 gap-0')}
          aria-hidden
        >
          <span data-k-dot className="kinetic-loading-dot" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2415-c11">
            .
          </span>
          <span data-k-dot className="kinetic-loading-dot" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2418-c11">
            .
          </span>
          <span data-k-dot className="kinetic-loading-dot" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2421-c11">
            .
          </span>
        </span>
      );
      return (
        <div
          id={beat.id}
          data-k-sticky
          data-k-type-anchor="bottom"
          className={cn(
            // Bottom-rail lock + baseline flex for prefix/suffix morph
            // Non-wide: gap-x-0 — space lives in prefix NBSP; suffix-run is one tight unit
            // Wide: CSS .kinetic-sticky-wide gap between prefix and suffix-run (always when wide)
            'kinetic-sticky kinetic-type-anchor flex items-baseline justify-center text-center opacity-0',
            !beat.wide && 'gap-x-0',
            // Gap + wrap helpers must follow beat.wide even if inline is omitted later
            beat.wide && 'kinetic-sticky-wide',
            beat.inline
              ? beat.wide
                ? // Demand long morph: content-sized on the rail; slightly wider clamp for one line
                  'kinetic-sticky-inline w-max max-w-[min(94vw,44ch)] flex-nowrap whitespace-nowrap px-3 sm:px-4 md:px-6'
                : // All short inline stickies: single-line nowrap (stable while morphing)
                  'kinetic-sticky-inline w-max max-w-[min(92vw,36ch)] flex-nowrap whitespace-nowrap px-3 sm:px-4 md:px-6'
              : // Non-inline morph (unused by director today): same single-line stability, tighter max-w
                'w-max max-w-[min(90vw,28ch)] flex-nowrap whitespace-nowrap px-2',
          )}
        >
          <span
            id={`${beat.id}-prefix`}
            data-k-node
            className={cn(roleClass(prefixRole), 'kinetic-sticky-prefix opacity-0')}
          >
            {prefixText}
          </span>
          {/* Suffix-run: morph word + step-local dots (Deadline) or dots-only slot (Still waiting) */}
          <span className="kinetic-sticky-suffix-run m-0 p-0" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2456-c11">
            {useSuffixSlot ? (
              <span
                className={cn(
                  'kinetic-sticky-suffix-slot relative inline-block align-baseline',
                  beat.wide && 'kinetic-sticky-wide-slot',
                )} id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2458-c15"
              >
                {/* Longest sizer holds stable slot width (includes "..." when any step has dots) */}
                <span
                  className={cn(
                    roleClass(suffixRole),
                    'invisible whitespace-nowrap',
                    beat.wide && 'max-w-full',
                  )}
                  aria-hidden id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2465-c17"
                >
                  {longestSizerText}
                </span>
                {beat.steps.map((step, i) => (
                  <span
                    key={`${beat.id}-s${i}`}
                    id={`${beat.id}-s${i}`}
                    data-k-node
                    data-k-sticky-suffix
                    className={cn(
                      roleClass(step.role ?? suffixRole),
                      // Absolute opacity stack for all morph stickies; bottom locks baseline
                      'absolute left-0 bottom-0 whitespace-nowrap opacity-0',
                      beat.wide && 'max-w-full',
                    )}
                  >
                    {step.suffix}
                    {(step.dots ?? 0) > 0 ? loadingDots(true) : null}
                  </span>
                ))}
              </span>
            ) : (
              // No morph / no dots: keep step ids so the sticky scheduler can no-op safely
              beat.steps.map((step, i) => (
                <span
                  key={`${beat.id}-s${i}`}
                  id={`${beat.id}-s${i}`}
                  data-k-node
                  className="hidden"
                  aria-hidden
                >
                  {step.suffix}
                </span>
              ))
            )}
            {/* Shared post-prefix dots retired — Still waiting uses step-local dots like Deadline */}
            <span id={`${beat.id}-dots`} className="hidden" aria-hidden />
          </span>
        </div>
      );
    }
    case 'sticky-pair': {
      const fixedRole = beat.fixedRole ?? 'body';
      const stepRole = beat.stepRole ?? 'body';
      // Stack swap line over fixed (or fixed over swap for swap-hit) so combined
      // width never fights the stage overflow-hidden ancestors horizontally.
      const swapFirst = beat.mode === 'swap-lead';
      const longestStep =
        [...beat.steps].sort((a, b) => b.text.length - a.text.length)[0]?.text ?? '';
      const stepStack = (
        <span className="relative inline-grid min-h-[1.2em] w-full max-w-full items-baseline justify-items-center" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2525-c9">
          <span
            className={cn(
              roleClass(stepRole),
              // Mobile: allow soft wrap for long inventory codes; md+: single-line punch
              'invisible col-start-1 row-start-1 max-w-full text-center whitespace-normal md:whitespace-nowrap',
            )}
            aria-hidden id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2526-c11"
          >
            {longestStep}
          </span>
          {beat.steps.map((step, i) => (
            <span
              key={`${beat.id}-swap-${i}`}
              id={`${beat.id}-swap-${i}`}
              data-k-node
              className={cn(
                roleClass(stepRole),
                'col-start-1 row-start-1 max-w-full text-center opacity-0 whitespace-normal md:whitespace-nowrap',
              )}
            >
              {step.text}
            </span>
          ))}
        </span>
      );
      const fixedStack = (
        <span
          id={`${beat.id}-fixed`}
          data-k-node
          className={cn(
            roleClass(fixedRole),
            'max-w-full text-center opacity-0 whitespace-normal md:whitespace-nowrap',
          )}
        >
          {beat.fixed}
        </span>
      );
      return (
        <div
          id={beat.id}
          data-k-sticky-pair
          data-k-type-anchor="bottom"
          className={cn(
            // Two-line stack bottom-locks on the rail (grows upward). Dense inventory keeps smaller type.
            'kinetic-sticky-inline kinetic-sticky-pair kinetic-type-anchor flex w-full max-w-[min(96vw,72rem)] flex-col items-center justify-end gap-y-1 overflow-visible px-3 text-center opacity-0 sm:px-4 md:w-max md:px-6',
            beat.dense && 'kinetic-sticky-pair-dense',
          )}
        >
          {swapFirst ? (
            <>
              {stepStack}
              {fixedStack}
            </>
          ) : (
            <>
              {fixedStack}
              {stepStack}
            </>
          )}
        </div>
      );
    }
    case 'flood': {
      return (
        <div
          id={beat.id}
          data-k-flood
          data-k-flood-mode="words"
          className="kinetic-flood-wall absolute inset-0 z-[1] flex flex-wrap content-center items-center justify-center gap-x-2 gap-y-1 overflow-hidden p-2 opacity-0 sm:gap-x-3 sm:gap-y-2 sm:p-3 md:gap-x-4 md:gap-y-3"
        >
          {Array.from({ length: beat.count }).map((_, i) => {
            const word = beat.words[i % beat.words.length]!;
            return (
              <span
                key={`${beat.id}-tile-${i}`}
                data-k-flood-tile
                className="kinetic-type-micro-grid kinetic-spam-word opacity-0" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2598-c15-${i}`}
              >
                {word}
              </span>
            );
          })}
        </div>
      );
    }
    case 'cloud': {
      return (
        <div
          id={beat.id}
          data-k-cloud
          className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-x-3 gap-y-2 p-3 opacity-0 sm:gap-x-5 sm:gap-y-4 sm:p-6 md:gap-x-8 md:gap-y-5"
        >
          {beat.words.map((word) => (
            <span
              key={`${beat.id}-${word}`}
              data-k-cloud-word
              className="kinetic-cloud-word opacity-0" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2618-c13-${word}`}
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    case 'rapid': {
      const role = beat.role ?? 'body';
      return (
        <div
          id={beat.id}
          data-k-rapid
          className="absolute inset-0 opacity-0"
        >
          {beat.words.map((word, i) => (
            <span
              key={`${beat.id}-w${i}`}
              id={`${beat.id}-w${i}`}
              data-k-rapid-word
              data-k-node
              data-k-type-anchor="bottom"
              className={cn(roleClass(role), 'kinetic-type-anchor w-max text-center opacity-0')}
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    case 'quote': {
      const textRole = beat.textRole ?? 'body';
      const attrRole = beat.attrRole ?? 'whisper';
      return (
        <div
          id={beat.id}
          data-k-node
          data-k-quote
          data-k-type-anchor="bottom"
          className="kinetic-quote kinetic-type-anchor flex w-max max-w-[min(92vw,48rem)] flex-col items-stretch gap-2 opacity-0 px-3 sm:px-4"
        >
          <p
            id={`${beat.id}-text`}
            className={cn(roleClass(textRole), 'kinetic-quote-text text-center')}
          >
            {beat.text}
          </p>
          <p
            id={`${beat.id}-attr`}
            className={cn(roleClass(attrRole), 'kinetic-dim-text self-end text-right')}
          >
            {beat.attribution}
          </p>
        </div>
      );
    }
    case 'project-delays': {
      return (
        <div
          id={beat.id}
          data-k-project-delays
          className="kinetic-project-delays absolute inset-0 z-[1] opacity-0"
          aria-hidden
        >
          {/* Each card / more slam bottom-locks on the shared type rail */}
          {beat.projects.map((project, i) => (
            <div
              key={`${beat.id}-p${i}`}
              id={`${beat.id}-p${i}`}
              data-k-delay-card
              data-k-type-anchor="bottom"
              className="kinetic-delay-card kinetic-type-anchor flex w-max max-w-[min(92vw,36rem)] flex-col items-center gap-2 px-4 text-center opacity-0 sm:gap-2.5 sm:px-6 md:px-10"
            >
              <span className="kinetic-delay-project" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2693-c17-${i}`}>{project.project}</span>
              <span className="kinetic-delay-label" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2694-c17-${i}`}>Delayed.</span>
              <span className="kinetic-delay-years" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2695-c17-${i}`}>{project.years}</span>
            </div>
          ))}
          <div
            id={`${beat.id}-more`}
            data-k-delay-more
            data-k-type-anchor="bottom"
            className={cn(
              roleClass('slam-xl'),
              'kinetic-delay-more kinetic-type-anchor w-max px-4 opacity-0 sm:px-6 md:px-10',
            )}
          >
            {beat.moreLabel}
          </div>
        </div>
      );
    }
    case 'silence':
    case 'endcard':
      return null;
    default:
      return null;
  }
}

/** Emphasize a word without teal (pre-Imagine acts). */
function LineWithEmphasis({ text, word }: { text: string; word: string }) {
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx < 0) {
    return <>{text}</>;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + word.length);
  const after = text.slice(idx + word.length);
  return (
    <>
      {before}
      <span className="kinetic-word-stress" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2729-c7">{match}</span>
      {after}
    </>
  );
}
