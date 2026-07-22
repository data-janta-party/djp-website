import { countParentDirectoryHops } from '../utils/path-helpers.mjs';

const MAX_PARENT_HOPS = 2;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow relative imports that traverse more than two parent directories. Use the @/ path alias instead (RFC §6).',
    },
    messages: {
      tooDeep:
        'Import "{{source}}" traverses {{hops}} parent directories (max {{max}}). Use the @/ alias instead.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxParentHops: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const maxParentHops =
      context.options[0]?.maxParentHops ?? MAX_PARENT_HOPS;

    function checkSource(node, source) {
      const hops = countParentDirectoryHops(source);
      if (hops <= maxParentHops) return;

      context.report({
        node,
        messageId: 'tooDeep',
        data: { source, hops, max: maxParentHops },
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