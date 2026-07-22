import {
  getUiLayerFromImporter,
  getUiLayerFromImportSource,
  isPageTierImport,
  toRepoRelativePath,
} from '../utils/path-helpers.mjs';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'UI tier imports must flow downward: atoms → elements → compositions → pages (RFC 002).',
    },
    messages: {
      upwardImport:
        '{{importerLayer}} file must not import from {{importedLayer}} ({{source}}).',
      pageImportsPage:
        'Page shells must not import other page shells ({{source}}). Use components/ui/ instead.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    const importerLayer = getUiLayerFromImporter(filename);
    if (!importerLayer) return {};

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        if (importerLayer === 'page' && isPageTierImport(source)) {
          context.report({
            node: node.source,
            messageId: 'pageImportsPage',
            data: { source },
          });
          return;
        }

        const importedLayer = getUiLayerFromImportSource(source);
        if (!importedLayer) return;

        const rank = {
          atom: 0,
          element: 1,
          composition: 2,
          page: 3,
        };

        if (rank[importedLayer] > rank[importerLayer]) {
          context.report({
            node: node.source,
            messageId: 'upwardImport',
            data: {
              importerLayer,
              importedLayer,
              source,
            },
          });
        }
      },
    };
  },
};