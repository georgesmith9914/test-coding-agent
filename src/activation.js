/**
 * Client-side handling for one-click activation email links.
 *
 * When a user clicks the activation link in their email, the frontend
 * extracts the single-use token from the URL and calls this "JS endpoint"
 * (`consumeActivationLink`), which delegates to the backend's
 * `consumeActivationToken` API, then maps the result to a view/navigation
 * state the app can render: on success, the user is redirected into the
 * app with a "welcome" state; on failure, an explanatory error state is
 * returned so the UI can prompt the user appropriately (e.g. request a
 * new link).
 */

export const ACTIVATION_RESULT = Object.freeze({
  WELCOME: "welcome",
  ALREADY_ACTIVE: "already-active",
  INVALID: "invalid",
  EXPIRED: "expired",
});

const DEFAULT_APP_ROUTE = "/app";
const DEFAULT_SIGNIN_ROUTE = "/signin";

/**
 * Extracts the activation token from a one-click activation link.
 *
 * @param {string} url - Full activation link (e.g. from
 *   `window.location.href`).
 * @returns {string|null} The token, or null if none is present.
 */
export function extractActivationToken(url) {
  if (typeof url !== "string" || url.trim() === "") {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("token");
  } catch {
    // Fall back to treating the input itself as a bare token/query string.
    const match = url.match(/[?&]token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

/**
 * Consumes an activation link: extracts the token, asks the backend API to
 * validate/consume it, and returns a view/navigation state describing what
 * the frontend should show/do next.
 *
 * This is the "JS endpoint" the frontend calls when the activation link is
 * clicked (e.g. on page load of the activation route).
 *
 * @param {string} url - The activation link the user clicked, containing
 *   the single-use token as a `token` query parameter.
 * @param {{ consumeActivationToken: Function }} api - Backend API client.
 * @param {object} [options]
 * @param {string} [options.appRoute] - Route to redirect into on success.
 * @param {string} [options.signInRoute] - Route to send the user to when
 *   the token can't be honored (invalid/expired).
 * @returns {{
 *   result: string,
 *   redirectTo: string,
 *   welcome: boolean,
 *   user?: object,
 * }} View/navigation state for the frontend to act on.
 */
export function consumeActivationLink(url, api, options = {}) {
  const appRoute = options.appRoute ?? DEFAULT_APP_ROUTE;
  const signInRoute = options.signInRoute ?? DEFAULT_SIGNIN_ROUTE;

  const token = extractActivationToken(url);
  if (!token) {
    return {
      result: ACTIVATION_RESULT.INVALID,
      redirectTo: signInRoute,
      welcome: false,
    };
  }

  const outcome = api.consumeActivationToken(token);

  switch (outcome.status) {
    case "activated":
      return {
        result: ACTIVATION_RESULT.WELCOME,
        redirectTo: `${appRoute}?welcome=1`,
        welcome: true,
        user: outcome.user,
      };
    case "already_used":
      // The account is already activated (e.g. link clicked twice); send
      // the user straight into the app without re-showing the welcome
      // state.
      return {
        result: ACTIVATION_RESULT.ALREADY_ACTIVE,
        redirectTo: appRoute,
        welcome: false,
        user: outcome.user,
      };
    case "expired":
      return {
        result: ACTIVATION_RESULT.EXPIRED,
        redirectTo: signInRoute,
        welcome: false,
      };
    case "invalid":
    default:
      return {
        result: ACTIVATION_RESULT.INVALID,
        redirectTo: signInRoute,
        welcome: false,
      };
  }
}
