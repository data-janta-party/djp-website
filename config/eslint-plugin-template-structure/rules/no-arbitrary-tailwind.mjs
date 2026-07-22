import { toRepoRelativePath } from '../utils/path-helpers.mjs';
import {
  findArbitraryUtilities,
  findRawTypography,
  scanClassNameValue,
} from '../utils/tailwind-class-scanner.mjs';

const DEFAULT_SCOPED_PREFIXES = [
  'components/ui/',
  'components/',
  'app/',
];

const EXCLUDED_SUFFIXES = ['.test.tsx', '.test.ts', '.stories.tsx'];

/**
 * Utility prefixes allowed to use arbitrary bracket syntax.
 * Layout/positioning and shadows are exempt; colors, type, radii, borders are not.
 */
const DEFAULT_ALLOWED_ARBITRARY_PREFIXES = new Set([
  'shadow',
  'drop-shadow',
  'tracking',
  'leading',
  'top',
  'left',
  'right',
  'bottom',
  'inset',
  'z',
  'translate',
  'scale',
  'rotate',
  'skew',
  'origin',
  'stroke',
  'fill',
  'grid-cols',
  'grid-rows',
  'col-span',
  'row-span',
  'aspect',
  'order',
  'basis',
  'grow',
  'shrink',
  'w',
  'h',
  'min-w',
  'max-w',
  'min-h',
  'max-h',
  'size',
  'gap',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'backdrop-blur',
  'transition',
  'ease',
  'animate',
  'translate-x',
  'translate-y',
  'rounded-t',
  'rounded-b',
  'rounded-l',
  'rounded-r',
  // tw-animate-css dialog/sheet entrance utilities (library-internal percentages)
  'slide-in-from-top',
  'slide-out-to-top',
  'slide-in-from-left',
  'slide-out-to-left',
  'slide-in-from-right',
  'slide-out-to-right',
  'slide-in-from-bottom',
  'slide-out-to-bottom',
]);

function isScopedFile(filename, scopedPrefixes) {
  if (!scopedPrefixes.some((prefix) => filename.startsWith(prefix))) {
    return false;
  }
  if (EXCLUDED_SUFFIXES.some((suffix) => filename.endsWith(suffix))) {
    return false;
  }
  if (filename.startsWith('e2e/')) {
    return false;
  }
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary Tailwind bracket values and raw typography scale in UI code. Use tokens from app/theme/tokens.css via @theme utilities.',
    },
    messages: {
      arbitrary:
        'Avoid arbitrary Tailwind "{{full}}". Extend app/theme/tokens.css + @theme in globals.css, or use an atom component.',
      rawTypography:
        'Avoid typography "{{token}}". Use the design scale: text-sm, text-md, text-lg, text-xl, text-2xl, text-3xl, text-4xl, text-5xl.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          scopedPrefixes: {
            type: 'array',
            items: { type: 'string' },
          },
          allowedArbitraryPrefixes: {
            type: 'array',
            items: { type: 'string' },
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
    const allowedArbitraryPrefixes = new Set(
      options.allowedArbitraryPrefixes ??
        [...DEFAULT_ALLOWED_ARBITRARY_PREFIXES],
    );

    if (!isScopedFile(filename, scopedPrefixes)) {
      return {};
    }

    function reportClasses(node, classString) {
      for (const { utility, value } of findArbitraryUtilities(classString)) {
        if (allowedArbitraryPrefixes.has(utility)) continue;
        if (value === 'inherit') continue;

        context.report({
          node,
          messageId: 'arbitrary',
          data: { full: `${utility}-[…]` },
        });
      }

      for (const token of findRawTypography(classString)) {
        context.report({
          node,
          messageId: 'rawTypography',
          data: { token },
        });
      }
    }

    function checkClassAttribute(node) {
      if (!node.value) return;

      if (node.value.type === 'Literal') {
        reportClasses(node.value, node.value.value);
        return;
      }

      if (node.value.type === 'JSXExpressionContainer') {
        scanClassNameValue(context, node.value.expression, (classString) =>
          reportClasses(node.value.expression, classString),
        );
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name === 'className' || node.name.name === 'classNames') {
          checkClassAttribute(node);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'cva'
        ) {
          return;
        }

        for (const arg of node.arguments) {
          scanClassNameValue(context, arg, (classString) =>
            reportClasses(arg, classString),
          );
        }
      },
    };
  },
};