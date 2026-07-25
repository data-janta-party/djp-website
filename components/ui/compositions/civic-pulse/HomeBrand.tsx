'use client';

import Link from 'next/link';

import { useLocale } from '@/hooks/useLocale';
import { useStorySnapWheel } from '@/hooks/useStorySnapWheel';
import { cn } from '@/lib/utils/index';

export interface HomeBrandProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

/**
 * Homepage: two full-viewport brand panels + digital speech CTA.
 * Copy sits in .story-snap-inset so it clears the sticky navbar.
 * Content band is .story-snap-panel-content; panel end-slack lives below it.
 * Scroll snap lifecycle (`html.story-snap`) is owned by `useStorySnapWheel`.
 */
export function HomeBrand({ className }: HomeBrandProps) {
  const { messages } = useLocale();
  const copy = messages.home;

  useStorySnapWheel(true);

  return (
    <section
      id="home-brand"
      aria-label={copy.ariaLabel}
      className={cn(
        'relative w-screen max-w-none -mx-[calc((100vw-100%)/2)] bg-black text-white',
        className,
      )}
    >
      <div
        id="home-panel-deserves"
        data-home-step
        className="story-snap-panel relative w-full"
      >
        <div
          className="story-snap-panel-content relative flex items-center px-margin-mobile md:px-gutter"
          id="tpl-components-ui-compositions-civic-pulse-home-brand-panel-deserves-content"
        >
          <div className="story-snap-inset mx-auto w-full max-w-(--spacing-container-max)" id="tpl-components-ui-compositions-civic-pulse-home-brand-l46-c9">
            <p className="max-w-4xl text-4xl font-light tracking-tight text-balance text-white md:text-5xl" id="tpl-components-ui-compositions-civic-pulse-home-brand-l47-c11">
              {copy.panel1}
            </p>
          </div>
        </div>
      </div>

      <div
        id="home-panel-os"
        data-home-step
        className="story-snap-panel relative w-full"
      >
        <div
          className="story-snap-panel-content relative flex flex-col items-center justify-center px-margin-mobile text-center md:px-gutter"
          id="tpl-components-ui-compositions-civic-pulse-home-brand-panel-os-content"
        >
          <div className="story-snap-inset mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center gap-10" id="tpl-components-ui-compositions-civic-pulse-home-brand-l58-c9">
            <div className="flex flex-col items-center gap-4" id="tpl-components-ui-compositions-civic-pulse-home-brand-l59-c11">
              <p
                id="home-brand-name"
                className="text-4xl font-light tracking-tight text-white md:text-5xl"
              >
                {copy.panel2Brand}
              </p>
              <p
                id="home-brand-tagline"
                className="max-w-2xl text-xl font-light tracking-tight text-balance text-white/75 md:text-2xl"
              >
                {copy.panel2Tagline}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3" id="tpl-components-ui-compositions-civic-pulse-home-brand-l74-c11">
              <Link
                id="home-digital-speech-cta"
                href="/speech"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white"
              >
                {copy.digitalSpeechCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
