import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
// Self-hosted OFL fonts (latin subsets load via unicode-range); no third-party
// font requests, so visitor IPs are not shared with a font CDN.
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/playfair-display/wght.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import './index.css';
import './journey.css';
import './opening.css';
import './refinements.css';
import './intro.css';
import './appearance.css';

const container = document.getElementById('root');
const app = (
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
// Hydrate only HTML that was prerendered for this exact route (scripts/prerender.js).
// Any other route arrives with an empty shell and renders normally.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
if (container.dataset.prerendered === path)
  ReactDOM.hydrateRoot(container, app);
else {
  container.replaceChildren();
  ReactDOM.createRoot(container).render(app);
}
