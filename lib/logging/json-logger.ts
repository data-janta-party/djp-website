import type { JsonLogEntry, JsonLogger, JsonLoggerOptions, LogContext, LogLevel } from './types';

const DEFAULT_SERVICE_NAME = 'data-junta-party-website';

const RESERVED_LOG_KEYS = new Set([
  'level',
  'message',
  'timestamp',
  'service',
  'requestId',
]);

function getServiceName(override?: string): string {
  return (
    override ??
    process.env.LOG_SERVICE ??
    process.env.SERVICE_NAME ??
    DEFAULT_SERVICE_NAME
  );
}

function sanitizeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !RESERVED_LOG_KEYS.has(key)),
  );
}

function serializeLogEntry(entry: JsonLogEntry & LogContext): string {
  try {
    return JSON.stringify(entry);
  } catch (error) {
    return JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      service: entry.service,
      ...(entry.requestId ? { requestId: entry.requestId } : {}),
      contextSerializationError:
        error instanceof Error ? error.message : 'unknown',
    });
  }
}

function emitLog(level: LogLevel, entry: JsonLogEntry & LogContext): void {
  const line = serializeLogEntry(entry);

  if (level === 'error' || level === 'warn') {
    console.error(line);
    return;
  }

  console.log(line);
}

function buildEntry(
  level: LogLevel,
  message: string,
  service: string,
  requestId: string | undefined,
  defaultContext: LogContext,
  context?: LogContext,
): JsonLogEntry & LogContext {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service,
    ...(requestId ? { requestId } : {}),
    ...sanitizeContext(defaultContext),
    ...sanitizeContext(context ?? {}),
  };
}

export function createJsonLogger(options: JsonLoggerOptions = {}): JsonLogger {
  const service = getServiceName(options.service);
  const requestId = options.requestId;
  const defaultContext = options.defaultContext ?? {};

  const log =
    (level: LogLevel) =>
    (message: string, context?: LogContext): void => {
      emitLog(
        level,
        buildEntry(level, message, service, requestId, defaultContext, context),
      );
    };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child(context: LogContext): JsonLogger {
      return createJsonLogger({
        service,
        requestId,
        defaultContext: {
          ...defaultContext,
          ...context,
        },
      });
    },
  };
}