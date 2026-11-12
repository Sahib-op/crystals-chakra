import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApp } from '../server/app.ts';
import { loadConfig } from '../server/config.ts';
import {
  orderProjection,
  toMinorUnits,
  verifyShopifySignature,
} from '../server/commerce/webhooks.ts';

const SECRET = 'whsec_' + 'a'.repeat(40);
const SHOP = 'crystals-test.myshopify.com';
const sign = (body, secret = SECRET) =>
  createHmac('sha256', secret).update(body).digest('base64');
const order = (overrides = {}) => ({
  id: 820982911946154500, // precision already lost, as in real JSON.parse
  admin_graphql_api_id: 'gid://shopify/Order/820982911946154508',
  name: '#1001',
  email: 'private.customer@example.com',
  phone: '+919999999999',
  customer: { first_name: 'Private', last_name: 'Customer' },
  shipping_address: { address1: '1 Private Lane' },
  financial_status: 'paid',
  fulfillment_status: null,
  currency: 'INR',
  current_total_price: '1499.00',
  line_items: [{ quantity: 2 }, { quantity: 1 }],
  cancelled_at: null,
  created_at: '2026-11-12T10:00:00+05:30',
  updated_at: '2026-11-12T10:05:00+05:30',
  ...overrides,
});

function fakeStore() {
  const seen = new Map();
  const calls = [];
  return {
    calls,
    async recordShopifyDelivery(delivery, projection) {
      calls.push({ delivery, projection });
      if (seen.has(delivery.webhookId)) return 'duplicate';
      seen.set(delivery.webhookId, true);
      return projection ? 'applied' : 'ignored';
    },
  };
}

async function webhookApp(store = fakeStore(), env = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    SHOPIFY_STORE_DOMAIN: SHOP,
    SHOPIFY_STOREFRONT_TOKEN: 'storefront-token',
    SHOPIFY_WEBHOOK_SECRET: SECRET,
    ...env,
  });
  const app = await createApp({ config, logging: false, webhookStore: store });
  return { app, store };
}

function deliver(app, body, headers = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return app.inject({
    method: 'POST',
    url: '/api/webhooks/shopify',
    payload: raw,
    headers: {
      'content-type': 'application/json',
      'x-shopify-hmac-sha256': sign(raw),
      'x-shopify-shop-domain': SHOP,
      'x-shopify-topic': 'orders/paid',
      'x-shopify-webhook-id': 'b54557e4-bdd9-4b37-8a5f-bf7d70bcd043',
      'x-shopify-event-id': '98880550-7158-44d4-b7cd-2c97c8a091b5',
      ...headers,
    },
  });
}

test('signature verification is exact, constant-length and rejects malformed headers', () => {
  const body = Buffer.from('{"id":1}');
  assert.equal(verifyShopifySignature(body, sign(body), SECRET), true);
  assert.equal(
    verifyShopifySignature(Buffer.from('{"id":2}'), sign(body), SECRET),
    false,
  );
  assert.equal(
    verifyShopifySignature(body, sign(body, 'x'.repeat(40)), SECRET),
    false,
  );
  for (const header of [undefined, '', 'abc', sign(body) + '=', 'Z'.repeat(44)])
    assert.equal(verifyShopifySignature(body, header, SECRET), false);
});

test('money converts exactly to minor units without floating point', () => {
  assert.equal(toMinorUnits('1499.00'), 149900);
  assert.equal(toMinorUnits('0.1'), 10);
  assert.equal(toMinorUnits('19.99'), 1999);
  assert.equal(toMinorUnits('1500', 0), 1500);
  assert.equal(toMinorUnits('1.234', 3), 1234);
  for (const bad of ['-1', '1e3', '1.999', '', '١٢٣', 12, null])
    assert.throws(() => toMinorUnits(bad));
});

test('order projection keeps operational state only and the exact 64-bit id', () => {
  const projection = orderProjection(order());
  assert.deepEqual(projection, {
    shopifyOrderId: '820982911946154508',
    name: '#1001',
    financialStatus: 'paid',
    fulfillmentStatus: null,
    currency: 'INR',
    totalMinor: 149900,
    itemCount: 3,
    cancelledAt: null,
    createdAt: '2026-11-12T04:30:00.000Z',
    updatedAt: '2026-11-12T04:35:00.000Z',
  });
  const serialized = JSON.stringify(projection);
  for (const secret of ['private.customer', '9999999999', 'Private', 'Lane'])
    assert.equal(serialized.includes(secret), false);
  for (const bad of [
    order({ admin_graphql_api_id: 'gid://shopify/Product/1' }),
    order({ financial_status: 'paid_in_full' }),
    order({ current_total_price: '12.345' }),
    order({ line_items: [{ quantity: -1 }] }),
    order({ updated_at: 'yesterday' }),
    order({ name: 'bad\nname' }),
  ])
    assert.throws(() => orderProjection(bad));
});

