'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { buttonVariants } from '@/components/ui/shadcn/button';
import { LOCALE_LABELS, LOCALES, type Locale } from '@/lib/i18n/index';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils/index';

/**
 * Material Symbols Outlined `translate_indic` path — inlined for CSP
 * (font-src 'self'; no Google Fonts). Sized by Button icon styles.
 */
function TranslateIndicIcon(props: React.SVGProps<SVGSVGElement>) {
  const { id, ...rest } = props;
  return (
    <svg
      id={id}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        id={id ? `${id}-path` : undefined}
        d="m476-80 182-480h84L924-80h-84l-43-122H603L560-80h-84Zm152-192h144l-72-204-72 204Zm-374-48q-66 0-123.5-38.5T44-462l72-36q21 42 58 70t79 28q38 0 62.5-23.5T340-480q0-33-23.5-56.5T260-560h-60v-80h60q25 0 42.5-17.5T320-700q0-25-17-42.5T261-760q-23 0-41 15t-32 33l-63-49q26-32 60-55.5t77-23.5q57 0 97.5 40.5T400-701q0 27-10 52.5T361-603q10 10 18.5 20.5T396-560h124v-200h-80v-80h240v80h-80v116l-61 164H420v4q0 63-46 109.5T254-320Z"
      />
    </svg>
  );
}

export interface LanguageSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  readonly id?: string;
}

/**
 * Icon-only language control. Pressing the button opens a dropdown of locales.
 * Trigger is styled as shadcn Button `variant="outline" size="icon"`.
 */
export function LanguageSwitcher({ className, id = 'language-switcher' }: LanguageSwitcherProps) {
  const { locale, messages, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        type="button"
        aria-label={messages.nav.language}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'size-8 shrink-0 rounded-full border-outline-variant bg-transparent shadow-none',
          'hover:bg-surface-container-low hover:text-foreground',
          className,
        )}
      >
        <TranslateIndicIcon id={`${id}-translate-indic`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent id={`${id}-menu`} align="end" sideOffset={8}>
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            id={`${id}-option-${code}`}
            onSelect={() => {
              setLocale(code as Locale);
            }}
            data-active={locale === code ? 'true' : undefined}
            className={cn(locale === code && 'bg-accent font-medium')}
          >
            {LOCALE_LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
