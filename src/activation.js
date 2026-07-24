/**
 * One-click activation email flow.
 *
 * This module stands in for the "existing API" that would normally be a
 * real backend service: it generates one-click activation tokens, "sends"
 * the activation email (in this dev-only implementation, by printing the
 * link to the console so it can be copy/pasted or captured by tests), and
 * exposes the JS endpoint that runs when a user clicks the link in the
 * email:
 *
 *   1. Validate the token (exists, not expired, not already used).
 *   2. Activate the account (flips the 'activated' server flag).
 *   3. Set a session cookie so the user is signed in.
 *   4. Return a redirect target for the onboarding welcome page.
 *
 * Real deployments would swap the token store for a persisted one (e.g. a
 * database table) and the "send email" step for an actual mail provider,
 * while keeping the same function signatures.
 */

import { getUser, activateUser } from "./onboardingApi.js";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE_NAME = "session_id";
export const WELCOME_REDIRECT_PATH = "/onboarding/welcome";

const tokens = new Map();
const sessions = new Map();
let nextSessionId = 1;

function randomToken() {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

/**
 * Generates a one-click activation token for a user and stores it for
 * later validation/consumption.
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {number} [options.ttlMs] - Token lifetime in milliseconds.
 *   Pass a negative value in tests to simulate an already-expired token.
 * @returns {{ token: string, expiresAt: number }}
 */
export function createActivationToken(userId, options = {}) {
  // Ensures the user exists; throws RangeError otherwise.
  getUser(userId);
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const token = randomToken();
  const expiresAt = Date.now() + ttlMs;
  tokens.set(token, { userId, expiresAt, used: false });
  return { token, expiresAt };
}

/**
 * "Sends" the one-click activation email. In this dev-only implementation
 * there is no real mail provider, so the activation link is printed to the
 * console (the "dev console" referenced by the acceptance criteria) and
 * also returned so callers/tests can act on it directly.
 *
 * @param {{ id: string }} user
 * @param {object} [options]
 * @param {string} [options.baseUrl] - Base URL used to build the link.
 * @param {number} [options.ttlMs] - Token lifetime override (see
 *   {@link createActivationToken}).
 * @returns {{ token: string, link: string, expiresAt: number }}
 */
export function sendActivationEmail(user, options = {}) {
  const baseUrl = options.baseUrl ?? "https://app.example.com";
  const { token, expiresAt } = createActivationToken(user.id, {
    ttlMs: options.ttlMs,
  });
  const link = `${baseUrl}/activate?token=${token}`;
  // eslint-disable-next-line no-console
  console.log(`[dev] Activation email for ${user.id}: ${link}`);
  return { token, link, expiresAt };
}

/**
 * Validates an activation token without consuming it.
 *
 * @param {string} token
 * @returns {{ valid: boolean, reason?: string, userId?: string }}
 */
export function validateActivationToken(token) {
  const record = tokens.get(token);
  if (!record) {
    return { valid: false, reason: "invalid" };
  }
  if (record.used) {
    return { valid: false, reason: "already-used" };
  }
  if (Date.now() > record.expiresAt) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true, userId: record.userId };
}

/**
 * Creates a session cookie for a user, marking them signed in.
 *
 * @param {string} userId
 * @returns {{ name: string, value: string, userId: string }}
 */
export function createSessionCookie(userId) {
  const value = `sess-${nextSessionId++}-${randomToken()}`;
  sessions.set(value, userId);
  return { name: SESSION_COOKIE_NAME, value, userId };
}

/**
 * Looks up the user id associated with a session cookie value. Useful for
 * tests/demos that want to confirm the cookie actually authenticates the
 * user.
 *
 * @param {string} cookieValue
 * @returns {string|undefined}
 */
export function getUserIdForSession(cookieValue) {
  return sessions.get(cookieValue);
}

/**
 * The JS endpoint invoked when a user clicks the one-click activation
 * link: validates the token, activates the account, sets a session
 * cookie, and returns the onboarding welcome page as the redirect target.
 *
 * Safe to call only once per token; a second call with the same token
 * fails with reason 'already-used'.
 *
 * @param {string} token
 * @returns {{ ok: boolean, reason?: string, user?: object,
 *   sessionCookie?: object, redirectTo?: string }}
 */
export function handleActivationLink(token) {
  const validation = validateActivationToken(token);
  if (!validation.valid) {
    return { ok: false, reason: validation.reason };
  }

  const record = tokens.get(token);
  record.used = true;

  const user = activateUser(validation.userId);
  const sessionCookie = createSessionCookie(validation.userId);

  return {
    ok: true,
    user,
    sessionCookie,
    redirectTo: WELCOME_REDIRECT_PATH,
  };
}

/**
 * Test/demo helper to reset in-memory state between runs.
 */
export function resetActivationState() {
  tokens.clear();
  sessions.clear();
  nextSessionId = 1;
}
