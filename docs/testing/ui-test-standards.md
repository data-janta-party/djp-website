# UI test standards

Applies to `components/ui/` and `components/<feature>/pages/`.

## Tier contracts

| Tier | Unit test | E2E |
|------|-----------|-----|
| Atom | Render, a11y, interaction, disabled | Storybook iframe |
| Element | Props → UI, user events | Storybook iframe |
| Composition | Mocked data/hooks, primary action | App route |
| Page | Mocked child composition | App route |

## File naming

| Kind | Pattern | Location |
|------|---------|----------|
| Unit | `Component.test.tsx` | Colocated |
| Story | `Component.stories.tsx` | Colocated |
| E2E | `component-name.spec.ts` | `e2e/ui/{atoms,elements,compositions}/` |

## Shared utilities

- `e2e/ui/_helpers/storybook.ts` — Storybook iframe helpers (`storyUrl`, `gotoStory`, screenshots)
- `e2e/ui/_helpers/app.ts` — App route navigation helpers

## CI gates

| Command | Purpose |
|---------|---------|
| `pnpm lint:structure` | Layout + story + unit-test rules |
| `pnpm test:fast` | Unit tests |
| `pnpm test:eslint-rules` | ESLint rule tests |
| `pnpm knip` | Dead code |