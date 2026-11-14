import { request } from './api';

// Start loading the shop as soon as a visitor shows intent (hover, focus or
// touch on a shop link), so the page and its catalogue are often ready by the
// time the click lands. On a cold API host this also starts waking it early.
let shopCode = null;
let products = null;
let productsAt = 0;
const FRESH_MS = 60_000;

export function loadShopPage() {
  shopCode ??= import('../pages/Shop');
  return shopCode;
}

export function prefetchShop() {
  loadShopPage().catch(() => {
    shopCode = null; // let the real navigation retry
  });
  if (!products || Date.now() - productsAt > FRESH_MS) {
    productsAt = Date.now();
    products = request('products');
    products.catch(() => {
      products = null;
    });
  }
}

// The shop's first catalogue request reuses a prefetch that is still fresh.
export function takePrefetchedProducts() {
  const pending =
    products && Date.now() - productsAt <= FRESH_MS ? products : null;
  products = null;
  return pending;
}
