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
 * Locks are re-requested after the tab becomes visible again (browsers release
 * them automatically when the page is hidden).
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
      if (sentinel && !sentinel.released) {
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
          },
          { once: true },
        );
      } catch {
        /* permission denied, battery saver, insecure context, etc. */
      } finally {
        requesting = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void request();
      }
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void release();
    };
  }, [active]);
}
