import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutOrder, toMenuProduct } from "./service";
import type { MenuProduct } from "./types";

const menu: MenuProduct[] = [
  { id: "burger", name: "Classic Cheeseburger", category: "burgers", price: 14900, servingsLeft: null, available: true },
  { id: "tea", name: "Iced Tea", category: "drinks", price: 5900, servingsLeft: null, available: true },
  { id: "rings", name: "Onion Rings", category: "sides", price: 8900, servingsLeft: null, available: false },
  { id: "pint", name: "Pint", category: "iceCream", price: 9200, servingsLeft: 2, available: true },
];

const base = { method: "cash" } as const;

test("prices the order from the server menu and computes change", () => {
  const result = checkoutOrder(menu, {
    ...base,
    amountReceived: 50000,
    lines: [{ productId: "burger", quantity: 2 }, { productId: "tea", quantity: 1 }],
  });
  assert.ok(result.ok);
  assert.equal(result.order.total, 35700);
  assert.equal(result.order.change, 14300);
  assert.deepEqual(result.order.lines.map((l) => l.lineTotal), [29800, 5900]);
});

test("merges repeated lines for the same product", () => {
  const result = checkoutOrder(menu, {
    ...base,
    amountReceived: 50000,
    lines: [{ productId: "burger", quantity: 1 }, { productId: "burger", quantity: 2 }],
  });
  assert.ok(result.ok);
  assert.deepEqual(result.order.lines.map((l) => l.quantity), [3]);
});

test("rejects unknown and unavailable products", () => {
  for (const productId of ["ghost", "rings"]) {
    const result = checkoutOrder(menu, { ...base, amountReceived: 99999, lines: [{ productId, quantity: 1 }] });
    assert.equal(result.ok, false);
  }
});

test("rejects cash that does not cover the total", () => {
  const result = checkoutOrder(menu, { ...base, amountReceived: 10000, lines: [{ productId: "burger", quantity: 1 }] });
  assert.equal(result.ok, false);
});

test("GCash is charged the exact total with no change", () => {
  const result = checkoutOrder(menu, {
    method: "gcash",
    amountReceived: 0,
    lines: [{ productId: "tea", quantity: 1 }],
  });
  assert.ok(result.ok);
  assert.equal(result.order.received, 5900);
  assert.equal(result.order.change, 0);
});

test("rejects selling more ice cream units than are in stock", () => {
  const result = checkoutOrder(menu, { ...base, amountReceived: 99999, lines: [{ productId: "pint", quantity: 3 }] });
  assert.deepEqual(result, { ok: false, error: "Only 2 Pint left." });
});

test("the POS menu hides cost, says which ingredient ran out, and says Sold out for resold items", () => {
  const rings = {
    id: "onion-rings", name: "Onion Rings", description: "", category: "sides", price: 8900, available: true,
    cost: 1890, hasRecipe: true, servingsLeft: 0, limitedBy: "Onions",
  } as const;
  assert.deepEqual(toMenuProduct(rings), {
    id: "onion-rings", name: "Onion Rings", category: "sides", price: 8900, image: undefined,
    servingsLeft: 0, available: false, unavailableReason: "Out of Onions",
  });
  // Dan Eric items run out of themselves; a made item named like its ingredient still names it.
  assert.equal(toMenuProduct({ ...rings, category: "iceCream", name: "Pint", limitedBy: "Pint" }).unavailableReason, "Sold out");
  assert.equal(toMenuProduct({ ...rings, name: "French Fries", limitedBy: "French Fries" }).unavailableReason, "Out of French Fries");
  assert.equal(toMenuProduct({ ...rings, servingsLeft: 5 }).available, true);
  assert.equal(toMenuProduct({ ...rings, servingsLeft: 5, available: false }).unavailableReason, "Switched off");
});
