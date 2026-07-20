import test from "node:test";
import assert from "node:assert/strict";
import { subtract } from "../src/subtract.js";

test("subtract subtracts two numbers", () => {
  assert.equal(subtract(5, 3), 2);
});

test("subtract handles negative numbers", () => {
  assert.equal(subtract(-5, -3), -2);
  assert.equal(subtract(-5, 3), -8);
  assert.equal(subtract(5, -3), 8);
});

test("subtract handles zero", () => {
  assert.equal(subtract(0, 0), 0);
  assert.equal(subtract(5, 0), 5);
  assert.equal(subtract(0, 5), -5);
});

test("subtract handles decimal numbers", () => {
  assert.ok(Math.abs(subtract(5.5, 2.2) - 3.3) < Number.EPSILON * 10);
});

test("subtract returns 0 when subtracting a number from itself", () => {
  assert.equal(subtract(42, 42), 0);
});
