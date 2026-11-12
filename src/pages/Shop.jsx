import { Link } from 'react-router-dom';
import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import PageMeta from '../components/PageMeta';
import CosmicBackground from '../components/CosmicBackground';
import AnimatedTitle from '../components/AnimatedTitle';
import { request } from '../lib/api';
import { productEnquiryHref } from '../../shared/contact.js';
import './shop-commerce.css';

const MAX_CART_LINES = 20;
const MAX_LINE_QUANTITY = 10;

function formatPrice(amount, currency) {
  const value = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    ...(Number.isInteger(value) ? { minimumFractionDigits: 0 } : {}),
  }).format(value);
}

function variantLabel(product, variant) {
  return variant.title === 'Default Title'
    ? product.title
    : product.title + ' · ' + variant.title;
}

function ProductCard({ product, live, cart, onAdd, onViewCart, busy }) {
  const selectId = useId();
  const [selected, setSelected] = useState('');
  const variants = product.variants ?? [];
  const variant =
    variants.find((item) => item.id === selected) ??
    variants.find((item) => item.available) ??
    variants[0];
  const quantity = variant ? (cart[variant.id] ?? 0) : 0;
  const atLimit =
    quantity >= MAX_LINE_QUANTITY ||
    (!quantity && Object.keys(cart).length >= MAX_CART_LINES);
  return (
    <article className="crystal-product">
      <div className={'product-art ' + (product.tone || 'live')}>
        {product.image ? (
          <img
            src={product.image.url}
            alt={product.image.altText || product.title}
            loading="lazy"
            width="400"
            height="340"
          />
        ) : live ? (
          <ShoppingBag
            className="shop-product-placeholder"
            aria-hidden="true"
          />
        ) : (
          <Bracelet tone={product.tone} name={product.title} />
        )}
      </div>
      <div className="product-content">
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        {live && variants.length > 1 && (
          <div className="shop-variant">
            <label htmlFor={selectId}>
              Option <span className="sr-only">for {product.title}</span>
            </label>
            <select
              id={selectId}
              value={variant?.id ?? ''}
              onChange={(event) => setSelected(event.target.value)}
            >
              {variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                  {item.available ? '' : ' · Sold out'}
                </option>
              ))}
            </select>
          </div>
        )}
        {live && variants.length === 1 && variant.title !== 'Default Title' && (
          <div className="shop-variant">{variant.title}</div>
        )}
        {live && product.hasMoreVariants && (
          <a
            className="shop-more-options"
            href={productEnquiryHref(product)}
            target="_blank"
            rel="noreferrer"
          >
            Ask about other options{' '}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        )}
        <div className="product-purchase">
          <span>
            {formatPrice(
              variant?.amount ?? product.amount,
              variant?.currency ?? product.currency,
            )}
          </span>
          {live ? (
            <button
              type="button"
              disabled={!variant?.available || busy || atLimit}
              onClick={() => onAdd(product, variant)}
              aria-label={
                variant?.available && !atLimit
                  ? 'Add ' + variantLabel(product, variant) + ' to cart'
                  : undefined
              }
            >
              <ShoppingBag size={17} aria-hidden="true" />
              {!variant?.available
                ? 'Sold out'
                : atLimit
                  ? 'Cart limit reached'
                  : 'Add to cart'}
            </button>
          ) : (
            <a
              href={productEnquiryHref(product)}
              target="_blank"
              rel="noreferrer"
            >
              Enquire <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          )}
        </div>
        {quantity > 0 && (
          <button type="button" className="shop-view-cart" onClick={onViewCart}>
            View cart · {quantity} added
          </button>
        )}
      </div>
    </article>
  );
}

