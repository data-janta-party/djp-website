/**
 * Extract Tailwind class strings from JSX/TS AST nodes (className, cn(), clsx()).
 */

const CLASS_MERGE_CALLEES = new Set(['cn', 'clsx', 'classnames', 'twMerge']);

/**
 * Parse a single class token, ignoring variant chains (hover:, data-[x]:, etc.).
 * @param {string} token
 * @returns {{ utility: string, value: string } | null}
 */
export function parseArbitraryUtility(token) {
  const trimmed = token.replace(/^!+/, '').trim();
  if (!trimmed) return null;

  const lastColon = trimmed.lastIndexOf(':');
  const utilityPart = lastColon >= 0 ? trimmed.slice(lastColon + 1) : trimmed;

  const match = /^([a-z][\w-]*)-\[([^\]]+)\]$/.exec(utilityPart);
  if (!match) return null;

  return { utility: match[1], value: match[2] };
}

/** @param {string} classString */
export function findArbitraryUtilities(classString) {
  const matches = [];
  const tokens = classString.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const parsed = parseArbitraryUtility(token);
    if (parsed) {
      matches.push({
        utility: parsed.utility,
        value: parsed.value,
        full: `${parsed.utility}-[${parsed.value}]`,
      });
    }
  }

  return matches;
}

/** @type {Set<string>} */
export const ALLOWED_TYPOGRAPHY = new Set([
  'text-sm',
  'text-md',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',
]);

const TYPOGRAPHY_TOKEN =
  /(?:^|\s)(text-(?:xs|sm|base|md|lg|xl|2xl|3xl|4xl|5xl|6xl|body(?:-[\w]+)?|caption|micro|nano|overline|heading(?:-[\w]+)?|display(?:-[\w]+)?))(?=\s|$|[\]"])/g;

/** @param {string} classString */
export function findForbiddenTypography(classString) {
  const matches = [];
  let match = TYPOGRAPHY_TOKEN.exec(classString);
  while (match) {
    const token = match[1];
    if (!ALLOWED_TYPOGRAPHY.has(token)) {
      matches.push(token);
    }
    match = TYPOGRAPHY_TOKEN.exec(classString);
  }
  return matches;
}

/** @deprecated Use findForbiddenTypography */
export function findRawTypography(classString) {
  return findForbiddenTypography(classString);
}

/**
 * @param {import('estree').Node | null | undefined} node
 * @returns {string[]}
 */
export function extractClassStrings(node) {
  if (!node) return [];

  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? [node.value] : [];
    case 'TemplateLiteral': {
      const parts = [];
      for (const quasi of node.quasis) {
        const cooked = quasi.value.cooked ?? '';
        if (cooked) parts.push(cooked);
      }
      return parts;
    }
    case 'ArrayExpression':
      return node.elements.flatMap((el) => extractClassStrings(el));
    case 'ObjectExpression':
      return node.properties.flatMap((prop) => {
        if (prop.type !== 'Property') return [];
        return [
          ...extractClassStrings(prop.key),
          ...extractClassStrings(prop.value),
        ];
      });
    case 'ConditionalExpression':
      return [
        ...extractClassStrings(node.consequent),
        ...extractClassStrings(node.alternate),
      ];
    case 'LogicalExpression':
      return [
        ...extractClassStrings(node.left),
        ...extractClassStrings(node.right),
      ];
    case 'CallExpression': {
      if (
        node.callee.type === 'Identifier' &&
        CLASS_MERGE_CALLEES.has(node.callee.name)
      ) {
        return node.arguments.flatMap((arg) => extractClassStrings(arg));
      }
      return [];
    }
    default:
      return [];
  }
}

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 */
export function scanClassNameValue(context, node, onMatch) {
  for (const classString of extractClassStrings(node)) {
    onMatch(classString);
  }
}