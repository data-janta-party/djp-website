/** @typedef {'HTMLDivElement' | 'HTMLButtonElement' | 'HTMLInputElement' | 'HTMLFormElement' | 'HTMLSpanElement' | 'HTMLLabelElement' | 'HTMLAnchorElement' | 'HTMLElement'} HtmlElementType */

export const DEFAULT_SCOPED_PREFIXES = [
  'components/ui/elements/',
  'components/ui/compositions/',
  'components/ui/atoms/',
  'components/',
];

export const EXCLUDED_SUFFIXES = [
  '.test.tsx',
  '.test.ts',
  '.stories.tsx',
  '.stories.jsx',
];

const HTML_ATTRIBUTES_IDENTIFIERS = new Set([
  'HTMLAttributes',
  'ComponentProps',
  'ComponentPropsWithoutRef',
  'ButtonHTMLAttributes',
  'InputHTMLAttributes',
  'AnchorHTMLAttributes',
  'LabelHTMLAttributes',
  'TextareaHTMLAttributes',
  'SelectHTMLAttributes',
  'OlHTMLAttributes',
  'LiHTMLAttributes',
  'ImgHTMLAttributes',
  'SVGAttributes',
]);

/**
 * @param {string} filename
 * @param {string[]} scopedPrefixes
 * @returns {boolean}
 */
export function isHtmlAttributesPropsTargetFile(filename, scopedPrefixes) {
  if (!filename.endsWith('.tsx')) {
    return false;
  }
  if (EXCLUDED_SUFFIXES.some((suffix) => filename.endsWith(suffix))) {
    return false;
  }
  if (filename.startsWith('components/ui/shadcn/')) {
    return false;
  }
  if (!scopedPrefixes.some((prefix) => filename.startsWith(prefix))) {
    return false;
  }
  return true;
}

/**
 * @param {import('@typescript-eslint/types').TSESTree.Node | null | undefined} node
 * @returns {string | null}
 */
function getTypeReferenceName(node) {
  if (!node) return null;

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'MemberExpression' && !node.computed) {
    if (node.property.type === 'Identifier') {
      return node.property.name;
    }
    return null;
  }

  if (node.type === 'TSQualifiedName') {
    return node.right.name;
  }

  return null;
}

/**
 * @param {import('@typescript-eslint/types').TSESTree.TypeNode} node
 * @returns {boolean}
 */
export function typeIncludesHtmlAttributes(node) {
  if (!node) return false;

  if (node.type === 'MemberExpression' && !node.computed) {
    const name = getTypeReferenceName(node);
    return name !== null && HTML_ATTRIBUTES_IDENTIFIERS.has(name);
  }

  if (node.type === 'TSTypeReference') {
    const name = getTypeReferenceName(node.typeName);
    const omitArg = node.typeArguments?.params?.[0];
    if (name === 'Omit' && omitArg) {
      return typeIncludesHtmlAttributes(omitArg);
    }
    return name !== null && HTML_ATTRIBUTES_IDENTIFIERS.has(name);
  }

  if (node.type === 'TSIntersectionType') {
    return node.types.some((type) => typeIncludesHtmlAttributes(type));
  }

  if (node.type === 'TSParenthesizedType') {
    return typeIncludesHtmlAttributes(node.typeAnnotation);
  }

  return false;
}

/**
 * @param {import('@typescript-eslint/types').TSESTree.TSInterfaceDeclaration} node
 * @returns {boolean}
 */
export function interfaceExtendsHtmlAttributes(node) {
  if (!node.extends?.length) {
    return false;
  }
  return node.extends.some((heritage) =>
    typeIncludesHtmlAttributes(heritage.expression),
  );
}

/**
 * @param {import('@typescript-eslint/types').TSESTree.TSTypeAliasDeclaration} node
 * @returns {boolean}
 */
export function typeAliasIncludesHtmlAttributes(node) {
  return typeIncludesHtmlAttributes(node.typeAnnotation);
}

/**
 * @param {string} propsName
 * @param {string} suffix
 * @returns {boolean}
 */
export function isComponentPropsName(propsName, suffix = 'Props') {
  return propsName.endsWith(suffix) && propsName.length > suffix.length;
}

/**
 * @param {HtmlElementType} elementType
 * @returns {string}
 */
export function buildExtendsClause(elementType) {
  return `extends React.HTMLAttributes<${elementType}>`;
}