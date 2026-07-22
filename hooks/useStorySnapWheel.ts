'use client';

import { useEffect, type RefObject } from 'react';

const PANEL_SELECTOR = '.story-snap-panel, .story-snap-volunteer';
const WHEEL_THRESHOLD = 36;
const LOCK_MS = 850;
const SNAP_RESTORE_MS = 900;
/** Last panel has scrolled above the viewport → definitely in free zone (footer). */
const PAST_LAST_TOP = -24;
/**
 * Only re-arm mandatory snap once the last panel is clearly below the top
 * (user scrolled back into earlier full-page panels). Do NOT re-arm while
 * lastTop is near 0 — that was yanking users out of the footer.
 */
const REARM_SNAP_TOP = 64;

function getPanels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(PANEL_SELECTOR));
}

function nearestPanelIndex(panels: HTMLElement[]): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    if (!panel) {
      continue;
    }
    const dist = Math.abs(panel.getBoundingClientRect().top);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest('[data-allow-scroll]'));
}

function normalizeDeltaY(event: WheelEvent): number {
  let dy = event.deltaY;
  if (event.deltaMode === 1) {
    dy *= 16;
  } else if (event.deltaMode === 2) {
    dy *= window.innerHeight;
  }
  return dy;
}

/**
 * Scroll Y to align the panel top with the viewport top.
 * Titles clear the sticky nav via .story-snap-inset padding (not scroll offset).
 */
function panelScrollTop(panel: HTMLElement): number {
  return panel.getBoundingClientRect().top + window.scrollY;
}

/**
 * Return true to consume the gesture without changing panels
 * (e.g. same-slide list → merge on the India visions panel).
 */
export type StorySnapHoldHandler = (args: {
  readonly direction: -1 | 1;
  readonly currentPanel: HTMLElement;
}) => boolean;

/**
 * One wheel gesture → one full-viewport panel in the snap region.
 * After the last panel (volunteer), snap stays off so footer scrolls freely.
 *
 * Optional `holdPanelRef`: when the current panel should “hold” (in-slide
 * animation), return true to block panel advance for that direction.
 */
export function useStorySnapWheel(
  active = true,
  holdPanelRef?: RefObject<StorySnapHoldHandler | null>,
) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      return;
    }

    let lockUntil = 0;
    let accumulated = 0;
    let freeScroll = false;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    let animatingPanel = false;

    const root = document.documentElement;

    const enableCssSnap = () => {
      root.style.scrollSnapType = '';
    };

    const disableCssSnap = () => {
      root.style.scrollSnapType = 'none';
    };

    const lastPanelTop = (panels: HTMLElement[]) => {
      const last = panels[panels.length - 1];
      return last ? last.getBoundingClientRect().top : 0;
    };

    const syncFreeScrollFromPosition = () => {
      if (!root.classList.contains('story-snap') || animatingPanel) {
        return;
      }
      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }
      const top = lastPanelTop(panels);

      if (top < PAST_LAST_TOP) {
        freeScroll = true;
        disableCssSnap();
        return;
      }

      if (freeScroll && top > REARM_SNAP_TOP) {
        freeScroll = false;
        enableCssSnap();
      }
    };

    const tryHold = (direction: -1 | 1, currentPanel: HTMLElement | undefined): boolean => {
      if (!currentPanel || !holdPanelRef?.current) {
        return false;
      }
      return holdPanelRef.current({ direction, currentPanel });
    };

    const go = (direction: -1 | 1) => {
      const now = performance.now();
      if (now < lockUntil) {
        return;
      }
      if (!root.classList.contains('story-snap')) {
        return;
      }

      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }

      const current = nearestPanelIndex(panels);
      const currentPanel = panels[current];

      // Same-slide hold (e.g. visions list → merge) — do not scroll away.
      if (tryHold(direction, currentPanel)) {
        lockUntil = now + LOCK_MS;
        accumulated = 0;
        return;
      }

      const next = current + direction;
      if (next < 0 || next >= panels.length) {
        return;
      }

      const panel = panels[next];
      if (!panel) {
        return;
      }

      freeScroll = false;
      lockUntil = now + LOCK_MS;
      accumulated = 0;
      animatingPanel = true;

      if (restoreTimer) {
        clearTimeout(restoreTimer);
      }

      disableCssSnap();
      window.scrollTo({ top: panelScrollTop(panel), left: 0, behavior: 'smooth' });

      const finish = () => {
        animatingPanel = false;
        if (!freeScroll && lastPanelTop(getPanels()) > PAST_LAST_TOP) {
          enableCssSnap();
        } else {
          disableCssSnap();
        }
        window.removeEventListener('scrollend', finish);
      };
      window.addEventListener('scrollend', finish);
      restoreTimer = setTimeout(finish, SNAP_RESTORE_MS);
    };

    const onWheel = (event: WheelEvent) => {
      if (!root.classList.contains('story-snap')) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      const dy = normalizeDeltaY(event);
      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }

      const current = nearestPanelIndex(panels);
      const currentPanel = panels[current];
      const atStart = current <= 0;
      const atEnd = current >= panels.length - 1;
      const top = lastPanelTop(panels);
      const pastLast = top < PAST_LAST_TOP;

      // Hold takes priority even in free-scroll edge cases when on a hold panel.
      if (currentPanel?.dataset.storyHold === 'visions') {
        const direction: -1 | 1 = dy > 0 ? 1 : -1;
        if (tryHold(direction, currentPanel)) {
          event.preventDefault();
          lockUntil = performance.now() + LOCK_MS;
          accumulated = 0;
          return;
        }
      }

      if (freeScroll || pastLast) {
        freeScroll = true;
        disableCssSnap();

        if (dy < 0 && top >= PAST_LAST_TOP && top < REARM_SNAP_TOP) {
          freeScroll = false;
          event.preventDefault();
          if (performance.now() < lockUntil) {
            return;
          }
          accumulated += dy;
          if (Math.abs(accumulated) < WHEEL_THRESHOLD) {
            return;
          }
          go(-1);
          return;
        }

        accumulated = 0;
        return;
      }

      if (atEnd && dy > 0) {
        freeScroll = true;
        disableCssSnap();
        accumulated = 0;
        return;
      }

      if (atStart && dy < 0) {
        event.preventDefault();
        accumulated = 0;
        return;
      }

      event.preventDefault();

      if (performance.now() < lockUntil) {
        return;
      }

      accumulated += dy;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) {
        return;
      }

      const direction: -1 | 1 = accumulated > 0 ? 1 : -1;
      go(direction);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', syncFreeScrollFromPosition, { passive: true });
    syncFreeScrollFromPosition();

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', syncFreeScrollFromPosition);
      if (restoreTimer) {
        clearTimeout(restoreTimer);
      }
      enableCssSnap();
    };
  }, [active, holdPanelRef]);
}
