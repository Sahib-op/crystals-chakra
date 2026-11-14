// Bundle budget for the public entry, measured on the production build.
// Fails when the critical path grows past the limits below, or when the 3D
// scene leaks into the initial HTML. Budgets are set a little above the
// measured sizes on 12 November 2026 (docs/LAUNCH-PLAN.md) so growth is a
// deliberate decision.
import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const KB = 1024;
const BUDGET = {
  // Entry plus every modulepreloaded chunk: the bundler can move shared code
  // between them, so the entry file alone can understate first-load JS.
  // React 19 + Motion 14 (full components: LazyMotion's m components did
  // not animate in this setup, breaking the header and side rail) measured
  // 159 KB on 14 Nov 2026, up from 129.6 KB on React 18 + framer-motion 11.
  initialJs: 165 * KB, // gzip
  entryCss: 25 * KB, // gzip
  introJs: 6 * KB, // gzip, render-path script
  homeHtml: 30 * KB, // gzip, prerendered page
};
const gz = async (path) => gzipSync(await readFile(path)).length;
const html = await readFile(dist + 'index.html', 'utf8');
const entry = html.match(
  /<script type="module"[^>]*src="\/(assets\/[^"]+\.js)"/,
)?.[1];
const preloaded = [
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
    await Promise.all([entry, ...preloaded].map((file) => gz(dist + file)))
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
if (preloaded.some((file) => file.startsWith('assets/createScene'))) {
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
