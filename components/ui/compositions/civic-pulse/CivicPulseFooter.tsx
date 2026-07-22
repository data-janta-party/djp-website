'use client';

import Link from 'next/link';

import { BrandLogo } from '@/components/ui/elements/shared/BrandLogo';
import { civicPulseFooterLinkMeta } from '@/lib/data/civic-pulse';
import { useLocale } from '@/hooks/useLocale';

export interface CivicPulseFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

export function CivicPulseFooter({ className }: CivicPulseFooterProps) {
  const { messages } = useLocale();

  return (
    <footer
      id="civic-pulse-footer"
      className={`mt-auto border-t border-outline-variant bg-surface ${className ?? ''}`}
    >
      <div className="mx-auto flex max-w-(--spacing-container-max) flex-col items-center justify-between gap-6 px-margin-mobile py-8 md:flex-row md:px-gutter" id="tpl-components-ui-compositions-civic-pulse-civic-pulse-footer-l21-c7">
        <BrandLogo
          id="footer-brand-logo"
          label={messages.brand.name}
          variant="black"
          className="text-md"
        />
        <nav aria-label={messages.footer.nav} className="flex flex-wrap justify-center gap-6" id="tpl-components-ui-compositions-civic-pulse-civic-pulse-footer-l28-c9">
          {civicPulseFooterLinkMeta.map((link) => (
            <Link
              key={link.id}
              id={link.id}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:ring-1 focus-visible:ring-primary"
            >
              {messages.footer[link.labelKey]}
            </Link>
          ))}
        </nav>
        <span className="text-sm font-light text-muted-foreground" id="tpl-components-ui-compositions-civic-pulse-civic-pulse-footer-l40-c9">{messages.brand.copyright}</span>
      </div>
    </footer>
  );
}
