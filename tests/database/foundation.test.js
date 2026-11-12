import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import {
  readFile,
  readdir,
  mkdtemp,
  copyFile,
  writeFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrate } from '../../server/database/migrate.ts';
import { seedCatalogue } from '../../server/database/seed.ts';
import { createDatabase } from '../../server/database/pool.ts';
import { databaseSettings } from '../../server/database/settings.ts';
import {
  importLegacy,
  validateLegacyBooking,
} from '../../server/database/legacy.ts';
import { services } from '../../shared/catalog.ts';
import { loadConfig } from '../../server/config.ts';
import { createApp } from '../../server/app.ts';

const adminUrl = new URL(
  process.env.TEST_DATABASE_URL || 'postgresql://missing:missing@invalid/test',
);
if (!['localhost', '127.0.0.1', '[::1]'].includes(adminUrl.hostname))
  throw new Error(
    'test:db requires an explicit local TEST_DATABASE_URL and creates its own disposable database',
  );
const suffix = randomBytes(6).toString('hex');
const dbName = 'chakra_test_' + suffix;
const loginRole = 'chakra_test_login_' + suffix;
const loginPassword = randomBytes(24).toString('hex');
const testUrl = new URL(adminUrl);
testUrl.pathname = '/' + dbName;
const runtimeUrl = new URL(testUrl);
runtimeUrl.username = loginRole;
runtimeUrl.password = loginPassword;
const ownerSession = randomUUID(),
  outsiderSession = randomUUID();
const migrationFiles = (
  await readdir(new URL('../../supabase/migrations/', import.meta.url))
)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const owner = randomUUID(),
  outsider = randomUUID();
const ownerClaims = { sub: owner, session_id: ownerSession, aal: 'aal2' };
const outsiderClaims = {
  sub: outsider,
  session_id: outsiderSession,
  aal: 'aal2',
};
let admin, root, db, app, initialMigrations;
const connection = () => new Client({ connectionString: testUrl.href });
const denied = (operation, code = '42501') =>
  assert.rejects(operation, (error) => error.code === code);

before(async () => {
  admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  await admin.query(`create database "${dbName}"`);
  root = connection();
  await root.connect();
  await root.query(
    await readFile(new URL('./bootstrap.sql', import.meta.url), 'utf8'),
  );
  await root.query(
    await readFile(new URL('./auth-shape.sql', import.meta.url), 'utf8'),
  );
  const concurrent = connection();
  await concurrent.connect();
  try {
    initialMigrations = await Promise.all([migrate(root), migrate(concurrent)]);
  } finally {
    await concurrent.end();
  }
  await seedCatalogue(root);
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
    maxConnections: 1,
    ssl: false,
  });
  await db.assertRestrictedRole();
});
after(async () => {
  await app?.close();
  await db?.close();
  await root?.end();
  if (admin) {
    assert.match(dbName, /^chakra_test_[a-f0-9]{12}$/);
    assert.match(loginRole, /^chakra_test_login_[a-f0-9]{12}$/);
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`drop role if exists "${loginRole}"`);
    await admin.end();
  }
});

test('versioned migrations serialize safely, reapply without changes, and preserve seeded catalogue', async () => {
  assert.equal(
    initialMigrations.reduce((a, b) => a + b, 0),
    migrationFiles.length,
  );
  assert.equal(await migrate(root), 0);
  await seedCatalogue(root);
  assert.equal(
    (
      await root.query(
        'select count(*)::integer as count from catalog.readings',
      )
    ).rows[0].count,
    4,
  );
  assert.deepEqual(await db.listPublished(), services);
  const flags = await root.query(
    "select relname,relrowsecurity from pg_class where oid in ('catalog.readings'::regclass,'studio.consultations'::regclass,'studio.owner_access'::regclass)",
  );
  assert.equal(flags.rows.length, 3);
  assert.ok(flags.rows.every((row) => row.relrowsecurity));
});

