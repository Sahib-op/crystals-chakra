// Explicit loopback-only Auth transport fixture for the local studio preview.
// It is not imported by the app/server entrypoint and is never a production provider.
import { createServer } from 'node:http';
import { Client } from 'pg';
import { generateKeyPair, exportJWK, SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { readJsonBody } from '../../server/http.ts';

if (process.env.NODE_ENV === 'production')
  throw new Error('Local fixture cannot run in production');
const controller = new URL(
  process.env.TEST_DATABASE_URL ||
    'postgresql://invalid:invalid@invalid/postgres',
);
if (
  controller.username !== 'chakra_test_admin' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(controller.hostname)
)
  throw new Error('Use the isolated local test controller');
try {
  const rootEnv = parseEnv(
    await readFile(new URL('../../.env', import.meta.url), 'utf8'),
  );
  if (rootEnv.SUPABASE_URL)
    throw new Error(
      'Existing managed Auth configuration must be kept separate from the local fixture',
    );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
controller.pathname = '/chakra_development';
const db = new Client({ connectionString: controller.href });
await db.connect();
const userId = '3f5b89c5-a316-4f37-a7bd-770f2e957adb',
  factorId = 'ae5f0565-8292-4e43-ad60-06f5ec9068f2';
await db.query(
  'insert into auth.users(id) values($1) on conflict(id) do nothing',
  [userId],
);
await db.query(
  'insert into studio.owner_access(user_id) values($1) on conflict(user_id) do update set active=true',
  [userId],
);
await db.query(
  "insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified') on conflict(id) do update set status='verified'",
  [factorId, userId],
);
const origin = 'http://127.0.0.1:54321',
  issuer = origin + '/auth/v1';
const pair = await generateKeyPair('ES256');
const jwk = await exportJWK(pair.publicKey);
jwk.kid = 'local-studio-fixture';
jwk.alg = 'ES256';
const refreshes = new Map<string, string>(),
  challenges = new Map<string, { session: string; expires: number }>();
const user = () => ({
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'owner@chakra.test',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  is_anonymous: false,
  factors: [
    {
      id: factorId,
      friendly_name: 'Local fixture authenticator',
      factor_type: 'totp',
      status: 'verified',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
});
async function sessionId(authorization: string | undefined): Promise<string> {
  const token = authorization?.replace(/^Bearer /, '');
  if (!token) throw new Error('Missing token');
  const verified = await jwtVerify(token, pair.publicKey, {
    issuer,
    audience: 'authenticated',
    algorithms: ['ES256'],
  });
  if (
    verified.payload.sub !== userId ||
    typeof verified.payload.session_id !== 'string'
  )
    throw new Error('Invalid session');
  const row = await db.query(
    'select id from auth.sessions where id=$1 and user_id=$2 and not_after>now()',
    [verified.payload.session_id, userId],
  );
  if (!row.rowCount) throw new Error('Session ended');
  return verified.payload.session_id;
}
async function credentials(id: string) {
  const result = await db.query<{ aal: 'aal1' | 'aal2' }>(
    'select aal from auth.sessions where id=$1 and user_id=$2 and not_after>now()',
    [id, userId],
  );
  if (!result.rows[0]) throw new Error('Session ended');
  const now = Math.floor(Date.now() / 1000),
    refresh = randomUUID();
  refreshes.set(refresh, id);
  const access = await new SignJWT({
    sub: userId,
    session_id: id,
    role: 'authenticated',
    aal: result.rows[0].aal,
    is_anonymous: false,
    iat: now,
    exp: now + 900,
    aud: 'authenticated',
    iss: issuer,
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'local-studio-fixture' })
    .sign(pair.privateKey);
  return {
    access_token: access,
    token_type: 'bearer',
    expires_in: 900,
    expires_at: now + 900,
    refresh_token: refresh,
    user: user(),
  };
}
const server = createServer(async (req, res) => {
  const requestOrigin = req.headers.origin;
  const allowed =
    !requestOrigin ||
    /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/.test(requestOrigin);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };
  if (
    !['127.0.0.1:54321', 'localhost:54321'].includes(req.headers.host || '') ||
    !allowed
  )
    return send(403, { msg: 'Local preview origin required' });
  if (requestOrigin)
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization,apikey,content-type,x-client-info,x-supabase-api-version',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || '/', origin);
  try {
    if (
      req.method === 'GET' &&
      url.pathname === '/auth/v1/.well-known/jwks.json'
    )
      return send(200, { keys: [jwk] });
    if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
      await sessionId(req.headers.authorization);
      return send(200, user());
    }
    if (req.method !== 'POST')
      return send(404, { msg: 'Fixture endpoint unavailable' });
    if (url.pathname === '/auth/v1/logout') {
      const sid = await sessionId(req.headers.authorization);
      await db.query('delete from auth.sessions where id=$1', [sid]);
      for (const [refresh, id] of refreshes)
        if (id === sid) refreshes.delete(refresh);
      return send(200, {});
    }
    const body = await readJsonBody(req);
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') {
        if (
          body.email !== 'owner@chakra.test' ||
          body.password !== 'local-preview-only'
        )
          return send(400, {
            error_code: 'invalid_credentials',
            msg: 'Fixture credentials required',
          });
        const sid = randomUUID();
        await db.query(
          "insert into auth.sessions(id,user_id,aal,not_after) values($1,$2,'aal1',now()+interval '1 hour')",
          [sid, userId],
        );
        return send(200, await credentials(sid));
      }
      if (
        url.searchParams.get('grant_type') === 'refresh_token' &&
        typeof body.refresh_token === 'string'
      ) {
        const sid = refreshes.get(body.refresh_token);
        refreshes.delete(body.refresh_token);
        if (sid) return send(200, await credentials(sid));
      }
      return send(400, { msg: 'Fixture refresh is unavailable' });
    }
    const sid = await sessionId(req.headers.authorization);
    if (url.pathname === '/auth/v1/factors/' + factorId + '/challenge') {
      const id = randomUUID();
      challenges.set(id, { session: sid, expires: Date.now() + 60000 });
      return send(200, {
        id,
        type: 'totp',
        expires_at: Math.floor(Date.now() / 1000) + 60,
      });
    }
    if (url.pathname === '/auth/v1/factors/' + factorId + '/verify') {
      const challenge =
        typeof body.challenge_id === 'string'
          ? challenges.get(body.challenge_id)
          : undefined;
      if (
        !challenge ||
        challenge.session !== sid ||
        challenge.expires < Date.now() ||
        body.code !== '123456'
      )
        return send(422, {
          error_code: 'mfa_verification_failed',
          msg: 'Use fixture code 123456',
        });
      challenges.delete(String(body.challenge_id));
      await db.query("update auth.sessions set aal='aal2' where id=$1", [sid]);
      return send(200, await credentials(sid));
    }
    return send(404, {
      msg: 'This local fixture covers password sign-in and MFA challenge only',
    });
  } catch {
    return send(401, { msg: 'Local preview session is unavailable' });
  }
});
await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(54321, '127.0.0.1', resolve);
});
const envFile = new URL('../../work/database/api.env', import.meta.url);
const prior = await readFile(envFile, 'utf8');
const filtered = prior
  .split(/\r?\n/)
  .filter(
    (line) =>
      !/^(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|STUDIO_DEMO_MODE)=/.test(line),
  )
  .join('\n')
  .trimEnd();
await writeFile(
  envFile,
  filtered +
    '\nSUPABASE_URL=' +
    origin +
    '\nSUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture_key\nSTUDIO_DEMO_MODE=true\n',
);
console.log(
  'Local studio Auth fixture ready on 127.0.0.1:54321. Preview account is available in the sign-in form; fixture MFA code: 123456. Restart dev:api to load its local settings.',
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.query('delete from auth.sessions where user_id=$1', [userId]);
  await db.end();
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
