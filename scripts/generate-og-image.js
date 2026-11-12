// Generates public/og-image.jpg (1200×630) for WhatsApp/social link previews.
// Uses the unchanged logo file and the self-hosted brand fonts; rerun when the
// tagline changes:  node scripts/generate-og-image.js
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const file = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const logo = await readFile(file('public/favicon.svg'), 'utf8');
const font = async (path) =>
  (await readFile(file(`node_modules/${path}`))).toString('base64');
const playfair = await font(
  '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2',
);
const playfairItalic = await font(
  '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2',
);
const inter = await font(
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
);

const html = `<!doctype html><html><head><style>
@font-face{font-family:P;src:url(data:font/woff2;base64,${playfair}) format('woff2');font-weight:400 900}
@font-face{font-family:P;font-style:italic;src:url(data:font/woff2;base64,${playfairItalic}) format('woff2');font-weight:400 900}
@font-face{font-family:I;src:url(data:font/woff2;base64,${inter}) format('woff2');font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;display:flex;align-items:center;gap:64px;padding:0 96px;
 background:radial-gradient(circle at 82% 30%,#f9e0a466,transparent 55%),linear-gradient(135deg,#fbf3e2,#f1dfbc);
 color:#092d48;font-family:I;position:relative;overflow:hidden}
body:before{content:"";position:absolute;inset:28px;border:2px solid #ba8c37;border-radius:6px}
.logo{width:260px;height:260px;flex:none}
.logo svg{width:100%;height:100%}
h1{font-family:P;font-weight:600;font-size:84px;line-height:1}
h1 em{display:block;color:#a67c2e;font-style:italic;font-weight:500}
p{margin-top:28px;font-size:30px;line-height:1.35;color:#25485e;max-width:640px}
</style></head><body><div class="logo">${logo}</div><div>
<h1>Crystals Chakra<em>Unlock Your Destiny</em></h1>
<p>Personal tarot and Vedic astrology readings. Talk to the studio on WhatsApp or by phone.</p>
</div></body></html>`;

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: file('public/og-image.jpg'),
  type: 'jpeg',
  quality: 86,
});
await browser.close();
console.log('wrote public/og-image.jpg');
