import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readJsonBody } from '../server/http.js';
function request(chunks, type = 'application/json') {
  const r = Readable.from(chunks);
  r.headers = { 'content-type': type };
  return r;
}
test('JSON decoding preserves Devanagari at every possible byte boundary', async () => {
  const expected = { name: 'परीक्षा', message: 'भृगु पत्रिका — नमस्ते 🙂' };
  const bytes = Buffer.from(JSON.stringify(expected));
  for (let split = 1; split < bytes.length; split++)
    assert.deepEqual(
      await readJsonBody(
        request([bytes.subarray(0, split), bytes.subarray(split)]),
      ),
      expected,
    );
});
test('JSON limits count bytes and reject malformed, scalar and incorrectly typed payloads', async () => {
  await assert.rejects(
    readJsonBody(request([Buffer.from('{"x":"हिन्दी"}')]), 8),
    { status: 413 },
  );
  for (const body of ['bad', 'null', '[]', '"text"'])
    await assert.rejects(readJsonBody(request([Buffer.from(body)])), {
      status: 400,
    });
  await assert.rejects(
    readJsonBody(request([Buffer.from('{}')], 'text/plain')),
    { status: 415 },
  );
  await assert.rejects(
    readJsonBody(
      request([Buffer.from([123, 34, 120, 34, 58, 34, 255, 34, 125])]),
    ),
    { status: 400 },
  );
  assert.deepEqual(
    await readJsonBody(
      request([Buffer.from('{}')], 'application/json; charset=utf-8'),
    ),
    {},
  );
});
