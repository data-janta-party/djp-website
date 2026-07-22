import { cn } from '@/lib/utils/index';

export type BrandLogoVariant = 'white' | 'black';

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  readonly id?: string;
  /** Accessible full brand name; visible mark is the d.j.p shorthand. */
  readonly label?: string;
  /** Visual weight — navbar uses semibold; hero can use light. */
  readonly weight?: 'light' | 'semibold';
  /**
   * Logo lockup background:
   * - `white` — white field, black type (use on dark surfaces)
   * - `black` — black field, white type (use on light surfaces)
   */
  readonly variant?: BrandLogoVariant;
}

const variantClassName: Record<BrandLogoVariant, string> = {
  white: 'bg-white text-black',
  black: 'bg-black text-white',
};

/**
 * Wordmark logo: shorthand “d.j.p” in the site sans (Geist via font-sans).
 * Prefer this over a raster logo so type always matches the product UI.
 */
export function BrandLogo({
  className,
  id = 'brand-logo',
  label = 'data.janta.party',
  weight = 'semibold',
  variant = 'black',
}: BrandLogoProps) {
  return (
    <span
      id={id}
      aria-label={label}
      data-variant={variant}
      className={cn(
        'inline-flex items-center justify-center rounded-sm px-2.5 py-1 font-sans tracking-tight',
        weight === 'light' ? 'font-light' : 'font-semibold',
        variantClassName[variant],
        className,
      )}
    >
      <span aria-hidden="true" className="lowercase" id="tpl-components-ui-elements-shared-brand-logo-l48-c7">
        d.j.p
      </span>
    </span>
  );
}
