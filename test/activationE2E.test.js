/**
 * End-to-end test exercising the one-click activation email flow:
 *
 *   1. Create a test user.
 *   2. Send the activation email (dev console link).
 *   3. Simulate the user clicking the link (extract the token from the
 *      link URL and invoke the JS endpoint handler).
 *   4. Observe the account's activated state, the session cookie, and
 *      the redirect to the onboarding welcome page with its
 *      'Get Started' CTA.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createUser, getUser, resetOnboardingApi } from "../src/onboardingApi.js";
import {
  sendActivationEmail,
  handleActivationLink,
  getUserIdForSession,
  resetActivationState,
  WELCOME_REDIRECT_PATH,
} from "../src/activation.js";
import {
  renderWelcomePage,
  GET_STARTED_CTA_LABEL,
} from "../src/welcomePage.js";

test.beforeEach(() => {
  resetOnboardingApi();
  resetActivationState();
});

function extractTokenFromLink(link) {
  const url = new URL(link);
  return url.searchParams.get("token");
}

test("one-click activation link flow: email -> click -> activated + welcome page", () => {
  // 1. Create a test user (not yet activated).
  const user = createUser({ displayName: "Ada Lovelace" });
  assert.equal(getUser(user.id).flags.activated, false);

  // 2. Send the activation email; capture the dev-console link.
  const { link } = sendActivationEmail(user);
  const token = extractTokenFromLink(link);
  assert.ok(token);

  // 3. Simulate the user clicking the link.
  const result = handleActivationLink(token);

  // 4a. Account is activated.
  assert.equal(result.ok, true);
  assert.equal(getUser(user.id).flags.activated, true);

  // 4b. A session cookie was set and authenticates the user.
  assert.ok(result.sessionCookie);
  assert.equal(getUserIdForSession(result.sessionCookie.value), user.id);

  // 4c. The user is redirected to the onboarding welcome page.
  assert.equal(result.redirectTo, WELCOME_REDIRECT_PATH);

  // 4d. The welcome page renders with a 'Get Started' CTA.
  const appended = [];
  const attributes = new Map();
  const fakeContainer = {
    ownerDocument: null,
    appendChild: (node) => appended.push(node),
    setAttribute: (key, value) => attributes.set(key, value),
    getAttribute: (key) => attributes.get(key),
  };
  const page = renderWelcomePage(fakeContainer, getUser(user.id));

  assert.ok(page);
  assert.equal(page.model.ctaLabel, GET_STARTED_CTA_LABEL);
  assert.equal(page.model.heading, "Welcome, Ada Lovelace!");
  assert.equal(appended.length, 1);
  assert.equal(appended[0].getAttribute("data-cta-label"), GET_STARTED_CTA_LABEL);
});

test("clicking an already-used activation link does not re-activate or double-issue sessions", () => {
  const user = createUser();
  const { link } = sendActivationEmail(user);
  const token = extractTokenFromLink(link);

  const first = handleActivationLink(token);
  const second = handleActivationLink(token);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already-used");
  assert.equal(getUser(user.id).flags.activated, true);
});
