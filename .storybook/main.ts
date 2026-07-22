import type { StorybookConfig } from '@storybook/nextjs-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../components/ui/**/*.stories.@(ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    config.server = {
      ...config.server,
      host: '127.0.0.1',
      allowedHosts: ['127.0.0.1', 'localhost'],
    };
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(dirname, '..'),
    };
    return config;
  },
};

export default config;