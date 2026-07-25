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

/**
 * Gear / spring commit thresholds (touch).
 * Must drag ~25% of the viewport OR flick hard enough — otherwise spring back.
 */
export const SPRING_DISTANCE_RATIO = 0.25;
/** Positive velocity = intend next panel (finger moving up), px/ms. */
export const SPRING_VELOCITY_THRESHOLD = 0.45;
/** Max wait for momentum scroll to settle after touchend. */
const SETTLE_MAX_MS = 420;
/** Consecutive near-still frames before treating scroll as settled. */
const SETTLE_STABLE_FRAMES = 3;

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

export type ResolveSpringTargetArgs = {
  readonly fromIndex: number;
  readonly panelCount: number;
  /** scrollY − panelScrollTop(from); positive = toward next. */
  readonly deltaFromPanelTop: number;
  readonly viewportHeight: number;
  /** Positive = intend next (finger moved up / scroll down). px/ms. */
  readonly velocityPxPerMs: number;
  readonly distanceRatio?: number;
  readonly velocityThreshold?: number;
  /**
   * When true and gesture is past the last panel toward footer, keep free scroll
   * (return fromIndex so caller can leave scroll alone).
   */
  readonly allowFreeScrollPastLast?: boolean;
};

/**
 * Gear-hole spring: commit to an adjacent panel only if distance or velocity
 * clears the threshold; otherwise return `fromIndex` (spring back).
 */
