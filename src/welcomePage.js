/**
 * Onboarding welcome page shown immediately after a user activates their
 * account via the one-click email link (see `src/activation.js`).
 *
 * Framework/DOM agnostic so it can be unit tested directly;
 * {@link renderWelcomePage} provides an optional DOM binding for real
 * browser usage.
 */

export const GET_STARTED_CTA_LABEL = "Get Started";

/**
 * Builds the plain-data view model for the welcome page.
 *
 * @param {{ displayName?: string }} user
 * @returns {{ heading: string, ctaLabel: string }}
 */
export function buildWelcomePageModel(user) {
  const name = user?.displayName ?? "there";
  return {
    heading: `Welcome, ${name}!`,
    ctaLabel: GET_STARTED_CTA_LABEL,
  };
}

/**
 * Renders the welcome page into the given DOM container. No-ops (returns
 * null) outside a browser-like DOM environment so this module stays
 * safely importable in non-DOM contexts (e.g. server-side or tests).
 *
 * @param {Element} container - DOM node to render the page into.
 * @param {object} user - The just-activated user.
 * @returns {{ root: Element, model: object }|null}
 */
export function renderWelcomePage(container, user) {
  if (!container || typeof container.appendChild !== "function") {
    return null;
  }

  const model = buildWelcomePageModel(user);
  const root = container.ownerDocument
    ? container.ownerDocument.createElement("div")
    : container;
  root.className = "onboarding-welcome-page";
  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-testid", "onboarding-welcome-page");
    root.setAttribute("data-cta-label", model.ctaLabel);
  }
  container.appendChild(root);

  return { root, model };
}
