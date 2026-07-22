import { isE2eSpecFile, toRepoRelativePath } from '../utils/path-helpers.mjs';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Unit tests must use *.test.ts(x). Reserve *.spec.ts(x) for e2e/ only (RFC §5.10).',
    },
    messages: {
      specOutsideE2e:
        'File "{{filename}}" uses the .spec suffix outside e2e/. Rename to *.test.ts(x) for unit tests.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (!isE2eSpecFile(filename)) return {};

    context.report({
      loc: { line: 1, column: 0 },
      messageId: 'specOutsideE2e',
      data: { filename },
    });

    return {};
  },
};