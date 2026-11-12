import type { FastifyInstance } from 'fastify';
import {
  ORDER_TOPICS,
  orderProjection,
  sha256Hex,
  verifyShopifySignature,
  type OrderProjection,
} from '../commerce/webhooks.ts';
import type { DeliveryOutcome, ShopifyDelivery } from '../database/pool.ts';

export interface WebhookStore {
  recordShopifyDelivery(
    delivery: ShopifyDelivery,
    order: OrderProjection | null,
  ): Promise<DeliveryOutcome>;
}
interface WebhookSettings {
  domain?: string;
  webhookSecret?: string;
}

const WEBHOOK_BODY_LIMIT = 1024 * 1024;
const ID = /^[A-Za-z0-9._:-]{1,100}$/;
const TOPIC = /^[a-z_]+\/[a-z_]+$/;

/**
 * POST /api/webhooks/shopify
 *
 * 1. Verify the HMAC over the exact raw bytes before parsing anything.
 * 2. Require the configured shop domain.
 * 3. Persist the delivery ID (deduplication) and apply the PII-free order
 *    projection in one transaction, then acknowledge.
 *
 * Payment state shown to the studio comes only from here, never from a
 * browser returning from checkout.
 */
export async function shopifyWebhookRoutes(
  instance: FastifyInstance,
  store: WebhookStore | null,
  settings: WebhookSettings,
): Promise<void> {
  // This plugin scope keeps the raw body; the rest of the API parses JSON normally.
  instance.removeAllContentTypeParsers();
  instance.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: WEBHOOK_BODY_LIMIT },
    (_request, body, done) => done(null, body),
  );
  instance.post(
    '/api/webhooks/shopify',
    {
      bodyLimit: WEBHOOK_BODY_LIMIT,
      schema: {
        summary: 'Verified Shopify order webhooks',
        tags: ['Shop'],
        hide: false,
      },
    },
    async (request, reply) => {
      const fail = (status: number, code: string, error: string) =>
        reply.code(status).send({ error, code, requestId: request.id });
      if (!store || !settings.webhookSecret || !settings.domain)
        return fail(
          503,
          'WEBHOOKS_NOT_CONFIGURED',
          'Order notifications are not configured.',
        );
      const raw = request.body;
      if (!Buffer.isBuffer(raw))
        return fail(415, 'JSON_REQUIRED', 'JSON content required');
      const header = (name: string) => {
        const value = request.headers[name];
        return typeof value === 'string' ? value : undefined;
      };
      if (
        !verifyShopifySignature(
          raw,
          header('x-shopify-hmac-sha256'),
          settings.webhookSecret,
        ) ||
        header('x-shopify-shop-domain')?.toLowerCase() !== settings.domain
      ) {
        request.log.warn(
          { failureCode: 'WEBHOOK_SIGNATURE_INVALID' },
          'Rejected unsigned webhook',
        );
        return fail(401, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid signature');
      }
      const webhookId = header('x-shopify-webhook-id');
      const topic = header('x-shopify-topic');
      const eventId = header('x-shopify-event-id') ?? null;
      if (
        !webhookId ||
        !ID.test(webhookId) ||
        !topic ||
        !TOPIC.test(topic) ||
        topic.length > 60 ||
        (eventId !== null && !ID.test(eventId))
      )
        return fail(400, 'INVALID_REQUEST', 'Missing webhook headers');
      let order: OrderProjection | null = null;
      if (ORDER_TOPICS.has(topic)) {
        try {
          order = orderProjection(
            JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)),
          );
        } catch {
          // Signed by Shopify but not understood: reject so Shopify retries and
          // the failure is visible, rather than silently dropping order state.
          request.log.error(
            { failureCode: 'WEBHOOK_PAYLOAD_INVALID', topic },
            'Signed order webhook could not be parsed',
          );
          return fail(422, 'WEBHOOK_PAYLOAD_INVALID', 'Unrecognised payload');
        }
      }
      const outcome = await store.recordShopifyDelivery(
        { webhookId, eventId, topic, payloadSha256: sha256Hex(raw) },
        order,
      );
      request.log.info({ topic, outcome }, 'Shopify webhook processed');
      return reply.code(200).send({ received: true, outcome });
    },
  );
}
