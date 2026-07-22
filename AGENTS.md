# Agent guide — data.janta.party website

Read this before implementing or testing UI in this repo.

## Layout rules

- All UI tiers live under `components/ui/` (atoms, elements, compositions)
- Feature folders contain `pages/` only (e.g. `components/civic-pulse/pages/`); feature page folders are **auto-discovered** by ESLint — no manual registry
- Cross-cutting elements live under `components/ui/elements/shared/`
- shadcn primitives live under `components/ui/shadcn/` (Base UI + CVA)
- Gates: `pnpm lint:structure`, `pnpm knip`, `pnpm test:eslint-rules`, `pnpm verify:element-ids`

## API contracts

- Zod schemas in `lib/schemas/api/`
- Client access via `lib/api/<feature>.ts` wrapping `lib/api/client.ts`
- Never call `fetch('/api/...')` outside `lib/api/` (ESLint: `template-structure/no-direct-api-fetch`)

## Logging

- Use `@/lib/logging` (`createJsonLogger`, `createRequestLogger`) in API routes and server code
- No bare `console.*` in production `app/`, `components/`, `lib/`, `actions/`, `hooks/` (`template-structure/no-console`)

## Element ids (grep-friendly)

- Intrinsic DOM nodes need stable `id`s (`template-structure/require-element-id`)
- Component `*Props` should extend `HTMLAttributes` / `ComponentProps` (`require-html-attributes-props`)
- Reusable primitives: prefer `id={id ?? useId()}` — never static `id={props.id ?? "tpl-…"}` (`pnpm verify:element-ids`)
- Skill: `.grok/skills/grep-friendly-html`

## UI stack

- **Base UI** (`@base-ui/react`) for shadcn primitives (not Radix Slot)
- Skills: `.agents/skills/shadcn`, `.agents/skills/migrate-radix-to-base`
- Design / Stitch pipeline: `.agents/skills/` + pin file `skills-lock.json`

## UI testing order

1. Atoms — `components/ui/atoms/`
2. Elements — `components/ui/elements/<feature>/`
3. Compositions — `components/ui/compositions/<feature>/`
4. Pages — `components/<feature>/pages/`

## Required artifacts per UI component

| Artifact | Enforced by |
|----------|-------------|
| `Component.stories.tsx` | `template-structure/require-ui-story` |
| `Component.test.tsx` | `template-structure/require-ui-unit-test` |
| E2E spec (where applicable) | PR checklist + agent skill |

Scaffold missing files: `pnpm storybook:generate`, `pnpm test:generate-ui`.

## Agent skills

| Path | Role |
|------|------|
| `AGENTS.md` | This guide |
| `.grok/skills/template-rules` | Layout/ESLint/Knip fix loop |
| `.grok/skills/template-e2e` | Playwright + screenshot review |
| `.grok/skills/grep-friendly-html` | Stable DOM ids |
| `.agents/skills/*` | shadcn + Stitch design skills (locked) |

## Pre-commit

```bash
./scripts/setup-pre-commit.sh   # once per clone (husky)
# husky runs: pnpm verify:pre-commit
```

`verify:pre-commit` = structure + lint + typecheck + test:fast + knip + eslint-rules + verify:element-ids.

## Verification before push

```bash
pnpm lint:structure && pnpm typecheck && pnpm test:fast && pnpm knip && pnpm test:eslint-rules && pnpm verify:element-ids
pnpm jscpd:ci
CLOUDFLARE_WORKER_BUILD=true pnpm build:cloudflare:ci
CI=true pnpm test:e2e
```

E2E also runs in CI (`ci.yml`); use `CI=true` locally to match the production-server profile.

## CI overview

| Path | Runs |
|------|------|
| push **`dev`** | ESLint + structure; staging **deploy** (ESLint → build → wrangler) |
| push **`main`** / PRs / CI manual | Full suite (ESLint, typecheck, tests, knip, rules, e2e, CF build, **Semgrep**, **CodeQL**) + **CI gate**; prod deploy on push `main` |
| **Nightly** / CI deep manual | jscpd (any branch via `ref` input) |

Semgrep and CodeQL are required on every PR. jscpd stays in **CI deep** (nightly/manual).

## Docs

- RFCs: `docs/rfc/001-file-layout-and-conventions.md`, `docs/rfc/002-ui-layer-taxonomy.md`
- Alignment / reverse-port: `docs/TEMPLATE_ALIGNMENT.md`
- UI unit standards: `docs/testing/ui-test-standards.md`
- E2E: `docs/testing/e2e-testing.md`
