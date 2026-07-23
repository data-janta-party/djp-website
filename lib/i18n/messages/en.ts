import type { Messages } from '@/lib/i18n/types';

export const en: Messages = {
  meta: {
    title: 'data.janta.party',
    description: 'Actionable, accountable, transparent governance for India.',
  },
  brand: {
    name: 'data.janta.party',
    copyright: '© 2026 data.janta.party.',
  },
  nav: {
    main: 'Main navigation',
    volunteer: 'Volunteer',
    language: 'Language',
    digitalSpeech: 'Speech',
  },
  common: {
    skipToMain: 'Skip to main content',
    optional: 'optional',
    submitting: 'Submitting…',
    submitAnother: 'Submit another',
  },
  home: {
    ariaLabel: 'data.janta.party',
    panel1: 'India deserves better options.',
    panel2Brand: 'data.janta.party',
    panel2Tagline: "Let's build the India we deserve.",
    digitalSpeechCta: 'Digital speech',
  },
  join: {
    ariaLabel: 'Join the movement',
    digital: 'This generation built Digital India.',
    transparent: "Let's build Transparent India.",
    buildLead: "Let's build",
    buildTrail: 'India.',
    cta: 'Join the movement.',
    contribute: {
      data: {
        title: 'Contribute with data',
        description:
          'Share civic datasets, ground truth, and open evidence that makes governance measurable.',
        cta: 'Share data',
      },
      apps: {
        title: 'Download our apps',
        description: 'Track projects, report issues, and demand accountability from your phone.',
        cta: 'Get the apps',
      },
      code: {
        title: 'Contribute with code',
        description:
          'Build open tools for transparency on GitHub — dashboards, APIs, and civic software.',
        cta: 'Open GitHub',
      },
      money: {
        title: 'Contribute with money',
        description: 'Fund the infrastructure of accountability — not slogans, systems.',
        cta: 'Support us',
      },
      skills: {
        title: 'Contribute with your skills',
        description: 'Organizing, research, design, law, ops — bring what you know.',
        cta: 'Volunteer',
      },
      ideas: {
        title: 'Contribute with your ideas',
        description:
          'Debate policy, share proposals, and shape the agenda on the DataJantaParty subreddit.',
        cta: 'Open Reddit',
      },
    },
  },
  volunteer: {
    eyebrow: 'Contribute with skills',
    title: 'Stand with us',
    description:
      'This only works if people who care show up. Join data.janta.party — bring your skills, your time, your voice.',
    submitLabel: 'I am in',
    successTitle: 'Welcome',
    successMessage: 'You are on the list. We will reach out soon — let’s build.',
    fields: {
      name: { label: 'Full name', placeholder: 'Your name' },
      email: { label: 'Email', placeholder: 'you@example.com' },
      phone: { label: 'Phone', placeholder: '9876543210' },
      city: { label: 'City', placeholder: 'Your city' },
      interest: {
        label: 'How will you help?',
        placeholder: 'Organizing, data, code, outreach, operations…',
      },
    },
    errors: {
      form: 'Please check your details and try again.',
      required: 'This field is required.',
      invalidEmail: 'Enter a valid email address.',
      invalidPhone: 'Enter a valid phone number (digits and + - ( ) only).',
      tooLong: 'This value is too long.',
    },
  },
  footer: {
    nav: 'Footer navigation',
    contact: 'Contact',
    privacy: 'Privacy',
  },
};
