import test from 'node:test';
import assert from 'node:assert/strict';
import { withRequestTimeout, RequestTimeoutError } from '../src/lib/requestTimeout.js';
import { request } from '../src/lib/api.js';

test('a stalled read is aborted and produces a recoverable timeout', async () => {
  let operationSignal;
  await assert.rejects(
    withRequestTimeout((signal) => {
      operationSignal = signal;
      return new Promise(() => {});
    }, { timeoutMs: 10, message: 'Retry the collection.' }),
    (error) => error instanceof RequestTimeoutError && error.message === 'Retry the collection.',
  );
  assert.equal(operationSignal.aborted, true);
});

test('unmount cancellation is forwarded and never converted to a timeout', async () => {
  const controller = new AbortController();
  const reason = new DOMException('Page changed', 'AbortError');
  let operationSignal;
  const pending = withRequestTimeout((signal) => {
    operationSignal = signal;
    return new Promise(() => {});
  }, { signal: controller.signal, timeoutMs: 500 });
  controller.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(operationSignal.reason, reason);
});

test('a request already cancelled never starts network work', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(withRequestTimeout(async () => { calls++; }, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('successful reads remove the timeout and caller listener', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController();
  let operationSignal;
  assert.deepEqual(await withRequestTimeout(async (signal) => {
    operationSignal = signal;
    return { products: [] };
  }, { signal: controller.signal, timeoutMs: 10 }), { products: [] });
  context.mock.timers.tick(20);
  controller.abort();
  assert.equal(operationSignal.aborted, false);
});

test('public API timeout covers a stalled JSON body, not only response headers', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let requestSignal;
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    requestSignal = options.signal;
    return { ok: true, json: () => new Promise(() => {}) };
  });
  const pending = request('products');
  const rejected = assert.rejects(pending, { name: 'RequestTimeoutError' });
  await Promise.resolve();
  context.mock.timers.tick(12000);
  await rejected;
  assert.equal(requestSignal.aborted, true);
});

test('public API preserves service errors and POST checkout payloads', async (context) => {
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return { ok: false, json: async () => ({ error: 'This piece is sold out.' }) };
  });
  const body = { lines: [{ variantId: 'a', quantity: 1 }] };
  await assert.rejects(request('checkout', body), { message: 'This piece is sold out.' });
  assert.equal(calls[0].url, '/api/checkout');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), body);
});
