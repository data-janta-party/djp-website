#!/usr/bin/env node
/**
 * Post-backfill safety gate: shadcn wrappers must not use static tpl- id
 * fallbacks that collide across instances.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isJsxIdRuleTargetFile } from '../config/eslint-plugin-template-structure/utils/jsx-element-id.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIRS = ['app', 'components', 'lib', 'actions', 'hooks'];

/** Static tpl- fallbacks in shadcn wrappers collide across instances — use useId(). */
const WRAPPER_STATIC_FALLBACK_LINE =
  /id=\{props\.id\s*\?\?\s*"tpl-[^"]*"\}/;

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function walkTsx(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      files.push(...(await walkTsx(fullPath)));
      continue;
    }
    if (
      entry.isFile() &&
      (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const violations = [];

  for (const dir of TARGET_DIRS) {
    const fullDir = path.join(ROOT, dir);
    let files = [];
    try {
      files = await walkTsx(fullDir);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }
      throw error;
    }

    for (const file of files) {
      const relativeFile = path.relative(ROOT, file).split(path.sep).join('/');
      if (!isJsxIdRuleTargetFile(relativeFile)) {
        continue;
      }

      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (WRAPPER_STATIC_FALLBACK_LINE.test(line)) {
          violations.push({
            file: relativeFile,
            line: index + 1,
            component: 'shadcn-wrapper',
            kind: 'static-fallback',
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('Generated id violations:');
    for (const violation of violations.slice(0, 20)) {
      console.error(
        `  ${violation.file}:${violation.line}: ${violation.kind} (${violation.component})`,
      );
    }
    if (violations.length > 20) {
      console.error(`  …and ${violations.length > 20} more`);
    }
    process.exit(1);
  }

  console.log(
    'verify-element-ids: no static tpl- fallbacks in shadcn wrappers',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
