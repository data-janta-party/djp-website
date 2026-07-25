'use client';

/**
 * Director-driven kinetic manifesto film — data beats + GSAP motion verbs.
 * Shell: poster/controls + transport wiring + beat DOM.
 * Transport: hooks/useKineticFilmTransport.ts
 * Timeline: lib/kinetic-speech/build-timeline.ts
 * Beats: KineticSpeechBeatNodes.tsx
 */

import { ChevronLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

import {
  KINETIC_ENDCARD_SOURCES,
  kineticSpeechAudioSrc,
  kineticSpeechCopy as copy,
  kineticSpeechJoinHref,
  kineticSpeechUrlHref,
} from '@/lib/kinetic-speech';
import { Button } from '@/components/ui/atoms/Button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/shadcn/hover-card';
import { BeatNodes, RollerUrl } from '@/components/ui/compositions/civic-pulse/KineticSpeechBeatNodes';
import { useKineticFilmTransport } from '@/hooks/useKineticFilmTransport';
import { cn } from '@/lib/utils/index';

export interface KineticSpeechFilmProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  /**
   * Storybook / tests:
   * - `poster` — static play gate (same as default `/speech`)
   * - `reduced` — transcript fallback
   * Default (undefined) shows the big play gate; playback starts on user gesture.
   */
  readonly previewMode?: 'poster' | 'reduced';
  /**
   * Force DEV slide scrubber (hash + prev/next) on even when NODE_ENV is not
   * development — used by unit tests. Production code paths pass nothing.
   */
  readonly forceDevSlideNav?: boolean;
}

/** Control chrome icons — lucide (project icon library) with explicit px size. */
const CONTROL_ICON_PROPS = {
  size: 20,
  strokeWidth: 2,
  'aria-hidden': true as const,
  focusable: false as const,
  className: 'kinetic-control-icon size-5 shrink-0 text-white',
};

/** Large centered play gate (poster + paused). */
const PLAY_GATE_ICON_PROPS = {
  size: 52,
  strokeWidth: 1.75,
  'aria-hidden': true as const,
  focusable: false as const,
  className: 'kinetic-play-gate-icon shrink-0 text-white',
};

/**
 * Director-driven kinetic manifesto film — data beats + GSAP motion verbs.
 * Arc: Chalta Hai → Delay → Divide → Lack → Demand → Imagine →
 *      Gandhi / We are the change → Virtues → India → Abki baar → CTA.
 */
