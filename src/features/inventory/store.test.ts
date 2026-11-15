import assert from "node:assert/strict";
import { test } from "node:test";

import { createInventoryStore } from "./store";
import type { InventoryItem } from "./types";

const beef: InventoryItem = { id: "beef", name: "Beef Patties", category: "Meat", unit: "pcs", quantity: 18, minimum: 40, unitCost: 3200 };
const lettuce: InventoryItem = { id: "lettuce", name: "Lettuce", category: "Produce", unit: "kg", quantity: 600, minimum: 2000, unitCost: 12000 };
const pint: InventoryItem = { id: "pint", name: "Pint", category: "Ice Cream (Dan Eric)", unit: "pcs", quantity: 2, minimum: 10, unitCost: 7600 };
const day = "2026-11-16";

const fresh = () =>
  createInventoryStore({
    items: [beef, lettuce, pint],
    recipes: { burger: [{ itemId: "beef", quantity: 1 }, { itemId: "lettuce", quantity: 15 }], "pint-tub": [{ itemId: "pint", quantity: 1 }] },
  });
const qty = (store: ReturnType<typeof fresh>, id: string) => store.items().find((i) => i.id === id)!.quantity;

test("Stock In adds units, sets the new unit cost and logs the delivery", () => {
  const store = fresh();
  const result = store.recordMovement(
    { type: "stock-in", itemId: "beef", quantity: 50, unitCost: 3350, reference: "INV-204", supplier: "Metro Meat", date: day },
    "Maria Reyes",
  );
  assert.ok(result.ok);
  assert.equal(qty(store, "beef"), 68);
  assert.equal(store.items().find((i) => i.id === "beef")!.unitCost, 3350);
  const [movement] = store.movements();
  assert.deepEqual(
    { type: movement.type, change: movement.change, reference: movement.reference, by: movement.by },
    { type: "stock-in", change: 50, reference: "INV-204", by: "Maria Reyes" },
  );
});

test("an adjustment sets the counted amount and logs the difference", () => {
  const store = fresh();
  store.recordMovement({ type: "adjustment", itemId: "lettuce", quantity: 450, note: "Weekly count", date: day }, "Carlo");
  assert.equal(qty(store, "lettuce"), 450);
  assert.equal(store.movements()[0].change, -150);
});

test("waste removes stock but never more than is on hand", () => {
  const store = fresh();
  assert.ok(store.recordMovement({ type: "waste", itemId: "lettuce", quantity: 100, note: "Wilted", date: day }, "Carlo").ok);
  assert.equal(qty(store, "lettuce"), 500);
  assert.deepEqual(store.recordMovement({ type: "waste", itemId: "lettuce", quantity: 999, note: "Oops", date: day }, "Carlo"), {
    ok: false,
    error: "Only 0.5 kg on hand; you can't waste more than that.",
  });
  assert.equal(qty(store, "lettuce"), 500);
});

test("a sale deducts every recipe ingredient and logs it against the order", () => {
  const store = fresh();
  assert.deepEqual(store.consume([{ productId: "burger", quantity: 2 }], "#1043", "Jun", day), { ok: true });
  assert.equal(qty(store, "beef"), 16);
  assert.equal(qty(store, "lettuce"), 570);
  assert.deepEqual(store.movements().map((m) => [m.type, m.itemId, m.change, m.reference]), [
    ["sale", "beef", -2, "#1043"],
    ["sale", "lettuce", -30, "#1043"],
  ]);
});

test("a sale is all-or-nothing: if any ingredient is short, nothing is deducted", () => {
  const store = fresh();
  assert.deepEqual(store.consume([{ productId: "burger", quantity: 1 }, { productId: "pint-tub", quantity: 3 }], "#1044", "Jun", day), { ok: false, shortOf: "Pint" });
  assert.equal(qty(store, "beef"), 18);
  assert.equal(qty(store, "pint"), 2);
  assert.deepEqual(store.movements(), []);
});

test("products without a recipe sell without touching stock", () => {
  const store = fresh();
  assert.deepEqual(store.consume([{ productId: "new-item", quantity: 5 }], "#1045", "Jun", day), { ok: true });
  assert.deepEqual(store.movements(), []);
});

test("saving a recipe replaces it", () => {
  const store = fresh();
  store.setRecipe("burger", [{ itemId: "beef", quantity: 2 }]);
  assert.deepEqual(store.recipe("burger"), [{ itemId: "beef", quantity: 2 }]);
  assert.deepEqual(store.recipe("unknown"), []);
});

test("unknown items are reported", () => {
  const store = fresh();
  assert.equal(store.recordMovement({ type: "waste", itemId: "ghost", quantity: 1, note: "x", date: day }, "Carlo").ok, false);
});

test("shared ingredients are added up across the order before checking stock", () => {
  // 18 beef patties: 10 burgers + 10 more burgers needs 20, so the whole sale is refused.
  const store = fresh();
  assert.deepEqual(store.consume([{ productId: "burger", quantity: 10 }, { productId: "burger", quantity: 10 }], "#1046", "Jun", day), { ok: false, shortOf: "Beef Patties" });
});

test("a batch of homemade patties is logged as made in-house, not bought", () => {
  const store = createInventoryStore({ items: [{ ...beef, homemade: true }], recipes: {} });
  store.recordMovement({ type: "stock-in", itemId: "beef", quantity: 40, unitCost: 3000, supplier: "Palengke", date: day }, "Maria Reyes");
  assert.equal(store.movements()[0].supplier, "Made in-house");
  assert.equal(store.items()[0].quantity, 58);
});
