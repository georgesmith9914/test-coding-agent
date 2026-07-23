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

// -- One-click activation email support -------------------------------
// Maps a single-use activation token to the user id it was issued for
// (plus an expiry) so the emailed link can be "clicked" later to activate
// the account without the user copying/typing a code.
const activationTokens = new Map();
// Simulates the dev/staging mailbox: every "sent" activation email is
// appended here so tests (and manual QA) can retrieve it without a real
// mail provider.
const mailbox = [];

const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVATION_LINK_BASE_URL = "https://app.example.com/activate";

function generateActivationToken() {
  return `tok_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/**
 * Creates a new user record, defaulting to a "new" (not yet activated)
 * user, and stores it for lookup via {@link getUser}.
 *
 * @param {object} [overrides] - Fields to override on the created user.
 * @returns {object} The created user record.
 */
export function createUser(overrides = {}) {
  const user = {
    id: overrides.id ?? `user-${users.size + 1}`,
    displayName: overrides.displayName ?? "New User",
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
 * Sends a one-click activation email for a user: issues a single-use
 * activation token, builds the activation link, and delivers it to the
 * in-memory dev/staging mailbox (see {@link getMailbox}).
 *
 * @param {string} userId
 * @returns {object} The "sent" email, including `link` and `token`.
 */
export function sendActivationEmail(userId) {
  const user = getUser(userId);
  const token = generateActivationToken();
  activationTokens.set(token, {
    userId,
    expiresAt: Date.now() + ACTIVATION_TOKEN_TTL_MS,
  });
  const link = `${ACTIVATION_LINK_BASE_URL}?token=${encodeURIComponent(token)}`;
  const email = {
    to: user.email ?? `${userId}@example.com`,
    subject: "Activate your account",
    body: `Click to activate your account: ${link}`,
    link,
    token,
    sentAt: Date.now(),
  };
  mailbox.push(email);
  return email;
}

/**
 * Returns a copy of every email delivered to the in-memory dev/staging
 * mailbox, most-recent last.
 *
 * @returns {object[]}
 */
export function getMailbox() {
  return mailbox.slice();
}

/**
 * Consumes a one-click activation token (from a clicked activation link):
 * validates it, marks the owning account activated, and invalidates the
 * token so it cannot be reused.
 *
 * @param {string} token
 * @returns {object} The updated (now activated) user record.
 */
export function consumeActivationLink(token) {
  const record = activationTokens.get(token);
  if (!record) {
    throw new RangeError("Invalid or already used activation token");
  }
  activationTokens.delete(token);
  if (record.expiresAt < Date.now()) {
    throw new RangeError("Activation token has expired");
  }
  const user = getUser(record.userId);
  user.flags.activated = true;
  user.flags.new = false;
  return user;
}

/**
 * Test/demo helper to reset in-memory state between runs.
 */
export function resetOnboardingApi() {
  users.clear();
  nextItemId = 1;
  activationTokens.clear();
  mailbox.length = 0;
}
