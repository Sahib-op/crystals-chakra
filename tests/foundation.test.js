import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import Fastify from 'fastify';
import { loadConfig, isAllowedOrigin } from '../server/config.ts';
import { createApp } from '../server/app.ts';
import { readingRoutes } from '../server/routes/readings.ts';
import { services, isReadingCatalog } from '../shared/catalog.ts';

const config = () => loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'info' });
const variant = 'gid://shopify/ProductVariant/1';

test('production configuration fails closed without reflecting supplied secrets', () => {
  const valid = loadConfig({
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://studio.example',
    PORT: '3001',
    HOST: '0.0.0.0',
  });
  assert.equal(valid.frontendOrigin, 'https://studio.example');
  assert.equal(isAllowedOrigin('http://localhost:5175', valid), false);
  assert.equal(isAllowedOrigin('http://localhost:5175', config()), true);
  for (const env of [
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', FRONTEND_URL: 'http://studio.example' },
    { FRONTEND_URL: 'https://studio.example/path' },
    { FRONTEND_URL: 'https://private-secret@studio.example' },
    { PORT: '3e999' },
    { PORT: '0' },
    { PORT: '1.2' },
    { NODE_ENV: 'invalid' },
    { LOG_LEVEL: 'invalid' },
    { SHOPIFY_STORE_DOMAIN: 'example.myshopify.com' },
    { SHOPIFY_STOREFRONT_TOKEN: 'private-secret' },
    {
      SHOPIFY_STORE_DOMAIN: 'https://private-secret.example',
      SHOPIFY_STOREFRONT_TOKEN: 'private-secret',
    },
  ]) {
    assert.throws(
      () => loadConfig(env),
      (error) => !error.message.includes('private-secret'),
    );
  }
});

test('generated reading contract rejects unknown fields and unsafe or unbounded values', () => {
  assert.equal(isReadingCatalog(services), true);
  for (const changes of [
    { contactDestination: 'untrusted' },
    { phone: '12345678' },
    { price: '699' },
    { price: 1.5 },
    { price: 10000001 },
    { features: [] },
    { features: Array(13).fill('feature') },
    { practitioner: { name: 'Reader', email: 'private@example.com' } },
    { hindiTitle: '🙂'.repeat(161) },
  ])
    assert.equal(isReadingCatalog([{ ...services[0], ...changes }]), false);
  assert.equal(
    isReadingCatalog([{ ...services[0], hindiTitle: '🙂'.repeat(160) }]),
    true,
  );
});

test('published catalogue can contain several tarot readings or no readings', async () => {
  const app = Fastify();
  const secondTarot = {
    ...services[0],
    id: 'tarot-two',
    title: 'Second Tarot Reading',
  };
  let published = [services[0], secondTarot];
  try {
    await app.register((instance) =>
      readingRoutes(instance, async () => published),
    );
    for (const expected of [[services[0], secondTarot], [secondTarot], []]) {
      published = expected;
      const response = await app.inject('/api/services');
      assert.equal(response.statusCode, 200);
      const result = response.json();
      assert.deepEqual(result, expected);
      assert.equal(isReadingCatalog(result), true);
    }
  } finally {
    await app.close();
  }
});

test('API contract and server-generated request identity stay consistent', async () => {
  const app = await createApp({ config: config(), logging: false });
  try {
    const catalogue = await app.inject({
      url: '/api/services',
      headers: { 'x-request-id': 'caller-controlled-secret' },
    });
    assert.deepEqual(catalogue.json(), services);
    const id = catalogue.headers['x-request-id'];
    assert.match(id, /^[a-f0-9-]{36}$/);
    assert.notEqual(id, 'caller-controlled-secret');
    const missing = await app.inject(
      '/api/not-a-route?email=private@example.com',
    );
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().code, 'NOT_FOUND');
    assert.equal(missing.json().requestId, missing.headers['x-request-id']);
    assert.equal(missing.body.includes('private@example.com'), false);
    const spec = (await app.inject('/api/openapi.json')).json();
    assert.equal(spec.openapi, '3.0.3');
    assert.ok(spec.paths['/api/services'].get.responses['200']);
    assert.equal(spec.paths['/api/bookings'].post.deprecated, true);
    assert.equal(spec.paths['/api/checkout'].post.requestBody.required, true);
  } finally {
    await app.close();
  }
});

