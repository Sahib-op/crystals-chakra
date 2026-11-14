import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppShell } from './App.jsx';
import Shop from './pages/Shop.jsx';
import Policies from './pages/Policies.jsx';
import HowReadingsWork from './pages/HowReadingsWork.jsx';

// Public routes are synchronous here; browser routes retain lazy chunks.
export function render(url) {
  const helmetContext = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <AppShell staticPages={{ Shop, Policies, HowReadingsWork }} />
      </StaticRouter>
    </HelmetProvider>,
  );
  return { html, helmet: helmetContext.helmet };
}
