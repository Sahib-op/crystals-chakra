import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommerce, hostedCheckoutUrl } from '../server/commerce.js';
import { createApp } from '../server/app.ts';
import { loadConfig } from '../server/config.ts';

const variant = (id) => 'gid://shopify/ProductVariant/' + id;
const selectedLines = [
  { variantId: variant(2), quantity: 3 },
  { variantId: variant(5), quantity: 1 },
];
const domain = 'example.myshopify.com';
const checkoutHost = 'checkout.example.com';
const storefront = {
  domain,
  token: 'test-token',
  checkoutHost,
};
const checkoutUrl = 'https://' + checkoutHost + '/cart/c/test';

test('checkout destinations require an explicit matching merchant host', async () => {
  assert.equal(hostedCheckoutUrl(checkoutUrl), null);
  assert.equal(hostedCheckoutUrl(checkoutUrl, { domain }), null);
  assert.equal(hostedCheckoutUrl(checkoutUrl, storefront), checkoutUrl);
  const app = await createApp({
    config: loadConfig({ NODE_ENV: 'test' }),
    commerce: {
      products: async () => ({}),
      checkout: async () => ({ checkoutUrl }),
    },
    logging: false,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/checkout',
      payload: { lines: selectedLines },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'CHECKOUT_UNAVAILABLE');
    assert.equal(response.body.includes(checkoutHost), false);
  } finally {
    await app.close();
  }
});

test('Shopify oversized streams are cancelled with missing or understated length', async () => {
  for (const length of [null, '1', '2097153']) {
    let cancelled = false;
    let chunks = 0;
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          chunks++;
          controller.enqueue(new Uint8Array(65536).fill(32));
        },
        cancel() {
          cancelled = true;
        },
      }),
      {
        headers: {
          'content-type': 'application/json',
          ...(length ? { 'content-length': length } : {}),
        },
      },
    );
    const shop = createCommerce({
      ...storefront,
      fetcher: async () => response,
    });
    await assert.rejects(() => shop.products(), /too large|unavailable/);
    assert.equal(cancelled, true);
    assert.ok(chunks <= 34, 'stream consumption must stop at the byte limit');
    assert.equal(response.body.locked, false);
  }
});

test('Shopify rejects malformed JSON, invalid UTF-8, and non-JSON bodies', async () => {
  for (const response of [
    new Response('<html>upstream outage</html>', {
      headers: { 'content-type': 'text/html' },
    }),
    new Response('{broken', {
      headers: { 'content-type': 'application/json' },
    }),
    new Response(new Uint8Array([0xff]), {
      headers: { 'content-type': 'application/json' },
    }),
    new Response(null, { status: 204 }),
    Response.json({ errors: [{ message: 'private provider detail' }] }),
  ]) {
    const shop = createCommerce({
      ...storefront,
      fetcher: async () => response,
    });
    await assert.rejects(() => shop.products());
    assert.equal(response.body?.locked ?? false, false);
  }
});

test('Shopify streaming failures remain recoverable and private over HTTP', async () => {
  const shop = createCommerce({
    ...storefront,
    fetcher: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error('private-provider-transport-detail'));
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
  });
  const app = await createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      SHOPIFY_STORE_DOMAIN: domain,
      SHOPIFY_STOREFRONT_TOKEN: 'test-token',
    }),
    commerce: shop,
    logging: false,
  });
  try {
    for (const request of [
      { method: 'GET', url: '/api/products' },
      {
        method: 'POST',
        url: '/api/checkout',
        payload: { lines: selectedLines },
      },
    ]) {
      const response = await app.inject(request);
      assert.equal(response.statusCode, 503);
      assert.equal(response.body.includes('private-provider'), false);
      assert.equal(response.headers['cache-control'], 'no-store');
    }
  } finally {
    await app.close();
  }
});

function fixture({
  unavailable,
  checkout = checkoutUrl,
  adjustQuantity,
  warn,
  badPrice,
} = {}) {
  const calls = [];
  const shop = createCommerce({
    ...storefront,
    fetcher: async (url, options) => {
      assert.equal(url, 'https://' + domain + '/api/2026-10/graphql.json');
      assert.equal(options.redirect, 'error');
      const { query, variables } = JSON.parse(options.body);
      const operation = query.match(/^(?:query|mutation) (\w+)/)?.[1];
      calls.push({ operation, variables });
      let data;
      if (operation === 'Collection') {
        const firstPage = variables.after === null;
        data = {
          products: {
            pageInfo: {
              hasNextPage: firstPage,
              endCursor: firstPage ? 'next-page' : null,
            },
            nodes: [
              {
                id: 'gid://shopify/Product/' + (firstPage ? '1' : '2'),
                title: 'Test crystal',
                description: 'A demo.',
                productType: 'Bracelets',
                featuredImage: {
                  url: 'https://cdn.shopify.com/test.jpg',
                  altText: 'Crystal',
                },
                variants: {
                  pageInfo: { hasNextPage: false },
                  nodes: (firstPage ? [1, 2] : [5]).map((id) => ({
                    id: variant(id),
                    title: 'Size ' + id,
                    availableForSale: id !== 1,
                    price: {
                      amount: badPrice ? 'none' : '1200.25',
                      currencyCode: 'INR',
                    },
                  })),
                },
              },
            ],
          },
        };
      } else if (operation === 'CheckoutVariants') {
        data = {
          nodes: variables.ids.map((id) =>
            id === variant(999) ? null : { id, availableForSale: !unavailable },
          ),
        };
      } else if (operation === 'CreateCheckout') {
        data = {
          cartCreate: {
            cart: {
              checkoutUrl: checkout,
              lines: {
                pageInfo: { hasNextPage: false },
                nodes: variables.input.lines.map((line, index) => ({
                  quantity: adjustQuantity && index === 0 ? 1 : line.quantity,
                  merchandise: { id: line.merchandiseId },
                })),
              },
            },
            userErrors: [],
            warnings: warn ? [{ code: 'MERCHANDISE_NOT_ENOUGH_STOCK' }] : [],
          },
        };
      } else throw new Error('Unexpected Shopify operation');
      return Response.json({ data });
    },
  });
  return { shop, calls };
}

