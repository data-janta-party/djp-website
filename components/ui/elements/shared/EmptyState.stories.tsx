import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/components/ui/atoms/Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'UI/Elements/Shared/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items yet',
    description: 'Add your first item to get started.',
    action: <Button>Add item</Button>,
  },
};