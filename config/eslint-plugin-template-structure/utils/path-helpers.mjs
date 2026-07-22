import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_UTILS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(PLUGIN_UTILS_DIR, '../../..');
const DEFAULT_COMPONENTS_DIR = path.join(REPO_ROOT, 'components');

let warnedEmptyDiscovery = false;

/** @internal Resets one-time warning state between unit tests. */
export function resetEmptyDiscoveryWarningForTests() {
  warnedEmptyDiscovery = false;
}

/**
 * @param {string} componentsDir
 * @param {string} entryName
 * @returns {boolean}
 */
function hasPagesDirectory(componentsDir, entryName) {
  try {
    const pagesDir = path.join(componentsDir, entryName, 'pages');
    return fs.existsSync(pagesDir) && fs.statSync(pagesDir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * @param {string} componentsDir
 * @param {string[]} features
 */
export function warnIfEmptyDiscovery(componentsDir, features) {
  if (features.length > 0 || warnedEmptyDiscovery) {
    return;
  }

  try {
    const entries = fs
      .readdirSync(componentsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'ui');

    if (entries.length === 0) {
      return;
    }

    console.warn(
      '[template-structure] UI_FEATURES discovery returned no features despite directories under components/. Page-tier ESLint rules may not apply.',
    );
    warnedEmptyDiscovery = true;
  } catch {
    // ignore diagnostic failures
  }
}

/**
 * Feature folders with a `pages/` subdirectory under `components/<feature>/pages/`.
 * UI tiers live under `components/ui/`.
 *
 * @param {string} [componentsDir] Override for tests; defaults to repo `components/`.
 * @returns {string[]}
 */
export function discoverUiFeatures(componentsDir = DEFAULT_COMPONENTS_DIR) {
  if (!fs.existsSync(componentsDir)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(componentsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const features = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'ui')
    .filter((entry) => hasPagesDirectory(componentsDir, entry.name))
    .map((entry) => entry.name)
    .sort();

  if (componentsDir === DEFAULT_COMPONENTS_DIR) {
    warnIfEmptyDiscovery(componentsDir, features);
  }

  return features;
}

export const UI_FEATURES = discoverUiFeatures();

/**
 * True when `source` contains `/components/<feature>/pages` as a path segment
 * (end of string or followed by `/`). Avoids dynamic RegExp construction.
 *
 * @param {string} source
 * @param {string} feature
 * @returns {boolean}
 */
function matchesPageImportSource(source, feature) {
  const needle = `/components/${feature}/pages`;
  const idx = source.indexOf(needle);
  if (idx === -1) return false;
  const after = idx + needle.length;
  return after === source.length || source.charAt(after) === '/';
}

/**
 * @param {string} filename Absolute or relative file path from ESLint.
 * @returns {string} Normalized path relative to the repo root (posix).
 */
export function toRepoRelativePath(filename) {
  const relative = path.isAbsolute(filename)
    ? path.relative(REPO_ROOT, filename)
    : filename;
  return relative.split(path.sep).join('/');
}

/**
 * @param {string} repoRelativePath
 * @returns {boolean}
 */
export function isE2eSpecFile(repoRelativePath) {
  return (
    (repoRelativePath.endsWith('.spec.ts') ||
      repoRelativePath.endsWith('.spec.tsx')) &&
    !repoRelativePath.startsWith('e2e/')
  );
}

/**
 * @param {string} repoRelativePath
 * @returns {string | null}
 */
export function getFeatureFromRepoPath(repoRelativePath) {
  const match = repoRelativePath.match(/^components\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * @param {string} source Import source string.
 * @returns {string | null}
 */
export function getFeatureFromImportSource(source) {
  if (typeof source !== 'string') return null;

  const pageMatch = source.match(/^@\/components\/([^/]+)\/pages(?:\/|$)/);
  if (pageMatch) return pageMatch[1];

  return null;
}

/**
 * @param {string} source Import source string.
 * @returns {boolean}
 */
export function isFeatureTierImport(source) {
  return getFeatureFromImportSource(source) !== null;
}

/**
 * @param {string} repoRelativePath
 * @param {string} importedFeature
 * @returns {boolean}
 */
export function canImportFeatureTier(repoRelativePath, importedFeature) {
  if (repoRelativePath.startsWith('app/')) return true;
  const importerFeature = getFeatureFromRepoPath(repoRelativePath);
  return importerFeature === importedFeature;
}

/**
 * @param {string} repoRelativePath
 * @returns {'atom' | 'element' | 'composition' | 'page' | null}
 */
export function getUiLayerFromImporter(repoRelativePath) {
  if (repoRelativePath.startsWith('components/ui/atoms/')) return 'atom';
  if (repoRelativePath.startsWith('components/ui/elements/')) return 'element';
  if (repoRelativePath.startsWith('components/ui/compositions/')) {
    return 'composition';
  }

  for (const feature of UI_FEATURES) {
    if (repoRelativePath.startsWith(`components/${feature}/pages/`)) {
      return 'page';
    }
  }

  return null;
}

/**
 * @param {string} source Import source string.
 * @returns {'atom' | 'element' | 'composition' | 'page' | null}
 */
export function getUiLayerFromImportSource(source) {
  if (typeof source !== 'string') return null;

  if (
    source.includes('/components/ui/atoms/') ||
    source.endsWith('/ui/atoms')
  ) {
    return 'atom';
  }

  if (source.includes('/components/ui/elements/')) {
    return 'element';
  }

  if (source.includes('/components/ui/compositions/')) {
    return 'composition';
  }

  for (const feature of UI_FEATURES) {
    if (matchesPageImportSource(source, feature)) {
      return 'page';
    }
  }

  return null;
}

/**
 * @param {string} source Import source string.
 * @returns {boolean}
 */
export function isPageTierImport(source) {
  return isFeatureTierImport(source);
}

/**
 * @param {string} source
 * @returns {number}
 */
export function countParentDirectoryHops(source) {
  if (typeof source !== 'string' || !source.startsWith('.')) return 0;
  const segments = source.split('/');
  return segments.filter((segment) => segment === '..').length;
}

/**
 * @param {import('eslint').Rule.Node} node
 * @returns {boolean}
 */
export function isTypeOnlyImport(node) {
  if (node.type !== 'ImportDeclaration') return false;
  if (node.importKind === 'type') return true;
  return node.specifiers.every(
    (specifier) =>
      specifier.type === 'ImportSpecifier' && specifier.importKind === 'type',
  );
}

/**
 * Legacy kebab-case filenames in components/ui (RFC §9 Phase 4 — empty after PascalCase rename).
 */
export const UI_KEBAB_CASE_ALLOWLIST = new Set([]);

/**
 * UI tiers that require colocated *.test.tsx (phased rollout).
 * 1. atom → 2. +element → 3. +composition → 4. +page
 */
export const UI_UNIT_TEST_ENFORCED_TIERS = new Set([
  'atom',
  'element',
  'composition',
  'page',
]);

/** Components intentionally without unit tests. */
export const UI_UNIT_TEST_ALLOWLIST = new Set([]);

/**
 * @param {string} repoRelativePath
 * @returns {'atom' | 'element' | 'composition' | 'page' | null}
 */
export function getUiUnitTestTier(repoRelativePath) {
  if (repoRelativePath.startsWith('components/ui/atoms/')) return 'atom';
  if (repoRelativePath.startsWith('components/ui/elements/')) return 'element';
  if (repoRelativePath.startsWith('components/ui/compositions/')) {
    return 'composition';
  }

  for (const feature of UI_FEATURES) {
    if (repoRelativePath.startsWith(`components/${feature}/pages/`)) {
      return 'page';
    }
  }

  return null;
}