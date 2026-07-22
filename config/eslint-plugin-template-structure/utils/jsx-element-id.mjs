import ts from 'typescript';

/** Aligned with `no-arbitrary-tailwind` plus jsx-specific suffixes. */
export const EXCLUDED_SUFFIXES = [
  '.test.tsx',
  '.test.ts',
  '.test.jsx',
  '.stories.tsx',
  '.stories.jsx',
];

/** Spread identifiers treated as conventional DOM-prop bags for id coalesce. */
export const COALESCE_SPREAD_NAMES = new Set([
  'props',
  'rest',
  'attributes',
  'htmlProps',
  'otherProps',
  'componentProps',
  'childProps',
  'domProps',
  'nativeProps',
  'delegatedProps',
  'forwardedProps',
]);

/**
 * @param {string} name
 * @returns {string}
 */
export function pascalToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * @param {string} filename Repo-relative path.
 * @returns {boolean}
 */
export function isJsxIdRuleTargetFile(filename) {
  if (!filename.endsWith('.tsx') && !filename.endsWith('.jsx')) {
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

/**
 * Repo-relative path slug for globally unique generated ids.
 * `app/posts/create/loading.tsx` → `app-posts-create-loading`
 *
 * @param {string} filename Repo-relative path.
 * @returns {string}
 */
export function fileSlugFromPath(filename) {
  const withoutExt = filename.replace(/\.(tsx|jsx)$/, '');
  return withoutExt
    .split('/')
    .map((segment) => pascalToKebab(segment.replace(/^\.+|\.+$/g, '')))
    .filter((segment) => segment.length > 0)
    .join('-');
}

/**
 * @param {string} filename Repo-relative path.
 * @param {number} line 1-based line number.
 * @param {number} column 1-based column number.
 * @returns {string}
 */
export function generateElementId(filename, line, column) {
  return `tpl-${fileSlugFromPath(filename)}-l${line}-c${column}`;
}

/**
 * Intrinsic DOM elements use a lowercase JSXIdentifier (`div`, `svg`, `path`).
 *
 * @param {import('estree').JSXOpeningElement} node
 * @returns {boolean}
 */
export function isIntrinsicElement(node) {
  if (node.name.type !== 'JSXIdentifier') {
    return false;
  }
  const { name } = node.name;
  return name.length > 0 && name[0] === name[0].toLowerCase();
}

/**
 * Any renderable JSX opening tag (intrinsic or custom component).
 * Skips only fragments.
 *
 * @param {import('estree').JSXOpeningElement} node
 * @returns {boolean}
 */
export function isLintableJsxElement(node) {
  if (isFragmentElement(node)) {
    return false;
  }
  if (node.name.type === 'JSXIdentifier') {
    return true;
  }
  if (node.name.type === 'JSXMemberExpression') {
    return node.name.property.type === 'JSXIdentifier';
  }
  return false;
}

/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Type | undefined} type
 * @returns {boolean}
 */
function typeAcceptsIdProp(checker, type) {
  if (!type) {
    return false;
  }

  if (type.flags & ts.TypeFlags.Any) {
    return true;
  }

  if (type.getProperty('id')) {
    return true;
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((member) => typeAcceptsIdProp(checker, member));
  }

  return false;
}

/**
 * True when TypeScript confirms a custom JSX tag accepts an `id` prop.
 * Without parser services, returns false so autofix never inserts invalid props.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').JSXOpeningElement} openingElement
 * @returns {boolean}
 */
export function jsxComponentAcceptsIdProp(context, openingElement) {
  const parserServices =
    context.sourceCode?.parserServices ?? context.parserServices;
  if (!parserServices?.program || !parserServices.esTreeNodeToTSNodeMap) {
    return false;
  }

  try {
    const checker = parserServices.program.getTypeChecker();
    const tsOpening = parserServices.esTreeNodeToTSNodeMap.get(openingElement);
    if (!tsOpening) {
      return false;
    }

    const attributesType = checker.getContextualType(tsOpening);
    if (attributesType && typeAcceptsIdProp(checker, attributesType)) {
      return true;
    }

    const tagTs = parserServices.esTreeNodeToTSNodeMap.get(openingElement.name);
    if (!tagTs) {
      return false;
    }

    const symbol = checker.getSymbolAtLocation(tagTs);
    if (!symbol) {
      return false;
    }

    const componentType = checker.getTypeOfSymbolAtLocation(symbol, tagTs);
    const callSignatures = componentType.getCallSignatures();
    if (callSignatures.length > 0) {
      const [firstParam] = callSignatures[0].getParameters();
      if (firstParam) {
        const propsType = checker.getTypeOfSymbolAtLocation(
          firstParam,
          firstParam.valueDeclaration ?? tagTs,
        );
        if (typeAcceptsIdProp(checker, propsType)) {
          return true;
        }
      }
    }

    return typeAcceptsIdProp(checker, componentType);
  } catch {
    return false;
  }
}

/**
 * Intrinsic DOM elements always require ids. Custom components require ids only
 * when their props type includes `id` (TypeScript-aware when parser services exist).
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').JSXOpeningElement} openingElement
 * @returns {boolean}
 */
export function shouldRequireElementId(context, openingElement) {
  if (!isLintableJsxElement(openingElement)) {
    return false;
  }
  if (isIntrinsicElement(openingElement)) {
    return true;
  }
  return jsxComponentAcceptsIdProp(context, openingElement);
}

/**
 * @param {import('estree').JSXOpeningElement} node
 * @returns {boolean}
 */
export function isFragmentElement(node) {
  if (node.name.type === 'JSXIdentifier' && node.name.name === 'Fragment') {
    return true;
  }
  if (node.name.type === 'JSXMemberExpression') {
    return (
      node.name.property.type === 'JSXIdentifier' &&
      node.name.property.name === 'Fragment'
    );
  }
  return false;
}

/** Array iteration methods whose callback bodies must not receive static generated ids. */
export const ARRAY_ITERATION_METHODS = new Set(['map', 'flatMap']);

/**
 * True when the opening element sits inside an array iteration callback
 * (`.map()`, `.flatMap()`, or `Array.from(…, fn)`).
 * Static generated ids would collide at runtime for every iteration.
 *
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
export function isInsideArrayIterationCallback(node) {
  let current = node.parent;
  while (current) {
    if (
      (current.type === 'ArrowFunctionExpression' ||
        current.type === 'FunctionExpression') &&
      current.parent?.type === 'CallExpression'
    ) {
      const call = current.parent;
      const { callee } = call;

      if (
        (callee.type === 'MemberExpression' ||
          callee.type === 'OptionalMemberExpression') &&
        callee.property.type === 'Identifier' &&
        ARRAY_ITERATION_METHODS.has(callee.property.name)
      ) {
        return true;
      }

      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'Array' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'from' &&
        call.arguments[1] === current
      ) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/**
 * @param {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression} fn
 * @returns {{ indexParam: string | null, itemParam: string | null, hasDestructuredItem: boolean }}
 */
function getIterationCallbackParams(fn) {
  const first = fn.params[0];
  const second = fn.params[1];

  const indexParam = second?.type === 'Identifier' ? second.name : null;

  let itemParam = null;
  let hasDestructuredItem = false;

  if (first?.type === 'Identifier') {
    itemParam = first.name === '_' && indexParam ? null : first.name;
  } else if (
    first?.type === 'ObjectPattern' ||
    first?.type === 'ArrayPattern' ||
    first?.type === 'RestElement' ||
    first?.type === 'AssignmentPattern'
  ) {
    hasDestructuredItem = true;
  }

  return { indexParam, itemParam, hasDestructuredItem };
}

/**
 * @param {import('estree').Node} node
 * @returns {{ indexParam: string | null, itemParam: string | null, hasDestructuredItem: boolean } | null}
 */
export function getArrayIterationContext(node) {
  let current = node.parent;
  while (current) {
    if (
      (current.type === 'ArrowFunctionExpression' ||
        current.type === 'FunctionExpression') &&
      current.parent?.type === 'CallExpression'
    ) {
      const call = current.parent;
      const { callee } = call;
      const isIteration =
        ((callee.type === 'MemberExpression' ||
          callee.type === 'OptionalMemberExpression') &&
          callee.property.type === 'Identifier' &&
          ARRAY_ITERATION_METHODS.has(callee.property.name)) ||
        (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Array' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'from' &&
          call.arguments[1] === current);

      if (isIteration) {
        return getIterationCallbackParams(current);
      }
    }
    current = current.parent;
  }
  return null;
}

/**
 * @param {import('estree').Node} node
 * @returns {string | null}
 */
export function getArrayIterationIndexParam(node) {
  return getArrayIterationContext(node)?.indexParam ?? null;
}

/**
 * Safe template suffix for a single identifier iteration param (avoids [object Object]).
 *
 * @param {string} itemParam
 * @returns {string}
 */
export function iterationItemSuffixExpression(itemParam) {
  return `${itemParam}.id ?? ${itemParam}._id ?? String(${itemParam})`;
}

/**
 * @param {import('estree').JSXOpeningElement} node
 * @returns {import('estree').JSXAttribute | undefined}
 */
export function getIdAttribute(node) {
  return node.attributes.find(
    (attr) =>
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === 'id',
  );
}

/**
 * @param {import('estree').JSXOpeningElement} node
 * @returns {boolean}
 */
export function hasIdAttribute(node) {
  return getIdAttribute(node) !== undefined;
}

/**
 * @param {import('estree').TemplateElement} quasi
 * @returns {string | null}
 */
function templateQuasiValue(quasi) {
  if (quasi.value.cooked !== null) {
    return quasi.value.cooked;
  }
  return quasi.value.raw.replace(/^`|`$/g, '').replace(/\\`/g, '`');
}

/**
 * Returns a static string id value when the attribute is a string literal,
 * quoted literal expression, or template literal without interpolations.
 *
 * @param {import('estree').JSXAttribute | undefined} idAttr
 * @returns {string | null}
 */
export function getStaticIdValue(idAttr) {
  if (!idAttr?.value) return null;

  if (idAttr.value.type === 'Literal' && typeof idAttr.value.value === 'string') {
    return idAttr.value.value;
  }

  if (idAttr.value.type === 'JSXExpressionContainer') {
    const { expression } = idAttr.value;
    if (
      expression.type === 'Literal' &&
      typeof expression.value === 'string'
    ) {
      return expression.value;
    }
    if (
      expression.type === 'TemplateLiteral' &&
      expression.expressions.length === 0 &&
      expression.quasis.length === 1
    ) {
      return templateQuasiValue(expression.quasis[0]);
    }
  }

  return null;
}

/**
 * When exactly one `{...identifier}` spread uses a conventional props-bag name,
 * returns that identifier for id coalesce.
 *
 * @param {import('estree').JSXOpeningElement} node
 * @returns {string | null}
 */
export function getPropsSpreadIdentifier(node) {
  const spreads = node.attributes.filter(
    (attr) => attr.type === 'JSXSpreadAttribute',
  );
  if (spreads.length !== 1) return null;

  const { argument } = spreads[0];
  if (argument.type !== 'Identifier') return null;
  if (!COALESCE_SPREAD_NAMES.has(argument.name)) return null;
  return argument.name;
}

/**
 * @param {import('estree').JSXOpeningElement} node
 * @param {string} filename Repo-relative path.
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @returns {import('eslint').Rule.Fix}
 */
export function buildIdFix(node, filename, fixer) {
  const line = node.loc.start.line;
  const column = node.loc.start.column + 1;
  const baseId = generateElementId(filename, line, column);
  const spreadId = getPropsSpreadIdentifier(node);
  const iteration = getArrayIterationContext(node);

  let idAttrText;
  if (spreadId) {
    idAttrText = ` id={${spreadId}.id ?? "${baseId}"}`;
  } else if (iteration?.indexParam) {
    idAttrText = ` id={\`${baseId}-\${${iteration.indexParam}}\`}`;
  } else if (iteration?.itemParam) {
    idAttrText = ` id={\`${baseId}-\${${iterationItemSuffixExpression(iteration.itemParam)}}\`}`;
  } else if (iteration?.hasDestructuredItem) {
    return null;
  } else {
    idAttrText = ` id="${baseId}"`;
  }

  const lastAttr = node.attributes[node.attributes.length - 1];
  if (lastAttr) {
    return fixer.insertTextAfter(lastAttr, idAttrText);
  }

  return fixer.insertTextAfter(node.name, idAttrText);
}