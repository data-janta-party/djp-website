'use client';

import { useEffect } from 'react';

type WakeLockSentinelLike = {
  readonly released: boolean;
  release: () => Promise<void>;
  addEventListener: (
    type: 'release',
    listener: () => void,
    options?: { once?: boolean },
  ) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

/**
 * Keep the device screen awake while `active` is true (Screen Wake Lock API).
 *
 * Used so mobile screens do not sleep during the kinetic speech film.
 * Unsupported browsers, denied permissions, and non-secure contexts no-op.
 *
 * Re-acquisition strategy:
 * - Request when `active` becomes true
 * - Re-request after the tab becomes visible again (browsers release locks when hidden)
 * - Re-request on user activation (pointer/key) when no lock is held — covers failed
 *   cold-start requests that need a gesture (common on mobile “tap for sound”)
 * - One automatic re-request after an unexpected release while still active and visible
 *   (further retries wait for a gesture or visibility return to avoid loops)
 */
export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') {
      return;
    }

    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock?.request) {
      return;
    }

    let cancelled = false;
    let sentinel: WakeLockSentinelLike | null = null;
    let requesting = false;
    /** One auto re-acquire after system release; reset on gesture / visibility. */
    let allowReleaseAutoRetry = true;

    const hasLiveLock = () => Boolean(sentinel && !sentinel.released);

    const release = async () => {
      const current = sentinel;
      sentinel = null;
      if (current && !current.released) {
        try {
          await current.release();
        } catch {
          /* ignore — already released or unsupported mid-flight */
        }
      }
    };

    const request = async () => {
      if (cancelled || requesting || document.visibilityState !== 'visible') {
        return;
      }
      if (hasLiveLock()) {
        return;
      }
      requesting = true;
      try {
        const next = await nav.wakeLock!.request('screen');
        if (cancelled) {
          try {
            await next.release();
          } catch {
            /* ignore */
          }
          return;
        }
        sentinel = next;
        next.addEventListener(
          'release',
          () => {
            if (sentinel === next) {
              sentinel = null;
            }
            // Browsers release on hide; visibilitychange re-acquires. For other
            // releases while still visible + active, try once without looping.
            if (
              cancelled ||
              !allowReleaseAutoRetry ||
              document.visibilityState !== 'visible'
            ) {
              return;
            }
            allowReleaseAutoRetry = false;
            queueMicrotask(() => {
              if (!cancelled && !hasLiveLock()) {
                void request();
              }
            });
          },
          { once: true },
        );
      } catch {
        /* permission denied, battery saver, insecure context, needs gesture, etc. */
      } finally {
        requesting = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        allowReleaseAutoRetry = true;
        void request();
      }
    };

    /** Cold autoplay often rejects wake lock; re-try on the same gestures that unlock audio. */
    const onUserActivation = () => {
      if (!hasLiveLock()) {
        allowReleaseAutoRetry = true;
        void request();
      }
    };

    const activationOpts: AddEventListenerOptions = { capture: true };
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('pointerdown', onUserActivation, activationOpts);
    document.addEventListener('keydown', onUserActivation, activationOpts);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('pointerdown', onUserActivation, activationOpts);
      document.removeEventListener('keydown', onUserActivation, activationOpts);
      void release();
    };
  }, [active]);
}
