import type { Meta, StoryObj } from '@storybook/react';

import { RotatingIndiaHeadline } from './RotatingIndiaHeadline';

const meta = {
  title: 'UI/Elements/CivicPulse/RotatingIndiaHeadline',
  component: RotatingIndiaHeadline,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'Minimal manifesto line — “Let\'s build {adjective} India.” with crossfade + width morph.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[40vh] items-center justify-center bg-black px-6 py-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RotatingIndiaHeadline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ariaLabel: "Let's build Transparent India.",
  },
};

export const ReducedMotion: Story = {
  args: {
    ariaLabel: "Let's build Transparent India.",
    reducedMotion: true,
  },
};
