import type { Meta, StoryObj } from '@storybook/react';

import { DELAYED_PROJECT_FACTS } from '@/lib/kinetic-speech';

import { BeatNodes, RollerUrl } from './KineticSpeechBeatNodes';

const meta = {
  title: 'UI/Compositions/CivicPulse/KineticSpeechBeatNodes',
  component: BeatNodes,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Kinetic speech beat DOM nodes (kind → render) and finale roller. Used by KineticSpeechFilm stage.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        id="kinetic-speech-beat-nodes-story"
        className="relative h-[40vh] w-[min(90vw,28rem)] overflow-hidden bg-black text-white"
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BeatNodes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LineBeat: Story = {
  args: {
    beat: {
      kind: 'line',
      id: 'story-line',
      text: 'Chalta Hai.',
      role: 'slam',
      motion: 'pop',
      hold: 2,
    },
  },
};

export const StickyMorph: Story = {
  args: {
    beat: {
      kind: 'sticky',
      id: 'story-sticky',
      prefix: 'Deadline',
      inline: true,
      steps: [
        { suffix: 'promised', hold: 2, dots: 3 },
        { suffix: 'extended', hold: 2, dots: 3 },
      ],
    },
  },
};

export const ProjectDelays: Story = {
  args: {
    beat: {
      kind: 'project-delays',
      id: 'story-delays',
      projects: DELAYED_PROJECT_FACTS.slice(0, 2),
      holdEach: 3,
      moreLabel: '1000+ more.',
      moreHold: 3,
    },
  },
};

export const Roller: Story = {
  render: () => <RollerUrl />,
};
