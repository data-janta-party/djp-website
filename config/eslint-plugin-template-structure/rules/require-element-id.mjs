import { toRepoRelativePath } from '../utils/path-helpers.mjs';
import {
  buildIdFix,
  getIdAttribute,
  getStaticIdValue,
  hasIdAttribute,
  isJsxIdRuleTargetFile,
  isLintableJsxElement,
  shouldRequireElementId,
} from '../utils/jsx-element-id.mjs';

/** @type {import('eslint').Rule.RuleModule} */
const requireElementId = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require JSX elements to have an id attribute when the tag accepts id (intrinsic DOM always; custom components only when props include id).',
    },
    fixable: 'code',
    messages: {
      missingId:
        'JSX element must have an id attribute. Autofix inserts a deterministic generated id.',
      duplicateId:
        'Duplicate static id "{{id}}" in this file (also at line {{otherLine}}). Use a unique id per element.',
    },
    schema: [],
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);

    if (!isJsxIdRuleTargetFile(filename)) {
      return {};
    }

    /** @type {Map<string, import('estree').JSXAttribute[]>} */
    const staticIds = new Map();

    return {
      JSXOpeningElement(node) {
        if (!isLintableJsxElement(node)) {
          return;
        }

        const idAttr = getIdAttribute(node);
        const staticId = getStaticIdValue(idAttr);

        if (staticId !== null && idAttr) {
          const occurrences = staticIds.get(staticId) ?? [];
          occurrences.push(idAttr);
          staticIds.set(staticId, occurrences);

          if (occurrences.length >= 2) {
            if (occurrences.length === 2) {
              context.report({
                node: occurrences[0],
                messageId: 'duplicateId',
                data: {
                  id: staticId,
                  otherLine: idAttr.loc.start.line,
                },
              });
            }
            context.report({
              node: idAttr,
              messageId: 'duplicateId',
              data: {
                id: staticId,
                otherLine: occurrences[0].loc.start.line,
              },
            });
          }
        }

        if (!hasIdAttribute(node) && shouldRequireElementId(context, node)) {
          context.report({
            node,
            messageId: 'missingId',
            fix(fixer) {
              return buildIdFix(node, filename, fixer);
            },
          });
        }
      },
    };
  },
};

export default requireElementId;