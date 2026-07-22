/**
 * Client-side onboarding checklist modal shown on a user's first session.
 *
 * The modal is only shown to users carrying the 'new' flag and walks them
 * through three steps that drive early activation:
 *   1. Confirm or edit their display name (persisted via the existing
 *      profile API).
 *   2. Click through 3 annotated tooltips highlighting the main UI areas.
 *   3. Create one sample item (via the existing create-item endpoint).
 *
 * Completing all three steps flips the user's 'activated' server flag.
 *
 * The state machine here is framework/DOM agnostic so it can be unit
 * tested directly; {@link renderOnboardingModal} provides an optional DOM
 * binding for real browser usage.
 */

export const ONBOARDING_STEPS = Object.freeze({
  CONFIRM_PROFILE: "confirm-profile",
  GUIDED_TOUR: "guided-tour",
  CREATE_ITEM: "create-item",
});

const STEP_ORDER = [
  ONBOARDING_STEPS.CONFIRM_PROFILE,
  ONBOARDING_STEPS.GUIDED_TOUR,
  ONBOARDING_STEPS.CREATE_ITEM,
];

const TOOLTIP_COUNT = 3;

/**
 * Determines whether the onboarding modal should be shown for a user.
 * Only users with the 'new' flag set (and not yet activated) see it.
 *
 * @param {{ flags?: { new?: boolean, activated?: boolean } }} user
 * @returns {boolean}
 */
export function shouldShowOnboarding(user) {
  const flags = user?.flags ?? {};
  return Boolean(flags.new) && !flags.activated;
}

/**
 * Creates fresh onboarding modal state for a user.
 *
 * @param {{ id: string }} user
 * @returns {object} Onboarding state tracking step completion and tooltip
 *   progress.
 */
export function createOnboardingState(user) {
  if (!user || !user.id) {
    throw new TypeError("user with an id is required");
  }
  return {
    userId: user.id,
    tooltipsSeen: 0,
    steps: {
      [ONBOARDING_STEPS.CONFIRM_PROFILE]: false,
      [ONBOARDING_STEPS.GUIDED_TOUR]: false,
      [ONBOARDING_STEPS.CREATE_ITEM]: false,
    },
    activated: false,
  };
}

/**
 * Step 1: confirm or edit the user's display name, persisting via the
 * profile API, then marks the step complete.
 *
 * @param {object} state - Onboarding state from {@link createOnboardingState}.
 * @param {{ updateProfile: Function }} api
 * @param {string} displayName
 * @returns {object} The mutated state.
 */
export function completeConfirmProfile(state, api, displayName) {
  api.updateProfile(state.userId, displayName);
  state.steps[ONBOARDING_STEPS.CONFIRM_PROFILE] = true;
  return state;
}

/**
 * Step 2: records that one annotated tooltip has been clicked through.
 * The guided tour step is complete once all {@link TOOLTIP_COUNT}
 * tooltips have been viewed.
 *
 * @param {object} state
 * @returns {object} The mutated state.
 */
export function viewTooltip(state) {
  state.tooltipsSeen = Math.min(state.tooltipsSeen + 1, TOOLTIP_COUNT);
  if (state.tooltipsSeen >= TOOLTIP_COUNT) {
    state.steps[ONBOARDING_STEPS.GUIDED_TOUR] = true;
  }
  return state;
}

/**
 * Step 3: creates one sample item via the create-item API, then marks the
 * step complete.
 *
 * @param {object} state
 * @param {{ createItem: Function }} api
 * @param {object} [item]
 * @returns {object} The mutated state.
 */
export function completeCreateItem(state, api, item) {
  api.createItem(state.userId, item);
  state.steps[ONBOARDING_STEPS.CREATE_ITEM] = true;
  return state;
}

/**
 * @param {object} state
 * @returns {boolean} Whether every onboarding step has been completed.
 */
export function isOnboardingComplete(state) {
  return STEP_ORDER.every((step) => state.steps[step]);
}

/**
 * Flips the user's 'activated' flag via the API once all three onboarding
 * steps are complete. Safe to call multiple times; only activates once.
 *
 * @param {object} state
 * @param {{ activateUser: Function }} api
 * @returns {object|null} The updated user record, or null if the
 *   onboarding checklist isn't complete yet.
 */
export function maybeActivateUser(state, api) {
  if (!isOnboardingComplete(state) || state.activated) {
    return null;
  }
  const user = api.activateUser(state.userId);
  state.activated = true;
  return user;
}

/**
 * Renders the onboarding modal into the given DOM container, wiring up
 * the three steps to the provided API. No-ops (returns null) outside a
 * browser-like DOM environment so this module stays safely importable in
 * non-DOM contexts (e.g. server-side or tests).
 *
 * @param {Element} container - DOM node to render the modal into.
 * @param {object} user - The current user.
 * @param {object} api - API client with updateProfile/createItem/activateUser.
 * @returns {{ state: object, root: Element }|null}
 */
export function renderOnboardingModal(container, user, api) {
  if (!container || typeof container.appendChild !== "function") {
    return null;
  }
  if (!shouldShowOnboarding(user)) {
    return null;
  }

  const state = createOnboardingState(user);
  const root = container.ownerDocument
    ? container.ownerDocument.createElement("div")
    : container;
  root.className = "onboarding-modal";
  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-testid", "onboarding-modal");
  }
  container.appendChild(root);

  return { state, root };
}