export function KineticSpeechFilm({
  className,
  previewMode,
  forceDevSlideNav = false,
}: KineticSpeechFilmProps) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    reduced,
    isDevSlideNav,
    transcript,
    beats,
    slideItems,
    slideCount,
    phase,
    endcardSourcesOpen,
    setEndcardSourcesOpen,
    muted,
    audioBlocked,
    mediaLoading,
    status,
    slideIndex,
    endcardInteractive,
    pauseFilm,
    replayFilm,
    onPlayGate,
    seekPrevSlide,
    seekNextSlide,
    toggleMute,
    unlockSound,
  } = useKineticFilmTransport({
    previewMode,
    forceDevSlideNav,
    stageRef,
    audioRef,
  });

  if (reduced) {
    return (
      <section
        id="kinetic-speech-film-reduced"
        aria-label={copy.a11y.region}
        className={cn(
          'relative flex min-h-svh w-full flex-col bg-black px-margin-mobile py-16 text-white md:px-gutter',
          className,
        )}
      >
        <h1 id="kinetic-reduced-title" className="kinetic-type-body text-white">
          {copy.poster.reducedMotionTitle}
        </h1>
        <p className="mt-3 text-lg text-white/60" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1894-c9">{copy.poster.kicker}</p>
        <pre
          id="kinetic-transcript-visible"
          className="mt-10 max-w-2xl whitespace-pre-wrap font-sans text-xl leading-relaxed text-white/90 md:text-2xl"
        >
          {transcript}
        </pre>
        <div className="mt-12 flex flex-col gap-4" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1901-c9">
          <a
            id="kinetic-reduced-url"
            href={kineticSpeechUrlHref}
            className="kinetic-type-brand tracking-[0.08em] text-white underline-offset-4 hover:underline"
          >
            {copy.endcard.url}
          </a>
          <Link
            id="kinetic-reduced-join"
            href={kineticSpeechJoinHref}
            className="text-xl text-white/80 hover:text-white"
          >
            {copy.endcard.join}
          </Link>
          <nav
            id="kinetic-reduced-sources"
            aria-label={copy.endcard.sources}
            className="mt-4 max-w-md"
          >
            <p className="text-sm font-semibold tracking-[0.08em] text-white/60 uppercase" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1921-c13">
              {copy.endcard.sources}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1924-c13">
              {KINETIC_ENDCARD_SOURCES.map((source) => (
                <li key={source.href} id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1926-c17-${source.href}`}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 underline-offset-2 hover:text-white hover:underline" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l1927-c19-${source.href}`}
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    );
  }

  const showControls =
    !mediaLoading && (phase === 'playing' || phase === 'paused' || phase === 'ended');
  const showPlayGate =
    !mediaLoading && (phase === 'poster' || phase === 'paused');
  const showDevSlideNav =
    isDevSlideNav && !reduced && showControls && slideCount > 0 && slideIndex > 0;
  const activeSlideId =
    slideIndex > 0 ? (slideItems[slideIndex - 1]?.beat.id ?? '') : '';

  return (
    <section
      id="kinetic-speech-film"
      aria-label={copy.a11y.region}
      aria-busy={mediaLoading || undefined}
      className={cn(
        // Above site navbar (z-50) so top-left back is never covered by the brand logo.
        'fixed inset-0 z-[100] h-svh min-h-svh w-screen max-w-none overflow-hidden bg-black text-white',
        className,
      )}
    >
      <span id="kinetic-live-status" className="sr-only" aria-live="polite">
        {status}
      </span>

      <audio
        id="kinetic-speech-audio"
        ref={audioRef}
        src={kineticSpeechAudioSrc}
        preload="auto"
        playsInline
      />

      {mediaLoading ? (
        <div
          id="kinetic-media-loading"
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
          role="status"
          aria-live="polite"
          aria-label={copy.a11y.loading}
        >
          <div
            id="kinetic-media-loading-spinner"
            className="kinetic-spinner"
            aria-hidden
          />
          <span id="kinetic-media-loading-label" className="sr-only">
            {copy.a11y.loading}
          </span>
        </div>
      ) : null}

      <div
        id="kinetic-stage"
        ref={stageRef}
        data-k-bg="charcoal"
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div id="kinetic-stage-root" className="absolute inset-0">
          <div id="kinetic-bg" className="absolute inset-0 bg-black" />
        </div>

        {/* Type rail host: primary beats bottom-lock via .kinetic-type-anchor;
            full-stage packs (flood/cloud) keep their own inset-0 layout. */}
        <div
          id="kinetic-nodes"
          className="absolute inset-0 overflow-hidden px-4 pt-6 sm:px-6 md:px-10"
        >
          {beats.map((beat) => (
            <BeatNodes key={beat.id} beat={beat} />
          ))}
        </div>

        {/* Finale — roller URL + Join + Sources; inert until endcard appears (or film ended) */}
        <div
          id="kinetic-endcard"
          data-k-node
          className={cn(
            'absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-4 text-center opacity-0 sm:gap-8 sm:px-6 pb-20 md:pb-24',
            !endcardInteractive && 'pointer-events-none',
          )}
          aria-hidden={!endcardInteractive}
          inert={!endcardInteractive ? true : undefined}
        >
          <a
            id="kinetic-fin-url"
            href={kineticSpeechUrlHref}
            tabIndex={endcardInteractive ? 0 : -1}
            className="text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label={copy.endcard.url}
          >
            <RollerUrl />
          </a>
          <Link
            id="kinetic-fin-join"
            href={kineticSpeechJoinHref}
            tabIndex={endcardInteractive ? 0 : -1}
            className="rounded-full border border-white/35 px-8 py-3 text-lg text-white/90 opacity-0 transition-colors hover:bg-white hover:text-black hover:text-opacity-100"
          >
            {copy.endcard.join} →
          </Link>

          {/* Sources — bottom-right above control chrome; clickable as soon as endcard appears */}
          <div
            id="kinetic-endcard-sources"
            className="absolute bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] right-3 z-[2] sm:right-4 md:bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:right-6"
          >
            <HoverCard
              open={endcardInteractive && endcardSourcesOpen}
              onOpenChange={(open) => {
                if (endcardInteractive) {
                  setEndcardSourcesOpen(open);
                } else {
                  setEndcardSourcesOpen(false);
                }
              }}
            >
              <HoverCardTrigger
                // id lives on the render <button> (DOM node); Base UI merges trigger props onto it
                render={
                  <button
                    id="kinetic-endcard-sources-trigger"
                    type="button"
                    onClick={() => {
                      if (endcardInteractive) {
                        setEndcardSourcesOpen((open) => !open);
                      }
                    }}
                  />
                }
                delay={200}
                closeDelay={150}
                tabIndex={endcardInteractive ? 0 : -1}
                aria-label={copy.endcard.sources}
                className={cn(
                  'kinetic-endcard-sources-trigger rounded-sm px-1.5 py-1 outline-none',
                  !endcardInteractive && 'pointer-events-none',
                )}
              >
                {copy.endcard.sources}
              </HoverCardTrigger>
              <HoverCardContent
                id="kinetic-endcard-sources-content"
                side="top"
                align="end"
                sideOffset={8}
                className="kinetic-endcard-sources-content w-auto min-w-[12rem] max-w-[min(90vw,18rem)] p-3 text-left"
              >
                <p className="kinetic-endcard-sources-heading" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2058-c17">{copy.endcard.sources}</p>
                <ul className="flex flex-col gap-1.5" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2059-c17">
                  {KINETIC_ENDCARD_SOURCES.map((source) => (
                    <li key={source.href} id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2061-c21-${source.href}`}>
                      <a
                        href={source.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kinetic-endcard-sources-link" id={`tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2062-c23-${source.href}`}
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </div>

      {/* Top-left back — shared Button atom (primary chip, like Volunteer) */}
      <Button
        id="kinetic-control-home"
        type="button"
        variant="default"
        size="sm"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-50"
        onClick={() => {
          router.push('/');
        }}
      >
        <ChevronLeft id="kinetic-control-home-icon" data-icon="inline-start" />
        {copy.controls.home}
      </Button>

      {showDevSlideNav ? (
        <div
          id="kinetic-dev-slide-nav"
          className="absolute top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-black/75 px-2 py-1.5 font-mono text-sm text-white/90 shadow-lg backdrop-blur-sm sm:top-4 sm:gap-3 sm:px-3"
          role="group"
          aria-label="Dev slide scrubber"
        >
          <button
            id="kinetic-dev-slide-prev"
            type="button"
            onClick={seekPrevSlide}
            disabled={slideIndex <= 1}
            className="rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous slide"
          >
            ◀
          </button>
          <span
            id="kinetic-dev-slide-label"
            className="min-w-[9rem] text-center tabular-nums sm:min-w-[12rem]"
            title={activeSlideId}
          >
            {slideIndex} / {slideCount}
            <span className="ml-2 hidden text-white/55 sm:inline" id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2125-c13">{activeSlideId}</span>
          </span>
          <button
            id="kinetic-dev-slide-next"
            type="button"
            onClick={seekNextSlide}
            disabled={slideIndex >= slideCount}
            className="rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Next slide"
          >
            ▶
          </button>
        </div>
      ) : null}

      {showPlayGate ? (
        <div
          id="kinetic-play-gate"
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
        >
          <button
            id="kinetic-play-button"
            type="button"
            onClick={onPlayGate}
            className="kinetic-play-gate pointer-events-auto"
            aria-label={copy.controls.play}
          >
            <Play id="kinetic-play-button-icon" {...PLAY_GATE_ICON_PROPS} />
          </button>
        </div>
      ) : null}

      {showControls ? (
        <div
          id="kinetic-controls"
          // Gradient chrome is full-width; pass clicks through so endcard Sources
          // (under this strip in z-order) stays clickable at the top edge.
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 flex items-center justify-end gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4 md:px-8"
        >
          <div
            className="pointer-events-auto flex flex-wrap items-center justify-end gap-2"
            id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2148-c11"
          >
            {phase === 'playing' ? (
              <button
                id="kinetic-control-pause"
                type="button"
                onClick={pauseFilm}
                className="kinetic-control-btn"
                aria-label={copy.controls.pause}
              >
                <Pause id="kinetic-control-pause-icon" {...CONTROL_ICON_PROPS} />
              </button>
            ) : null}
            {audioBlocked && phase === 'playing' ? (
              <button
                id="kinetic-control-sound"
                type="button"
                onClick={unlockSound}
                className="kinetic-control-btn"
                aria-label={copy.a11y.soundBlocked}
              >
                <VolumeX id="kinetic-control-sound-icon" {...CONTROL_ICON_PROPS} />
              </button>
            ) : phase === 'playing' || phase === 'paused' || phase === 'ended' ? (
              <button
                id="kinetic-control-mute"
                type="button"
                onClick={toggleMute}
                className="kinetic-control-btn"
                aria-label={muted ? copy.controls.unmute : copy.controls.mute}
              >
                {muted ? (
                  <VolumeX id="kinetic-control-mute-icon" {...CONTROL_ICON_PROPS} />
                ) : (
                  <Volume2 id="kinetic-control-unmute-icon" {...CONTROL_ICON_PROPS} />
                )}
              </button>
            ) : null}
            {phase === 'ended' || phase === 'paused' ? (
              <button
                id="kinetic-control-replay"
                type="button"
                onClick={replayFilm}
                className="kinetic-control-btn"
                aria-label={copy.controls.replay}
              >
                <RotateCcw id="kinetic-control-replay-icon" {...CONTROL_ICON_PROPS} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <details id="kinetic-transcript-details" className="sr-only">
        <summary id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2214-c9">{copy.a11y.transcript}</summary>
        <pre id="tpl-components-ui-compositions-civic-pulse-kinetic-speech-film-l2215-c9">{transcript}</pre>
      </details>
    </section>
  );
}
