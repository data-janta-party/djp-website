import type { Meta, StoryObj } from '@storybook/react';

import { IndiaMap } from './IndiaMap';

const meta = {
  title: 'UI/Elements/Shared/IndiaMap',
  component: IndiaMap,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div id="india-map-story-frame" className="w-[min(100vw,36rem)] max-w-xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IndiaMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithStates: Story = {
  args: {
    showStates: true,
  },
};

export const OutlineOnly: Story = {
  args: {
    showStates: false,
  },
};

export const WithFill: Story = {
  args: {
    showStates: true,
    showFill: true,
  },
};

export const MarkersAndPath: Story = {
  args: {
    showStates: true,
    markers: [
      { id: 'del', lat: 28.6139, lon: 77.209, label: 'Delhi' },
      { id: 'mum', lat: 19.076, lon: 72.8777, label: 'Mumbai' },
      { id: 'blr', lat: 12.9716, lon: 77.5946, label: 'Bengaluru' },
      { id: 'kol', lat: 22.5726, lon: 88.3639, label: 'Kolkata' },
      { id: 'chn', lat: 13.0827, lon: 80.2707, label: 'Chennai' },
    ],
    paths: [
      {
        id: 'delhi-mumbai',
        coordinates: [
          [77.209, 28.6139],
          [72.8777, 19.076],
        ],
      },
    ],
  },
};
