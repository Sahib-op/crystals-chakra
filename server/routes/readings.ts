import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  ReadingCatalogueSchema,
  HealthSchema,
  ErrorSchema,
  RetiredReadingSchema,
} from '../../shared/contracts.ts';
import { services, isReadingCatalog } from '../../shared/catalog.ts';
import { readingContact } from '../../shared/contact.js';
import type { ReadingCatalogue } from '../../shared/contracts.ts';

export async function readingRoutes(
  instance: FastifyInstance,
  catalogue: () => Promise<ReadingCatalogue> = async () => services,
): Promise<void> {
  const app = instance.withTypeProvider<TypeBoxTypeProvider>();
  if (!isReadingCatalog(services))
    throw new Error('Bundled reading catalogue is invalid');
  app.get(
    '/api/health',
    {
      schema: {
        summary: 'Process liveness; not provider readiness',
        response: { 200: HealthSchema },
      },
    },
    async () => ({ status: 'ok' as const }),
  );
  app.get(
    '/api/services',
    {
      schema: {
        summary: 'Published readings',
        tags: ['Readings'],
        response: {
          200: ReadingCatalogueSchema,
          500: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await catalogue();
      } catch {
        request.log.warn(
          { failureCode: 'CATALOGUE_UNAVAILABLE' },
          'Reading catalogue unavailable',
        );
        return reply.code(503).send({
          error:
            'Live reading details are unavailable. Please contact the studio.',
          code: 'CATALOGUE_UNAVAILABLE',
          requestId: request.id,
        });
      }
    },
  );

  const retired = async (request: FastifyRequest, reply: FastifyReply) => {
    const contact = readingContact();
    return reply.code(410).send({
      error:
        'Reading enquiries now go directly to the studio. The free reading runs in your browser.',
      code: 'READING_ROUTE_RETIRED',
      requestId: request.id,
      contact: { whatsapp: contact.whatsapp, telephone: contact.telephone },
    });
  };
  for (const url of ['/api/bookings', '/api/readings']) {
    // Reply before body parsing. The retired route never collects the old payload.
    app.post(
      url,
      {
        onRequest: retired,
        schema: {
          deprecated: true,
          summary: 'Retired personal-data endpoint',
          response: { 410: RetiredReadingSchema },
        },
      },
      retired,
    );
  }
}
