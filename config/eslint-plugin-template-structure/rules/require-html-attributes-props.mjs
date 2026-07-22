import { toRepoRelativePath } from '../utils/path-helpers.mjs';
import {
  buildExtendsClause,
  DEFAULT_SCOPED_PREFIXES,
  interfaceExtendsHtmlAttributes,
  isComponentPropsName,
  isHtmlAttributesPropsTargetFile,
  typeAliasIncludesHtmlAttributes,
} from '../utils/html-attributes-props.mjs';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Component Props interfaces/types must extend React.HTMLAttributes (or ComponentProps) so standard DOM attributes like id are accepted.',
    },
    fixable: 'code',
    messages: {
      missingHtmlAttributes:
        '{{name}} must extend React.HTMLAttributes<{{element}}> (or React.ComponentProps). Example: interface {{name}} extends React.HTMLAttributes<{{element}}> { … }',
      partialExtendsOnly:
        '{{name}} extends a custom type but not React.HTMLAttributes. Use a type alias intersection or extend React.HTMLAttributes<{{element}}> first.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          scopedPrefixes: {
            type: 'array',
            items: { type: 'string' },
          },
          defaultElement: {
            type: 'string',
            enum: [
              'HTMLDivElement',
              'HTMLButtonElement',
              'HTMLInputElement',
              'HTMLFormElement',
              'HTMLSpanElement',
              'HTMLLabelElement',
              'HTMLAnchorElement',
              'HTMLElement',
            ],
          },
          propsSuffix: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const filename = toRepoRelativePath(context.filename);
    const options = context.options[0] ?? {};
    const scopedPrefixes = options.scopedPrefixes ?? DEFAULT_SCOPED_PREFIXES;
    const defaultElement = options.defaultElement ?? 'HTMLDivElement';
    const propsSuffix = options.propsSuffix ?? 'Props';

    if (!isHtmlAttributesPropsTargetFile(filename, scopedPrefixes)) {
      return {};
    }

    /**
     * @param {import('@typescript-eslint/types').TSESTree.TSInterfaceDeclaration} node
     */
    function checkInterface(node) {
      if (!node.id?.name || !isComponentPropsName(node.id.name, propsSuffix)) {
        return;
      }

      if (interfaceExtendsHtmlAttributes(node)) {
        return;
      }

      if (node.extends?.length) {
        context.report({
          node: node.id,
          messageId: 'partialExtendsOnly',
          data: { name: node.id.name, element: defaultElement },
        });
        return;
      }

      context.report({
        node: node.id,
        messageId: 'missingHtmlAttributes',
        data: { name: node.id.name, element: defaultElement },
        fix(fixer) {
          const insertPoint = node.id.range[1];
          return fixer.insertTextAfterRange(
            [insertPoint, insertPoint],
            ` ${buildExtendsClause(defaultElement)}`,
          );
        },
      });
    }

    /**
     * @param {import('@typescript-eslint/types').TSESTree.TSTypeAliasDeclaration} node
     */
    function checkTypeAlias(node) {
      if (
        node.id.type !== 'Identifier' ||
        !isComponentPropsName(node.id.name, propsSuffix)
      ) {
        return;
      }

      if (typeAliasIncludesHtmlAttributes(node)) {
        return;
      }

      context.report({
        node: node.id,
        messageId: 'missingHtmlAttributes',
        data: { name: node.id.name, element: defaultElement },
      });
    }

    return {
      TSInterfaceDeclaration: checkInterface,
      TSTypeAliasDeclaration: checkTypeAlias,
    };
  },
};