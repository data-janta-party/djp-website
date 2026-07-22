import { en } from '@/lib/i18n/messages/en';
import { hi } from '@/lib/i18n/messages/hi';
import { LOCALES, type Locale, type Messages } from '@/lib/i18n/types';

export {
  LOCALES,
  type ContributeKind,
  type Locale,
  type Messages,
} from '@/lib/i18n/types';

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

const catalog: Record<Locale, Messages> = {
  en,
  hi,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function getMessages(locale: Locale): Messages {
  return catalog[locale] ?? catalog[DEFAULT_LOCALE];
}
