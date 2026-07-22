#!/usr/bin/env node
/**
 * Report only template-structure layout rule violations (RFC 001).
 */
import { ESLint } from 'eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LINT_TARGETS = [
  'app',
  'components',
  'lib',
  'actions',
  'hooks',
  'config',
  'scripts',

  'eslint.config.mjs',
].map((entry) => path.join(ROOT, entry));

async function main() {
  const eslint = new ESLint({ cwd: ROOT });
  const results = await eslint.lintFiles(LINT_TARGETS);

  let errorCount = 0;
  let warningCount = 0;

  for (const result of results) {
    const structureMessages = result.messages.filter((message) =>
      message.ruleId?.startsWith('template-structure/'),
    );
    if (structureMessages.length === 0) continue;

    const relativeFile = path.relative(ROOT, result.filePath);
    for (const message of structureMessages) {
      const label = message.severity === 2 ? 'error' : 'warning';
      if (message.severity === 2) errorCount += 1;
      else warningCount += 1;

      console.log(
        `${relativeFile}:${message.line}:${message.column} ${label} [${message.ruleId}] ${message.message}`,
      );
    }
  }

  console.log('');
  console.log(
    `template-structure: ${errorCount} error(s), ${warningCount} warning(s)`,
  );

  if (errorCount > 0 || warningCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});