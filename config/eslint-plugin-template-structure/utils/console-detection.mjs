const BLOCKED_CONSOLE_METHODS = new Set(['error', 'warn', 'log', 'info', 'debug', 'trace']);

function isConsoleIdentifier(node) {
  return node?.type === 'Identifier' && node.name === 'console';
}

export function getConsoleMethodFromCallee(callee) {
  if (callee.type !== 'MemberExpression') {
    return null;
  }

  if (!isConsoleIdentifier(callee.object)) {
    return null;
  }

  const property = callee.property;

  if (!callee.computed && property.type === 'Identifier') {
    return property.name;
  }

  if (
    callee.computed &&
    property.type === 'Literal' &&
    typeof property.value === 'string'
  ) {
    return property.value;
  }

  return null;
}

export function createConsoleAliasTracker() {
  /** @type {Map<string, string>} */
  const aliases = new Map();

  return {
    aliases,
    trackVariableDeclarator(node) {
      const init = node.init;
      if (!init) {
        return;
      }

      if (isConsoleIdentifier(init) && node.id.type === 'ObjectPattern') {
        for (const property of node.id.properties) {
          if (property.type !== 'Property' || property.key.type !== 'Identifier') {
            continue;
          }

          const method = property.key.name;
          if (!BLOCKED_CONSOLE_METHODS.has(method)) {
            continue;
          }

          const aliasName =
            property.value.type === 'Identifier' ? property.value.name : method;
          aliases.set(aliasName, method);
        }
        return;
      }

      const method = getConsoleMethodFromCallee(init);
      if (method && node.id.type === 'Identifier') {
        aliases.set(node.id.name, method);
      }
    },
    getAliasedConsoleMethod(callee) {
      if (callee.type !== 'Identifier') {
        return null;
      }

      return aliases.get(callee.name) ?? null;
    },
  };
}

export function isBlockedConsoleMethod(method) {
  return BLOCKED_CONSOLE_METHODS.has(method);
}

export { BLOCKED_CONSOLE_METHODS };