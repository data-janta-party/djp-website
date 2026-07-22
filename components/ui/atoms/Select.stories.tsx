import type { Meta, StoryObj } from '@storybook/react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';

const meta = {
  title: 'UI/Atoms/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="en">
      <SelectTrigger aria-label="Language">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="hi">हिन्दी</SelectItem>
      </SelectContent>
    </Select>
  ),
};
