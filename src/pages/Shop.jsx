import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ShoppingBag, RefreshCw } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import CosmicBackground from '../components/CosmicBackground';
import AnimatedTitle from '../components/AnimatedTitle';
import { request } from '../lib/api';
import { productEnquiryHref } from '../../shared/contact.js';
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
  const [catalog, setCatalog] = useState(null),
    [error, setError] = useState(''),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('featured'),
    [busy, setBusy] = useState(null),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    request('products', undefined, controller.signal)
      .then(setCatalog)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, [reload]);
  async function checkout(product) {
    setBusy(product.id);
    setError('');
    try {
      const result = await request('checkout', {
        variantId: product.variantId,
      });
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setError(e.message);
      setBusy(null);
    }
  }
  const products = (catalog?.products || [])
    .filter((p) =>
      `${p.title} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'low'
        ? Number(a.amount) - Number(b.amount)
        : sort === 'high'
          ? Number(b.amount) - Number(a.amount)
          : 0,
    );
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
        <div className="shop-toolbar">
          <div>
            <span className="product-count">
              {catalog
                ? `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`
                : 'Loading…'}
            </span>
          </div>
          <div className="shop-controls">
            <label className="sr-only" htmlFor="shop-search">
              Search the collection
            </label>
            <input
              id="shop-search"
              placeholder="Find your crystal…"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="sr-only" htmlFor="shop-sort">
              Sort products
            </label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
        </div>
        {error && (
          <div role="alert" className="shop-error">
            {error}
            <button onClick={() => setReload((n) => n + 1)}>
              <RefreshCw size={14} /> Retry collection
            </button>
          </div>
        )}
        {!catalog && !error && (
          <div
            className="shop-grid"
            aria-label="Loading collection"
            aria-busy="true"
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="product-skeleton" />
            ))}
          </div>
        )}
        <div className="shop-grid">
          {products.map((p) => (
            <article className="crystal-product" key={p.id}>
              <div className={`product-art ${p.tone || 'live'}`}>
                {p.image ? (
                  <img
                    src={p.image.url}
                    alt={p.image.altText || p.title}
                    loading="lazy"
                    width="400"
                    height="340"
                  />
                ) : (
                  <Bracelet tone={p.tone} name={p.title} />
                )}
              </div>
              <div className="product-content">
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <div className="product-purchase">
                  <span>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: p.currency,
                      maximumFractionDigits: 0,
                    }).format(Number(p.amount))}
                  </span>
                  {catalog.mode === 'live' ? (
                    <button
                      disabled={!p.available || busy !== null}
                      onClick={() => checkout(p)}
                      aria-label={`Buy ${p.title}`}
                    >
                      <ShoppingBag size={17} />
                      {busy === p.id
                        ? 'Opening…'
                        : p.available
                          ? 'Buy now'
                          : 'Sold out'}
                    </button>
                  ) : (
                    <a
                      href={productEnquiryHref(p)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Enquire <ArrowUpRight size={17} />
                    </a>
                  )}
                </div>
                {p.variantTitle && p.variantTitle !== 'Default Title' && (
                  <small className="variant-caption">{p.variantTitle}</small>
                )}
              </div>
            </article>
          ))}
        </div>
        {catalog && !products.length && (
          <p className="collection-empty">
            No pieces match your search. Try another name.
          </p>
        )}
      </div>
    </div>
  );
}
