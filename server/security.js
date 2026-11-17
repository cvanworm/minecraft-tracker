import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const SCOPES = ['items:read', 'progress:read', 'progress:write'];
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const newToken = prefix => `${prefix}_${randomBytes(32).toString('base64url')}`;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, expected] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(expected ?? '')) return false;
  const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(derived, Buffer.from(expected, 'hex'));
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function check(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}

export function username(value) {
  check(typeof value === 'string' && /^[A-Za-z0-9_]{3,32}$/.test(value), 400, 'Use a player name with 3–32 letters, numbers, or underscores.');
  return value;
}

export function password(value) {
  check(typeof value === 'string' && value.length >= 12 && value.length <= 256, 400, 'Use a password between 12 and 256 characters.');
  return value;
}

export class RateLimiter {
  constructor(limit, windowMs) { this.limit = limit; this.windowMs = windowMs; this.entries = new Map(); }
  take(key) {
    const now = Date.now();
    for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id);
    const entry = this.entries.get(key) ?? { count: 0, expires: now + this.windowMs };
    check(this.entries.has(key) || this.entries.size < 10000, 429, 'Too many requests. Please try again later.');
    this.entries.set(key, entry);
    check(++entry.count <= this.limit, 429, 'Too many requests. Please try again later.');
  }
}