test('anonymous and signed-in outsiders cannot read private data or publish content', async () => {
  await denied(() =>
    db.transaction('anon', null, (client) =>
      client.query('select * from studio.consultations'),
    ),
  );
  await denied(() =>
    db.transaction('authenticated', outsiderClaims, (client) =>
      client.query('select * from studio.owner_access'),
    ),
  );
  const outsiderRows = await db.transaction(
    'authenticated',
    outsiderClaims,
    (client) => client.query('select * from studio.consultations'),
  );
  assert.equal(outsiderRows.rowCount, 0);
  await denied(() =>
    db.transaction('authenticated', outsiderClaims, (client) =>
      client.query(
        "insert into catalog.readings(id,type,title,description,features) values ('outsider','tarot','No','No',array['No'])",
      ),
    ),
  );
  await denied(() =>
    db.transaction('authenticated', ownerClaims, (client) =>
      client.query('truncate studio.consultations'),
    ),
  );
  await denied(() =>
    db.transaction('authenticated', ownerClaims, (client) =>
      client.query("update studio.audit_events set action='deleted'"),
    ),
  );
});

test('owner access requires active allowlisting and MFA, and drafts stay private', async () => {
  const id = 'draft-' + suffix;
  await denied(() =>
    db.transaction('authenticated', { ...ownerClaims, aal: 'aal1' }, (client) =>
      client.query(
        "insert into catalog.readings(id,type,title,description,features) values ($1,'tarot','Draft','Draft',array['Draft'])",
        [id],
      ),
    ),
  );
  await db.transaction('authenticated', ownerClaims, (client) =>
    client.query(
      "insert into catalog.readings(id,type,title,description,features) values ($1,'tarot','Draft','Draft',array['Draft'])",
      [id],
    ),
  );
  assert.equal(
    (await db.listPublished()).some((r) => r.id === id),
    false,
  );
  assert.equal(
    (
      await db.transaction('authenticated', ownerClaims, (client) =>
        client.query('select id from catalog.readings where id=$1', [id]),
      )
    ).rowCount,
    1,
  );
  await root.query(
    'update studio.owner_access set active=false where user_id=$1',
    [owner],
  );
  try {
    assert.equal(
      (
        await db.transaction('authenticated', ownerClaims, (client) =>
          client.query('select id from catalog.readings where id=$1', [id]),
        )
      ).rowCount,
      0,
    );
  } finally {
    await root.query(
      'update studio.owner_access set active=true where user_id=$1',
      [owner],
    );
  }
});

test('pooled transactions reset role and claims after success and failure', async () => {
  const owned = await db.transaction(
    'authenticated',
    ownerClaims,
    async (client) =>
      (
        await client.query(
          'select pg_backend_pid() as pid, auth.uid() as uid, studio.is_owner() as owner',
        )
      ).rows[0],
  );
  assert.equal(owned.uid, owner);
  assert.equal(owned.owner, true);
  await assert.rejects(() =>
    db.transaction('authenticated', ownerClaims, async () => {
      throw new Error('synthetic rollback');
    }),
  );
  const publicState = await db.transaction(
    'anon',
    null,
    async (client) =>
      (
        await client.query(
          'select pg_backend_pid() as pid,auth.uid() as uid,current_user as role',
        )
      ).rows[0],
  );
  assert.equal(publicState.pid, owned.pid);
  assert.equal(publicState.uid, null);
  assert.equal(publicState.role, 'anon');
});

test('PostgreSQL enforces exact money, references, feature limits and consultation states', async () => {
  for (const [sql, values, code] of [
    [
      "insert into studio.consultations(customer_name,email,channel,amount_minor_units) values ('Test Visitor','test@example.com','phone',$1)",
      [1.5],
      '22P02',
    ],
    [
      "insert into studio.consultations(customer_name,email,channel,amount_minor_units) values ('Test Visitor','test@example.com','phone',$1)",
      [-1],
      '23514',
    ],
    [
      "insert into studio.consultations(customer_name,email,channel,status) values ('Test Visitor','test@example.com','phone','paid')",
      [],
      '23514',
    ],
    [
      "insert into studio.consultations(customer_name,email,channel,reading_id) values ('Test Visitor','test@example.com','phone','missing-reading')",
      [],
      '23503',
    ],
    [
      "insert into catalog.readings(id,type,title,description,features) values ('bad-features','tarot','Test','Test',array[null]::text[])",
      [],
      '23514',
    ],
  ])
    await denied(
      () =>
        db.transaction('authenticated', ownerClaims, (client) =>
          client.query(sql, values),
        ),
      code,
    );
});

