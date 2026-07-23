# Test Coding Agent

Minimal repository for validating the mobile agentic SDLC MVP workflow.

## Onboarding conversion utilities

`src/onboarding.js` provides helpers for measuring and improving onboarding
funnel conversion:

- `conversionRate(started, completed)` - percentage of users who completed a
  stage.
- `dropoffRate(started, completed)` - percentage of users lost at a stage.
- `funnelDropoffs(steps)` - drop-off percentage between each consecutive
  step in an onboarding funnel.
- `biggestDropoff(steps, labels?)` - identifies the funnel transition with
  the highest drop-off, i.e. the biggest opportunity to improve onboarding
  conversion.

## Onboarding checklist modal

`src/onboardingApi.js` and `src/onboardingModal.js` implement a 3-step
onboarding checklist shown to first-time ('new' flag) users:

1. Confirm/edit display name (persisted via `updateProfile`).
2. Click through 3 annotated tooltips highlighting the main UI areas
   (`viewTooltip`).
3. Create one sample item (`completeCreateItem`, via the create-item API).

Completing all three steps flips the user's `activated` server flag
(`maybeActivateUser`). `shouldShowOnboarding(user)` gates the modal so it
is only shown to new, not-yet-activated users, and `renderOnboardingModal`
provides an optional DOM binding for browser usage.

## One-click activation email

`src/activationApi.js` and `src/activation.js` implement one-click account
activation via email:

1. `sendActivationEmail(userId)` generates a single-use, time-limited token
   and "sends" an activation email (recorded to an in-memory outbox via
   `getOutbox()`) containing the one-click `activationLink`
   (`buildActivationLink`).
2. When the user clicks the link, the frontend calls the `consumeActivationLink(url, api)`
   "JS endpoint" (`src/activation.js`), which extracts the token
   (`extractActivationToken`) and asks the backend to validate/consume it
   (`consumeActivationToken` in `src/activationApi.js`).
3. The backend marks the account `activated` exactly once (tokens are
   single-use and expire after `DEFAULT_TOKEN_TTL_MS`), and the frontend
   receives a view/navigation state (`ACTIVATION_RESULT`) describing
   whether to redirect into the app with a welcome state, send an
   already-active user straight into the app, or send the user to sign-in
   for an invalid/expired link.

## Run tests

```bash
npm test
```
