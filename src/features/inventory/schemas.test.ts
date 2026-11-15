import assert from "node:assert/strict";
import { test } from "node:test";

import { itemFormSchema, movementFormSchema, parsePackSize, stockAmount } from "./schemas";

const stockIn = { type: "stock-in", itemId: "buns", quantity: "50", totalPaid: "425", reference: " OR-204 ", supplier: "Bakery on Rizal St.", note: "", date: "2026-11-16" };

test("Stock In: 2.5 kg of fries for ₱450 total is 2,500 g at ₱180.00 per kg", () => {
  const result = movementFormSchema("kg").safeParse({ ...stockIn, quantity: "2.5", totalPaid: "450" });
  assert.ok(result.success);
  assert.deepEqual(
    { quantity: result.data.quantity, unitCost: result.data.unitCost, reference: result.data.reference },
    { quantity: 2500, unitCost: 18000, reference: "OR-204" },
  );
});

test("Stock In by the pack: 3 packs of 10 hotdogs for ₱450 is 30 pcs at ₱15.00 each", () => {
  const result = movementFormSchema("pcs", 10).safeParse({ ...stockIn, quantity: "3", totalPaid: "450" });
  assert.ok(result.success);
  assert.deepEqual([result.data.quantity, result.data.unitCost], [30, 1500]);
  assert.equal(movementFormSchema("pcs", 10).safeParse({ ...stockIn, quantity: "1.5" }).success, false); // whole packs only
});

test("Stock In needs a positive amount and the total paid", () => {
  const result = movementFormSchema("pcs").safeParse({ ...stockIn, quantity: "0", totalPaid: "" });
  assert.equal(result.success, false);
  assert.deepEqual(result.error!.issues.map((i) => i.path[0]).sort(), ["quantity", "totalPaid"]);
});

test("pieces must be whole numbers", () => {
  assert.equal(movementFormSchema("pcs").safeParse({ ...stockIn, quantity: "1.5" }).success, false);
});

test("adjustments and waste need a reason; an adjustment may count zero", () => {
  const base = { ...stockIn, reference: "", totalPaid: "" };
  const noReason = movementFormSchema("kg").safeParse({ ...base, type: "waste", quantity: "1" });
  assert.equal(noReason.success, false);
  assert.deepEqual(noReason.error!.issues.map((i) => i.path[0]), ["note"]);

  const countedZero = movementFormSchema("kg").safeParse({ ...base, type: "adjustment", quantity: "0", note: "Spoiled batch" });
  assert.ok(countedZero.success);
  assert.equal(countedZero.data.quantity, 0);
});

test("the date must be a real day, not in the future", () => {
  for (const date of ["2026-13-45", "2099-01-01"]) {
    const result = movementFormSchema("pcs").safeParse({ ...stockIn, date });
    assert.equal(result.success, false, date);
  }
});

test("market buys have no receipt: the reference is optional", () => {
  const result = movementFormSchema("pcs").safeParse({ ...stockIn, reference: "", supplier: "Palengke" });
  assert.ok(result.success);
});

test("Add item: the made-in-house checkbox is optional", () => {
  const base = { name: "Beef Patties", category: "Meat", unit: "pcs", unitCost: "30.00", minimum: "40" };
  assert.equal(itemFormSchema.parse({ ...base, homemade: "on" }).homemade, true);
  assert.equal(itemFormSchema.parse({ ...base, homemade: null }).homemade, false);
});

test("Add item has no cost; an optional pack size is stored in the small unit", () => {
  const base = { name: "Hotdog", category: "Meat", unit: "pcs", minimum: "10", homemade: null, packSize: "10" };
  assert.equal(itemFormSchema.parse(base).packSize, 10);
  assert.equal(itemFormSchema.parse({ ...base, name: "French Fries", unit: "kg", packSize: "1" }).packSize, 1000);
  assert.equal(itemFormSchema.parse({ ...base, packSize: "" }).packSize, undefined);
  const half = itemFormSchema.safeParse({ ...base, packSize: "2.5" }); // pieces come whole
  assert.deepEqual(half.error?.issues.map((i) => i.path[0]), ["packSize"]);
  assert.equal("unitCost" in itemFormSchema.parse(base), false);
});

test("free stock (₱0) is allowed and doesn't change the item's cost", () => {
  const result = movementFormSchema("pcs").safeParse({ ...stockIn, quantity: "5", totalPaid: "0" });
  assert.ok(result.success);
  assert.deepEqual([result.data.quantity, result.data.unitCost], [5, undefined]);
});

test("a homemade item can't be bought by the pack", () => {
  const base = { name: "Beef Patties", category: "Meat", unit: "pcs", minimum: "40", packSize: "10" };
  assert.equal(itemFormSchema.parse({ ...base, homemade: "on" }).packSize, undefined);
});

test("pack size and stock amounts follow one set of rules (also used by the live previews)", () => {
  assert.equal(parsePackSize("10", "pcs"), 10);
  assert.equal(parsePackSize("2.5", "pcs"), null); // whole pieces only
  assert.equal(parsePackSize("1.5", "kg"), 1500);
  assert.equal(parsePackSize("123456", "pcs"), null);
  assert.equal(stockAmount("3", "pcs", 10), 30); // 3 packs of 10
  assert.equal(stockAmount("2.5", "kg"), 2500);
  assert.equal(stockAmount("1.5", "pcs", 10), null); // whole packs only
});
