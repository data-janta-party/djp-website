import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const templateRoot = path.resolve(__dirname, '..');
const E2E_APP_PORT = 3001;
const E2E_BASE_URL = `http://127.0.0.1:${E2E_APP_PORT}`;
const STORYBOOK_PORT = 6006;
const STORYBOOK_BASE_URL = `http://127.0.0.1:${STORYBOOK_PORT}`;

const useProductionServer = process.env.CI === 'true' || process.env.E2E_USE_PROD === '1';
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? E2E_BASE_URL;

const E2E_VIEWPORTS = [
  { label: 'Desktop Chrome', device: devices['Desktop Chrome'] },
] as const;

/** Globs are resolved relative to testDir (`e2e/`). */
const storybookTestMatch = ['ui/atoms/**/*.spec.ts', 'ui/elements/**/*.spec.ts'];
const appTestMatch = ['ui/compositions/**/*.spec.ts', 'ui/pages/**/*.spec.ts'];

const e2eProjects = [
  ...E2E_VIEWPORTS.map(({ label, device }) => ({
    name: `Storybook · ${label}`,
    testMatch: storybookTestMatch,
    use: {
      ...device,
      baseURL: STORYBOOK_BASE_URL,
      colorScheme: 'dark' as const,
    },
  })),
  ...E2E_VIEWPORTS.map(({ label, device }) => ({
    name: label,
    testMatch: appTestMatch,
    use: {
      ...device,
      colorScheme: 'dark' as const,
    },
  })),
];
export default defineConfig({
  testDir: '../e2e',
  timeout: 30 * 1000,
  workers: process.env.CI === 'true' ? 2 : 4,
  fullyParallel: true,
  expect: { timeout: 5 * 1000 },
  use: {
    baseURL,
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10 * 1000,
    navigationTimeout: 60 * 1000,
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: [
          {
            command:
              'pnpm exec storybook dev -p 6006 --host 127.0.0.1 --ci --no-open',
            cwd: templateRoot,
            url: STORYBOOK_BASE_URL,
            reuseExistingServer: process.env.CI !== 'true',
            timeout: 120 * 1000,
          },
          {
            command: useProductionServer
              ? `pnpm exec next start -p ${E2E_APP_PORT} -H 127.0.0.1`
              : `pnpm exec next dev -p ${E2E_APP_PORT} -H 127.0.0.1`,
            cwd: templateRoot,
            url: baseURL,
            reuseExistingServer: process.env.CI !== 'true',
            timeout: 180 * 1000,
            env: {
              NODE_ENV: useProductionServer ? 'production' : 'development',
              PORT: String(E2E_APP_PORT),
              PLAYWRIGHT_E2E: '1',
            },
          },
        ],
      }),
  reporter: [['list']],
  projects: e2eProjects,
});