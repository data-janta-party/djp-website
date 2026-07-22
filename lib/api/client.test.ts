import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiRequest, ApiError } from './client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses successful JSON responses with the provided schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' }),
      }),
    );

    const result = await apiRequest({
      path: '/api/example',
      responseSchema: z.object({
        status: z.literal('ok'),
        timestamp: z.string(),
      }),
    });

    expect(result).toEqual({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' });
  });

  it('throws ApiError when the server returns an error payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      }),
    );

    await expect(
      apiRequest({
        path: '/api/example',
        responseSchema: z.object({ status: z.literal('ok'), timestamp: z.string() }),
      }),
    ).rejects.toEqual(new ApiError('Server error', 500, { error: 'Server error' }));
  });

  it('throws ApiError with generic message when error body lacks error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    await expect(
      apiRequest({
        path: '/api/example',
        responseSchema: z.object({ status: z.literal('ok'), timestamp: z.string() }),
      }),
    ).rejects.toEqual(new ApiError('Request failed with status 503', 503, {}));
  });

  it('throws ApiError when the response does not match the schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: true }),
      }),
    );

    await expect(
      apiRequest({
        path: '/api/example',
        responseSchema: z.object({ status: z.literal('ok'), timestamp: z.string() }),
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
  });
});