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

## Run tests

```bash
npm test
```
