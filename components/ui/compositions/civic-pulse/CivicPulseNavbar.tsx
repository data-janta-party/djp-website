'use client';

import Link from 'next/link';

import { BrandLogo } from '@/components/ui/elements/shared/BrandLogo';
import { LanguageSwitcher } from '@/components/ui/elements/shared/LanguageSwitcher';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils/index';

export interface CivicPulseNavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

export function CivicPulseNavbar({ className }: CivicPulseNavbarProps) {
  const { messages } = useLocale();

  return (
    <nav
      id="civic-pulse-navbar"
      aria-label={messages.nav.main}
      className={cn(
        'sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between px-margin-mobile md:px-gutter" id="tpl-components-ui-compositions-civic-pulse-civic-pulse-navbar-l26-c7">
        <Link
          id="navbar-brand"
          href="/"
          className="rounded-sm text-md focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLogo id="navbar-brand-logo" label={messages.brand.name} variant="white" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3" id="navbar-actions">
          <LanguageSwitcher />
          <Link
            id="navbar-digital-speech"
            href="/speech"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-outline-variant px-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary sm:px-4"
          >
            {messages.nav.digitalSpeech}
          </Link>
          <a
            id="navbar-volunteer"
            href="#volunteer"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary sm:px-5"
          >
            {messages.nav.volunteer}
          </a>
        </div>
      </div>
    </nav>
  );
}
