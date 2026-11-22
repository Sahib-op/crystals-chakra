import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Shopify signs each webhook with HMAC-SHA256 over the exact raw request body,
// base64 encoded in X-Shopify-Hmac-Sha256. Verify before parsing or trusting
// anything in the request. https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
export function verifyShopifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature))
    return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(signature, 'base64');
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

export function sha256Hex(rawBody: Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

/** Topics that update the order projection. Others are acknowledged and logged as ignored. */
export const ORDER_TOPICS = new Set([
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'orders/fulfilled',
  'orders/partially_fulfilled',
]);

const FINANCIAL = new Set([
  'pending',
  'authorized',
  'partially_paid',
  'paid',
  'partially_refunded',
  'refunded',
  'voided',
  'expired',
]);
const FULFILLMENT = new Set([
  'fulfilled',
  'partial',
  'restocked',
  'unfulfilled',
]);

/**
 * Exact decimal money string ("1499.00") to integer minor units. Never uses
 * floating point. Supports currencies with up to three decimal places.
 */
export function toMinorUnits(amount: unknown, exponent = 2): number {
  if (typeof amount !== 'string' || !/^\d{1,12}(\.\d{1,3})?$/.test(amount))
    throw new Error('Invalid money amount');
  const [whole = '0', fraction = ''] = amount.split('.');
  if (fraction.length > exponent) throw new Error('Too many decimal places');
  const minor =
    BigInt(whole) * 10n ** BigInt(exponent) +
    BigInt(fraction.padEnd(exponent, '0') || '0');
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Amount out of range');
  return Number(minor);
}

// ISO 4217 currencies without minor units, or with three, as Shopify reports them.
const ZERO_DECIMAL = new Set([
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'ISK',
  'UGX',
  'XAF',
  'XOF',
]);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);
const exponentFor = (currency: string) =>
  ZERO_DECIMAL.has(currency) ? 0 : THREE_DECIMAL.has(currency) ? 3 : 2;

export interface OrderProjection {
  /** Decimal string: Shopify IDs can exceed Number.MAX_SAFE_INTEGER. */
  shopifyOrderId: string;
  name: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  currency: string;
  totalMinor: number;
  itemCount: number;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const timestamp = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    Number.isNaN(Date.parse(value))
  )
    throw new Error('Invalid timestamp');
  return new Date(value).toISOString();
};

/**
 * Extracts only operational order state. Deliberately ignores customer,
 * email, phone, address, note and payment-detail fields.
 */
export function orderProjection(payload: unknown): OrderProjection {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('Order payload must be an object');
  const order = payload as Record<string, unknown>;
  // The numeric `id` may already have lost precision in JSON.parse; the GraphQL
  // ID string carries the exact value.
  const gid = order.admin_graphql_api_id;
  const match =
    typeof gid === 'string'
      ? /^gid:\/\/shopify\/Order\/([1-9]\d{0,18})$/.exec(gid)
      : null;
  const id = match?.[1];
  if (!id || BigInt(id) > 9223372036854775807n)
    throw new Error('Invalid order id');
  const name = order.name;
  if (typeof name !== 'string' || !/^[^\u0000-\u001f]{1,40}$/.test(name))
    throw new Error('Invalid order name');
  const currency = order.currency;
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency))
    throw new Error('Invalid currency');
  const financial = order.financial_status ?? null;
  if (financial !== null && !FINANCIAL.has(String(financial)))
    throw new Error('Unknown financial status');
  const fulfillment = order.fulfillment_status ?? null;
  if (fulfillment !== null && !FULFILLMENT.has(String(fulfillment)))
    throw new Error('Unknown fulfilment status');
  const lines = order.line_items;
  if (!Array.isArray(lines) || lines.length > 10000)
    throw new Error('Invalid line items');
  let itemCount = 0;
  for (const line of lines) {
    const quantity = (line as { quantity?: unknown })?.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) < 0)
      throw new Error('Invalid line quantity');
    itemCount += quantity as number;
  }
  if (itemCount > 10000) throw new Error('Too many items');
  return {
    shopifyOrderId: id,
    name,
    financialStatus: financial as string | null,
    fulfillmentStatus: fulfillment as string | null,
    currency,
    totalMinor: toMinorUnits(
      order.current_total_price ?? order.total_price,
      exponentFor(currency),
    ),
    itemCount,
    cancelledAt:
      order.cancelled_at === null || order.cancelled_at === undefined
        ? null
        : timestamp(order.cancelled_at),
    createdAt: timestamp(order.created_at),
    updatedAt: timestamp(order.updated_at),
  };
}
