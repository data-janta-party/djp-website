import { describe, expect, it } from 'vitest';

import {
  COALESCE_SPREAD_NAMES,
  buildIdFix,
  fileSlugFromPath,
  generateElementId,
  getArrayIterationContext,
  getPropsSpreadIdentifier,
  getStaticIdValue,
  isInsideArrayIterationCallback,
  isIntrinsicElement,
  isLintableJsxElement,
  iterationItemSuffixExpression,
  pascalToKebab,
  shouldRequireElementId,
} from './jsx-element-id.mjs';

describe('pascalToKebab', () => {
  it('converts PascalCase basenames', () => {
    expect(pascalToKebab('PostsClient')).toBe('posts-client');
    expect(pascalToKebab('FilterPanel')).toBe('filter-panel');
  });
});

describe('fileSlugFromPath', () => {
  it('includes repo-relative path segments', () => {
    expect(fileSlugFromPath('components/ui/atoms/Input.tsx')).toBe(
      'components-ui-atoms-input',
    );
    expect(fileSlugFromPath('app/posts/create/loading.tsx')).toBe(
      'app-posts-create-loading',
    );
  });

  it('avoids basename-only collisions', () => {
    const settings = fileSlugFromPath('app/settings/loading.tsx');
    const posts = fileSlugFromPath('app/posts/create/loading.tsx');
    expect(settings).not.toBe(posts);
    expect(settings).toBe('app-settings-loading');
    expect(posts).toBe('app-posts-create-loading');
  });

  it('strips leading dots from path segments', () => {
    expect(fileSlugFromPath('.storybook/preview.tsx')).toBe('storybook-preview');
  });
});

describe('generateElementId', () => {
  it('embeds path slug and 1-based line/column', () => {
    expect(generateElementId('components/ui/atoms/Input.tsx', 7, 4)).toBe(
      'tpl-components-ui-atoms-input-l7-c4',
    );
  });
});

describe('isIntrinsicElement', () => {
  it('accepts lowercase DOM tags', () => {
    expect(
      isIntrinsicElement({
        name: { type: 'JSXIdentifier', name: 'div' },
        attributes: [],
      }),
    ).toBe(true);
    expect(
      isIntrinsicElement({
        name: { type: 'JSXIdentifier', name: 'svg' },
        attributes: [],
      }),
    ).toBe(true);
  });

  it('rejects PascalCase components', () => {
    expect(
      isIntrinsicElement({
        name: { type: 'JSXIdentifier', name: 'Button' },
        attributes: [],
      }),
    ).toBe(false);
  });
});

describe('getStaticIdValue', () => {
  it('reads string literals and quoted expressions', () => {
    expect(
      getStaticIdValue({
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'id' },
        value: { type: 'Literal', value: 'panel' },
      }),
    ).toBe('panel');

    expect(
      getStaticIdValue({
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'id' },
        value: {
          type: 'JSXExpressionContainer',
          expression: { type: 'Literal', value: 'quoted' },
        },
      }),
    ).toBe('quoted');
  });

  it('reads static template literals and falls back to raw', () => {
    expect(
      getStaticIdValue({
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'id' },
        value: {
          type: 'JSXExpressionContainer',
          expression: {
            type: 'TemplateLiteral',
            expressions: [],
            quasis: [{ type: 'TemplateElement', value: { cooked: 'tpl', raw: '`tpl`' } }],
          },
        },
      }),
    ).toBe('tpl');

    expect(
      getStaticIdValue({
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'id' },
        value: {
          type: 'JSXExpressionContainer',
          expression: {
            type: 'TemplateLiteral',
            expressions: [],
            quasis: [{ type: 'TemplateElement', value: { cooked: null, raw: '`raw-id`' } }],
          },
        },
      }),
    ).toBe('raw-id');
  });
});

describe('getPropsSpreadIdentifier', () => {
  const makeNode = (attributes) => ({ attributes });

  it('returns conventional props-bag names only', () => {
    expect(
      getPropsSpreadIdentifier(
        makeNode([
          { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'props' } },
        ]),
      ),
    ).toBe('props');
    expect(COALESCE_SPREAD_NAMES.has('htmlProps')).toBe(true);
    expect(
      getPropsSpreadIdentifier(
        makeNode([
          { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'htmlProps' } },
        ]),
      ),
    ).toBe('htmlProps');
  });

  it('rejects data spreads and multiple spreads', () => {
    expect(
      getPropsSpreadIdentifier(
        makeNode([
          { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'row' } },
        ]),
      ),
    ).toBeNull();
    expect(
      getPropsSpreadIdentifier(
        makeNode([
          { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'props' } },
          { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'rest' } },
        ]),
      ),
    ).toBeNull();
  });
});

