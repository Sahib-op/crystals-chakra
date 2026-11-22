import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadCart,
  saveCart,
  sanitizeCart,
  MAX_CART_LINES,
} from '../src/lib/cartStorage.js';
import { BUSINESS, missingBusinessFacts, fact } from '../shared/business.js';
import { canAutoLoad3D } from '../src/components/celestial/capability.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    map,
  };
}

test('cart storage keeps only bounded variant ids and quantities', () => {
  const storage = memoryStorage();
  saveCart({ 'gid://shopify/ProductVariant/1': 2 }, storage, 1000);
  assert.deepEqual(loadCart(storage, 2000), {
    'gid://shopify/ProductVariant/1': 2,
  });
  assert.deepEqual(
    sanitizeCart({ a: 0, b: 11, c: 1.5, d: '2', ['x'.repeat(201)]: 1, ok: 3 }),
    { ok: 3 },
  );
  const many = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => ['v' + i, 1]),
  );
  assert.equal(Object.keys(sanitizeCart(many)).length, MAX_CART_LINES);
  for (const value of [null, [], 'x', 5])
    assert.deepEqual(sanitizeCart(value), {});
});

test('cart storage expires, tolerates corruption and empty carts clear the key', () => {
  const storage = memoryStorage();
  saveCart({ v: 1 }, storage, 0);
  assert.deepEqual(loadCart(storage, 8 * 24 * 60 * 60 * 1000), {});
  assert.equal(storage.map.size, 0);
  storage.setItem('crystals-chakra:cart:v1', '{not json');
  assert.deepEqual(loadCart(storage), {});
  saveCart({ v: 1 }, storage, 5);
  saveCart({}, storage, 6);
  assert.equal(storage.map.size, 0);
  const throwing = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(loadCart(throwing), {});
  assert.doesNotThrow(() => saveCart({ v: 1 }, throwing));
  assert.deepEqual(loadCart(undefined), {});
});

test('launch gate reports every unconfirmed business fact and never invents one', () => {
  const missing = missingBusinessFacts();
  assert.ok(missing.length >= 10);
  assert.ok(missing.every(({ decision }) => /^D\d+$/.test(decision)));
  assert.equal(fact('legalName'), BUSINESS.legalName);
  const complete = {
    legalName: 'Example Pvt Ltd',
    address: 'Address',
    grievanceOfficer: { name: 'A', designation: 'B', email: 'a@b.c' },
    hours: 'Mon–Sat',
    readings: {
      delivery: 'Call',
      cancellation: 'C',
      refunds: 'R',
      payment: 'UPI',
    },
    shop: {
      shippingRegions: 'India',
      deliveryTimes: '5 days',
      shippingCharges: 'Free',
      returnWindowDays: 7,
      returnConditions: 'Unused',
      refunds: 'Original method',
    },
    policiesEffectiveDate: '2027-01-01',
  };
  assert.deepEqual(missingBusinessFacts(complete), []);
  assert.equal(fact('shop.returnWindowDays', complete), 7);
});

test('3D rings auto-load only on capable fine-pointer screens', () => {
  const env = ({
    reduced = false,
    fine = true,
    width = 1440,
    cores = 8,
    memory = 8,
    saveData = false,
  } = {}) => ({
    innerWidth: width,
    navigator: {
      hardwareConcurrency: cores,
      deviceMemory: memory,
      connection: { saveData },
    },
    matchMedia: (query) => ({
      matches: query.includes('reduced-motion')
        ? reduced
        : query.includes('pointer: fine')
          ? fine
          : false,
    }),
  });
  assert.equal(canAutoLoad3D(env()), true);
  for (const blocked of [
    { reduced: true },
    { fine: false },
    { width: 820 },
    { cores: 2 },
    { memory: 2 },
    { saveData: true },
  ])
    assert.equal(canAutoLoad3D(env(blocked)), false, JSON.stringify(blocked));
  assert.equal(canAutoLoad3D({}), false);
});
