import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppShell } from './App.jsx';

/**
 * Build-time render of a public route with React 19's static prerender, which
 * waits for lazy routes and data. Used only by scripts/prerender.js; never
 * runs in production.
 */
export async function render(url) {
  const helmetContext = {};
  const { prelude } = await prerenderToNodeStream(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <AppShell />
      </StaticRouter>
    </HelmetProvider>,
    // By default React "outlines" large Suspense boundaries into a hidden
    // segment plus an inline reveal script, which the strict CSP would block.
    // A static page should be one complete document.
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return { html, helmet: helmetContext.helmet };
}
