import assert from "node:assert/strict";
import { test } from "node:test";

import { costProduct, productMargin } from "./costing";

test("Classic Cheeseburger from the Figma drawer: ₱149 price, ₱58.40 cost", () => {
  assert.deepEqual(productMargin(14900, 5840), { profit: 9060, marginPercent: 60.8, foodCostPercent: 39.2 });
});

test("a Buy 1 Take 1 order costs two pieces and stock makes half as many orders", () => {
  const items = [
    { id: "bun", name: "Burger Buns", category: "Bakery", unit: "pcs", quantity: 35, minimum: 0, unitCost: 850 },
    { id: "patty", name: "Beef Patties", category: "Meat", unit: "pcs", quantity: 18, minimum: 0, unitCost: 1500 },
  ] as const;
  const recipe = [{ itemId: "bun", quantity: 1 }, { itemId: "patty", quantity: 1 }];
  const b1t1 = costProduct({ pieces: 2 }, recipe, [...items]);
  assert.deepEqual(b1t1, { cost: 4700, hasRecipe: true, servingsLeft: 9, limitedBy: "Beef Patties" }); // (₱8.50 + ₱15) × 2
  assert.deepEqual(costProduct({ pieces: 1 }, [], [...items]), { cost: 0, hasRecipe: false, servingsLeft: null, limitedBy: undefined });
});
