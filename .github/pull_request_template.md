## Summary

<!-- What changed and why -->

## RFC checklist

- [ ] Files placed per [RFC 001](docs/rfc/001-file-layout-and-conventions.md)
- [ ] UI tiers per [RFC 002](docs/rfc/002-ui-layer-taxonomy.md) (atoms → elements → compositions → pages)
- [ ] Feature folders contain `pages/` only
- [ ] `@/` imports preferred (no deep `../../../`)
- [ ] Tests colocated `*.test.ts(x)`; Playwright specs only under `e2e/`
- [ ] API access via `lib/api/*` + Zod schemas (no raw `fetch('/api/...')`)
- [ ] Meaningful `id` attributes on inspectable JSX (or `useId()` in reusable primitives)
- [ ] No `console.*` in production UI/lib/actions (use `@/lib/logging`)

## Test plan

- [ ] `pnpm run lint:structure`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test:fast`
- [ ] `pnpm run knip`
- [ ] `pnpm run test:eslint-rules`
- [ ] `pnpm run verify:element-ids`
- [ ] UI changes: `CI=true pnpm run test:e2e` (or affected specs) + screenshot review

## UI layer checklist (when touching UI)

- [ ] Component tier: atom / element / composition / page
- [ ] Colocated `*.stories.tsx` and `*.test.tsx`
- [ ] No upward tier imports
- [ ] Tokens only — no arbitrary Tailwind brackets
