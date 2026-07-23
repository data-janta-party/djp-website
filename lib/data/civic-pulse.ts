import type { ContributeKind } from '@/lib/i18n/types';

export const volunteerFieldIds = {
  name: 'volunteer-name',
  email: 'volunteer-email',
  phone: 'volunteer-phone',
  city: 'volunteer-city',
  interest: 'volunteer-interest',
  /** Honeypot — must stay empty; hidden from real users. */
  website: 'volunteer-website',
} as const;

export const volunteerSectionId = 'volunteer' as const;

export const joinSectionId = 'join' as const;

export interface ContributeLinkMeta {
  readonly kind: ContributeKind;
  readonly id: string;
  readonly href: string;
  readonly external?: boolean;
}

export const contributeLinkMeta: readonly ContributeLinkMeta[] = [
  {
    kind: 'code',
    id: 'contribute-code',
    href: 'https://github.com/data-janta-party',
    external: true,
  },
  {
    kind: 'skills',
    id: 'contribute-skills',
    href: `#${volunteerSectionId}`,
  },
] as const;

export const civicPulseFooterLinkMeta = [
  { id: 'footer-contact', href: 'mailto:datajantaparty@gmail.com', labelKey: 'contact' as const },
  { id: 'footer-privacy', href: '#', labelKey: 'privacy' as const },
] as const;
