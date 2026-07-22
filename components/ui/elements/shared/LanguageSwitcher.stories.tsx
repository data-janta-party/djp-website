import type { Meta, StoryObj } from '@storybook/react';

import { LanguageSwitcher } from './LanguageSwitcher';

const meta = {
  title: 'UI/Elements/Shared/LanguageSwitcher',
  component: LanguageSwitcher,
  tags: ['autodocs'],
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
