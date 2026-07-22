import { toRepoRelativePath } from '../utils/path-helpers.mjs';

const FORBIDDEN_PREFIXES = [
  '@/components/',
  'components/',
  'react',
  'react/',
  'next/navigation',
  'next/headers',
];

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Server action modules must not import UI or client-only modules (RFC §5.1).',
    },
    messages: {
      forbidden:
        'actions/ must not import "{{source}}". Keep server actions free of UI and client-only dependencies.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (!filename.startsWith('actions/')) return {};

    function checkSource(node, source) {
      const forbidden = FORBIDDEN_PREFIXES.some(
        (prefix) => source === prefix || source.startsWith(prefix),
      );
      if (!forbidden) return;

      context.report({
        node,
        messageId: 'forbidden',
        data: { source },
      });
    }

    return {
      ImportDeclaration(node) {
        checkSource(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        checkSource(node, node.source.value);
      },
    };
  },
};