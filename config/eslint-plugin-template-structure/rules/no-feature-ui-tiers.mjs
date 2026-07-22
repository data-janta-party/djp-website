import { toRepoRelativePath } from '../utils/path-helpers.mjs';

const DEPRECATED_TIER_PATTERN =
  /^components\/(?!ui\/)([^/]+)\/(elements|compositions)\//;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Feature folders may only contain pages/. Elements and compositions belong under components/ui/ (RFC 002).',
    },
    messages: {
      wrongLocation:
        'UI tier "{{tier}}" must not live under components/{{feature}}/. Move to components/ui/{{tier}}/{{feature}}/.',
      deprecatedImport:
        'Importing "{{source}}" uses a deprecated path. Use components/ui/{{tier}}/{{feature}}/ instead.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    const locationMatch = filename.match(DEPRECATED_TIER_PATTERN);

    const rules = {};

    if (locationMatch) {
      rules.Program = (node) => {
        context.report({
          node,
          messageId: 'wrongLocation',
          data: {
            feature: locationMatch[1],
            tier: locationMatch[2],
          },
        });
      };
    }

    function checkImport(node, source) {
      if (typeof source !== 'string') return;
      const importMatch = source.match(
        /^@\/components\/(?!ui\/)([^/]+)\/(elements|compositions)(?:\/|$)/,
      );
      if (!importMatch) return;

      context.report({
        node,
        messageId: 'deprecatedImport',
        data: {
          source,
          feature: importMatch[1],
          tier: importMatch[2],
        },
      });
    }

    rules.ImportDeclaration = (node) => checkImport(node, node.source.value);
    rules.ExportNamedDeclaration = (node) => {
      if (node.source) checkImport(node, node.source.value);
    };
    rules.ExportAllDeclaration = (node) => {
      if (node.source) checkImport(node, node.source.value);
    };

    return rules;
  },
};