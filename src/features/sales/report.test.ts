import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReport, periodRange } from "./report";
import type { Order } from "./types";

test("periods are inclusive day ranges in Manila, compared with the same length just before", () => {
  assert.deepEqual(periodRange("today", "2026-11-16"), { from: "2026-11-16", to: "2026-11-16", prevFrom: "2026-11-15", prevTo: "2026-11-15" });
  assert.deepEqual(periodRange("7d", "2026-11-16"), { from: "2026-11-10", to: "2026-11-16", prevFrom: "2026-11-03", prevTo: "2026-11-09" });
  // "This month" so far (16 days) vs the 16 days before it.
  assert.deepEqual(periodRange("month", "2026-11-16"), { from: "2026-11-01", to: "2026-11-16", prevFrom: "2026-10-16", prevTo: "2026-10-31" });
});

const burger = { productId: "burger", name: "Classic Cheeseburger", category: "burgers", unitPrice: 14900, unitCost: 5840 } as const;
const pint = { productId: "pint", name: "Pint", category: "iceCream", unitPrice: 9200, unitCost: 7600 } as const;
const order = (number: string, date: string, method: Order["method"], lines: Order["lines"]): Order => ({
  number, date, method, lines, completedAt: `${date}T04:00:00.000Z`, cashier: "Jun Santos",
});

const orders: Order[] = [
  order("#1", "2026-11-16", "cash", [{ ...burger, quantity: 2 }, { ...pint, quantity: 1 }]), // mixed order
  order("#2", "2026-11-16", "gcash", [{ ...pint, quantity: 1 }]),
  order("#3", "2026-11-15", "cash", [{ ...burger, quantity: 1 }]), // yesterday = previous period
];

test("all businesses: revenue, orders, items, average order and profit for the period", () => {
  const r = buildReport(orders, { from: "2026-11-16", to: "2026-11-16", prevFrom: "2026-11-15", prevTo: "2026-11-15" }, "all");
  assert.deepEqual(r.kpis, {
    revenue: 48200, // 2×149 + 92 + 92
    orders: 2,
    items: 4,
    averageOrder: 24100,
    profit: 48200 - (2 * 5840 + 2 * 7600),
    previousRevenue: 14900,
    previousOrders: 1,
  });
});

test("the ice cream report counts only ice cream lines, even inside mixed orders", () => {
  const r = buildReport(orders, { from: "2026-11-16", to: "2026-11-16", prevFrom: "2026-11-15", prevTo: "2026-11-15" }, "iceCream");
  assert.equal(r.kpis.revenue, 18400);
  assert.equal(r.kpis.orders, 2);
  assert.equal(r.kpis.previousRevenue, 0);
  assert.deepEqual(r.byMethod, [
    { method: "cash", revenue: 9200 },
    { method: "gcash", revenue: 9200 },
  ]);
  assert.deepEqual(r.transactions.map((t) => [t.number, t.total, t.items]), [["#1", 9200, 1], ["#2", 9200, 1]]);
});

test("products are ranked with units, revenue, profit and change vs the previous period", () => {
  const r = buildReport(orders, { from: "2026-11-16", to: "2026-11-16", prevFrom: "2026-11-15", prevTo: "2026-11-15" }, "all");
  assert.deepEqual(r.products[0], {
    productId: "burger", name: "Classic Cheeseburger", category: "burgers",
    units: 2, revenue: 29800, profit: 29800 - 11680, previousUnits: 1,
  });
  assert.deepEqual(r.byDay, [{ date: "2026-11-16", revenue: 48200 }]);
});

test("least-selling includes menu items with no sales in the period", () => {
  const catalog = [
    { id: "burger", name: "Classic Cheeseburger", category: "burgers" },
    { id: "rings", name: "Onion Rings", category: "sides" },
    { id: "pint", name: "Pint", category: "iceCream" },
  ] as const;
  const range = { from: "2026-11-16", to: "2026-11-16", prevFrom: "2026-11-15", prevTo: "2026-11-15" };
  const all = buildReport(orders, range, "all", [...catalog]);
  assert.deepEqual(all.products.at(-1), { productId: "rings", name: "Onion Rings", category: "sides", units: 0, revenue: 0, profit: 0, previousUnits: 0 });
  // The burger report doesn't list ice cream, even unsold.
  assert.deepEqual(buildReport(orders, range, "burger", [...catalog]).products.map((p) => p.productId), ["burger", "rings"]);
});
