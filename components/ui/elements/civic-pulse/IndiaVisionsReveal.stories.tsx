import type { Meta, StoryObj } from '@storybook/react';

import { INDIA_VISION_WORDS } from '@/lib/data/india-vision-words';

import { IndiaVisionsReveal } from './IndiaVisionsReveal';

const meta = {
  title: 'UI/Elements/CivicPulse/IndiaVisionsReveal',
  component: IndiaVisionsReveal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-viewport cloud of civic aspiration words around “We want to fix India.”',
      },
    },
  },
  args: {
    center: 'We want to fix India.',
    words: INDIA_VISION_WORDS,
  },
} satisfies Meta<typeof IndiaVisionsReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullBleed: Story = {
  render: (args) => (
    <div className="relative h-svh w-full bg-black">
      <IndiaVisionsReveal {...args} />
    </div>
  ),
};
