import { Client } from 'pg';
import { migrate } from '../server/database/migrate.ts';
import { seedCatalogue } from '../server/database/seed.ts';
import { databaseSettings } from '../server/database/settings.ts';

const settings = databaseSettings(process.env, 'MIGRATION_DATABASE_URL');
if (!settings)
  throw new Error(
    'Set MIGRATION_DATABASE_URL to a direct/session migration connection',
  );
const url = new URL(settings.connectionString);
if (url.port === '6543')
  throw new Error(
    'Migrations require a direct or session connection, not transaction pooling',
  );
const client = new Client({ ...settings, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const count = await migrate(client);
  if (process.argv.includes('--seed-catalogue')) await seedCatalogue(client);
  console.log(`Applied ${count} new migration(s).`);
} catch {
  console.error(
    'Database migration failed. Check connectivity, migration history and the private database log.',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
