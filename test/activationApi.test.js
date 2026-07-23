import test from "node:test";
import assert from "node:assert/strict";
import { createUser, getUser } from "../src/onboardingApi.js";
import {
  generateActivationToken,
  buildActivationLink,
  sendActivationEmail,
  consumeActivationToken,
  getOutbox,
  resetActivationApi,
  DEFAULT_TOKEN_TTL_MS,
} from "../src/activationApi.js";

test.beforeEach(() => {
  resetActivationApi();
});

test("generateActivationToken returns a unique single-use token per call", () => {
  const user = createUser({ id: "user-a" });
  const tokenA = generateActivationToken(user.id);
  const tokenB = generateActivationToken(user.id);
  assert.notEqual(tokenA, tokenB);
});

test("generateActivationToken throws for an unknown user", () => {
  assert.throws(() => generateActivationToken("nope"), RangeError);
});

test("buildActivationLink embeds the token as a query parameter", () => {
  const link = buildActivationLink("abc123", "https://app.example.com/activate");
  assert.equal(link, "https://app.example.com/activate?token=abc123");
});

test("sendActivationEmail records a message in the outbox with a working link", () => {
  const user = createUser({ id: "user-b" });
  const message = sendActivationEmail(user.id);

  assert.equal(message.to, user.id);
  assert.match(message.subject, /activate/i);
  assert.ok(message.token);
  assert.ok(message.activationLink.includes(message.token));

  const outbox = getOutbox();
  assert.equal(outbox.length, 1);
  assert.deepEqual(outbox[0], message);
});

test("consumeActivationToken activates the account exactly once (unactivated -> activated)", () => {
  const user = createUser({ id: "user-c" });
  assert.equal(getUser(user.id).flags.activated, false);

  const { token } = sendActivationEmail(user.id);
  const result = consumeActivationToken(token);

  assert.equal(result.status, "activated");
  assert.equal(result.user.flags.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
});

test("consumeActivationToken is single-use: a second click reports already_used", () => {
  const user = createUser({ id: "user-d" });
  const { token } = sendActivationEmail(user.id);

  const first = consumeActivationToken(token);
  assert.equal(first.status, "activated");

  const second = consumeActivationToken(token);
  assert.equal(second.status, "already_used");
  assert.equal(second.user.flags.activated, true);
});

test("consumeActivationToken reports invalid for an unknown token", () => {
  const result = consumeActivationToken("does-not-exist");
  assert.equal(result.status, "invalid");
  assert.equal(result.user, undefined);
});

test("consumeActivationToken reports expired for a token past its TTL", () => {
  const user = createUser({ id: "user-e" });
  const now = Date.now();
  const token = generateActivationToken(user.id, { now, ttlMs: 1000 });

  const result = consumeActivationToken(token, { now: now + 1001 });
  assert.equal(result.status, "expired");
  assert.equal(getUser(user.id).flags.activated, false);
});

test("generateActivationToken defaults to a 24 hour TTL", () => {
  assert.equal(DEFAULT_TOKEN_TTL_MS, 24 * 60 * 60 * 1000);
});
