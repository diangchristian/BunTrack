import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutOrder } from "./service";
import type { MenuProduct } from "./types";

const menu: MenuProduct[] = [
  { id: "burger", name: "Classic Cheeseburger", category: "burgers", price: 14900, available: true },
  { id: "tea", name: "Iced Tea", category: "drinks", price: 5900, available: true },
  { id: "rings", name: "Onion Rings", category: "sides", price: 8900, available: false },
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
