import { Type, type Static } from 'typebox';

const plain = (maxLength: number) =>
  Type.String({ minLength: 1, maxLength, pattern: '\\S' });
const objectOptions = { additionalProperties: false } as const;

export const ReadingSchema = Type.Object(
  {
    id: Type.String({ pattern: '^[a-z][a-z0-9-]{0,47}$', maxLength: 48 }),
    type: Type.Union([Type.Literal('tarot'), Type.Literal('astrology')]),
    title: plain(120),
    hindiTitle: Type.Optional(plain(160)),
    description: plain(600),
    // Public display amount in whole INR, not a checkout price or payment instruction.
    price: Type.Union([
      Type.Null(),
      Type.Integer({ minimum: 0, maximum: 10000000 }),
    ]),
    contactDestination: Type.Literal('studio'),
    practitioner: Type.Optional(
      Type.Object({ name: plain(100) }, objectOptions),
    ),
    features: Type.Array(plain(240), { minItems: 1, maxItems: 12 }),
  },
  objectOptions,
);

export const ReadingCatalogueSchema = Type.Array(ReadingSchema, {
  maxItems: 40,
});
export type Reading = Static<typeof ReadingSchema>;
export type ReadingCatalogue = Static<typeof ReadingCatalogueSchema>;

export const ErrorSchema = Type.Object(
  {
    error: plain(240),
    code: Type.String({ pattern: '^[A-Z][A-Z0-9_]{1,63}$' }),
    requestId: Type.String({ pattern: '^[a-f0-9-]{36}$' }),
  },
  objectOptions,
);
export const RetiredReadingSchema = Type.Object(
  {
    ...ErrorSchema.properties,
    contact: Type.Object(
      { whatsapp: plain(1200), telephone: plain(40) },
      objectOptions,
    ),
  },
  objectOptions,
);
export const CheckoutRequestSchema = Type.Object(
  {
    variantId: Type.String({
      pattern: '^gid://shopify/ProductVariant/[0-9]+$',
      maxLength: 120,
    }),
  },
  objectOptions,
);
export const CheckoutResponseSchema = Type.Object(
  { checkoutUrl: Type.String({ pattern: '^https://', maxLength: 2048 }) },
  objectOptions,
);
export const HealthSchema = Type.Object(
  { status: Type.Literal('ok') },
  objectOptions,
);
