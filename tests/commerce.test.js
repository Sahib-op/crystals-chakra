import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommerce } from '../server/commerce.js';

test('preview products cannot create a checkout', async () => {
  const shop = createCommerce({ domain: '', token: '' });
  const catalog = await shop.products();
  assert.equal(catalog.mode, 'preview');
  assert.equal(catalog.products.length, 3);
  assert.ok(
    catalog.products.every((p) => !p.available && p.variantId === null),
  );
  assert.equal(await shop.checkout('gid://shopify/ProductVariant/1'), null);
});
test('Shopify adapter normalizes products and creates checkout for available variants only', async () => {
  const calls = [];
  const shop = createCommerce({
    domain: 'example.myshopify.com',
    token: 'test-token',
    fetcher: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      return {
        ok: true,
        json: async () => ({
          data: body.query.includes('mutation')
            ? {
                cartCreate: {
                  cart: {
                    checkoutUrl: 'https://example.myshopify.com/cart/c/test',
                  },
                  userErrors: [],
                },
              }
            : {
                products: {
                  nodes: [
                    {
                      id: 'product-1',
                      title: 'Test crystal',
                      description: 'A demo.',
                      productType: 'Bracelets',
                      featuredImage: null,
                      variants: {
                        nodes: [
                          {
                            id: 'gid://shopify/ProductVariant/1',
                            title: 'Default Title',
                            availableForSale: true,
                            price: { amount: '1200.00', currencyCode: 'INR' },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
        }),
      };
    },
  });
  const catalog = await shop.products();
  assert.equal(catalog.mode, 'live');
  assert.equal(catalog.products[0].amount, '1200.00');
  await assert.rejects(() => shop.checkout('gid://shopify/ProductVariant/999'));
  assert.equal(calls.filter((c) => c.query.includes('mutation')).length, 0);
  const cart = await shop.checkout('gid://shopify/ProductVariant/1');
  assert.ok(cart.checkoutUrl.startsWith('https://'));
  assert.deepEqual(calls.at(-1).variables.input.lines, [
    { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 },
  ]);
});
test('Shopify service failures do not masquerade as an empty live catalogue', async () => {
  const shop = createCommerce({
    domain: 'example.myshopify.com',
    token: 'test-token',
    fetcher: async () => ({ ok: false }),
  });
  await assert.rejects(() => shop.products(), /unavailable/);
  assert.throws(
    () => createCommerce({ domain: 'https://untrusted.example', token: 'x' }),
    /Invalid Shopify domain/,
  );
});
