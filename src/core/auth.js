/**
 * Local-only authentication.
 *
 * Honest scope: every user record lives in this browser's localStorage, so anyone
 * with access to the browser profile can read the stored data. This is a prototype,
 * not a substitute for server-side authentication.
 *
 * What it does implement properly:
 *   - registration with validation and case-insensitive unique emails
 *   - salted password hashing with PBKDF2-HMAC-SHA256 (never a plain-text password)
 *   - credential verification with a constant-time comparison
 *   - a session that survives a refresh, and per-user ownership of every record
 */

import { createId, isNonEmptyString } from './utils.js';
import { DEMO_USER, DEMO_ACCOUNT_PASSWORD } from './data.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PBKDF2_ITERATIONS = 120000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* -------------------------------------------------------- pure helpers ---- */

export function normaliseEmail(email) {
  return isNonEmptyString(email) ? email.trim().toLowerCase() : '';
}

export function generateSalt() {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** PBKDF2-HMAC-SHA256. Async because Web Crypto only exposes it asynchronously. */
export async function deriveHash(password, salt, iterations = PBKDF2_ITERATIONS) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return toHex(bits);
}

/** Length-independent comparison so a wrong password cannot be probed by timing. */
export function hashesMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function findUserByEmail(users, email) {
  const needle = normaliseEmail(email);
  if (!needle || !Array.isArray(users)) return null;
  return users.find((user) => normaliseEmail(user.email) === needle) || null;
}

export function validateRegistration(input, users) {
  const errors = {};
  const name = isNonEmptyString(input.name) ? input.name.trim() : '';
  const email = normaliseEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';

  if (!name) errors.name = 'Enter your name.';
  if (!email) errors.email = 'Enter an email address.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  else if (findUserByEmail(users, email)) errors.email = 'An account already exists for that email.';

  if (password.length === 0) errors.password = 'Enter a password.';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;

  if (confirmPassword !== password) errors.confirmPassword = 'The two passwords do not match.';

  return { valid: Object.keys(errors).length === 0, errors, values: { name, email, password } };
}

export function validateLogin(input) {
  const errors = {};
  const email = normaliseEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email) errors.email = 'Enter your email address.';
  if (!password) errors.password = 'Enter your password.';

  return { valid: Object.keys(errors).length === 0, errors, values: { email, password } };
}

/* ------------------------------------------------- storage-coupled flow --- */

export async function registerUser(users, input, iterations = PBKDF2_ITERATIONS) {
  const { valid, errors, values } = validateRegistration(input, users);
  if (!valid) return { ok: false, errors };

  const salt = generateSalt();
  const passwordHash = await deriveHash(values.password, salt, iterations);
  const user = {
    id: createId('user'),
    name: values.name,
    email: values.email,
    salt,
    passwordHash,
    iterations,
    createdAt: new Date().toISOString(),
  };
  return { ok: true, users: [...(Array.isArray(users) ? users : []), user], user };
}

/** Verifies credentials. Returns a generic failure message for both bad email and
 *  bad password, so the form cannot be used to discover which emails exist. */
export async function authenticate(users, input, iterations = PBKDF2_ITERATIONS) {
  const { valid, errors, values } = validateLogin(input);
  if (!valid) return { ok: false, errors };

  const user = findUserByEmail(users, values.email);
  if (!user) return { ok: false, errors: { form: 'Email or password is incorrect.' } };

  const candidate = await deriveHash(values.password, user.salt, user.iterations || iterations);
  if (!hashesMatch(candidate, user.passwordHash)) {
    return { ok: false, errors: { form: 'Email or password is incorrect.' } };
  }
  return { ok: true, user };
}

/** Session objects only name the user; the record itself is looked up on load. */
export function createSession(user) {
  return { userId: user.id, issuedAt: new Date().toISOString() };
}

export function resolveSession(session, users) {
  if (!session || typeof session !== 'object') return null;
  if (!Array.isArray(users)) return null;
  return users.find((user) => user.id === session.userId) || null;
}

/** Creates the demo account once, using the documented demo password. */
export async function ensureDemoAccount(users, iterations = PBKDF2_ITERATIONS) {
  if (findUserByEmail(users, DEMO_USER.email)) return users;
  const result = await registerUser(
    users,
    {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      password: DEMO_ACCOUNT_PASSWORD,
      confirmPassword: DEMO_ACCOUNT_PASSWORD,
    },
    iterations,
  );
  if (!result.ok) return users;
  // Keep the stable demo id so the seeded sample trip stays owned by this account.
  return [...result.users.slice(0, -1), { ...result.user, id: DEMO_USER.id }];
}

/** Used by the demo button so it exercises the same code path as a typed login. */
export const DEMO_CREDENTIALS = { email: DEMO_USER.email, password: DEMO_ACCOUNT_PASSWORD };
