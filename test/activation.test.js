import test from "node:test";
import assert from "node:assert/strict";
import {
  createUser,
  getUser,
  resetOnboardingApi,
  sendActivationEmail,
  getMailbox,
  consumeActivationLink as apiConsumeActivationLink,
} from "../src/onboardingApi.js";
import {
  extractActivationToken,
  triggerActivationEmail,
  consumeActivationLink,
  renderActivationButton,
  renderActivationLanding,
} from "../src/activation.js";

const api = {
  sendActivationEmail,
  consumeActivationLink: apiConsumeActivationLink,
};

test.beforeEach(() => {
  resetOnboardingApi();
});

test("extractActivationToken pulls the token out of an activation link", () => {
  const token = extractActivationToken(
    "https://app.example.com/activate?token=abc123"
  );
  assert.equal(token, "abc123");
});

test("extractActivationToken decodes URL-encoded tokens", () => {
  const token = extractActivationToken(
    "https://app.example.com/activate?token=abc%2B123"
  );
  assert.equal(token, "abc+123");
});

test("extractActivationToken returns null when no token is present", () => {
  assert.equal(extractActivationToken("https://app.example.com/activate"), null);
  assert.equal(extractActivationToken(""), null);
  assert.equal(extractActivationToken(undefined), null);
});

test("triggerActivationEmail sends an email and delivers it to the mailbox", () => {
  const user = createUser();

  const result = triggerActivationEmail(user.id, api);

  assert.equal(result.sent, true);
  assert.ok(result.link.startsWith("https://app.example.com/activate?token="));
  const mailbox = getMailbox();
  assert.equal(mailbox.length, 1);
  assert.equal(mailbox[0].link, result.link);
  assert.match(mailbox[0].body, /Click to activate your account/);
});

test("triggerActivationEmail throws for an unknown user", () => {
  assert.throws(() => triggerActivationEmail("nope", api), RangeError);
});

test("consumeActivationLink activates the account from a raw token", () => {
  const user = createUser();
  const email = sendActivationEmail(user.id);

  const result = consumeActivationLink(email.token, api);

  assert.equal(result.activated, true);
  assert.equal(result.navigateTo, "main-app");
  assert.equal(result.user.flags.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
});

test("consumeActivationLink activates the account from a full link", () => {
  const user = createUser();
  const email = sendActivationEmail(user.id);

  const result = consumeActivationLink(email.link, api);

  assert.equal(result.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
});

test("consumeActivationLink is single-use: a second click is rejected", () => {
  const user = createUser();
  const email = sendActivationEmail(user.id);

  consumeActivationLink(email.token, api);

  assert.throws(() => consumeActivationLink(email.token, api), RangeError);
});

test("consumeActivationLink rejects an expired token", (t) => {
  const user = createUser();
  const email = sendActivationEmail(user.id);

  const realNow = Date.now;
  t.mock.method(Date, "now", () => realNow() + 25 * 60 * 60 * 1000); // +25h

  assert.throws(() => consumeActivationLink(email.token, api), RangeError);
  assert.equal(getUser(user.id).flags.activated, false);
});

test("consumeActivationLink rejects invalid/unknown tokens", () => {
  assert.throws(() => consumeActivationLink("not-a-real-token", api), RangeError);
});

test("consumeActivationLink throws for an empty token/link", () => {
  assert.throws(() => consumeActivationLink("", api), TypeError);
  assert.throws(() => consumeActivationLink(undefined, api), TypeError);
});

test("end-to-end: send email, click link, account activated and ready to navigate", () => {
  const user = createUser();

  // API send.
  const sendResult = triggerActivationEmail(user.id, api);
  assert.equal(sendResult.sent, true);

  // Email delivered (dev staging mailbox).
  const delivered = getMailbox().find((m) => m.link === sendResult.link);
  assert.ok(delivered, "activation email should be in the mailbox");

  // Link consumed; server marks activated.
  const activation = consumeActivationLink(delivered.link, api);
  assert.equal(activation.activated, true);
  assert.equal(activation.navigateTo, "main-app");

  // Client shows activated state.
  assert.equal(getUser(user.id).flags.activated, true);
});

test("renderActivationButton returns null outside a DOM environment", () => {
  assert.equal(renderActivationButton(undefined, "user-1", api), null);
});

test("renderActivationButton mounts a button wired to trigger the email", () => {
  const appended = [];
  const listeners = {};
  const fakeButton = {
    setAttribute: () => {},
    addEventListener: (evt, handler) => {
      listeners[evt] = handler;
    },
  };
  const fakeContainer = {
    ownerDocument: { createElement: () => fakeButton },
    appendChild: (node) => appended.push(node),
  };
  const user = createUser();

  const result = renderActivationButton(fakeContainer, user.id, api);

  assert.ok(result);
  assert.equal(appended.length, 1);
  assert.equal(getMailbox().length, 0);

  listeners.click();

  assert.equal(getMailbox().length, 1);
});

test("renderActivationLanding returns null outside a DOM environment", () => {
  assert.equal(renderActivationLanding(undefined, "some-token", api), null);
});

test("renderActivationLanding consumes the link and reflects activated state", () => {
  const user = createUser();
  const email = sendActivationEmail(user.id);
  const appended = [];
  const attrs = {};
  const fakeRoot = {
    setAttribute: (key, value) => {
      attrs[key] = value;
    },
  };
  const fakeContainer = {
    ownerDocument: { createElement: () => fakeRoot },
    appendChild: (node) => appended.push(node),
  };

  const result = renderActivationLanding(fakeContainer, email.link, api);

  assert.ok(result);
  assert.equal(result.result.activated, true);
  assert.equal(appended.length, 1);
  assert.equal(attrs["data-testid"], "activation-landing");
  assert.equal(attrs["data-activated"], "true");
  assert.equal(attrs["data-navigate-to"], "main-app");
  assert.equal(getUser(user.id).flags.activated, true);
});
