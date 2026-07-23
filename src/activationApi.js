/**
 * Backend endpoint (simulated) that consumes a one-click activation link:
 * validates the single-use token, activates the account, and issues a
 * session so the frontend can render the authenticated app immediately.
 *
 * There is no real HTTP server or JWT library in this repository, so
 * {@link consumeActivationToken} plays the role of the
 * `GET /activate?token=...` route handler, and {@link createSessionToken}/
 * {@link verifySessionToken} stand in for a signed session cookie/JWT.
 */

import { getUser, activateUser } from "./onboardingApi.js";
import {
  peekActivationToken,
  markTokenConsumed,
} from "./activationEmail.js";

/** Path the frontend should redirect to once activation succeeds. */
export const AUTHENTICATED_APP_PATH = "/app";

/** In-memory session store: sessionToken -> { userId, issuedAt } */
const sessions = new Map();

export class InvalidActivationTokenError extends Error {
  constructor(message = "Activation token is invalid or unknown") {
    super(message);
    this.name = "InvalidActivationTokenError";
  }
}

export class ActivationTokenExpiredError extends Error {
  constructor(message = "Activation token has expired") {
    super(message);
    this.name = "ActivationTokenExpiredError";
  }
}

export class ActivationTokenAlreadyUsedError extends Error {
  constructor(message = "Activation token has already been used") {
    super(message);
    this.name = "ActivationTokenAlreadyUsedError";
  }
}

/**
 * Mints an opaque session token bound to a user. Stands in for a signed
 * session cookie/JWT; real deployments would replace this with a proper
 * signed/encrypted token.
 *
 * @param {string} userId
 * @returns {string} The session token.
 */
export function createSessionToken(userId) {
  const sessionToken = `sess_${userId}_${Math.random()
    .toString(36)
    .slice(2)}${Date.now().toString(36)}`;
  sessions.set(sessionToken, { userId, issuedAt: Date.now() });
  return sessionToken;
}

/**
 * Verifies a session token and returns the associated user id, or null if
 * the session is unknown/invalid.
 *
 * @param {string} sessionToken
 * @returns {string|null}
 */
export function verifySessionToken(sessionToken) {
  return sessions.get(sessionToken)?.userId ?? null;
}

/**
 * Validates a single-use activation token, activates the corresponding
 * account, and issues a session — the backend half of the one-click
 * activation link. Safe to call only once per token: a second call with
 * the same token throws {@link ActivationTokenAlreadyUsedError}.
 *
 * @param {string} token - Token extracted from the emailed activation link.
 * @param {object} [options]
 * @param {number} [options.now] - Override for the current time (ms epoch),
 *   used by tests to simulate expiry.
 * @returns {{ user: object, sessionToken: string, redirectUrl: string }}
 */
export function consumeActivationToken(token, options = {}) {
  if (!token) {
    throw new InvalidActivationTokenError();
  }
  const record = peekActivationToken(token);
  if (!record) {
    throw new InvalidActivationTokenError();
  }
  if (record.consumed) {
    throw new ActivationTokenAlreadyUsedError();
  }
  const now = options.now ?? Date.now();
  if (now > record.expiresAt) {
    throw new ActivationTokenExpiredError();
  }

  markTokenConsumed(token);

  activateUser(record.userId);
  const sessionToken = createSessionToken(record.userId);

  return {
    user: getUser(record.userId),
    sessionToken,
    redirectUrl: AUTHENTICATED_APP_PATH,
  };
}

/**
 * Test/demo helper to reset all in-memory session state between runs.
 */
export function resetActivationApi() {
  sessions.clear();
}
