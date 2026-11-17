import { timingSafeEqual } from 'node:crypto';
import { ITEMS, ITEMS_BY_ID } from '../src/data/itemsData.js';
import { check, HttpError, hashPassword, verifyPassword, hashToken, username, password, SCOPES, RateLimiter } from './security.js';

export const COOKIE_NAME = 'mc_tracker_session';
const publicUser = user => user && ({ id: user.id, username: user.username, authMethod: user.authMethod ?? 'password', scopes: user.scopes ?? SCOPES });

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function body(req) {
  check(/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? ''), 415, 'Send JSON with Content-Type: application/json.');
  check(Number(req.headers['content-length'] ?? 0) <= 524288, 413, 'Request body is too large.');
  const raw = await new Promise((resolve, reject) => {
    let size = 0;
    let oversized = false;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 524288) {
        oversized = true;
        chunks.length = 0;
        reject(new HttpError(413, 'Request body is too large.'));
      } else if (!oversized) chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
  let data;
  try { data = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid JSON body.'); }
  check(data && typeof data === 'object' && !Array.isArray(data), 400, 'Send a JSON object.');
  return data;
}

function progressChange(value, itemId) {
  check(Object.hasOwn(ITEMS_BY_ID, itemId), 404, 'Unknown checklist item ID.');
  check(value && typeof value === 'object' && !Array.isArray(value), 400, 'Invalid progress update.');
  check(Object.keys(value).every(k => ['item_id', 'is_completed', 'claimed', 'expected_revision'].includes(k)), 400, 'Progress attribution and timestamps are set by the server.');
  check(value.is_completed !== undefined || value.claimed !== undefined, 400, 'Set is_completed or claimed.');
  for (const field of ['is_completed', 'claimed']) if (value[field] !== undefined) check(typeof value[field] === 'boolean', 400, `${field} must be a boolean.`);
  if (value.expected_revision !== undefined) check(Number.isSafeInteger(value.expected_revision) && value.expected_revision >= 0, 400, 'expected_revision must be a non-negative integer.');
  return value;
}

export async function createApi({ store, allowedOrigins, secureCookie = false, iconManifest = [], loginLimit = 10 }) {
  const loginLimiter = new RateLimiter(loginLimit, 15 * 60000);
  const apiLimiter = new RateLimiter(600, 60000);
  const dummyPassword = await hashPassword('dummy-password-for-unknown-accounts');
  const minecraftIds = new Map(iconManifest.map(item => [item.id, `minecraft:${item.minecraftId}`]));
  const cookie = (token, expired = false) => `${COOKIE_NAME}=${expired ? '' : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expired ? 0 : 7 * 86400}${secureCookie ? '; Secure' : ''}`;

  function principal(req) {
    if (req.headers.authorization !== undefined) {
      check(/^Bearer mct_[A-Za-z0-9_-]{43}$/.test(req.headers.authorization), 401, 'Invalid API key.');
      const user = store.principal(req.headers.authorization.slice(7), 'key');
      check(user, 401, 'API key is invalid, expired, or revoked.');
      return user;
    }
    const session = (req.headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    if (!session || !/^mcs_[A-Za-z0-9_-]{43}$/.test(session)) return null;
    return store.principal(session, 'session');
  }
  function requireUser(req, scope) {
    const user = principal(req);
    check(user, 401, 'Sign in or supply an API key.');
    if (scope && user.scopes) check(user.scopes.includes(scope), 403, `This API key needs the ${scope} permission.`);
    return user;
  }
  function passwordSession(req) {
    const user = requireUser(req);
    check(user.credentialMethod === 'session' && user.authMethod === 'password', 403, 'Sign in with the shared password to manage access.');
    return user;
  }
  function checkOrigin(req) {
    const origin = req.headers.origin;
    check(!origin || allowedOrigins.includes(origin), 403, 'This request origin is not allowed.');
    check(req.headers['sec-fetch-site'] !== 'cross-site', 403, 'Cross-site requests are not allowed.');
    // Cookie mutations and login forms require same-origin browser requests.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.headers.authorization) {
      check(origin && allowedOrigins.includes(origin), 403, 'A matching Origin header is required for browser requests.');
    }
  }

  async function handle(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const url = new URL(req.url, 'http://tracker.invalid');
    const path = url.pathname;
    try {
      checkOrigin(req);
      check(!['api_key', 'key', 'token', 'access_token'].some(name => url.searchParams.has(name)), 400, 'Send API keys in the Authorization header, never in a URL.');
      if (path === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
      if (path === '/api/auth/session' && req.method === 'GET') return json(res, 200, { user: publicUser(principal(req)), setupRequired: !store.hasUsers() });

      if (['/api/auth/setup', '/api/auth/login', '/api/auth/key-login'].includes(path) && req.method === 'POST') {
        loginLimiter.take(req.socket.remoteAddress ?? 'unknown');
        const data = await body(req);
        let user;
        let sourceKeyId = null;
        if (path === '/api/auth/setup') {
          check(!store.hasUsers(), 409, 'The shared password has already been set.');
          check(typeof data.setupToken === 'string' && data.setupToken.length <= 256, 403, 'A valid setup code is required.');
          const expected = store.get("SELECT value FROM settings WHERE key = 'setup_token_hash'")?.value;
          check(expected && timingSafeEqual(Buffer.from(hashToken(data.setupToken), 'hex'), Buffer.from(expected, 'hex')), 403, 'The setup code is invalid.');
          user = store.addUser(username(data.username), await hashPassword(password(data.password)), true);
        } else if (path === '/api/auth/login') {
          check(typeof data.username === 'string' && typeof data.password === 'string' && data.password.length <= 256, 400, 'Enter your player name and password.');
          const sharedHash = store.sharedPasswordHash();
          const valid = await verifyPassword(data.password, sharedHash ?? dummyPassword);
          check(sharedHash && valid, 401, 'Incorrect shared password.');
          user = store.player(username(data.username));
        } else {
          check(typeof data.apiKey === 'string' && /^mct_[A-Za-z0-9_-]{43}$/.test(data.apiKey), 401, 'Invalid API key.');
          user = store.principal(data.apiKey, 'key');
          check(user, 401, 'API key is invalid, expired, or revoked.');
          sourceKeyId = user.keyId;
        }
        const token = store.session(user.id, sourceKeyId);
        res.setHeader('Set-Cookie', cookie(token));
        return json(res, path === '/api/auth/setup' ? 201 : 200, { user: publicUser(user) });
      }

      const user = requireUser(req);
      apiLimiter.take(`${user.id}:${user.keyId ?? 'session'}`);
      if (path === '/api/auth/player' && req.method === 'POST') {
        passwordSession(req);
        const data = await body(req);
        const player = store.player(username(data.username));
        const token = store.session(player.id);
        const previous = req.headers.cookie.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`)).slice(COOKIE_NAME.length + 1);
        store.run('DELETE FROM sessions WHERE token_hash = ?', hashToken(previous));
        res.setHeader('Set-Cookie', cookie(token));
        return json(res, 200, { user: publicUser(player) });
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        check(user.credentialMethod === 'session', 403, 'Log out using the website session.');
        const session = req.headers.cookie.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`)).slice(COOKIE_NAME.length + 1);
        store.run('DELETE FROM sessions WHERE token_hash = ?', hashToken(session));
        res.setHeader('Set-Cookie', cookie('', true));
        return json(res, 200, { ok: true });
      }
      if (path === '/api/keys' && req.method === 'GET') {
        passwordSession(req);
        return json(res, 200, { keys: store.keys(user.id) });
      }
      if (path === '/api/keys' && req.method === 'POST') {
        passwordSession(req);
        const data = await body(req);
        check(typeof data.name === 'string' && data.name.trim().length > 0 && data.name.length <= 80, 400, 'Give this key a name of 1–80 characters.');
        const scopes = data.scopes ?? ['items:read', 'progress:read'];
        check(Array.isArray(scopes) && scopes.length > 0 && scopes.length <= SCOPES.length && scopes.every(s => SCOPES.includes(s)) && new Set(scopes).size === scopes.length, 400, 'Choose valid, unique API permissions.');
        const days = data.expires_in_days ?? 30;
        check(Number.isInteger(days) && days >= 1 && days <= 365, 400, 'Keys must expire in 1–365 days.');
        return json(res, 201, { key: store.createKey(user.id, data.name.trim(), scopes, days) });
      }
      const keyRoute = path.match(/^\/api\/keys\/([a-f0-9-]{36})$/);
      if (keyRoute && req.method === 'DELETE') {
        passwordSession(req);
        store.revokeKey(user.id, keyRoute[1]);
        return json(res, 200, { ok: true });
      }
      if (path === '/api/v1/items' && req.method === 'GET') {
        requireUser(req, 'items:read');
        const minecraftId = url.searchParams.get('minecraft_id');
        const q = url.searchParams.get('q')?.toLowerCase() ?? '';
        const items = ITEMS.filter(item => (!minecraftId || minecraftIds.get(item.id) === minecraftId) && (!q || item.name.toLowerCase().includes(q)))
          .map(item => ({ ...item, minecraft_id: minecraftIds.get(item.id) ?? null }));
        return json(res, 200, { items, total: items.length });
      }
      if (path === '/api/v1/progress' && req.method === 'GET') {
        requireUser(req, 'progress:read');
        return json(res, 200, { progress: store.progress() });
      }
      if (path === '/api/v1/progress/batch' && req.method === 'POST') {
        requireUser(req, 'progress:write');
        const data = await body(req);
        check(Array.isArray(data.items) && data.items.length >= 1 && data.items.length <= 200, 400, 'Send between 1 and 200 item updates.');
        check(new Set(data.items.map(i => i?.item_id)).size === data.items.length, 400, 'Send each item only once per batch.');
        for (const item of data.items) progressChange(item, item?.item_id);
        const results = store.transaction(() => data.items.map(item => store.updateInTransaction(item.item_id, item, user)));
        return json(res, 200, { results });
      }
      if (path === '/api/v1/progress/import' && req.method === 'POST') {
        passwordSession(req);
        const data = await body(req);
        check(data.progress && typeof data.progress === 'object' && !Array.isArray(data.progress), 400, 'Send a progress object.');
        const entries = Object.entries(data.progress);
        check(entries.length <= ITEMS.length, 400, 'Too many progress entries.');
        for (const [id, state] of entries) {
          check(Object.hasOwn(ITEMS_BY_ID, id) && state && typeof state === 'object', 400, 'Invalid legacy item.');
          for (const field of ['completed_by', 'claimed_by']) check(state[field] == null || (typeof state[field] === 'string' && state[field].length <= 80), 400, 'Invalid legacy player name.');
          for (const field of ['completed_at', 'claimed_at']) check(state[field] == null || (typeof state[field] === 'string' && Number.isFinite(Date.parse(state[field]))), 400, 'Invalid legacy timestamp.');
          check(state.is_completed === undefined || typeof state.is_completed === 'boolean', 400, 'Invalid legacy completion status.');
        }
        let imported = 0;
        store.transaction(() => {
          for (const [id, state] of entries) {
            if (store.get('SELECT item_id FROM progress WHERE item_id = ?', id)) continue;
            store.writeState(id, { is_completed: Boolean(state.is_completed), completed_by: state.is_completed ? state.completed_by ?? user.username : null,
              completed_at: state.is_completed ? state.completed_at ?? new Date().toISOString() : null,
              claimed_by: state.is_completed ? null : state.claimed_by ?? null, claimed_at: state.is_completed ? null : state.claimed_at ?? null }, 1);
            imported++;
          }
        });
        return json(res, 200, { imported });
      }
      const progressRoute = path.match(/^\/api\/v1\/progress\/([a-z0-9_]+)(\/undo)?$/);
      if (progressRoute) {
        requireUser(req, 'progress:write');
        const id = progressRoute[1];
        check(Object.hasOwn(ITEMS_BY_ID, id), 404, 'Unknown checklist item ID.');
        if (!progressRoute[2] && req.method === 'PATCH') return json(res, 200, store.updateProgress(id, progressChange(await body(req), id), user));
        if (progressRoute[2] && req.method === 'POST') {
          const data = await body(req);
          check(typeof data.undo_id === 'string', 400, 'Supply the undo_id returned by an update.');
          return json(res, 200, store.undo(id, data.undo_id, user));
        }
      }
      throw new HttpError(404, 'API endpoint not found.');
    } catch (error) {
      const status = error.status ?? 500;
      if (status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
      if (status === 429) res.setHeader('Retry-After', '60');
      if (status === 500) console.error('API request failed:', error.message);
      json(res, status, { error: status === 500 ? 'The server could not complete this request.' : error.message });
    }
  }
  return { handle, principal, requireUser, checkOrigin };
}
