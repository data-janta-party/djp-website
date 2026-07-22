import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { cache } from 'react';

import { DbUnavailableError } from './errors';
import * as schema from './schema';

export type AppDatabase = DrizzleD1Database<typeof schema>;

function createDb(binding: D1Database): AppDatabase {
  return drizzle(binding, { schema });
}

function getDbBinding(): D1Database {
  let env: CloudflareEnv;

  try {
    ({ env } = getCloudflareContext());
  } catch {
    throw new DbUnavailableError('D1 binding "DB" is not configured');
  }

  const binding = env.DB;

  if (!binding) {
    throw new DbUnavailableError('D1 binding "DB" is not configured');
  }

  return binding;
}

export const getDb = cache((): AppDatabase => {
  return createDb(getDbBinding());
});

/** @public */
export const getDbAsync = cache(async (): Promise<AppDatabase> => {
  let env: CloudflareEnv;

  try {
    ({ env } = await getCloudflareContext({ async: true }));
  } catch {
    throw new DbUnavailableError('D1 binding "DB" is not configured');
  }

  const binding = env.DB;

  if (!binding) {
    throw new DbUnavailableError('D1 binding "DB" is not configured');
  }

  return createDb(binding);
});

export { DbUnavailableError } from './errors';
export * from './schema';