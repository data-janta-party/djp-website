import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import { templateStructureConfig } from './config/template-eslint.mjs';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...templateStructureConfig,
  globalIgnores([
    '.next/**',
    '.next-e2e/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.open-next/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;