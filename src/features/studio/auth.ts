import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StudioConfiguration } from '../../../shared/studio-contracts.ts';
let client: SupabaseClient | undefined;
let origin: string | undefined;
export function studioAuth(
  config: StudioConfiguration,
  reset = false,
): SupabaseClient {
  if (!config.configured || !config.authUrl || !config.publishableKey)
    throw new Error('Studio sign-in is unavailable');
  if (reset) {
    void client?.auth.stopAutoRefresh();
    client = undefined;
    origin = undefined;
  }
  if (!client || origin !== config.authUrl) {
    origin = config.authUrl;
    client = createClient(config.authUrl, config.publishableKey, {
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)])
              : AbortSignal.timeout(8000),
          }),
      },
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
