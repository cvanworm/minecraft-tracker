import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import test from 'node:test';
import { Store } from './store.js';
import { createApi } from './app.js';
import { hashToken } from './security.js';

const origin = 'http://tracker.test';
const setupToken = 'test-setup-token';
const ownerPassword = 'A-test-password-that-is-not-a-default';

async function fixture(t, options = {}) {
  const store = new Store(':memory:');
  store.run("INSERT INTO settings VALUES ('setup_token_hash', ?)", hashToken(setupToken));
  const api = await createApi({ store, allowedOrigins: [origin], iconManifest: [{ id: 'stone', minecraftId: 'stone' }], loginLimit: 100, ...options });
  const server = createServer(api.handle);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { cookie, token, body, headers = {}, ...rest } = {}) {
    const response = await fetch(base + path, { ...rest, headers: {
      Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers,
    }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  const owner = await request('/api/auth/setup', { method: 'POST', body: { setupToken, username: 'Owner', password: ownerPassword } });
  assert.equal(owner.status, 201);
  return { store, request, owner, cookie: owner.cookie };
}

async function key(f, scopes = ['items:read', 'progress:read', 'progress:write'], cookie = f.cookie) {
  const result = await f.request('/api/keys', { method: 'POST', cookie, body: { name: 'Test computer', scopes, expires_in_days: 7 } });
  assert.equal(result.status, 201);
  return result.data.key;
}

async function member(f, name = 'Alex') {
  const result = await f.request('/api/auth/login', { method: 'POST', body: { username: name, password: ownerPassword } });
  assert.equal(result.status, 200);
  return result;
}

test('all tracker data and key endpoints reject missing or forged authentication', async t => {
  const f = await fixture(t);
  for (const path of ['/api/v1/items', '/api/v1/progress', '/api/keys', '/api/nonexistent']) {
    assert.equal((await f.request(path)).status, 401, path);
    assert.equal((await f.request(path, { cookie: 'mc_tracker_auth_token=authenticated; mc_tracker_username=Owner' })).status, 401);
  }
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', body: { is_completed: true } })).status, 401);
  assert.equal((await f.request('/api/v1/items', { token: 'invalid', cookie: f.cookie })).status, 401);
});

test('shared password setup is single use and stores a salted hash', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', body: { setupToken, username: 'Other', password: ownerPassword } })).status, 409);
  const savedHash = f.store.sharedPasswordHash();
  assert.match(savedHash, /^scrypt\$/);
  assert.ok(!savedHash.includes(ownerPassword));
  assert.equal(f.store.userByName('owner').password_hash, '');
  assert.equal(f.store.get("SELECT value FROM settings WHERE key='setup_token_hash'"), undefined);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { username: 'OWNER', password: ownerPassword } })).status, 200);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { username: 'Owner', password: 'minecraft' } })).status, 401);
});

test('the shared password supports player names and rejects invalid credentials', async t => {
  const f = await fixture(t);
  const alex = await member(f);
  assert.equal(alex.data.user.username, 'Alex');
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { username: 'Steve', password: 'wrong' } })).status, 401);
  assert.equal(f.store.userByName('Steve'), undefined);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { username: 'bad name!', password: ownerPassword } })).status, 400);
  const second = await f.request('/api/auth/login', { method: 'POST', body: { username: 'alex', password: ownerPassword } });
  assert.equal(second.data.user.id, alex.data.user.id);
  assert.equal((await f.request('/api/auth/register', { method: 'POST', body: {} })).status, 401);
});

test('API keys are shown once, stored hashed, and cannot appear in URLs', async t => {
  const f = await fixture(t);
  const k = await key(f);
  assert.match(k.token, /^mct_[A-Za-z0-9_-]{43}$/);
  const saved = f.store.get('SELECT * FROM api_keys WHERE id = ?', k.id);
  assert.equal(saved.token_hash, hashToken(k.token));
  assert.ok(!JSON.stringify(saved).includes(k.token));
  const listing = await f.request('/api/keys', { cookie: f.cookie });
  assert.ok(!JSON.stringify(listing.data).includes(k.token));
  assert.equal(listing.data.keys[0].token, undefined);
  assert.equal((await f.request(`/api/v1/items?api_key=${k.token}`)).status, 400);
  assert.equal((await f.request('/api/v1/items?minecraft_id=minecraft:stone', { token: k.token })).data.items[0].id, 'stone');
});

