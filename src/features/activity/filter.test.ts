import assert from "node:assert/strict";
import { test } from "node:test";

import { filterActivity } from "./filter";
import type { ActivityEntry } from "./types";

const entry = (record: string, user: string, module: ActivityEntry["module"], action: string, at: string, change?: string): ActivityEntry =>
  ({ id: record, record, user, module, action, at, change });

const all = [
  entry("Lettuce", "Maria Reyes", "Inventory", "Waste recorded", "2026-11-14T06:30:00.000Z", "2.1 → 1.6 kg"),
  entry("Burger Buns", "Carlo Mendoza", "Inventory", "Stock In", "2026-11-14T03:05:00.000Z", "15 → 35 pcs"),
  entry("Electricity bill", "Maria Reyes", "Expenses", "Expense added", "2026-11-01T02:00:00.000Z", "₱3,200.00"),
];

test("filters by search text, user, module and how far back", () => {
  assert.deepEqual(filterActivity(all, { query: "buns" }).map((e) => e.record), ["Burger Buns"]);
  assert.deepEqual(filterActivity(all, { user: "Maria Reyes", module: "Inventory" }).map((e) => e.record), ["Lettuce"]);
  // since = earliest ISO time to include
  assert.deepEqual(filterActivity(all, { since: "2026-11-10T00:00:00Z" }).map((e) => e.record), ["Lettuce", "Burger Buns"]);
});
