/**
 * Template layout rules (RFC 001). Import into eslint.config.mjs.
 */
import templateStructurePlugin from './eslint-plugin-template-structure/index.mjs';

/** @type {import('eslint').Linter.Config[]} */
export const templateStructureConfig = [
  {
    name: 'template-structure/structure',
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: [
      'node_modules/**',
      '.next/**',
      '.next-e2e/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
    plugins: {
      'template-structure': templateStructurePlugin,
    },
    rules: {
      'template-structure/no-deep-relative-import': 'error',
      'template-structure/no-spec-outside-e2e': 'error',
      'template-structure/actions-purity': 'error',
      'template-structure/no-ui-kebab-filename': 'error',
      'template-structure/ui-layer-import-direction': 'error',
      'template-structure/no-feature-ui-tiers': 'error',
      'template-structure/no-cross-page-import': 'error',
      'template-structure/require-ui-story': 'error',
      'template-structure/require-ui-unit-test': 'error',
      'template-structure/no-direct-api-fetch': 'error',
      'template-structure/no-arbitrary-tailwind': 'error',
      'template-structure/require-element-id': 'error',
      'template-structure/require-html-attributes-props': 'error',
    },
  },
  {
    name: 'template-structure/logging',
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: [
      'node_modules/**',
      '.next/**',
      '.next-e2e/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/**',
      'e2e/**',
      'config/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.stories.tsx',
    ],
    plugins: {
      'template-structure': templateStructurePlugin,
    },
    rules: {
      'template-structure/no-console': 'error',
    },
  },
  {
    name: 'template-structure/api-logging',
    files: ['app/api/**/*.{ts,tsx}'],
    plugins: {
      'template-structure': templateStructurePlugin,
    },
    rules: {
      'template-structure/no-console-in-api-routes': 'error',
    },
  },
];
