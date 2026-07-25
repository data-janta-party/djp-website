/**
 * Factory for ensureAudioPlaying — buffer wait, play(), autoplay unlock gesture arming.
 */

import type gsap from 'gsap';
import type { MutableRefObject, RefObject } from 'react';

import { waitForAudioData } from '@/hooks/kinetic-film/waitForAudioData';
import type { FilmPhase } from '@/hooks/kinetic-film/types';
import { kineticSpeechCopy as copy } from '@/lib/kinetic-speech';

export type EnsureAudioPlayingOpts = { seekToTimeline?: boolean };

export type CreateEnsureAudioPlayingArgs = {
  audioRef: RefObject<HTMLAudioElement | null>;
  timelineRef: RefObject<gsap.core.Timeline | null>;
  phaseRef: MutableRefObject<FilmPhase>;
  mutedRef: MutableRefObject<boolean>;
  clearAudioUnlockRef: MutableRefObject<(() => void) | null>;
  ensureAudioPlayingRef: MutableRefObject<(opts?: EnsureAudioPlayingOpts) => Promise<boolean>>;
  startScrubLoopRef: MutableRefObject<() => void>;
  setMediaLoading: (v: boolean) => void;
  setStatus: (s: string) => void;
  setAudioBlocked: (v: boolean) => void;
};

export function createEnsureAudioPlaying({
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
}: CreateEnsureAudioPlayingArgs): (opts?: EnsureAudioPlayingOpts) => Promise<boolean> {
  return async (opts?: EnsureAudioPlayingOpts) => {
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
  };
}
