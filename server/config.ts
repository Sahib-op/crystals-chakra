import { authSettings } from './auth/settings.ts';
import type { AuthSettings } from './auth/identity.ts';
import { databaseSettings } from './database/settings.ts';
import type { DatabaseSettings } from './database/pool.ts';

export interface ApiConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  frontendOrigin: string;
  logLevel: 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug';
  shopify: { domain?: string; token?: string; checkoutHost?: string };
  database: DatabaseSettings | null;
  auth: AuthSettings | null;
}
const modes = ['development', 'test', 'production'] as const;
const levels = ['silent', 'fatal', 'error', 'warn', 'info', 'debug'] as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!modes.includes(nodeEnv as ApiConfig['nodeEnv']))
    throw new Error('NODE_ENV is invalid');
  const production = nodeEnv === 'production';
  const rawOrigin =
    env.FRONTEND_URL || (production ? '' : 'http://localhost:5175');
  let url: URL;
  try {
    url = new URL(rawOrigin);
  } catch {
    throw new Error('FRONTEND_URL must be an exact origin');
  }
  if (
    rawOrigin !== url.origin ||
    url.username ||
    url.password ||
    (production
      ? url.protocol !== 'https:'
      : !['http:', 'https:'].includes(url.protocol))
  )
    throw new Error('FRONTEND_URL must be an exact permitted origin');
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535');
  const host = env.HOST || '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0', '::1', '::'].includes(host))
    throw new Error('HOST must be an explicit listen address');
  const logLevel = env.LOG_LEVEL || 'info';
  if (!levels.includes(logLevel as ApiConfig['logLevel']))
    throw new Error('LOG_LEVEL is invalid');
  const domain = env.SHOPIFY_STORE_DOMAIN?.trim();
  const token = env.SHOPIFY_STOREFRONT_TOKEN?.trim();
  const checkoutHost = env.SHOPIFY_CHECKOUT_HOST?.trim().toLowerCase();
  if (Boolean(domain) !== Boolean(token))
    throw new Error('Both Shopify settings are required');
  if (domain && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))
    throw new Error('SHOPIFY_STORE_DOMAIN is invalid');
  if (
    checkoutHost &&
    (!domain ||
      checkoutHost.length > 253 ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        checkoutHost,
      ))
  )
    throw new Error(
      'SHOPIFY_CHECKOUT_HOST must be an exact hostname for the configured shop',
    );
  return {
    nodeEnv: nodeEnv as ApiConfig['nodeEnv'],
    host,
    port,
    frontendOrigin: url.origin,
    logLevel: logLevel as ApiConfig['logLevel'],
    shopify: {
      ...(domain ? { domain } : {}),
      ...(token ? { token } : {}),
      ...(checkoutHost ? { checkoutHost } : {}),
    },
    database: databaseSettings(env),
    auth: authSettings(env),
  };
}
export function isAllowedOrigin(
  origin: string | undefined,
  config: ApiConfig,
): boolean {
  return (
    origin === config.frontendOrigin ||
    (config.nodeEnv !== 'production' &&
      /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/.test(origin || ''))
  );
}
