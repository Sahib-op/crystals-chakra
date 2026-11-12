import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  ErrorSchema,
} from '../../shared/contracts.ts';

export interface CommercePort {
  products(): Promise<unknown>;
  checkout(variantId: string): Promise<unknown>;
}
export async function commerceRoutes(
  instance: FastifyInstance,
  commerce: CommercePort,
): Promise<void> {
  const app = instance.withTypeProvider<TypeBoxTypeProvider>();
  app.get(
    '/api/products',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { summary: 'Preview or connected collection', tags: ['Shop'] },
    },
    async (request, reply) => {
      try {
        return await commerce.products();
      } catch {
        request.log.warn(
          { failureCode: 'COLLECTION_UNAVAILABLE' },
          'Collection provider unavailable',
        );
        return reply.code(503).send({
          error: 'The collection is temporarily unavailable. Please try again.',
          code: 'COLLECTION_UNAVAILABLE',
          requestId: request.id,
        });
      }
    },
  );
  app.post(
    '/api/checkout',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        summary: 'Create a single-item hosted checkout',
        tags: ['Shop'],
        body: CheckoutRequestSchema,
        response: {
          201: CheckoutResponseSchema,
          400: ErrorSchema,
          403: ErrorSchema,
          413: ErrorSchema,
          415: ErrorSchema,
          429: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const checkout = await commerce.checkout(request.body.variantId);
        if (!checkout)
          return reply.code(503).send({
            error: 'The shop is a preview. Checkout is not enabled yet.',
            code: 'CHECKOUT_DISABLED',
            requestId: request.id,
          });
        // The provider is an untrusted boundary even when our own adapter calls it.
        if (
          typeof checkout !== 'object' ||
          !('checkoutUrl' in checkout) ||
          typeof checkout.checkoutUrl !== 'string' ||
          !checkout.checkoutUrl.startsWith('https://')
        )
          throw new Error('Invalid checkout response');
        return reply.code(201).send({ checkoutUrl: checkout.checkoutUrl });
      } catch {
        request.log.warn(
          { failureCode: 'CHECKOUT_UNAVAILABLE' },
          'Checkout provider unavailable',
        );
        return reply.code(503).send({
          error: 'Checkout is unavailable. Please try again or contact us.',
          code: 'CHECKOUT_UNAVAILABLE',
          requestId: request.id,
        });
      }
    },
  );
}
