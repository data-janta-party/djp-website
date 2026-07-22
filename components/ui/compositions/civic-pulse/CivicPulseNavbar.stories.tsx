import type { Meta, StoryObj } from '@storybook/react';

import { CivicPulseNavbar } from './CivicPulseNavbar';

const meta = {
  title: 'UI/Compositions/CivicPulse/CivicPulseNavbar',
  component: CivicPulseNavbar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CivicPulseNavbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};