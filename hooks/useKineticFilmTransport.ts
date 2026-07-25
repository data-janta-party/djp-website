'use client';

/**
 * Kinetic speech film transport — audio master clock, scrub loop, phase machine.
 * GSAP timeline is built via `buildKineticSpeechTimeline` (never free-runs).
 */

import gsap from 'gsap';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';

import {
  getAllKineticBeats,
  getKineticSpeechEndcardInteractiveSec,
  getKineticSpeechTranscript,
  kineticSpeechCopy as copy,
  layoutKineticSpeech,
  buildKineticSpeechTimeline,
} from '@/lib/kinetic-speech';
import {
  kineticSlideTimeSec,
  parseKineticSlideHash,
  replaceKineticSlideHash,
} from '@/lib/data/kinetic-speech-dev-nav';
import { createEnsureAudioPlaying } from '@/hooks/kinetic-film/createEnsureAudioPlaying';
import { syncDevSlideHashFromTime } from '@/hooks/kinetic-film/devSlideNav';
import { scrubVisualToAudio } from '@/hooks/kinetic-film/scrubVisualToAudio';
import type { FilmPhase } from '@/hooks/kinetic-film/types';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

export type { FilmPhase } from '@/hooks/kinetic-film/types';

export type UseKineticFilmTransportOptions = {
  previewMode?: 'poster' | 'reduced';
  forceDevSlideNav?: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
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

export function useKineticFilmTransport({
  previewMode,
  forceDevSlideNav = false,
  stageRef,
  audioRef,
}: UseKineticFilmTransportOptions) {
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
  /**
   * Endcard CTAs interactive when the endcard appears (Sources/URL), while music
   * may still play. Join stays GSAP-hidden until the roller settles.
   * Driven from the audio clock — not GSAP call callbacks (seek suppresses them).
   */
  const [joinReady, setJoinReady] = useState(false);
  const joinReadyRef = useRef(false);
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
  }, [audioRef, hideChrome, killTimeline, reduced]);

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

  // Inline callback so React Compiler sees a function expression; factory runs
  // only when invoked (not during render) so refs are not read at render time.
  const ensureAudioPlaying = useCallback(
    async (opts?: { seekToTimeline?: boolean }) => {
      return createEnsureAudioPlaying({
        audioRef,
        timelineRef,
        phaseRef,
        mutedRef,
        clearAudioUnlockRef,
        ensureAudioPlayingRef,
        startScrubLoopRef,
        setMediaLoading,
        setStatus,
        setAudioBlocked,
      })(opts);
    },
    [audioRef, setAudioBlocked, setMediaLoading, setStatus],
  );
  useEffect(() => {
    ensureAudioPlayingRef.current = ensureAudioPlaying;
  }, [ensureAudioPlaying]);


  /** Central phase writer — keeps phase + phaseRef in lockstep. */
  const setFilmPhase = useCallback((next: FilmPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /** Keep joinReady state + ref in lockstep; close Sources when locking CTAs. */
  const writeJoinReady = useCallback((ready: boolean) => {
    joinReadyRef.current = ready;
    setJoinReady(ready);
    if (!ready) {
      setEndcardSourcesOpen(false);
    }
  }, []);

  /**
   * Unlock endcard CTAs from the audio master clock (not GSAP callbacks).
   * `timeline.seek(t)` suppresses events by default, so tl.call(onJoinReady) never
   * runs during normal scrubbed playback.
   */
  const syncJoinReadyFromTime = useCallback(
    (timeSec: number) => {
      const unlockAt = getKineticSpeechEndcardInteractiveSec();
      const ready = Number.isFinite(timeSec) && timeSec >= unlockAt - 0.001;
      if (ready !== joinReadyRef.current) {
        writeJoinReady(ready);
      }
    },
    [writeJoinReady],
  );

  /**
   * Single finish path for timeline complete / audio ended / reduced-motion start.
   */
  const finishFilm = useCallback(
    (opts?: { forceAudioEnd?: boolean; reducedMotion?: boolean }) => {
      stopScrubLoop();

      if (opts?.reducedMotion) {
        setMediaLoading(false);
        setFilmPhase('ended');
        setStatus(copy.a11y.ended);
        return;
      }

      // Timeline onComplete: only pause audio if already at end; else leave tail for ended event.
      // Audio ended: force visual complete.
      if (!opts?.forceAudioEnd) {
        const audio = audioRef.current;
        if (audio) {
          const ended =
            !Number.isFinite(audio.duration) ||
            audio.duration <= 0 ||
            audio.currentTime >= audio.duration - 0.05 ||
            audio.ended;
          if (ended) {
            try {
              audio.pause();
            } catch {
              /* ignore */
            }
          }
        }
      }

      const stageEl = stageRef.current;
      if (stageEl) {
        const qDone = gsap.utils.selector(stageEl);
        gsap.set(qDone('#kinetic-fin-join'), { autoAlpha: 1, y: 0 });
      }
      writeJoinReady(true);
      setFilmPhase('ended');
      setStatus(copy.a11y.ended);

      if (opts?.forceAudioEnd) {
        const tl = timelineRef.current;
        if (tl && tl.progress() < 1) {
          tl.progress(1);
        }
      }
    },
    [audioRef, setFilmPhase, setMediaLoading, setStatus, stageRef, stopScrubLoop, writeJoinReady],
  );

  const buildTimeline = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return null;
    }
    return buildKineticSpeechTimeline(stage, {
      onTimelineComplete: () => {
        finishFilm();
      },
      // Belt-and-suspenders if seek ever runs with suppressEvents:false (tests).
      onJoinReady: () => {
        writeJoinReady(true);
      },
    });
  }, [finishFilm, stageRef, writeJoinReady]);

  const syncDevSlideHash = useCallback(
    (timeSec: number) => {
      syncDevSlideHashFromTime({
        enabled: isDevSlideNav,
        slideCount,
        slideItems,
        timeSec,
        slideIndexRef,
        setSlideIndex,
      });
    },
    [isDevSlideNav, setSlideIndex, slideCount, slideItems],
  );

  /**
   * TRANSPORT — audio is master clock; GSAP is a scrubbed visual track.
   *
   * While phase is playing and audio is actually playing, each rAF sets
   * `tl.time(audio.currentTime)`. Pause = stop audio + stop scrub. Visual freezes
   * on the last scrubbed frame. Never free-run the timeline with tl.play().
   */
  const scrubVisualToAudioFrame = useCallback(() => {
    scrubVisualToAudio({
      audio: audioRef.current,
      timeline: timelineRef.current,
      phase: phaseRef.current,
      onTime: (timeSec) => {
        // Unlock Sources/Join as soon as the endcard is on screen (audio clock).
        syncJoinReadyFromTime(timeSec);
        if (isDevSlideNav) {
          syncDevSlideHash(timeSec);
        }
      },
    });
  }, [audioRef, isDevSlideNav, syncDevSlideHash, syncJoinReadyFromTime]);

  const startScrubLoop = useCallback(() => {
    const tick = () => {
      if (phaseRef.current !== 'playing') {
        scrubRafRef.current = null;
        return;
      }
      scrubVisualToAudioFrame();
      scrubRafRef.current = requestAnimationFrame(tick);
    };
    stopScrubLoop();
    scrubRafRef.current = requestAnimationFrame(tick);
  }, [scrubVisualToAudioFrame, stopScrubLoop]);

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
      finishFilm({ forceAudioEnd: true });
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [audioRef, finishFilm]);

  const startFilm = useCallback(async (): Promise<boolean> => {
    if (reduced) {
      finishFilm({ reducedMotion: true });
      return true;
    }

    // New session: supersede any prior in-flight start (Strict Mode / double invoke).
    const session = (filmSessionRef.current += 1);

    // Drop endcard interactivity immediately (before await audio.play)
    // so replay cannot leave hidden Join/URL/Sources focusable.
    writeJoinReady(false);
    stopScrubLoop();
    setFilmPhase('playing');
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
      setFilmPhase('poster');
      setStatus(copy.a11y.paused);
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
        setFilmPhase('poster');
        setStatus(copy.a11y.paused);
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
    audioRef,
    buildTimeline,
    ensureAudioPlaying,
    finishFilm,
    isDevSlideNav,
    killTimeline,
    reduced,
    setFilmPhase,
    slideCount,
    startScrubLoop,
    stopScrubLoop,
    writeJoinReady,
  ]);

  const pauseFilm = useCallback(() => {
    // Single pause path: stop scrub first so no later tick advances visuals,
    // then pause audio. Timeline stays paused (never free-ran).
    setFilmPhase('paused');
    stopScrubLoop();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    // Belt-and-suspenders: timeline should already be paused (never free-ran).
    timelineRef.current?.pause();
    setStatus(copy.a11y.paused);
    // Don't clear unlock while paused — resume still needs gesture if never unlocked
  }, [audioRef, setFilmPhase, setStatus, stopScrubLoop]);

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
    setFilmPhase('playing');
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
  }, [audioRef, buildTimeline, ensureAudioPlaying, setFilmPhase, startScrubLoop]);

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

      // GSAP: seek renders all tweens up to t (timeline stays paused; events suppressed).
      if (typeof tl.seek === 'function') {
        tl.seek(t);
      } else {
        tl.time(t);
      }
      tl.pause();
      // Audio-clock unlock (seek does not fire onJoinReady callbacks).
      syncJoinReadyFromTime(t);

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
        setFilmPhase('paused');
        setStatus(copy.a11y.paused);
      } else {
        setFilmPhase('playing');
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
      audioRef,
      ensureAudioPlaying,
      ensureTimeline,
      isDevSlideNav,
      muted,
      reduced,
      setFilmPhase,
      slideCount,
      slideItems,
      startScrubLoop,
      stopScrubLoop,
      syncJoinReadyFromTime,
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
  }, [audioRef, setMuted]);

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
  }, [audioRef, buildTimeline, ensureAudioPlaying, startScrubLoop]);

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

  // Interactive when endcard appears (joinReady from audio clock) or full film end.
  const endcardInteractive = phase === 'ended' || joinReady;


  return {
    reduced,
    isDevSlideNav,
    transcript,
    beats,
    slideItems,
    slideCount,
    phase,
    phaseRef,
    joinReady,
    endcardSourcesOpen,
    setEndcardSourcesOpen,
    muted,
    audioBlocked,
    mediaLoading,
    status,
    slideIndex,
    endcardInteractive,
    startFilm,
    pauseFilm,
    resumeFilm,
    replayFilm,
    onPlayGate,
    seekPrevSlide,
    seekNextSlide,
    toggleMute,
    unlockSound,
  };
}
