import type { Meta, StoryObj } from '@storybook/react';

import { BrandLogo } from './BrandLogo';

const meta = {
  title: 'UI/Elements/Shared/BrandLogo',
  component: BrandLogo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['white', 'black'],
    },
    weight: {
      control: 'radio',
      options: ['semibold', 'light'],
    },
  },
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Black background, white type — default lockup for light surfaces. */
export const Black: Story = {
  args: {
    variant: 'black',
    className: 'text-2xl',
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-white p-10">
        <Story />
      </div>
    ),
  ],
};

/** White background, black type — lockup for dark surfaces. */
export const White: Story = {
  args: {
    variant: 'white',
    className: 'text-2xl',
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-black p-10">
        <Story />
      </div>
    ),
  ],
};

export const Both: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-8">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-8">
        <BrandLogo variant="black" className="text-2xl" />
        <span className="text-xs text-black/60">variant=&quot;black&quot;</span>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg bg-black p-8">
        <BrandLogo variant="white" className="text-2xl" />
        <span className="text-xs text-white/60">variant=&quot;white&quot;</span>
      </div>
    </div>
  ),
};

export const LightWeight: Story = {
  args: {
    variant: 'black',
    weight: 'light',
    className: 'text-4xl px-4 py-2',
  },
};
