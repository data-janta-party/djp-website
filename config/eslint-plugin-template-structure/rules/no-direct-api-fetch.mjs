import { toRepoRelativePath } from '../utils/path-helpers.mjs';

const ALLOWED_PREFIXES = ['lib/api/'];

function isAllowedFile(filename) {
  return ALLOWED_PREFIXES.some((prefix) => filename.startsWith(prefix));
}

function isTestFile(filename) {
  return (
    filename.endsWith('.test.ts') ||
    filename.endsWith('.test.tsx') ||
    filename.startsWith('e2e/')
  );
}

function resolveFetchUrl(node) {
  const arg = node.arguments[0];
  if (!arg) {
    return null;
  }

  if (arg.type === 'Literal' && typeof arg.value === 'string') {
    return arg.value;
  }

  if (arg.type === 'TemplateLiteral' && arg.quasis.length > 0) {
    const prefix = arg.quasis[0].value.cooked ?? '';
    if (prefix.startsWith('/api/')) {
      return prefix;
    }
  }

  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct fetch("/api/...") outside lib/api. Use typed helpers from @/lib/api/*.',
    },
    messages: {
      noDirectApiFetch:
        'Use typed API helpers from @/lib/api/* instead of direct fetch("{{url}}").',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);

    if (isAllowedFile(filename) || isTestFile(filename)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'fetch'
        ) {
          return;
        }

        const url = resolveFetchUrl(node);
        if (!url || !url.startsWith('/api/')) {
          return;
        }

        context.report({
          node,
          messageId: 'noDirectApiFetch',
          data: { url },
        });
      },
    };
  },
};