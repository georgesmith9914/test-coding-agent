import test from "node:test";
import assert from "node:assert/strict";
import { subtract } from "../src/subtract.js";

test("subtract subtracts two numbers", () => {
  assert.equal(subtract(5, 3), 2);
});
