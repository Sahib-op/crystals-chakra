import type { Client } from 'pg';
import { services } from '../../shared/catalog.ts';

// Explicit initial catalogue import. Never overwrite subsequently edited studio content.
export async function seedCatalogue(client: Client): Promise<void> {
  await client.query('begin');
  try {
    await client.query(
      `insert into catalog.practitioners(slug,name,published) values ('amanpreet-kaur','Amanpreet Kaur',true) on conflict(slug) do nothing`,
    );
    const practitioner = await client.query<{ id: string }>(
      "select id from catalog.practitioners where slug='amanpreet-kaur'",
    );
    for (const [index, reading] of services.entries()) {
      await client.query(
        `insert into catalog.readings(id,type,title,hindi_title,description,features,price_minor_units,contact_destination,practitioner_id,status,sort_order)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10) on conflict(id) do nothing`,
        [
          reading.id,
          reading.type,
          reading.title,
          reading.hindiTitle,
          reading.description,
          reading.features,
          reading.price === null ? null : reading.price * 100,
          reading.contactDestination,
          reading.type === 'tarot' ? practitioner.rows[0]?.id : null,
          index,
        ],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
