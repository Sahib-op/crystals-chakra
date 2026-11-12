import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function createStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (Boolean(url) !== Boolean(key))
    throw new Error('Both Supabase settings are required');
  if (process.env.NODE_ENV === 'production' && !url)
    throw new Error('Production requires Supabase persistence');
  let db;
  if (!url) {
    mkdirSync('data', { recursive: true });
    db = new DatabaseSync(process.env.DATABASE_PATH || 'data/chakra.sqlite');
    db.exec(
      'CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, service TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)',
    );
  }
  return {
    async book(input) {
      const row = {
        id: randomUUID(),
        ...input,
        status: 'requested',
        created_at: new Date().toISOString(),
      };
      if (url) {
        const response = await fetch(`${url}/rest/v1/bookings`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error('Persistence unavailable');
      } else {
        db.prepare('INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?)').run(
          row.id,
          row.name,
          row.email,
          row.service,
          row.status,
          row.created_at,
        );
      }
      return { id: row.id, status: row.status };
    },
    close() {
      db?.close();
    },
  };
}
