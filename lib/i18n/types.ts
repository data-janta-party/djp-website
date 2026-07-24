export const LOCALES = ['en', 'hi'] as const;

export type Locale = (typeof LOCALES)[number];

export type ContributeKind = 'data' | 'apps' | 'code' | 'money' | 'skills' | 'ideas';

export interface ContributeCopy {
  readonly title: string;
  readonly description: string;
  readonly cta: string;
}

export interface Messages {
  readonly meta: {
    readonly title: string;
    readonly description: string;
  };
  readonly brand: {
    readonly name: string;
    readonly copyright: string;
  };
  readonly nav: {
    readonly main: string;
    readonly volunteer: string;
    readonly language: string;
    readonly digitalSpeech: string;
  };
  readonly common: {
    readonly skipToMain: string;
    readonly optional: string;
    readonly submitting: string;
    readonly submitAnother: string;
  };
  readonly home: {
    readonly ariaLabel: string;
    readonly panel1: string;
    readonly panel2Brand: string;
    readonly panel2Tagline: string;
    readonly digitalSpeechCta: string;
  };
  readonly join: {
    readonly ariaLabel: string;
    readonly digital: string;
    /** Full static phrase for a11y (e.g. “Let's build Transparent India.”). */
    readonly transparent: string;
    /** Prefix before rotating adjective. */
    readonly buildLead: string;
    /** Suffix after rotating adjective. */
    readonly buildTrail: string;
    readonly cta: string;
    readonly contribute: Record<ContributeKind, ContributeCopy>;
  };
  readonly volunteer: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly submitLabel: string;
    readonly successTitle: string;
    readonly successMessage: string;
    readonly fields: {
      readonly name: { readonly label: string; readonly placeholder: string };
      readonly email: { readonly label: string; readonly placeholder: string };
      readonly phone: { readonly label: string; readonly placeholder: string };
      readonly city: { readonly label: string; readonly placeholder: string };
      readonly interest: { readonly label: string; readonly placeholder: string };
    };
    readonly errors: {
      readonly form: string;
      readonly required: string;
      readonly invalidEmail: string;
      readonly invalidPhone: string;
      readonly tooLong: string;
    };
  };
  readonly footer: {
    readonly nav: string;
    readonly contact: string;
    readonly privacy: string;
  };
}
