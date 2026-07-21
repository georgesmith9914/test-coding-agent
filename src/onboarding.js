/**
 * Utilities for measuring and improving onboarding conversion.
 *
 * These helpers turn raw onboarding funnel counts (e.g. signups, completed
 * steps) into actionable metrics so drop-off points can be identified and
 * addressed.
 */

/**
 * Calculates the conversion rate between two funnel stages as a percentage.
 *
 * @param {number} started - Number of users who started the stage.
 * @param {number} completed - Number of users who completed the stage.
 * @returns {number} Conversion rate as a percentage (0-100).
 */
export function conversionRate(started, completed) {
  if (!Number.isFinite(started) || !Number.isFinite(completed)) {
    throw new TypeError("started and completed must be numbers");
  }
  if (started < 0 || completed < 0) {
    throw new RangeError("started and completed must not be negative");
  }
  if (completed > started) {
    throw new RangeError("completed cannot exceed started");
  }
  if (started === 0) {
    return 0;
  }
  return (completed / started) * 100;
}

/**
 * Computes the drop-off rate (percentage of users lost) between two
 * consecutive funnel stages.
 *
 * @param {number} started - Number of users who started the stage.
 * @param {number} completed - Number of users who completed the stage.
 * @returns {number} Drop-off rate as a percentage (0-100).
 */
export function dropoffRate(started, completed) {
  return 100 - conversionRate(started, completed);
}

/**
 * Given an ordered list of onboarding funnel step counts (e.g.
 * [signups, verifiedEmail, completedProfile, firstAction]), returns the
 * drop-off percentage between each consecutive pair of steps.
 *
 * @param {number[]} steps - Ordered counts of users reaching each step.
 * @returns {number[]} Drop-off percentage between each consecutive step pair.
 */
export function funnelDropoffs(steps) {
  if (!Array.isArray(steps) || steps.length < 2) {
    throw new RangeError("steps must be an array with at least two stages");
  }
  const dropoffs = [];
  for (let i = 1; i < steps.length; i++) {
    dropoffs.push(dropoffRate(steps[i - 1], steps[i]));
  }
  return dropoffs;
}

/**
 * Identifies the funnel stage transition with the highest drop-off rate,
 * i.e. the biggest opportunity to improve onboarding conversion.
 *
 * @param {number[]} steps - Ordered counts of users reaching each step.
 * @param {string[]} [labels] - Optional labels for each step, used to name
 *   the "from" and "to" stages in the result.
 * @returns {{ index: number, from: string|number, to: string|number, dropoffRate: number }}
 *   The index of the transition (0 = between step 0 and 1), the from/to
 *   labels (or indices when labels aren't provided), and the drop-off rate.
 */
export function biggestDropoff(steps, labels) {
  const dropoffs = funnelDropoffs(steps);
  let worstIndex = 0;
  for (let i = 1; i < dropoffs.length; i++) {
    if (dropoffs[i] > dropoffs[worstIndex]) {
      worstIndex = i;
    }
  }
  return {
    index: worstIndex,
    from: labels ? labels[worstIndex] : worstIndex,
    to: labels ? labels[worstIndex + 1] : worstIndex + 1,
    dropoffRate: dropoffs[worstIndex],
  };
}
