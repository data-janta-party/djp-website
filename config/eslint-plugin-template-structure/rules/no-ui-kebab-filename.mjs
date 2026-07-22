import {
  toRepoRelativePath,
  UI_KEBAB_CASE_ALLOWLIST,
} from '../utils/path-helpers.mjs';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Atom and element files under components/ui/ should use PascalCase filenames (RFC §5.7). ' +
        'Intentionally excluded: components/ui/shadcn/ (upstream kebab-case primitives) and ' +
        'components/ui/compositions/ (enforced separately via require-ui-story).',
    },
    messages: {
      kebabCase:
        'File "{{basename}}" in components/ui/ uses kebab-case. Rename to PascalCase or add to the legacy allowlist intentionally.',
    },
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    if (
      !filename.startsWith('components/ui/atoms/') &&
      !filename.startsWith('components/ui/elements/')
    ) {
      return {};
    }

    const relative = filename.slice('components/ui/'.length);
    const basename = relative.includes('/')
      ? relative.slice(relative.lastIndexOf('/') + 1)
      : relative;
    if (!basename.endsWith('.ts') && !basename.endsWith('.tsx')) return {};
    if (!basename.includes('-')) return {};
    if (UI_KEBAB_CASE_ALLOWLIST.has(basename)) return {};

    context.report({
      loc: { line: 1, column: 0 },
      messageId: 'kebabCase',
      data: { basename },
    });

    return {};
  },
};