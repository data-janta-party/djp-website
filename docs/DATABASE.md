# Database (D1 + Drizzle)

This project uses [Cloudflare D1](https://developers.cloudflare.com/d1/) with [Drizzle ORM](https://orm.drizzle.team/) for type-safe SQL access in Workers.

## Layout

| Path | Purpose |
|------|---------|
| `lib/db/schema.ts` | Drizzle table definitions |
| `lib/db/index.ts` | `getDb()` / `getDbAsync()` factories |
| `drizzle/migrations/` | SQL migrations applied by Wrangler |
| `drizzle.config.ts` | Drizzle Kit config |
| `wrangler.jsonc` | D1 binding (`DB`) |

## Binding

`wrangler.jsonc` declares a D1 database bound as `DB`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nextjs-shadcn-cf-template-db",
    "database_id": "00000000-0000-0000-0000-000000000001",
    "migrations_dir": "drizzle/migrations"
  }
]
```

Staging and production use separate D1 `database_id` values in `wrangler.jsonc` (provisioned by infra). Do not invent IDs — use the values from the Cloudflare account / Terragrunt outputs.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars` for Wrangler local preview.
2. Apply migrations to the local D1 database:

```bash
pnpm db:migrate:local
```

3. Start local Workers preview:

```bash
pnpm preview:cloudflare:local
```

`getDb()` uses `getCloudflareContext()` from `@opennextjs/cloudflare` and must be called per request (see `lib/db/index.ts`). Do not create a global Drizzle client.

## Schema changes

1. Edit `lib/db/schema.ts`.
2. Generate SQL:

```bash
pnpm db:generate
```

3. Apply locally:

```bash
pnpm db:migrate:local
```

4. Apply to remote D1 when ready:

```bash
# Staging / default Worker
pnpm db:migrate:remote

# Production Worker (separate D1 database_id in wrangler.jsonc)
pnpm db:migrate:remote:production
```

## Tables

| Table | Purpose |
|-------|---------|
| `volunteers` | Volunteer applications from the public form (`name`, `email`, `phone?`, `city`, `interest`, `created_at`) |

Volunteer rows are written by the `submitVolunteerApplication` server action (`actions/volunteer.ts`). Apply migrations before relying on the form in Workers preview/production.

## Example usage

Volunteer form writes go through the server action (`actions/volunteer.ts`) using `getDb()`:

```ts
import { getDb, volunteers } from '@/lib/db';

const db = getDb();
await db.insert(volunteers).values({ /* ... */ });
```


## Static routes (ISR/SSG)

For static generation, use the async factory:

```ts
import { getDbAsync } from '@/lib/db';

const db = await getDbAsync();
```