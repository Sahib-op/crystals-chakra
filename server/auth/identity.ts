import { createRemoteJWKSet, jwtVerify, errors } from 'jose';
import { HttpError } from '../http.ts';

export interface AuthSettings {
  url: string;
  publishableKey?: string;
  localDemo?: boolean;
}
export interface VerifiedIdentity {
  sub: string;
  session_id: string;
  aal: 'aal1' | 'aal2';
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createIdentityVerifier(settings: AuthSettings) {
  const issuer = settings.url + '/auth/v1';
  const keys = createRemoteJWKSet(new URL(issuer + '/.well-known/jwks.json'), {
    timeoutDuration: 3000,
    cooldownDuration: 30000,
    cacheMaxAge: 600000,
  });
  return async function verify(
    authorization: string | undefined,
  ): Promise<VerifiedIdentity> {
    if (
      !authorization ||
      !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
        authorization,
      ) ||
      authorization.length > 8192
    )
      throw new HttpError(
        401,
        'Sign in to the studio to continue.',
        'AUTH_REQUIRED',
      );
    try {
      const { payload } = await jwtVerify(authorization.slice(7), keys, {
        issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
        clockTolerance: 5,
        requiredClaims: ['sub', 'session_id', 'aal', 'role', 'iat', 'exp'],
        maxTokenAge: '1h',
      });
      if (
        typeof payload.sub !== 'string' ||
        !uuid.test(payload.sub) ||
        typeof payload.session_id !== 'string' ||
        !uuid.test(payload.session_id) ||
        payload.role !== 'authenticated' ||
        payload.is_anonymous === true ||
        !['aal1', 'aal2'].includes(String(payload.aal)) ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number' ||
        payload.exp - payload.iat > 3600 ||
        payload.iat > Date.now() / 1000 + 5
      )
        throw new Error('Invalid identity');
      return {
        sub: payload.sub,
        session_id: payload.session_id,
        aal: payload.aal as VerifiedIdentity['aal'],
      };
    } catch (error) {
      if (
        error instanceof errors.JWKSTimeout ||
        error instanceof TypeError ||
        error instanceof SyntaxError ||
        error instanceof errors.JWKSInvalid ||
        (error as { code?: string }).code === 'ERR_JOSE_GENERIC'
      )
        throw new HttpError(
          503,
          'Studio sign-in is temporarily unavailable. Please try again.',
          'AUTH_UNAVAILABLE',
        );
      throw new HttpError(
        401,
        'Your studio session could not be verified. Sign in again.',
        'INVALID_SESSION',
      );
    }
  };
}
