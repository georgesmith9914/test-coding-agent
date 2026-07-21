import test from "node:test";
import assert from "node:assert/strict";
import { subtract } from "../src/subtract.js";

test("subtract subtracts two numbers", () => {
  assert.equal(subtract(5, 3), 2);
});

test("subtract handles negative results", () => {
  assert.equal(subtract(3, 5), -2);
});

test("subtract handles negative operands", () => {
  assert.equal(subtract(-5, -3), -2);
});

test("subtract handles zero", () => {
  assert.equal(subtract(5, 0), 5);
  assert.equal(subtract(0, 5), -5);
  assert.equal(subtract(0, 0), 0);
});

test("subtract handles decimal numbers", () => {
  assert.ok(Math.abs(subtract(5.5, 2.2) - 3.3) < 1e-9);
});

test("subtract returns zero when operands are equal", () => {
  assert.equal(subtract(7, 7), 0);
});

test("subtract handles large numbers", () => {
  assert.equal(subtract(1_000_000_000, 1), 999_999_999);
});
