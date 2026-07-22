import { toRepoRelativePath } from '../utils/path-helpers.mjs';

const BLOCKED_CONSOLE_METHODS = new Set(['error', 'warn', 'log', 'info', 'debug']);

/** @type {import('eslint').Rule.RuleModule} */
const noConsoleInApiRoutes = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'API routes must use structured JSON logging instead of direct console.* calls.',
    },
    messages: {
      noConsole:
        'Use createApiRouteLogger, createRequestLogger, or createJsonLogger instead of {{method}} in API routes.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (!filename.startsWith('app/api/') || filename.startsWith('app/api/_debug/')) {
      return {};
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'console' ||
          node.callee.property.type !== 'Identifier'
        ) {
          return;
        }

        const method = node.callee.property.name;
        if (!BLOCKED_CONSOLE_METHODS.has(method)) {
          return;
        }

        context.report({
          node,
          messageId: 'noConsole',
          data: { method: `console.${method}` },
        });
      },
    };
  },
};

export default noConsoleInApiRoutes;