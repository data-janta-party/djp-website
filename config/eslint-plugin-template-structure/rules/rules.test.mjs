import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { RuleTester } from 'eslint';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  REPO_ROOT,
  UI_FEATURES,
  discoverUiFeatures,
  getUiLayerFromImporter,
  getUiLayerFromImportSource,
  isPageTierImport,
  resetEmptyDiscoveryWarningForTests,
  toRepoRelativePath,
  warnIfEmptyDiscovery,
} from '../utils/path-helpers.mjs';

import noDeepRelativeImport from './no-deep-relative-import.mjs';
import noSpecOutsideE2e from './no-spec-outside-e2e.mjs';
import actionsPurity from './actions-purity.mjs';
import noFeatureUiTiers from './no-feature-ui-tiers.mjs';
import noCrossPageImport from './no-cross-page-import.mjs';
import requireUiStory from './require-ui-story.mjs';
import requireUiUnitTest from './require-ui-unit-test.mjs';
import noDirectApiFetch from './no-direct-api-fetch.mjs';
import noArbitraryTailwind from './no-arbitrary-tailwind.mjs';
import noConsoleInApiRoutes from './no-console-in-api-routes.mjs';
import noUiKebabFilename from './no-ui-kebab-filename.mjs';
import uiLayerImportDirection from './ui-layer-import-direction.mjs';
import requireElementId from './require-element-id.mjs';
import noConsole from './no-console.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

function runRule(ruleId, rule, tests) {
  it(ruleId, () => {
    ruleTester.run(ruleId, rule, tests);
  });
}

