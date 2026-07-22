import { createJsonLogger } from './json-logger';
import type { JsonLogger, LogContext } from './types';

export function getRequestId(request: Request): string {
  const requestId = request.headers.get('x-request-id')?.trim();
  if (requestId) {
    return requestId;
  }

  const cfRay = request.headers.get('cf-ray')?.trim();
  if (cfRay) {
    return cfRay;
  }

  return crypto.randomUUID();
}

export function createRequestLogger(
  request: Request,
  context?: LogContext,
): JsonLogger {
  const requestId = getRequestId(request);
  const url = new URL(request.url);

  return createJsonLogger({
    requestId,
    defaultContext: {
      method: request.method,
      path: url.pathname,
      ...context,
    },
  });
}

export function createApiRouteLogger(
  request: Request,
  context?: LogContext,
): JsonLogger {
  return createRequestLogger(request, {
    kind: 'api-route',
    ...context,
  });
}