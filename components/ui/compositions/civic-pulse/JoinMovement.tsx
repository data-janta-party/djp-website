'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/atoms/Card';
import { RotatingIndiaHeadline } from '@/components/ui/elements/civic-pulse/RotatingIndiaHeadline';
import { buttonVariants } from '@/components/ui/shadcn/button';
import { contributeLinkMeta, joinSectionId } from '@/lib/data/civic-pulse';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils/index';

export interface JoinMovementProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

/**
 * Final CTA — left-aligned rotating “Let's build {adjective} India.” (white)
 * + code / skills cards only.
 */
export function JoinMovement({ className }: JoinMovementProps) {
  const { messages } = useLocale();
  const copy = messages.join;

  return (
    <section
      id={joinSectionId}
      aria-label={copy.ariaLabel}
      className={cn(
        'story-snap-panel relative flex min-h-svh w-screen max-w-none -mx-[calc((100vw-100%)/2)] flex-col justify-center bg-black px-margin-mobile py-16 text-white md:px-gutter md:py-24',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-start gap-12 md:gap-16" id="tpl-components-ui-compositions-civic-pulse-join-movement-l31-c7">
        <header className="flex w-full max-w-3xl flex-col items-start gap-4 text-left" id="tpl-components-ui-compositions-civic-pulse-join-movement-l32-c9">
          <RotatingIndiaHeadline
            className="text-left text-3xl font-light text-white md:text-5xl"
            ariaLabel={copy.transparent}
            lead={copy.buildLead}
            trail={copy.buildTrail}
          />
          <p
            id="join-cta"
            className="text-xl font-medium tracking-tight text-white md:text-2xl"
          >
            {copy.cta}
          </p>
        </header>

        <div
          id="contribute-pathways"
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {contributeLinkMeta.map((link) => {
            const item = copy.contribute[link.kind];
            return (
              <Card
                key={link.id}
                id={link.id}
                className="border-white/10 bg-white/5 text-white shadow-none backdrop-blur-sm"
              >
                <CardHeader className="gap-1 pb-2">
                  <CardTitle className="text-lg font-medium tracking-tight text-white">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm font-light text-white/65">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={link.href}
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white',
                    )}
                    {...(link.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})} id={`tpl-components-ui-compositions-civic-pulse-join-movement-l68-c19-${link.href}`}
                  >
                    {item.cta}
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