describe('path-helpers UI_FEATURES discovery', () => {
  /** @type {string[]} */
  let tempDirs = [];

  beforeEach(() => {
    resetEmptyDiscoveryWarningForTests();
  });

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    tempDirs = [];
    vi.restoreAllMocks();
  });

  function makeTempComponentsDir() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-features-'));
    tempDirs.push(tempDir);
    return tempDir;
  }

  it('discovers civic-pulse from the real repo layout', () => {
    const realComponentsDir = path.join(REPO_ROOT, 'components');
    const civicPagesDir = path.join(realComponentsDir, 'civic-pulse', 'pages');

    expect(fs.existsSync(civicPagesDir)).toBe(true);
    expect(discoverUiFeatures(realComponentsDir)).toContain('civic-pulse');
    expect(UI_FEATURES).toContain('civic-pulse');
  });

  it('does not treat components/ui/ as a feature', () => {
    expect(UI_FEATURES).not.toContain('ui');
    expect(discoverUiFeatures(path.join(REPO_ROOT, 'components'))).not.toContain(
      'ui',
    );
  });

  it('returns features in sorted order', () => {
    const componentsDir = makeTempComponentsDir();

    for (const feature of ['zebra', 'alpha', 'beta']) {
      fs.mkdirSync(path.join(componentsDir, feature, 'pages'), {
        recursive: true,
      });
    }

    expect(discoverUiFeatures(componentsDir)).toEqual(['alpha', 'beta', 'zebra']);
  });

  it('returns [] when the components directory is missing', () => {
    const componentsDir = path.join(
      makeTempComponentsDir(),
      'missing-components',
    );

    expect(discoverUiFeatures(componentsDir)).toEqual([]);
  });

  it('ignores feature directories without a pages subdirectory', () => {
    const componentsDir = makeTempComponentsDir();
    fs.mkdirSync(path.join(componentsDir, 'orphan'));

    expect(discoverUiFeatures(componentsDir)).toEqual([]);
  });

  it('ignores pages when it is a file, not a directory', () => {
    const componentsDir = makeTempComponentsDir();
    const featureDir = path.join(componentsDir, 'fake');
    fs.mkdirSync(featureDir);
    fs.writeFileSync(path.join(featureDir, 'pages'), '');

    expect(discoverUiFeatures(componentsDir)).toEqual([]);
  });

  it('skips a broken pages symlink without dropping other features', () => {
    const componentsDir = makeTempComponentsDir();

    fs.mkdirSync(path.join(componentsDir, 'broken'));
    fs.symlinkSync(
      path.join(componentsDir, 'nonexistent-pages-target'),
      path.join(componentsDir, 'broken', 'pages'),
    );
    fs.mkdirSync(path.join(componentsDir, 'alpha', 'pages'), {
      recursive: true,
    });

    expect(discoverUiFeatures(componentsDir)).toEqual(['alpha']);
  });

  it('detects page layer for civic-pulse page components', () => {
    expect(
      getUiLayerFromImporter('components/civic-pulse/pages/CivicPulseHomePageView.tsx'),
    ).toBe('page');
    expect(
      getUiLayerFromImportSource('@/components/civic-pulse/pages/CivicPulseHomePageView'),
    ).toBe('page');
  });

  it('detects page layer for barrel imports without a trailing slash', () => {
    expect(getUiLayerFromImportSource('@/components/civic-pulse/pages')).toBe('page');
  });

  it('detects page-tier imports for undiscovered features', () => {
    expect(isPageTierImport('@/components/other/pages')).toBe(true);
    expect(isPageTierImport('@/components/other/pages/OtherPage')).toBe(true);
    expect(getUiLayerFromImportSource('@/components/other/pages')).toBe(null);
  });

  it('returns [] when readdirSync throws', () => {
    const componentsDir = makeTempComponentsDir();
    const readdirSpy = vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    expect(discoverUiFeatures(componentsDir)).toEqual([]);

    readdirSpy.mockRestore();
  });

  it('warns once when feature directories exist but none qualify', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const componentsDir = makeTempComponentsDir();
    fs.mkdirSync(path.join(componentsDir, 'orphan'));

    warnIfEmptyDiscovery(componentsDir, []);
    warnIfEmptyDiscovery(componentsDir, []);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[template-structure] UI_FEATURES discovery returned no features despite directories under components/. Page-tier ESLint rules may not apply.',
    );
  });

  it('normalizes absolute paths relative to REPO_ROOT, not process.cwd()', () => {
    const originalCwd = process.cwd();
    const subDir = path.join(REPO_ROOT, 'config');

    process.chdir(subDir);
    try {
      const absolute = path.join(
        REPO_ROOT,
        'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
      );

      expect(toRepoRelativePath(absolute)).toBe(
        'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
      );
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe('eslint-plugin-template-structure rules', () => {
  runRule('no-deep-relative-import', noDeepRelativeImport, {
    valid: [
      { code: "import x from '@/lib/utils/index';" },
      { code: "import x from '../lib/foo';" },
      { code: "import x from '../../lib/foo';" },
    ],
    invalid: [
      {
        code: "import x from '../../../lib/server-utils/adminAuth';",
        errors: [{ messageId: 'tooDeep' }],
      },
    ],
  });

  runRule('no-spec-outside-e2e', noSpecOutsideE2e, {
    valid: [
      { code: 'const x = 1;', filename: 'lib/utils/index.test.ts' },
      { code: 'const x = 1;', filename: 'e2e/homepage.spec.ts' },
    ],
    invalid: [
      {
        code: 'const x = 1;',
        filename: 'lib/utils/index.spec.ts',
        errors: [{ messageId: 'specOutsideE2e' }],
      },
    ],
  });

  runRule('no-feature-ui-tiers', noFeatureUiTiers, {
    valid: [
      {
        code: "import { ThemeToggle } from '@/components/ui/elements/shared/ThemeToggle';",
        filename: 'components/ui/compositions/civic-pulse/HomeBrand.tsx',
      },
    ],
    invalid: [
      {
        code: "import { ThemeToggle } from '@/components/civic-pulse/elements/ThemeToggle';",
        filename: 'components/ui/compositions/civic-pulse/HomeBrand.tsx',
        errors: [{ messageId: 'deprecatedImport' }],
      },
      {
        code: 'export const x = 1;',
        filename: 'components/civic-pulse/elements/ThemeToggle.tsx',
        errors: [{ messageId: 'wrongLocation' }],
      },
    ],
  });

  runRule('no-cross-page-import', noCrossPageImport, {
    valid: [
      {
        code: "import { DemoPanel } from '@/components/ui/compositions/demo/DemoPanel';",
        filename: 'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
      },
    ],
    invalid: [
      {
        code: "import { OtherPage } from '@/components/demo/pages/OtherPage';",
        filename: 'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
        errors: [{ messageId: 'crossPage' }],
      },
      {
        code: "import * as OtherPages from '@/components/other/pages';",
        filename: 'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
        errors: [{ messageId: 'crossPage' }],
      },
    ],
  });

  runRule('require-ui-story', requireUiStory, {
    valid: [
      {
        code: 'export function Badge() { return null; }',
        filename: 'components/ui/atoms/Badge.tsx',
      },
    ],
    invalid: [
      {
        code: 'export function MissingStory() { return null; }',
        filename: 'components/ui/atoms/MissingStory.tsx',
        errors: [{ messageId: 'missingStory' }],
      },
    ],
  });

  runRule('require-ui-unit-test', requireUiUnitTest, {
    valid: [
      {
        code: 'export function Badge() { return null; }',
        filename: 'components/ui/atoms/Badge.tsx',
      },
      {
        code: 'export function AppShell() { return null; }',
        filename: 'components/ui/compositions/layout/AppShell.tsx',
      },
      {
        code: 'export function DemoPageView() { return null; }',
        filename: 'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
      },
    ],
    invalid: [
      {
        code: 'export function MissingTest() { return null; }',
        filename: 'components/ui/atoms/MissingTest.tsx',
        errors: [{ messageId: 'missingUnitTest' }],
      },
      {
        code: 'export function MissingElementTest() { return null; }',
        filename: 'components/ui/elements/shared/MissingElementTest.tsx',
        errors: [{ messageId: 'missingUnitTest' }],
      },
      {
        code: 'export function MissingCompositionTest() { return null; }',
        filename: 'components/ui/compositions/layout/MissingCompositionTest.tsx',
        errors: [{ messageId: 'missingUnitTest' }],
      },
      {
        code: 'export function MissingPageTest() { return null; }',
        filename: 'components/civic-pulse/pages/MissingPageTest.tsx',
        errors: [{ messageId: 'missingUnitTest' }],
      },
    ],
  });

  runRule('actions-purity', actionsPurity, {
    valid: [
      {
        code: "import { z } from 'zod';",
        filename: 'actions/demo.ts',
      },
    ],
    invalid: [
      {
        code: "import { Button } from '@/components/ui/atoms/Button';",
        filename: 'actions/demo.ts',
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: "import { useRouter } from 'next/navigation';",
        filename: 'actions/demo.ts',
        errors: [{ messageId: 'forbidden' }],
      },
    ],
  });

  runRule('no-arbitrary-tailwind', noArbitraryTailwind, {
    valid: [
      {
        code: '<div className="text-md text-2xl bg-app-bg" />',
        filename: 'components/ui/shadcn/button.tsx',
      },
      {
        code: '<div className="shadow-[0_8px_24px_rgba(0,0,0,0.2)]" />',
        filename: 'components/ui/shadcn/button.tsx',
      },
      {
        code: '<div className="text-sm" />',
        filename: 'components/ui/shadcn/button.test.tsx',
      },
    ],
    invalid: [
      {
        code: '<div className="text-[11px] font-medium" />',
        filename: 'components/ui/atoms/Chip.tsx',
        errors: [{ messageId: 'arbitrary' }],
      },
      {
        code: '<span className={cn("text-xs", "text-caption")} />',
        filename: 'components/ui/compositions/civic-pulse/HomeBrand.tsx',
        errors: [{ messageId: 'rawTypography' }, { messageId: 'rawTypography' }],
      },
    ],
  });

  runRule('no-direct-api-fetch', noDirectApiFetch, {
    valid: [
      {
        code: "import { getHealth } from '@/lib/api/health';",
        filename: 'components/ui/compositions/civic-pulse/HomeBrand.tsx',
      },
      {
        code: "await apiRequest({ path: '/api/health', responseSchema: schema });",
        filename: 'lib/api/health.ts',
      },
      {
        code: "fetch('/api/health');",
        filename: 'components/ui/compositions/demo/DemoPanel.test.tsx',
      },
    ],
    invalid: [
      {
        code: "fetch('/api/health');",
        filename: 'components/ui/compositions/civic-pulse/HomeBrand.tsx',
        errors: [{ messageId: 'noDirectApiFetch' }],
      },
    ],
  });

  runRule('no-ui-kebab-filename', noUiKebabFilename, {
    valid: [
      {
        code: 'export function Button() { return null; }',
        filename: 'components/ui/atoms/Button.tsx',
      },
      {
        code: 'export function Button() { return null; }',
        filename: 'components/ui/shadcn/button.tsx',
      },
    ],
    invalid: [
      {
        code: 'export function Chip() { return null; }',
        filename: 'components/ui/atoms/filter-chip.tsx',
        errors: [{ messageId: 'kebabCase' }],
      },
      {
        code: 'export function ThemeToggle() { return null; }',
        filename: 'components/ui/elements/shared/theme-toggle.tsx',
        errors: [{ messageId: 'kebabCase' }],
      },
    ],
  });

  runRule('ui-layer-import-direction', uiLayerImportDirection, {
    valid: [
      {
        code: "import { Button } from '@/components/ui/atoms/Button';",
        filename: 'components/ui/elements/shared/ThemeToggle.tsx',
      },
      {
        code: "import { DemoPanel } from '@/components/ui/compositions/demo/DemoPanel';",
        filename: 'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
      },
    ],
    invalid: [
      {
        code: "import { DemoPanel } from '@/components/ui/compositions/demo/DemoPanel';",
        filename: 'components/ui/atoms/Button.tsx',
        errors: [{ messageId: 'upwardImport' }],
      },
      {
        code: "import { ThemeToggle } from '@/components/ui/elements/shared/ThemeToggle';",
        filename: 'components/ui/atoms/Button.tsx',
        errors: [{ messageId: 'upwardImport' }],
      },
      {
        code: "import * as OtherPages from '@/components/other/pages';",
        filename: 'components/civic-pulse/pages/CivicPulseHomePageView.tsx',
        errors: [{ messageId: 'pageImportsPage' }],
      },
    ],
  });

  runRule('no-console-in-api-routes', noConsoleInApiRoutes, {
    valid: [
      {
        code: 'export async function GET() { return Response.json({ ok: true }); }',
        filename: 'app/api/health/route.ts',
      },
      {
        code: "console.error('not an api route');",
        filename: 'lib/utils/index.ts',
      },
    ],
    invalid: [
      {
        code: "console.error('health error', err);",
        filename: 'app/api/health/route.ts',
        errors: [{ messageId: 'noConsole' }],
      },
    ],
  });

  runRule('require-element-id', requireElementId, {
    valid: [
      {
        code: 'export function X() { return <div id="ok" />; }',
        filename: 'components/ui/atoms/X.tsx',
      },
      {
        code: 'export function X() { return <div id="ok" />; }',
        filename: 'components/ui/atoms/X.test.tsx',
      },
    ],
    invalid: [
      {
        code: 'export function X() { return <div />; }',
        filename: 'components/ui/atoms/X.tsx',
        errors: [{ messageId: 'missingId' }],
        output:
          'export function X() { return <div id="tpl-components-ui-atoms-x-l1-c30" />; }',
      },
    ],
  });

  // require-html-attributes-props needs TS parser — covered by utils/html-attributes-props.test.mjs

  runRule('no-console', noConsole, {
    valid: [
      {
        code: "console.log('allowed in tests');",
        filename: 'lib/utils/index.test.ts',
      },
      {
        code: "console.log('allowed in logging');",
        filename: 'lib/logging/json-logger.ts',
      },
    ],
    invalid: [
      {
        code: "console.log('not allowed');",
        filename: 'lib/utils/index.ts',
        errors: [{ messageId: 'noConsole' }],
      },
    ],
  });
});