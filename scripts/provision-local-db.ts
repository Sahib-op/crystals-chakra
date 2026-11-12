import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { migrate } from '../server/database/migrate.ts';
import { seedCatalogue } from '../server/database/seed.ts';

const base = new URL(
  process.env.TEST_DATABASE_URL ||
    'postgresql://missing:missing@invalid/postgres',
);
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
  base.username !== 'chakra_test_admin'
)
  throw new Error(
    'Local setup requires the isolated cluster from start-local-postgres.ps1',
  );
const databaseName = 'chakra_development';
const target = new URL(base);
target.pathname = '/' + databaseName;
const environmentFile = new URL('../work/database/api.env', import.meta.url);
const admin = new Client({ connectionString: base.href });
let targetClient: Client | undefined;
try {
  await admin.connect();
  if (
    !(
      await admin.query('select 1 from pg_database where datname=$1', [
        databaseName,
      ])
    ).rowCount
  )
    await admin.query(`create database "${databaseName}"`);
  targetClient = new Client({ connectionString: target.href });
  await targetClient.connect();
  const auth = (
    await targetClient.query("select to_regclass('auth.users') as users")
  ).rows[0].users;
  if (!auth)
    await targetClient.query(
      await readFile(
        new URL('../tests/database/bootstrap.sql', import.meta.url),
        'utf8',
      ),
    );
  await targetClient.query(
    await readFile(
      new URL('../tests/database/auth-shape.sql', import.meta.url),
      'utf8',
    ),
  );
  await migrate(targetClient);
  await seedCatalogue(targetClient);
  let exists = false;
  try {
    await access(environmentFile);
    exists = true;
  } catch {}
  if (exists) {
    const stored = parseEnv(await readFile(environmentFile, 'utf8'));
    const configured = new URL(
      stored.DATABASE_URL || 'postgresql://invalid/invalid',
    );
    if (
      configured.pathname !== '/' + databaseName ||
      configured.hostname !== base.hostname ||
      configured.port !== base.port
    )
      throw new Error(
        'Existing local API environment targets a different database; left unchanged',
      );
  } else {
    const role = 'chakra_dev_api_' + randomBytes(5).toString('hex');
    const password = randomBytes(24).toString('hex');
    await admin.query(
      `create role "${role}" login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password '${password}'`,
    );
    await admin.query(`grant chakra_runtime to "${role}"`);
    const runtime = new URL(target);
    runtime.username = role;
    runtime.password = password;
    await writeFile(
      environmentFile,
      'DATABASE_URL=' + runtime.href + '\nDATABASE_POOL_MAX=4\n',
      { flag: 'wx' },
    );
  }
  console.log(
    'Local development catalogue is ready. API credentials are in ignored work/database/api.env; no customer archive was imported.',
  );
} catch {
  console.error(
    'Local database setup failed. Existing records and environment files were not replaced.',
  );
  process.exitCode = 1;
} finally {
  await targetClient?.end();
  await admin.end();
}
