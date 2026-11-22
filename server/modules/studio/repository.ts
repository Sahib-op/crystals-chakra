import type { Database } from '../../database/pool.ts';
import type { PoolClient } from 'pg';
import type { VerifiedIdentity } from '../../auth/identity.ts';
import type {
  ReadingCreate,
  ReadingUpdate,
  StudioReading,
  StudioReadingPage,
  StudioOrder,
  StudioOrderPage,
  ReadingFilters,
  Practitioners,
  AuditList,
} from '../../../shared/studio-contracts.ts';
import { HttpError } from '../../http.ts';
import { DEFAULT_READING_ORDER } from '../../../shared/reading-layout.ts';
import { exponentFor } from '../../commerce/webhooks.ts';
type OrderRow = Omit<
  StudioOrder,
  'currencyDecimals' | 'totalMinor' | 'createdAt' | 'cancelledAt'
> & {
  totalMinor: string;
  createdAt: Date;
  cancelledAt: Date | null;
};
const orderPageSize = 25;
interface ReadingRow {
  id: string;
  type: 'tarot' | 'astrology';
  title: string;
  hindi_title: string | null;
  description: string;
  features: string[];
  price_minor_units: number | null;
  practitioner_id: string | null;
  status: StudioReading['status'];
  sort_order: number;
  card_size: NonNullable<StudioReading['cardSize']>;
  card_color: NonNullable<StudioReading['cardColor']>;
  revision: number;
  updated_at: Date;
}
const columns =
  'id,type,title,hindi_title,description,features,price_minor_units,practitioner_id,status,sort_order,card_size,card_color,revision,updated_at';
