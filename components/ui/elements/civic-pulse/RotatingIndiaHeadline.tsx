'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  JOIN_ADJECTIVE_CROSSFADE_MS,
  JOIN_ADJECTIVE_HOLD_MS,
  JOIN_INDIA_ADJECTIVES,
} from '@/lib/data/join-india-adjectives';
import { cn } from '@/lib/utils/index';

export interface RotatingIndiaHeadlineProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  /** Accessible full phrase (static). */
  readonly ariaLabel: string;
  readonly lead?: string;
  readonly trail?: string;
  readonly words?: readonly string[];
  /** Storybook / tests: force reduced-motion (no rotation). */
  readonly reducedMotion?: boolean;
}

/**
 * Sentence-style line: “Let's build {Transparent|Safer|…} India.”
 * Slot width follows the *active* word so short adjectives don’t leave a hole
 * before “India.” (reads as a real sentence, not a fixed-width slot).
 */
export function RotatingIndiaHeadline({
  className,
  ariaLabel,
  lead = "Let's build",
  trail = 'India.',
  words = JOIN_INDIA_ADJECTIVES,
  reducedMotion: reducedMotionProp,
}: RotatingIndiaHeadlineProps) {
  const list = useMemo(
    () => (words.length > 0 ? [...words] : [...JOIN_INDIA_ADJECTIVES]),
    [words],
  );

  const measureRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [slotWidth, setSlotWidth] = useState<number | undefined>(undefined);
  const indexRef = useRef(0);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const reduced = reducedMotionProp ?? systemReduced;
  const current = list[index] ?? 'Transparent';
  const previous = prevIndex != null ? list[prevIndex] : null;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Width follows the live word so “Safer India.” sits flush (no dead gap after short words).
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) {
      return;
    }
    const w = el.getBoundingClientRect().width;
    if (w > 0) {
      setSlotWidth(w);
    }
  }, [current]);

  useEffect(() => {
    if (reduced || list.length < 2) {
      return;
    }
    const id = window.setInterval(() => {
      const i = indexRef.current;
      const next = (i + 1) % list.length;
      indexRef.current = next;
      setPrevIndex(i);
      setIndex(next);
    }, JOIN_ADJECTIVE_HOLD_MS);
    return () => window.clearInterval(id);
  }, [reduced, list]);

  useEffect(() => {
    if (prevIndex == null) {
      return;
    }
    const t = window.setTimeout(() => setPrevIndex(null), JOIN_ADJECTIVE_CROSSFADE_MS);
    return () => window.clearTimeout(t);
  }, [prevIndex]);

  return (
    <h2
      id="join-headline"
      aria-label={ariaLabel}
      className={cn(
        'join-india-headline text-4xl font-light tracking-tight text-balance text-white md:text-5xl',
        className,
      )}
    >
      <span className="join-india-lead text-white" id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l108-c7">{lead}</span>
      {/* single normal spaces → reads as one sentence */}
      <span className="join-india-gap" id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l110-c7"> </span>
      <span
        className="join-word-slot relative inline-block align-baseline text-white"
        style={slotWidth != null ? { width: slotWidth } : undefined} id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l111-c7"
      >
        <span
          ref={measureRef}
          className="invisible inline-block whitespace-nowrap font-medium text-white"
          aria-hidden id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l115-c9"
        >
          {current}
        </span>
        {previous != null && previous !== current ? (
          <span
            key={`out-${prevIndex}-${previous}`}
            className="join-word join-word-out absolute top-0 left-0 whitespace-nowrap font-medium text-white"
            aria-hidden id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l123-c11"
          >
            {previous}
          </span>
        ) : null}
        <span
          key={`in-${index}-${current}`}
          className={cn(
            'join-word absolute top-0 left-0 whitespace-nowrap font-medium text-white',
            !reduced && 'join-word-in',
          )}
          aria-hidden id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l131-c9"
        >
          {current}
        </span>
      </span>
      <span className="join-india-gap" id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l142-c7"> </span>
      <span className="join-india-trail text-white" id="tpl-components-ui-elements-civic-pulse-rotating-india-headline-l143-c7">{trail}</span>
    </h2>
  );
}
