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

`src/onboardingApi.js` and `src/activation.js` implement a one-click account
activation flow, an alternative/faster path to activation than the
checklist above:

1. `sendActivationEmail(userId)` issues a single-use activation token and
   delivers an email (with a one-click link) to an in-memory dev/staging
   `getMailbox()`, standing in for a real mail provider.
2. `triggerActivationEmail(userId, api)` is the client-side call used to
   kick this off from the UI (e.g. a "Send activation email" button, see
   `renderActivationButton`).
3. Clicking the emailed link calls `consumeActivationLink(tokenOrLink, api)`,
   which validates the token, flips the user's `activated` flag on the
   server (`onboardingApi.consumeActivationLink`), and returns client-side
   state (`{ activated: true, navigateTo: "main-app" }`) so the app can show
   the activated state and navigate the user in. `renderActivationLanding`
   provides an optional DOM binding for the activation landing page.

Tokens are single-use (consuming one invalidates it) and expire after 24
hours.

## Run tests

```bash
npm test
```
