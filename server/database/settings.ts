import { readFileSync } from 'node:fs';
import type { DatabaseSettings } from './pool.ts';

export function databaseSettings(
  env: NodeJS.ProcessEnv,
  key = 'DATABASE_URL',
): DatabaseSettings | null {
  const value = env[key];
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(key + ' is invalid');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    url.pathname.length < 2 ||
    url.search ||
    url.hash
  )
    throw new Error(key + ' must be a PostgreSQL URL without query options');
  const maxConnections = Number(env.DATABASE_POOL_MAX || 4);
  if (
    !Number.isInteger(maxConnections) ||
    maxConnections < 1 ||
    maxConnections > 10
  )
    throw new Error('DATABASE_POOL_MAX must be from 1 to 10');
  const local =
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    env.NODE_ENV !== 'production';
  let ca: string | undefined;
  if (env.DATABASE_CA_CERT_FILE) {
    try {
      ca = readFileSync(env.DATABASE_CA_CERT_FILE, 'utf8');
    } catch {
      throw new Error('Database CA certificate cannot be read');
    }
  }
  return {
    connectionString: url.href,
    maxConnections,
    ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
