import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

export async function start(): Promise<void> {
  const config = loadConfig();
  const app = await createApp({ config });
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000).unref();
    try {
      await app.close();
    } finally {
      clearTimeout(deadline);
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await app.listen({ port: config.port, host: config.host });
}
