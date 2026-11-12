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
export function createCommerce({
  domain = process.env.SHOPIFY_STORE_DOMAIN,
  token = process.env.SHOPIFY_STOREFRONT_TOKEN,
  fetcher = fetch,
} = {}) {
  const configured = Boolean(domain && token);
  if (domain && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))
    throw new Error('Invalid Shopify domain');
  async function query(query, variables = {}) {
    const response = await fetcher(
      `https://${domain}/api/2026-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error('Store temporarily unavailable');
    const payload = await response.json();
    if (payload.errors || !payload.data)
      throw new Error('Store temporarily unavailable');
    return payload.data;
  }
  return {
    async products() {
      if (!configured)
        return {
          mode: 'preview',
          products: PREVIEW.map((p) => ({
            ...p,
            available: false,
            variantId: null,
            image: null,
          })),
        };
      const data = await query(
        `query { products(first: 24) { nodes { id title description productType featuredImage { url altText } variants(first: 1) { nodes { id title availableForSale price { amount currencyCode } } } } } }`,
      );
      return {
        mode: 'live',
        products: data.products.nodes.flatMap((p) => {
          const v = p.variants.nodes[0];
          return v
            ? [
                {
                  id: p.id,
                  title: p.title,
                  description: p.description.slice(0, 240),
                  category: p.productType || 'Crystals',
                  image: p.featuredImage,
                  variantId: v.id,
                  variantTitle: v.title,
                  available: v.availableForSale,
                  amount: v.price.amount,
                  currency: v.price.currencyCode,
                },
              ]
            : [];
        }),
      };
    },
    async checkout(variantId) {
      if (!configured) return null;
      const catalog = await this.products();
      if (
        !catalog.products.some((p) => p.variantId === variantId && p.available)
      )
        throw new Error('Product unavailable');
      const data = await query(
        `mutation($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } } }`,
        { input: { lines: [{ merchandiseId: variantId, quantity: 1 }] } },
      );
      if (data.cartCreate.userErrors.length || !data.cartCreate.cart)
        throw new Error('Checkout unavailable');
      const url = new URL(data.cartCreate.cart.checkoutUrl);
      if (url.protocol !== 'https:') throw new Error('Invalid checkout URL');
      return { checkoutUrl: url.href };
    },
  };
}
