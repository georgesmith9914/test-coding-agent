/**
 * Minimal in-memory "existing API" for one-click account activation via
 * email, mirroring the stand-in pattern used by `onboardingApi.js`. This
 * module models:
 *   - generating a single-use activation token for a user
 *   - "sending" the activation email (recorded to an in-memory outbox so
 *     tests/demos can inspect it instead of a real mail transport)
 *   - consuming the token to flip the user's `activated` flag exactly once
 *
 * Real deployments would swap the outbox for an actual mail provider and
 * the token store for a persistent, hashed-token backing store, while
 * keeping the same function signatures.
 */

import { getUser, activateUser } from "./onboardingApi.js";

/** Default validity window for a freshly generated activation token. */
export const DEFAULT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const tokens = new Map();
const outbox = [];
let nextTokenSeq = 1;

/**
 * Generates a single-use activation token for a user.
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {number} [options.ttlMs] - Validity window in milliseconds.
 * @param {number} [options.now] - Override for the current time (testing).
 * @returns {string} The generated token.
 */
export function generateActivationToken(userId, options = {}) {
  // Ensure the user exists; throws RangeError if unknown.
  getUser(userId);

  const ttlMs = options.ttlMs ?? DEFAULT_TOKEN_TTL_MS;
  const now = options.now ?? Date.now();
  const token = `activation-token-${nextTokenSeq++}-${Math.random()
    .toString(36)
    .slice(2)}`;

  tokens.set(token, {
    userId,
    expiresAt: now + ttlMs,
    used: false,
  });

  return token;
}

/**
 * Builds the one-click activation link for a token.
 *
 * @param {string} token
 * @param {string} [baseUrl] - App base URL the link should point at.
 * @returns {string} Absolute activation link containing the token.
 */
export function buildActivationLink(
  token,
  baseUrl = "https://app.example.com/activate"
) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Generates a token and "sends" the one-click activation email, recording
 * it in the in-memory outbox for inspection by tests/demos.
 *
 * @param {string} userId
 * @param {object} [options] - Forwarded to {@link generateActivationToken};
 *   also accepts `baseUrl` to control the generated link's host/path.
 * @returns {{ to: string, subject: string, token: string, activationLink: string }}
 *   The recorded email message.
 */
export function sendActivationEmail(userId, options = {}) {
  const user = getUser(userId);
  const token = generateActivationToken(userId, options);
  const activationLink = buildActivationLink(token, options.baseUrl);

  const message = {
    to: user.id,
    subject: "Activate your account",
    token,
    activationLink,
  };
  outbox.push(message);
  return message;
}

/**
 * Consumes an activation token: validates it, marks the account activated
 * (if not already), and invalidates the token so it cannot be reused.
 *
 * @param {string} token
 * @param {object} [options]
 * @param {number} [options.now] - Override for the current time (testing).
 * @returns {{ status: "activated"|"invalid"|"expired"|"already_used", user?: object }}
 *   `status` describes the outcome; `user` is present only when a valid
 *   token/record was found (activated or already_used).
 */
export function consumeActivationToken(token, options = {}) {
  const record = tokens.get(token);
  if (!record) {
    return { status: "invalid" };
  }

  const now = options.now ?? Date.now();
  if (now > record.expiresAt) {
    return { status: "expired" };
  }

  const user = getUser(record.userId);

  if (record.used) {
    return { status: "already_used", user };
  }

  record.used = true;
  activateUser(record.userId);

  return { status: "activated", user: getUser(record.userId) };
}

/**
 * Returns the emails "sent" so far (most recent last). Intended for
 * tests/demos to assert against without a real mail transport.
 *
 * @returns {object[]}
 */
export function getOutbox() {
  return outbox.slice();
}

/**
 * Test/demo helper to reset in-memory token/outbox state between runs.
 */
export function resetActivationApi() {
  tokens.clear();
  outbox.length = 0;
  nextTokenSeq = 1;
}
