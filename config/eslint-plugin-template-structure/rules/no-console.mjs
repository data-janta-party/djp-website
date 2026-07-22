import { toRepoRelativePath } from '../utils/path-helpers.mjs';
import {
  createConsoleAliasTracker,
  getConsoleMethodFromCallee,
  isBlockedConsoleMethod,
} from '../utils/console-detection.mjs';

const ALLOWLIST_PREFIXES = ['lib/logging/'];

const EXCLUDED_PREFIXES = ['scripts/', 'e2e/', 'config/', '.storybook/'];

const EXCLUDED_SUFFIXES = [
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '.stories.tsx',
];

/**
 * @param {string} filename
 * @returns {boolean}
 */
function isExcludedProductionFile(filename) {
  const relativePath = toRepoRelativePath(filename);

  if (ALLOWLIST_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }

  if (EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }

  return EXCLUDED_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

/** @type {import('eslint').Rule.RuleModule} */
const noConsole = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.* in production/runtime UI code.',
    },
    messages: {
      noConsole:
        'Use createJsonLogger / createRequestLogger from @/lib/logging instead of {{method}}.',
    },
  },
  create(context) {
    if (isExcludedProductionFile(context.filename)) {
      return {};
    }

    const aliasTracker = createConsoleAliasTracker();

    /**
     * @param {import('estree').Node} node
     * @param {string} method
     */
    const reportConsoleUse = (node, method) => {
      context.report({
        node,
        messageId: 'noConsole',
        data: { method: `console.${method}` },
      });
    };

    return {
      VariableDeclarator(node) {
        aliasTracker.trackVariableDeclarator(node);
      },
      CallExpression(node) {
        const directMethod = getConsoleMethodFromCallee(node.callee);
        if (directMethod && isBlockedConsoleMethod(directMethod)) {
          reportConsoleUse(node, directMethod);
          return;
        }

        const aliasedMethod = aliasTracker.getAliasedConsoleMethod(node.callee);
        if (aliasedMethod && isBlockedConsoleMethod(aliasedMethod)) {
          reportConsoleUse(node, aliasedMethod);
        }
      },
    };
  },
};

export default noConsole;
