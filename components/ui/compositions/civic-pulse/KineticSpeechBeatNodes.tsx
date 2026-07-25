'use client';

/**
 * Kinetic speech beat DOM nodes + endcard roller.
 * Kind registry (render side): `BeatNodes` dispatches `beat.kind` → component.
 */

import {
  kineticSpeechRollerSlots,
  kineticSpeechRollerSpinDepth,
  kineticSpeechRollerVirtues,
} from '@/lib/kinetic-speech/constants';
import { roleClass } from '@/lib/kinetic-speech/motion';
import type { KineticBeat } from '@/lib/kinetic-speech/types';
import { cn } from '@/lib/utils/index';

/** Deterministic virtue sequence so SSR/client reel strips match. */
function reelSpinWords(finalWord: string, reelIndex: number, count: number): string[] {
  const words = kineticSpeechRollerVirtues;
  const out: string[] = [];
  let seed = (reelIndex + 1) * 2654435761;
  for (let n = 0; n < count; n += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out.push(words[seed % words.length] ?? 'walkable');
  }
  out.push(finalWord);
  return out;
}

/**
 * Finale roller: three slots always visible.
 * Revolve vision adjectives, then lock data · janta · party one by one.
 */
export function RollerUrl() {
  const spinDepth = kineticSpeechRollerSpinDepth;
  const slots = kineticSpeechRollerSlots;
  return (
    <div
      id="kinetic-roller"
      data-k-roller
      className="kinetic-roller kinetic-type-brand inline-flex items-center justify-center"
      aria-hidden
    >
      {slots.map((slot, i) => {
        // Final cell locks to domain part; prior cells cycle vision adjectives
        const spin = reelSpinWords(slot, i + 1, spinDepth);
        return (
          <span key={`slot-${slot}`} className="kinetic-roller-slot inline-flex items-baseline" id={`kinetic-roller-slot-${slot}`}>
            {i > 0 ? (
              <span data-k-roller-dot className="kinetic-roller-dot" id={`kinetic-roller-dot-${i}`}>
                .
              </span>
            ) : null}
            <span
              data-k-domain-slot={i}
              data-k-reel={i}
              className="kinetic-reel kinetic-reel-word" id={`kinetic-roller-reel-${i}`}
            >
              <span className="kinetic-reel-window" id={`kinetic-roller-window-${i}`}>
                <span
                  data-k-reel-strip
                  data-k-domain-reel={i}
                  data-k-reel-steps={spinDepth}
                  className="kinetic-reel-strip" id={`kinetic-roller-strip-${i}`}
                >
                  {spin.map((word, gi) => (
                    <span key={`d${i}-g${gi}`} className="kinetic-reel-cell" id={`kinetic-roller-cell-${i}-${gi}`}>
                      {word}
                    </span>
                  ))}
                </span>
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Shared bottom-rail lock for primary manifesto type (see .kinetic-type-anchor). */
const TYPE_ANCHOR_SHORT =
  'kinetic-type-anchor w-max max-w-[min(90vw,14ch)] px-2 text-center opacity-0 sm:max-w-[16ch] md:max-w-[18ch] lg:max-w-[22ch]';
const TYPE_ANCHOR_THESIS =
  'kinetic-type-anchor w-max max-w-[min(92vw,28ch)] px-3 text-center text-balance opacity-0 sm:px-4 md:max-w-[min(92vw,40ch)] md:px-6';

/** Kinds with explicit render branches in BeatNodes (incl. silence/endcard null). */
export const BEAT_NODE_KINDS = [
  'line',
  'pair',
  'slide-pair',
  'sticky',
  'sticky-pair',
  'flood',
  'cloud',
  'rapid',
  'quote',
  'project-delays',
  'silence',
  'endcard',
] as const satisfies readonly import('@/lib/kinetic-speech/types').KineticBeat['kind'][];

/**
 * Kind → render. Duration/transcript: `lib/kinetic-speech/kinds/`.
 * Schedule: `lib/kinetic-speech/schedule/`.
 */
export function BeatNodes({ beat }: { beat: KineticBeat }) {
  switch (beat.kind) {
    case 'line': {
      return (
        <p
          id={beat.id}
          data-k-node
          data-k-type-anchor="bottom"
          data-k-motion={beat.motion}
          className={cn(
            roleClass(beat.role),
            // Short-punch vs wide thesis — mobile uses softer caps; md+ restores punch widths
            beat.wide ? TYPE_ANCHOR_THESIS : TYPE_ANCHOR_SHORT,
            beat.dim && 'kinetic-dim-text',
            beat.tiranga && 'kinetic-tiranga',
            beat.role === 'brand' && 'tracking-[0.16em]',
          )}
        >
          {beat.emphasisWord ? (
            <LineWithEmphasis text={beat.text} word={beat.emphasisWord} idPrefix={beat.id} />
          ) : (
            beat.text
          )}
        </p>
      );
    }
    case 'pair': {
      const leadRole = beat.leadRole ?? 'body';
      const hitRole = beat.hitRole ?? 'slam';
      // Wide lead = thesis clamp (Demand multi-word connective).
      // Multi-word hits on wide pairs (e.g. Abki baar) share the thesis clamp;
      // short slam punches (now.) stay punch-width.
      const leadClamp = beat.wide ? TYPE_ANCHOR_THESIS : TYPE_ANCHOR_SHORT;
      const hitWordCount = beat.hit
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const hitClamp =
        beat.wide && hitWordCount > 1
          ? TYPE_ANCHOR_THESIS
          : 'kinetic-type-anchor w-max max-w-[min(90vw,14ch)] px-2 text-center opacity-0 sm:max-w-[16ch] md:max-w-[18ch]';
      return (
        <>
          <p
            id={`${beat.id}-lead`}
            data-k-node
            data-k-type-anchor="bottom"
            className={cn(roleClass(leadRole), leadClamp)}
          >
            {beat.lead}
          </p>
          <p
            id={`${beat.id}-hit`}
            data-k-node
            data-k-type-anchor="bottom"
            className={cn(roleClass(hitRole), hitClamp)}
          >
            {beat.hit}
          </p>
        </>
      );
    }
    case 'slide-pair': {
      const axis = beat.axis ?? 'x';
      return (
        <div
          id={beat.id}
          data-k-type-anchor="bottom"
          className={cn(
            // Band = position on type rail only. Flex alignment is Tailwind-only
            // (globals .kinetic-stage-rail-band must not set align-items).
            'kinetic-stage-rail-band px-4',
            // Mobile: always stack so Left/Right and Religion/Caste never squeeze.
            // md+: restore horizontal tussle for axis x; y stays column + centered.
            axis === 'y'
              ? 'flex-col items-center justify-center gap-2 sm:gap-3 md:gap-6'
              : 'flex-col items-center justify-center gap-2 sm:gap-3 md:flex-row md:items-end md:justify-center md:gap-16',
          )}
        >
          <p
            id={`${beat.id}-left`}
            data-k-node
            className="kinetic-type-body w-max max-w-[min(90vw,14ch)] self-center text-center opacity-0"
          >
            {beat.left}
          </p>
          <p
            id={`${beat.id}-right`}
            data-k-node
            className="kinetic-type-body w-max max-w-[min(90vw,14ch)] self-center text-center opacity-0"
          >
            {beat.right}
          </p>
        </div>
      );
    }
    case 'sticky': {
      const prefixRole = beat.prefixRole ?? 'body';
      const suffixRole = beat.steps[0]?.role ?? prefixRole;
      const hasTextSuffix = beat.steps.some((s) => s.suffix.length > 0);
      const hasDots = beat.steps.some((s) => (s.dots ?? 0) > 0);
      // Deadline morph + Still waiting (empty suffix + dots): same suffix-slot + step-local "..."
      // so ellipsis inherits body type size. Do not use a separate shared-dots chrome path.
      const useSuffixSlot = hasTextSuffix || hasDots;
      // Ellipsis inherits the phrase type role so dots read as trailing "..." not chrome.
      const dotsRole = suffixRole;
      // Wide: no trailing space char (flex gap handles spacing — trailing space collapses in flex).
      // Non-wide: NBSP after prefix when a word suffix follows; empty-suffix dots stay flush.
      const prefixText =
        hasTextSuffix && !beat.wide ? `${beat.prefix}\u00A0` : beat.prefix;
      // Sizer reserves painted width: dotted steps count suffix + "..." so ellipsis
      // hangs flush after the word (or alone for Still waiting) without clipping.
      const suffixSizeKey = (suffix: string, dots?: number) =>
        (dots ?? 0) > 0 ? `${suffix}...` : suffix;
      const longestSuffix = useSuffixSlot
        ? [...beat.steps].sort(
            (a, b) =>
              suffixSizeKey(b.suffix, b.dots).length - suffixSizeKey(a.suffix, a.dots).length,
          )[0]
        : null;
      const longestSizerText = longestSuffix
        ? suffixSizeKey(longestSuffix.suffix, longestSuffix.dots)
        : '';
      const loadingDots = (stepLocal: boolean, stepIndex = 0) => {
        const scope = stepLocal ? `${beat.id}-s${stepIndex}` : beat.id;
        return (
          <span
            id={stepLocal ? undefined : `${beat.id}-dots`}
            data-k-step-dots={stepLocal ? '' : undefined}
            className={cn(roleClass(dotsRole), 'kinetic-loading-dots pl-0 ml-0 gap-0')}
            aria-hidden
          >
            <span data-k-dot className="kinetic-loading-dot" id={`${scope}-dot-0`}>
              .
            </span>
            <span data-k-dot className="kinetic-loading-dot" id={`${scope}-dot-1`}>
              .
            </span>
            <span data-k-dot className="kinetic-loading-dot" id={`${scope}-dot-2`}>
              .
            </span>
          </span>
        );
      };
      return (
        <div
          id={beat.id}
          data-k-sticky
          data-k-type-anchor="bottom"
          className={cn(
            // Bottom-rail lock + baseline flex for prefix/suffix morph
            // Non-wide: gap-x-0 — space lives in prefix NBSP; suffix-run is one tight unit
            // Wide: CSS .kinetic-sticky-wide gap between prefix and suffix-run (always when wide)
            'kinetic-sticky kinetic-type-anchor flex items-baseline justify-center text-center opacity-0',
            !beat.wide && 'gap-x-0',
            // Gap + wrap helpers must follow beat.wide even if inline is omitted later
            beat.wide && 'kinetic-sticky-wide',
            beat.inline
              ? beat.wide
                ? // Demand long morph: content-sized on the rail; slightly wider clamp for one line
                  'kinetic-sticky-inline w-max max-w-[min(94vw,44ch)] flex-nowrap whitespace-nowrap px-3 sm:px-4 md:px-6'
                : // All short inline stickies: single-line nowrap (stable while morphing)
                  'kinetic-sticky-inline w-max max-w-[min(92vw,36ch)] flex-nowrap whitespace-nowrap px-3 sm:px-4 md:px-6'
              : // Non-inline morph (unused by director today): same single-line stability, tighter max-w
                'w-max max-w-[min(90vw,28ch)] flex-nowrap whitespace-nowrap px-2',
          )}
        >
          <span
            id={`${beat.id}-prefix`}
            data-k-node
            className={cn(roleClass(prefixRole), 'kinetic-sticky-prefix opacity-0')}
          >
            {prefixText}
          </span>
          {/* Suffix-run: morph word + step-local dots (Deadline) or dots-only slot (Still waiting) */}
          <span className="kinetic-sticky-suffix-run m-0 p-0" id={`${beat.id}-suffix-run`}>
            {useSuffixSlot ? (
              <span
                className={cn(
                  'kinetic-sticky-suffix-slot relative inline-block align-baseline',
                  beat.wide && 'kinetic-sticky-wide-slot',
                )} id={`${beat.id}-suffix-sizer`}
              >
                {/* Longest sizer holds stable slot width (includes "..." when any step has dots) */}
                <span
                  className={cn(
                    roleClass(suffixRole),
                    'invisible whitespace-nowrap',
                    beat.wide && 'max-w-full',
                  )}
                  aria-hidden id={`${beat.id}-suffix-spacer`}
                >
                  {longestSizerText}
                </span>
                {beat.steps.map((step, i) => (
                  <span
                    key={`${beat.id}-s${i}`}
                    id={`${beat.id}-s${i}`}
                    data-k-node
                    data-k-sticky-suffix
                    className={cn(
                      roleClass(step.role ?? suffixRole),
                      // Absolute opacity stack for all morph stickies; bottom locks baseline
                      'absolute left-0 bottom-0 whitespace-nowrap opacity-0',
                      beat.wide && 'max-w-full',
                    )}
                  >
                    {step.suffix}
                    {(step.dots ?? 0) > 0 ? loadingDots(true, i) : null}
                  </span>
                ))}
              </span>
            ) : (
              // No morph / no dots: keep step ids so the sticky scheduler can no-op safely
              beat.steps.map((step, i) => (
                <span
                  key={`${beat.id}-s${i}`}
                  id={`${beat.id}-s${i}`}
                  data-k-node
                  className="hidden"
                  aria-hidden
                >
                  {step.suffix}
                </span>
              ))
            )}
            {/* Shared post-prefix dots retired — Still waiting uses step-local dots like Deadline */}
            <span id={`${beat.id}-dots`} className="hidden" aria-hidden />
          </span>
        </div>
      );
    }
    case 'sticky-pair': {
      const fixedRole = beat.fixedRole ?? 'body';
      const stepRole = beat.stepRole ?? 'body';
      // Stack swap line over fixed (or fixed over swap for swap-hit) so combined
      // width never fights the stage overflow-hidden ancestors horizontally.
      const swapFirst = beat.mode === 'swap-lead';
      const longestStep =
        [...beat.steps].sort((a, b) => b.text.length - a.text.length)[0]?.text ?? '';
      const stepStack = (
        <span className="relative inline-grid min-h-[1.2em] w-full max-w-full items-baseline justify-items-center" id={`${beat.id}-swap-grid`}>
          <span
            className={cn(
              roleClass(stepRole),
              // Mobile: allow soft wrap for long inventory codes; md+: single-line punch
              'invisible col-start-1 row-start-1 max-w-full text-center whitespace-normal md:whitespace-nowrap',
            )}
            aria-hidden id={`${beat.id}-swap-sizer`}
          >
            {longestStep}
          </span>
          {beat.steps.map((step, i) => (
            <span
              key={`${beat.id}-swap-${i}`}
              id={`${beat.id}-swap-${i}`}
              data-k-node
              className={cn(
                roleClass(stepRole),
                'col-start-1 row-start-1 max-w-full text-center opacity-0 whitespace-normal md:whitespace-nowrap',
              )}
            >
              {step.text}
            </span>
          ))}
        </span>
      );
      const fixedStack = (
        <span
          id={`${beat.id}-fixed`}
          data-k-node
          className={cn(
            roleClass(fixedRole),
            'max-w-full text-center opacity-0 whitespace-normal md:whitespace-nowrap',
          )}
        >
          {beat.fixed}
        </span>
      );
      return (
        <div
          id={beat.id}
          data-k-sticky-pair
          data-k-type-anchor="bottom"
          className={cn(
            // Two-line stack bottom-locks on the rail (grows upward). Dense inventory keeps smaller type.
            'kinetic-sticky-inline kinetic-sticky-pair kinetic-type-anchor flex w-full max-w-[min(96vw,72rem)] flex-col items-center justify-end gap-y-1 overflow-visible px-3 text-center opacity-0 sm:px-4 md:w-max md:px-6',
            beat.dense && 'kinetic-sticky-pair-dense',
          )}
        >
          {swapFirst ? (
            <>
              {stepStack}
              {fixedStack}
            </>
          ) : (
            <>
              {fixedStack}
              {stepStack}
            </>
          )}
        </div>
      );
    }
    case 'flood': {
      return (
        <div
          id={beat.id}
          data-k-flood
          data-k-flood-mode="words"
          className="kinetic-flood-wall absolute inset-0 z-[1] flex flex-wrap content-center items-center justify-center gap-x-2 gap-y-1 overflow-hidden p-2 opacity-0 sm:gap-x-3 sm:gap-y-2 sm:p-3 md:gap-x-4 md:gap-y-3"
        >
          {Array.from({ length: beat.count }).map((_, i) => {
            const word = beat.words[i % beat.words.length]!;
            return (
              <span
                key={`${beat.id}-tile-${i}`}
                data-k-flood-tile
                className="kinetic-type-micro-grid kinetic-spam-word opacity-0" id={`${beat.id}-flood-${i}`}
              >
                {word}
              </span>
            );
          })}
        </div>
      );
    }
    case 'cloud': {
      return (
        <div
          id={beat.id}
          data-k-cloud
          className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-x-3 gap-y-2 p-3 opacity-0 sm:gap-x-5 sm:gap-y-4 sm:p-6 md:gap-x-8 md:gap-y-5"
        >
          {beat.words.map((word) => (
            <span
              key={`${beat.id}-${word}`}
              data-k-cloud-word
              className="kinetic-cloud-word opacity-0" id={`${beat.id}-cloud-${word}`}
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    case 'rapid': {
      const role = beat.role ?? 'body';
      return (
        <div
          id={beat.id}
          data-k-rapid
          className="absolute inset-0 opacity-0"
        >
          {beat.words.map((word, i) => (
            <span
              key={`${beat.id}-w${i}`}
              id={`${beat.id}-w${i}`}
              data-k-rapid-word
              data-k-node
              data-k-type-anchor="bottom"
              className={cn(roleClass(role), 'kinetic-type-anchor w-max text-center opacity-0')}
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    case 'quote': {
      const textRole = beat.textRole ?? 'body';
      const attrRole = beat.attrRole ?? 'whisper';
      return (
        <div
          id={beat.id}
          data-k-node
          data-k-quote
          data-k-type-anchor="bottom"
          className="kinetic-quote kinetic-type-anchor flex w-max max-w-[min(92vw,48rem)] flex-col items-stretch gap-2 opacity-0 px-3 sm:px-4"
        >
          <p
            id={`${beat.id}-text`}
            className={cn(roleClass(textRole), 'kinetic-quote-text text-center')}
          >
            {beat.text}
          </p>
          <p
            id={`${beat.id}-attr`}
            className={cn(roleClass(attrRole), 'kinetic-dim-text self-end text-right')}
          >
            {beat.attribution}
          </p>
        </div>
      );
    }
    case 'project-delays': {
      return (
        <div
          id={beat.id}
          data-k-project-delays
          className="kinetic-project-delays absolute inset-0 z-[1] opacity-0"
          aria-hidden
        >
          {/* Each card / more slam bottom-locks on the shared type rail */}
          {beat.projects.map((project, i) => (
            <div
              key={`${beat.id}-p${i}`}
              id={`${beat.id}-p${i}`}
              data-k-delay-card
              data-k-type-anchor="bottom"
              className="kinetic-delay-card kinetic-type-anchor flex w-max max-w-[min(92vw,36rem)] flex-col items-center gap-2 px-4 text-center opacity-0 sm:gap-2.5 sm:px-6 md:px-10"
            >
              <span className="kinetic-delay-project" id={`${beat.id}-project-${i}`}>{project.project}</span>
              <span className="kinetic-delay-label" id={`${beat.id}-delayed-${i}`}>Delayed.</span>
              <span className="kinetic-delay-years" id={`${beat.id}-years-${i}`}>{project.years}</span>
            </div>
          ))}
          <div
            id={`${beat.id}-more`}
            data-k-delay-more
            data-k-type-anchor="bottom"
            className={cn(
              roleClass('slam-xl'),
              'kinetic-delay-more kinetic-type-anchor w-max px-4 opacity-0 sm:px-6 md:px-10',
            )}
          >
            {beat.moreLabel}
          </div>
        </div>
      );
    }
    case 'silence':
    case 'endcard':
      return null;
    default:
      return null;
  }
}

/** Emphasize a word without teal (pre-Imagine acts). */
function LineWithEmphasis({
  text,
  word,
  idPrefix,
}: {
  text: string;
  word: string;
  idPrefix: string;
}) {
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx < 0) {
    return <>{text}</>;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + word.length);
  const after = text.slice(idx + word.length);
  return (
    <>
      {before}
      <span className="kinetic-word-stress" id={`${idPrefix}-stress`}>{match}</span>
      {after}
    </>
  );
}

