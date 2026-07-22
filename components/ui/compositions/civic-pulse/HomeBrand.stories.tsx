import type { Meta, StoryObj } from '@storybook/react';

import { HomeBrand } from './HomeBrand';

const meta = {
  title: 'UI/Compositions/CivicPulse/HomeBrand',
  component: HomeBrand,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Two full-viewport brand panels — “India deserves better options” and the DJP operating-system line — with a digital speech CTA.',
      },
    },
  },
} satisfies Meta<typeof HomeBrand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
