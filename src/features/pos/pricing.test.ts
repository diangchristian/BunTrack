import assert from "node:assert/strict";
import { test } from "node:test";

import { changeDue, orderTotals, quickCashOptions } from "./pricing";

// All amounts are in centavos (₱1 = 100) so no floating-point rounding creeps in.

test("totals for the Figma sample order: ₱555 with ₱59.46 VAT included", () => {
  const totals = orderTotals([
    { unitPrice: 16900, quantity: 2 }, // 2× ₱169
    { unitPrice: 9900, quantity: 1 },
    { unitPrice: 5900, quantity: 2 },
  ]);
  assert.deepEqual(totals, { itemCount: 5, total: 55500, vat: 5946 });
});

test("an empty order totals zero", () => {
  assert.deepEqual(orderTotals([]), { itemCount: 0, total: 0, vat: 0 });
});

test("change is what is left after the total, never negative", () => {
  assert.equal(changeDue(55500, 100000), 44500);
  assert.equal(changeDue(55500, 55500), 0);
  assert.equal(changeDue(55500, 50000), 0);
});

test("quick cash suggests exact amount and the next bills up", () => {
  assert.deepEqual(quickCashOptions(55500), [55500, 60000, 100000]);
  assert.deepEqual(quickCashOptions(100000), [100000]);
  assert.deepEqual(quickCashOptions(14900), [14900, 20000, 50000, 100000]);
});
