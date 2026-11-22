// Per-browser cart persistence. Stores only provider variant IDs and
// quantities (no prices, names or personal data); Shopify revalidates every
// line, price and stock level at checkout. Storage can be unavailable (private
// mode, blocked site data), so every access is guarded and failure means an
// empty cart rather than an error.
import {
  SHOP_CART_MAX_LINES as MAX_CART_LINES,
  SHOP_CART_MAX_QUANTITY as MAX_LINE_QUANTITY,
  SHOP_VARIANT_ID_MAX_LENGTH,
  SHOP_VARIANT_ID_PATTERN,
} from '../../shared/cart.ts';

export { MAX_CART_LINES, MAX_LINE_QUANTITY };
type Cart = Record<string, number>;
type CartStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const variantId = new RegExp(SHOP_VARIANT_ID_PATTERN);
const KEY = 'crystals-chakra:cart:v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function sanitizeCart(value: unknown): Cart {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const cart: Cart = {};
  for (const [id, quantity] of Object.entries(value)) {
    if (Object.keys(cart).length >= MAX_CART_LINES) break;
    if (
      id.length <= SHOP_VARIANT_ID_MAX_LENGTH &&
      variantId.test(id) &&
      typeof quantity === 'number' &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= MAX_LINE_QUANTITY
    )
      cart[id] = quantity;
  }
  return cart;
}

export function loadCart(storage?: CartStorage, now = Date.now()): Cart {
  try {
    storage ??= globalThis.localStorage;
    const stored = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (!stored || !Number.isFinite(stored.savedAt)) return {};
    if (now - stored.savedAt > MAX_AGE_MS || stored.savedAt > now + 60000) {
      storage?.removeItem(KEY);
      return {};
    }
    return sanitizeCart(stored.lines);
  } catch {
    return {};
  }
}

export function saveCart(cart: Cart, storage?: CartStorage, now = Date.now()) {
  try {
    storage ??= globalThis.localStorage;
    const lines = sanitizeCart(cart);
    if (Object.keys(lines).length === 0) storage?.removeItem(KEY);
    else storage?.setItem(KEY, JSON.stringify({ savedAt: now, lines }));
  } catch {
    // Storage is a convenience; the in-memory cart keeps working without it.
  }
}
