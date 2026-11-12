import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Client } from 'pg';

export async function migrate(
  client: Client,
  directory = new URL('../../supabase/migrations/', import.meta.url),
): Promise<number> {
  const files = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  if (files.some((name) => !/^\d{12}_[a-z0-9_]+\.sql$/.test(name)))
    throw new Error('Invalid migration filename');
  if (!files.length) throw new Error('No versioned database migrations found');
  // One direct/session connection owns the lock, including across per-file transactions.
  await client.query("set lock_timeout = '10s'");
  await client.query(
    "select pg_advisory_lock(hashtextextended('chakra_schema_migrations',0))",
  );
  let count = 0;
  try {
    await client.query(`create schema if not exists chakra_meta;
      revoke all on schema chakra_meta from public, anon, authenticated;
      create table if not exists chakra_meta.migrations (version text primary key, checksum text not null, applied_at timestamptz not null default now());
      revoke all on chakra_meta.migrations from public, anon, authenticated`);
    const applied = await client.query<{ version: string; checksum: string }>(
      'select version, checksum from chakra_meta.migrations order by version',
    );
    const known = new Map(
      applied.rows.map((row) => [row.version, row.checksum]),
    );
    for (const row of applied.rows)
      if (!files.includes(row.version))
        throw new Error('Applied migration is absent from this checkout');
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256')
        .update(sql.replaceAll('\r\n', '\n'))
        .digest('hex');
      if (known.has(name)) {
        if (known.get(name) !== checksum)
          throw new Error('Applied migration checksum changed: ' + name);
        continue;
      }
      if (applied.rows.some((row) => row.version > name))
        throw new Error('Cannot insert a migration before an applied version');
      await client.query('begin');
      try {
        await client.query(
          "set local lock_timeout = '5s'; set local statement_timeout = '30s'",
        );
        await client.query(sql);
        await client.query(
          'insert into chakra_meta.migrations(version,checksum) values ($1,$2)',
          [name, checksum],
        );
        await client.query('commit');
        count++;
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
    return count;
  } finally {
    await client.query(
      "select pg_advisory_unlock(hashtextextended('chakra_schema_migrations',0))",
    );
  }
}
