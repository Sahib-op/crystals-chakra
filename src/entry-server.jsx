import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppShell } from './App.jsx';

/**
 * Build-time render of a public route. Waits for every lazy route and Suspense
 * boundary (onAllReady) so the HTML is complete and contains no streaming
 * scripts. Used only by scripts/prerender.js; never runs in production.
 */
export function render(url) {
  const helmetContext = {};
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new PassThrough();
    sink.setEncoding('utf8');
    sink.on('data', (chunk) => (html += chunk));
    sink.on('end', () => resolve({ html, helmet: helmetContext.helmet }));
    const { pipe } = renderToPipeableStream(
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <AppShell />
        </StaticRouter>
      </HelmetProvider>,
      {
        onAllReady() {
          pipe(sink);
        },
        onShellError: reject,
        onError: reject,
      },
    );
  });
}
