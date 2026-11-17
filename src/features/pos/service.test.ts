import assert from "node:assert/strict";
import { test } from "vitest";

import { checkoutOrder, piecesToDeduct, toMenuProduct, toReceipt } from "./service";
import type { MenuProduct } from "./types";

const menu: MenuProduct[] = [
  { id: "burger", name: "Classic Cheeseburger", category: "burgers", price: 14900, pieces: 1, servingsLeft: null, available: true },
  { id: "tea", name: "Iced Tea", category: "drinks", price: 5900, pieces: 1, servingsLeft: null, available: true },
  { id: "rings", name: "Onion Rings", category: "sides", price: 8900, pieces: 1, servingsLeft: null, available: false },
  { id: "pint", name: "Pint", category: "iceCream", price: 9200, pieces: 1, servingsLeft: 2, available: true },
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
    id: "onion-rings", name: "Onion Rings", description: "", category: "sides", price: 8900, pieces: 1, available: true,
    cost: 1890, hasRecipe: true, servingsLeft: 0, limitedBy: "Onions",
  } as const;
  assert.deepEqual(toMenuProduct(rings), {
    id: "onion-rings", name: "Onion Rings", category: "sides", price: 8900, image: undefined, pieces: 1,
    servingsLeft: 0, available: false, unavailableReason: "Out of Onions",
  });
  // Dan Eric items run out of themselves; a made item named like its ingredient still names it.
  assert.equal(toMenuProduct({ ...rings, category: "iceCream", name: "Pint", limitedBy: "Pint" }).unavailableReason, "Sold out");
  assert.equal(toMenuProduct({ ...rings, name: "French Fries", limitedBy: "French Fries" }).unavailableReason, "Out of French Fries");
  assert.equal(toMenuProduct({ ...rings, servingsLeft: 5 }).available, true);
  assert.equal(toMenuProduct({ ...rings, servingsLeft: 5, available: false }).unavailableReason, "Switched off");
});

test("a Buy 1 Take 1 order uses two pieces of stock per order", () => {
  const products = [{ id: "b1t1-burger", pieces: 2 }, { id: "tea", pieces: 1 }];
  assert.deepEqual(piecesToDeduct([{ productId: "b1t1-burger", quantity: 3 }, { productId: "tea", quantity: 2 }], products), [
    { productId: "b1t1-burger", quantity: 6 },
    { productId: "tea", quantity: 2 },
  ]);
});

test("a saved order reads back as its receipt: totals and change from the line snapshots", () => {
  const receipt = toReceipt({
    number: 1043,
    completedAt: new Date("2026-11-17T04:41:00.000Z"),
    method: "cash",
    amountReceived: 50000,
    lines: [
      { productId: "burger", name: "Classic Cheeseburger", quantity: 2, unitPrice: 14900 },
      { productId: "tea", name: "Iced Tea", quantity: 1, unitPrice: 4900 },
    ],
  });
  assert.deepEqual(receipt, {
    orderNumber: "#1043",
    completedAt: "2026-11-17T04:41:00.000Z",
    method: "cash",
    lines: [
      { productId: "burger", name: "Classic Cheeseburger", quantity: 2, lineTotal: 29800 },
      { productId: "tea", name: "Iced Tea", quantity: 1, lineTotal: 4900 },
    ],
    total: 34700,
    received: 50000,
    change: 15300,
  });
});
