import type { PoolClient } from 'pg';
import { Pool } from 'pg';
import { isReadingCatalog } from '../../shared/catalog.ts';
import type { ReadingCatalogue } from '../../shared/contracts.ts';

export interface DatabaseSettings {
  connectionString: string;
  maxConnections: number;
  ssl: false | { rejectUnauthorized: true; ca?: string };
}
export type DatabaseClaims = {
  sub: string;
  session_id: string;
  aal: 'aal1' | 'aal2';
};
export function createDatabase(settings: DatabaseSettings) {
  const pool = new Pool({
    ...settings,
    max: settings.maxConnections,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 10000,
    application_name: 'crystals_chakra_api',
  });
  // Never let an idle socket error become an unhandled event or log its connection details.
  pool.on('error', () => {});
  async function transaction<T>(
    role: 'anon' | 'authenticated',
    claims: DatabaseClaims | null,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    let broken = false;
    try {
      await client.query('begin');
      await client.query(
        role === 'anon'
          ? 'set local role anon'
          : 'set local role authenticated',
      );
      await client.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify(claims ?? {}),
      ]);
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      try {
        await client.query('rollback');
      } catch {
        broken = true;
      }
      throw error;
    } finally {
      client.release(broken);
    }
  }
  return {
    transaction,
    async assertRestrictedRole(): Promise<void> {
      const result = await pool.query<{
        safe: boolean;
      }>(`select not (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication)
        and pg_has_role(current_user,'chakra_runtime','member') as safe from pg_roles where rolname = current_user`);
      if (result.rows[0]?.safe !== true)
        throw new Error('Database runtime role is not restricted');
    },
    async listPublished(): Promise<ReadingCatalogue> {
      return transaction('anon', null, async (client) => {
        const result =
          await client.query(`select r.id,r.type,r.title,r.hindi_title,r.description,r.features,r.price_minor_units,r.contact_destination,p.name as practitioner_name
          from catalog.readings r left join catalog.practitioners p on p.id=r.practitioner_id
          where r.status='published' order by r.sort_order,r.id limit 41`);
        const readings: unknown = result.rows.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          ...(row.hindi_title ? { hindiTitle: row.hindi_title } : {}),
          description: row.description,
          features: row.features,
          price:
            row.price_minor_units === null ? null : row.price_minor_units / 100,
          contactDestination: row.contact_destination,
          ...(row.practitioner_name
            ? { practitioner: { name: row.practitioner_name } }
            : {}),
        }));
        if (!isReadingCatalog(readings))
          throw new Error('Published catalogue is invalid');
        return readings;
      });
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
export type Database = ReturnType<typeof createDatabase>;
