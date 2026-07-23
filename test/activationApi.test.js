import test from "node:test";
import assert from "node:assert/strict";
import { createUser, getUser, resetOnboardingApi } from "../src/onboardingApi.js";
import {
  issueActivationToken,
  resetActivationEmail,
} from "../src/activationEmail.js";
import {
  ActivationTokenAlreadyUsedError,
  ActivationTokenExpiredError,
  AUTHENTICATED_APP_PATH,
  InvalidActivationTokenError,
  consumeActivationToken,
  resetActivationApi,
  verifySessionToken,
} from "../src/activationApi.js";

test.beforeEach(() => {
  resetOnboardingApi();
  resetActivationEmail();
  resetActivationApi();
});

test("consumeActivationToken rejects a missing/unknown token", () => {
  assert.throws(() => consumeActivationToken(), InvalidActivationTokenError);
  assert.throws(
    () => consumeActivationToken("not-a-real-token"),
    InvalidActivationTokenError,
  );
});

test("consumeActivationToken activates the account and issues a session", () => {
  const user = createUser({ displayName: "Ada Lovelace" });
  const token = issueActivationToken(user.id);

  const result = consumeActivationToken(token);

  assert.equal(result.user.id, user.id);
  assert.equal(result.user.flags.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
  assert.ok(result.sessionToken);
  assert.equal(verifySessionToken(result.sessionToken), user.id);
  assert.equal(result.redirectUrl, AUTHENTICATED_APP_PATH);
});

test("consumeActivationToken is single-use: a second consume throws", () => {
  const user = createUser();
  const token = issueActivationToken(user.id);

  consumeActivationToken(token);

  assert.throws(
    () => consumeActivationToken(token),
    ActivationTokenAlreadyUsedError,
  );
});

test("consumeActivationToken rejects an expired token", () => {
  const user = createUser();
  const now = 1_000_000;
  const token = issueActivationToken(user.id, { ttlMs: 1000, now });

  assert.throws(
    () => consumeActivationToken(token, { now: now + 1001 }),
    ActivationTokenExpiredError,
  );
  // The user should not have been activated by the failed attempt.
  assert.equal(getUser(user.id).flags.activated, false);
});

test("consumeActivationToken accepts a token right up to its expiry instant", () => {
  const user = createUser();
  const now = 1_000_000;
  const token = issueActivationToken(user.id, { ttlMs: 1000, now });

  const result = consumeActivationToken(token, { now: now + 1000 });
  assert.equal(result.user.flags.activated, true);
});

test("verifySessionToken returns null for an unknown session", () => {
  assert.equal(verifySessionToken("bogus-session"), null);
});
