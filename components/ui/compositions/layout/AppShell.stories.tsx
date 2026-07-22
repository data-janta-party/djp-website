import type { Meta, StoryObj } from '@storybook/react';

import { AppShell } from './AppShell';

const meta = {
  title: 'UI/Compositions/Layout/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-lg">Page content goes here</p>
      </div>
    ),
  },
};