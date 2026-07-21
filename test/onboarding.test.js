import test from "node:test";
import assert from "node:assert/strict";
import {
  conversionRate,
  dropoffRate,
  funnelDropoffs,
  biggestDropoff,
} from "../src/onboarding.js";

test("conversionRate computes percentage of users completing a stage", () => {
  assert.equal(conversionRate(100, 50), 50);
  assert.equal(conversionRate(200, 200), 100);
  assert.equal(conversionRate(4, 1), 25);
});

test("conversionRate returns 0 when no users started", () => {
  assert.equal(conversionRate(0, 0), 0);
});

test("conversionRate throws for non-numeric input", () => {
  assert.throws(() => conversionRate("100", 50), TypeError);
  assert.throws(() => conversionRate(100, undefined), TypeError);
});

test("conversionRate throws for negative input", () => {
  assert.throws(() => conversionRate(-1, 0), RangeError);
  assert.throws(() => conversionRate(10, -1), RangeError);
});

test("conversionRate throws when completed exceeds started", () => {
  assert.throws(() => conversionRate(10, 20), RangeError);
});

test("dropoffRate computes percentage of users lost", () => {
  assert.equal(dropoffRate(100, 50), 50);
  assert.equal(dropoffRate(100, 100), 0);
  assert.equal(dropoffRate(100, 0), 100);
});

test("funnelDropoffs returns drop-off between each consecutive step", () => {
  const result = funnelDropoffs([1000, 800, 400, 400]);
  assert.deepEqual(result, [20, 50, 0]);
});

test("funnelDropoffs throws for fewer than two steps", () => {
  assert.throws(() => funnelDropoffs([100]), RangeError);
  assert.throws(() => funnelDropoffs([]), RangeError);
  assert.throws(() => funnelDropoffs("not an array"), RangeError);
});

test("biggestDropoff identifies the worst funnel transition by index", () => {
  const result = biggestDropoff([1000, 800, 400, 400]);
  assert.equal(result.index, 1);
  assert.equal(result.from, 1);
  assert.equal(result.to, 2);
  assert.equal(result.dropoffRate, 50);
});

test("biggestDropoff uses provided labels when available", () => {
  const labels = ["signup", "verifiedEmail", "completedProfile", "firstAction"];
  const result = biggestDropoff([1000, 800, 400, 400], labels);
  assert.equal(result.from, "verifiedEmail");
  assert.equal(result.to, "completedProfile");
  assert.equal(result.dropoffRate, 50);
});

test("biggestDropoff picks the first worst transition when tied", () => {
  const result = biggestDropoff([100, 50, 25]);
  assert.equal(result.index, 0);
  assert.equal(result.dropoffRate, 50);
});