test('private updates and their non-PII audit records commit or roll back together', async () => {
  const id = randomUUID();
  await assert.rejects(() =>
    db.transaction('authenticated', ownerClaims, async (client) => {
      await client.query(
        "insert into studio.consultations(id,customer_name,email,channel) values ($1,'Synthetic Visitor','synthetic@example.com','whatsapp')",
        [id],
      );
      throw new Error('abort synthetic work');
    }),
  );
  assert.equal(
    (await root.query('select id from studio.consultations where id=$1', [id]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await root.query(
        'select id from studio.audit_events where entity_id=$1',
        [id],
      )
    ).rowCount,
    0,
  );
  await db.transaction('authenticated', ownerClaims, (client) =>
    client.query(
      "insert into studio.consultations(id,customer_name,email,channel,notes,created_by) values ($1,'Synthetic Visitor','synthetic@example.com','whatsapp','private-synthetic-notes',$2)",
      [id, outsider],
    ),
  );
  const original = (
    await root.query(
      'select created_at from studio.consultations where id=$1',
      [id],
    )
  ).rows[0].created_at;
  await db.transaction('authenticated', ownerClaims, (client) =>
    client.query(
      "update studio.consultations set status='scheduled',created_at='1900-01-01',revision=900 where id=$1",
      [id],
    ),
  );
  const updated = (
    await root.query(
      'select revision,created_at,payment_status,created_by,updated_by from studio.consultations where id=$1',
      [id],
    )
  ).rows[0];
  assert.equal(updated.created_by, owner);
  assert.equal(updated.updated_by, owner);
  assert.equal(updated.revision, 2);
  assert.equal(updated.created_at.toISOString(), original.toISOString());
  assert.equal(updated.payment_status, 'unrecorded');
  const audit = (
    await root.query(
      'select * from studio.audit_events where entity_id=$1 order by occurred_at',
      [id],
    )
  ).rows;
  assert.equal(audit.length, 2);
  assert.ok(audit.every((row) => row.actor_id === owner));
  assert.equal(
    JSON.stringify(audit).includes('private-synthetic-notes'),
    false,
  );
});

test('legacy imports preserve identity and provenance, deduplicate concurrently and reject changed rows atomically', async () => {
  const row = {
    id: randomUUID(),
    name: 'Legacy Test',
    email: 'legacy@example.com',
    service: 'bhrigu',
    status: 'contacted',
    created_at: '2025-05-01T10:00:00.000Z',
  };
  const other = connection();
  await other.connect();
  try {
    const results = await Promise.all([
      importLegacy(root, 'synthetic_archive', [row]),
      importLegacy(other, 'synthetic_archive', [row]),
    ]);
    assert.equal(
      results.reduce((count, result) => count + result.imported, 0),
      1,
    );
    assert.equal(
      results.reduce((count, result) => count + result.unchanged, 0),
      1,
    );
  } finally {
    await other.end();
  }
  const imported = (
    await root.query(
      `select c.*,i.original_status,i.legacy_id from studio.consultations c join studio.legacy_imports i on i.consultation_id=c.id where i.source_key=$1 and i.legacy_id=$2`,
      ['synthetic_archive', row.id],
    )
  ).rows[0];
  assert.equal(imported.legacy_id, row.id);
  assert.equal(imported.original_status, 'contacted');
  assert.equal(imported.consent_status, 'unknown');
  assert.equal(imported.payment_status, 'unrecorded');
  assert.equal(imported.created_at.toISOString(), row.created_at);
  const newId = randomUUID();
  await assert.rejects(
    () =>
      importLegacy(root, 'synthetic_archive', [
        { ...row, id: newId },
        { ...row, name: 'Changed Test' },
      ]),
    /differs/,
  );
  assert.equal(
    (
      await root.query(
        'select * from studio.legacy_imports where legacy_id=$1',
        [newId],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await root.query(
        "select count(*)::integer as count from studio.consultations where channel='legacy_email'",
      )
    ).rows[0].count,
    1,
  );
});

test('migration failures roll back DDL and history, and edited applied SQL is refused', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'chakra-migration-'));
  const first = '202611070001_studio_foundation.sql';
  try {
    for (const name of migrationFiles)
      await copyFile(
        new URL('../../supabase/migrations/' + name, import.meta.url),
        join(directory, name),
      );
    await writeFile(
      join(directory, '202611070099_failure.sql'),
      'create table studio.must_not_survive(id integer); select 1/0;',
    );
    const url = pathToFileURL(directory + sep);
    await assert.rejects(
      () => migrate(root, url),
      (error) => error.code === '22012',
    );
    assert.equal(
      (
        await root.query(
          "select to_regclass('studio.must_not_survive') as table_name",
        )
      ).rows[0].table_name,
      null,
    );
    assert.equal(
      (
        await root.query(
          'select count(*)::integer as count from chakra_meta.migrations',
        )
      ).rows[0].count,
      migrationFiles.length,
    );
    await writeFile(join(directory, first), '-- changed applied migration');
    await assert.rejects(() => migrate(root, url), /checksum/);
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('chakra-migration-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('API uses the restricted PostgreSQL catalogue and refuses privileged runtime credentials', async () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: runtimeUrl.href,
    DATABASE_POOL_MAX: '1',
  });
  app = await createApp({ config, logging: false });
  const response = await app.inject('/api/services');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), services);
  await root.query('revoke select on catalog.readings from anon');
  try {
    const unavailable = await app.inject('/api/services');
    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.json().code, 'CATALOGUE_UNAVAILABLE');
    assert.equal(unavailable.body.includes('catalog.readings'), false);
  } finally {
    await root.query('grant select on catalog.readings to anon');
  }
  const bad = loadConfig({ NODE_ENV: 'test', DATABASE_URL: testUrl.href });
  await assert.rejects(
    () => createApp({ config: bad, logging: false }),
    /restricted/,
  );
});

