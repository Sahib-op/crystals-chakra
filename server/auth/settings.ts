import type { AuthSettings } from './identity.ts';
export function authSettings(env: NodeJS.ProcessEnv): AuthSettings | null {
  if (env.STUDIO_DEMO_MODE === 'true' && env.NODE_ENV === 'production')
    throw new Error('Local studio preview cannot run in production');
  if (!env.SUPABASE_URL) {
    if (env.SUPABASE_PUBLISHABLE_KEY)
      throw new Error('SUPABASE_URL is required with the publishable key');
    return null;
  }
  if (
    env.SUPABASE_PUBLISHABLE_KEY &&
    !/^sb_publishable_[A-Za-z0-9_-]{10,480}$/.test(env.SUPABASE_PUBLISHABLE_KEY)
  )
    throw new Error(
      'Use a public Supabase publishable key, never a service key',
    );
  let url: URL;
  try {
    url = new URL(env.SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL is invalid');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname) ||
    (env.NODE_ENV === 'production'
      ? local || url.protocol !== 'https:'
      : url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
  )
    throw new Error('SUPABASE_URL must be an approved Auth origin');
  const demo = env.STUDIO_DEMO_MODE === 'true';
  if (demo) {
    let database: URL;
    try {
      database = new URL(env.DATABASE_URL || '');
    } catch {
      throw new Error('Local studio preview requires its local database');
    }
    if (
      env.NODE_ENV === 'production' ||
      !local ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
      database.pathname !== '/chakra_development' ||
      (env.HOST && env.HOST !== '127.0.0.1')
    )
      throw new Error(
        'Local studio preview cannot be enabled outside its isolated local setup',
      );
  }
  return {
    url: url.origin,
    localDemo: demo,
    ...(env.SUPABASE_PUBLISHABLE_KEY
      ? { publishableKey: env.SUPABASE_PUBLISHABLE_KEY }
      : {}),
  };
}
