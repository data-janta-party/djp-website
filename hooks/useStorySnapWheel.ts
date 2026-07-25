'use client';

/**
 * Home story-snap scroll — spring gear owns wheel/touch panel advances.
 *
 * Lifecycle: while `active`, owns `html.story-snap` + clears CSS scroll-snap so
 * it cannot fight rebound. Pure helpers: `resolveSpringTarget`,
 * `resolveTallPanelSpring`, `panelFreeScrollRange`, `accumulateWheelDelta`
 * (unit-tested).
 *
 * Known residual: the main effect is still a large gesture→commit state machine
 * (wheel + touch + free-scroll past last). Further decomposition (gesture event
 * → intent → commit) is a follow-up; do not treat this file as fully de-spaghettified.
 */

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
/**
 * Min free-scroll travel (px) for a panel to count as tall.
 * Tall panels (e.g. Join with 3 cards) free-scroll inside; short ones keep gear snap.
 */
export const TALL_PANEL_MIN_RANGE = 16;
/** Edge band near free-range ends where a strong flick can still commit. */
const TALL_EDGE_RATIO = 0.08;
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

/**
 * Prefer the panel whose free-scroll range contains scrollY (tall Join mid-read).
 * Falls back to nearest panel top when between panels / overshooting.
 */
function activePanelIndex(
  panels: HTMLElement[],
  scrollY: number,
  viewportHeight: number,
  preferredIndex?: number,
): number {
  if (panels.length === 0) {
    return 0;
  }

  // Prefer anchored / preferred panel when still inside its free range.
  if (preferredIndex !== undefined) {
    const preferred = panels[preferredIndex];
    if (preferred) {
      const range = panelFreeScrollRange(preferred, viewportHeight, scrollY);
      if (scrollY >= range.minY - 2 && scrollY <= range.maxY + 2) {
        return preferredIndex;
      }
    }
  }

  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    if (!panel) {
      continue;
    }
    const range = panelFreeScrollRange(panel, viewportHeight, scrollY);
    if (scrollY >= range.minY - 2 && scrollY <= range.maxY + 2) {
      return i;
    }
  }

  return nearestPanelIndex(panels);
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
 * Accumulate wheel deltas until `|sum| >= threshold`, then commit a panel step.
 * Pure helper so gesture→commit threshold is unit-testable outside the effect.
 */
export function accumulateWheelDelta(
  accumulated: number,
  deltaY: number,
  threshold: number = WHEEL_THRESHOLD,
): { accumulated: number; commitDirection: -1 | 1 | null } {
  const next = accumulated + deltaY;
  if (Math.abs(next) < threshold) {
    return { accumulated: next, commitDirection: null };
  }
  return { accumulated: 0, commitDirection: next > 0 ? 1 : -1 };
}

/**
 * Scroll Y to align the panel top with the viewport top.
 * Titles clear the sticky nav via .story-snap-inset padding (not scroll offset).
 */
function panelScrollTop(panel: HTMLElement): number {
  return panel.getBoundingClientRect().top + window.scrollY;
}

export type PanelFreeScrollRange = {
  /** scrollY when panel top is flush with viewport top. */
  readonly minY: number;
  /** scrollY when panel bottom is flush with viewport bottom ( ≥ minY ). */
  readonly maxY: number;
  /** True when the panel is taller than the viewport enough to free-scroll inside. */
  readonly isTall: boolean;
};

/**
 * Free-scroll range for a panel: [minY, maxY].
 * End-slack padding is part of panel height, so maxY includes runway below content.
 */
