import test from "node:test";
import assert from "node:assert/strict";
import {
  createUser,
  getUser,
  resetOnboardingApi,
  updateProfile,
  createItem,
  activateUser,
} from "../src/onboardingApi.js";
import {
  ONBOARDING_STEPS,
  shouldShowOnboarding,
  createOnboardingState,
  completeConfirmProfile,
  viewTooltip,
  completeCreateItem,
  isOnboardingComplete,
  maybeActivateUser,
  renderOnboardingModal,
} from "../src/onboardingModal.js";

const api = { updateProfile, createItem, activateUser };

test.beforeEach(() => {
  resetOnboardingApi();
});

test("shouldShowOnboarding is true for new, unactivated users", () => {
  const user = createUser();
  assert.equal(shouldShowOnboarding(user), true);
});

test("shouldShowOnboarding is false for users without the 'new' flag", () => {
  const user = createUser({ flags: { new: false } });
  assert.equal(shouldShowOnboarding(user), false);
});

test("shouldShowOnboarding is false once a user is already activated", () => {
  const user = createUser({ flags: { activated: true } });
  assert.equal(shouldShowOnboarding(user), false);
});

test("createOnboardingState requires a user with an id", () => {
  assert.throws(() => createOnboardingState({}), TypeError);
  assert.throws(() => createOnboardingState(null), TypeError);
});

test("completeConfirmProfile persists display name and marks step done", () => {
  const user = createUser();
  const state = createOnboardingState(user);

  completeConfirmProfile(state, api, "Ada Lovelace");

  assert.equal(state.steps[ONBOARDING_STEPS.CONFIRM_PROFILE], true);
  assert.equal(getUser(user.id).displayName, "Ada Lovelace");
});

test("viewTooltip only completes the guided tour after 3 tooltips", () => {
  const user = createUser();
  const state = createOnboardingState(user);

  viewTooltip(state);
  assert.equal(state.steps[ONBOARDING_STEPS.GUIDED_TOUR], false);

  viewTooltip(state);
  assert.equal(state.steps[ONBOARDING_STEPS.GUIDED_TOUR], false);

  viewTooltip(state);
  assert.equal(state.steps[ONBOARDING_STEPS.GUIDED_TOUR], true);
});

test("viewTooltip caps tooltipsSeen at 3 for extra calls", () => {
  const user = createUser();
  const state = createOnboardingState(user);

  for (let i = 0; i < 5; i++) viewTooltip(state);

  assert.equal(state.tooltipsSeen, 3);
});

test("completeCreateItem creates a sample item and marks step done", () => {
  const user = createUser();
  const state = createOnboardingState(user);

  completeCreateItem(state, api, { title: "Sample task" });

  assert.equal(state.steps[ONBOARDING_STEPS.CREATE_ITEM], true);
  assert.equal(getUser(user.id).items.length, 1);
  assert.equal(getUser(user.id).items[0].title, "Sample task");
});

test("isOnboardingComplete is false until all three steps are done", () => {
  const user = createUser();
  const state = createOnboardingState(user);
  assert.equal(isOnboardingComplete(state), false);

  completeConfirmProfile(state, api, "Ada Lovelace");
  assert.equal(isOnboardingComplete(state), false);

  viewTooltip(state);
  viewTooltip(state);
  viewTooltip(state);
  assert.equal(isOnboardingComplete(state), false);

  completeCreateItem(state, api, {});
  assert.equal(isOnboardingComplete(state), true);
});

test("maybeActivateUser returns null until onboarding is complete", () => {
  const user = createUser();
  const state = createOnboardingState(user);
  assert.equal(maybeActivateUser(state, api), null);
});

test("full onboarding flow flips the 'activated' server flag exactly once", () => {
  const user = createUser();
  const state = createOnboardingState(user);

  completeConfirmProfile(state, api, "Grace Hopper");
  viewTooltip(state);
  viewTooltip(state);
  viewTooltip(state);
  completeCreateItem(state, api, { title: "First project" });

  const activatedUser = maybeActivateUser(state, api);
  assert.ok(activatedUser);
  assert.equal(activatedUser.flags.activated, true);
  assert.equal(getUser(user.id).flags.activated, true);
  assert.equal(getUser(user.id).displayName, "Grace Hopper");
  assert.equal(getUser(user.id).items.length, 1);

  // Idempotent: calling again after activation does not re-activate/throw.
  assert.equal(maybeActivateUser(state, api), null);

  // Once activated, the modal should no longer be shown.
  assert.equal(shouldShowOnboarding(getUser(user.id)), false);
});

test("renderOnboardingModal returns null outside a DOM environment", () => {
  const user = createUser();
  assert.equal(renderOnboardingModal(undefined, user, api), null);
  assert.equal(renderOnboardingModal({}, user, api), null);
});

test("renderOnboardingModal returns null for users who shouldn't see onboarding", () => {
  const user = createUser({ flags: { activated: true } });
  const fakeContainer = { appendChild: () => {} };
  assert.equal(renderOnboardingModal(fakeContainer, user, api), null);
});

test("renderOnboardingModal mounts modal state for eligible users with a DOM-like container", () => {
  const user = createUser();
  const appended = [];
  const fakeContainer = {
    ownerDocument: null,
    appendChild: (node) => appended.push(node),
  };

  const result = renderOnboardingModal(fakeContainer, user, api);

  assert.ok(result);
  assert.equal(result.state.userId, user.id);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].className, "onboarding-modal");
});