const reading = (row: ReadingRow): StudioReading => ({
  id: row.id,
  type: row.type,
  title: row.title,
  hindiTitle: row.hindi_title,
  description: row.description,
  features: row.features,
  priceMinor: row.price_minor_units,
  practitionerId: row.practitioner_id,
  status: row.status,
  sortOrder: row.sort_order,
  cardSize: row.card_size,
  cardColor: row.card_color,
  revision: row.revision,
  updatedAt: row.updated_at.toISOString(),
});
export function createStudioRepository(db: Database) {
  async function position(
    client: PoolClient,
    id: string,
    before: string | null | undefined,
    fallback: number,
  ) {
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended('chakra_catalogue_publish',0))",
    );
    if (before === undefined || id === 'tarot') return fallback;
    const { rows } = await client.query<{ id: string; sort_order: number }>(
      "select id,sort_order from catalog.readings where status='published' and id not in ($1,'tarot') order by sort_order,id limit 40",
      [id],
    );
    const index =
      before === null
        ? rows.length
        : rows.findIndex((row) => row.id === before);
    if (index < 0)
      throw new HttpError(
        409,
        'The published layout changed. Reload before choosing a position.',
        'READING_LAYOUT_CHANGED',
      );
    const left = rows[index - 1]?.sort_order ?? -1;
    const right = rows[index]?.sort_order ?? 10000;
    if (right - left > 1) return Math.floor((left + right) / 2);

    // The original cards use consecutive positions. Space out this bounded
    // catalogue only when there is no free rank between neighbouring cards.
    const ranks = rows.map((_, slot) => (slot + 1) * 100);
    await client.query(
      'update catalog.readings r set sort_order=p.rank from unnest($1::text[], $2::int[]) as p(id,rank) where r.id=p.id and r.sort_order<>p.rank',
      [rows.map((row) => row.id), ranks],
    );
    return index * 100 + 50;
  }
  function revisionConflict() {
    return new HttpError(
      409,
      'This reading changed or is unavailable. Reload it before saving.',
      'REVISION_CONFLICT',
    );
  }
  async function access(
    identity: VerifiedIdentity,
  ): Promise<{ eligible: boolean; mfa: boolean }> {
    return db.transaction('authenticated', identity, async (client) => {
      const result = await client.query<{ eligible: boolean; mfa: boolean }>(
        'select studio.owner_session(false) as eligible,studio.owner_session(true) as mfa',
      );
      return result.rows[0] ?? { eligible: false, mfa: false };
    });
  }
  function mapWriteError(error: unknown): never {
    const code = (error as { code?: string }).code;
    if (error instanceof HttpError) throw error;
    if (code === '23505')
      throw new HttpError(
        409,
        'That reading address is already in use. Choose another.',
        'READING_EXISTS',
      );
    if (code === '23514' || code === '23503')
      throw new HttpError(
        400,
        'Check the reading details and publish its practitioner before publishing a reading.',
        'READING_INVALID',
      );
    if (code === '42501')
      throw new HttpError(
        403,
        'Studio access is no longer available. Sign in again.',
        'OWNER_ACCESS_DENIED',
      );
    throw error;
  }
  return {
    access,
    async orders(
      identity: VerifiedIdentity,
      after?: string,
    ): Promise<StudioOrderPage> {
      if (after && BigInt(after) > 9223372036854775807n)
        throw new HttpError(400, 'Invalid order page.', 'INVALID_ORDER_CURSOR');
      return db.transaction('authenticated', identity, async (client) => {
        // Look up the cursor by primary key to retain the full timestamp precision.
        const afterClause = after
          ? `where (shopify_created_at, shopify_order_id) <
               (select shopify_created_at, shopify_order_id
                from commerce.orders where shopify_order_id = $1::bigint)`
          : '';
        const { rows } = await client.query<OrderRow>(
          `select shopify_order_id::text as id, name, financial_status as "financialStatus",
                  fulfillment_status as "fulfillmentStatus", currency, total_minor::text as "totalMinor",
                  item_count as "itemCount", cancelled_at as "cancelledAt", shopify_created_at as "createdAt"
           from commerce.orders ${afterClause}
           order by shopify_created_at desc, shopify_order_id desc limit ${orderPageSize + 1}`,
          after ? [after] : [],
        );
        const items = rows.slice(0, orderPageSize).map((row) => ({
          ...row,
          currencyDecimals: exponentFor(row.currency),
          totalMinor: Number(row.totalMinor),
          createdAt: row.createdAt.toISOString(),
          cancelledAt: row.cancelledAt?.toISOString() ?? null,
        }));
        return {
          items,
          nextCursor:
            rows.length > orderPageSize ? (items.at(-1)?.id ?? null) : null,
        };
      });
    },
    async reading(
      identity: VerifiedIdentity,
      id: string,
    ): Promise<StudioReading> {
      return db.transaction('authenticated', identity, async (client) => {
        const result = await client.query<ReadingRow>(
          `select ${columns} from catalog.readings where id=$1`,
          [id],
        );
        if (!result.rows[0])
          throw new HttpError(
            404,
            'This reading is unavailable.',
            'READING_NOT_FOUND',
          );
        const { rows } = await client.query<{
          fields: NonNullable<StudioReading['draft']>;
        }>('select fields from studio.reading_drafts where reading_id=$1', [
          id,
        ]);
        return {
          ...reading(result.rows[0]),
          ...(rows[0] ? { draft: rows[0].fields } : {}),
        };
      });
    },
    async readings(
      identity: VerifiedIdentity,
      filters: ReadingFilters,
    ): Promise<StudioReadingPage> {
      return db.transaction('authenticated', identity, async (client) => {
        const rows = await client.query<ReadingRow>(
          `select ${columns} from catalog.readings where ($1::text is null or id>$1) and ($2::text is null or status=$2) order by id limit 51`,
          [filters.after ?? null, filters.status ?? null],
        );
        return {
          items: rows.rows.slice(0, 50).map(reading),
          nextCursor: rows.rows.length > 50 ? rows.rows[49]!.id : null,
        };
      });
    },
    async practitioners(identity: VerifiedIdentity): Promise<Practitioners> {
      return db.transaction(
        'authenticated',
        identity,
        async (client) =>
          (
            await client.query<Practitioners[number]>(
              'select id,name,published from catalog.practitioners order by name,id limit 100',
            )
          ).rows,
      );
    },
    async createReading(
      identity: VerifiedIdentity,
      input: ReadingCreate,
    ): Promise<StudioReading> {
      try {
        return await db.transaction(
          'authenticated',
          identity,
          async (client) => {
            const order = await position(
              client,
              input.id,
              input.placeBefore,
              input.sortOrder ?? DEFAULT_READING_ORDER,
            );
            const result = await client.query<ReadingRow>(
              `insert into catalog.readings(id,type,title,hindi_title,description,features,price_minor_units,practitioner_id,status,sort_order,card_size,card_color) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning ${columns}`,
              [
                input.id,
                input.type,
                input.title,
                input.hindiTitle,
                input.description,
                input.features,
                input.priceMinor,
                input.practitionerId,
                input.status,
                order,
                input.cardSize ?? 'standard',
                input.cardColor ?? 'default',
              ],
            );
            return reading(result.rows[0]!);
          },
        );
      } catch (error) {
        mapWriteError(error);
      }
    },
    async updateReading(
      identity: VerifiedIdentity,
      id: string,
      input: ReadingUpdate,
    ): Promise<StudioReading> {
      try {
        return await db.transaction(
          'authenticated',
          identity,
          async (client) => {
            if (input.saveDraft) {
              await position(client, id, undefined, input.sortOrder);
              const { rows } = await client.query<ReadingRow>(
                `update catalog.readings set revision=revision where id=$1 and revision=$2 and status='published' returning ${columns}`,
                [id, input.revision],
              );
              if (!rows[0]) throw revisionConflict();
              const {
                revision: _revision,
                saveDraft: _saveDraft,
                ...draft
              } = input;
              await client.query(
                'insert into studio.reading_drafts (reading_id, fields) values ($1,$2) on conflict (reading_id) do update set fields=excluded.fields',
                [id, JSON.stringify(draft)],
              );
              return { ...reading(rows[0]), draft };
            }
            const order = await position(
              client,
              id,
              input.placeBefore,
              input.sortOrder,
            );
            const result = await client.query<ReadingRow>(
              `update catalog.readings set type=$2,title=$3,hindi_title=$4,description=$5,features=$6,price_minor_units=$7,practitioner_id=$8,status=$9,sort_order=$10,card_size=coalesce($12,card_size),card_color=coalesce($13,card_color) where id=$1 and revision=$11 returning ${columns}`,
              [
                id,
                input.type,
                input.title,
                input.hindiTitle,
                input.description,
                input.features,
                input.priceMinor,
                input.practitionerId,
                input.status,
                order,
                input.revision,
                input.cardSize ?? null,
                input.cardColor ?? null,
              ],
            );
            if (!result.rows[0]) throw revisionConflict();
            await client.query(
              'delete from studio.reading_drafts where reading_id=$1',
              [id],
            );
            return reading(result.rows[0]);
          },
        );
      } catch (error) {
        mapWriteError(error);
      }
    },
    async history(identity: VerifiedIdentity, id: string): Promise<AuditList> {
      return db.transaction('authenticated', identity, async (client) => {
        const result = await client.query<{
          id: string;
          action: AuditList[number]['action'];
          revision: number | null;
          occurred_at: Date;
        }>(
          "select id,action,revision,occurred_at from studio.audit_events where entity_type='reading' and entity_id=$1 order by occurred_at desc,id desc limit 30",
          [id],
        );
        return result.rows.map((row) => ({
          id: row.id,
          action: row.action,
          revision: row.revision,
          occurredAt: row.occurred_at.toISOString(),
        }));
      });
    },
  };
}
export type StudioRepository = ReturnType<typeof createStudioRepository>;
