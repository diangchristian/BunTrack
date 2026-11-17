import assert from "node:assert/strict";
import { test } from "vitest";

import { vsPrevious } from "./delta";

const line = (...args: Parameters<typeof vsPrevious>) => {
  const { text, kind } = vsPrevious(...args);
  return { text, kind };
};

test("percent change against yesterday's sales", () => {
  assert.deepEqual(line(12000, 10000, "yesterday"), { text: "+20.0% vs yesterday", kind: "up" });
  assert.deepEqual(line(7500, 10000, "yesterday"), { text: "-25.0% vs yesterday", kind: "down" });
});

test("count change against yesterday's orders", () => {
  assert.deepEqual(line(42, 40, "yesterday", "count"), { text: "+2 vs yesterday", kind: "up" });
});

test("no sales before never shows Infinity or NaN", () => {
  assert.deepEqual(line(5000, 0, "yesterday"), { text: "No sales yesterday", kind: "neutral" });
  assert.deepEqual(line(0, 0, "last week"), { text: "No sales last week", kind: "neutral" });
  // A count still reads fine from zero.
  assert.deepEqual(line(3, 0, "yesterday", "count"), { text: "+3 vs yesterday", kind: "up" });
});

test("a loss shrinking from yesterday reads as an improvement", () => {
  assert.deepEqual(line(-5000, -10000, "yesterday"), { text: "+50.0% vs yesterday", kind: "up" });
});