test('SQLite import CLI is read-only by default, preserves timestamp precision and leaves its source unchanged', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'chakra-archive-'));
  const source = join(directory, 'synthetic.sqlite');
  const row = {
    id: randomUUID(),
    name: 'Archive Fixture',
    email: 'fixture@example.com',
    service: 'birhaat',
    status: 'requested',
    created_at: '2025-01-01T10:00:00.123456Z',
  };
  const sqlite = new DatabaseSync(source);
  sqlite.exec(
    'create table bookings(id text,name text,email text,service text,status text,created_at text)',
  );
  sqlite
    .prepare('insert into bookings values(?,?,?,?,?,?)')
    .run(row.id, row.name, row.email, row.service, row.status, row.created_at);
  sqlite.close();
  const checksum = () =>
    readFile(source).then((bytes) =>
      createHash('sha256').update(bytes).digest('hex'),
    );
  const original = await checksum();
  const command = (apply = false) =>
    spawnSync(
      process.execPath,
      [
        'scripts/import-legacy.ts',
        '--source',
        source,
        '--source-key',
        'sqlite_fixture',
        ...(apply ? ['--apply'] : []),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          MIGRATION_DATABASE_URL: testUrl.href,
        },
        timeout: 15000,
      },
    );
  try {
    const preview = command();
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Validated 1/);
    assert.equal(
      (
        await root.query(
          "select * from studio.legacy_imports where source_key='sqlite_fixture'",
        )
      ).rowCount,
      0,
    );
    const applied = command(true);
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(applied.stdout).imported, 1);
    const retried = command(true);
    assert.equal(retried.status, 0, retried.stderr);
    assert.equal(JSON.parse(retried.stdout).unchanged, 1);
    assert.equal(await checksum(), original);
    assert.equal(applied.stdout.includes(row.email), false);
    const precision = (
      await root.query(
        "select extract(microseconds from c.created_at)::integer as micros from studio.consultations c join studio.legacy_imports i on i.consultation_id=c.id where i.source_key='sqlite_fixture'",
      )
    ).rows[0].micros;
    assert.equal(precision, 123456);
    assert.throws(
      () =>
        validateLegacyBooking({ ...row, created_at: '2025-02-30T10:00:00Z' }),
      /Invalid legacy/,
    );
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('chakra-archive-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('database settings never disable remote certificate verification or accept URL overrides', () => {
  assert.equal(
    databaseSettings({ DATABASE_URL: runtimeUrl.href, NODE_ENV: 'test' }).ssl,
    false,
  );
  assert.equal(
    databaseSettings({
      DATABASE_URL: 'postgresql://app:password@db.example.com/studio',
    }).ssl.rejectUnauthorized,
    true,
  );
  assert.throws(
    () =>
      databaseSettings({ DATABASE_URL: runtimeUrl.href + '?sslmode=disable' }),
    /query options/,
  );
  assert.throws(
    () =>
      databaseSettings({
        DATABASE_URL: runtimeUrl.href,
        DATABASE_POOL_MAX: '99',
      }),
    /POOL_MAX/,
  );
});

