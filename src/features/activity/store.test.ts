import assert from "node:assert/strict";
import { test } from "node:test";

import { createActivityStore, filterActivity } from "./store";

test("entries are stamped and listed newest first", () => {
  const store = createActivityStore();
  store.log({ user: "Maria Reyes", module: "Products", action: "Price updated", record: "Double Cheeseburger", change: "₱209.00 → ₱219.00" }, new Date("2026-11-13T09:20:00Z"));
  store.log({ user: "Jun Santos", module: "POS", action: "Completed order", record: "Order #1043", change: "₱555.00 · Cash" }, new Date("2026-11-14T04:48:00Z"));
  assert.deepEqual(store.list().map((e) => e.record), ["Order #1043", "Double Cheeseburger"]);
  assert.equal(store.list()[0].at, "2026-11-14T04:48:00.000Z");
});

test("filters by search text, user, module and how far back", () => {
  const store = createActivityStore();
  store.log({ user: "Maria Reyes", module: "Expenses", action: "Expense added", record: "Electricity bill", change: "₱3,200.00" }, new Date("2026-11-01T02:00:00Z"));
  store.log({ user: "Carlo Mendoza", module: "Inventory", action: "Stock In", record: "Burger Buns", change: "15 → 35 pcs" }, new Date("2026-11-14T03:05:00Z"));
  store.log({ user: "Maria Reyes", module: "Inventory", action: "Waste recorded", record: "Lettuce", change: "2.1 → 1.6 kg" }, new Date("2026-11-14T06:30:00Z"));
  const all = store.list();

  assert.deepEqual(filterActivity(all, { query: "buns" }).map((e) => e.record), ["Burger Buns"]);
  assert.deepEqual(filterActivity(all, { user: "Maria Reyes", module: "Inventory" }).map((e) => e.record), ["Lettuce"]);
  // since = earliest ISO time to include
  assert.deepEqual(filterActivity(all, { since: "2026-11-10T00:00:00Z" }).map((e) => e.record), ["Lettuce", "Burger Buns"]);
});