test('preview products cannot create a checkout', async () => {
  const shop = createCommerce({ domain: '', token: '' });
  const catalog = await shop.products();
  assert.equal(catalog.mode, 'preview');
  assert.equal(catalog.products.length, 3);
  assert.equal(catalog.nextCursor, null);
  assert.ok(
    catalog.products.every(
      (p) => !p.available && p.variantId === null && p.variants.length === 0,
    ),
  );
  assert.equal(await shop.checkout(variant(1)), null);
});

test('Shopify adapter maps pages and multiple variants, including unavailable options', async () => {
  const { shop, calls } = fixture();
  const first = await shop.products();
  assert.equal(first.mode, 'live');
  assert.equal(first.nextCursor, 'next-page');
  assert.equal(first.products[0].amount, '1200.25');
  assert.deepEqual(
    first.products[0].variants.map(({ id, available }) => [id, available]),
    [
      [variant(1), false],
      [variant(2), true],
    ],
  );
  const second = await shop.products(first.nextCursor);
  assert.equal(second.nextCursor, null);
  assert.equal(second.products[0].variantId, variant(5));
  assert.equal(calls[1].variables.after, 'next-page');
});

test('Shopify checkout supports later-page variants, exact quantities, and the legacy single item', async () => {
  const { shop, calls } = fixture();
  await assert.rejects(() => shop.checkout(variant(999)), {
    code: 'CART_ITEMS_UNAVAILABLE',
  });
  assert.equal(
    calls.some(({ operation }) => operation === 'CreateCheckout'),
    false,
  );
  assert.deepEqual(await shop.checkout(selectedLines), { checkoutUrl });
  assert.deepEqual(calls.at(-1).variables.input, {
    buyerIdentity: { countryCode: 'IN' },
    lines: [
      { merchandiseId: variant(2), quantity: 3 },
      { merchandiseId: variant(5), quantity: 1 },
    ],
  });
  assert.deepEqual(await shop.checkout(variant(2)), { checkoutUrl });
  assert.deepEqual(calls.at(-1).variables.input.lines, [
    { merchandiseId: variant(2), quantity: 1 },
  ]);
});

test('checkout refuses stock changes and unexpected redirect destinations', async () => {
  for (const options of [
    { unavailable: true },
    { adjustQuantity: true },
    { warn: true },
  ])
    await assert.rejects(() => fixture(options).shop.checkout(selectedLines), {
      code: 'CART_ITEMS_UNAVAILABLE',
    });
  for (const checkout of [
    'http://' + checkoutHost + '/cart/test',
    'https://' + checkoutHost + '.invalid/cart/test',
    'https://name@' + checkoutHost + '/cart/test',
    'https://' + checkoutHost + ':9443/cart/test',
  ])
    await assert.rejects(
      () => fixture({ checkout }).shop.checkout(selectedLines),
      /Invalid checkout URL/,
    );
  assert.deepEqual(
    await fixture({
      checkout: 'https://' + domain + '/cart/c/test',
    }).shop.checkout(selectedLines),
    { checkoutUrl: 'https://' + domain + '/cart/c/test' },
  );
});

test('HTTP checkout rejects invalid cart lines before contacting Shopify and reports stock changes', async () => {
  const { shop, calls } = fixture({ adjustQuantity: true });
  const app = await createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      SHOPIFY_STORE_DOMAIN: domain,
      SHOPIFY_STOREFRONT_TOKEN: 'test-token',
    }),
    commerce: shop,
    logging: false,
  });
  try {
    for (const lines of [
      [],
      Array.from({ length: 21 }, (_, i) => ({
        variantId: variant(i),
        quantity: 1,
      })),
      [{ ...selectedLines[0], quantity: 11 }],
      [{ ...selectedLines[0], quantity: '1' }],
      [{ ...selectedLines[0], price: 1 }],
      [selectedLines[0], { ...selectedLines[0], quantity: 2 }],
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        payload: { lines },
      });
      assert.equal(response.statusCode, 400);
    }
    assert.equal(calls.length, 0);
    const response = await app.inject({
      method: 'POST',
      url: '/api/checkout',
      payload: { lines: selectedLines },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, 'CART_ITEMS_UNAVAILABLE');
  } finally {
    await app.close();
  }
});

test('Shopify service failures do not masquerade as an empty live catalogue', async () => {
  const shop = createCommerce({
    ...storefront,
    fetcher: async () => new Response(null, { status: 503 }),
  });
  await assert.rejects(() => shop.products(), /unavailable/);
  await assert.rejects(
    () => fixture({ badPrice: true }).shop.products(),
    /Invalid Shopify collection/,
  );
  assert.throws(
    () => createCommerce({ domain: 'https://untrusted.example', token: 'x' }),
    /Invalid Shopify domain/,
  );
});
