import test from "node:test";
import assert from "node:assert/strict";
import { createUser, getUser, resetOnboardingApi } from "../src/onboardingApi.js";
import {
  createActivationToken,
  validateActivationToken,
  handleActivationLink,
  getUserIdForSession,
  sendActivationEmail,
  resetActivationState,
  WELCOME_REDIRECT_PATH,
} from "../src/activation.js";

test.beforeEach(() => {
  resetOnboardingApi();
  resetActivationState();
});

test("createActivationToken rejects unknown users", () => {
  assert.throws(() => createActivationToken("nope"), RangeError);
});

test("validateActivationToken is valid for a freshly created token", () => {
  const user = createUser();
  const { token } = createActivationToken(user.id);

  const result = validateActivationToken(token);

  assert.equal(result.valid, true);
  assert.equal(result.userId, user.id);
});

test("validateActivationToken rejects unknown tokens", () => {
  const result = validateActivationToken("does-not-exist");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid");
});

test("validateActivationToken rejects expired tokens", () => {
  const user = createUser();
  const { token } = createActivationToken(user.id, { ttlMs: -1 });

  const result = validateActivationToken(token);

  assert.equal(result.valid, false);
  assert.equal(result.reason, "expired");
});

test("validateActivationToken rejects tokens that were already consumed", () => {
  const user = createUser();
  const { token } = createActivationToken(user.id);

  handleActivationLink(token);
  const result = validateActivationToken(token);

  assert.equal(result.valid, false);
  assert.equal(result.reason, "already-used");
});

test("handleActivationLink fails gracefully for an invalid token", () => {
  const result = handleActivationLink("bogus-token");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid");
});

test("handleActivationLink fails for an expired token and does not activate the user", () => {
  const user = createUser();
  const { token } = createActivationToken(user.id, { ttlMs: -1 });

  const result = handleActivationLink(token);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "expired");
  assert.equal(getUser(user.id).flags.activated, false);
});

test("handleActivationLink activates the account, sets a session cookie, and redirects to the welcome page", () => {
  const user = createUser();
  const { token } = createActivationToken(user.id);

  const result = handleActivationLink(token);

  assert.equal(result.ok, true);
  assert.equal(result.user.flags.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
  assert.equal(result.redirectTo, WELCOME_REDIRECT_PATH);

  assert.equal(result.sessionCookie.name, "session_id");
  assert.ok(result.sessionCookie.value);
  assert.equal(getUserIdForSession(result.sessionCookie.value), user.id);
});

test("handleActivationLink is single-use: clicking the same link twice fails the second time", () => {
  const user = createUser();
  const { token } = createActivationToken(user.id);

  const first = handleActivationLink(token);
  const second = handleActivationLink(token);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already-used");
});

test("sendActivationEmail returns a link containing a valid token", () => {
  const user = createUser();

  const { token, link, expiresAt } = sendActivationEmail(user, {
    baseUrl: "https://app.example.com",
  });

  assert.match(link, /^https:\/\/app\.example\.com\/activate\?token=/);
  assert.ok(link.includes(token));
  assert.ok(expiresAt > Date.now());
  assert.equal(validateActivationToken(token).valid, true);
});
