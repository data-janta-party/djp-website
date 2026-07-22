import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['config/eslint-plugin-template-structure/**/*.test.mjs'],
    environment: 'node',
  },
});