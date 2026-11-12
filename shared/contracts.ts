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
export const SHOP_PAGE_SIZE = 24;
export const SHOP_VARIANTS_PER_PRODUCT = 20;
export const SHOP_CART_MAX_LINES = 20;
export const SHOP_CART_MAX_QUANTITY = 10;

const VariantIdSchema = Type.String({
  pattern: '^gid://shopify/ProductVariant/[0-9]+$',
  maxLength: 120,
});
const ShopifyCursor = Type.String({
  pattern: '^[A-Za-z0-9_+/=-]+$',
  maxLength: 512,
});
const PriceFields = {
  amount: Type.String({ pattern: '^[0-9]{1,12}(\\.[0-9]{1,8})?$' }),
  currency: Type.String({ pattern: '^[A-Z]{3}$' }),
};
const HttpsUrl = Type.String({ pattern: '^https://', maxLength: 2048 });
const ProductVariantSchema = Type.Object(
  {
    id: VariantIdSchema,
    title: plain(255),
    available: Type.Boolean(),
    ...PriceFields,
  },
  objectOptions,
);
const ProductSchema = Type.Object(
  {
    id: plain(120),
    title: plain(255),
    description: Type.String({ maxLength: 240 }),
    category: plain(255),
    image: Type.Union([
      Type.Null(),
      Type.Object(
        {
          url: HttpsUrl,
          altText: Type.Union([Type.Null(), Type.String({ maxLength: 512 })]),
        },
        objectOptions,
      ),
    ]),
    tone: Type.Optional(
      Type.Union([
        Type.Literal('tiger'),
        Type.Literal('rose'),
        Type.Literal('amethyst'),
      ]),
    ),
    variantId: Type.Union([Type.Null(), VariantIdSchema]),
    variantTitle: Type.Optional(plain(255)),
    available: Type.Boolean(),
    ...PriceFields,
    variants: Type.Array(ProductVariantSchema, {
      maxItems: SHOP_VARIANTS_PER_PRODUCT,
    }),
    hasMoreVariants: Type.Boolean(),
  },
  objectOptions,
);
export const ProductQuerySchema = Type.Object(
  { after: Type.Optional(ShopifyCursor) },
  objectOptions,
);
export const ProductCatalogueSchema = Type.Object(
  {
    mode: Type.Union([Type.Literal('live'), Type.Literal('preview')]),
    products: Type.Array(ProductSchema, { maxItems: SHOP_PAGE_SIZE }),
    nextCursor: Type.Union([Type.Null(), ShopifyCursor]),
  },
  objectOptions,
);
const CheckoutLineSchema = Type.Object(
  {
    variantId: VariantIdSchema,
    quantity: Type.Integer({ minimum: 1, maximum: SHOP_CART_MAX_QUANTITY }),
  },
  objectOptions,
);
export type CheckoutLine = Static<typeof CheckoutLineSchema>;
export const CheckoutRequestSchema = Type.Union([
  Type.Object({ variantId: VariantIdSchema }, objectOptions),
  Type.Object(
    {
      lines: Type.Array(CheckoutLineSchema, {
        minItems: 1,
        maxItems: SHOP_CART_MAX_LINES,
      }),
    },
    objectOptions,
  ),
]);
export const CheckoutResponseSchema = Type.Object(
  { checkoutUrl: HttpsUrl },
  objectOptions,
);
export const HealthSchema = Type.Object(
  { status: Type.Literal('ok') },
  objectOptions,
);
