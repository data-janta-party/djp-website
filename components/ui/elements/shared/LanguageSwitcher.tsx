'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/atoms/Select';
import { LOCALE_LABELS, LOCALES, type Locale } from '@/lib/i18n/index';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils/index';

export interface LanguageSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  readonly id?: string;
}

export function LanguageSwitcher({ className, id = 'language-switcher' }: LanguageSwitcherProps) {
  const { locale, messages, setLocale } = useLocale();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (value) {
          setLocale(value as Locale);
        }
      }}
    >
      <SelectTrigger
        id={id}
        size="sm"
        aria-label={messages.nav.language}
        className={cn('rounded-full', className)}
      >
        <SelectValue placeholder={messages.nav.language} />
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
