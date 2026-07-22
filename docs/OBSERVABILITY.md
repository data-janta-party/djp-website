# Observability

This template emits **structured JSON logs** from API routes and Workers, designed for ingestion by Cloudflare observability tooling and downstream analytics stacks.

## Log format

Each log line is a single JSON object written to stdout (debug/info) or stderr (warn/error):

```json
{
  "level": "info",
  "message": "request completed",
  "timestamp": "2026-06-25T12:00:00.000Z",
  "service": "nextjs-shadcn-cloudflare-template",
  "requestId": "req-abc123",
  "kind": "api-route",
  "route": "/api/example",
  "method": "GET",
  "path": "/api/example",
  "statusCode": 200,
  "database": "connected"
}
```

| Field | Description |
|-------|-------------|
| `level` | `debug`, `info`, `warn`, or `error` |
| `message` | Human-readable event name |
| `timestamp` | ISO-8601 UTC timestamp |
| `service` | Service name (`LOG_SERVICE`, `SERVICE_NAME`, or template default) |
| `requestId` | Correlation ID when available |
| *(context)* | Arbitrary structured fields merged into the log object |

Reserved keys (`level`, `message`, `timestamp`, `service`, `requestId`) cannot be overwritten by caller context. Context values must be JSON-serializable; non-serializable values trigger a safe fallback log line instead of throwing.

## Logging helpers

Use the helpers in `lib/logging/` — **never** `console.*` directly in `app/api/` routes (enforced by ESLint).

| Helper | Use when |
|--------|----------|
| `createJsonLogger()` | Generic structured logging |
| `createRequestLogger(request)` | Request-scoped logs with method/path metadata |
| `createApiRouteLogger(request)` | API route handlers (adds `kind: "api-route"`) |

Example (`app/api/example/route.ts`):

```ts
import { createApiRouteLogger } from '@/lib/logging';

export async function GET(request: NextRequest) {
  const logger = createApiRouteLogger(request, { route: '/api/example' });
  logger.info('request started');
  // ...
  logger.info('request completed', { statusCode: 200 });
}
```

Child loggers preserve context:

```ts
logger.child({ component: 'db' }).debug('query complete', { rows: 1 });
```

## Request / correlation IDs

`createRequestLogger` and `createApiRouteLogger` resolve `requestId` in this order:

1. `x-request-id` request header (client or edge-provided)
2. `cf-ray` (Cloudflare edge request ID)
3. `crypto.randomUUID()` fallback

Propagate `x-request-id` from clients or upstream proxies so logs, traces, and support tickets share a single correlation key.

## Cloudflare pipeline

```
Workers (JSON stdout/stderr)
  → Cloudflare Observability (wrangler.jsonc: observability.enabled)
  → Logpush (account-level export)
  → Loki (log storage / query)
  → Grafana (dashboards & alerts)
```

### Workers observability

`wrangler.jsonc` enables Workers observability:

```jsonc
"observability": {
  "enabled": true
}
```

Structured JSON on stdout/stderr is preserved in Workers logs and is straightforward to parse in Logpush destinations.

### Logpush → Loki → Grafana

1. Configure [Cloudflare Logpush](https://developers.cloudflare.com/logs/logpush/) for Workers logs to your Loki HTTP endpoint (or via a forwarding service).
2. In Grafana, add Loki as a data source and query on JSON fields, e.g. `{service="nextjs-shadcn-cloudflare-template"} | json | level="error"`.
3. Build dashboards/alerts on `level`, `route`, `statusCode`, and `requestId`.

Set `LOG_SERVICE` (or `SERVICE_NAME`) per environment so staging and production logs are easy to filter.

## Related docs

- [DATABASE.md](./DATABASE.md) — D1 setup and migrations
- [ARCHITECTURE.md](./ARCHITECTURE.md) — project layout and data flow