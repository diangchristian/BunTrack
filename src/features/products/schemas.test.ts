import assert from "node:assert/strict";
import { test } from "node:test";

import { productFormSchema } from "./schemas";

const valid = {
  name: "  Ube Sundae ",
  description: "Ube soft serve, ube halaya, toppings",
  category: "iceCream",
  price: "75.00",
  cost: "30.50",
  available: "on",
};

test("turns form text into clean product data with centavo amounts", () => {
  const result = productFormSchema.safeParse(valid);
  assert.ok(result.success);
  assert.deepEqual(result.data, {
    name: "Ube Sundae",
    description: "Ube soft serve, ube halaya, toppings",
    category: "iceCream",
    price: 7500,
    cost: 3050,
    available: true,
  });
});

test("a missing checkbox means unavailable", () => {
  const result = productFormSchema.safeParse({ ...valid, available: null });
  assert.ok(result.success);
  assert.equal(result.data.available, false);
});

test("rejects a blank name, a zero or malformed price, a negative cost and an unknown category", () => {
  const result = productFormSchema.safeParse({ ...valid, name: "  ", price: "0", cost: "-5", category: "pizza" });
  assert.equal(result.success, false);
  const fields = result.error!.issues.map((issue) => issue.path[0]).sort();
  assert.deepEqual(fields, ["category", "cost", "name", "price"]);

  assert.equal(productFormSchema.safeParse({ ...valid, price: "1,490" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...valid, price: "14.999" }).success, false);
});