test('verified order webhook is applied once and redelivery is a no-op', async () => {
  const { app, store } = await webhookApp();
  try {
    const first = await deliver(app, order());
    assert.equal(first.statusCode, 200);
    assert.deepEqual(first.json(), { received: true, outcome: 'applied' });
    const again = await deliver(app, order());
    assert.equal(again.statusCode, 200);
    assert.equal(again.json().outcome, 'duplicate');
    assert.equal(
      store.calls[0].projection.shopifyOrderId,
      '820982911946154508',
    );
    assert.match(store.calls[0].delivery.payloadSha256, /^[a-f0-9]{64}$/);
  } finally {
    await app.close();
  }
});

test('tampered, unsigned or wrong-shop deliveries are rejected before parsing', async () => {
  const { app, store } = await webhookApp();
  try {
    const raw = JSON.stringify(order());
    const tampered = raw.replace('1499.00', '1.00');
    assert.equal(
      (await deliver(app, tampered, { 'x-shopify-hmac-sha256': sign(raw) }))
        .statusCode,
      401,
    );
    assert.equal(
      (await deliver(app, raw, { 'x-shopify-hmac-sha256': '' })).statusCode,
      401,
    );
    assert.equal(
      (
        await deliver(app, raw, {
          'x-shopify-shop-domain': 'someone-else.myshopify.com',
        })
      ).statusCode,
      401,
    );
    // A signed body that is not JSON is never parsed as an order unless the
    // topic needs it; a malformed order is refused so Shopify retries.
    assert.equal((await deliver(app, 'not json')).statusCode, 422);
    assert.equal(store.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('non-order topics are acknowledged without touching order state; headers are validated', async () => {
  const { app, store } = await webhookApp();
  try {
    const response = await deliver(
      app,
      { id: 1 },
      { 'x-shopify-topic': 'app/uninstalled' },
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().outcome, 'ignored');
    assert.equal(store.calls[0].projection, null);
    assert.equal(
      (await deliver(app, order(), { 'x-shopify-webhook-id': 'bad id!' }))
        .statusCode,
      400,
    );
    assert.equal(
      (await deliver(app, order(), { 'x-shopify-topic': 'ORDERS/PAID' }))
        .statusCode,
      400,
    );
  } finally {
    await app.close();
  }
});

test('oversized webhook bodies are refused and unconfigured intake reports 503', async () => {
  const { app } = await webhookApp();
  try {
    const big = JSON.stringify({ padding: 'x'.repeat(1024 * 1024) });
    assert.equal((await deliver(app, big)).statusCode, 413);
  } finally {
    await app.close();
  }
  const bare = await createApp({
    config: loadConfig({ NODE_ENV: 'test' }),
    logging: false,
  });
  try {
    const response = await deliver(bare, order());
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'WEBHOOKS_NOT_CONFIGURED');
    // The rest of the API keeps its strict 8 KB JSON limit.
    const checkout = await bare.inject({
      method: 'POST',
      url: '/api/checkout',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ variantId: 'x'.repeat(9000) }),
    });
    assert.equal(checkout.statusCode, 413);
  } finally {
    await bare.close();
  }
});

test('webhook secret configuration is validated', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'test', SHOPIFY_WEBHOOK_SECRET: SECRET }),
    /SHOPIFY_WEBHOOK_SECRET/,
  );
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'test',
        SHOPIFY_STORE_DOMAIN: SHOP,
        SHOPIFY_STOREFRONT_TOKEN: 't',
        SHOPIFY_WEBHOOK_SECRET: 'short',
      }),
    /SHOPIFY_WEBHOOK_SECRET/,
  );
});

test('readiness reports an unconfigured database honestly', async () => {
  const app = await createApp({
    config: loadConfig({ NODE_ENV: 'test' }),
    logging: false,
  });
  try {
    const response = await app.inject('/api/ready');
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: 'ready',
      database: 'not_configured',
    });
  } finally {
    await app.close();
  }
});
