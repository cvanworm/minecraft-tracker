import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { check, hashToken, newToken } from './security.js';

export class Store {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','member')),
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, prefix TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
        scopes TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        last_used_at INTEGER, revoked_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_key_id TEXT REFERENCES api_keys(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS progress (
        item_id TEXT PRIMARY KEY, is_completed INTEGER NOT NULL DEFAULT 0,
        completed_by TEXT, completed_at TEXT, claimed_by TEXT, claimed_at TEXT,
        revision INTEGER NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS undo_actions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), item_id TEXT NOT NULL,
        previous_state TEXT NOT NULL, after_revision INTEGER NOT NULL,
        expires_at INTEGER NOT NULL, used_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_keys_user ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    `);
  }
  close() { this.db.close(); }
  get(sql, ...args) { return this.db.prepare(sql).get(...args); }
  all(sql, ...args) { return this.db.prepare(sql).all(...args); }
  run(sql, ...args) { return this.db.prepare(sql).run(...args); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  hasUsers() { return this.get('SELECT count(*) AS count FROM users').count > 0; }
  userByName(name) { return this.get('SELECT * FROM users WHERE username = ?', name); }
  sharedPasswordHash() { return this.get("SELECT value FROM settings WHERE key = 'shared_password_hash'")?.value; }
  addUser(name, passwordHash, owner = false) {
    return this.transaction(() => {
      check(!this.userByName(name), 409, 'That player name is already registered.');
      if (owner) {
        check(!this.hasUsers(), 409, 'The shared password has already been set.');
      }
      const id = randomUUID();
      this.run('INSERT INTO users VALUES (?, ?, ?, ?, ?)', id, name, '', owner ? 'owner' : 'member', Date.now());
      if (owner) {
        this.run("INSERT INTO settings VALUES ('shared_password_hash', ?)", passwordHash);
        this.run("DELETE FROM settings WHERE key = 'setup_token_hash'");
      }
      return this.get('SELECT * FROM users WHERE id = ?', id);
    });
  }
  player(name) { return this.userByName(name) ?? this.addUser(name, ''); }
  session(userId, sourceKeyId = null) {
    const token = newToken('mcs');
    const now = Date.now();
    this.run('DELETE FROM sessions WHERE expires_at <= ?', now);
    this.run('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET 19)', userId);
    this.run('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)', hashToken(token), userId, sourceKeyId, now, now + 7 * 86400000);
    return token;
  }
  principal(token, method) {
    const now = Date.now();
    let record;
    if (method === 'key') {
      record = this.get(`SELECT u.id, u.username, u.role, k.scopes, k.id AS key_id
        FROM api_keys k JOIN users u ON u.id = k.user_id
        WHERE k.token_hash = ? AND k.revoked_at IS NULL AND k.expires_at > ?`, hashToken(token), now);
    } else {
      record = this.get(`SELECT u.id, u.username, u.role, k.scopes, s.source_key_id AS key_id
        FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN api_keys k ON k.id = s.source_key_id
        WHERE s.token_hash = ? AND s.expires_at > ?
        AND (s.source_key_id IS NULL OR (k.revoked_at IS NULL AND k.expires_at > ?))`, hashToken(token), now, now);
    }
    if (!record) return null;
    if (record.key_id) this.run('UPDATE api_keys SET last_used_at = ? WHERE id = ?', now, record.key_id);
    return { id: record.id, username: record.username, role: record.role, scopes: record.scopes ? JSON.parse(record.scopes) : null,
      authMethod: record.key_id ? 'api-key' : 'password', keyId: record.key_id ?? null, credentialMethod: method };
  }
  keys(userId) {
    return this.all('SELECT id, name, prefix, scopes, created_at, expires_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC', userId)
      .map(key => ({ ...key, scopes: JSON.parse(key.scopes) }));
  }
  createKey(userId, name, scopes, days) {
    const active = this.get('SELECT count(*) AS count FROM api_keys WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?', userId, Date.now()).count;
    check(active < 25, 400, 'You already have 25 active keys. Revoke one before creating another.');
    const token = newToken('mct');
    const id = randomUUID();
    this.run('INSERT INTO api_keys VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)', id, userId, name, token.slice(0, 12), hashToken(token), JSON.stringify(scopes), Date.now(), Date.now() + days * 86400000);
    return { ...this.keys(userId).find(key => key.id === id), token };
  }
  revokeKey(userId, keyId) {
    const key = this.get('SELECT id FROM api_keys WHERE id = ? AND user_id = ?', keyId, userId);
    check(key, 404, 'API key not found.');
    this.run('UPDATE api_keys SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?', Date.now(), keyId);
    this.run('DELETE FROM sessions WHERE source_key_id = ?', keyId);
  }
  state(row) {
    return row ? { ...row, is_completed: Boolean(row.is_completed) } : {
      is_completed: false, completed_by: null, completed_at: null, claimed_by: null, claimed_at: null, revision: 0,
    };
  }
  progress() {
    return Object.fromEntries(this.all('SELECT * FROM progress').map(row => [row.item_id, this.state(row)]));
  }
  writeState(itemId, state, revision) {
    this.run(`INSERT INTO progress VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET is_completed=excluded.is_completed, completed_by=excluded.completed_by,
      completed_at=excluded.completed_at, claimed_by=excluded.claimed_by, claimed_at=excluded.claimed_at,
      revision=excluded.revision, updated_at=excluded.updated_at`, itemId, Number(state.is_completed), state.completed_by ?? null,
    state.completed_at ?? null, state.claimed_by ?? null, state.claimed_at ?? null, revision, new Date().toISOString());
    return this.state(this.get('SELECT * FROM progress WHERE item_id = ?', itemId));
  }
  updateProgress(itemId, change, user) {
    return this.transaction(() => this.updateInTransaction(itemId, change, user));
  }
  updateInTransaction(itemId, change, user) {
    const previous = this.state(this.get('SELECT * FROM progress WHERE item_id = ?', itemId));
    if (change.expected_revision !== undefined) check(change.expected_revision === previous.revision, 409, 'This item changed. Refresh and try again.');
    const state = { ...previous };
    const now = new Date().toISOString();
    if (change.is_completed !== undefined && change.is_completed !== state.is_completed) {
      state.is_completed = change.is_completed;
      state.completed_by = change.is_completed ? user.username : null;
      state.completed_at = change.is_completed ? now : null;
    }
    if (change.claimed !== undefined && !state.is_completed) {
      check(!state.claimed_by || state.claimed_by === user.username, 409, 'Another player is already hunting this item.');
      state.claimed_by = change.claimed ? user.username : null;
      state.claimed_at = change.claimed ? now : null;
    }
    if (state.is_completed) { state.claimed_by = null; state.claimed_at = null; }
    const updated = this.writeState(itemId, state, previous.revision + 1);
    const undoId = randomUUID();
    this.run('DELETE FROM undo_actions WHERE expires_at <= ?', Date.now());
    this.run('INSERT INTO undo_actions VALUES (?, ?, ?, ?, ?, ?, NULL)', undoId, user.id, itemId, JSON.stringify(previous), updated.revision, Date.now() + 10 * 60000);
    return { item_id: itemId, state: updated, undo_id: undoId };
  }
  undo(itemId, undoId, user) {
    return this.transaction(() => {
      const action = this.get('SELECT * FROM undo_actions WHERE id = ? AND user_id = ? AND item_id = ?', undoId, user.id, itemId);
      check(action && !action.used_at && action.expires_at > Date.now(), 400, 'This undo action is unavailable or expired.');
      const current = this.get('SELECT revision FROM progress WHERE item_id = ?', itemId);
      check(current?.revision === action.after_revision, 409, 'Another update has changed this item. It cannot be undone.');
      const state = this.writeState(itemId, JSON.parse(action.previous_state), current.revision + 1);
      this.run('UPDATE undo_actions SET used_at = ? WHERE id = ?', Date.now(), undoId);
      return { item_id: itemId, state };
    });
  }
}
