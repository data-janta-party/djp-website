#!/usr/bin/env node
/**
 * Scaffold colocated unit tests for components/ui (and optionally pages).
 * Run: pnpm test:generate-ui
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI_ROOT = path.join(ROOT, 'components', 'ui');

const SKIP = new Set([]);

/**
 * @param {string} dir
 * @param {string[]} files
 * @returns {string[]}
 */
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'shadcn') continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

/**
 * @param {string} source
 * @returns {string[]}
 */
function parseExports(source) {
  const names = new Set();
  for (const match of source.matchAll(/export function (\w+)/g)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/export \{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const exported = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (exported && /^[A-Z]/.test(exported)) names.add(exported);
    }
  }
  return [...names];
}

/**
 * @param {string} relPath
 * @param {string} component
 * @returns {string}
 */
function defaultTest(relPath, component) {
  const importFrom = `@/${relPath.replace(/\.tsx$/, '')}`;
  return `import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ${component} } from '${importFrom}';

describe('${component}', () => {
  it('renders without crashing', () => {
    render(<${component} />);
    expect(document.body).toBeTruthy();
  });
});
`;
}

function main() {
  const components = walk(UI_ROOT).filter((file) => {
    const base = path.basename(file);
    return (
      file.endsWith('.tsx') &&
      !base.endsWith('.test.tsx') &&
      !base.endsWith('.stories.tsx') &&
      !SKIP.has(base)
    );
  });

  let created = 0;
  let skipped = 0;

  for (const file of components) {
    const testPath = file.replace(/\.tsx$/, '.test.tsx');
    if (fs.existsSync(testPath)) {
      skipped += 1;
      continue;
    }

    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');
    const exports = parseExports(source);
    const stem = path.basename(file, '.tsx');
    const component = exports.includes(stem) ? stem : exports[0] ?? stem;
    fs.writeFileSync(testPath, defaultTest(rel, component));
    created += 1;
    console.log(`created ${path.relative(ROOT, testPath)}`);
  }

  console.log(
    `test:generate-ui — created ${created}, skipped ${skipped} existing under components/ui/`,
  );
}

main();
