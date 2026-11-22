// Production-like local preview of the built site. Applies the rewrites and
// headers from vercel.json (including the Content-Security-Policy) so routing
// and browser security policy can be tested before deployment. /api is proxied
// to the local API. Local use only: binds to 127.0.0.1.
//
//   node scripts/serve-dist.js [--port 4173] [--api http://127.0.0.1:3001]
import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const port = Number(option('--port', 4173));
const api = new URL(option('--api', 'http://127.0.0.1:3001'));
if (!['127.0.0.1', 'localhost'].includes(api.hostname))
  throw new Error('The preview server only proxies to a local API');

const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
// The sources in vercel.json are written as plain regular expressions.
const anchored = (source) => new RegExp(`^${source}$`);
const rewrites = config.rewrites.map((rule) => ({
  test: anchored(rule.source),
  destination: rule.destination,
}));
const headerRules = config.headers.map((rule) => ({
  test: anchored(rule.source),
  headers: rule.headers,
}));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json',
};

async function existingFile(pathname) {
  const file = normalize(join(dist, decodeURIComponent(pathname)));
  if (!file.startsWith(dist + sep) && file !== dist) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return file;
    if (info.isDirectory()) {
      const index = join(file, 'index.html');
      if ((await stat(index)).isFile()) return index;
    }
  } catch {}
  return null;
}

function proxy(req, res) {
  const upstream = httpRequest(
    {
      host: api.hostname,
      port: api.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: api.host },
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end('{"error":"Local API unavailable","code":"PREVIEW_API_DOWN"}');
  });
  req.pipe(upstream);
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://preview.local');
  if (pathname === '/api' || pathname.startsWith('/api/'))
    return proxy(req, res);
  // Like the hosting platform: real files first, then the first matching rewrite.
  let file = await existingFile(pathname);
  if (!file) {
    const rule = rewrites.find(({ test }) => test.test(pathname));
    if (rule) file = await existingFile(rule.destination);
  }
  for (const rule of headerRules)
    if (rule.test.test(pathname))
      for (const { key, value } of rule.headers)
        // Local preview is plain HTTP; HSTS/upgrade only make sense over TLS.
        if (key !== 'Strict-Transport-Security')
          res.setHeader(
            key,
            key === 'Content-Security-Policy'
              ? value.replace('; upgrade-insecure-requests', '')
              : value,
          );
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  const type = types[extname(file)] ?? 'application/octet-stream';
  res.setHeader('content-type', type);
  res.setHeader('vary', 'Accept-Encoding');
  const body = await readFile(file);
  // Like the hosting CDN, compress text responses for clients that accept it.
  if (
    /^(text\/|application\/(json|xml)|image\/svg)/.test(type) &&
    /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  ) {
    res.setHeader('content-encoding', 'gzip');
    return res.end(gzipSync(body));
  }
  res.end(body);
}).listen(port, '127.0.0.1', () =>
  console.log(`Production-like preview on http://127.0.0.1:${port}`),
);
