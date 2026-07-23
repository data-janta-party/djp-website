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
 * Mobile: two lines — “Let's build” then “{adjective} India.”
 * Desktop: single line. Trail stays plain white (same as before).
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
        'join-india-headline text-4xl font-light tracking-tight text-white md:text-5xl',
        className,
      )}
    >
      {/* Line 1 on mobile: “Let's build” — single line with adjective+India from md up */}
      <span className="join-india-lead block text-white md:inline" id="join-india-lead">
        {lead}
      </span>
      <span className="join-india-gap hidden md:inline" id="join-india-gap-lead" aria-hidden>
        {' '}
      </span>
      {/* Line 2 on mobile: “{adjective} India.” */}
      <span
        className="join-india-line2 block whitespace-nowrap md:inline"
        id="join-india-line2"
      >
        <span
          className="join-word-slot relative inline-block align-baseline text-white"
          style={slotWidth != null ? { width: slotWidth } : undefined}
          id="join-word-slot"
        >
          <span
            ref={measureRef}
            className="invisible inline-block whitespace-nowrap font-medium text-white"
            aria-hidden
            id="join-word-measure"
          >
            {current}
          </span>
          {previous != null && previous !== current ? (
            <span
              key={`out-${prevIndex}-${previous}`}
              className="join-word join-word-out absolute top-0 left-0 whitespace-nowrap font-medium text-white"
              aria-hidden
              id="join-word-out"
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
            aria-hidden
            id="join-word-in"
          >
            {current}
          </span>
        </span>
        <span className="join-india-gap" id="join-india-gap-trail" aria-hidden>
          {' '}
        </span>
        <span className="join-india-trail text-white" id="join-india-trail">
          {trail}
        </span>
      </span>
    </h2>
  );
}
