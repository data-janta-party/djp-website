import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 3000,
    hookTimeout: 3000,
    setupFiles: [path.resolve(__dirname, '../vitest.setup.ts')],
    exclude: [
      '**/node_modules/**',
      '.next/**',
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