/**
 * One-click activation email flow.
 *
 * Lets a user (or an admin/test tool) trigger a one-click activation email
 * from the UI. The emailed link encodes a single-use token; clicking it
 * calls back into the server ({@link module:onboardingApi}) to mark the
 * account activated, and the client then shows the activated state and
 * navigates the user into the main app.
 *
 * The state machine here is framework/DOM agnostic so it can be unit
 * tested directly; {@link renderActivationButton} and
 * {@link renderActivationLanding} provide optional DOM bindings for real
 * browser usage.
 */

const ACTIVATION_LINK_PATTERN = /[?&]token=([^&]+)/;

/**
 * Extracts the activation token from an activation link/URL.
 *
 * @param {string} url
 * @returns {string|null} The decoded token, or null if not present.
 */
export function extractActivationToken(url) {
  if (typeof url !== "string") {
    return null;
  }
  const match = url.match(ACTIVATION_LINK_PATTERN);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Triggers sending a one-click activation email for a user. Intended to be
 * called from a UI action (e.g. a "Send activation email" button in an
 * admin/test tool).
 *
 * @param {string} userId
 * @param {{ sendActivationEmail: Function }} api
 * @returns {{ sent: true, email: object, link: string }} Client-side result
 *   describing the email that was sent, including the one-click link.
 */
export function triggerActivationEmail(userId, api) {
  const email = api.sendActivationEmail(userId);
  return { sent: true, email, link: email.link };
}

/**
 * Consumes an activation link (or raw token): calls the server to mark the
 * account activated, and returns client-side state indicating the account
 * is activated and where to navigate next.
 *
 * @param {string} tokenOrLink - Either a raw token or a full activation URL.
 * @param {{ consumeActivationLink: Function }} api
 * @returns {{ activated: true, user: object, navigateTo: "main-app" }}
 */
export function consumeActivationLink(tokenOrLink, api) {
  if (typeof tokenOrLink !== "string" || tokenOrLink.trim() === "") {
    throw new TypeError("A valid activation token or link is required");
  }
  const token = tokenOrLink.includes("token=")
    ? extractActivationToken(tokenOrLink)
    : tokenOrLink;
  if (!token) {
    throw new TypeError("A valid activation token or link is required");
  }
  const user = api.consumeActivationLink(token);
  return { activated: true, user, navigateTo: "main-app" };
}

/**
 * Renders a "Send activation email" button into the given DOM container,
 * wiring it up to trigger {@link triggerActivationEmail} on click. No-ops
 * (returns null) outside a browser-like DOM environment so this module
 * stays safely importable in non-DOM contexts (e.g. server-side or tests).
 *
 * @param {Element} container - DOM node to render the button into.
 * @param {string} userId - The user to send the activation email to.
 * @param {object} api - API client with sendActivationEmail.
 * @returns {{ button: Element }|null}
 */
export function renderActivationButton(container, userId, api) {
  if (!container || typeof container.appendChild !== "function") {
    return null;
  }

  const button = container.ownerDocument
    ? container.ownerDocument.createElement("button")
    : container;
  if (typeof button.setAttribute === "function") {
    button.setAttribute("data-testid", "send-activation-email");
  }
  button.textContent = "Send activation email";
  if (typeof button.addEventListener === "function") {
    button.addEventListener("click", () => triggerActivationEmail(userId, api));
  }
  container.appendChild(button);

  return { button };
}

/**
 * Renders the activation landing state into the given DOM container: on
 * mount, consumes the activation link/token and reflects the resulting
 * activated state (and target route) into the DOM via data attributes. No-ops
 * (returns null) outside a browser-like DOM environment.
 *
 * @param {Element} container - DOM node to render the landing state into.
 * @param {string} tokenOrLink - The activation token or full link clicked.
 * @param {object} api - API client with consumeActivationLink.
 * @returns {{ result: object, root: Element }|null}
 */
export function renderActivationLanding(container, tokenOrLink, api) {
  if (!container || typeof container.appendChild !== "function") {
    return null;
  }

  const result = consumeActivationLink(tokenOrLink, api);

  const root = container.ownerDocument
    ? container.ownerDocument.createElement("div")
    : container;
  root.className = "activation-landing";
  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-testid", "activation-landing");
    root.setAttribute("data-activated", String(result.activated));
    root.setAttribute("data-navigate-to", result.navigateTo);
  }
  container.appendChild(root);

  return { result, root };
}
