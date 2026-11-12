import { createHash } from 'node:crypto';
import type { Client } from 'pg';

export interface LegacyBooking {
  id: string;
  name: string;
  email: string;
  service: string;
  status: 'requested' | 'contacted' | 'closed';
  created_at: string;
}
function validTimestamp(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  const date = value.slice(0, 10);
  return new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}
export function validateLegacyBooking(value: unknown): LegacyBooking {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid legacy row');
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      row.id,
    ) ||
    typeof row.name !== 'string' ||
    [...row.name].length < 2 ||
    [...row.name].length > 80 ||
    typeof row.email !== 'string' ||
    row.email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
    typeof row.service !== 'string' ||
    !/^[a-z][a-z0-9-]{0,47}$/.test(row.service) ||
    !['requested', 'contacted', 'closed'].includes(String(row.status)) ||
    !validTimestamp(row.created_at)
  )
    throw new Error('Invalid legacy row; source record is preserved');
  return {
    id: row.id.toLowerCase(),
    name: row.name,
    email: row.email,
    service: row.service,
    status: row.status as LegacyBooking['status'],
    created_at: row.created_at,
  };
}
export async function importLegacy(
  client: Client,
  sourceKey: string,
  inputs: unknown[],
): Promise<{ imported: number; unchanged: number }> {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(sourceKey))
    throw new Error('Invalid legacy source key');
  const rows = inputs.map(validateLegacyBooking);
  let imported = 0,
    unchanged = 0;
  await client.query('begin');
  try {
    for (const row of rows) {
      await client.query(
        'select pg_advisory_xact_lock(hashtextextended($1,0))',
        ['legacy:' + sourceKey + ':' + row.id],
      );
      const checksum = createHash('sha256')
        .update(JSON.stringify(row))
        .digest('hex');
      const existing = await client.query<{ content_hash: string }>(
        'select content_hash from studio.legacy_imports where source_key=$1 and legacy_id=$2',
        [sourceKey, row.id],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].content_hash !== checksum)
          throw new Error(
            'Legacy content differs from its previous import; no rows changed',
          );
        unchanged++;
        continue;
      }
      const inserted = await client.query<{ id: string }>(
        `insert into studio.consultations(reading_id,customer_name,email,channel,created_at,updated_at)
        values($1,$2,$3,'legacy_email',$4,$4) returning id`,
        [row.service, row.name, row.email, row.created_at],
      );
      await client.query(
        `insert into studio.legacy_imports(source_key,legacy_id,consultation_id,original_status,content_hash) values($1,$2,$3,$4,$5)`,
        [sourceKey, row.id, inserted.rows[0]?.id, row.status, checksum],
      );
      imported++;
    }
    await client.query('commit');
    return { imported, unchanged };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
