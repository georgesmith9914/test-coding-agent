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

`src/activationEmail.js`, `src/activationApi.js`, and `src/welcomeScreen.js`
implement one-click account activation via an emailed link:

1. `sendActivationEmail(user)` mints a single-use, expiring token
   (`issueActivationToken`), builds the one-click link
   (`buildActivationLink`), and records the "sent" message in the
   in-memory `activationOutbox` (there's no real mail transport here).
2. `consumeActivationToken(token)` is the backend endpoint the link
   points to: it validates the token (rejecting unknown, expired, or
   already-used tokens via `InvalidActivationTokenError`,
   `ActivationTokenExpiredError`, and `ActivationTokenAlreadyUsedError`),
   activates the account, and issues a session token
   (`createSessionToken`/`verifySessionToken` stand in for a signed
   session cookie/JWT), returning a `redirectUrl` for the authenticated
   app.
3. `renderWelcomeScreen` (frontend, DOM-optional like
   `renderOnboardingModal`) shows a first-run screen confirming
   activation once `shouldShowWelcomeScreen` indicates the user just
   activated via a valid session.

See `test/activationEmail.test.js` and `test/activationApi.test.js` for
token-handling unit tests, and `test/activationFlow.e2e.test.js` for an
end-to-end test that simulates clicking the emailed link through to the
welcome screen.

## Run tests

```bash
npm test
```
