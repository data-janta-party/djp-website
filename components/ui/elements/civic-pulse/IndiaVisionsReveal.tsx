'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils/index';

export interface IndiaVisionsRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Center of the cloud, e.g. "We want to fix India." */
  readonly center: string;
  /** Actionable words filling the viewport. */
  readonly words: readonly string[];
  readonly className?: string;
}

type CloudPlacement = {
  readonly word: string;
  readonly top: number;
  readonly left: number;
  readonly sizePx: number;
  readonly opacity: number;
  readonly emerald: boolean;
  readonly weight: 300 | 400 | 500;
};

/** Deterministic 0–1 from index (stable across SSR/client). */
function hash01(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Place words in a filled viewport spiral, with a soft hole in the center
 * so the headline stays readable.
 */
function buildPlacements(words: readonly string[]): CloudPlacement[] {
  const out: CloudPlacement[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle
  const n = words.length;

  for (let i = 0; i < n; i += 1) {
    const word = words[i]!;
    // Spiral radius: start outside the center hole (~18%), grow to ~48%
    const t = (i + 0.5) / n;
    const r = 0.16 + t * 0.36 + hash01(i * 3.1) * 0.06;
    const angle = i * golden + hash01(i * 7.7) * 0.35;
    // Convert polar → % of box (0–100), centered at 50,50
    let left = 50 + Math.cos(angle) * r * 100;
    let top = 50 + Math.sin(angle) * r * 92; // slight vertical squash

    // Jitter so it feels organic, not a perfect spiral
    left += (hash01(i * 1.3) - 0.5) * 7;
    top += (hash01(i * 2.1) - 0.5) * 6;

    // Keep inside frame with a small margin
    left = Math.min(96, Math.max(4, left));
    top = Math.min(95, Math.max(5, top));

    // Size: more words near center slightly larger / more contrast
    const sizeRoll = hash01(i * 4.4);
    const sizePx =
      sizeRoll > 0.82 ? 20 + hash01(i) * 8 : sizeRoll > 0.5 ? 14 + hash01(i) * 6 : 11 + hash01(i) * 4;

    const opacity =
      sizeRoll > 0.75 ? 0.88 : sizeRoll > 0.4 ? 0.55 + hash01(i * 9) * 0.25 : 0.28 + hash01(i * 5) * 0.25;

    const emerald = hash01(i * 11) > 0.42;
    const weight: 300 | 400 | 500 = sizeRoll > 0.78 ? 500 : sizeRoll > 0.45 ? 400 : 300;

    out.push({ word, top, left, sizePx, opacity, emerald, weight });
  }

  return out;
}

/**
 * Full-viewport word cloud of civic aspirations around a fixed center line.
 */
export function IndiaVisionsReveal({ center, words, className }: IndiaVisionsRevealProps) {
  const placements = useMemo(() => buildPlacements(words), [words]);

  return (
    <div
      id="story-india-visions-line"
      className={cn(
        // Fill the story panel — not a small card in the middle
        'absolute inset-0 overflow-hidden',
        className,
      )}
      aria-label={`${center} ${words.slice(0, 24).join(', ')}`}
    >
      <div id="story-india-visions-cloud" className="absolute inset-0" aria-hidden>
        {placements.map((p, i) => (
          <span
            key={`${p.word}-${i}`}
            data-cloud-word={p.word}
            className="absolute max-w-[40vw] truncate tracking-tight select-none"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${p.sizePx}px`,
              fontWeight: p.weight,
              opacity: p.opacity,
              color: p.emerald ? 'rgb(110 231 183)' /* emerald-300 */ : 'rgb(255 255 255)',
            }} id={`tpl-components-ui-elements-civic-pulse-india-visions-reveal-l93-c11-${i}`}
          >
            {p.word}
          </span>
        ))}
      </div>

      {/* Soft vignette so edges don’t fight the center line */}
      <div className="india-visions-vignette pointer-events-none absolute inset-0" aria-hidden id="tpl-components-ui-elements-civic-pulse-india-visions-reveal-l113-c7" />

      <p
        id="story-india-visions-center"
        className="india-visions-center pointer-events-none absolute top-1/2 left-1/2 z-10 max-w-md -translate-x-1/2 -translate-y-1/2 text-center text-3xl font-medium tracking-tight text-balance text-white md:max-w-lg md:text-5xl lg:text-6xl"
      >
        {center}
      </p>
    </div>
  );
}
