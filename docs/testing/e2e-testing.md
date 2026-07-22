# E2E testing (Playwright)

## Projects

Configured in `config/playwright.config.ts`. The app is dark-only — projects run with `colorScheme: 'dark'`.

| Project pattern | Target | Use for |
|-----------------|--------|---------|
| `Storybook · Desktop Chrome` | Storybook `:6006` | Atoms, elements (isolated stories) |
| `Desktop Chrome` | App `:3001` | Compositions, pages |

## Commands

```bash
# Full suite (CI uses production next start when CI=true)
CI=true pnpm test:e2e

# Single Storybook atom
pnpm test:e2e -- e2e/ui/atoms/button.spec.ts --project "Storybook · Desktop Chrome"

# Single app composition
pnpm test:e2e -- e2e/ui/pages/civic-pulse-home.spec.ts --project "Desktop Chrome"

pnpm test:e2e:report
```

Helpers live under `e2e/ui/_helpers/` (`storybook.ts`, `app.ts`). Import the shared test harness from `e2e/test.ts`.

## Layout of specs

```
e2e/
  test.ts
  ui/
    _helpers/
    atoms/           # Storybook iframe specs
    compositions/    # App route specs
    pages/           # Optional page specs
```

`*.spec.ts` files **must** live under `e2e/` (`template-structure/no-spec-outside-e2e`).

## Screenshot review (after UI E2E)

1. Find PNGs:

```bash
find test-results -name "*.png" -type f | sort -r | head -30
```

2. Minimum review set for this template:

| Project | Why |
|---------|-----|
| `Storybook · Desktop Chrome` | Desktop atom baseline |
| `Desktop Chrome` | Full-page composition |

3. Checklist: readable contrast on dark surfaces, glass/tokens match design, nothing clipped, alignment, intentional interactive states.

See also `.grok/skills/template-e2e/SKILL.md`.
