import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT, toRepoRelativePath } from '../utils/path-helpers.mjs';

const UI_COMPONENT_PATTERN =
  /^components\/ui\/(atoms|elements|compositions)\/.+\.tsx$/;

/** Presentational components that intentionally have no story file. */
const STORY_ALLOWLIST = new Set([
  'components/ui/atoms/Icons.tsx',
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every components/ui component must have a colocated *.stories.tsx file for Storybook.',
    },
    messages: {
      missingStory:
        'Missing Storybook story. Add {{expected}} next to {{component}}.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (!UI_COMPONENT_PATTERN.test(filename)) return {};
    if (filename.endsWith('.test.tsx') || filename.endsWith('.stories.tsx')) {
      return {};
    }
    if (STORY_ALLOWLIST.has(filename)) return {};

    const storyPath = filename.replace(/\.tsx$/, '.stories.tsx');
    const absoluteStory = path.join(REPO_ROOT, storyPath);

    return {
      Program(node) {
        if (fs.existsSync(absoluteStory)) return;

        context.report({
          node,
          messageId: 'missingStory',
          data: {
            component: path.basename(filename),
            expected: path.basename(storyPath),
          },
        });
      },
    };
  },
};