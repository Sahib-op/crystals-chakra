import { Check } from 'typebox/value';
import {
  CheckoutRequestSchema,
  ProductCatalogueSchema,
  ProductQuerySchema,
  SHOP_CART_MAX_LINES,
  SHOP_PAGE_SIZE,
  SHOP_VARIANTS_PER_PRODUCT,
} from '../shared/contracts.ts';
import { HttpError } from './http.ts';

const PREVIEW = [
  {
    id: 'preview-tiger',
    title: 'Tiger Eye Clarity Band',
    description:
      'Warm amber tones, polished stone, and a small daily reminder to stay grounded.',
    category: 'Bracelets',
    amount: '1200',
    currency: 'INR',
    tone: 'tiger',
  },
  {
    id: 'preview-rose',
    title: 'Rose Quartz Heart Band',
    description:
      'Soft rose quartz with a simple silhouette, made for everyday rituals.',
    category: 'Bracelets',
    amount: '1400',
    currency: 'INR',
    tone: 'rose',
  },
  {
    id: 'preview-amethyst',
    title: 'Amethyst Crown Band',
    description:
      'Deep violet tones for a thoughtful addition to your personal collection.',
    category: 'Bracelets',
    amount: '1600',
    currency: 'INR',
    tone: 'amethyst',
  },
];
function secureUrl(raw, hosts) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !hosts.includes(url.hostname) ||
      url.href.length > 2048
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

// Bound decoded bytes too: compressed/chunked responses can omit or understate
// Content-Length. Stop reading before buffering or parsing an oversized body.
const SHOPIFY_RESPONSE_LIMIT = 2 * 1024 * 1024;
async function readShopifyJson(response) {
  const contentType = response.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim();
  if (
    !response.ok ||
    response.redirected ||
    !['application/json', 'application/graphql-response+json'].includes(
      contentType,
    ) ||
    Number(response.headers.get('content-length')) > SHOPIFY_RESPONSE_LIMIT
  ) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Store temporarily unavailable');
  }
  if (!response.body) throw new Error('Invalid Shopify response');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > SHOPIFY_RESPONSE_LIMIT)
        throw new Error('Shopify response too large');
      chunks.push(value);
    }
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        Buffer.concat(chunks, size),
      ),
    );
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export function hostedCheckoutUrl(
  raw,
  { domain = '', checkoutHost = '' } = {},
) {
  return secureUrl(raw, [domain, checkoutHost].filter(Boolean));
}

function cartItemsUnavailable() {
  return new HttpError(
    409,
    'Some items or quantities are no longer available. Review your cart and try again.',
    'CART_ITEMS_UNAVAILABLE',
  );
}