describe('isInsideArrayIterationCallback', () => {
  it('detects elements inside array.map callbacks', () => {
    const opening = { type: 'JSXOpeningElement', parent: null };
    const jsxElement = { type: 'JSXElement', openingElement: opening, parent: null };
    const returnStmt = { type: 'ReturnStatement', argument: jsxElement, parent: null };
    const arrow = { type: 'ArrowFunctionExpression', body: returnStmt, parent: null };
    const call = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'map' },
      },
      arguments: [arrow],
      parent: null,
    };

    opening.parent = jsxElement;
    jsxElement.parent = returnStmt;
    returnStmt.parent = arrow;
    arrow.parent = call;

    expect(isInsideArrayIterationCallback(opening)).toBe(true);
  });

  it('detects elements inside flatMap callbacks', () => {
    const opening = { type: 'JSXOpeningElement', parent: null };
    const jsxElement = { type: 'JSXElement', openingElement: opening, parent: null };
    const arrow = { type: 'ArrowFunctionExpression', body: jsxElement, parent: null };
    const call = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'flatMap' },
      },
      arguments: [arrow],
      parent: null,
    };
    opening.parent = jsxElement;
    jsxElement.parent = arrow;
    arrow.parent = call;
    expect(isInsideArrayIterationCallback(opening)).toBe(true);
  });

  it('detects elements inside Array.from callbacks', () => {
    const opening = { type: 'JSXOpeningElement', parent: null };
    const jsxElement = { type: 'JSXElement', openingElement: opening, parent: null };
    const arrow = {
      type: 'ArrowFunctionExpression',
      params: [
        { type: 'Identifier', name: '_' },
        { type: 'Identifier', name: 'i' },
      ],
      body: jsxElement,
      parent: null,
    };
    const call = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Array' },
        property: { type: 'Identifier', name: 'from' },
      },
      arguments: [{ type: 'ObjectExpression', properties: [] }, arrow],
      parent: null,
    };
    opening.parent = jsxElement;
    jsxElement.parent = arrow;
    arrow.parent = call;
    expect(isInsideArrayIterationCallback(opening)).toBe(true);
    expect(getArrayIterationContext(opening)).toEqual({
      indexParam: 'i',
      itemParam: null,
      hasDestructuredItem: false,
    });
  });
});

describe('isLintableJsxElement', () => {
  it('includes intrinsics and custom components', () => {
    expect(
      isLintableJsxElement({
        name: { type: 'JSXIdentifier', name: 'div' },
        attributes: [],
      }),
    ).toBe(true);
    expect(
      isLintableJsxElement({
        name: { type: 'JSXIdentifier', name: 'Button' },
        attributes: [],
      }),
    ).toBe(true);
  });

  it('includes PascalCase member expressions', () => {
    expect(
      isLintableJsxElement({
        name: {
          type: 'JSXMemberExpression',
          object: { type: 'JSXIdentifier', name: 'DialogPrimitive' },
          property: { type: 'JSXIdentifier', name: 'Content' },
        },
        attributes: [],
      }),
    ).toBe(true);
    expect(
      isLintableJsxElement({
        name: {
          type: 'JSXMemberExpression',
          object: { type: 'JSXIdentifier', name: 'FooContext' },
          property: { type: 'JSXIdentifier', name: 'Provider' },
        },
        attributes: [],
      }),
    ).toBe(true);
  });
});

describe('iterationItemSuffixExpression', () => {
  it('uses id fields before stringifying', () => {
    expect(iterationItemSuffixExpression('item')).toBe(
      'item.id ?? item._id ?? String(item)',
    );
  });
});

describe('shouldRequireElementId', () => {
  const contextWithoutParserServices = {};

  it('requires ids on intrinsic elements', () => {
    expect(
      shouldRequireElementId(contextWithoutParserServices, {
        name: { type: 'JSXIdentifier', name: 'div' },
        attributes: [],
      }),
    ).toBe(true);
  });

  it('skips custom components without TypeScript parser services', () => {
    expect(
      shouldRequireElementId(contextWithoutParserServices, {
        name: { type: 'JSXIdentifier', name: 'Button' },
        attributes: [],
      }),
    ).toBe(false);
  });
});

describe('buildIdFix', () => {
  it('appends static id after attributes', () => {
    const node = {
      name: { type: 'JSXIdentifier', name: 'div' },
      attributes: [],
      loc: { start: { line: 42, column: 5 } },
    };
    const fixer = {
      insertTextAfter(target, text) {
        return { target, text };
      },
    };

    const fix = buildIdFix(node, 'components/ui/atoms/Badge.tsx', fixer);
    expect(fix.text).toBe(' id="tpl-components-ui-atoms-badge-l42-c6"');
  });

  it('coalesces only conventional props spreads', () => {
    const node = {
      name: { type: 'JSXIdentifier', name: 'input' },
      attributes: [
        { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'props' } },
      ],
      loc: { start: { line: 7, column: 3 } },
    };
    const fixer = {
      insertTextAfter(target, text) {
        return { target, text };
      },
    };

    const fix = buildIdFix(node, 'components/ui/atoms/Input.tsx', fixer);
    expect(fix.text).toBe(
      ' id={props.id ?? "tpl-components-ui-atoms-input-l7-c4"}',
    );
  });

  it('coalesces a single rest spread', () => {
    const node = {
      name: { type: 'JSXIdentifier', name: 'input' },
      attributes: [
        { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'rest' } },
      ],
      loc: { start: { line: 3, column: 1 } },
    };
    const fixer = {
      insertTextAfter(target, text) {
        return { target, text };
      },
    };

    const fix = buildIdFix(node, 'components/ui/atoms/Input.tsx', fixer);
    expect(fix.text).toBe(' id={rest.id ?? "tpl-components-ui-atoms-input-l3-c2"}');
  });

  it('skips autofix for destructured map callbacks without index', () => {
    const opening = { type: 'JSXOpeningElement', parent: null };
    const jsxElement = { type: 'JSXElement', openingElement: opening, parent: null };
    const arrow = {
      type: 'ArrowFunctionExpression',
      params: [{ type: 'ObjectPattern', properties: [] }],
      body: jsxElement,
      parent: null,
    };
    const call = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'map' },
      },
      arguments: [arrow],
      parent: null,
    };
    opening.parent = jsxElement;
    jsxElement.parent = arrow;
    arrow.parent = call;

    const node = {
      name: { type: 'JSXIdentifier', name: 'div' },
      attributes: [],
      loc: { start: { line: 5, column: 2 } },
      parent: jsxElement,
    };
    jsxElement.openingElement = node;

    const fixer = {
      insertTextAfter() {
        return null;
      },
    };

    expect(buildIdFix(node, 'components/ui/atoms/Badge.tsx', fixer)).toBeNull();
  });
});