import { z } from 'zod';

import { apiErrorBodySchema } from '@/lib/schemas/api/common';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export type ApiRequestOptions<T> = {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseSchema: z.ZodType<T>;
};

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }

  const queryString = params.toString();
  if (!queryString) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${queryString}`;
}

function resolveErrorMessage(status: number, raw: unknown): string {
  const parsed = apiErrorBodySchema.safeParse(raw);
  if (parsed.success && parsed.data.error) {
    return parsed.data.error;
  }

  return `Request failed with status ${status}`;
}

export async function apiRequest<T>(options: ApiRequestOptions<T>): Promise<T> {
  const {
    path,
    method = 'GET',
    body,
    query,
    headers = {},
    signal,
    responseSchema,
  } = options;

  const init: RequestInit = {
    method,
    headers: { ...headers },
    signal,
  };

  if (body !== undefined) {
    init.headers = {
      'Content-Type': 'application/json',
      ...init.headers,
    };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), init);
  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response.status, raw), response.status, raw);
  }

  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      `Invalid API response for ${path}: ${parsed.error.message}`,
      response.status,
      raw,
    );
  }

  return parsed.data as T;
}