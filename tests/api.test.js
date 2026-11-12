import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, validBirthDate } from '../server/index.js';
import { createStore } from '../server/store.js';

test('birth dates reject impossible, malformed and future dates', () => {
  for (const date of [
    '2023-02-29',
    '2024-02-30',
    '2000-13-01',
    'x',
    '2024-1-01',
    '2999-01-01',
    null,
  ])
    assert.equal(validBirthDate(date), false);
  assert.equal(validBirthDate('2000-02-29'), true);
});
test('public catalogue includes tarot and retired personal-data routes return contact instead', async () => {
  const app = await createApp({ logging: false });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const base = 'http://127.0.0.1:' + app.server.address().port + '/api';
  try {
    const catalogue = await fetch(base + '/services').then((r) => r.json());
    assert.equal(catalogue.length, 4);
    assert.equal(catalogue.find((s) => s.id === 'tarot').price, null);
    for (const route of ['bookings', 'readings']) {
      const response = await fetch(base + '/' + route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Private Visitor',
          email: 'private@example.com',
          dob: '2000-01-01',
        }),
      });
      assert.equal(response.status, 410);
      const result = await response.json();
      assert.equal(new URL(result.contact.whatsapp).origin, 'https://wa.me');
      assert.equal(result.contact.telephone, 'tel:+919810228209');
      assert.equal(JSON.stringify(result).includes('Private Visitor'), false);
      assert.equal('id' in result, false);
    }
    assert.equal(
      (
        await fetch(base + '/checkout', {
          method: 'POST',
          headers: {
            Origin: 'https://untrusted.example',
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';

test('consultation survives closing and reopening the database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'chakra-test-'));
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, 'bookings.sqlite');
  try {
    const store = createStore();
    const booking = await store.book({
      name: 'Demo Visitor',
      email: 'demo@example.com',
      service: 'birhaat',
    });
    store.close();
    const db = new DatabaseSync(process.env.DATABASE_PATH);
    const row = db
      .prepare('SELECT * FROM bookings WHERE id = ?')
      .get(booking.id);
    assert.equal(row.email, 'demo@example.com');
    assert.equal(row.service, 'birhaat');
    db.close();
  } finally {
    if (previous === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previous;
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('chakra-test-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
test('checkout failures are safe and preview checkout cannot claim success', async () => {
  const app = await createApp({
    logging: false,
    commerce: {
      products: async () => ({
        mode: 'preview',
        products: [],
        nextCursor: null,
      }),
      checkout: async ([line]) => {
        if (line.variantId.endsWith('/1')) return null;
        throw new Error('private provider detail');
      },
    },
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const base = 'http://127.0.0.1:' + app.server.address().port + '/api';
  try {
    assert.equal(
      (await fetch(base + '/products').then((r) => r.json())).mode,
      'preview',
    );
    for (const id of ['1', '2']) {
      const r = await fetch(base + '/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: 'gid://shopify/ProductVariant/' + id,
        }),
      });
      assert.equal(r.status, 503);
      const error = await r.json();
      assert.equal(
        error.code,
        id === '1' ? 'CHECKOUT_DISABLED' : 'CHECKOUT_UNAVAILABLE',
      );
      assert.equal(
        JSON.stringify(error).includes('private provider detail'),
        false,
      );
    }
  } finally {
    await app.close();
  }
});

test('checkout validates real HTTP media types, payloads and byte limits', async () => {
  const app = await createApp({
    logging: false,
    commerce: {
      checkout: async () => ({
        checkoutUrl: 'https://example.myshopify.com/checkouts/test',
      }),
    },
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const base =
    'http://127.0.0.1:' + app.server.address().port + '/api/checkout';
  try {
    for (const [body, type, status] of [
      ['{}', 'text/plain', 415],
      ['bad', 'application/json', 400],
      ['[]', 'application/json', 400],
      [JSON.stringify({ variantId: 'not-a-variant' }), 'application/json', 400],
      [
        JSON.stringify({
          variantId: 'gid://shopify/ProductVariant/1',
          note: 'अ'.repeat(3000),
        }),
        'application/json',
        413,
      ],
    ]) {
      const response = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': type },
        body,
      });
      assert.equal(response.status, status);
    }
  } finally {
    await app.close();
  }
});