function ShopCart({
  panelRef,
  lines,
  updateQuantity,
  busy,
  error,
  onCheckout,
}) {
  const summaryRef = useRef(null);
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
  const subtotals = new Map();
  for (const { variant, quantity } of lines) {
    const subtotal =
      (subtotals.get(variant.currency) ?? 0) +
      Number(variant.amount) * quantity;
    subtotals.set(variant.currency, subtotal);
  }
  return (
    <details className="shop-cart" ref={panelRef}>
      <summary ref={summaryRef}>
        <span>
          <ShoppingBag size={18} aria-hidden="true" /> Your cart
        </span>
        <span>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          <ChevronDown size={17} aria-hidden="true" />
        </span>
      </summary>
      <div className="shop-cart-content">
        {lines.length ? (
          <>
            <ul className="shop-cart-lines">
              {lines.map(({ product, variant, quantity }) => {
                const label = variantLabel(product, variant);
                return (
                  <li key={variant.id}>
                    <div>
                      <strong>{product.title}</strong>
                      {variant.title !== 'Default Title' && (
                        <span>{variant.title}</span>
                      )}
                      <span>
                        {formatPrice(variant.amount, variant.currency)} each
                      </span>
                    </div>
                    <div className="shop-cart-quantity">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(variant.id, quantity - 1, label)
                        }
                        disabled={busy || quantity <= 1}
                        aria-label={'Decrease quantity of ' + label}
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(variant.id, quantity + 1, label)
                        }
                        disabled={busy || quantity >= MAX_LINE_QUANTITY}
                        aria-label={'Increase quantity of ' + label}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="shop-cart-remove"
                        disabled={busy}
                        onClick={() => {
                          summaryRef.current?.focus();
                          updateQuantity(variant.id, 0, label);
                        }}
                        aria-label={'Remove ' + label}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="shop-cart-footer">
              <div>
                <p>
                  Estimated subtotal{' '}
                  <strong>
                    {Array.from(subtotals, ([currency, total]) =>
                      formatPrice(total, currency),
                    ).join(' + ')}
                  </strong>
                </p>
                <p>Shipping and final total appear in Shopify checkout.</p>
              </div>
              <button
                type="button"
                className="shop-checkout"
                disabled={busy}
                onClick={onCheckout}
              >
                {busy ? 'Opening checkout…' : 'Continue to checkout'}{' '}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </div>
            {error && (
              <p role="alert" className="shop-checkout-error">
                {error}
              </p>
            )}
          </>
        ) : (
          <p>Your cart is empty.</p>
        )}
      </div>
    </details>
  );
}

function Bracelet({ tone = 'tiger', name }) {
  const colors = {
    tiger: ['#d3ab68', '#6c4022'],
    rose: ['#f4d4d7', '#b87f9b'],
    amethyst: ['#ac91cf', '#4d2e70'],
  };
  const [light, dark] = colors[tone] || colors.tiger;
  return (
    <svg
      viewBox="0 0 300 240"
      role="img"
      aria-label={`${name} — illustrative preview, not a product photograph`}
    >
      <defs>
        <radialGradient id={`bead-${tone}`} cx="30%" cy="25%">
          <stop stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={`shadow-${tone}`}>
          <feDropShadow dx="0" dy="7" stdDeviation="5" floodOpacity=".45" />
        </filter>
      </defs>
      <ellipse cx="150" cy="174" rx="84" ry="19" fill="#000" opacity=".22" />
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i * Math.PI * 2) / 18;
        return (
          <circle
            key={i}
            cx={150 + 72 * Math.cos(a)}
            cy={116 + 56 * Math.sin(a)}
            r="14"
            fill={`url(#bead-${tone})`}
            stroke={light}
            strokeOpacity=".25"
            filter={`url(#shadow-${tone})`}
          />
        );
      })}
      <path d="M145 164l5-8 5 8-5 12z" fill="#d4af37" />
    </svg>
  );
}