test('private Postgres legacy-table import is preview-first and retains its untouched source', async () => {
  await root.query(`create table public.bookings(id uuid primary key,name text,email text,service text,status text,created_at timestamptz);
    alter table public.bookings enable row level security;
    revoke all on public.bookings from anon,authenticated`);
  const id = randomUUID();
  await root.query(
    "insert into public.bookings values($1,'Postgres Fixture','pg-fixture@example.com','parashara','closed','2025-01-01T03:04:05.654321Z')",
    [id],
  );
  const sourceBefore = (
    await root.query(
      'select row_to_json(b)::text as row from public.bookings b',
    )
  ).rows[0].row;
  const command = (apply = false) =>
    spawnSync(
      process.execPath,
      [
        'scripts/import-legacy.ts',
        '--from-postgres',
        '--source-key',
        'postgres_fixture',
        ...(apply ? ['--apply'] : []),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          MIGRATION_DATABASE_URL: testUrl.href,
        },
        timeout: 15000,
      },
    );
  const preview = command();
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /Validated 1/);
  assert.equal(
    (
      await root.query(
        "select * from studio.legacy_imports where source_key='postgres_fixture'",
      )
    ).rowCount,
    0,
  );
  const applied = command(true);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).imported, 1);
  assert.equal(
    (
      await root.query(
        'select row_to_json(b)::text as row from public.bookings b',
      )
    ).rows[0].row,
    sourceBefore,
  );
  const record = (
    await root.query(
      "select i.legacy_id,i.original_status,c.consent_status,to_char(c.created_at,'US') as micros from studio.legacy_imports i join studio.consultations c on c.id=i.consultation_id where i.source_key='postgres_fixture'",
    )
  ).rows[0];
  assert.equal(record.legacy_id, id);
  assert.equal(record.original_status, 'closed');
  assert.equal(record.consent_status, 'unknown');
  assert.equal(record.micros, '654321');
  assert.equal(applied.stdout.includes('pg-fixture@example.com'), false);
});

