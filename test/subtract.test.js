import test from "node:test";
import assert from "node:assert/strict";
import { subtract } from "../src/subtract.js";

test("subtract subtracts two numbers", () => {
  assert.equal(subtract(5, 3), 2);
});

test("subtract handles negative numbers", () => {
  assert.equal(subtract(-5, -3), -2);
});

test("subtract handles negative result", () => {
  assert.equal(subtract(3, 5), -2);
});

test("subtract handles zero", () => {
  assert.equal(subtract(5, 0), 5);
  assert.equal(subtract(0, 5), -5);
});

test("subtract handles decimals", () => {
  assert.equal(subtract(5.5, 2.2), 3.3);
});
