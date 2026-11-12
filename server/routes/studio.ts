import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { VerifiedIdentity } from '../auth/identity.ts';
import { createIdentityVerifier } from '../auth/identity.ts';
import type { ApiConfig } from '../config.ts';
import type { StudioRepository } from '../modules/studio/repository.ts';
import { HttpError } from '../http.ts';
import { ErrorSchema } from '../../shared/contracts.ts';
import {
  OwnerSessionSchema,
  ReadingListQuery,
  StudioReadingPageSchema,
  PractitionerListSchema,
  ReadingCreateSchema,
  ReadingUpdateSchema,
  StudioReadingSchema,
  ReadingIdParams,
  AuditListSchema,
} from '../../shared/studio-contracts.ts';
declare module 'fastify' {
  interface FastifyRequest {
    studioIdentity: VerifiedIdentity | null;
  }
}

export async function studioRoutes(
  instance: FastifyInstance,
  repository: StudioRepository | null,
  config: ApiConfig,
): Promise<void> {
  const app = instance.withTypeProvider<TypeBoxTypeProvider>();
  const verify = config.auth ? createIdentityVerifier(config.auth) : null;
  app.decorateRequest('studioIdentity', null);
  app.addHook('onRequest', async (request) => {
    if (!verify || !repository)
      throw new HttpError(
        503,
        'Studio sign-in is not configured yet.',
        'STUDIO_NOT_CONFIGURED',
      );
    const identity = await verify(request.headers.authorization);
    const access = await repository.access(identity);
    if (!access.eligible)
      throw new HttpError(
        403,
        'This account does not have studio access.',
        'OWNER_ACCESS_DENIED',
      );
    if (request.routeOptions.url !== '/api/studio/session' && !access.mfa)
      throw new HttpError(
        403,
        'Verify your authenticator code to open the studio.',
        'MFA_REQUIRED',
      );
    request.studioIdentity = identity;
  });
  const failure = {
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    409: ErrorSchema,
    429: ErrorSchema,
    503: ErrorSchema,
  };
  const routeConfig = { rateLimit: { max: 120, timeWindow: '1 minute' } };
  const common = {
    tags: ['Private studio'],
    security: [{ studioBearer: [] }],
    response: failure,
  };
  app.get(
    '/api/studio/session',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'Check invited owner session and MFA',
        response: { ...failure, 200: OwnerSessionSchema },
      },
    },
    async (request) => {
      const identity = request.studioIdentity!;
      const access = await repository!.access(identity);
      return { userId: identity.sub, mfaRequired: !access.mfa };
    },
  );
  app.get(
    '/api/studio/readings',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'List studio reading drafts and published packages',
        querystring: ReadingListQuery,
        response: { ...failure, 200: StudioReadingPageSchema },
      },
    },
    async (request) =>
      repository!.readings(request.studioIdentity!, request.query),
  );
  app.get(
    '/api/studio/practitioners',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'Practitioners available for reading assignment',
        response: { ...failure, 200: PractitionerListSchema },
      },
    },
    async (request) => repository!.practitioners(request.studioIdentity!),
  );
  app.get(
    '/api/studio/readings/:id',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'Read one studio package',
        params: ReadingIdParams,
        response: { ...failure, 200: StudioReadingSchema },
      },
    },
    async (request) =>
      repository!.reading(request.studioIdentity!, request.params.id),
  );
  app.post(
    '/api/studio/readings',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'Create a reading draft or approved published package',
        body: ReadingCreateSchema,
        response: { ...failure, 201: StudioReadingSchema },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await repository!.createReading(
            request.studioIdentity!,
            request.body,
          ),
        ),
  );
  app.patch(
    '/api/studio/readings/:id',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'Save a reading using its current revision',
        params: ReadingIdParams,
        body: ReadingUpdateSchema,
        response: { ...failure, 200: StudioReadingSchema },
      },
    },
    async (request) =>
      repository!.updateReading(
        request.studioIdentity!,
        request.params.id,
        request.body,
      ),
  );
  app.get(
    '/api/studio/readings/:id/history',
    {
      config: routeConfig,
      schema: {
        ...common,
        summary: 'Inspect reading change history',
        params: ReadingIdParams,
        response: { ...failure, 200: AuditListSchema },
      },
    },
    async (request) =>
      repository!.history(request.studioIdentity!, request.params.id),
  );
}
