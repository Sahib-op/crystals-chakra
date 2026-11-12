import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Check } from 'typebox/value';
import {
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  ErrorSchema,
  ProductCatalogueSchema,
  ProductQuerySchema,
  type CheckoutLine,
} from '../../shared/contracts.ts';
import { hostedCheckoutUrl } from '../commerce.js';
import { HttpError } from '../http.ts';

export interface CommercePort {
  products(after?: string): Promise<unknown>;
  checkout(lines: CheckoutLine[]): Promise<unknown>;
}
interface CheckoutHosts {
  domain?: string;
  checkoutHost?: string;
}
export async function commerceRoutes(
  instance: FastifyInstance,
  commerce: CommercePort,
  hosts: CheckoutHosts = {},
): Promise<void> {
  const app = instance.withTypeProvider<TypeBoxTypeProvider>();
  app.get(
    '/api/products',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: {
        summary: 'Preview or paginated connected collection',
        tags: ['Shop'],
        querystring: ProductQuerySchema,
        response: {
          200: ProductCatalogueSchema,
          400: ErrorSchema,
          429: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const catalogue = await commerce.products(request.query.after);
        if (!Check(ProductCatalogueSchema, catalogue))
          throw new Error('Invalid collection response');
        return reply.code(200).send(catalogue);
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
        summary: 'Create a hosted checkout for selected quantities',
        tags: ['Shop'],
        body: CheckoutRequestSchema,
        response: {
          201: CheckoutResponseSchema,
          400: ErrorSchema,
          403: ErrorSchema,
          409: ErrorSchema,
          413: ErrorSchema,
          415: ErrorSchema,
          429: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const lines =
        'lines' in request.body
          ? request.body.lines
          : [{ variantId: request.body.variantId, quantity: 1 }];
      if (new Set(lines.map((line) => line.variantId)).size !== lines.length)
        return reply.code(400).send({
          error: 'Combine duplicate items before checkout.',
          code: 'INVALID_REQUEST',
          requestId: request.id,
        });
      try {
        const checkout = await commerce.checkout(lines);
        if (!checkout)
          return reply.code(503).send({
            error: 'The shop is a preview. Checkout is not enabled yet.',
            code: 'CHECKOUT_DISABLED',
            requestId: request.id,
          });
        const checkoutUrl =
          typeof checkout === 'object' && 'checkoutUrl' in checkout
            ? hostedCheckoutUrl(checkout.checkoutUrl, hosts)
            : null;
        if (!checkoutUrl) throw new Error('Invalid checkout response');
        return reply.code(201).send({ checkoutUrl });
      } catch (error) {
        if (
          error instanceof HttpError &&
          error.code === 'CART_ITEMS_UNAVAILABLE'
        )
          return reply.code(409).send({
            error: error.message,
            code: error.code,
            requestId: request.id,
          });
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
