import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createApiRouteLogger,
  createRequestLogger,
  getRequestId,
} from './request-logger';

describe('request logger helpers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-request-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers x-request-id over cf-ray', () => {
    const request = new Request('https://example.com/api/example', {
      headers: {
        'x-request-id': 'req-from-client',
        'cf-ray': 'cf-ray-id',
      },
    });

    expect(getRequestId(request)).toBe('req-from-client');
  });

  it('ignores empty x-request-id values', () => {
    const request = new Request('https://example.com/api/example', {
      headers: {
        'x-request-id': '   ',
        'cf-ray': 'cf-ray-id',
      },
    });

    expect(getRequestId(request)).toBe('cf-ray-id');
  });

  it('falls back to cf-ray and then a generated id', () => {
    const cfRequest = new Request('https://example.com/api/example', {
      headers: { 'cf-ray': 'cf-ray-id' },
    });
    const generatedRequest = new Request('https://example.com/api/example');

    expect(getRequestId(cfRequest)).toBe('cf-ray-id');
    expect(getRequestId(generatedRequest)).toBe('generated-request-id');
  });

  it('createRequestLogger includes request metadata in log context', () => {
    const request = new Request('https://example.com/api/example', {
      method: 'GET',
      headers: { 'x-request-id': 'req-abc' },
    });

    createRequestLogger(request, { feature: 'example' }).info('started');

    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))).toMatchObject({
      level: 'info',
      message: 'started',
      requestId: 'req-abc',
      method: 'GET',
      path: '/api/example',
      feature: 'example',
    });
  });

  it('createApiRouteLogger tags logs as api-route logs', () => {
    const request = new Request('https://example.com/api/example', {
      headers: { 'x-request-id': 'req-api' },
    });

    createApiRouteLogger(request, { route: '/api/example' }).info('completed');

    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))).toMatchObject({
      kind: 'api-route',
      route: '/api/example',
      requestId: 'req-api',
    });
  });
});