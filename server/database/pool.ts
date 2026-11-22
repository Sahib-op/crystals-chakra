import type { PoolClient } from 'pg';
import { Pool } from 'pg';
import { isReadingCatalog } from '../../shared/catalog.ts';
import type { ReadingCatalogue } from '../../shared/contracts.ts';
import type { OrderProjection } from '../commerce/webhooks.ts';

export interface ShopifyDelivery {
  webhookId: string;
  eventId: string | null;
  topic: string;
  payloadSha256: string;
}
export type DeliveryOutcome = 'applied' | 'stale' | 'ignored' | 'duplicate';

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
class DuplicateDelivery extends Error {}

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
    role: 'anon' | 'authenticated' | 'chakra_commerce_writer',
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
          : role === 'authenticated'
            ? 'set local role authenticated'
            : 'set local role chakra_commerce_writer',
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
    /** Readiness: a real round trip through the restricted runtime role. */
    async ping(): Promise<void> {
      await transaction('anon', null, (client) => client.query('select 1'));
    },
    /**
     * Records one verified Shopify delivery and, for order topics, applies the
     * projection. Idempotent per webhook ID; an older order state never
     * overwrites a newer one (Shopify can deliver out of order).
     */
    async recordShopifyDelivery(
      delivery: ShopifyDelivery,
      order: OrderProjection | null,
    ): Promise<DeliveryOutcome> {
      return transaction('chakra_commerce_writer', null, async (client) => {
        let outcome: DeliveryOutcome = 'ignored';
        if (order) {
          const applied = await client.query(
            `insert into commerce.orders as o (shopify_order_id,name,financial_status,fulfillment_status,currency,total_minor,item_count,cancelled_at,shopify_created_at,shopify_updated_at)
             values ($1::bigint,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             on conflict (shopify_order_id) do update set
               name=excluded.name, financial_status=excluded.financial_status,
               fulfillment_status=excluded.fulfillment_status, currency=excluded.currency,
               total_minor=excluded.total_minor, item_count=excluded.item_count,
               cancelled_at=excluded.cancelled_at, shopify_updated_at=excluded.shopify_updated_at,
               recorded_at=now()
             where o.shopify_updated_at <= excluded.shopify_updated_at
             returning 1`,
            [
              order.shopifyOrderId,
              order.name,
              order.financialStatus,
              order.fulfillmentStatus,
              order.currency,
              order.totalMinor,
              order.itemCount,
              order.cancelledAt,
              order.createdAt,
              order.updatedAt,
            ],
          );
          outcome = applied.rowCount ? 'applied' : 'stale';
        }
        const inserted = await client.query(
          `insert into commerce.webhook_deliveries (webhook_id,event_id,topic,payload_sha256,outcome,shopify_order_id)
           values ($1,$2,$3,$4,$5,$6::bigint)
           on conflict (webhook_id) do nothing returning 1`,
          [
            delivery.webhookId,
            delivery.eventId,
            delivery.topic,
            delivery.payloadSha256,
            outcome,
            order?.shopifyOrderId ?? null,
          ],
        );
        if (!inserted.rowCount) {
          // Already processed: undo this transaction's projection write so a
          // redelivery has no effect at all.
          throw new DuplicateDelivery();
        }
        return outcome;
      }).catch((error) => {
        if (error instanceof DuplicateDelivery) return 'duplicate' as const;
        throw error;
      });
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
export type Database = ReturnType<typeof createDatabase>;
