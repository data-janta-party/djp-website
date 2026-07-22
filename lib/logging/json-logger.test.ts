import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createJsonLogger } from './json-logger';
import type { LogContext } from './types';

describe('createJsonLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.LOG_SERVICE;
    delete process.env.SERVICE_NAME;
  });

  it('emits structured JSON to stdout for info logs', () => {
    const logger = createJsonLogger({
      service: 'test-service',
      requestId: 'req-123',
      defaultContext: { route: '/api/example' },
    });

    logger.info('request started', { statusCode: 200 });

    expect(console.log).toHaveBeenCalledOnce();
    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))).toEqual({
      level: 'info',
      message: 'request started',
      timestamp: '2026-06-25T12:00:00.000Z',
      service: 'test-service',
      requestId: 'req-123',
      route: '/api/example',
      statusCode: 200,
    });
  });

  it('emits structured JSON to stderr for warn and error logs', () => {
    const logger = createJsonLogger({ service: 'test-service' });

    logger.warn('degraded');
    logger.error('failed');

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toMatchObject({
      level: 'warn',
      message: 'degraded',
    });
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[1][0]))).toMatchObject({
      level: 'error',
      message: 'failed',
    });
  });

  it('uses env service name when no override is provided', () => {
    process.env.LOG_SERVICE = 'worker-from-env';
    const logger = createJsonLogger();

    logger.debug('ready');

    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))).toMatchObject({
      level: 'debug',
      service: 'worker-from-env',
    });
  });

  it('ignores reserved keys supplied in context', () => {
    const logger = createJsonLogger({ service: 'test-service' });

    logger.info('safe log', { level: 'error', message: 'override attempt' });

    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))).toEqual({
      level: 'info',
      message: 'safe log',
      timestamp: '2026-06-25T12:00:00.000Z',
      service: 'test-service',
    });
  });

  it('emits a safe fallback line when context is not JSON-serializable', () => {
    const logger = createJsonLogger({ service: 'test-service' });
    const circular: LogContext = {};
    circular.self = circular;

    logger.error('serialization failure', circular);

    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toMatchObject({
      level: 'error',
      message: 'serialization failure',
      service: 'test-service',
      contextSerializationError: expect.any(String),
    });
  });

  it('keeps special characters on a single JSON line', () => {
    const logger = createJsonLogger({ service: 'test-service' });

    logger.info('line\nbreak "quote" 🚀', { note: 'tab\there' });

    const line = String(vi.mocked(console.log).mock.calls[0][0]);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toMatchObject({
      level: 'info',
      message: 'line\nbreak "quote" 🚀',
      note: 'tab\there',
    });
  });

  it('merges child logger context', () => {
    const logger = createJsonLogger({
      service: 'test-service',
      defaultContext: { route: '/api/example' },
    });

    logger.child({ component: 'db' }).info('query complete', { rows: 1 });

    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))).toEqual({
      level: 'info',
      message: 'query complete',
      timestamp: '2026-06-25T12:00:00.000Z',
      service: 'test-service',
      route: '/api/example',
      component: 'db',
      rows: 1,
    });
  });
});