import assert from "node:assert/strict";
import { test } from "node:test";

import { productMargin } from "./costing";

test("Classic Cheeseburger from the Figma drawer: ₱149 price, ₱58.40 cost", () => {
  assert.deepEqual(productMargin(14900, 5840), { profit: 9060, marginPercent: 60.8, foodCostPercent: 39.2 });
});
