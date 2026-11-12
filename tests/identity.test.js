import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { createIdentityVerifier } from '../server/auth/identity.ts';
import { authSettings } from '../server/auth/settings.ts';
const key = await generateKeyPair('ES256');
const pub = await exportJWK(key.publicKey);
pub.kid = 'unit-key';
pub.alg = 'ES256';
const server = createServer((request, response) => {
  if (request.url === '/auth/v1/.well-known/jwks.json') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ keys: [pub] }));
  } else {
    response.writeHead(503);
    response.end();
  }
});
let url, verify;
const sub = randomUUID(),
  sid = randomUUID();
before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
  verify = createIdentityVerifier({ url });
});
after(() => new Promise((resolve) => server.close(resolve)));
async function token(overrides = {}, signingKey = key.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub,
    session_id: sid,
    role: 'authenticated',
    aal: 'aal2',
    is_anonymous: false,
    iat: now,
    exp: now + 900,
    iss: url + '/auth/v1',
    aud: 'authenticated',
    ...overrides,
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'unit-key' })
    .sign(signingKey);
}
test('owner identity requires a valid signature, exact issuer/audience and bounded signed claims', async () => {
  const identity = await verify('Bearer ' + (await token()));
  assert.deepEqual(identity, { sub, session_id: sid, aal: 'aal2' });
  assert.equal(
    (await verify('Bearer ' + (await token({ aal: 'aal1' })))).aal,
    'aal1',
  );
  for (const changes of [
    { exp: 1 },
    { iss: 'https://untrusted.example/auth/v1' },
    { aud: 'service_role' },
    { role: 'service_role' },
    { sub: 'bad' },
    { session_id: 'bad' },
    { is_anonymous: true },
    { aal: 'aal3' },
    { exp: Math.floor(Date.now() / 1000) + 7200 },
    { iat: Math.floor(Date.now() / 1000) + 60 },
  ])
    await assert.rejects(
      () => token(changes).then((value) => verify('Bearer ' + value)),
      { status: 401, code: 'INVALID_SESSION' },
    );
  const other = await generateKeyPair('ES256');
  await assert.rejects(
    () =>
      token({}, other.privateKey).then((value) => verify('Bearer ' + value)),
    { status: 401, code: 'INVALID_SESSION' },
  );
});
test('missing, oversized, unsigned and malformed bearer credentials fail closed', async () => {
  for (const header of [
    undefined,
    'Basic value',
    'Bearer ' + 'x'.repeat(9000),
    'Bearer a.b.',
    'Bearer not-a-token',
  ])
    await assert.rejects(() => verify(header), {
      status: 401,
      code: 'AUTH_REQUIRED',
    });
  const unsigned =
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url') +
    '.' +
    Buffer.from(JSON.stringify({ sub })).toString('base64url') +
    '.signature';
  await assert.rejects(() => verify('Bearer ' + unsigned), {
    status: 401,
    code: 'INVALID_SESSION',
  });
});
test('signing-key service failures are controlled availability errors', async () => {
  const unavailable = createIdentityVerifier({ url: url + '/unavailable' });
  await assert.rejects(
    () => token().then((value) => unavailable('Bearer ' + value)),
    { status: 503, code: 'AUTH_UNAVAILABLE' },
  );
});
test('production auth settings reject local issuers and private keys', () => {
  assert.equal(
    authSettings({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_public_key',
    }).url,
    'https://project.supabase.co',
  );
  for (const env of [
    { NODE_ENV: 'production', SUPABASE_URL: 'http://127.0.0.1:54321' },
    { NODE_ENV: 'production', SUPABASE_URL: 'https://localhost' },
    { SUPABASE_URL: 'https://example.com/path' },
    { SUPABASE_URL: 'https://secret@example.com' },
    {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_secret_must_not_leak',
    },
    { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public_key' },
  ])
    assert.throws(
      () => authSettings(env),
      (error) => !error.message.includes('must_not_leak'),
    );
});
