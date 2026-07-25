import type { Meta, StoryObj } from '@storybook/react';

import { KineticSpeechFilm } from './KineticSpeechFilm';

const meta = {
  title: 'UI/Compositions/CivicPulse/KineticSpeechFilm',
  component: KineticSpeechFilm,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '“The System We Deserve” kinetic manifesto film for /speech — data-driven GSAP RSVP typography, ~2 min tribal-stomp track, big play gate, mute, end-card CTA, reduced-motion transcript.',
      },
    },
  },
} satisfies Meta<typeof KineticSpeechFilm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Poster: Story = {
  args: {},
};

export const ReducedMotion: Story = {
  args: {
    previewMode: 'reduced',
  },
};
