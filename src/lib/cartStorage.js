// Per-browser cart persistence. Stores only provider variant IDs and
// quantities (no prices, names or personal data); Shopify revalidates every
// line, price and stock level at checkout. Storage can be unavailable (private
// mode, blocked site data), so every access is guarded and failure means an
// empty cart rather than an error.
const KEY = 'crystals-chakra:cart:v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CART_LINES = 20;
export const MAX_LINE_QUANTITY = 10;

export function sanitizeCart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const cart = {};
  for (const [id, quantity] of Object.entries(value)) {
    if (Object.keys(cart).length >= MAX_CART_LINES) break;
    if (
      typeof id === 'string' &&
      id.length > 0 &&
      id.length <= 200 &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= MAX_LINE_QUANTITY
    )
      cart[id] = quantity;
  }
  return cart;
}

export function loadCart(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const stored = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (!stored || typeof stored.savedAt !== 'number') return {};
    if (now - stored.savedAt > MAX_AGE_MS || stored.savedAt > now + 60000) {
      storage.removeItem(KEY);
      return {};
    }
    return sanitizeCart(stored.lines);
  } catch {
    return {};
  }
}

export function saveCart(
  cart,
  storage = globalThis.localStorage,
  now = Date.now(),
) {
  try {
    const lines = sanitizeCart(cart);
    if (Object.keys(lines).length === 0) storage?.removeItem(KEY);
    else storage?.setItem(KEY, JSON.stringify({ savedAt: now, lines }));
  } catch {
    // Storage is a convenience; the in-memory cart keeps working without it.
  }
}
