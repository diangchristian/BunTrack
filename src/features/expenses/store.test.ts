import assert from "node:assert/strict";
import { test } from "node:test";

import { createExpenseStore } from "./store";

const values = { date: "2026-11-12", category: "Delivery & shipping", business: "iceCream", amount: 5000, paidVia: "cash", description: "Dan Eric delivery" } as const;

test("record, edit and delete an expense; who recorded it is kept", () => {
  const store = createExpenseStore([]);
  const saved = store.add(values, "Maria Reyes");
  assert.equal(store.update(saved.id, { ...values, amount: 6000 }), true);
  assert.deepEqual([store.list()[0].amount, store.list()[0].recordedBy], [6000, "Maria Reyes"]);
  assert.equal(store.remove(saved.id), true);
  assert.deepEqual(store.list(), []);
  assert.equal(store.update("nope", values), false);
  assert.equal(store.remove("nope"), false);
});
