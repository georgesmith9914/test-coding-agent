/**
 * One-click account activation: email + single-use tokenized link.
 *
 * This module stands in for the "send activation email" side effect. There
 * is no real mail transport in this repository, so sent messages are
 * recorded in an in-memory {@link activationOutbox} that tests (and, in a
 * real deployment, a background worker) can inspect. Each email carries a
 * single-use, expiring token minted by {@link issueActivationToken}; the
 * companion backend endpoint in `activationApi.js` consumes that token to
 * activate the account.
 */

import { randomBytes } from "node:crypto";

/** Default time-to-live for an activation token: 24 hours. */
export const DEFAULT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Default base URL used to build the one-click activation link. */
export const DEFAULT_BASE_URL = "https://app.example.com";

/** token -> { userId, expiresAt, consumed } */
const tokens = new Map();

/**
 * Messages "sent" via {@link sendActivationEmail}, most recent last. Each
 * entry has the shape `{ userId, to, token, link, sentAt }`.
 * @type {Array<object>}
 */
export const activationOutbox = [];

/**
 * Generates a cryptographically random, URL-safe single-use token.
 * @returns {string}
 */
function generateToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Mints a new single-use activation token for a user.
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {number} [options.ttlMs] - Token lifetime in milliseconds.
 * @param {number} [options.now] - Override for the current time (ms epoch),
 *   used by tests to simulate expiry.
 * @returns {string} The newly minted token.
 */
export function issueActivationToken(userId, options = {}) {
  if (!userId) {
    throw new TypeError("userId is required");
  }
  const ttlMs = options.ttlMs ?? DEFAULT_TOKEN_TTL_MS;
  const now = options.now ?? Date.now();
  const token = generateToken();
  tokens.set(token, { userId, expiresAt: now + ttlMs, consumed: false });
  return token;
}

/**
 * Builds the one-click activation link for a token.
 *
 * @param {string} token
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildActivationLink(token, baseUrl = DEFAULT_BASE_URL) {
  if (!token) {
    throw new TypeError("token is required");
  }
  return `${baseUrl}/activate?token=${encodeURIComponent(token)}`;
}

/**
 * "Sends" the activation email: mints a single-use token, builds the
 * one-click link, and records the message in {@link activationOutbox}.
 *
 * @param {{ id: string, email?: string }} user
 * @param {object} [options]
 * @param {string} [options.baseUrl]
 * @param {number} [options.ttlMs]
 * @param {number} [options.now]
 * @returns {{ userId: string, to: string, token: string, link: string, sentAt: number }}
 */
export function sendActivationEmail(user, options = {}) {
  if (!user || !user.id) {
    throw new TypeError("user with an id is required");
  }
  const now = options.now ?? Date.now();
  const token = issueActivationToken(user.id, { ttlMs: options.ttlMs, now });
  const link = buildActivationLink(token, options.baseUrl);
  const message = {
    userId: user.id,
    to: user.email ?? `${user.id}@example.com`,
    token,
    link,
    sentAt: now,
  };
  activationOutbox.push(message);
  return message;
}

/**
 * Internal lookup used by the consuming endpoint in `activationApi.js`.
 * Not intended for direct use outside this module pair.
 *
 * @param {string} token
 * @returns {{ userId: string, expiresAt: number, consumed: boolean }|undefined}
 */
export function peekActivationToken(token) {
  return tokens.get(token);
}

/**
 * Marks a token as consumed so it can never be used again.
 * @param {string} token
 */
export function markTokenConsumed(token) {
  const record = tokens.get(token);
  if (record) {
    record.consumed = true;
  }
}

/**
 * Test/demo helper to reset all in-memory state between runs.
 */
export function resetActivationEmail() {
  tokens.clear();
  activationOutbox.length = 0;
}