export function resolveSpringTarget({
  fromIndex,
  panelCount,
  deltaFromPanelTop,
  viewportHeight,
  velocityPxPerMs,
  distanceRatio = SPRING_DISTANCE_RATIO,
  velocityThreshold = SPRING_VELOCITY_THRESHOLD,
  allowFreeScrollPastLast = true,
}: ResolveSpringTargetArgs): number {
  if (panelCount <= 0) {
    return 0;
  }
  const from = Math.max(0, Math.min(fromIndex, panelCount - 1));
  const vh = Math.max(1, viewportHeight);
  const distanceCommit = Math.abs(deltaFromPanelTop) >= vh * distanceRatio;
  const velocityCommit = Math.abs(velocityPxPerMs) >= velocityThreshold;

  // Past last panel into footer — do not yank back if free-scroll is allowed.
  if (allowFreeScrollPastLast && from >= panelCount - 1 && deltaFromPanelTop > vh * 0.08) {
    return from;
  }

  const intendNext =
    deltaFromPanelTop > 0 && (distanceCommit || (velocityCommit && velocityPxPerMs > 0));
  const intendPrev =
    deltaFromPanelTop < 0 && (distanceCommit || (velocityCommit && velocityPxPerMs < 0));

  // Strong flick with little residual distance (momentum already used): use velocity sign.
  if (!intendNext && !intendPrev && velocityCommit) {
    if (velocityPxPerMs > 0 && from < panelCount - 1) {
      return from + 1;
    }
    if (velocityPxPerMs < 0 && from > 0) {
      return from - 1;
    }
  }

  if (intendNext && from < panelCount - 1) {
    return from + 1;
  }
  if (intendPrev && from > 0) {
    return from - 1;
  }
  return from;
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
 * Full-page story snap with gear / spring commit:
 * - Wheel: accumulate past threshold → one panel jump (existing).
 * - Touch: free drag while finger is down; on settle, commit to next/prev only if
 *   distance or velocity clears the threshold, otherwise spring back.
 * After the last panel (volunteer), scroll stays free into the footer.
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
    let anchoredIndex = 0;

    // Touch gesture tracking
    let trackingTouch = false;
    let touchId: number | null = null;
    let touchStartY = 0;
    let touchStartT = 0;
    let touchLastY = 0;
    let touchLastT = 0;
    let gestureFromIndex = 0;
    let settleRaf = 0;
    let settleDeadline = 0;

    const root = document.documentElement;
    const prefersReducedMotion = () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const enableCssSnap = () => {
      // Spring gear is owned by this hook; keep CSS snap off so it cannot fight rebound.
      root.style.scrollSnapType = 'none';
    };

    const disableCssSnap = () => {
      root.style.scrollSnapType = 'none';
    };

    // Always own snap while active — CSS mandatory snap is too eager on touch.
    disableCssSnap();

    const lastPanelTop = (panels: HTMLElement[]) => {
      const last = panels[panels.length - 1];
      return last ? last.getBoundingClientRect().top : 0;
    };

    const syncFreeScrollFromPosition = () => {
      if (!root.classList.contains('story-snap') || animatingPanel || trackingTouch) {
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
        anchoredIndex = panels.length - 1;
        return;
      }

      if (freeScroll && top > REARM_SNAP_TOP) {
        freeScroll = false;
        anchoredIndex = nearestPanelIndex(panels);
      }
    };

    const tryHold = (direction: -1 | 1, currentPanel: HTMLElement | undefined): boolean => {
      if (!currentPanel || !holdPanelRef?.current) {
        return false;
      }
      return holdPanelRef.current({ direction, currentPanel });
    };

    const goToIndex = (index: number) => {
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

      const targetIndex = Math.max(0, Math.min(index, panels.length - 1));
      const panel = panels[targetIndex];
      if (!panel) {
        return;
      }

      const current = nearestPanelIndex(panels);
      const currentPanel = panels[current];
      const direction: -1 | 1 = targetIndex >= current ? 1 : -1;

      if (targetIndex !== current && tryHold(direction, currentPanel)) {
        lockUntil = now + LOCK_MS;
        accumulated = 0;
        // Spring back to hold panel rather than advancing.
        const holdPanel = currentPanel;
        if (holdPanel) {
          animatingPanel = true;
          freeScroll = false;
          disableCssSnap();
          window.scrollTo({
            top: panelScrollTop(holdPanel),
            left: 0,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          });
          const finishHold = () => {
            animatingPanel = false;
            anchoredIndex = current;
            window.removeEventListener('scrollend', finishHold);
          };
          window.addEventListener('scrollend', finishHold);
          if (restoreTimer) {
            clearTimeout(restoreTimer);
          }
          restoreTimer = setTimeout(finishHold, SNAP_RESTORE_MS);
        }
        return;
      }

      freeScroll = false;
      lockUntil = now + LOCK_MS;
      accumulated = 0;
      animatingPanel = true;
      anchoredIndex = targetIndex;

      if (restoreTimer) {
        clearTimeout(restoreTimer);
      }

      disableCssSnap();
      window.scrollTo({
        top: panelScrollTop(panel),
        left: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });

      const finish = () => {
        animatingPanel = false;
        anchoredIndex = targetIndex;
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

    const go = (direction: -1 | 1) => {
      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }
      const current = nearestPanelIndex(panels);
      const next = current + direction;
      if (next < 0 || next >= panels.length) {
        return;
      }
      goToIndex(next);
    };

    const cancelSettle = () => {
      if (settleRaf) {
        cancelAnimationFrame(settleRaf);
        settleRaf = 0;
      }
    };

    const resolveTouchSpring = () => {
      if (!root.classList.contains('story-snap') || animatingPanel) {
        return;
      }

      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }

      const from = Math.max(0, Math.min(gestureFromIndex, panels.length - 1));
      const fromPanel = panels[from];
      if (!fromPanel) {
        return;
      }

      const top = lastPanelTop(panels);
      const pastLast = top < PAST_LAST_TOP;

      // Already free-scrolling in footer — leave scroll alone.
      if (freeScroll || pastLast) {
        freeScroll = true;
        disableCssSnap();
        anchoredIndex = panels.length - 1;
        return;
      }

      const fromTop = panelScrollTop(fromPanel);
      const deltaFromPanelTop = window.scrollY - fromTop;
      const dt = Math.max(1, touchLastT - touchStartT);
      // Finger up → content advances → positive velocity toward next.
      const velocityPxPerMs = (touchStartY - touchLastY) / dt;
      const vh = window.innerHeight;

      // On last panel, enough downward drag/flick enters free footer scroll (no spring yank).
      if (
        from >= panels.length - 1 &&
        (deltaFromPanelTop > vh * 0.08 || velocityPxPerMs >= SPRING_VELOCITY_THRESHOLD)
      ) {
        freeScroll = true;
        disableCssSnap();
        anchoredIndex = panels.length - 1;
        return;
      }

      const target = resolveSpringTarget({
        fromIndex: from,
        panelCount: panels.length,
        deltaFromPanelTop,
        viewportHeight: vh,
        velocityPxPerMs,
      });

      if (target === from) {
        // Spring back (or already aligned) — always re-seat so partial drag rebounds.
        goToIndex(from);
        return;
      }

      const direction: -1 | 1 = target > from ? 1 : -1;
      if (tryHold(direction, fromPanel)) {
        goToIndex(from);
        return;
      }

      goToIndex(target);
    };

    const startSettleWatch = () => {
      cancelSettle();
      settleDeadline = performance.now() + SETTLE_MAX_MS;
      let lastY = window.scrollY;
      let stable = 0;

      const tick = () => {
        const y = window.scrollY;
        if (Math.abs(y - lastY) < 1.5) {
          stable += 1;
        } else {
          stable = 0;
          lastY = y;
        }

        if (stable >= SETTLE_STABLE_FRAMES || performance.now() >= settleDeadline) {
          settleRaf = 0;
          resolveTouchSpring();
          return;
        }
        settleRaf = requestAnimationFrame(tick);
      };

      settleRaf = requestAnimationFrame(tick);
    };

    const findTouch = (list: TouchList, id: number | null): Touch | null => {
      if (id === null) {
        return list[0] ?? null;
      }
      for (let i = 0; i < list.length; i += 1) {
        const t = list.item(i);
        if (t && t.identifier === id) {
          return t;
        }
      }
      return null;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!root.classList.contains('story-snap')) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (animatingPanel) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      cancelSettle();
      trackingTouch = true;
      touchId = touch.identifier;
      touchStartY = touch.clientY;
      touchStartT = performance.now();
      touchLastY = touchStartY;
      touchLastT = touchStartT;

      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }

      // If free-scrolling in footer, only re-enter gear when clearly back near last panel.
      const top = lastPanelTop(panels);
      if (freeScroll || top < PAST_LAST_TOP) {
        freeScroll = true;
        if (top > REARM_SNAP_TOP) {
          freeScroll = false;
        } else if (top < PAST_LAST_TOP) {
          // Stay free; still track so a strong upward flick can re-enter.
          gestureFromIndex = panels.length - 1;
          disableCssSnap();
          return;
        }
      }

      gestureFromIndex = freeScroll ? panels.length - 1 : nearestPanelIndex(panels);
      // Prefer last settled gear hole when still near it (avoids mid-drag index flips).
      if (!freeScroll && Math.abs(nearestPanelIndex(panels) - anchoredIndex) <= 1) {
        const anchored = panels[anchoredIndex];
        if (anchored && Math.abs(anchored.getBoundingClientRect().top) < window.innerHeight * 0.45) {
          gestureFromIndex = anchoredIndex;
        }
      }

      disableCssSnap();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!trackingTouch) {
        return;
      }
      const touch = findTouch(event.touches, touchId) ?? findTouch(event.changedTouches, touchId);
      if (!touch) {
        return;
      }
      touchLastY = touch.clientY;
      touchLastT = performance.now();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!trackingTouch) {
        return;
      }
      const touch = findTouch(event.changedTouches, touchId);
      if (touch) {
        touchLastY = touch.clientY;
        touchLastT = performance.now();
      }
      trackingTouch = false;
      touchId = null;

      if (isEditableTarget(event.target)) {
        return;
      }

      // Let native momentum run briefly, then commit or spring back.
      startSettleWatch();
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
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('scroll', syncFreeScrollFromPosition, { passive: true });
    syncFreeScrollFromPosition();
    anchoredIndex = nearestPanelIndex(getPanels());

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('scroll', syncFreeScrollFromPosition);
      cancelSettle();
      if (restoreTimer) {
        clearTimeout(restoreTimer);
      }
      root.style.scrollSnapType = '';
    };
  }, [active, holdPanelRef]);
}
