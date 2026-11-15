import assert from "node:assert/strict";
import { test } from "node:test";

import { productFormSchema } from "./schemas";

const valid = {
  name: "  Ube Sundae ",
  description: "Ube soft serve, ube halaya, toppings",
  category: "iceCream",
  price: "75.00",
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
    available: true,
    pieces: 1,
  });
});

test("a missing checkbox means unavailable", () => {
  const result = productFormSchema.safeParse({ ...valid, available: null });
  assert.ok(result.success);
  assert.equal(result.data.available, false);
});

test("rejects a blank name, a zero or malformed price and an unknown category", () => {
  const result = productFormSchema.safeParse({ ...valid, name: "  ", price: "0", category: "pizza" });
  assert.equal(result.success, false);
  const fields = result.error!.issues.map((issue) => issue.path[0]).sort();
  assert.deepEqual(fields, ["category", "name", "price"]);

  assert.equal(productFormSchema.safeParse({ ...valid, price: "1,490" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...valid, price: "14.999" }).success, false);
});

test("the Buy 1 Take 1 switch means 2 pieces per order", () => {
  assert.equal(productFormSchema.parse({ ...valid, b1t1: "on" }).pieces, 2);
  assert.equal(productFormSchema.parse({ ...valid, b1t1: null }).pieces, 1);
});
