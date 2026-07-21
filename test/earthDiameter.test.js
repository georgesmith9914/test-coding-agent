import test from "node:test";
import assert from "node:assert/strict";
import {
  diameterFromRadius,
  earthDiameterKm,
  EARTH_RADIUS_KM,
} from "../src/earthDiameter.js";

test("diameterFromRadius doubles the radius", () => {
  assert.equal(diameterFromRadius(1), 2);
  assert.equal(diameterFromRadius(10), 20);
});

test("diameterFromRadius handles zero", () => {
  assert.equal(diameterFromRadius(0), 0);
});

test("diameterFromRadius handles decimal numbers", () => {
  assert.ok(Math.abs(diameterFromRadius(2.5) - 5) < 1e-9);
});

test("diameterFromRadius throws for negative radius", () => {
  assert.throws(() => diameterFromRadius(-1), RangeError);
});

test("diameterFromRadius throws for non-number input", () => {
  assert.throws(() => diameterFromRadius("5"), TypeError);
  assert.throws(() => diameterFromRadius(NaN), TypeError);
});

test("earthDiameterKm returns twice the Earth's radius", () => {
  assert.equal(earthDiameterKm(), EARTH_RADIUS_KM * 2);
});

test("earthDiameterKm returns expected approximate value", () => {
  assert.equal(earthDiameterKm(), 12742);
});
