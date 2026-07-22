import os from 'node:os';
import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const cpuCount =
  typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
const maxWorkers = Math.max(2, Math.min(cpuCount, process.env.CI ? 4 : 8));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 5000,
    hookTimeout: 5000,
    pool: 'forks',
    maxWorkers,
    fileParallelism: true,
    setupFiles: [path.resolve(__dirname, '../vitest.setup.ts')],
    exclude: [
      '**/node_modules/**',
      '.next/**',
      '.next-e2e/**',
      '.open-next/**',
      'e2e/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../'),
    },
  },
});