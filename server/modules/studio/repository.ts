import type { Database } from '../../database/pool.ts';
import type { VerifiedIdentity } from '../../auth/identity.ts';
import type {
  ReadingCreate,
  ReadingUpdate,
  StudioReading,
  StudioReadingPage,
  ReadingFilters,
  Practitioners,
  AuditList,
} from '../../../shared/studio-contracts.ts';
import { HttpError } from '../../http.ts';
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
  revision: number;
  updated_at: Date;
}
const columns =
  'id,type,title,hindi_title,description,features,price_minor_units,practitioner_id,status,sort_order,revision,updated_at';
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
  revision: row.revision,
  updatedAt: row.updated_at.toISOString(),
});
export function createStudioRepository(db: Database) {
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
        return reading(result.rows[0]);
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
            const result = await client.query<ReadingRow>(
              `insert into catalog.readings(id,type,title,hindi_title,description,features,price_minor_units,practitioner_id,status,sort_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning ${columns}`,
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
                input.sortOrder,
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
            const result = await client.query<ReadingRow>(
              `update catalog.readings set type=$2,title=$3,hindi_title=$4,description=$5,features=$6,price_minor_units=$7,practitioner_id=$8,status=$9,sort_order=$10 where id=$1 and revision=$11 returning ${columns}`,
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
                input.sortOrder,
                input.revision,
              ],
            );
            if (!result.rows[0])
              throw new HttpError(
                409,
                'This reading changed or is unavailable. Reload it before saving.',
                'REVISION_CONFLICT',
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