test('signed owner API enforces current sessions, MFA, RLS and safe publication', async (t) => {
  const { createServer } = await import('node:http');
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
  const key = await generateKeyPair('ES256');
  const pub = await exportJWK(key.publicKey);
  pub.kid = 'studio-integration';
  pub.alg = 'ES256';
  const jwks = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [pub] }));
  });
  await new Promise((resolve) => jwks.listen(0, '127.0.0.1', resolve));
  const authUrl = 'http://127.0.0.1:' + jwks.address().port;
  const privateApp = await createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: runtimeUrl.href,
      DATABASE_POOL_MAX: '1',
      SUPABASE_URL: authUrl,
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_public_key',
    }),
    logging: false,
  });
  async function credential(changes = {}) {
    const now = Math.floor(Date.now() / 1000);
    return (
      'Bearer ' +
      (await new SignJWT({
        sub: owner,
        session_id: ownerSession,
        role: 'authenticated',
        aal: 'aal2',
        is_anonymous: false,
        iat: now,
        exp: now + 900,
        iss: authUrl + '/auth/v1',
        aud: 'authenticated',
        ...changes,
      })
        .setProtectedHeader({ alg: 'ES256', kid: pub.kid })
        .sign(key.privateKey))
    );
  }
  const auth = await credential();
  const call = (url, method = 'GET', payload, authorization = auth) =>
    privateApp.inject({
      url,
      method,
      headers: {
        ...(authorization ? { authorization } : {}),
        'content-type': 'application/json',
      },
      ...(payload !== undefined ? { payload } : {}),
    });
  try {
    await t.test(
      'unauthenticated and outsider callers cannot list or write studio content',
      async () => {
        assert.equal(
          (await call('/api/studio/readings', 'GET', undefined, '')).statusCode,
          401,
        );
        assert.equal(
          (
            await call(
              '/api/studio/readings',
              'GET',
              undefined,
              await credential({ sub: outsider, session_id: outsiderSession }),
            )
          ).statusCode,
          403,
        );
        assert.equal(
          (
            await call(
              '/api/studio/readings',
              'GET',
              undefined,
              await credential({ session_id: outsiderSession }),
            )
          ).statusCode,
          403,
        );
        const config = (
          await call('/api/studio-config', 'GET', undefined, '')
        ).json();
        assert.equal(config.configured, true);
        assert.equal(
          config.publishableKey,
          'sb_publishable_fixture_public_key',
        );
      },
    );
    await t.test(
      'password-only sessions can reach the MFA gate but receive no private content',
      async () => {
        const first = await credential({ aal: 'aal1' });
        const gate = await call('/api/studio/session', 'GET', undefined, first);
        assert.equal(gate.statusCode, 200);
        assert.equal(gate.json().mfaRequired, true);
        const denied = await call(
          '/api/studio/readings',
          'POST',
          'malformed-private-body',
          first,
        );
        assert.equal(denied.statusCode, 403);
        assert.equal(denied.json().code, 'MFA_REQUIRED');
      },
    );
    await t.test(
      'bans, removed factors, revoked sessions and owner removal deny still-signed tokens',
      async () => {
        await root.query(
          "update auth.users set banned_until=now()+interval '1 hour' where id=$1",
          [owner],
        );
        try {
          assert.equal((await call('/api/studio/readings')).statusCode, 403);
        } finally {
          await root.query(
            'update auth.users set banned_until=null where id=$1',
            [owner],
          );
        }
        await root.query(
          "update auth.mfa_factors set status='unverified' where user_id=$1",
          [owner],
        );
        try {
          assert.equal(
            (await call('/api/studio/readings')).json().code,
            'MFA_REQUIRED',
          );
        } finally {
          await root.query(
            "update auth.mfa_factors set status='verified' where user_id=$1",
            [owner],
          );
        }
        await root.query('delete from auth.sessions where id=$1', [
          ownerSession,
        ]);
        try {
          assert.equal((await call('/api/studio/readings')).statusCode, 403);
        } finally {
          await root.query(
            "insert into auth.sessions(id,user_id,aal) values($1,$2,'aal2')",
            [ownerSession, owner],
          );
        }
        await root.query(
          'update studio.owner_access set active=false where user_id=$1',
          [owner],
        );
        try {
          assert.equal((await call('/api/studio/readings')).statusCode, 403);
        } finally {
          await root.query(
            'update studio.owner_access set active=true where user_id=$1',
            [owner],
          );
        }
      },
    );
    await t.test(
      'draft/save/publish/archive uses revisions and changes the public catalogue safely',
      async () => {
        const draft = {
          id: 'studio-' + suffix,
          type: 'astrology',
          title: 'Synthetic Studio Reading',
          hindiTitle: null,
          description: 'Synthetic draft for the studio integration test.',
          features: ['An approved test feature'],
          priceMinor: 69900,
          practitionerId: null,
          status: 'draft',
          sortOrder: 10,
        };
        const created = await call('/api/studio/readings', 'POST', draft);
        assert.equal(created.statusCode, 201);
        assert.equal(created.json().revision, 1);
        assert.equal(
          (await db.listPublished()).some((row) => row.id === draft.id),
          false,
        );
        const { id, ...fields } = draft;
        const published = await call('/api/studio/readings/' + id, 'PATCH', {
          ...fields,
          status: 'published',
          revision: 1,
        });
        assert.equal(published.statusCode, 200);
        assert.equal(published.json().revision, 2);
        assert.equal(
          (await db.listPublished()).find((row) => row.id === id).price,
          699,
        );
        const stale = await call('/api/studio/readings/' + id, 'PATCH', {
          ...fields,
          title: 'Stale edit',
          revision: 1,
        });
        assert.equal(stale.statusCode, 409);
        assert.equal(stale.json().code, 'REVISION_CONFLICT');
        const history = await call('/api/studio/readings/' + id + '/history');
        assert.deepEqual(
          history.json().map((row) => row.revision),
          [2, 1],
        );
        assert.equal(history.headers['cache-control'], 'no-store');
        const archived = await call('/api/studio/readings/' + id, 'PATCH', {
          ...fields,
          status: 'archived',
          revision: 2,
        });
        assert.equal(archived.statusCode, 200);
        assert.equal(
          (await db.listPublished()).some((row) => row.id === id),
          false,
        );
        assert.equal(
          (await call('/api/studio/readings', 'POST', draft)).statusCode,
          409,
        );
      },
    );
    await t.test(
      'schema and publication rules reject unapproved or extra fields before mutation',
      async () => {
        const base = {
          id: 'bad-studio-' + suffix,
          type: 'tarot',
          title: 'Synthetic',
          hindiTitle: null,
          description: 'Synthetic',
          features: ['Test'],
          priceMinor: null,
          practitionerId: null,
          status: 'published',
          sortOrder: 0,
        };
        const noReader = await call('/api/studio/readings', 'POST', base);
        assert.equal(noReader.statusCode, 400);
        const unknown = await call('/api/studio/readings', 'POST', {
          ...base,
          status: 'draft',
          created_by: outsider,
        });
        assert.equal(unknown.statusCode, 400);
        const decimal = await call('/api/studio/readings', 'POST', {
          ...base,
          status: 'draft',
          priceMinor: 699.5,
        });
        assert.equal(decimal.statusCode, 400);
        assert.equal(
          (
            await root.query('select id from catalog.readings where id=$1', [
              base.id,
            ])
          ).rowCount,
          0,
        );
      },
    );
    await t.test(
      'a session revoked after the API gate cannot use its database write privileges',
      async () => {
        await root.query('delete from auth.sessions where id=$1', [
          ownerSession,
        ]);
        try {
          await denied(() =>
            db.transaction('authenticated', ownerClaims, (client) =>
              client.query(
                "insert into catalog.readings(id,type,title,description,features) values('revoked-write','astrology','Test','Test',array['Test'])",
              ),
            ),
          );
        } finally {
          await root.query(
            "insert into auth.sessions(id,user_id,aal) values($1,$2,'aal2')",
            [ownerSession, owner],
          );
        }
      },
    );
  } finally {
    await privateApp.close();
    await new Promise((resolve) => jwks.close(resolve));
  }
});
