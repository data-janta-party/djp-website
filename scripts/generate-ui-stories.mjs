#!/usr/bin/env node
/**
 * Generate colocated Storybook stories for components under components/ui.
 * Run: pnpm storybook:generate
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
 * @param {string} relPath
 * @returns {string}
 */
function toTitle(relPath) {
  const parts = relPath
    .replace(/^components\/ui\//, '')
    .replace(/\.tsx$/, '')
    .split('/');
  return ['UI', ...parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1))].join(
    '/',
  );
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
function defaultStory(relPath, component) {
  const title = toTitle(relPath);
  const importPath = `./${path.basename(relPath, '.tsx')}`;
  return `import type { Meta, StoryObj } from '@storybook/react';

import { ${component} } from '${importPath}';

const meta = {
  title: '${title}',
  component: ${component},
  tags: ['autodocs'],
} satisfies Meta<typeof ${component}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
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
    const storyPath = file.replace(/\.tsx$/, '.stories.tsx');
    if (fs.existsSync(storyPath)) {
      skipped += 1;
      continue;
    }

    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');
    const exports = parseExports(source);
    const stem = path.basename(file, '.tsx');
    const component = exports.includes(stem) ? stem : exports[0] ?? stem;
    fs.writeFileSync(storyPath, defaultStory(rel, component));
    created += 1;
    console.log(`created ${path.relative(ROOT, storyPath)}`);
  }

  console.log(
    `storybook:generate — created ${created}, skipped ${skipped} existing under components/ui/`,
  );
}

main();
