import assert from "node:assert/strict";
import { test } from "vitest";

import { findShortage, ingredientsNeeded, planMovement } from "./movements";
import type { InventoryItem } from "./types";

const beef: InventoryItem = { id: "beef", name: "Beef Patties", category: "Meat", unit: "pcs", quantity: 18, minimum: 40, unitCost: 3200 };
const lettuce: InventoryItem = { id: "lettuce", name: "Lettuce", category: "Produce", unit: "kg", quantity: 600, minimum: 2000, unitCost: 12000 };
const pint: InventoryItem = { id: "pint", name: "Pint", category: "Ice Cream (Dan Eric)", unit: "pcs", quantity: 2, minimum: 10, unitCost: 7600 };
const day = "2026-11-16";
const recipes = { burger: [{ itemId: "beef", quantity: 1 }, { itemId: "lettuce", quantity: 15 }], "pint-tub": [{ itemId: "pint", quantity: 1 }] };

test("Stock In adds units, sets the new unit cost and keeps the delivery details", () => {
  assert.deepEqual(
    planMovement({ type: "stock-in", itemId: "beef", quantity: 50, unitCost: 3350, reference: "INV-204", supplier: "Metro Meat", date: day }, beef),
    { ok: true, change: 50, newQuantity: 68, unitCost: 3350, reference: "INV-204", supplier: "Metro Meat", note: undefined },
  );
});

test("an adjustment sets the counted amount and records the difference", () => {
  const plan = planMovement({ type: "adjustment", itemId: "lettuce", quantity: 450, note: "Weekly count", date: day }, lettuce);
  assert.deepEqual(plan, { ok: true, change: -150, newQuantity: 450, unitCost: undefined, reference: undefined, supplier: undefined, note: "Weekly count" });
});

test("waste removes stock but never more than is on hand", () => {
  assert.equal(planMovement({ type: "waste", itemId: "lettuce", quantity: 100, note: "Wilted", date: day }, lettuce).ok, true);
  assert.deepEqual(planMovement({ type: "waste", itemId: "lettuce", quantity: 999, note: "Oops", date: day }, { ...lettuce, quantity: 500 }), {
    ok: false,
    error: "Only 0.5 kg on hand; you can't waste more than that.",
  });
});

test("a batch of homemade patties is recorded as made in-house, not bought", () => {
  const plan = planMovement(
    { type: "stock-in", itemId: "beef", quantity: 40, unitCost: 3000, supplier: "Palengke", reference: "R-1", date: day },
    { ...beef, homemade: true },
  );
  assert.ok(plan.ok);
  assert.equal(plan.supplier, "Made in-house");
  assert.equal(plan.reference, undefined);
  assert.equal(plan.newQuantity, 58);
});

test("a sale needs each recipe ingredient, times the pieces sold", () => {
  assert.deepEqual([...ingredientsNeeded([{ productId: "burger", quantity: 2 }], recipes)], [
    ["beef", 2],
    ["lettuce", 30],
  ]);
});

test("shared ingredients are added up across the order before checking stock", () => {
  // 18 beef patties: 10 burgers + 10 more burgers needs 20, so the whole sale is refused.
  const needed = ingredientsNeeded([{ productId: "burger", quantity: 10 }, { productId: "burger", quantity: 10 }], recipes);
  assert.equal(needed.get("beef"), 20);
  assert.equal(findShortage(needed, [beef, lettuce, pint]), "Beef Patties");
});

test("the first short ingredient is named; enough stock means none", () => {
  const order = [{ productId: "burger", quantity: 1 }, { productId: "pint-tub", quantity: 3 }];
  assert.equal(findShortage(ingredientsNeeded(order, recipes), [beef, lettuce, pint]), "Pint");
  assert.equal(findShortage(ingredientsNeeded([{ productId: "burger", quantity: 1 }], recipes), [beef, lettuce, pint]), null);
  assert.equal(findShortage(new Map([["ghost", 1]]), [beef]), "a removed item");
});

test("products without a recipe need nothing from stock", () => {
  assert.equal(ingredientsNeeded([{ productId: "new-item", quantity: 5 }], recipes).size, 0);
});