test('read-only API keys cannot update progress, create keys, or switch player names', async t => {
  const f = await fixture(t);
  const k = await key(f, ['items:read', 'progress:read']);
  assert.equal((await f.request('/api/v1/items', { token: k.token })).status, 200);
  assert.equal((await f.request('/api/v1/progress', { token: k.token })).status, 200);
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: true } })).status, 403);
  assert.equal((await f.request('/api/keys', { token: k.token })).status, 403);
  assert.equal((await f.request('/api/keys', { method: 'POST', token: k.token, body: { name: 'Escalation' } })).status, 403);
  assert.equal((await f.request('/api/auth/player', { method: 'POST', token: k.token, body: { username: 'Alex' } })).status, 403);
});

test('key-based website sessions retain scopes and revocation invalidates both paths', async t => {
  const f = await fixture(t);
  const k = await key(f, ['items:read', 'progress:read']);
  const login = await f.request('/api/auth/key-login', { method: 'POST', body: { apiKey: k.token } });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.authMethod, 'api-key');
  assert.equal((await f.request('/api/v1/progress', { cookie: login.cookie })).status, 200);
  assert.equal((await f.request('/api/keys', { cookie: login.cookie })).status, 403);
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', cookie: login.cookie, body: { is_completed: true } })).status, 403);
  assert.equal((await f.request(`/api/keys/${k.id}`, { method: 'DELETE', cookie: f.cookie, body: {} })).status, 200);
  assert.equal((await f.request('/api/v1/progress', { token: k.token })).status, 401);
  assert.equal((await f.request('/api/v1/progress', { cookie: login.cookie })).status, 401);
});

test('expired keys and expired sessions are rejected; one player cannot revoke another player’s key', async t => {
  const f = await fixture(t);
  const k = await key(f);
  const alex = await member(f);
  assert.equal((await f.request(`/api/keys/${k.id}`, { method: 'DELETE', cookie: alex.cookie, body: {} })).status, 404);
  f.store.run('UPDATE api_keys SET expires_at = 0 WHERE id = ?', k.id);
  assert.equal((await f.request('/api/v1/items', { token: k.token })).status, 401);
  f.store.run('UPDATE sessions SET expires_at = 0');
  assert.equal((await f.request('/api/v1/items', { cookie: f.cookie })).status, 401);
});

test('progress attribution is server-controlled and writes reject stale revisions', async t => {
  const f = await fixture(t);
  const k = await key(f);
  const update = await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: true, expected_revision: 0 } });
  assert.equal(update.status, 200);
  assert.equal(update.data.state.completed_by, 'Owner');
  assert.equal(update.data.state.is_completed, true);
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: false, expected_revision: 0 } })).status, 409);
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: true, completed_by: 'SomeoneElse' } })).status, 400);
  assert.equal((await f.request('/api/v1/progress/missing_item', { method: 'PATCH', token: k.token, body: { is_completed: true } })).status, 404);
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: 'true' } })).status, 400);
  const repeat = await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: true } });
  assert.equal(repeat.data.state.completed_at, update.data.state.completed_at);
});

test('hunting claims cannot be stolen and undo cannot overwrite another update', async t => {
  const f = await fixture(t);
  const alex = await member(f);
  const claim = await f.request('/api/v1/progress/stone', { method: 'PATCH', cookie: f.cookie, body: { claimed: true } });
  assert.equal(claim.status, 200);
  assert.equal((await f.request('/api/v1/progress/stone', { method: 'PATCH', cookie: alex.cookie, body: { claimed: true } })).status, 409);
  assert.equal((await f.request('/api/v1/progress/stone/undo', { method: 'POST', cookie: alex.cookie, body: { undo_id: claim.data.undo_id } })).status, 400);
  const collected = await f.request('/api/v1/progress/stone', { method: 'PATCH', cookie: alex.cookie, body: { is_completed: true } });
  assert.equal(collected.data.state.claimed_by, null);
  assert.equal((await f.request('/api/v1/progress/stone/undo', { method: 'POST', cookie: f.cookie, body: { undo_id: claim.data.undo_id } })).status, 409);
  const undone = await f.request('/api/v1/progress/stone/undo', { method: 'POST', cookie: alex.cookie, body: { undo_id: collected.data.undo_id } });
  assert.equal(undone.data.state.claimed_by, 'Owner');
  assert.equal(undone.data.state.is_completed, false);
});

