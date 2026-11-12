// Writes static HTML for public routes after `vite build`, so visitors, search
// engines and link previews get the studio's purpose, reading packages and
// WhatsApp/telephone links before JavaScript runs. The browser then hydrates.
//
// dist/index.html  → "/" (prerendered)
// dist/shop/index.html, dist/policies/index.html → "/shop", "/policies"
// dist/app.html    → empty shell for every other client route (studio, 404)
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
export const PRERENDERED_ROUTES = ['/', '/shop', '/policies'];

const template = await readFile(join(dist, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>'))
  throw new Error('dist/index.html has no empty #root to fill');
await writeFile(join(dist, 'app.html'), template);

const { render } = await import(
  pathToFileURL(join(ssrDir, 'entry-server.js')).href
);
const escapeAttribute = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

for (const route of PRERENDERED_ROUTES) {
  const { html, helmet } = await render(route);
  if (!html || html.includes('<script'))
    throw new Error(`Unexpected prerender output for ${route}`);
  const head = helmet
    ? [helmet.title, helmet.meta, helmet.link]
        .map((part) => part.toString())
        .join('')
    : '';
  // Page-specific metadata replaces the template defaults.
  const page = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace('</head>', `${head}</head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="${escapeAttribute(route)}">${html}</div>`,
    );
  const file =
    route === '/' ? join(dist, 'index.html') : join(dist, route, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page);
  console.log(`prerendered ${route} → ${file.slice(root.length + 1)}`);
}
await rm(ssrDir, { recursive: true, force: true });
