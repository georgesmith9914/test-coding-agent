/**
 * Welcome / first-run screen shown immediately after a user consumes a
 * one-click activation link, confirming their account is now active.
 *
 * Framework/DOM agnostic, matching the pattern used by
 * `onboardingModal.js`: {@link renderWelcomeScreen} only touches the DOM
 * when given a real DOM-like container, so this module stays safely
 * importable in non-DOM contexts (e.g. server-side or tests).
 */

/**
 * Determines whether the post-activation welcome screen should be shown.
 * True immediately after activation, for a user carrying the 'activated'
 * flag with a freshly issued session.
 *
 * @param {{ flags?: { activated?: boolean } }} user
 * @param {{ sessionToken?: string }} [session]
 * @returns {boolean}
 */
export function shouldShowWelcomeScreen(user, session) {
  const activated = Boolean(user?.flags?.activated);
  const hasSession = Boolean(session?.sessionToken);
  return activated && hasSession;
}

/**
 * Builds the welcome message confirming activation.
 *
 * @param {{ displayName?: string }} user
 * @returns {string}
 */
export function welcomeMessage(user) {
  const name = user?.displayName ?? "there";
  return `Welcome, ${name}! Your account is now active.`;
}

/**
 * Renders the welcome/first-run screen into the given DOM container.
 * No-ops (returns null) outside a browser-like DOM environment, or if the
 * user/session don't indicate a just-completed activation.
 *
 * @param {Element} container - DOM node to render the screen into.
 * @param {object} user - The (now activated) user.
 * @param {{ sessionToken: string, redirectUrl?: string }} session - Result
 *   of {@link import("./activationApi.js").consumeActivationToken}.
 * @returns {{ root: Element, message: string }|null}
 */
export function renderWelcomeScreen(container, user, session) {
  if (!container || typeof container.appendChild !== "function") {
    return null;
  }
  if (!shouldShowWelcomeScreen(user, session)) {
    return null;
  }

  const message = welcomeMessage(user);
  const root = container.ownerDocument
    ? container.ownerDocument.createElement("div")
    : container;
  root.className = "welcome-screen";
  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-testid", "welcome-screen");
  }
  if ("textContent" in root) {
    root.textContent = message;
  }
  container.appendChild(root);

  return { root, message };
}
