import { describe, expect, it } from 'vitest';

import {
  interfaceExtendsHtmlAttributes,
  isComponentPropsName,
  isHtmlAttributesPropsTargetFile,
  typeAliasIncludesHtmlAttributes,
  typeIncludesHtmlAttributes,
} from './html-attributes-props.mjs';

describe('isHtmlAttributesPropsTargetFile', () => {
  it('targets ui components but not shadcn or tests', () => {
    expect(
      isHtmlAttributesPropsTargetFile(
        'components/ui/elements/posts/Foo.tsx',
        ['components/ui/elements/'],
      ),
    ).toBe(true);
    expect(
      isHtmlAttributesPropsTargetFile(
        'components/ui/shadcn/button.tsx',
        ['components/ui/elements/'],
      ),
    ).toBe(false);
    expect(
      isHtmlAttributesPropsTargetFile(
        'components/ui/elements/posts/Foo.test.tsx',
        ['components/ui/elements/'],
      ),
    ).toBe(false);
  });
});

describe('isComponentPropsName', () => {
  it('matches *Props suffix', () => {
    expect(isComponentPropsName('ListingCostCollapsibleSectionProps')).toBe(true);
    expect(isComponentPropsName('Props')).toBe(false);
  });
});

describe('typeIncludesHtmlAttributes', () => {
  it('detects HTMLAttributes and ComponentProps references', () => {
    expect(
      typeIncludesHtmlAttributes({
        type: 'TSTypeReference',
        typeName: {
          type: 'TSQualifiedName',
          left: { type: 'Identifier', name: 'React' },
          right: { type: 'Identifier', name: 'HTMLAttributes' },
        },
      }),
    ).toBe(true);

    expect(
      typeIncludesHtmlAttributes({
        type: 'TSIntersectionType',
        types: [
          {
            type: 'TSTypeReference',
            typeName: {
              type: 'TSQualifiedName',
              left: { type: 'Identifier', name: 'React' },
              right: { type: 'Identifier', name: 'ComponentProps' },
            },
          },
          { type: 'TSTypeLiteral', members: [] },
        ],
      }),
    ).toBe(true);
  });
});

describe('interfaceExtendsHtmlAttributes', () => {
  it('returns true when interface extends HTMLAttributes', () => {
    expect(
      interfaceExtendsHtmlAttributes({
        type: 'TSInterfaceDeclaration',
        extends: [
          {
            type: 'TSInterfaceHeritage',
            expression: {
              type: 'TSTypeReference',
              typeName: {
                type: 'TSQualifiedName',
                left: { type: 'Identifier', name: 'React' },
                right: { type: 'Identifier', name: 'HTMLAttributes' },
              },
            },
          },
        ],
      }),
    ).toBe(true);
  });
});

describe('typeAliasIncludesHtmlAttributes', () => {
  it('returns true for intersection with HTMLAttributes', () => {
    expect(
      typeAliasIncludesHtmlAttributes({
        type: 'TSTypeAliasDeclaration',
        typeAnnotation: {
          type: 'TSIntersectionType',
          types: [
            {
              type: 'TSTypeReference',
              typeName: {
                type: 'TSQualifiedName',
                left: { type: 'Identifier', name: 'React' },
                right: { type: 'Identifier', name: 'HTMLAttributes' },
              },
            },
            { type: 'TSTypeLiteral', members: [] },
          ],
        },
      }),
    ).toBe(true);
  });
});