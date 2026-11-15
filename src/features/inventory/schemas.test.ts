import assert from "node:assert/strict";
import { test } from "node:test";

import { movementFormSchema } from "./schemas";

const stockIn = { type: "stock-in", itemId: "buns", quantity: "50", unitCost: "8.50", reference: " OR-204 ", supplier: "Bakery on Rizal St.", note: "", date: "2026-11-16" };

test("Stock In: big-unit text becomes small-unit integers and centavos", () => {
  const result = movementFormSchema("kg").safeParse({ ...stockIn, quantity: "2.5" });
  assert.ok(result.success);
  assert.deepEqual(
    { quantity: result.data.quantity, unitCost: result.data.unitCost, reference: result.data.reference },
    { quantity: 2500, unitCost: 850, reference: "OR-204" },
  );
});

test("Stock In needs a positive amount and the price paid", () => {
  const result = movementFormSchema("pcs").safeParse({ ...stockIn, quantity: "0", unitCost: "" });
  assert.equal(result.success, false);
  assert.deepEqual(result.error!.issues.map((i) => i.path[0]).sort(), ["quantity", "unitCost"]);
});

test("pieces must be whole numbers", () => {
  assert.equal(movementFormSchema("pcs").safeParse({ ...stockIn, quantity: "1.5" }).success, false);
});

test("adjustments and waste need a reason; an adjustment may count zero", () => {
  const base = { ...stockIn, reference: "", unitCost: "" };
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
