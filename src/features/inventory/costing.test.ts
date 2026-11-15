import assert from "node:assert/strict";
import { test } from "node:test";

import { formatQuantity, recipeCost, roundForMenu, servingsLeft, stockStatus, suggestedPrice } from "./costing";
import type { InventoryItem } from "./types";

const item = (id: string, unit: InventoryItem["unit"], quantity: number, unitCost: number): InventoryItem => ({
  id, name: id, category: "Pantry", unit, quantity, minimum: 0, unitCost,
});

// The Classic Cheeseburger recipe from the Figma Costing screen.
const items = [
  item("buns", "pcs", 35, 850),
  item("beef", "pcs", 18, 3200),
  item("cheese", "pcs", 42, 720),
  item("lettuce", "kg", 600, 12000),
  item("tomatoes", "kg", 4500, 12000),
  item("sauce", "L", 3200, 20000),
  item("mayo", "L", 2500, 26000),
  item("oil", "L", 12000, 18000),
];
const classic = [
  { itemId: "buns", quantity: 1 },
  { itemId: "beef", quantity: 1 },
  { itemId: "cheese", quantity: 1 },
  { itemId: "lettuce", quantity: 15 },
  { itemId: "tomatoes", quantity: 20 },
  { itemId: "sauce", quantity: 15 },
  { itemId: "mayo", quantity: 10 },
  { itemId: "oil", quantity: 5 },
];

test("prices a recipe at current unit costs: Classic Cheeseburger = ₱58.40", () => {
  assert.equal(recipeCost(classic, items), 5840);
});

test("servings left are limited by the scarcest ingredient", () => {
  // 18 beef patties is the bottleneck; lettuce allows 40, buns 35.
  assert.deepEqual(servingsLeft(classic, items), { servings: 18, limitedBy: "beef" });
  const noOnions = [item("onions", "kg", 0, 9000)];
  assert.deepEqual(servingsLeft([{ itemId: "onions", quantity: 150 }], noOnions), { servings: 0, limitedBy: "onions" });
});

test("a product with no recipe is not tracked", () => {
  assert.equal(servingsLeft([], items), null);
});

test("suggests a price for a target margin and rounds it up to a menu price ending in 9", () => {
  assert.equal(suggestedPrice(5840, 65), 16686); // ₱58.40 ÷ (1 − 0.65) = ₱166.86
  assert.equal(roundForMenu(16686), 16900);
  assert.equal(roundForMenu(16900), 16900);
  assert.equal(roundForMenu(17000), 17900);
});

test("stock status: out at zero, low below the minimum, otherwise in stock", () => {
  assert.equal(stockStatus({ quantity: 0, minimum: 3000 }), "out");
  assert.equal(stockStatus({ quantity: 600, minimum: 2000 }), "low");
  assert.equal(stockStatus({ quantity: 2000, minimum: 2000 }), "in");
});

test("quantities read naturally: small amounts in g/ml, stock in kg/L", () => {
  assert.equal(formatQuantity(600, "kg"), "0.6 kg");
  assert.equal(formatQuantity(15, "kg", "serving"), "15 g");
  assert.equal(formatQuantity(15, "L", "serving"), "15 ml");
  assert.equal(formatQuantity(18, "pcs"), "18 pcs");
  assert.equal(formatQuantity(1, "pcs", "serving"), "1 pc");
});
