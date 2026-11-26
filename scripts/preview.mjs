// Browser preview of the TV UI, in Node — no Python, no Docker, no dependencies.
// Mirrors scripts/preview.py routing so the app renders in a desktop browser for fast
// UI iteration. Serves the public bundle (the private-font overlay in preview.py is not
// reproduced here); device actions degrade gracefully because window.tizen is absent.
//
//   node scripts/preview.mjs [--port N]      (or: npm run preview)  default port 4795
//   PORT=0 node scripts/preview.mjs          pick a free port
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalize, extname, join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = join(ROOT, 'app');
const BUILD = join(ROOT, 'scripts', 'materials');

const argPort = (() => {
  const i = process.argv.indexOf('--port');
  return i >= 0 ? Number(process.argv[i + 1]) : undefined;
})();
const PORT = argPort ?? (process.env.PORT !== undefined ? Number(process.env.PORT) : 4795);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon', '.webp': 'image/webp'
};

// Resolve a request path to a file under one of the allowed roots, or null if it escapes.
function resolve(route) {
  if (route === '/' ) return { redirect: '/home/' };
  if (route === '/home' || route === '/home/') return { file: join(APP, 'index.html') };
  let base = APP, rel = route.replace(/^\//, '');
  if (route.startsWith('/home/')) { base = APP; rel = route.slice('/home/'.length); }
  else if (route.startsWith('/build/')) { base = BUILD; rel = route.slice('/build/'.length); }
  const full = normalize(join(base, rel));
  if (full !== base && !full.startsWith(base + (process.platform === 'win32' ? '\\' : '/'))) return null;
  return { file: full };
}

const server = createServer(async (req, res) => {
  const route = decodeURIComponent((req.url || '/').split('?')[0]);
  const hit = resolve(route);
  res.setHeader('Cache-Control', 'no-store');
  if (!hit) { res.writeHead(403).end('Forbidden'); return; }
  if (hit.redirect) { res.writeHead(302, { Location: hit.redirect }).end(); return; }
  try {
    const body = await readFile(hit.file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(hit.file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found: ' + route);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const p = server.address().port;
  console.log('CleanFrame preview: http://127.0.0.1:' + p + '/home/');
  console.log('(public bundle; device actions are inert without a TV. Ctrl+C to stop.)');
});
