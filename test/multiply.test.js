import test from "node:test";
import assert from "node:assert/strict";
import { multiply } from "../src/multiply.js";

test("multiply multiplies two numbers", () => {
  assert.equal(multiply(2, 3), 6);
});

test("multiply handles negative numbers", () => {
  assert.equal(multiply(-2, 3), -6);
  assert.equal(multiply(-2, -3), 6);
});

test("multiply handles zero", () => {
  assert.equal(multiply(5, 0), 0);
  assert.equal(multiply(0, 5), 0);
  assert.equal(multiply(0, 0), 0);
});

test("multiply handles decimal numbers", () => {
  assert.ok(Math.abs(multiply(2.5, 4) - 10) < 1e-9);
});

test("multiply handles one as identity", () => {
  assert.equal(multiply(7, 1), 7);
  assert.equal(multiply(1, 7), 7);
});
