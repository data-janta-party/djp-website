import type { Meta, StoryObj } from '@storybook/react';

import { VolunteerForm } from './VolunteerForm';

const meta = {
  title: 'UI/Compositions/CivicPulse/VolunteerForm',
  component: VolunteerForm,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof VolunteerForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
