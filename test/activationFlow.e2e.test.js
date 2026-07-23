import test from "node:test";
import assert from "node:assert/strict";
import { createUser, getUser, resetOnboardingApi } from "../src/onboardingApi.js";
import {
  activationOutbox,
  resetActivationEmail,
  sendActivationEmail,
} from "../src/activationEmail.js";
import {
  AUTHENTICATED_APP_PATH,
  consumeActivationToken,
  resetActivationApi,
  verifySessionToken,
} from "../src/activationApi.js";
import { renderWelcomeScreen, shouldShowWelcomeScreen } from "../src/welcomeScreen.js";

/**
 * Extracts the `token` query param from a one-click activation link, the
 * way a browser navigating the emailed link (or its server-side route
 * handler) would.
 */
function extractTokenFromLink(link) {
  return new URL(link).searchParams.get("token");
}

test.beforeEach(() => {
  resetOnboardingApi();
  resetActivationEmail();
  resetActivationApi();
});

test("end-to-end: new user activates their account by clicking the emailed link", () => {
  // 1. A new, unactivated user signs up.
  const user = createUser({ displayName: "Grace Hopper", email: "grace@example.com" });
  assert.equal(user.flags.activated, false);

  // 2. Backend sends the one-click activation email.
  sendActivationEmail(user);
  assert.equal(activationOutbox.length, 1);
  const sentMessage = activationOutbox[0];
  assert.equal(sentMessage.to, "grace@example.com");

  // 3. User clicks the link in their email client; the browser/backend
  // extracts the token from the URL exactly as it would in production.
  const token = extractTokenFromLink(sentMessage.link);
  assert.equal(token, sentMessage.token);

  // 4. Backend endpoint validates the token, activates the account, and
  // sets a session.
  const { user: activatedUser, sessionToken, redirectUrl } =
    consumeActivationToken(token);

  assert.equal(activatedUser.flags.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
  assert.equal(verifySessionToken(sessionToken), user.id);
  assert.equal(redirectUrl, AUTHENTICATED_APP_PATH);

  // 5. Frontend redirects to the authenticated app and shows the
  // welcome/first-run screen confirming activation.
  const session = { sessionToken, redirectUrl };
  assert.equal(shouldShowWelcomeScreen(activatedUser, session), true);

  const appended = [];
  const fakeContainer = {
    ownerDocument: null,
    appendChild: (node) => appended.push(node),
  };
  const rendered = renderWelcomeScreen(fakeContainer, activatedUser, session);

  assert.ok(rendered);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].className, "welcome-screen");
  assert.match(rendered.message, /Grace Hopper/);
  assert.match(rendered.message, /now active/);

  // 6. The link is single-use: replaying it must not re-activate or grant
  // a second session.
  assert.throws(() => consumeActivationToken(token));
});

test("end-to-end: welcome screen is not shown before the link is consumed", () => {
  const user = createUser({ displayName: "Ada Lovelace" });
  sendActivationEmail(user);

  const fakeContainer = { ownerDocument: null, appendChild: () => {} };
  // No session yet (link hasn't been clicked), so nothing should render.
  assert.equal(renderWelcomeScreen(fakeContainer, user, undefined), null);
  assert.equal(shouldShowWelcomeScreen(user, undefined), false);
});
