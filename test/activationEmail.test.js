import test from "node:test";
import assert from "node:assert/strict";
import {
  activationOutbox,
  buildActivationLink,
  issueActivationToken,
  peekActivationToken,
  resetActivationEmail,
  sendActivationEmail,
  DEFAULT_BASE_URL,
} from "../src/activationEmail.js";

test.beforeEach(() => {
  resetActivationEmail();
});

test("issueActivationToken requires a userId", () => {
  assert.throws(() => issueActivationToken(), TypeError);
  assert.throws(() => issueActivationToken(""), TypeError);
});

test("issueActivationToken mints a unique token per call", () => {
  const tokenA = issueActivationToken("user-1");
  const tokenB = issueActivationToken("user-1");
  assert.notEqual(tokenA, tokenB);
});

test("issueActivationToken records an expiry based on ttlMs", () => {
  const now = 1_000_000;
  const token = issueActivationToken("user-1", { ttlMs: 5000, now });
  const record = peekActivationToken(token);
  assert.equal(record.userId, "user-1");
  assert.equal(record.expiresAt, now + 5000);
  assert.equal(record.consumed, false);
});

test("buildActivationLink requires a token", () => {
  assert.throws(() => buildActivationLink(), TypeError);
});

test("buildActivationLink embeds the token as a query param", () => {
  const link = buildActivationLink("abc123");
  assert.equal(link, `${DEFAULT_BASE_URL}/activate?token=abc123`);
});

test("buildActivationLink honors a custom base URL", () => {
  const link = buildActivationLink("abc123", "https://custom.test");
  assert.equal(link, "https://custom.test/activate?token=abc123");
});

test("sendActivationEmail requires a user with an id", () => {
  assert.throws(() => sendActivationEmail(), TypeError);
  assert.throws(() => sendActivationEmail({}), TypeError);
});

test("sendActivationEmail records a message in the outbox with a working link", () => {
  const user = { id: "user-42", email: "ada@example.com" };
  const message = sendActivationEmail(user);

  assert.equal(activationOutbox.length, 1);
  assert.equal(activationOutbox[0], message);
  assert.equal(message.userId, "user-42");
  assert.equal(message.to, "ada@example.com");
  assert.ok(message.link.includes(message.token));
  assert.ok(peekActivationToken(message.token));
});

test("sendActivationEmail defaults the recipient address from the user id", () => {
  const message = sendActivationEmail({ id: "user-7" });
  assert.equal(message.to, "user-7@example.com");
});

test("resetActivationEmail clears the outbox and token store", () => {
  const message = sendActivationEmail({ id: "user-1" });
  resetActivationEmail();
  assert.equal(activationOutbox.length, 0);
  assert.equal(peekActivationToken(message.token), undefined);
});
