import test from "node:test";
import assert from "node:assert/strict";
import { divide } from "../src/division.js";

test("divide divides two numbers", () => {
  assert.equal(divide(6, 3), 2);
});

test("divide handles negative results", () => {
  assert.equal(divide(6, -3), -2);
  assert.equal(divide(-6, 3), -2);
});

test("divide handles negative operands", () => {
  assert.equal(divide(-6, -3), 2);
});

test("divide handles zero dividend", () => {
  assert.equal(divide(0, 5), 0);
});

test("divide handles decimal numbers", () => {
  assert.ok(Math.abs(divide(5.5, 2) - 2.75) < 1e-9);
});

test("divide throws on division by zero", () => {
  assert.throws(() => divide(5, 0), /Division by zero is not allowed/);
});
