import assert from "node:assert/strict";
import { test } from "node:test";

import { createOrderStore } from "./store";

const sale = { completedAt: "2026-11-16T04:00:00.000Z", date: "2026-11-16", cashier: "Jun Santos", method: "cash" as const, lines: [] };

test("new orders continue the numbering after the latest order", () => {
  const store = createOrderStore([{ ...sale, number: "#1042" }, { ...sale, number: "#1009" }]);
  assert.equal(store.nextNumber(), "#1043");
  store.add({ ...sale, number: store.nextNumber() });
  assert.equal(store.nextNumber(), "#1044");
  assert.equal(store.list().length, 3);
});

test("the first order is #1001", () => {
  assert.equal(createOrderStore([]).nextNumber(), "#1001");
});

test("an order number can't be saved twice", () => {
  const store = createOrderStore([{ ...sale, number: "#1042" }]);
  assert.throws(() => store.add({ ...sale, number: "#1042" }));
});
