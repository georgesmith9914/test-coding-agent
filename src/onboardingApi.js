/**
 * Minimal in-memory "existing API" used by the onboarding checklist modal.
 *
 * This repository has no backend service yet, so this module stands in for
 * the "existing API" referenced by the onboarding modal's acceptance
 * criteria: updating a user's profile, creating a sample item, and
 * flipping the user's activation flag. Real deployments would swap this
 * module out for HTTP calls to the actual profile/item endpoints while
 * keeping the same function signatures.
 */

const users = new Map();
let nextItemId = 1;

/**
 * Creates a new user record, defaulting to a "new" (not yet activated)
 * user, and stores it for lookup via {@link getUser}.
 *
 * @param {object} [overrides] - Fields to override on the created user.
 * @returns {object} The created user record.
 */
export function createUser(overrides = {}) {
  const id = overrides.id ?? `user-${users.size + 1}`;
  const user = {
    id,
    displayName: overrides.displayName ?? "New User",
    email: overrides.email ?? `${id}@example.com`,
    items: [],
    flags: {
      new: true,
      activated: false,
      ...(overrides.flags ?? {}),
    },
  };
  users.set(user.id, user);
  return user;
}

/**
 * Retrieves a previously created user by id.
 *
 * @param {string} userId
 * @returns {object} The user record.
 */
export function getUser(userId) {
  const user = users.get(userId);
  if (!user) {
    throw new RangeError(`Unknown user: ${userId}`);
  }
  return user;
}

/**
 * Persists a display name change for a user (step 1 of onboarding:
 * confirm or edit display name).
 *
 * @param {string} userId
 * @param {string} displayName
 * @returns {object} The updated user record.
 */
export function updateProfile(userId, displayName) {
  if (typeof displayName !== "string" || displayName.trim() === "") {
    throw new TypeError("displayName must be a non-empty string");
  }
  const user = getUser(userId);
  user.displayName = displayName;
  return user;
}

/**
 * Creates a sample item for the user (step 3 of onboarding: create one
 * core item using the existing create endpoint).
 *
 * @param {string} userId
 * @param {object} [item] - Optional item fields.
 * @returns {object} The created item.
 */
export function createItem(userId, item = {}) {
  const user = getUser(userId);
  const created = {
    id: `item-${nextItemId++}`,
    title: item.title ?? "My first item",
    ...item,
  };
  user.items.push(created);
  return created;
}

/**
 * Flips the user's 'activated' server flag. Called once all onboarding
 * steps have been completed.
 *
 * @param {string} userId
 * @returns {object} The updated user record.
 */
export function activateUser(userId) {
  const user = getUser(userId);
  user.flags.activated = true;
  return user;
}

/**
 * Test/demo helper to reset in-memory state between runs.
 */
export function resetOnboardingApi() {
  users.clear();
  nextItemId = 1;
}