test('batch writes are atomic, bounded, and reject duplicates', async t => {
  const f = await fixture(t);
  await f.request('/api/v1/progress/dirt', { method: 'PATCH', cookie: f.cookie, body: { is_completed: true } });
  const failed = await f.request('/api/v1/progress/batch', { method: 'POST', cookie: f.cookie, body: { items: [
    { item_id: 'stone', is_completed: true }, { item_id: 'dirt', is_completed: false, expected_revision: 0 },
  ] } });
  assert.equal(failed.status, 409);
  assert.equal(f.store.progress().stone, undefined);
  assert.equal(f.store.progress().dirt.is_completed, true);
  const duplicate = await f.request('/api/v1/progress/batch', { method: 'POST', cookie: f.cookie, body: { items: [{ item_id: 'stone', is_completed: true }, { item_id: 'stone', claimed: false }] } });
  assert.equal(duplicate.status, 400);
  const success = await f.request('/api/v1/progress/batch', { method: 'POST', cookie: f.cookie, body: { items: [{ item_id: 'stone', is_completed: true }, { item_id: 'dirt', is_completed: false }] } });
  assert.equal(success.status, 200);
  assert.equal(success.data.results.length, 2);
});

test('legacy import requires the shared password session and never overwrites shared progress', async t => {
  const f = await fixture(t);
  const k = await key(f);
  const legacy = { progress: { stone: { is_completed: true, completed_by: 'PreviousPlayer' } } };
  assert.equal((await f.request('/api/v1/progress/import', { method: 'POST', token: k.token, body: legacy })).status, 403);
  assert.equal((await f.request('/api/v1/progress/import', { method: 'POST', cookie: f.cookie, body: legacy })).data.imported, 1);
  assert.equal(f.store.progress().stone.completed_by, 'PreviousPlayer');
  legacy.progress.stone.is_completed = false;
  assert.equal((await f.request('/api/v1/progress/import', { method: 'POST', cookie: f.cookie, body: legacy })).data.imported, 0);
  assert.equal(f.store.progress().stone.is_completed, true);
});

test('cookie changes require matching Origin, and cross-site reads are denied', async t => {
  const f = await fixture(t);
  for (const requestOrigin of ['', 'https://evil.example']) {
    assert.equal((await f.request('/api/keys', { method: 'POST', cookie: f.cookie, body: { name: 'Forged' }, headers: { Origin: requestOrigin } })).status, 403);
  }
  assert.equal((await f.request('/api/v1/progress', { cookie: f.cookie, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.request('/api/v1/progress', { cookie: f.cookie, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  const k = await key(f);
  assert.equal((await f.request('/api/v1/progress/stone', { token: k.token, method: 'PATCH', headers: { Origin: '' }, body: { is_completed: true } })).status, 200);
});

test('session cookies use HttpOnly/SameSite and Secure in HTTPS mode; logout revokes them', async t => {
  const f = await fixture(t, { secureCookie: true });
  assert.match(f.owner.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.match(f.owner.headers.get('set-cookie'), /; Secure/);
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', cookie: f.cookie, body: {} })).status, 200);
  assert.equal((await f.request('/api/v1/progress', { cookie: f.cookie })).status, 401);
});

test('login requests are rate-limited', async t => {
  const f = await fixture(t, { loginLimit: 2 });
  const request = () => f.request('/api/auth/login', { method: 'POST', body: { username: 'Owner', password: 'wrong' } });
  assert.equal((await request()).status, 401);
  assert.equal((await request()).status, 429);
});

test('SQLite persists the shared password, player profiles, keys, sessions, and progress across restarts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'tracker-api-test-'));
  const path = join(directory, 'tracker.sqlite');
  let store;
  try {
    store = new Store(path);
    const user = store.addUser('Owner', 'test-hash', true);
    const k = store.createKey(user.id, 'Persistent key', ['progress:read'], 7);
    const session = store.session(user.id);
    store.updateProgress('stone', { is_completed: true }, { ...user, username: 'Owner' });
    store.close(); store = new Store(path);
    assert.equal(store.sharedPasswordHash(), 'test-hash');
    assert.equal(store.principal(k.token, 'key').username, 'Owner');
    assert.equal(store.principal(session, 'session').username, 'Owner');
    assert.equal(store.progress().stone.is_completed, true);
  } finally {
    store?.close();
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && basename(directory).startsWith('tracker-api-test-'));
    rmSync(directory, { recursive: true, force: true });
  }
});

test('switching player names rotates the website session and leaves existing keys with their original player', async t => {
  const f = await fixture(t);
  const k = await key(f);
  const switched = await f.request('/api/auth/player', { method: 'POST', cookie: f.cookie, body: { username: 'Alex' } });
  assert.equal(switched.status, 200);
  assert.equal(switched.data.user.username, 'Alex');
  assert.notEqual(switched.cookie, f.cookie);
  assert.equal((await f.request('/api/v1/progress', { cookie: f.cookie })).status, 401);
  const update = await f.request('/api/v1/progress/stone', { method: 'PATCH', token: k.token, body: { is_completed: true } });
  assert.equal(update.data.state.completed_by, 'Owner');
  assert.equal((await f.request('/api/v1/progress', { cookie: switched.cookie })).status, 200);
});
