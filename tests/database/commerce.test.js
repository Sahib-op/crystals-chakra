import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { migrate } from '../../server/database/migrate.ts';
import { createDatabase } from '../../server/database/pool.ts';

const adminUrl = new URL(
  process.env.TEST_DATABASE_URL || 'postgresql://missing:missing@invalid/test',
);
if (!['localhost', '127.0.0.1', '[::1]'].includes(adminUrl.hostname))
  throw new Error('test:db requires an explicit local TEST_DATABASE_URL');
const suffix = randomBytes(6).toString('hex');
const dbName = 'chakra_test_' + suffix;
const loginRole = 'chakra_test_login_' + suffix;
const loginPassword = randomBytes(24).toString('hex');
const testUrl = new URL(adminUrl);
testUrl.pathname = '/' + dbName;
const runtimeUrl = new URL(testUrl);
runtimeUrl.username = loginRole;
runtimeUrl.password = loginPassword;
const owner = randomUUID(),
  ownerSession = randomUUID(),
  outsider = randomUUID(),
  outsiderSession = randomUUID();
let admin, root, db;

const ORDER_ID = '820982911946154508';
const delivery = (webhookId, topic = 'orders/paid') => ({
  webhookId,
  eventId: randomUUID(),
  topic,
  payloadSha256: 'a'.repeat(64),
});
const projection = (updatedAt, overrides = {}) => ({
  shopifyOrderId: ORDER_ID,
  name: '#1001',
  financialStatus: 'paid',
  fulfillmentStatus: null,
  currency: 'INR',
  totalMinor: 149900,
  itemCount: 3,
  cancelledAt: null,
  createdAt: '2026-11-12T04:30:00.000Z',
  updatedAt,
  ...overrides,
});
const asRole = async (role, claims, sql) => {
  await root.query('begin');
  try {
    await root.query(`set local role ${role}`);
    await root.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify(claims ?? {}),
    ]);
    return await root.query(sql);
  } finally {
    await root.query('rollback');
  }
};

before(async () => {
  admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  await admin.query(`create database "${dbName}"`);
  root = new Client({ connectionString: testUrl.href });
  await root.connect();
  await root.query(
    await readFile(new URL('./bootstrap.sql', import.meta.url), 'utf8'),
  );
  await root.query(
    await readFile(new URL('./auth-shape.sql', import.meta.url), 'utf8'),
  );
  await migrate(root);
  await root.query('insert into auth.users(id) values($1),($2)', [
    owner,
    outsider,
  ]);
  await root.query(
    "insert into auth.sessions(id,user_id,aal) values($1,$2,'aal2'),($3,$4,'aal2')",
    [ownerSession, owner, outsiderSession, outsider],
  );
  await root.query(
    "insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')",
    [randomUUID(), owner],
  );
  await root.query('insert into studio.owner_access(user_id) values($1)', [
    owner,
  ]);
  await admin.query(
    `create role "${loginRole}" login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password '${loginPassword}'`,
  );
  await admin.query(`grant chakra_runtime to "${loginRole}"`);
  db = createDatabase({
    connectionString: runtimeUrl.href,
    maxConnections: 2,
    ssl: false,
  });
  await db.assertRestrictedRole();
});

after(async () => {
  await db?.close();
  await root?.end();
  if (admin) {
    assert.match(dbName, /^chakra_test_[a-f0-9]{12}$/);
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`drop role if exists "${loginRole}"`);
    await admin.end();
  }
});

