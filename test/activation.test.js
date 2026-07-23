import test from "node:test";
import assert from "node:assert/strict";
import { createUser, getUser, resetOnboardingApi } from "../src/onboardingApi.js";
import {
  sendActivationEmail,
  consumeActivationToken,
  resetActivationApi,
} from "../src/activationApi.js";
import {
  ACTIVATION_RESULT,
  extractActivationToken,
  consumeActivationLink,
} from "../src/activation.js";

const api = { consumeActivationToken };

test.beforeEach(() => {
  resetOnboardingApi();
  resetActivationApi();
});

test("extractActivationToken pulls the token query param from a full URL", () => {
  const token = extractActivationToken(
    "https://app.example.com/activate?token=abc123&foo=bar"
  );
  assert.equal(token, "abc123");
});

test("extractActivationToken returns null when no token is present", () => {
  assert.equal(extractActivationToken("https://app.example.com/activate"), null);
  assert.equal(extractActivationToken(""), null);
  assert.equal(extractActivationToken(undefined), null);
});

test("consumeActivationLink redirects into the app with a welcome state on success", () => {
  const user = createUser({ id: "user-x" });
  assert.equal(getUser(user.id).flags.activated, false);

  const { activationLink } = sendActivationEmail(user.id);
  const view = consumeActivationLink(activationLink, api);

  assert.equal(view.result, ACTIVATION_RESULT.WELCOME);
  assert.equal(view.welcome, true);
  assert.equal(view.redirectTo, "/app?welcome=1");
  assert.equal(view.user.flags.activated, true);

  // Backend state actually flipped, not just the returned view.
  assert.equal(getUser(user.id).flags.activated, true);
});

test("consumeActivationLink supports custom app/sign-in routes", () => {
  const user = createUser({ id: "user-y" });
  const { activationLink } = sendActivationEmail(user.id);

  const view = consumeActivationLink(activationLink, api, {
    appRoute: "/home",
  });

  assert.equal(view.redirectTo, "/home?welcome=1");
});

test("consumeActivationLink sends already-activated users into the app without welcome state", () => {
  const user = createUser({ id: "user-z" });
  const { activationLink } = sendActivationEmail(user.id);

  consumeActivationLink(activationLink, api); // first click activates
  const secondView = consumeActivationLink(activationLink, api); // second click

  assert.equal(secondView.result, ACTIVATION_RESULT.ALREADY_ACTIVE);
  assert.equal(secondView.welcome, false);
  assert.equal(secondView.redirectTo, "/app");
  assert.equal(secondView.user.flags.activated, true);
});

test("consumeActivationLink reports invalid and sends to sign-in for a missing/unknown token", () => {
  const view = consumeActivationLink(
    "https://app.example.com/activate",
    api
  );
  assert.equal(view.result, ACTIVATION_RESULT.INVALID);
  assert.equal(view.welcome, false);
  assert.equal(view.redirectTo, "/signin");
});

test("consumeActivationLink reports expired and sends to sign-in for an expired token", () => {
  const user = createUser({ id: "user-w" });
  const { activationLink } = sendActivationEmail(user.id, {
    now: Date.now() - 2000,
    ttlMs: 1000,
  });

  const view = consumeActivationLink(activationLink, api);
  assert.equal(view.result, ACTIVATION_RESULT.EXPIRED);
  assert.equal(view.welcome, false);
  assert.equal(view.redirectTo, "/signin");
  assert.equal(getUser(user.id).flags.activated, false);
});
