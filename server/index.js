import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname, sep } from 'node:path';
import { Store } from './store.js';
import { createApi } from './app.js';
import { newToken, hashToken } from './security.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const origin = new URL(process.env.APP_ORIGIN ?? `http://127.0.0.1:${port}`);
if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('APP_ORIGIN must contain only scheme, host, and optional port.');
if (!dev && origin.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('Use an HTTPS APP_ORIGIN for a non-local production server.');
const dataDir = resolve(process.env.DATA_DIR ?? join(root, '.tracker.local'));
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const store = new Store(join(dataDir, 'tracker.sqlite'));
if (!store.hasUsers()) {
  const tokenPath = join(dataDir, 'setup-code.txt');
  const token = existsSync(tokenPath) ? readFileSync(tokenPath, 'utf8').trim() : newToken('mcs_setup');
  writeFileSync(tokenPath, token + '\n', { mode: 0o600 });
  store.run("INSERT INTO settings VALUES ('setup_token_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", hashToken(token));
  console.log('Set the shared password in the browser. Your one-time setup code is in .tracker.local/setup-code.txt.');
}
const manifest = JSON.parse(readFileSync(join(root, 'public/item-icons/manifest.json'), 'utf8'));
const allowedOrigins = [origin.origin];
if (dev) allowedOrigins.push(`http://localhost:${port}`);
const api = await createApi({ store, allowedOrigins, secureCookie: origin.protocol === 'https:', iconManifest: manifest.items });
let vite;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!dev) res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if (origin.protocol === 'https:') res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  let path;
  try { path = decodeURIComponent(new URL(req.url, origin).pathname); } catch { res.writeHead(400); return res.end('Invalid URL'); }
  const requestedFile = resolve(path.startsWith('/@fs/') ? path.slice(5) : join(root, path.replace(/^\//, '')));
  if (requestedFile.toLowerCase() === dataDir.toLowerCase() || requestedFile.toLowerCase().startsWith((dataDir + sep).toLowerCase())) {
    res.writeHead(404); return res.end('Not found');
  }
  if (path === '/api' || path.startsWith('/api/')) return api.handle(req, res);
  const protectedIconFile = [join(root, 'public', 'item-icons'), join(root, 'dist', 'item-icons')]
    .some(directory => requestedFile.toLowerCase().startsWith((directory + sep).toLowerCase()));
  if (path.startsWith('/item-icons/') || protectedIconFile) {
    try { api.checkOrigin(req); api.requireUser(req, 'items:read'); }
    catch (error) { res.writeHead(error.status ?? 401, { 'Cache-Control': 'no-store' }); return res.end('Authentication required'); }
  }
  // Never serve server source, databases, setup codes, environment files, or development configuration.
  const viteDependencyPath = dev && (path.startsWith('/node_modules/') || (path.startsWith('/@fs/') && path.includes('/node_modules/')));
  if (path.includes('\\') || path.split('/').some(part => part.startsWith('.') && !(viteDependencyPath && ['.vite', '.pnpm'].includes(part))) || /^\/(server|scripts|data)\b/.test(path) || /\.(sqlite|db|env)(-|\.|$)/i.test(path)) {
    res.writeHead(404); return res.end('Not found');
  }
  if (dev) return vite.middlewares(req, res, () => { res.writeHead(404); res.end('Not found'); });
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  const relative = path === '/' ? 'index.html' : path.replace(/^\//, '');
  if (!(relative === 'index.html' || relative === 'mc-bg.svg' || relative === 'favicon.ico' || /^(assets|item-icons)\//.test(relative))) { res.writeHead(404); return res.end('Not found'); }
  const dist = join(root, 'dist');
  const filePath = resolve(dist, relative);
  if (!filePath.startsWith(dist + sep)) { res.writeHead(404); return res.end(); }
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(filePath));
  } catch { res.writeHead(404); res.end('Not found'); }
});

if (dev) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server },
    fs: { deny: ['.env', '.env.*', '**/.git/**', '**/server/**', '**/scripts/**', '**/*.sqlite*', dataDir.replaceAll('\\', '/') + '/**'] },
  }, appType: 'spa' });
}
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(port, host, () => console.log(`Minecraft Tracker listening at ${origin.origin}${dev ? ' (development)' : ''}`));

async function shutdown() {
  server.close(async () => { await vite?.close(); store.close(); process.exit(0); });
  server.closeIdleConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
