import { DatabaseSync } from 'node:sqlite';
import { Client } from 'pg';
import { databaseSettings } from '../server/database/settings.ts';
import {
  importLegacy,
  validateLegacyBooking,
} from '../server/database/legacy.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const postgresSource = args.includes('--from-postgres');
  const source = args[args.indexOf('--source') + 1];
  const sourceKey = args[args.indexOf('--source-key') + 1];
  const apply = args.includes('--apply');
  if (
    !args.includes('--source-key') ||
    !sourceKey ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(sourceKey)
  )
    throw new Error('Provide a stable --source-key');
  if (postgresSource && args.includes('--source'))
    throw new Error('Choose one source');
  if (!postgresSource && (!args.includes('--source') || !source))
    throw new Error('Provide --source or --from-postgres');
  let client: Client | undefined;
  try {
    if (postgresSource || apply) {
      const settings = databaseSettings(process.env, 'MIGRATION_DATABASE_URL');
      if (!settings) throw new Error('Set MIGRATION_DATABASE_URL');
      client = new Client({ ...settings });
      await client.connect();
    }
    let rows: unknown[];
    if (postgresSource) {
      // Fixed private legacy source, not a user-supplied SQL identifier. Preserve microseconds.
      rows = (
        await client!.query(`select id,name,email,service,status,
        to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at
        from public.bookings order by id`)
      ).rows.map(validateLegacyBooking);
    } else {
      const sourceDb = new DatabaseSync(source!, { readOnly: true });
      try {
        rows = sourceDb
          .prepare(
            'select id,name,email,service,status,created_at from bookings order by id',
          )
          .all()
          .map(validateLegacyBooking);
      } finally {
        sourceDb.close();
      }
    }
    if (!apply)
      console.log(
        `Validated ${rows.length} legacy record(s). Source is unchanged. Add --apply only for the intended private migration database.`,
      );
    else
      console.log(JSON.stringify(await importLegacy(client!, sourceKey, rows)));
  } finally {
    await client?.end();
  }
}
main().catch(() => {
  console.error(
    'Legacy migration failed; source is unchanged. Check the source, target configuration and private reconciliation.',
  );
  process.exitCode = 1;
});
