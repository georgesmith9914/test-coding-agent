import test from "node:test";
import assert from "node:assert/strict";
import { add } from "../src/add.js";

test("add adds two numbers", () => {
  assert.equal(add(2, 3), 5);
});

test("add handles negative numbers", () => {
  assert.equal(add(-5, -3), -8);
});

test("add handles mixed sign operands", () => {
  assert.equal(add(-5, 3), -2);
  assert.equal(add(5, -3), 2);
});

test("add handles zero", () => {
  assert.equal(add(5, 0), 5);
  assert.equal(add(0, 5), 5);
  assert.equal(add(0, 0), 0);
});

test("add handles decimal numbers", () => {
  assert.ok(Math.abs(add(5.5, 2.2) - 7.7) < 1e-9);
});