export function createCommerce({
  domain = process.env.SHOPIFY_STORE_DOMAIN,
  token = process.env.SHOPIFY_STOREFRONT_TOKEN,
  checkoutHost = '',
  fetcher = fetch,
} = {}) {
  const configured = Boolean(domain && token);
  if (domain && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))
    throw new Error('Invalid Shopify domain');

  async function query(query, variables) {
    const response = await fetcher(
      `https://${domain}/api/2026-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
        body: JSON.stringify({ query, variables }),
        redirect: 'error',
        signal: AbortSignal.timeout(6000),
      },
    );
    const payload = await readShopifyJson(response);
    if (payload?.errors || !payload?.data)
      throw new Error('Store temporarily unavailable');
    return payload.data;
  }

  return {
    async products(after) {
      if (!configured)
        return {
          mode: 'preview',
          products: after
            ? []
            : PREVIEW.map((product) => ({
                ...product,
                available: false,
                variantId: null,
                image: null,
                variants: [],
                hasMoreVariants: false,
              })),
          nextCursor: null,
        };
      if (after !== undefined && !Check(ProductQuerySchema, { after }))
        throw new Error('Invalid collection cursor');
      const data = await query(
        `query Collection($first: Int!, $variantCount: Int!, $after: String) @inContext(country: IN) {
          products(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id title description productType
              featuredImage { url(transform: { maxWidth: 720 }) altText }
              variants(first: $variantCount) {
                pageInfo { hasNextPage }
                nodes { id title availableForSale price { amount currencyCode } }
              }
            }
          }
        }`,
        {
          first: SHOP_PAGE_SIZE,
          variantCount: SHOP_VARIANTS_PER_PRODUCT,
          after: after ?? null,
        },
      );
      const { nodes, pageInfo } = data.products ?? {};
      if (
        !Array.isArray(nodes) ||
        nodes.length > SHOP_PAGE_SIZE ||
        typeof pageInfo?.hasNextPage !== 'boolean'
      )
        throw new Error('Invalid Shopify collection');
      if (
        pageInfo.hasNextPage &&
        (!pageInfo.endCursor || pageInfo.endCursor === after)
      )
        throw new Error('Invalid Shopify collection cursor');

      const products = nodes.flatMap((product) => {
        const options = product?.variants;
        if (
          !Array.isArray(options?.nodes) ||
          options.nodes.length > SHOP_VARIANTS_PER_PRODUCT ||
          typeof options.pageInfo?.hasNextPage !== 'boolean'
        )
          throw new Error('Invalid Shopify product options');
        const variants = options.nodes.map((variant) => ({
          id: variant.id,
          title: variant.title,
          available: variant.availableForSale,
          amount: variant.price?.amount,
          currency: variant.price?.currencyCode,
        }));
        const first = variants[0];
        if (!first) return [];
        const imageUrl = secureUrl(
          product.featuredImage?.url,
          [domain, checkoutHost, 'cdn.shopify.com'].filter(Boolean),
        );
        return [
          {
            id: product.id,
            title: product.title,
            description: product.description?.slice(0, 240),
            category: product.productType || 'Crystals',
            image: imageUrl
              ? {
                  url: imageUrl,
                  altText: product.featuredImage.altText?.slice(0, 512) ?? null,
                }
              : null,
            variantId: first.id,
            variantTitle: first.title,
            available: first.available,
            amount: first.amount,
            currency: first.currency,
            variants,
            hasMoreVariants: options.pageInfo.hasNextPage,
          },
        ];
      });
      const catalogue = {
        mode: 'live',
        products,
        nextCursor: pageInfo.hasNextPage ? pageInfo.endCursor : null,
      };
      if (!Check(ProductCatalogueSchema, catalogue))
        throw new Error('Invalid Shopify collection');
      return catalogue;
    },

    async checkout(input) {
      if (!configured) return null;
      const request =
        typeof input === 'string' ? { variantId: input } : { lines: input };
      if (!Check(CheckoutRequestSchema, request))
        throw new Error('Invalid checkout request');
      const lines =
        'lines' in request
          ? request.lines
          : [{ variantId: request.variantId, quantity: 1 }];
      const expected = new Map(
        lines.map(({ variantId, quantity }) => [variantId, quantity]),
      );
      if (expected.size !== lines.length)
        throw new Error('Duplicate checkout items');

      const availability = await query(
        `query CheckoutVariants($ids: [ID!]!) @inContext(country: IN) {
          nodes(ids: $ids) { ... on ProductVariant { id availableForSale } }
        }`,
        { ids: [...expected.keys()] },
      );
      if (
        !Array.isArray(availability.nodes) ||
        availability.nodes.length !== expected.size
      )
        throw new Error('Invalid Shopify variant lookup');
      const available = new Set(
        availability.nodes
          .filter((node) => node?.availableForSale === true)
          .map((node) => node.id),
      );
      if ([...expected.keys()].some((id) => !available.has(id)))
        throw cartItemsUnavailable();

      const data = await query(
        `mutation CreateCheckout($input: CartInput!, $lineCount: Int!) {
          cartCreate(input: $input) {
            cart {
              checkoutUrl
              lines(first: $lineCount) {
                pageInfo { hasNextPage }
                nodes { quantity merchandise { ... on ProductVariant { id } } }
              }
            }
            userErrors { code }
            warnings { code }
          }
        }`,
        {
          input: {
            buyerIdentity: { countryCode: 'IN' },
            lines: lines.map(({ variantId, quantity }) => ({
              merchandiseId: variantId,
              quantity,
            })),
          },
          lineCount: SHOP_CART_MAX_LINES,
        },
      );
      const { userErrors, warnings, cart } = data.cartCreate ?? {};
      if (!Array.isArray(userErrors) || !Array.isArray(warnings))
        throw new Error('Invalid Shopify cart');
      if (userErrors.length || warnings.length) throw cartItemsUnavailable();
      if (
        !Array.isArray(cart?.lines?.nodes) ||
        typeof cart.lines.pageInfo?.hasNextPage !== 'boolean'
      )
        throw new Error('Invalid Shopify cart');
      const actual = new Map(
        cart.lines.nodes.map((line) => [line?.merchandise?.id, line?.quantity]),
      );
      if (
        cart.lines.pageInfo.hasNextPage ||
        cart.lines.nodes.length !== expected.size ||
        actual.size !== expected.size ||
        [...expected].some(([id, quantity]) => actual.get(id) !== quantity)
      )
        throw cartItemsUnavailable();

      const checkoutUrl = hostedCheckoutUrl(cart.checkoutUrl, {
        domain,
        checkoutHost,
      });
      if (!checkoutUrl) throw new Error('Invalid checkout URL');
      return { checkoutUrl };
    },
  };
}
