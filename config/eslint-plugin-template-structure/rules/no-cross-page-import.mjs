import {
  isPageTierImport,
  toRepoRelativePath,
} from '../utils/path-helpers.mjs';

const PAGE_FILE_PATTERN = /^components\/([^/]+)\/pages\//;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Page shells must not import other page shells. Routes compose a single page component per feature.',
    },
    messages: {
      crossPage:
        'Page file must not import another page ("{{source}}"). Compose shared UI from components/ui/ instead.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (!PAGE_FILE_PATTERN.test(filename)) return {};

    function checkSource(node, source) {
      if (typeof source !== 'string') return;
      if (!isPageTierImport(source)) return;

      context.report({
        node,
        messageId: 'crossPage',
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
        if (node.source) checkSource(node, node.source.value);
      },
    };
  },
};