test('order deliveries apply once, ignore redelivery and never regress to older state', async () => {
  assert.equal(
    await db.recordShopifyDelivery(
      delivery('d-1'),
      projection('2026-11-12T04:35:00.000Z'),
    ),
    'applied',
  );
  // Redelivery of the same webhook, even with altered content, changes nothing.
  assert.equal(
    await db.recordShopifyDelivery(
      delivery('d-1'),
      projection('2026-11-12T09:00:00.000Z', { financialStatus: 'refunded' }),
    ),
    'duplicate',
  );
  // An older update arriving late is recorded but does not overwrite.
  assert.equal(
    await db.recordShopifyDelivery(
      delivery('d-0', 'orders/create'),
      projection('2026-11-12T04:30:00.000Z', { financialStatus: 'pending' }),
    ),
    'stale',
  );
  assert.equal(
    await db.recordShopifyDelivery(
      delivery('d-2', 'orders/fulfilled'),
      projection('2026-11-12T06:00:00.000Z', {
        fulfillmentStatus: 'fulfilled',
      }),
    ),
    'applied',
  );
  const row = (
    await root.query(
      'select shopify_order_id::text as id, financial_status, fulfillment_status, total_minor from commerce.orders',
    )
  ).rows;
  assert.deepEqual(row, [
    {
      id: ORDER_ID,
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      total_minor: '149900',
    },
  ]);
  const outcomes = (
    await root.query(
      'select webhook_id, outcome from commerce.webhook_deliveries order by webhook_id',
    )
  ).rows.map((r) => `${r.webhook_id}:${r.outcome}`);
  assert.deepEqual(outcomes, ['d-0:stale', 'd-1:applied', 'd-2:applied']);
  assert.equal(
    await db.recordShopifyDelivery(delivery('d-3', 'app/uninstalled'), null),
    'ignored',
  );
});

test('concurrent redeliveries of one webhook produce exactly one application', async () => {
  const results = await Promise.all([
    db.recordShopifyDelivery(
      delivery('race'),
      projection('2026-11-12T07:00:00.000Z'),
    ),
    db.recordShopifyDelivery(
      delivery('race'),
      projection('2026-11-12T07:00:00.000Z'),
    ),
  ]);
  assert.deepEqual(results.sort(), ['applied', 'duplicate']);
  assert.equal(
    (
      await root.query(
        "select count(*)::int as n from commerce.webhook_deliveries where webhook_id='race'",
      )
    ).rows[0].n,
    1,
  );
});

test('only the verified owner can read orders; browser roles cannot write; the writer cannot read studio data', async () => {
  const denied = (promise) =>
    assert.rejects(promise, (error) => error.code === '42501');
  await denied(asRole('anon', null, 'select * from commerce.orders'));
  await denied(
    asRole(
      'authenticated',
      { sub: owner, session_id: ownerSession, aal: 'aal2' },
      "insert into commerce.webhook_deliveries(webhook_id,topic,payload_sha256,outcome) values ('x','orders/paid','" +
        'a'.repeat(64) +
        "','applied')",
    ),
  );
  const outsiderRows = await asRole(
    'authenticated',
    { sub: outsider, session_id: outsiderSession, aal: 'aal2' },
    'select * from commerce.orders',
  );
  assert.equal(outsiderRows.rowCount, 0);
  const ownerRows = await asRole(
    'authenticated',
    { sub: owner, session_id: ownerSession, aal: 'aal2' },
    'select name from commerce.orders',
  );
  assert.equal(ownerRows.rowCount, 1);
  // Without MFA (aal1) even the owner is refused by the RLS helper.
  const ownerAal1 = await asRole(
    'authenticated',
    { sub: owner, session_id: ownerSession, aal: 'aal1' },
    'select name from commerce.orders',
  );
  assert.equal(ownerAal1.rowCount, 0);
  await denied(
    asRole(
      'chakra_commerce_writer',
      null,
      'select * from studio.consultations',
    ),
  );
  await denied(
    asRole('chakra_commerce_writer', null, 'select * from studio.owner_access'),
  );
  await denied(
    asRole('chakra_commerce_writer', null, 'delete from commerce.orders'),
  );
  const writer = (
    await root.query(
      "select rolcanlogin, rolinherit, rolbypassrls, rolsuper from pg_roles where rolname='chakra_commerce_writer'",
    )
  ).rows[0];
  assert.deepEqual(writer, {
    rolcanlogin: false,
    rolinherit: false,
    rolbypassrls: false,
    rolsuper: false,
  });
});

test('readiness ping uses the restricted runtime connection', async () => {
  await db.ping();
});
