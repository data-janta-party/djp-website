import type { Meta, StoryObj } from '@storybook/react';

import { CivicPulseFooter } from './CivicPulseFooter';

const meta = {
  title: 'UI/Compositions/CivicPulse/CivicPulseFooter',
  component: CivicPulseFooter,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CivicPulseFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