test('checkout rejects extra fields and coercion before touching the provider', async () => {
  let calls = 0;
  const app = await createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      SHOPIFY_STORE_DOMAIN: 'example.myshopify.com',
      SHOPIFY_STOREFRONT_TOKEN: 'test-token',
    }),
    logging: false,
    commerce: {
      products: async () => ({}),
      checkout: async () => {
        calls++;
        return { checkoutUrl: 'https://example.myshopify.com/cart/test' };
      },
    },
  });
  try {
    for (const payload of [
      { variantId: variant, dob: '2000-01-01' },
      { variantId: 1 },
      { variantId: [variant] },
      {},
      null,
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify(payload),
      });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, 'INVALID_REQUEST');
    }
    assert.equal(calls, 0);
    const good = await app.inject({
      method: 'POST',
      url: '/api/checkout',
      payload: { variantId: variant },
    });
    assert.equal(good.statusCode, 201);
    assert.equal(calls, 1);
  } finally {
    await app.close();
  }
});

test('retired personal-data endpoints respond before attempting to decode submitted bodies', async () => {
  const app = await createApp({ config: config(), logging: false });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { 'content-type': 'text/plain' },
      payload: 'not-json-private-secret',
    });
    assert.equal(response.statusCode, 410);
    assert.equal(response.json().code, 'READING_ROUTE_RETIRED');
    assert.equal(response.body.includes('private-secret'), false);
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/api/checkout',
      headers: {
        origin: 'http://localhost:5175',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type',
      },
    });
    assert.equal(preflight.statusCode, 204);
    assert.equal(
      preflight.headers['access-control-allow-origin'],
      'http://localhost:5175',
    );
  } finally {
    await app.close();
  }
});

test('request logs exclude bodies, headers, query strings, raw paths and provider errors', async () => {
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const secret = 'unique-private-secret-8921';
  const app = await createApp({
    config: config(),
    logStream: stream,
    commerce: {
      products: async () => {
        throw new Error(secret);
      },
      checkout: async () => null,
    },
  });
  try {
    await app.inject({
      url: '/api/products?after=' + secret,
      headers: {
        authorization: 'Bearer ' + secret,
        cookie: 'session=' + secret,
        'x-request-id': secret,
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/checkout',
      payload: { variantId: variant, name: secret },
    });
    await app.inject('/api/private-' + secret);
    assert.equal(logs.includes(secret), false);
    const entries = logs.trim().split('\n').map(JSON.parse);
    assert.ok(
      entries.some((entry) => entry.failureCode === 'COLLECTION_UNAVAILABLE'),
    );
    assert.ok(
      entries.some(
        (entry) => entry.route === '/api/products' && entry.statusCode === 503,
      ),
    );
    assert.ok(
      entries.every((entry) => !('body' in entry) && !('req' in entry)),
    );
  } finally {
    await app.close();
  }
});

test('untrusted forwarded addresses cannot reset the bounded checkout limiter', async () => {
  const app = await createApp({ config: config(), logging: false });
  try {
    for (let index = 0; index < 30; index++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        headers: { 'x-forwarded-for': '198.51.100.' + index },
        payload: { variantId: variant },
      });
      assert.equal(response.statusCode, 503);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/checkout',
      headers: { 'x-forwarded-for': '203.0.113.9' },
      payload: { variantId: variant },
    });
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.json().code, 'RATE_LIMITED');
    assert.ok(Number(limited.headers['retry-after']) > 0);
  } finally {
    await app.close();
  }
});