export function panelFreeScrollRange(
  panel: HTMLElement,
  viewportHeight: number,
  scrollY = 0,
): PanelFreeScrollRange {
  const vh = Math.max(1, viewportHeight);
  const rect = panel.getBoundingClientRect();
  const minY = rect.top + scrollY;
  const panelHeight = panel.offsetHeight > 0 ? panel.offsetHeight : rect.height;
  const maxY = Math.max(minY, minY + panelHeight - vh);
  return {
    minY,
    maxY,
    isTall: maxY - minY > TALL_PANEL_MIN_RANGE,
  };
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
 * Gear-hole spring for short panels: commit to an adjacent panel only if distance
 * or velocity clears the threshold; otherwise return `fromIndex` (spring back).
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
 * Tall-panel spring result:
 * - leave: free-scroll mid-panel (do not reseat)
 * - goto: jump to another panel index
 * - reseat: smooth scroll to a Y within the free range (edge rebound)
 */
export type TallPanelSpringResult =
  | { readonly kind: 'leave' }
  | { readonly kind: 'goto'; readonly index: number }
  | { readonly kind: 'reseat'; readonly y: number };

export type ResolveTallPanelSpringArgs = {
  readonly fromIndex: number;
  readonly panelCount: number;
  readonly scrollY: number;
  readonly minY: number;
  readonly maxY: number;
  readonly viewportHeight: number;
  readonly velocityPxPerMs: number;
  readonly distanceRatio?: number;
  readonly velocityThreshold?: number;
  readonly allowFreeScrollPastLast?: boolean;
};

/**
 * Free-scroll inside tall panels; commit next/prev only past free-range edges.
 * Never reseats mid-panel reading back to the panel top.
 */
export function resolveTallPanelSpring({
  fromIndex,
  panelCount,
  scrollY,
  minY,
  maxY,
  viewportHeight,
  velocityPxPerMs,
  distanceRatio = SPRING_DISTANCE_RATIO,
  velocityThreshold = SPRING_VELOCITY_THRESHOLD,
  allowFreeScrollPastLast = true,
}: ResolveTallPanelSpringArgs): TallPanelSpringResult {
  if (panelCount <= 0) {
    return { kind: 'leave' };
  }
  const from = Math.max(0, Math.min(fromIndex, panelCount - 1));
  const vh = Math.max(1, viewportHeight);
  const overshootDown = scrollY - maxY;
  const overshootUp = minY - scrollY;
  const distanceCommitDown = overshootDown >= vh * distanceRatio;
  const distanceCommitUp = overshootUp >= vh * distanceRatio;
  const velocityCommit = Math.abs(velocityPxPerMs) >= velocityThreshold;
  const edgeBand = vh * TALL_EDGE_RATIO;

  // Past last panel free range → footer free scroll (leave alone).
  if (allowFreeScrollPastLast && from >= panelCount - 1 && overshootDown > vh * 0.08) {
    return { kind: 'leave' };
  }

  // Still inside free range (including small float noise).
  if (overshootDown <= 1 && overshootUp <= 1) {
    const nearBottom = scrollY >= maxY - edgeBand;
    const nearTop = scrollY <= minY + edgeBand;

    // Strong flick near free-range edges can still advance / go back.
    if (velocityCommit && velocityPxPerMs > 0 && nearBottom && from < panelCount - 1) {
      return { kind: 'goto', index: from + 1 };
    }
    if (velocityCommit && velocityPxPerMs < 0 && nearTop && from > 0) {
      return { kind: 'goto', index: from - 1 };
    }

    return { kind: 'leave' };
  }

  // Past bottom of free range — commit next or rebound to maxY.
  if (overshootDown > 1) {
    if (distanceCommitDown || (velocityCommit && velocityPxPerMs > 0)) {
      if (from < panelCount - 1) {
        return { kind: 'goto', index: from + 1 };
      }
      // Last panel: enter free footer, do not yank.
      return { kind: 'leave' };
    }
    return { kind: 'reseat', y: maxY };
  }

  // Past top of free range — commit prev or rebound to minY.
  if (overshootUp > 1) {
    if (distanceCommitUp || (velocityCommit && velocityPxPerMs < 0)) {
      if (from > 0) {
        return { kind: 'goto', index: from - 1 };
      }
      return { kind: 'reseat', y: minY };
    }
    return { kind: 'reseat', y: minY };
  }

  return { kind: 'leave' };
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
 * - Short panels: wheel threshold / touch distance → one panel jump.
 * - Tall panels (content + end-slack taller than viewport): free-scroll inside;
 *   only commit next/prev past free-range edges (so Join cards stay readable).
 * - After the last panel (volunteer), scroll stays free into the footer.
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

    /** CSS mandatory snap fights spring rebound — always clear while this hook owns scroll. */
    const clearCssSnap = () => {
      root.style.scrollSnapType = 'none';
    };

    // Always own snap while active — CSS mandatory snap is too eager on touch.
    clearCssSnap();
    root.classList.add('story-snap');

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
        clearCssSnap();
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

    const animateScrollTo = (top: number, onDone: () => void) => {
      animatingPanel = true;
      freeScroll = false;
      clearCssSnap();
      if (restoreTimer) {
        clearTimeout(restoreTimer);
      }
      window.scrollTo({
        top,
        left: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      const finish = () => {
        animatingPanel = false;
        onDone();
        window.removeEventListener('scrollend', finish);
      };
      window.addEventListener('scrollend', finish);
      restoreTimer = setTimeout(finish, SNAP_RESTORE_MS);
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

      const current = activePanelIndex(
        panels,
        window.scrollY,
        window.innerHeight,
        anchoredIndex,
      );
      const currentPanel = panels[current];
      const direction: -1 | 1 = targetIndex >= current ? 1 : -1;

      if (targetIndex !== current && tryHold(direction, currentPanel)) {
        lockUntil = now + LOCK_MS;
        accumulated = 0;
        // Spring back to hold panel rather than advancing.
        const holdPanel = currentPanel;
        if (holdPanel) {
          animateScrollTo(panelScrollTop(holdPanel), () => {
            anchoredIndex = current;
          });
        }
        return;
      }

      lockUntil = now + LOCK_MS;
      accumulated = 0;
      anchoredIndex = targetIndex;

      animateScrollTo(panelScrollTop(panel), () => {
        anchoredIndex = targetIndex;
        // Formerly enable/disable CSS snap; both paths clear — spring gear owns scroll.
        clearCssSnap();
      });
    };

    /** Soft reseat within a tall panel free range (not a panel index jump). */
    const goToScrollY = (y: number) => {
      const now = performance.now();
      if (now < lockUntil) {
        return;
      }
      if (!root.classList.contains('story-snap')) {
        return;
      }
      lockUntil = now + LOCK_MS;
      accumulated = 0;
      animateScrollTo(y, () => {
        clearCssSnap();
      });
    };

    const go = (direction: -1 | 1) => {
      const panels = getPanels();
      if (panels.length === 0) {
        return;
      }
      const current = activePanelIndex(
        panels,
        window.scrollY,
        window.innerHeight,
        anchoredIndex,
      );
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
        clearCssSnap();
        anchoredIndex = panels.length - 1;
        return;
      }

      const fromTop = panelScrollTop(fromPanel);
      const deltaFromPanelTop = window.scrollY - fromTop;
      const dt = Math.max(1, touchLastT - touchStartT);
      // Finger up → content advances → positive velocity toward next.
      const velocityPxPerMs = (touchStartY - touchLastY) / dt;
      const vh = window.innerHeight;
      const range = panelFreeScrollRange(fromPanel, vh, window.scrollY);

      // Tall panel: free-scroll mid-content; only edge spring commits.
      if (range.isTall) {
        const result = resolveTallPanelSpring({
          fromIndex: from,
          panelCount: panels.length,
          scrollY: window.scrollY,
          minY: range.minY,
          maxY: range.maxY,
          viewportHeight: vh,
          velocityPxPerMs,
        });

        // Last panel leaving free range → free footer (do not reseat).
        if (from >= panels.length - 1 && result.kind === 'leave') {
          if (window.scrollY > range.maxY + 1) {
            freeScroll = true;
            clearCssSnap();
          }
          anchoredIndex = from;
          return;
        }

        if (result.kind === 'leave') {
          anchoredIndex = from;
          return;
        }
        if (result.kind === 'reseat') {
          goToScrollY(result.y);
          return;
        }

        const direction: -1 | 1 = result.index > from ? 1 : -1;
        if (tryHold(direction, fromPanel)) {
          goToScrollY(range.minY);
          return;
        }
        goToIndex(result.index);
        return;
      }

      // Short panel: existing gear-hole spring from panel top.
      // On last panel, enough downward drag/flick enters free footer scroll (no spring yank).
      if (
        from >= panels.length - 1 &&
        (deltaFromPanelTop > vh * 0.08 || velocityPxPerMs >= SPRING_VELOCITY_THRESHOLD)
      ) {
        freeScroll = true;
        clearCssSnap();
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
          clearCssSnap();
          return;
        }
      }

      // Prefer free-range containment so mid tall-panel reading stays on Join.
      gestureFromIndex = freeScroll
        ? panels.length - 1
        : activePanelIndex(panels, window.scrollY, window.innerHeight, anchoredIndex);

      clearCssSnap();
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

      const vh = window.innerHeight;
      const current = activePanelIndex(panels, window.scrollY, vh, anchoredIndex);
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
        clearCssSnap();

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

      // Tall intermediate / last panels: allow native wheel inside free range.
      if (currentPanel) {
        const range = panelFreeScrollRange(currentPanel, vh, window.scrollY);
        if (range.isTall) {
          const y = window.scrollY;
          const atTop = y <= range.minY + 2;
          const atBottom = y >= range.maxY - 2;

          if (dy > 0 && !atBottom) {
            // Scroll content (and end-slack) before committing next panel.
            accumulated = 0;
            anchoredIndex = current;
            return;
          }
          if (dy < 0 && !atTop) {
            accumulated = 0;
            anchoredIndex = current;
            return;
          }

          // At free-range edge on last panel scrolling down → free footer.
          if (atEnd && dy > 0 && atBottom) {
            freeScroll = true;
            clearCssSnap();
            accumulated = 0;
            return;
          }

          // At edge: gear-snap to adjacent panel.
          if ((dy > 0 && atBottom && !atEnd) || (dy < 0 && atTop && !atStart)) {
            event.preventDefault();
            if (performance.now() < lockUntil) {
              return;
            }
            const step = accumulateWheelDelta(accumulated, dy);
            accumulated = step.accumulated;
            if (!step.commitDirection) {
              return;
            }
            go(step.commitDirection);
            return;
          }
        }
      }

      if (atEnd && dy > 0) {
        freeScroll = true;
        clearCssSnap();
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

      const step = accumulateWheelDelta(accumulated, dy);
      accumulated = step.accumulated;
      if (!step.commitDirection) {
        return;
      }
      go(step.commitDirection);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('scroll', syncFreeScrollFromPosition, { passive: true });
    syncFreeScrollFromPosition();
    anchoredIndex = activePanelIndex(
      getPanels(),
      window.scrollY,
      window.innerHeight,
    );

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
      root.classList.remove('story-snap');
    };
  }, [active, holdPanelRef]);
}
