import '../loading.css';

export function CollectionSkeleton() {
  return (
    <div className="collection-loading" aria-busy="true">
      <div className="collection-loading-toolbar">
        <p role="status">Gathering the collection…</p>
        <span className="loading-toolbar-shape" aria-hidden="true" />
      </div>
      <div className="loading-collection-grid" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <div className="loading-product" key={item}>
            <div className="loading-product-art"><span>✧</span></div>
            <div className="loading-product-copy">
              <span className="loading-line loading-line-title" />
              <span className="loading-line" />
              <span className="loading-line loading-line-short" />
              <span className="loading-line loading-line-action" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudioLoadingCard({ title = 'Opening the studio…' }) {
  return (
    <section className="studio-auth-card studio-loading-card" aria-busy="true">
      <span className="loading-emblem" aria-hidden="true">✧</span>
      <h2>{title}</h2>
      <p role="status">Preparing your secure workspace. This may take a moment.</p>
      <div className="loading-form-shapes" aria-hidden="true">
        <span /><span /><span />
      </div>
    </section>
  );
}

export default function PageLoading({ variant = 'default', title = 'Opening this page…' }) {
  return (
    <div className={`page-loading page-loading-${variant}`}>
      <div className="page-loading-content">
        {variant === 'studio' ? (
          <>
            <header className="page-loading-heading"><h1>Studio</h1><p>Readings, publishing and day-to-day work.</p></header>
            <StudioLoadingCard title={title} />
          </>
        ) : (
          <>
            <header className="page-loading-heading">
              <span className="loading-emblem" aria-hidden="true">✧</span>
              <h1>{variant === 'shop' ? 'Crystals & Tools' : title}</h1>
              <p role={variant === 'shop' ? undefined : 'status'}>{variant === 'shop' ? title : 'One moment while we prepare your page.'}</p>
            </header>
            {variant === 'shop' ? <CollectionSkeleton /> : <div className="loading-page-shape" aria-hidden="true" />}
          </>
        )}
      </div>
    </div>
  );
}
