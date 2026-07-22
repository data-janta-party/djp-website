import type { Meta, StoryObj } from '@storybook/react';

import { JoinMovement } from './JoinMovement';

const meta = {
  title: 'UI/Compositions/CivicPulse/JoinMovement',
  component: JoinMovement,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Left-aligned join section: rotating "Let\'s build {adjective} India." headline plus contribution cards (no logo marks).',
      },
    },
  },
} satisfies Meta<typeof JoinMovement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
