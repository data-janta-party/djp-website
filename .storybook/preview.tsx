import type { Preview } from '@storybook/nextjs-vite';
import React from 'react';

import '../app/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    nextjs: { appDirectory: true },
    backgrounds: { default: 'dark' },
    options: {
      storySort: {
        order: ['UI', ['Atoms', 'Elements', 'Compositions', 'Pages']],
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-[120px] bg-app-bg p-6 text-app-text font-sans antialiased">
        <Story />
      </div>
    ),
  ],
};

export default preview;
