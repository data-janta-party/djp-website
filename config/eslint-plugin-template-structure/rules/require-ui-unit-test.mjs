import fs from 'node:fs';
import path from 'node:path';

import {
  getUiUnitTestTier,
  REPO_ROOT,
  toRepoRelativePath,
  UI_UNIT_TEST_ALLOWLIST,
  UI_UNIT_TEST_ENFORCED_TIERS,
} from '../utils/path-helpers.mjs';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every enforced UI tier component must have a colocated *.test.tsx unit test.',
    },
    messages: {
      missingUnitTest:
        'Missing unit test. Add {{expected}} next to {{component}}.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (!filename.endsWith('.tsx')) return {};
    if (filename.endsWith('.test.tsx') || filename.endsWith('.stories.tsx')) {
      return {};
    }

    const tier = getUiUnitTestTier(filename);
    if (!tier || !UI_UNIT_TEST_ENFORCED_TIERS.has(tier)) return {};
    if (UI_UNIT_TEST_ALLOWLIST.has(filename)) return {};

    const testPath = filename.replace(/\.tsx$/, '.test.tsx');
    const absoluteTest = path.join(REPO_ROOT, testPath);

    return {
      Program(node) {
        if (fs.existsSync(absoluteTest)) return;

        context.report({
          node,
          messageId: 'missingUnitTest',
          data: {
            component: path.basename(filename),
            expected: path.basename(testPath),
          },
        });
      },
    };
  },
};