export default function Shop() {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [pageError, setPageError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState({});
  const [message, setMessage] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [reload, setReload] = useState(0);
  const cartPanel = useRef(null);
  const pageRequest = useRef(null);
  const checkoutRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError('');
    request('products', undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCatalog(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogError(error.message);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(
    () => () => {
      pageRequest.current?.abort();
      checkoutRequest.current?.abort();
    },
    [],
  );

  async function loadMore() {
    if (!catalog?.nextCursor || pageRequest.current) return;
    const controller = new AbortController();
    pageRequest.current = controller;
    setLoadingMore(true);
    setPageError('');
    try {
      const query = new URLSearchParams({ after: catalog.nextCursor });
      const page = await request(
        'products?' + query,
        undefined,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (
        page.mode !== catalog.mode ||
        page.nextCursor === catalog.nextCursor
      ) {
        throw new Error('The next page of the collection could not be loaded.');
      }
      const loaded = new Set(catalog.products.map((item) => item.id));
      const added = page.products.filter((item) => !loaded.has(item.id));
      setCatalog({
        ...page,
        products: catalog.products.concat(added),
      });
      setMessage(
        added.length +
          (added.length === 1 ? ' piece loaded.' : ' pieces loaded.'),
      );
    } catch (error) {
      if (!controller.signal.aborted) setPageError(error.message);
    } finally {
      pageRequest.current = null;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  function updateQuantity(variantId, quantity, label) {
    if (checkoutRequest.current) return;
    setCheckoutError('');
    setMessage(
      quantity ? label + ' · ' + quantity + ' in cart.' : label + ' removed.',
    );
    setCart((current) => {
      if (quantity === 0) {
        const updated = { ...current };
        delete updated[variantId];
        return updated;
      }
      return { ...current, [variantId]: quantity };
    });
  }

  function addToCart(product, variant) {
    if (checkoutRequest.current) return;
    const quantity = (cart[variant.id] ?? 0) + 1;
    if (
      quantity > MAX_LINE_QUANTITY ||
      (quantity === 1 && Object.keys(cart).length >= MAX_CART_LINES)
    )
      return;
    updateQuantity(variant.id, quantity, variantLabel(product, variant));
  }

  function viewCart() {
    const panel = cartPanel.current;
    if (!panel) return;
    panel.open = true;
    panel.querySelector('summary')?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  const cartLines =
    catalog?.mode === 'live'
      ? catalog.products.flatMap((product) =>
          (product.variants ?? []).flatMap((variant) =>
            cart[variant.id]
              ? [{ product, variant, quantity: cart[variant.id] }]
              : [],
          ),
        )
      : [];

  async function checkout() {
    if (!cartLines.length || checkoutRequest.current) return;
    const controller = new AbortController();
    checkoutRequest.current = controller;
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const result = await request(
        'checkout',
        {
          lines: cartLines.map(({ variant, quantity }) => ({
            variantId: variant.id,
            quantity,
          })),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const destination = new URL(result.checkoutUrl);
      if (
        destination.protocol !== 'https:' ||
        destination.username ||
        destination.password ||
        destination.port
      ) {
        throw new Error('Checkout could not open. Please try again.');
      }
      // The API checks the exact merchant checkout host before returning the URL.
      window.location.assign(destination.href);
    } catch (error) {
      if (!controller.signal.aborted)
        setCheckoutError(
          error instanceof TypeError
            ? 'Checkout could not open. Please try again.'
            : error.message,
        );
    } finally {
      checkoutRequest.current = null;
      if (!controller.signal.aborted) setCheckingOut(false);
    }
  }

  const term = search.trim().toLowerCase();
  const products = (catalog?.products ?? [])
    .filter((product) =>
      (product.title + ' ' + product.description).toLowerCase().includes(term),
    )
    .sort((left, right) => {
      if (sort === 'featured') return 0;
      return (
        left.currency.localeCompare(right.currency) ||
        (Number(left.amount) - Number(right.amount)) *
          (sort === 'high' ? -1 : 1)
      );
    });

  return (
    <div className="royal-shop relative min-h-screen bg-chakra-bg overflow-hidden">
      <PageMeta
        title="Crystal Shop"
        description="Explore the Crystals Chakra collection. Crystals, thoughtful objects and everyday rituals."
        path="/shop"
      />
      <CosmicBackground />
      <div className="cosmic-page relative z-10">
        <div className="shop-return">
          <Link to="/#collection">← Back to the studio</Link>
        </div>
        <section className="shop-heading">
          <AnimatedTitle
            text="Crystals & Tools"
            goldWord="Tools"
            className="font-serif font-bold shop-title"
            startDelay={0.1}
          />
          <div className="ornament-divider" aria-hidden="true">
            <span />✧<span />
          </div>
        </section>
        {catalog?.mode === 'preview' && (
          <div className="shop-preview-note">
            <span className="preview-dot" />
            <p>
              <strong>A first look at the collection.</strong> Illustrative
              previews and indicative prices. Online purchasing will open when
              the collection is ready.
            </p>
          </div>
        )}
        {catalog?.mode === 'live' && (
          <ShopCart
            panelRef={cartPanel}
            lines={cartLines}
            updateQuantity={updateQuantity}
            busy={checkingOut}
            error={checkoutError}
            onCheckout={checkout}
          />
        )}
        {catalog && (
          <div className="shop-toolbar">
            <div>
              <span className="product-count">
                {products.length} {products.length === 1 ? 'piece' : 'pieces'}
                {catalog.nextCursor ? ' in loaded results' : ''}
              </span>
            </div>
            <div className="shop-controls">
              <label className="sr-only" htmlFor="shop-search">
                {catalog.nextCursor
                  ? 'Search loaded products'
                  : 'Search the collection'}
              </label>
              <input
                id="shop-search"
                placeholder={
                  catalog.nextCursor
                    ? 'Search loaded pieces…'
                    : 'Find your crystal…'
                }
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <label className="sr-only" htmlFor="shop-sort">
                Sort products
              </label>
              <select
                id="shop-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </div>
          </div>
        )}
        {catalogError && (
          <div role="alert" className="shop-error">
            {catalogError}
            <button
              type="button"
              onClick={() => setReload((count) => count + 1)}
            >
              <RefreshCw size={14} aria-hidden="true" /> Retry collection
            </button>
          </div>
        )}
        {!catalog && !catalogError && (
          <div
            className="shop-grid"
            aria-label="Loading collection"
            aria-busy="true"
          >
            {[1, 2, 3].map((item) => (
              <div key={item} className="product-skeleton" />
            ))}
          </div>
        )}
        <p role="status" className="sr-only">
          {message}
        </p>
        <div className="shop-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              live={catalog.mode === 'live'}
              cart={cart}
              onAdd={addToCart}
              onViewCart={viewCart}
              busy={checkingOut}
            />
          ))}
        </div>
        {catalog && !products.length && (
          <p className="collection-empty">
            {term
              ? catalog.nextCursor
                ? 'No matches in the pieces loaded so far.'
                : 'No pieces match your search.'
              : 'The collection is empty right now.'}
          </p>
        )}
        {catalog?.nextCursor && (
          <div className="shop-pagination">
            {pageError && <p role="alert">{pageError}</p>}
            <button
              type="button"
              className="shop-checkout"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore
                ? 'Loading more…'
                : pageError
                  ? 'Retry next page'
                  : 'Load more pieces'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
