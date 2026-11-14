// Bundle budget for the homepage's first load, measured on the production
// build. initialJs counts the entry script plus every chunk the HTML
// modulepreloads, because the bundler can move shared code between them
// (counting the entry alone hid ~16 KB after the Vite 8 upgrade). Fails when
// the critical path grows past these limits or the 3D scene is preloaded.
// Budgets sit a little above the sizes measured on 14 November 2026.
import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const KB = 1024;
const BUDGET = {
  initialJs: 155 * KB, // gzip, entry + modulepreloaded chunks (149 KB)
  entryCss: 25 * KB, // gzip
  introJs: 6 * KB, // gzip, render-path script
  homeHtml: 30 * KB, // gzip, prerendered page
};
const gz = async (path) => gzipSync(await readFile(path)).length;
const html = await readFile(dist + 'index.html', 'utf8');
const entry = html.match(
  /<script type="module"[^>]*src="\/(assets\/[^"]+\.js)"/,
)?.[1];
const preloadedJs = [
  ...html.matchAll(
    /<link rel="modulepreload"[^>]*href="\/(assets\/[^"]+\.js)"/g,
  ),
].map((m) => m[1]);
const css = [
  ...html.matchAll(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"/g),
].map((m) => m[1]);
if (!entry || !css.length)
  throw new Error('Could not find the entry assets in dist/index.html');

const measured = {
  initialJs: (
    await Promise.all([entry, ...preloadedJs].map((file) => gz(dist + file)))
  ).reduce((a, b) => a + b, 0),
  entryCss: (await Promise.all(css.map((file) => gz(dist + file)))).reduce(
    (a, b) => a + b,
    0,
  ),
  introJs: await gz(dist + 'intro.js'),
  homeHtml: await gz(dist + 'index.html'),
};
let failed = false;
for (const [name, limit] of Object.entries(BUDGET)) {
  const ok = measured[name] <= limit;
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(9)} ${(measured[name] / KB).toFixed(1).padStart(6)} KB gzip (budget ${limit / KB} KB)`,
  );
}
const preloaded = [
  ...html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([^"]+)"/g),
].map((m) => m[1]);
if (preloaded.some((file) => file.startsWith('createScene'))) {
  console.log('FAIL the WebGL scene is preloaded on the critical path');
  failed = true;
}
const assets = await readdir(dist + 'assets');
const scene = assets.find(
  (file) => file.startsWith('createScene') && file.endsWith('.js'),
);
if (scene)
  console.log(
    `info 3D scene chunk ${((await stat(dist + 'assets/' + scene)).size / KB).toFixed(0)} KB (lazy, capable devices only)`,
  );
if (failed) process.exitCode = 1;
