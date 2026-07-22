import { afterEach, describe, expect, it, vi } from 'vitest';

const getCloudflareContextMock = vi.hoisted(() => vi.fn());

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: getCloudflareContextMock,
}));

function mockCloudflareContext(env: CloudflareEnv, options?: { async?: boolean }) {
  const result = { env };

  if (options?.async) {
    return Promise.resolve(result);
  }

  return result;
}

describe('getDb', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('throws DbUnavailableError when getCloudflareContext is not initialized', async () => {
    getCloudflareContextMock.mockImplementation(() => {
      throw new Error(
        'getCloudflareContext has been called without having called initOpenNextCloudflareForDev',
      );
    });

    const { getDb } = await import('./index');

    expect(() => getDb()).toThrow('D1 binding "DB" is not configured');
  });

  it('throws DbUnavailableError when the DB binding is missing', async () => {
    getCloudflareContextMock.mockReturnValue({ env: {} });

    const { getDb } = await import('./index');

    expect(() => getDb()).toThrow('D1 binding "DB" is not configured');
  });

  it('returns a drizzle client when the DB binding is configured', async () => {
    const binding = { prepare: vi.fn() };
    getCloudflareContextMock.mockReturnValue({ env: { DB: binding } });

    const { getDb } = await import('./index');
    const db = getDb();

    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
  });
});

describe('getDbAsync', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('throws DbUnavailableError when async getCloudflareContext is not initialized', async () => {
    getCloudflareContextMock.mockImplementation((options?: { async?: boolean }) => {
      if (options?.async) {
        return Promise.reject(
          new Error(
            'getCloudflareContext has been called without having called initOpenNextCloudflareForDev',
          ),
        );
      }

      throw new Error(
        'getCloudflareContext has been called without having called initOpenNextCloudflareForDev',
      );
    });

    const { getDbAsync } = await import('./index');

    await expect(getDbAsync()).rejects.toThrow('D1 binding "DB" is not configured');
    expect(getCloudflareContextMock).toHaveBeenCalledWith({ async: true });
  });

  it('throws DbUnavailableError when the async DB binding is missing', async () => {
    getCloudflareContextMock.mockImplementation((options?: { async?: boolean }) =>
      mockCloudflareContext({}, options),
    );

    const { getDbAsync } = await import('./index');

    await expect(getDbAsync()).rejects.toThrow('D1 binding "DB" is not configured');
    expect(getCloudflareContextMock).toHaveBeenCalledWith({ async: true });
  });

  it('returns a drizzle client when the async DB binding is configured', async () => {
    const binding = { prepare: vi.fn() };
    getCloudflareContextMock.mockImplementation((options?: { async?: boolean }) =>
      mockCloudflareContext({ DB: binding }, options),
    );

    const { getDbAsync } = await import('./index');
    const db = await getDbAsync();

    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
    expect(getCloudflareContextMock).toHaveBeenCalledWith({ async: true });
  });
});